#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
const inquirer = require('inquirer');

// Define paths
const homeDir = require('os').homedir();
const gitUsersFile = path.join(homeDir, '.git-users');
const scriptDir = path.join(homeDir, 'bin');
const scriptFile = path.join(scriptDir, 'git-user');

// Detect the shell being used
const shellType = process.env.SHELL.split('/').pop();

// Map shell type to configuration files
const shellConfigFiles = {
    bash: path.join(homeDir, '.bashrc'),
    zsh: path.join(homeDir, '.zshrc'),
    fish: path.join(homeDir, '.config', 'fish', 'config.fish'),
};

// Determine the appropriate config file based on the shell
const shellConfigFile = shellConfigFiles[shellType] || shellConfigFiles['bash']; // default to .bashrc if unknown

// Zsh script content (remains the same)
const zshScriptContent = `#!/bin/zsh

# ~/.git-users should contain your different user profiles in the format:
# key:name=yourname,email=youremail

CONFIG_FILE=~/.git-users

# Function to display the current git user
function show_current_git_user() {
    current_name=$(git config user.name)
    current_email=$(git config user.email)
    echo "Current Git User:"
    echo "Name: $current_name"
    echo "Email: $current_email"
}

# Function to add a new git user configuration
function add_new_git_user() {
    key=$1
    echo "Key '$key' not found."
    echo -n "Enter the name to use for '$key': "
    read name
    echo -n "Enter the email to use for '$key': "
    read email

    if [[ -n "$name" && -n "$email" ]]; then
        # Add the new user configuration to the file
        echo "$key:name=$name,email=$email" >> $CONFIG_FILE
        echo "New Git user profile added for key: $key"
        # Switch to the new profile
        switch_git_user $key
    else
        echo "Invalid input. Both name and email are required."
        return 1
    fi
}

# Function to switch git user based on the key
function switch_git_user() {
    key=$1
    if [[ -z "$key" ]]; then
        echo "Usage: git-user <key>"
        return 1
    fi

    match=$(grep "^$key:" $CONFIG_FILE)
    if [[ -z "$match" ]]; then
        # If key doesn't exist, ask for details and add it
        add_new_git_user $key
        return
    fi

    name=$(echo $match | sed -n 's/.*name=\\([^,]*\\).*/\\1/p')
    email=$(echo $match | sed -n 's/.*email=\\([^,]*\\).*/\\1/p')

    if [[ -n "$name" && -n "$email" ]]; then
        git config --global user.name "$name"
        git config --global user.email "$email"
        echo "Switched to Git user:"
        echo "Name: $name"
        echo "Email: $email"
    else
        echo "Invalid configuration for key: $key"
        return 1
    fi
}

# If no argument is provided, show the current git user
if [[ $# -eq 0 ]]; then
    show_current_git_user
else
    switch_git_user $1
fi
`;

// Ensure the `bin` folder exists
if (!fs.existsSync(scriptDir)) {
    shell.mkdir('-p', scriptDir);
}

// Write the script file
fs.writeFileSync(scriptFile, zshScriptContent, { mode: 0o755 });
console.log('Script created at ' + scriptFile);

const exportCommand = 'export PATH="$HOME/bin:$PATH"';
const exportRegex = new RegExp(exportCommand.replace(/\$/g, '\\$'), 'g');

// Read the shell config file
const shellConfigContent = fs.readFileSync(shellConfigFile, 'utf8');

// If the exportCommand is not found, append it
if (!exportRegex.test(shellConfigContent)) {
    fs.appendFileSync(shellConfigFile, '\n# Add git-user script to PATH\n' + exportCommand + '\n');
    console.log('Added git-user to PATH via ' + shellConfigFile);
} else {
    console.log('PATH already includes $HOME/bin in ' + shellConfigFile);
}

// Ensure the `.git-users` file exists
if (!fs.existsSync(gitUsersFile)) {
    fs.writeFileSync(gitUsersFile, '');
    console.log('Created ' + gitUsersFile + ' for storing git user profiles.');
}

console.log("Installation complete. Source your " + shellConfigFile + " and then you can use the 'git-user' command.");

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
        console.log("Usage: git-user <key>");
        return 1;
    }

    const match = shell.grep('^' + key + ':', gitUsersFile).stdout;
    if (!match) {
        // If key doesn't exist, ask for details and add it
        add_new_git_user(key);
        return;
    }

    const name = match.match(/name=([^,]+)/)[1];
    const email = match.match(/email=([^,]+)/)[1];

    if (name && email) {
        shell.exec(`git config --global user.name "${name}"`);
        shell.exec(`git config --global user.email "${email}"`);
        console.log(`Switched to Git user: Name: ${name}, Email: ${email}`);
    } else {
        console.log("Invalid configuration for key:", key);
    }
}

// Ensure the `bin` folder exists
if (!fs.existsSync(scriptDir)) {
    shell.mkdir('-p', scriptDir);
}

// Write the script file
fs.writeFileSync(scriptFile, zshScriptContent, { mode: 0o755 });

console.log(`Script created at ${scriptFile}`);

// Add script to the user's path via their shell config file
const exportCommand = `export PATH="$HOME/bin:$PATH"`;
if (!shell.grep(exportCommand, shellConfigFile)) {
    fs.appendFileSync(shellConfigFile, `\n# Add git-user script to PATH\n${exportCommand}\n`);
    console.log(`Added git-user to PATH via ${shellConfigFile}`);
}

// Ensure the `.git-users` file exists
if (!fs.existsSync(gitUsersFile)) {
    fs.writeFileSync(gitUsersFile, '');
    console.log(`Created ${gitUsersFile} for storing git user profiles.`);
}

console.log("Installation complete. You can now use the 'git-user' command.");

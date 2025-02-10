const fs = require('fs');
const path = require('path');

const commands = {};

// Read each file in the commands folder
fs.readdirSync(__dirname).forEach(file => {
    if (file.endsWith('.js') && file !== 'router.js') {
        const command = require(path.join(__dirname, file));
        commands[command.name] = command;
    }
});

module.exports = commands;

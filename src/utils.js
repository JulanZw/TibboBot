const utils = require("./utils");
module.exports = {
    // Utility function to log messages with timestamps
    logWithTime: function(message) {
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format as YYYY-MM-DD HH:MM:SS
        console.log(`[${timestamp}] ${message}`);
    },

    // Utility function for waiting
    sleep: function (ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    logToChannel: async function (message, client) {
        const now = new Date();
        const timestamp = now.toISOString().replace('T', ' ').slice(0, 19); // Format as YYYY-MM-DD HH:MM:SS
        const channel = await client.channels.fetch('1323669455426818139');
        if (channel) {
            channel.send(`[${timestamp}] ${message}`);
        } else {
            utils.logWithTime("channel not found");
        }
    }
};

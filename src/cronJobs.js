const cron = require('node-cron');
const util = require('./utils');
const database = require('./database');

// Function to send a message to the Discord channel with the current date
async function sendDailyMessage(prefix, sleepTime, client) {
    const formattedDate = formatDate(new Date());
    await client.channels.fetch('1065200345636155482').send(`Today is ${formattedDate}, waited for ${sleepTime} ms`);
    util.logWithTime(`Message sent: "Today is ${formattedDate}"`);
    util.logToChannel(`Message sent: "Today is ${formattedDate}"`, client);
}

// Function to format the given date
function formatDate(date) {
    const options = {month: 'long', day: 'numeric'};
    const daySuffix = getDaySuffix(date.getDate());
    return date.toLocaleDateString('en-US', options) + daySuffix;
}

// Function to get the correct suffix for the formatting
function getDaySuffix(day) {
    if (day > 3 && day < 21) return 'th'; // Handles 11th to 13th
    switch (day % 10) {
        case 1:
            return 'st';
        case 2:
            return 'nd';
        case 3:
            return 'rd';
        default:
            return 'th';
    }
}

function setupCronJobs(client) {
    cron.schedule('0 0 * * *', async () => {
        try {
            const channel = await client.channels.fetch('1065200345636155482');
            if (channel) {
                const randomDelay = Math.floor(Math.random() * 5001); // Random number between 0-5000 ms
                await util.sleep(randomDelay);
                await sendDailyMessage(randomDelay, client);
                const row = await database.getBirthday(new Date());
                if (row) {
                    channel.send(`Happy Birthday <@${row.user_id}>!`);
                }
            } else {
                util.logWithTime("Error: Channel not found.");
                await util.logToChannel("Error: Channel not found.", client);
            }
        } catch (error) {
            console.error("Error in daily cron job:", error);
        }
    });
    cron.schedule('0 0 1 1 *', async () => {
        try {
            const channel = await client.channels.fetch('1065200345636155482');
            if (channel) {
                channel.send(`Happy New Year!`);
            } else {
                util.logWithTime("Error: Channel not found.");
                await util.logToChannel("Error: Channel not found.", client);
            }
        } catch (error) {
            console.error("Error in yearly cron job:", error);
        }
    });
}

module.exports = {setupCronJobs};
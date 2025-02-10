const sqlite3 = require('sqlite3').verbose();
const utils = require('./utils');

// Create or open the SQLite database
const db = new sqlite3.Database('./ZWutils.db', (err) => {
    if (err) {
        console.error("Error opening SQLite database:", err.message);
    } else {
        // Create table if it doesn't exist
        db.run('CREATE TABLE IF NOT EXISTS user_counts (user_id TEXT PRIMARY KEY, char_count INTEGER, msg_count INTEGER)');
        db.run('CREATE TABLE IF NOT EXISTS todayis (user_id TEXT PRIMARY KEY, points INTEGER)');
        db.run('CREATE TABLE IF NOT EXISTS birthday (user_id TEXT PRIMARY KEY,birthday TEXT)');
        utils.logWithTime('SQLite database connected!');
    }
});

// Utility function to get user data
function getUserData(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT char_count, msg_count FROM user_counts WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Utility function to update user data
function updateUserData(userId, newCharCount, newMsgCount, message) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE user_counts SET char_count = ?, msg_count = ? WHERE user_id = ?', [newCharCount, newMsgCount, userId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ userId, newCharCount, newMsgCount });
            }
        });
    });
}

// Utility function to insert new user data
function insertUserData(userId, charCount, msgCount) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO user_counts (user_id, char_count, msg_count) VALUES (?, ?, ?)', [userId, charCount, msgCount], function (err) {
            if (err) {
                reject(err);
            } else {
                utils.logWithTime(`Inserted new data for user ${userId}: char_count = ${charCount}, msg_count = ${msgCount}`);
                resolve({ userId, charCount, msgCount });
            }
        });
    });
}

// Utility function to get all users' data
function getAllUserData() {
    return new Promise((resolve, reject) => {
        db.all('SELECT user_id, char_count, msg_count FROM user_counts ORDER BY char_count DESC', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// Utility function to get all users' data
function getAllUserDataTodayIs() {
    return new Promise((resolve, reject) => {
        db.all('SELECT user_id, points FROM todayis ORDER BY points DESC', (err, rows) => {
            if (err){
                reject(err);
            }else{
                utils.logWithTime(`Pointboard requested`);
                resolve(rows);
            }
        });
    });
}

// Utility function to update user points
function updateUserPoints(userId, points,interaction) {
    return new Promise((resolve, reject) => {
        db.run('UPDATE todayis SET points = ? WHERE user_id = ?', [points,userId], function (err) {
            if (err) {
                console.log("error");
                reject(err);
            } else {
                utils.logWithTime(`Added points for user ${userId} (${interaction.options.getUser('target').username}): points added = ${points}`);
                resolve({ userId, points});
            }
        });
    });
}

// Utility function to insert a new user for today is
function insertUserPoints(userId, points) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO todayis (user_id, points) VALUES (?, ?)', [userId, points], function (err) {
            if (err) {
                console.log("error");
                reject(err);
            } else {
                utils.logWithTime(`Inserted new data for user ${userId}: points = ${points}`);
                resolve({ userId, points });
            }
        });
    });
}

// Utility function to get user data
function getUserPoints(userId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT points FROM todayis WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Utility function to get a birthday
function getBirthday(date){
    const formattedDate = date.toISOString().split('T')[0];
    return new Promise((resolve, reject) => {
        db.get('SELECT user_id FROM birthdays WHERE date = ?', [formattedDate], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

// Utility function to add a birthday
function addBirthday(userId,date){
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO birthday (user_id, birthday) VALUES (?, ?)', [userId, date], function (err) {
            if (err) {
                console.log("error");
                reject(err);
            } else {
                utils.logWithTime(`Inserted new birthday for user ${userId}: birthday = ${date}`);
                resolve({ userId, date });
            }
        });
    })
}

module.exports = {
    getUserData,
    updateUserData,
    insertUserData,
    getAllUserData,
    getAllUserDataTodayIs,
    updateUserPoints,
    insertUserPoints,
    getUserPoints,
    getBirthday,
    addBirthday
};

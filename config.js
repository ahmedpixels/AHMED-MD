const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}
module.exports = {
SESSION_ID: process.env.SESSION_ID,
    ALIVE_IMG: process.env.ALIVE_IMG || 'https://i.postimg.cc/rFr5MTtd/Gemini-Generated-Image-13yzzy13yzzy13yz.png'
    ALIVE_MSG: process.env.ALIVE_MSG || '*AHMED-MD is Alive!*'
};

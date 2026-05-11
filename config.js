require('dotenv').config()

module.exports = {
    SESSION_ID: process.env.SESSION_ID || '',
    PREFIX: process.env.PREFIX || '.',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '923216479192',
    SUDO: process.env.SUDO || '',
    PRIVATE_MODE: process.env.PRIVATE_MODE || 'true',
    BOT_NAME: process.env.BOT_NAME || 'AHMED-MD',
    OWNER_NAME: process.env.OWNER_NAME || 'Ahmed',
}

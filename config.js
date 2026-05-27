import dotenv from 'dotenv'
import { createRequire } from 'module'

dotenv.config({ path: './config.env' })

const config = {
    SESSION_ID:   process.env.SESSION_ID   || '',
    PREFIX:       process.env.PREFIX       ?? '.',
    OWNER_NUMBER: process.env.OWNER_NUMBER || '',
    BOT_NAME:     process.env.BOT_NAME     || 'AHMED-MD',
    MODE:         process.env.MODE         || 'private',
    AUTO_READ:    process.env.AUTO_READ    === 'true',
    AUTO_TYPING:  process.env.AUTO_TYPING  !== 'false',
    ANTICALL:     process.env.ANTICALL     === 'true',
    AUTOREACT:    process.env.AUTOREACT    || 'off',
    ALIVE_IMAGE:  process.env.ALIVE_IMAGE  || './online.jpg',
    MENU_IMAGE:   process.env.MENU_IMAGE   || './online.jpg',
    HIJACK_IMAGE: process.env.HIJACK_IMAGE || './hijack.jpg',
}

export default config

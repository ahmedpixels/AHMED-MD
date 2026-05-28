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
    ALIVE_IMAGE:  process.env.ALIVE_IMAGE  || 'https://i.imgur.com/xl3SNpp.jpeg',
    MENU_IMAGE:   process.env.MENU_IMAGE   || 'https://i.imgur.com/xl3SNpp.jpeg',
    HIJACK_IMAGE: process.env.HIJACK_IMAGE || './hijack.jpg',
    MONGODB_URI:  process.env.MONGODB_URI  || '',
    PAIR_URL:     process.env.PAIR_URL     || 'https://pair-j2ft.onrender.com',
}

export default config

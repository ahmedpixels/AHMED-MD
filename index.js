require('dotenv').config()
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs-extra')
const path = require('path')
const axios = require('axios')
const config = require('./config')
const { loadPlugins } = require('./lib/pluginHandler')
const MessageHandler = require('./lib/messageHandler')

const unzipper = require('unzipper')

async function getSession() {
    if (!fs.existsSync('./session')) {
        fs.mkdirSync('./session')
    }
    
    if (!fs.existsSync('./session/creds.json') && config.SESSION_ID) {
        console.log('Downloading Session from AHMED-MD Server...')
        try {
            const response = await axios({
                url: `https://pair-j2ft.onrender.com/api/session/${config.SESSION_ID}`,
                method: 'GET',
                responseType: 'stream'
            });
            
            await new Promise((resolve, reject) => {
                response.data.pipe(unzipper.Extract({ path: './session' }))
                .on('close', resolve)
                .on('error', reject)
            });
            
            console.log('✅ Session Downloaded and Extracted Successfully!')
        } catch (error) {
            console.log('❌ Failed to download session. Make sure your SESSION_ID is correct.', error.message)
        }
    }
}

async function startBot() {
    await getSession()
    
    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version } = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: state,
        browser: [config.BOT_NAME, 'Safari', '1.0.0']
    })

    // Load Plugins
    await loadPlugins()

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            const reason = lastDisconnect.error?.output?.statusCode
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Connection Closed. Reconnecting...')
                startBot()
            } else {
                console.log('Logged Out! Please generate a new Session ID.')
                fs.emptyDirSync('./session')
            }
        } else if (connection === 'open') {
            console.log(`\n✅ ${config.BOT_NAME} CONNECTED SUCCESSFULLY!\n`)
            await sock.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, {
                text: `🚀 *${config.BOT_NAME} IS ONLINE* 🚀\n\n_Connected and ready to rock!_`
            })
        }
    })

    sock.ev.on('creds.update', saveCreds)

    // Listen to Messages
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        try {
            const m = chatUpdate.messages[0]
            if (!m.message) return
            
            await MessageHandler(sock, m)
        } catch (error) {
            console.error('Error handling message:', error)
        }
    })
}

startBot()

import makeWASocket, {
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys'

if (process.stdout._handle && typeof process.stdout._handle.setBlocking === 'function') {
    process.stdout._handle.setBlocking(true)
}
if (process.stderr._handle && typeof process.stderr._handle.setBlocking === 'function') {
    process.stderr._handle.setBlocking(true)
}
import pino       from 'pino'
import fs         from 'fs-extra'
import axios      from 'axios'
import { createRequire } from 'module'
import config     from './config.js'
import { loadPlugins, handleMessage, msgCache, decodeJid } from './lib/handler.js'
import { updateLidCache } from './lib/lidCache.js'

// ── Session Downloader ─────────────────────────────────────
async function getSession() {
    fs.ensureDirSync('./session')
    
    // Check if the Session ID has changed
    const idPath = './session/session_id.txt'
    if (fs.existsSync(idPath)) {
        try {
            const savedId = fs.readFileSync(idPath, 'utf8').trim()
            if (savedId !== config.SESSION_ID) {
                console.log('🔄 Session ID changed! Clearing old session...')
                fs.emptyDirSync('./session')
            }
        } catch {}
    }

    if (fs.existsSync('./session/creds.json')) return true

    if (!config.SESSION_ID) {
        console.log('\n❌ SESSION_ID not set in config.env!')
        console.log('   Get your session from: https://ahmedxmd.com\n')
        return false
    }

    console.log('📥 Downloading session...')
    const urls = [
        `https://ahmedxmd.com/api/session/${config.SESSION_ID}`,
        `https://pair-j2ft.onrender.com/api/session/${config.SESSION_ID}`
    ]

    const { default: unzipper } = await import('unzipper')
    for (const url of urls) {
        try {
            const res = await axios.get(url, { responseType: 'stream', timeout: 30000 })
            await new Promise((resolve, reject) => {
                res.data
                    .pipe(unzipper.Extract({ path: './session' }))
                    .on('close', resolve)
                    .on('error', reject)
            })
            if (fs.existsSync('./session/creds.json')) {
                try {
                    fs.writeFileSync(idPath, config.SESSION_ID)
                } catch {}
                console.log('✅ Session downloaded!\n')
                return true
            }
        } catch {}
    }

    console.log('❌ Could not download session. Add session files manually.\n')
    return false
}

// ── Auto-setup yt-dlp & ffmpeg on Linux ───────────────────────
async function ensureYtdlp() {
    if (process.platform === 'win32') return
    const { execSync } = await import('child_process')

    // ── 1. Ensure yt-dlp ──────────────────────────────────────
    let ytdlpOk = false
    try { execSync('which yt-dlp', { stdio: 'ignore' }); ytdlpOk = true } catch {}
    if (!ytdlpOk && fs.existsSync('./yt-dlp')) ytdlpOk = true

    if (!ytdlpOk) {
        console.log('📥 Downloading yt-dlp for Linux...')
        try {
            const res = await axios.get(
                'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp',
                { responseType: 'arraybuffer', timeout: 60000 }
            )
            fs.writeFileSync('./yt-dlp', Buffer.from(res.data))
            execSync('chmod +x ./yt-dlp')
            console.log('✅ yt-dlp ready!\n')
        } catch (e) {
            console.error('❌ Failed to download yt-dlp:', e.message)
        }
    }

    // ── 2. Ensure ffmpeg via apt (only if not installed) ──────
    let ffmpegOk = false
    try { execSync('which ffmpeg', { stdio: 'ignore' }); ffmpegOk = true } catch {}

    if (!ffmpegOk) {
        console.log('📥 Installing ffmpeg via apt (this may take ~30s)...')
        try {
            execSync('apt-get install -y ffmpeg', { stdio: 'pipe' })
            console.log('✅ ffmpeg installed!\n')
        } catch {
            try {
                execSync('sudo apt-get install -y ffmpeg', { stdio: 'pipe' })
                console.log('✅ ffmpeg installed (sudo)!\n')
            } catch (e2) {
                console.error('❌ Could not install ffmpeg automatically:', e2.message)
            }
        }
    }
}

// ── Bot ────────────────────────────────────────────────────
let pluginsLoaded = false

async function startBot() {
    if (!pluginsLoaded) {
        const ok = await getSession()
        if (!ok && !fs.existsSync('./session/creds.json')) {
            console.log('Exiting — no session found.')
            process.exit(1)
        }

        console.log('\n╔══════════════════════════╗')
        console.log('║   AHMED-MD BOT LOADING   ║')
        console.log('╚══════════════════════════╝\n')

        await ensureYtdlp()
        await loadPlugins()
        pluginsLoaded = true
    }

    const { state, saveCreds } = await useMultiFileAuthState('./session')
    const { version }          = await fetchLatestBaileysVersion()

    const client = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        browser:                       ['Ubuntu', 'Chrome', '20.0.0'],
        generateHighQualityLinkPreview: false,
        syncFullHistory:               false,
        markOnlineOnConnect:           true,
        defaultQueryTimeoutMs:         60_000,
        getMessage: async (key) => {
            const cached = msgCache.get(key.id)
            if (cached) return cached.message
            return { conversation: '' }
        }
    })

    // ── Connection Events ──────────────────────────────────
    client.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            if (code === DisconnectReason.loggedOut) {
                console.log('\n🔴 Logged out! Clearing session...\n')
                fs.emptyDirSync('./session')
                process.exit(0)
            } else {
                console.log('🔄 Reconnecting in 3s...')
                setTimeout(startBot, 3000)
            }
        } else if (connection === 'open') {
            console.log('\n╔══════════════════════╗')
            console.log('║  AHMED-MD ONLINE ✅   ║')
            console.log('╚══════════════════════╝\n')

            // Auto owner = bot's own number if not set
            if (client.user?.id) {
                const botNum = client.user.id.split(':')[0]
                if (!config.OWNER_NUMBER) {
                    config.OWNER_NUMBER = botNum
                    console.log(`👑 Owner      : ${botNum} (auto)`)
                } else {
                    console.log(`👑 Owner      : ${config.OWNER_NUMBER}`)
                }
                console.log(`📱 Bot Number : ${botNum}`)
                console.log(`🔐 Mode       : ${config.MODE}\n`)
            }

            // Dynamic Bio Loop (Updates every 60 seconds)
            setInterval(async () => {
                try {
                    const now = new Date()
                    const timeStr = now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
                    const dateStr = now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: 'numeric' })
                    
                    const uptimeSec = Math.floor(process.uptime())
                    const hours = Math.floor(uptimeSec / 3600)
                    const minutes = Math.floor((uptimeSec % 3600) / 60)
                    const uptimeStr = `${hours}h ${minutes}m`

                    const { commands } = await import('./lib/handler.js')
                    const cmdCount = commands ? commands.length : 81

                    const bioText = `AHMED-MD 🤖 | 🕐 ${timeStr} | 📅 ${dateStr} | ⚙️ ${cmdCount} Cmds | ⏳ Up: ${uptimeStr}`
                    await client.updateProfileStatus(bioText)
                } catch (e) {
                    console.error('[Dynamic Bio Error]', e.message)
                }
            }, 60000)

            // Resolve owner LIDs on startup to map them in lidCache in background
            if (config.OWNER_NUMBER) {
                setTimeout(async () => {
                    const ownerList = String(config.OWNER_NUMBER || '')
                        .split(/[ ,;]+/)
                        .map(num => num.trim())
                        .filter(Boolean)

                    for (const owner of ownerList) {
                        try {
                            const [res] = await client.onWhatsApp(owner)
                            if (res && res.lid) {
                                updateLidCache([{
                                    id: res.jid || `${owner}@s.whatsapp.net`,
                                    lidJid: res.lid
                                }])
                                console.log(`[LID RESOLVE] Resolved owner ${owner} to LID ${res.lid}`)
                            }
                        } catch (e) {
                            console.error(`[LID RESOLVE ERR] Failed to resolve owner ${owner}:`, e.message)
                        }
                    }
                }, 5000)
            }

            // Map group participants from all participating groups to populate lidCache
            setTimeout(async () => {
                try {
                    const chats = await client.groupFetchAllParticipating()
                    const mappings = []
                    for (const jid of Object.keys(chats)) {
                        const meta = chats[jid]
                        if (meta && meta.participants) {
                            for (const p of meta.participants) {
                                if (p.id.endsWith('@lid') && p.phoneNumber) {
                                    mappings.push({ id: p.phoneNumber, lidJid: p.id })
                                } else if (p.lid && !p.id.endsWith('@lid')) {
                                    mappings.push({ id: p.id, lidJid: p.lid })
                                }
                            }
                        }
                    }
                    if (mappings.length > 0) {
                        updateLidCache(mappings)
                        console.log(`[LID CACHE] Mapped ${mappings.length} participants from participating groups`)
                    }
                } catch (e) {
                    console.error('[LID CACHE ERR] Failed to fetch participating groups for LID mapping:', e.message)
                }
            }, 10000)

            // Startup message to owner
            if (config.OWNER_NUMBER) {
                try {
                    const caption = 
                        `╔══════════════════════╗\n` +
                        `║  *AHMED-MD ONLINE* ✅  ║\n` +
                        `╚══════════════════════╝\n\n` +
                        `✨ *AHMED-MD has successfully started!*\n` +
                        `AHMED-MD is a premium multi-device WhatsApp bot built for maximum speed, advanced moderation, and rich utility.\n\n` +
                        `💬 *How to use:*\n` +
                        `◦ Type *${config.PREFIX || '.'}menu* to see all commands.\n\n` +
                        `📢 *Official Channels:*\n\n` +
                        `◦ *WhatsApp Channel:*\n` +
                        `  https://whatsapp.com/channel/0029Vb8EK6l3gvWfrZpfOm23\n\n` +
                        `◦ *Telegram Channel:*\n` +
                        `  https://t.me/ahmedxtech\n\n` +
                        `🌐 *Pairing Website:* ahmedxmd.com\n\n` +
                        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

                    if (fs.existsSync('./online.jpg')) {
                        const onlineImg = fs.readFileSync('./online.jpg')
                        await client.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, {
                            image: onlineImg,
                            caption: caption
                        })
                    } else {
                        await client.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, {
                            text: caption
                        })
                    }
                } catch (e) {
                    console.error('Error sending startup message:', e)
                }
            }

            // Auto Update Checker (runs on startup and every 6 hours)
            if (config.OWNER_NUMBER) {
                let lastNotifiedCommits = ''
                const checkUpdates = async () => {
                    try {
                        const { exec } = await import('child_process')
                        exec('git fetch && git log HEAD..origin/main --oneline', (err, stdout, stderr) => {
                            if (!err && stdout.trim()) {
                                const commitsStr = stdout.trim()
                                if (commitsStr === lastNotifiedCommits) return
                                lastNotifiedCommits = commitsStr

                                const commits = commitsStr.split('\n')
                                const updMsg = `🔔 *AHMED-MD NEW UPDATE AVAILABLE!* 🔔\n\n` +
                                                `We have pushed new updates to the repository. Please update your bot to avoid any issues.\n\n` +
                                                `📝 *New Commits:*\n` +
                                                `\`\`\`\n` +
                                                commits.map(c => `• ${c}`).join('\n') +
                                                `\n\`\`\`\n\n` +
                                                `👉 Type *${config.PREFIX || '.'}update* on WhatsApp to pull updates and restart the bot automatically!`
                                                
                                client.sendMessage(`${config.OWNER_NUMBER}@s.whatsapp.net`, { text: updMsg })
                            }
                        })
                    } catch {}
                }

                // Startup check (15 seconds after boot)
                setTimeout(checkUpdates, 15000)

                // Periodic check (every 6 hours)
                setInterval(checkUpdates, 6 * 60 * 60 * 1000)
            }
        }
    })

    client.ev.on('creds.update', saveCreds)

    // ── LID → Phone mapping ────────────────────────────────
    client.ev.on('contacts.upsert', (contacts) => {
        try { updateLidCache(contacts) } catch {}
    })
    client.ev.on('contacts.update', (contacts) => {
        try { updateLidCache(contacts) } catch {}
    })

    client.ev.on('messages.upsert', async ({ messages, type }) => {
        for (const m of messages) {
            console.log(`[DEBUG UPSERT] JID: ${m.key?.remoteJid} | Participant: ${m.key?.participant} | Keys: ${m.message ? Object.keys(m.message).join(', ') : 'none'}`)
            
            if (m.key?.remoteJid === 'status@broadcast') {
                const { default: db } = await import('./lib/database.js')
                if (db.data.settings.statusview) {
                    try {
                        const participant = m.key.participant ? decodeJid(m.key.participant) : ''
                        if (participant) {
                            const cleanKey = {
                                id: m.key.id,
                                remoteJid: m.key.remoteJid,
                                participant: participant
                            }
                            await client.readMessages([cleanKey])
                            console.log(`[STATUS VIEW] Viewed status of @${participant.split('@')[0]} (Type: ${type})`)

                            if (db.data.settings.statusreact) {
                                const emojis = ['😁', '😆', '😅', '😂', '🥹', '🤣', '🥲', '☺️', '😇', '🙂', '🙃', '😘', '😉', '😙', '🥸', '🤓', '😜', '🙁', '😞', '☹️', '😣', '🥳', '😫', '😖', '😒', '😢', '🤯', '😤', '🥵', '😤', '🥶', '🫢', '😰', '🤔', '🫤', '😑', '🫨', '🙄', '🤫', '🤥', '😶', '🫥', '😶‍🌫', '🥶']
                                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                                await client.sendMessage(m.key.remoteJid, {
                                    react: { key: cleanKey, text: randomEmoji }
                                }, { statusJidList: [participant] })
                                console.log(`[STATUS REACT] Reacted ${randomEmoji} to @${participant.split('@')[0]}`)
                            }
                        }
                    } catch (e) {
                        console.error('[STATUS VIEW/REACT ERR]', e.message)
                    }
                }
                continue
            }

            if (!m.message) continue
        }

        if (type !== 'notify') return
        for (const m of messages) {
            if (!m.message || m.key.remoteJid === 'status@broadcast') continue
            await handleMessage(client, m)
        }
    })

    // ── Call Handler ───────────────────────────────────────
    client.ev.on('call', async (calls) => {
        const { default: db } = await import('./lib/database.js')
        if (!db.data.settings.anticall) return
        for (const call of calls) {
            if (call.status === 'offer') {
                await client.rejectCall(call.id, call.from)
                await client.sendMessage(call.from, { text: '❌ *Busy*' })
            }
        }
    })

    // ── Group Participants Handler ─────────────────────────
    client.ev.on('group-participants.update', async (update) => {
        const { default: db } = await import('./lib/database.js')
        const { id, participants, action, author, authorPn } = update
        
        try {
            const meta = await client.groupMetadata(id)
            for (let jid of participants) {
                if (typeof jid === 'object' && jid.id) jid = jid.id
                jid = String(jid)

                // Resolve LID to real phone JID using group metadata
                let realJid = jid
                if (!jid.includes('@s.whatsapp.net')) {
                    const lidNum = jid.split('@')[0].split(':')[0]
                    const found = meta.participants.find(p => {
                        const pLid = (p.lid || '').split('@')[0].split(':')[0]
                        return pLid === lidNum
                    })
                    if (found) realJid = found.id
                }

                const num = realJid.split('@')[0].split(':')[0]

                // Resolve author to real phone number using authorPn first, then fallback
                let authorRealNum = ''
                if (authorPn) {
                    authorRealNum = String(authorPn).split('@')[0].split(':')[0].trim()
                } else if (author) {
                    // Try to resolve LID from meta participants
                    const authorLidNum = String(author).split('@')[0].split(':')[0]
                    const foundAuthor = meta.participants.find(p => {
                        const pLid = (p.lid || '').split('@')[0].split(':')[0]
                        return pLid === authorLidNum
                    })
                    if (foundAuthor) {
                        authorRealNum = foundAuthor.id.split('@')[0].split(':')[0]
                    } else {
                        authorRealNum = authorLidNum
                    }
                }

                const authorJid = author || (client.user?.id || '')
                const adminNum = authorRealNum || 'Someone'

                // Welcome / Goodbye
                if (db.data.welcome?.[id]) {
                    if (action === 'add') {
                        let pp = 'https://i.ibb.co/3pYnLqL/def.jpg'
                        try { pp = await client.profilePictureUrl(realJid, 'image') } catch {}
                        await client.sendMessage(id, { 
                            image: { url: pp },
                            caption: `👋 Welcome @${num} to *${meta.subject}*!\n\n> Enjoy your stay!`,
                            mentions: [realJid]
                        })
                    } else if (action === 'remove') {
                        let pp = 'https://i.ibb.co/3pYnLqL/def.jpg'
                        try { pp = await client.profilePictureUrl(realJid, 'image') } catch {}
                        await client.sendMessage(id, { 
                            image: { url: pp },
                            caption: `👋 @${num} left *${meta.subject}*.\n\n> Goodbye!`,
                            mentions: [realJid]
                        })
                    }
                }

                // Alerts & Anti-Admin for promote/demote
                if (action === 'promote') {
                    let antiadminTriggered = false
                    
                    if (db.data.antiadmin?.[id]) {
                        const botNum = String(client.user?.id || '').split(':')[0].split('@')[0].trim()
                        const ownerNum = String(config.OWNER_NUMBER || '').trim()
                        const jidNum = num

                        const isAuthorExempt = (authorRealNum === botNum || authorRealNum === ownerNum)
                        const isTargetExempt = (jidNum === botNum || jidNum === ownerNum)

                        if (!isAuthorExempt) {
                            antiadminTriggered = true
                            let toDemote = [authorJid]
                            if (!isTargetExempt) toDemote.push(realJid)

                            await client.groupParticipantsUpdate(id, toDemote, 'demote')
                            await client.sendMessage(id, {
                                text: `🛡️ *ANTI-ADMIN TRIGGERED*\n\n@${adminNum} tried to promote @${jidNum}, so action was taken!`,
                                mentions: [authorJid, realJid]
                            })
                        }
                    }

                    if (db.data.alert?.[id] && !antiadminTriggered) {
                        const allAdmins = meta.participants.filter(p => p.admin).map(p => p.id)
                        const mentions = [...new Set([authorJid, realJid, ...allAdmins])]
                        const msgText = authorRealNum
                            ? `⚠️ *ADMIN ALERT*\n\n@${adminNum} has *PROMOTED* @${num} to Admin! 👑`
                            : `⚠️ *ADMIN ALERT*\n\n@${num} has been *PROMOTED* to Admin! 👑`
                        await client.sendMessage(id, { text: msgText, mentions })
                    }

                } else if (action === 'demote') {
                    if (db.data.alert?.[id]) {
                        const allAdmins = meta.participants.filter(p => p.admin).map(p => p.id)
                        const mentions = [...new Set([authorJid, realJid, ...allAdmins])]
                        const msgText = authorRealNum
                            ? `⚠️ *ADMIN ALERT*\n\n@${adminNum} has *DEMOTED* @${num} from Admin! 🚫`
                            : `⚠️ *ADMIN ALERT*\n\n@${num} has been *DEMOTED* from Admin! 🚫`
                        await client.sendMessage(id, { text: msgText, mentions })
                    }
                }
            }
        } catch (e) {
            console.error('Error in group-participants.update:', e)
        }
    })
}

// ── HTTP Web Server for PaaS Deployments (Render, Koyeb, Railway, etc.) ────
import express from 'express'
const app = express()
const port = process.env.PORT || 8000
app.get('/', (req, res) => {
    res.send('AHMED-MD WhatsApp Bot is active and running!')
})
app.listen(port, () => {
    console.log(`🌐 Server is listening on port ${port} (Health check endpoint ready)`)
})

startBot()

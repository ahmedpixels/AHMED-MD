import { createRequire } from 'module'
import { fileURLToPath }  from 'url'
import { dirname, join }  from 'path'
import { existsSync, readdirSync, writeFileSync } from 'fs'
import { mkdirSync } from 'fs'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import config from '../config.js'
import axios from 'axios'

import { serialize } from './serialize.js'
import db from './database.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

export const commands  = []
export const listeners = []
export const msgCache  = new Map()
const MAX_CACHE = 500

export function bot(info, handler) {
    if (!info || typeof handler !== 'function') return

    // ── Levanter property aliases ──────────────────────────────
    if (info.fromMe    !== undefined) info.owner    = !!info.fromMe
    if (info.onlyGroup !== undefined) info.group    = !!info.onlyGroup
    if (info.onlyPm    !== undefined) info.pm       = !!info.onlyPm
    if (info.onlyAdmin !== undefined) info.admin     = !!info.onlyAdmin
    if (info.dontAddCommandList !== undefined) info.hidden = !!info.dontAddCommandList

    let file = 'unknown'
    try {
        const stack = new Error().stack
        const lines = stack.split('\n')
        const callerLine = lines.find(l => l.includes('/plugins/') || l.includes('\\plugins\\'))
        if (callerLine) {
            const match = callerLine.match(/(?:plugins[/\\])([^?:/\\]+)/)
            if (match) file = match[1]
        }
    } catch {}

    if (info.on) {
        listeners.push({ ...info, handler, file })
    } else {
        const exists = commands.some(c => c.pattern?.toString() === info.pattern?.toString())
        if (!exists) {
            commands.push({ ...info, handler, file })
        }
    }
}

export const Function = bot

function cacheMsg(m) {
    if (!m?.key?.id || !m.message) return
    const type = Object.keys(m.message)[0]
    if (type === 'protocolMessage') return
    msgCache.set(m.key.id, m)
    if (msgCache.size > MAX_CACHE) msgCache.delete(msgCache.keys().next().value)
}

async function safeReact(client, m, emoji) {
    try {
        await client.sendMessage(m.key.remoteJid, { react: { text: emoji, key: m.key } })
    } catch {}
}

export async function loadPlugins() {
    const dir = join(__dirname, '../plugins')
    if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); return }

    const files = readdirSync(dir).filter(f => f.endsWith('.js') || f.endsWith('.cjs'))
    let loaded = 0

    // Ensure customPlugins map exists in db
    if (!db.data.customPlugins) db.data.customPlugins = {}

    for (const file of files) {
        try {
            const filePath = join(dir, file).replace(/\\/g, '/')
            const isCustom = !!(db.data.customPlugins && db.data.customPlugins[file])

            await import(`file:///${filePath}?t=${Date.now()}`)
            console.log(`  ✓ ${file}${isCustom ? ' [Custom]' : ''}`)
            loaded++
        } catch (e) {
            console.error(`  ✗ ${file}: ${e.message}`)
        }
    }
    console.log(`\n  AHMED-MD loaded ${commands.length} commands from ${loaded} plugins\n`)
}

export async function handleMessage(client, m) {
    try {
        if (!m?.message) return
        const contentKeys = Object.keys(m.message).filter(k => k !== 'senderKeyDistributionMessage' && k !== 'messageContextInfo')
        const msgType  = contentKeys[0]
        if (!msgType) return

        // Anti-delete: handle protocolMessage revokes here before skip
        if (msgType === 'protocolMessage' && m.message.protocolMessage?.type === 0) {
            try {
                const proto = m.message.protocolMessage
                const deletedKey = proto.key
                if (deletedKey?.id) {
                    const { default: db } = await import('./database.js')
                    const { default: config } = await import('../config.js')
                    const isGroup = deletedKey.remoteJid?.endsWith('@g.us')
                    const enabled = isGroup ? db.data.settings.antidelete_g : db.data.settings.antidelete_p
                    const original = msgCache.get(deletedKey.id)
                    if (enabled && original) {
                        const delNum = (deletedKey.participant || deletedKey.remoteJid).split('@')[0].split(':')[0]
                        const chatName = isGroup ? 'Group Chat' : 'Private Inbox'
                        let caption = original.message?.conversation || original.message?.extendedTextMessage?.text || original.message?.imageMessage?.caption || original.message?.videoMessage?.caption || ''
                        const report = `🗑️ *ANTI-DELETE*\n👤 @${delNum}\n💬 ${chatName}${caption ? '\n📝 "' + caption + '"' : ''}`
                        const targets = new Set()
                        const selfJid = client.user?.id
                        if (selfJid) {
                            const sid = selfJid.includes(':') ? selfJid.split(':')[0] + '@' + selfJid.split('@')[1] : selfJid
                            targets.add(sid)
                        }
                        const on = (config.OWNER_NUMBER || '').split(/[ ,;]+/)[0]
                        if (on) targets.add(on.includes('@') ? on : on + '@s.whatsapp.net')

                        const origMsg = original.message
                        const img = origMsg?.imageMessage
                        const vid = origMsg?.videoMessage
                        const aud = origMsg?.audioMessage
                        const doc = origMsg?.documentMessage
                        const sticker = origMsg?.stickerMessage

                        for (const t of targets) {
                            try {
                                if (img) {
                                    const buf = await downloadMediaMessage(original, 'buffer', {}, { logger: undefined })
                                    await client.sendMessage(t, { image: buf, caption: report, mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                } else if (vid) {
                                    const buf = await downloadMediaMessage(original, 'buffer', {}, { logger: undefined })
                                    await client.sendMessage(t, { video: buf, caption: report, mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                } else if (aud) {
                                    const buf = await downloadMediaMessage(original, 'buffer', {}, { logger: undefined })
                                    await client.sendMessage(t, { audio: buf, mimetype: aud.mimetype, ptt: aud.ptt, mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                } else if (doc) {
                                    const buf = await downloadMediaMessage(original, 'buffer', {}, { logger: undefined })
                                    await client.sendMessage(t, { document: buf, mimetype: doc.mimetype, fileName: doc.fileName || 'file', caption: report, mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                } else if (sticker) {
                                    const buf = await downloadMediaMessage(original, 'buffer', {}, { logger: undefined })
                                    await client.sendMessage(t, { sticker: buf, mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                } else {
                                    await client.sendMessage(t, { text: report || '🗑️ *Deleted message*', mentions: [deletedKey.participant || deletedKey.remoteJid] })
                                }
                            } catch {
                                try { await client.sendMessage(t, { text: report, mentions: [deletedKey.participant || deletedKey.remoteJid] }) } catch {}
                            }
                        }
                    }
                }
            } catch {}
            return
        }

        if (msgType === 'reactionMessage' || msgType === 'pollUpdateMessage') return

        cacheMsg(m)

        const msg = await serialize(client, m)
        if (!msg) return

        if (msg.text) {
            console.log(`[DEBUG MSG] Text: "${msg.text}" | Sender: ${msg.sender} | resolvedNum: ${msg.senderNum} | isOwner: ${msg.isOwner} | isPublic: ${msg.isPublic}`)
        }

        if (config.AUTO_READ) { try { await client.readMessages([m.key]) } catch {} }

        const isAutoTyping = db.data.settings?.autotyping !== undefined ? db.data.settings.autotyping : config.AUTO_TYPING
        const isAutoRecording = db.data.settings?.autorecording !== undefined ? db.data.settings.autorecording : false

        if (isAutoTyping && msg.text?.startsWith(config.PREFIX)) {
            try { await client.sendPresenceUpdate('composing', msg.jid) } catch {}
        }
        if (isAutoRecording && msg.text?.startsWith(config.PREFIX)) {
            try { await client.sendPresenceUpdate('recording', msg.jid) } catch {}
        }

        // Auto React
        if (db.data.settings.autoreact !== 'off') {
            const shouldReact = 
                (db.data.settings.autoreact === 'on') ||
                (db.data.settings.autoreact === 'g' && msg.isGroup) ||
                (db.data.settings.autoreact === 'p' && !msg.isGroup)

            if (shouldReact) {
                const emojis = ['😁', '😆', '😅', '😂', '🥹', '🤣', '🥲', '☺️', '😇', '🙂', '🙃', '😘', '😉', '😙', '🥸', '🤓', '😜', '🙁', '😞', '☹️', '😣', '🥳', '😫', '😖', '😒', '😢', '🤯', '😤', '🥵', '😤', '🥶', '🫢', '😰', '🤔', '🫤', '😑', '🫨', '🙄', '🤫', '🤥', '😶', '🫥', '😶‍🌫', '🥶']
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]
                console.log(`[AUTOREACT] Reacting to ${msg.jid} with ${randomEmoji}`)
                await msg.react(randomEmoji)
            }
        }

        // Run all text/message listeners
        for (const l of listeners) {
            try {
                if (l.on === 'message') {
                    await l.handler(msg, m)
                }
                if (l.on === 'text' && msg.text) {
                    await l.handler(msg, msg.text)
                }
                if (l.on === 'group' && msg.isGroup) {
                    await l.handler(msg, m)
                }
                if (l.on === 'image' && msgType === 'imageMessage') {
                    await l.handler(msg)
                }
            } catch {}
        }

        if (!msg.text) return
        const prefix = config.PREFIX ?? ''
        if (prefix && !msg.text.startsWith(prefix)) return
        const body = msg.text.slice(prefix.length).trim()
        if (!body) return
        if (!msg.isPublic && !msg.isOwner) return

        for (const cmd of commands) {
            if (!cmd.pattern) continue

            let isMatch = false
            let match = null
            let args = ''

            if (cmd.pattern instanceof RegExp) {
                if (cmd.pattern.test(body)) {
                    isMatch = true
                    match = body.match(cmd.pattern)
                    args = match?.[1]?.trim() || ''
                }
            } else {
                const hasRegexChars = /[\^$\\.*+?()\[\]{}|]/.test(cmd.pattern)
                let regex
                if (hasRegexChars) {
                    try {
                        regex = new RegExp(`^${cmd.pattern}$`, 'i')
                    } catch {
                        regex = new RegExp(`^${cmd.pattern.split(' ')[0]}(\\s+.*)?$`, 'i')
                    }
                } else {
                    regex = new RegExp(`^${cmd.pattern}(\\s+.*)?$`, 'i')
                }

                if (regex.test(body)) {
                    isMatch = true
                    match = body.match(regex)
                    args = match?.[1]?.trim() || ''
                }
            }

            if (!isMatch) continue
            console.log(`[CMD] .${body.split(' ')[0]} | from: ${msg.senderNum} | group: ${msg.isGroup}`)

            if (cmd.owner    && !msg.isOwner)                { await msg.reply(`❌ *Owner only command!*`);    break }
            if (cmd.group    && !msg.isGroup)                { await msg.reply(`❌ *Groups only!*`);           break }
            if (cmd.pm       &&  msg.isGroup)                { await msg.reply(`❌ *DM only command!*`);       break }
            if (cmd.admin    && !msg.isAdmin && !msg.isOwner){ await msg.reply(`❌ *Admins only!*`);           break }
            if (cmd.botAdmin && !msg.isBotAdmin)             { await msg.reply(`❌ *Make me admin first!*`);  break }

            if (!msg.senderLid) safeReact(client, m, '⏳')

            try {
                // Unified execution signature for commands: (msg, match, args)
                await cmd.handler(msg, match, args)

                if (!msg.senderLid) {
                    safeReact(client, m, '✅')
                    setTimeout(() => safeReact(client, m, ''), 3000)
                }
            } catch (e) {
                console.error(`[ERR] ${body}: ${e.message}`)
                await msg.reply(`❌ *Error:* ${e.message}`)
                if (!msg.senderLid) {
                    safeReact(client, m, '❌')
                    setTimeout(() => safeReact(client, m, ''), 3000)
                }
            }
            break
        }
    } catch (e) {
        console.error(`[HANDLER ERR] ${e.message}`)
    }
}

export async function getJson(url, options = {}) {
    try {
        const res = await axios.get(url, options)
        return res.data
    } catch (e) {
        return { status: false, error: e.message }
    }
}

export async function getBuffer(url, options = {}) {
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', ...options })
        return { buffer: Buffer.from(res.data), status: true }
    } catch (e) {
        return { status: false, error: e.message }
    }
}

export const lang = new Proxy({}, {
    get: (target, prop) => {
        if (typeof prop === 'string') {
            return prop.replace(/_/g, ' ').toLowerCase();
        }
        return prop;
    }
})

export const prefix = config.PREFIX || '.'

export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

export function parsedJid(text = '') {
    return text.match(/[0-9]+(-[0-9]+|@g.us|@s.whatsapp.net|@net.whatsapp.net|@private)/g) || []
}

export function isUrl(str) {
    try {
        new URL(str)
        return true
    } catch {
        return false
    }
}

export const decodeJid = (jid) => {
    if (!jid) return jid
    if (/:\d+@/gi.test(jid)) {
        const decode = jid.split(':')
        return (decode[0] + '@' + decode[1].split('@')[1]) || jid
    }
    return jid
}

export function toJid(num) {
    if (!num) return ''
    const clean = num.replace(/[^0-9]/g, '')
    return clean.endsWith('@g.us') ? clean : `${clean}@s.whatsapp.net`
}

// ── Persistent env-var helpers (Levanter-compatible) ─────────────────────────
const PROTECTED_KEYS = ['SESSION_ID', 'BOT_NAME']

// setVar supports BOTH formats:
//   Our format:      setVar('KEY', 'value')
//   Levanter format: setVar({ KEY: 'value' }, sessionId)
export function setVar(keyOrObj, valueOrSession) {
    if (keyOrObj && typeof keyOrObj === 'object' && !Array.isArray(keyOrObj)) {
        // ── Levanter format: setVar({ KEY: val, KEY2: val2 }, sessionId) ──
        const results = []
        for (const [k, v] of Object.entries(keyOrObj)) {
            const upperKey = String(k).trim().toUpperCase()
            if (PROTECTED_KEYS.includes(upperKey)) continue  // skip protected silently
            process.env[upperKey] = String(v)
            config[upperKey] = String(v)
            if (!db.data.settings) db.data.settings = {}
            db.data.settings[upperKey] = String(v)
            results.push({ key: upperKey, value: String(v) })
        }
        if (results.length) db.save()
        return results
    }
    // ── Our format: setVar('KEY', 'value') ──
    if (!keyOrObj) throw new Error('Key is required')
    const upperKey = String(keyOrObj).trim().toUpperCase()
    if (PROTECTED_KEYS.includes(upperKey)) throw new Error(`🔒 '${upperKey}' is a protected variable and cannot be modified!`)
    process.env[upperKey] = String(valueOrSession)
    config[upperKey] = String(valueOrSession)
    if (!db.data.settings) db.data.settings = {}
    db.data.settings[upperKey] = String(valueOrSession)
    db.save()
    return { key: upperKey, value: String(valueOrSession) }
}

export function getVar(key) {
    if (!key) return null
    const upperKey = String(key).trim().toUpperCase()
    if (db.data.settings && db.data.settings[upperKey] !== undefined) {
        return db.data.settings[upperKey]
    }
    return process.env[upperKey] ?? null
}

export function delVar(key) {
    if (!key) throw new Error('Key is required')
    const upperKey = String(key).trim().toUpperCase()
    if (PROTECTED_KEYS.includes(upperKey)) throw new Error(`🔒 '${upperKey}' is a protected variable and cannot be deleted!`)
    delete process.env[upperKey]
    delete config[upperKey]
    if (db.data.settings) {
        delete db.data.settings[upperKey]
        db.save()
    }
    return upperKey
}

export function getAllVars() {
    return { ...(db.data.settings || {}) }
}

// ── Levanter-compatible getData / setData (session-agnostic key-value store) ─
export async function getData(key, _sessionId) {
    // sessionId is ignored — we use a single shared DB (single-session bot)
    if (!key) return null
    const upperKey = String(key).trim().toUpperCase()
    if (db.data.settings && db.data.settings[upperKey] !== undefined) {
        return db.data.settings[upperKey]
    }
    return process.env[upperKey] ?? null
}

export async function setData(key, value, _sessionId) {
    return setVar(key, value)
}

export async function delData(key, _sessionId) {
    return delVar(key)
}

// ── Levanter JID helpers ──────────────────────────────────────────────────────
// jidToNum: extract phone number from JID
export function jidToNum(jid) {
    if (!jid) return ''
    return jid.split('@')[0].split(':')[0]
}

// numToJid: convert phone number to WhatsApp JID
export function numToJid(num) {
    if (!num) return ''
    const clean = String(num).replace(/[^0-9]/g, '')
    return `${clean}@s.whatsapp.net`
}

// getJid: resolve phone number or JID to full WA JID (async for Levanter compat)
export async function getJid(numOrJid, _sessionId) {
    if (!numOrJid) return ''
    const str = String(numOrJid)
    if (str.includes('@')) return str       // already a JID
    const clean = str.replace(/[^0-9]/g, '')
    return `${clean}@s.whatsapp.net`
}

export { config }


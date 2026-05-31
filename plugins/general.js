import { bot } from '../lib/handler.js'
import config from '../config.js'
import { createRequire } from 'module'
import os from 'os'
import axios from 'axios'
import fs from 'fs'

const startTime = Date.now()
const uptime = () => {
    const s = Math.floor((Date.now() - startTime) / 1000)
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`
}

bot({ pattern: 'ping', desc: 'Check bot speed', type: 'general' }, async (msg) => {
    const start = Date.now()
    await msg.reply('*Pinging...*')
    const ping = Date.now() - start
    await msg.reply(`⚡ *Ping:* ${ping}ms\n⏱️ *Uptime:* ${uptime()}\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`)
})

bot({ pattern: 'alive', desc: 'Check if bot is alive', type: 'general' }, async (msg) => {
    const text = `╔══════════════════════╗\n║   *AHMED-MD ALIVE* ✅ ║\n╚══════════════════════╝\n\n` +
                 `🤖 *Bot:* ${config.BOT_NAME}\n⏱️ *Uptime:* ${uptime()}\n` +
                 `👑 *Owner:* ${config.OWNER_NUMBER}\n🔰 *Mode:* ${config.MODE}\n📌 *Prefix:* ${config.PREFIX||'None'}\n\n` +
                 `> _AHMED-MD is always here for you!_ 💫`

    try {
        const urlOrPath = config.ALIVE_IMAGE
        if (urlOrPath && urlOrPath.startsWith('http')) {
            await msg.client.sendMessage(msg.jid, {
                image: { url: urlOrPath },
                caption: text
            }, { quoted: msg.raw })
            return
        } else if (urlOrPath && fs.existsSync(urlOrPath)) {
            await msg.client.sendMessage(msg.jid, {
                image: fs.readFileSync(urlOrPath),
                caption: text
            }, { quoted: msg.raw })
            return
        }
    } catch (e) {
        console.error('[Alive Image Send Error]', e.message)
    }
    await msg.reply(text)
})

bot({ pattern: 'info', desc: 'Bot information', type: 'general' }, async (msg) => {
    const mem = process.memoryUsage()
    await msg.reply(
        `📊 *AHMED-MD INFO*\n\n` +
        `🤖 *Name:* ${config.BOT_NAME}\n🔢 *Version:* 1.0.0\n` +
        `🖥️ *Platform:* ${os.platform()}\n⏱️ *Uptime:* ${uptime()}\n` +
        `💾 *RAM:* ${(mem.heapUsed/1024/1024).toFixed(1)}MB\n` +
        `📦 *Node:* ${process.version}\n⚡ *Library:* Baileys 7.x\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )
})

bot({ pattern: 'speed', desc: 'Check connection speed', type: 'general' }, async (msg) => {
    const t1 = Date.now()
    try {
        await axios.get('https://www.google.com', { timeout: 5000 })
        const ms = Date.now() - t1
        await msg.reply(`🌐 *Speed*\n\n📡 *Ping:* ${ms}ms\n🔰 *Status:* ${ms<200?'🟢 Excellent':ms<500?'🟡 Good':'🔴 Slow'}`)
    } catch {
        await msg.reply(`❌ *Could not reach internet.*`)
    }
})

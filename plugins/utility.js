import { bot } from '../lib/handler.js'
import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

// ── .vv (View Once) ───────────────────────────────────────
bot({ pattern: 'vv', desc: 'Open view-once messages', type: 'utility' }, async (msg) => {
    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    if (!ctx || !ctx.quotedMessage) return msg.reply('❌ *Reply to a view-once message!*')

    const q = ctx.quotedMessage
    console.log('Quoted Message Keys:', Object.keys(q))
    if (q.viewOnceMessageV2) console.log('viewOnceMessageV2 Keys:', Object.keys(q.viewOnceMessageV2))
    
    let viewOnce = q.viewOnceMessage?.message || q.viewOnceMessageV2?.message || q.viewOnceMessageV2Extension?.message
    
    // Fallback if it's directly inside imageMessage
    if (!viewOnce && (q.imageMessage || q.videoMessage || q.audioMessage)) {
        if (q.imageMessage?.viewOnce || q.videoMessage?.viewOnce || q.audioMessage?.viewOnce) {
            viewOnce = q
        } else {
            // Sometimes it's just the message itself without the viewOnce flag if Baileys stripped it?
            viewOnce = q
        }
    }

    if (!viewOnce) return msg.reply(`❌ *This is not a view-once message!*\nDebug: ${Object.keys(q).join(', ')}`)

    const img = viewOnce.imageMessage
    const vid = viewOnce.videoMessage
    const aud = viewOnce.audioMessage

    if (!img && !vid && !aud) return msg.reply('❌ *Unsupported view-once media!*')

    try {
        const messageObj = img ? { imageMessage: img } : vid ? { videoMessage: vid } : { audioMessage: aud }
        const quotedKey = { remoteJid: msg.jid, id: ctx.stanzaId, participant: ctx.participant }
        
        const buf = await downloadMediaMessage({ key: quotedKey, message: messageObj }, 'buffer', {}, {
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: msg.client.updateMediaMessage
        })

        if (img) {
            await msg.client.sendMessage(msg.jid, { image: buf, caption: img.caption || '' }, { quoted: m })
        } else if (vid) {
            await msg.client.sendMessage(msg.jid, { video: buf, caption: vid.caption || '' }, { quoted: m })
        } else if (aud) {
            await msg.client.sendMessage(msg.jid, { audio: buf, ptt: true }, { quoted: m })
        }
    } catch (e) {
        await msg.reply(`❌ *Failed to open view-once:* ${e.message}`)
    }
})

// ── .tr (Translate) ────────────────────────────────────────
bot({ pattern: 'tr', desc: 'Translate text (.tr en Hello)', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply(
        `❌ *Usage:* \`.tr <lang> <text>\`\n\n` +
        `*Examples:*\n` +
        `◦ \`.tr ur Hello how are you\`\n` +
        `◦ \`.tr en میں ٹھیک ہوں\`\n` +
        `◦ \`.tr ar Good morning\``
    )

    const parts  = args.trim().split(' ')
    const lang   = parts[0]
    const text   = parts.slice(1).join(' ')

    if (!text) return msg.reply('❌ *Provide text after language code!*')

    try {
        const res = await axios.get(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`,
            { timeout: 10000 }
        )
        const translated = res.data?.responseData?.translatedText
        if (!translated) return msg.reply('❌ *Translation failed!*')

        await msg.reply(
            `🌍 *Translation*\n\n` +
            `📝 *Original:* ${text}\n` +
            `🔄 *Language:* ${lang.toUpperCase()}\n` +
            `✅ *Result:* ${translated}`
        )
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .tts (Text to Speech) ─────────────────────────────────
bot({ pattern: 'tts ?(.*)', desc: 'Text to speech with realistic voices', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply(
        '❌ *Usage:* `.tts <voice> <text>`\n\n' +
        '*🎤 Female Voices:*\n' +
        '• `joanna` — Natural & Realistic\n' +
        '• `salli` — Warm Female\n' +
        '• `kendra` — Energetic Female\n' +
        '• `kimberly` — Friendly Female\n' +
        '• `amy` — British Female\n' +
        '• `emma` — British Female\n' +
        '• `ruth` — US Female\n' +
        '• `ivy` — Childlike Female\n\n' +
        '*🗣 Male Voices:*\n' +
        '• `stephen` — US Male\n' +
        '• `michael` — US Male\n' +
        '• `brian` — British Male\n\n' +
        '*🌍 Languages (Google):*\n' +
        '• `ur` Urdu • `ar` Arabic • `hi` Hindi\n' +
        '• `es` Spanish • `fr` French • `de` German\n\n' +
        '📌 *Examples:*\n' +
        '`.tts joanna Hello, how are you?`\n' +
        '`.tts ur kaisa ho`'
    )

    try {
        let text = args.trim()
        const parts = text.split(/\s+/)
        const first = parts[0].toLowerCase()

        const langCodes = ['en','ur','ar','hi','bn','pt','es','fr','de','ja','ko','zh','ru','it']
        const streamVoices = {
            'joanna': 'Joanna', 'salli': 'Salli', 'kendra': 'Kendra',
            'kimberly': 'Kimberly', 'amy': 'Amy', 'emma': 'Emma',
            'ruth': 'Ruth', 'ivy': 'Ivy',
            'stephen': 'Stephen', 'michael': 'Michael', 'brian': 'Brian'
        }

        if (streamVoices[first]) {
            const voice = streamVoices[first]
            const speech = parts.slice(1).join(' ').trim()
            if (!speech) return msg.reply('❌ *Provide text after voice name!*')
            const url = `https://api.streamelements.com/kappa/v2/tts?voice=${voice}&text=${encodeURIComponent(speech)}`
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
            await msg.client.sendMessage(msg.jid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: msg.raw })
        } else if (langCodes.includes(first)) {
            const lang = first
            const speech = parts.slice(1).join(' ').trim() || parts.slice(0).join(' ')
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(speech)}&tl=${lang}&client=tw-ob`
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
            await msg.client.sendMessage(msg.jid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: msg.raw })
        } else {
            // Default: English with Joanna (best realistic female)
            const url = `https://api.streamelements.com/kappa/v2/tts?voice=Joanna&text=${encodeURIComponent(text)}`
            const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 })
            await msg.client.sendMessage(msg.jid, { audio: Buffer.from(res.data), mimetype: 'audio/mpeg' }, { quoted: msg.raw })
        }
    } catch (e) {
        await msg.reply(`❌ *TTS Failed:* ${e.message}`)
    }
})

// ── .weather ──────────────────────────────────────────────
bot({ pattern: 'weather', desc: 'Get weather info (.weather Karachi)', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide city name!*\nExample: .weather Karachi')

    try {
        const res = await axios.get(
            `https://wttr.in/${encodeURIComponent(args)}?format=j1`,
            { timeout: 10000 }
        )
        const d   = res.data?.current_condition?.[0]
        const loc = res.data?.nearest_area?.[0]
        if (!d) return msg.reply('❌ *City not found!*')

        const city    = loc?.areaName?.[0]?.value || args
        const country = loc?.country?.[0]?.value || ''
        const temp    = d.temp_C
        const feels   = d.FeelsLikeC
        const humidity= d.humidity
        const wind    = d.windspeedKmph
        const desc    = d.weatherDesc?.[0]?.value

        await msg.reply(
            `🌤️ *Weather — ${city}, ${country}*\n\n` +
            `🌡️ *Temperature:* ${temp}°C (Feels ${feels}°C)\n` +
            `💧 *Humidity:* ${humidity}%\n` +
            `💨 *Wind:* ${wind} km/h\n` +
            `☁️ *Condition:* ${desc}`
        )
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .calc ─────────────────────────────────────────────────
bot({ pattern: 'calc', desc: 'Calculator (.calc 5*10+3)', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide expression!*\nExample: .calc 5*10+3')
    try {
        // Safe eval — only allow math characters
        if (!/^[0-9+\-*/.() ]+$/.test(args)) return msg.reply('❌ *Invalid expression!*')
        const result = Function(`"use strict"; return (${args})`)()
        await msg.reply(`🧮 *Calculator*\n\n📝 ${args}\n✅ = *${result}*`)
    } catch {
        await msg.reply('❌ *Invalid math expression!*')
    }
})

// ── .time ─────────────────────────────────────────────────
bot({ pattern: 'time', desc: 'Current date and time', type: 'utility' }, async (msg, match, args) => {
    const tz  = args?.trim() || 'Asia/Karachi'
    const now = new Date().toLocaleString('en-PK', { timeZone: tz, dateStyle: 'full', timeStyle: 'long' })
    await msg.reply(`🕐 *Current Time*\n\n📅 ${now}\n🌍 *Zone:* ${tz}`)
})

// ── .qr (QR Code Generator) ──────────────────────────────────
bot({ pattern: 'qr', desc: 'Generate QR Code from text/URL', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide text or link to generate QR Code!*\nExample: .qr https://t.me/ahmedxtech')
    try {
        const url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(args)}`
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 })
        const buf = Buffer.from(res.data)
        await msg.client.sendMessage(msg.jid, {
            image: buf,
            caption: `✨ *QR Code Generated!*\n\n🔗 *Data:* ${args}`
        }, { quoted: msg.raw })
    } catch (e) {
        await msg.reply(`❌ *QR Code Generation Failed:* ${e.message}`)
    }
})

// ── .short (Link Shortener) ──────────────────────────────────
bot({ pattern: 'short', desc: 'Shorten a URL using TinyURL', type: 'utility' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a URL to shorten!*\nExample: .short https://t.me/ahmedxtech')
    const targetUrl = args.trim()
    try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(targetUrl)}`, { timeout: 10000 })
        const shortUrl = String(res.data).trim()
        await msg.reply(`🔗 *URL Shortened!*\n\n📝 *Original:* ${targetUrl}\n✨ *Shortened:* ${shortUrl}`)
    } catch (e) {
        await msg.reply(`❌ *Failed to shorten URL:* ${e.message}`)
    }
})

// ── .poll (Create Group Poll) ──────────────────────────────────
bot({ pattern: 'poll ?(.*)', desc: 'Create a group poll (.poll Title | Opt1 | Opt2)', type: 'utility', group: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide poll question and options separated by "|" !*\nExample: `.poll Which is best? | Apple | Mango | Banana`')
    
    const parts = args.split('|').map(p => p.trim()).filter(Boolean)
    if (parts.length < 3) {
        return msg.reply('❌ *Provide a question and at least 2 options!* \nExample: `.poll Tea or Coffee? | Tea | Coffee`')
    }

    const question = parts[0]
    const options = parts.slice(1)

    try {
        await msg.client.sendMessage(msg.jid, {
            poll: {
                name: question,
                values: options,
                selectableCount: 1
            }
        })
    } catch (e) {
        await msg.reply(`❌ *Failed to create poll:* ${e.message}`)
    }
})

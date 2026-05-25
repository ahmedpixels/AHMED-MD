import { bot } from '../lib/handler.js'
import axios from 'axios'

bot({
    pattern: 'lyrics ?(.*)',
    desc: 'Search lyrics for a song',
    type: 'utility'
}, async (msg, match, args) => {
    if (!args || !args.trim()) {
        return msg.reply(
            `🎵 *Song Lyrics Finder*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*Usage:* \`.lyrics [song name]\`\n\n` +
            `*Examples:*\n` +
            `◦ \`.lyrics Faded\`\n` +
            `◦ \`.lyrics Pasoori\`\n` +
            `◦ \`.lyrics Alan Walker - Faded\`\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    const query = args.trim()
    await msg.reply(`🔍 *Searching lyrics for:* ${query}...`)

    try {
        // Source 1: some-random-api
        const url = `https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`
        const res = await axios.get(url, { timeout: 15000 })
        
        if (res.data && res.data.lyrics) {
            const d = res.data
            const text = `🎵 *Lyrics: ${d.title}*\n` +
                         `👤 *Artist:* ${d.author || 'Unknown'}\n` +
                         `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `${d.lyrics}\n\n` +
                         `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            return await msg.reply(text)
        }
    } catch (e1) {
        console.error('[LYRICS SOURCE 1 ERR]', e1.message)
    }

    try {
        // Fallback Source 2: api.lyrics.ovh
        let artist = 'Unknown'
        let title = query
        if (query.includes('-')) {
            const parts = query.split('-')
            artist = parts[0].trim()
            title = parts[1].trim()
        } else if (query.includes('by')) {
            const parts = query.split('by')
            title = parts[0].trim()
            artist = parts[1].trim()
        }

        const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
        const res = await axios.get(url, { timeout: 15000 })
        if (res.data && res.data.lyrics) {
            const text = `🎵 *Lyrics: ${title}*\n` +
                         `👤 *Artist:* ${artist}\n` +
                         `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `${res.data.lyrics}\n\n` +
                         `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            return await msg.reply(text)
        }
    } catch (e2) {
        console.error('[LYRICS SOURCE 2 ERR]', e2.message)
    }

    await msg.reply('❌ *Lyrics not found!* Try searching with artist name (e.g., `.lyrics Alan Walker - Faded`).')
})

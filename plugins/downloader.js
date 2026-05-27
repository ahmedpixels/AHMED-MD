import { bot } from '../lib/handler.js'
import yts from 'yt-search'
import { youtube } from 'btch-downloader'
import axios from 'axios'

// Convert any YT URL to clean watch URL
function getYTUrl(str) {
    if (!str) return null
    const raw = (str.match(/https?:\/\/[^\s]+/) || [str])[0].trim()
    const short  = raw.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
    if (short)  return `https://www.youtube.com/watch?v=${short[1]}`
    const full   = raw.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
    if (full)   return `https://www.youtube.com/watch?v=${full[1]}`
    const shorts = raw.match(/\/shorts\/([a-zA-Z0-9_-]{11})/)
    if (shorts) return `https://www.youtube.com/watch?v=${shorts[1]}`
    return null
}

// Helper: Format Views & Duration
function formatViews(views) {
    if (!views) return 'N/A'
    if (views >= 1000000000) return (views / 1000000000).toFixed(1) + 'B'
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M'
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K'
    return views.toString()
}

function formatDuration(sec) {
    if (!sec) return '00:00'
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
}

// Helper: Search YouTube via yt-search
async function searchYT(query) {
    const results = await yts(query)
    if (!results?.videos?.length) throw new Error('No results found')
    const v = results.videos[0]
    return {
        id: v.videoId,
        title: v.title,
        duration: v.seconds,
        view_count: v.views,
        channel: v.author?.name,
        uploader: v.author?.name
    }
}

// Helper: Fetch URL as buffer in memory (super fast, no disk write)
async function fetchBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    })
    return Buffer.from(res.data)
}

// ── .yt ────────────────────────────────────────────────────
bot({ pattern: 'yt', desc: 'Download YouTube audio', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.yt https://youtu.be/xxx`')
    const url = getYTUrl(args)
    if (!url) return msg.reply('❌ *Not a valid YouTube link!*')

    await msg.reply('⏳ *Downloading audio...*')
    try {
        const res = await youtube(url)
        if (!res || !res.mp3) return msg.reply('❌ *Failed to get download link!*')

        const title = (res.title || 'Audio').slice(0, 60)
        const buf = await fetchBuffer(res.mp3)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mp4',
            fileName: `${title}.m4a`, ptt: true
        }, { quoted: msg.raw })
        await msg.reply(`✅ *${title}*`)
    } catch (e) {
        console.error('[YT ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .ytmp3 ─────────────────────────────────────────────────
bot({ pattern: 'ytmp3', desc: 'Download YouTube MP3', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.ytmp3 https://youtu.be/xxx`')
    const url = getYTUrl(args)
    if (!url) return msg.reply('❌ *Not a valid YouTube link!*')

    await msg.reply('⏳ *Downloading audio...*')
    try {
        const res = await youtube(url)
        if (!res || !res.mp3) return msg.reply('❌ *Failed to get download link!*')

        const title = (res.title || 'Audio').slice(0, 60)
        const buf = await fetchBuffer(res.mp3)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mp4',
            fileName: `${title}.m4a`, ptt: false
        }, { quoted: msg.raw })
        await msg.reply(`✅ *${title}*`)
    } catch (e) {
        console.error('[YTMP3 ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .ytmp4 ─────────────────────────────────────────────────
bot({ pattern: 'ytmp4', desc: 'Download YouTube MP4', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.ytmp4 https://youtu.be/xxx`')
    const url = getYTUrl(args)
    if (!url) return msg.reply('❌ *Not a valid YouTube link!*')

    await msg.reply('⏳ *Downloading video...*')
    try {
        const res = await youtube(url)
        if (!res || !res.mp4) return msg.reply('❌ *Failed to get download link!*')

        const title = (res.title || 'Video').slice(0, 60)
        const buf = await fetchBuffer(res.mp4)

        if (buf.length > 30 * 1024 * 1024) {
            return msg.reply(`❌ *File too large (${(buf.length/1024/1024).toFixed(1)}MB)!*\n> WhatsApp max limit is 30MB.`)
        }

        await msg.client.sendMessage(msg.jid, {
            video: buf, mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: `🎬 *${title}*`
        }, { quoted: msg.raw })
    } catch (e) {
        console.error('[YTMP4 ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .ytsearch ──────────────────────────────────────────────
bot({ pattern: 'ytsearch', desc: 'Search YouTube', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.ytsearch song name`')
    try {
        const results = await yts(args)
        if (!results?.videos?.length) return msg.reply('❌ *No results!*')

        let text = `🔍 *Results: ${args}*\n\n`
        results.videos.slice(0, 5).forEach((v, i) => {
            text += `*${i+1}.* ${v.title}\n   ⏱️ ${v.timestamp} | 🔗 ${v.url}\n\n`
        })
        await msg.reply(text)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .play ──────────────────────────────────────────────────
bot({ pattern: 'play', desc: 'Search & play song', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.play song name`\nExample: `.play tere bina`')

    try {
        const top = await searchYT(args)
        const ytUrl = `https://www.youtube.com/watch?v=${top.id}`
        const title = (top.title || args).slice(0, 80)
        const dur = top.duration || 0

        const thumbUrl = `https://i.ytimg.com/vi/${top.id}/hqdefault.jpg`
        const viewsStr = formatViews(top.view_count)
        const durStr = formatDuration(dur)
        const channelStr = top.channel || top.uploader || 'YouTube Creator'

        const caption = `🎵 *${title}*\n\n` +
                        `👤 *Channel:* ${channelStr}\n` +
                        `⏱️ *Duration:* ${durStr}\n` +
                        `👁️ *Views:* ${viewsStr}\n\n` +
                        `🎧 *Use headphones for a better experience!*\n\n` +
                        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        await msg.client.sendMessage(msg.jid, {
            image: { url: thumbUrl }, caption
        }, { quoted: msg.raw })

        const res = await youtube(ytUrl)
        if (!res || !res.mp3) return msg.reply('❌ *Failed to get download link!*')

        const buf = await fetchBuffer(res.mp3)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mp4',
            fileName: `${title}.m4a`, ptt: false
        }, { quoted: msg.raw })

    } catch (e) {
        console.error('[PLAY ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .song ──────────────────────────────────────────────────
bot({ pattern: 'song', desc: 'Search & download song', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.song song name`\nExample: `.song tere bina`')

    try {
        const top = await searchYT(args)
        const ytUrl = `https://www.youtube.com/watch?v=${top.id}`
        const title = (top.title || args).slice(0, 80)
        const dur = top.duration || 0

        const thumbUrl = `https://i.ytimg.com/vi/${top.id}/hqdefault.jpg`
        const viewsStr = formatViews(top.view_count)
        const durStr = formatDuration(dur)
        const channelStr = top.channel || top.uploader || 'YouTube Creator'

        const caption = `🎵 *${title}*\n\n` +
                        `👤 *Channel:* ${channelStr}\n` +
                        `⏱️ *Duration:* ${durStr}\n` +
                        `👁️ *Views:* ${viewsStr}\n\n` +
                        `🎧 *Use headphones for a better experience!*\n\n` +
                        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        await msg.client.sendMessage(msg.jid, {
            image: { url: thumbUrl }, caption
        }, { quoted: msg.raw })

        const res = await youtube(ytUrl)
        if (!res || !res.mp3) return msg.reply('❌ *Failed to get download link!*')

        const buf = await fetchBuffer(res.mp3)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mp4',
            fileName: `${title}.m4a`, ptt: false
        }, { quoted: msg.raw })

    } catch (e) {
        console.error('[SONG ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .video ─────────────────────────────────────────────────
bot({ pattern: 'video', desc: 'Search & download video (MP4)', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.video song name`\nExample: `.video tere bina`')

    await msg.reply(`🔍 *Searching:* ${args}...`)
    try {
        const top   = await searchYT(args)
        const ytUrl = `https://www.youtube.com/watch?v=${top.id}`
        const title = (top.title || args).slice(0, 60)

        await msg.reply(`🎬 *Downloading:* ${title}`)

        const res = await youtube(ytUrl)
        if (!res || !res.mp4) return msg.reply('❌ *Failed to get download link!*')

        const buf = await fetchBuffer(res.mp4)

        if (buf.length > 30 * 1024 * 1024) {
            return msg.reply(`❌ *File too large (${(buf.length/1024/1024).toFixed(1)}MB)!* WhatsApp limits apply.`)
        }

        await msg.client.sendMessage(msg.jid, {
            video: buf, mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: `🎬 *${title}*`
        }, { quoted: msg.raw })
    } catch (e) {
        console.error('[VIDEO ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

import { bot } from '../lib/handler.js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, unlinkSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import ffmpegPath from 'ffmpeg-static'
import axios from 'axios'
import FormData from 'form-data'

const execFileAsync = promisify(execFile)
const __dir = dirname(fileURLToPath(import.meta.url))
const YTDLP = resolve(__dir, '../yt-dlp.exe')
const FFDIR = ffmpegPath.replace(/[/\\][^/\\]+$/, '')

function formatDur(sec) {
    if (!sec) return '?'
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = Math.floor(sec % 60)
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${s}s`
}

function formatViews(v) {
    if (!v) return 'N/A'
    if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B'
    if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M'
    if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
    return String(v)
}

async function uploadToCatbox(buffer, filename) {
    const fd = new FormData()
    fd.append('reqtype', 'fileupload')
    fd.append('fileToUpload', buffer, {
        filename,
        contentType: 'video/mp4'
    })
    const res = await axios.post('https://catbox.moe/user/api.php', fd, {
        headers: {
            ...fd.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        timeout: 300000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    })
    return res.data?.trim()
}

// ── .movie — Search movies ─────────────────────────────────
bot({ pattern: 'movie ?(.*)', desc: 'Search and download movies', type: 'movies' }, async (msg, match, args) => {
    if (!args || !args.trim()) return msg.reply(
        `🎬 *Movie Downloader*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Usage:*\n` +
        `◦ \`.movie [movie name]\` → Search results\n` +
        `◦ \`.moviedl [youtube link]\` → Download movie\n\n` +
        `*Examples:*\n` +
        `◦ \`.movie Avengers Endgame\`\n` +
        `◦ \`.movie Inception 2010\`\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )

    await msg.reply(`🔍 *Searching movie:* ${args}...`)

    try {
        const { stdout } = await execFileAsync(YTDLP, [
            `ytsearch5:${args} full movie`,
            '--dump-json', '--no-playlist', '--flat-playlist', '--no-warnings'
        ], { timeout: 30000 })

        const lines = stdout.trim().split('\n').filter(Boolean)
        if (!lines.length) return msg.reply('❌ *No results found! Try different keywords.*')

        let text = `🎬 *Movie Search Results*\n`
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`

        lines.forEach((line, i) => {
            try {
                const v    = JSON.parse(line)
                const dur  = formatDur(v.duration)
                const views = formatViews(v.view_count)
                text += `*${i + 1}.* ${(v.title || '?').slice(0, 70)}\n`
                text += `   ⏱️ ${dur} | 👁️ ${views}\n`
                text += `   🔗 https://youtu.be/${v.id}\n\n`
            } catch {}
        })

        text += `━━━━━━━━━━━━━━━━━━━━━\n`
        text += `📥 *Download:* \`.moviedl [link]\`\n`
        text += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        await msg.reply(text)
    } catch (e) {
        console.error('[MOVIE SEARCH ERR]', e.message)
        await msg.reply(`❌ *Search failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .moviedl — Download movie from link ───────────────────
bot({ pattern: 'moviedl ?(.*)', desc: 'Download movie from YouTube link', type: 'movies' }, async (msg, match, args) => {
    const urlMatch = args?.match(/https?:\/\/[^\s]+/)
    if (!urlMatch) return msg.reply(
        `❌ *Usage:* \`.moviedl [YouTube link]\`\n\n` +
        `*First search:* \`.movie [movie name]\`\n` +
        `*Then copy link and use:* \`.moviedl [link]\``
    )

    const url = urlMatch[0]
    await msg.reply('⏳ *Getting movie info...*')

    const out = `./movie_${Date.now()}.mp4`
    try {
        const { stdout: infoOut } = await execFileAsync(YTDLP, [
            '--dump-json', '--no-playlist', '--no-warnings', url
        ], { timeout: 30000 })

        const info  = JSON.parse(infoOut.trim().split('\n')[0])
        const title = (info.title || 'Movie').slice(0, 70)
        const dur   = info.duration || 0
        const views = formatViews(info.view_count)

        await msg.reply(
            `🎬 *${title}*\n` +
            `⏱️ *Duration:* ${formatDur(dur)}\n` +
            `👁️ *Views:* ${views}\n\n` +
            `⬇️ *Downloading in 480p... Please wait.*\n` +
            `_(Large movies may take 5–10 minutes)_`
        )

        await execFileAsync(YTDLP, [
            '-f', 'best[height<=480][ext=mp4]/best[height<=480]/best[ext=mp4]/best',
            '--ffmpeg-location', FFDIR,
            '-o', out,
            '--no-playlist', '--no-warnings', url
        ], { timeout: 600000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed! File not found.*')

        const buf    = readFileSync(out)
        const sizeMB = (buf.length / 1024 / 1024).toFixed(1)
        unlinkSync(out)

        if (buf.length <= 50 * 1024 * 1024) {
            await msg.client.sendMessage(msg.jid, {
                video:    buf,
                mimetype: 'video/mp4',
                fileName: `${title}.mp4`,
                caption:  `🎬 *${title}*\n📦 Size: ${sizeMB}MB\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            }, { quoted: msg.raw })
        } else {
            await msg.reply(`📦 *File is ${sizeMB}MB — Uploading to catbox.moe...*\n_(This may take a few minutes)_`)
            const link = await uploadToCatbox(buf, `${title}.mp4`)
            if (link && link.startsWith('http')) {
                await msg.reply(
                    `✅ *${title}*\n\n` +
                    `📦 *Size:* ${sizeMB}MB\n` +
                    `🔗 *Download Link:*\n${link}\n\n` +
                    `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
                )
            } else {
                await msg.reply(`❌ *Upload to catbox failed. File may be too large.*`)
            }
        }
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[MOVIEDL ERR]', e.message)
        await msg.reply(`❌ *Download failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .series — Search TV series episodes ───────────────────
bot({ pattern: 'series ?(.*)', desc: 'Search and download TV series episodes', type: 'movies' }, async (msg, match, args) => {
    if (!args || !args.trim()) return msg.reply(
        `📺 *Series Downloader*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Usage:* \`.series [name] [S01E01]\`\n\n` +
        `*Examples:*\n` +
        `◦ \`.series Breaking Bad S01E01\`\n` +
        `◦ \`.series Game of Thrones Season 1 Episode 1\`\n` +
        `◦ \`.series Money Heist S02E03\`\n\n` +
        `📥 *Then download:* \`.moviedl [link]\`\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )

    await msg.reply(`🔍 *Searching series:* ${args}...`)

    try {
        const { stdout } = await execFileAsync(YTDLP, [
            `ytsearch5:${args}`,
            '--dump-json', '--no-playlist', '--flat-playlist', '--no-warnings'
        ], { timeout: 30000 })

        const lines = stdout.trim().split('\n').filter(Boolean)
        if (!lines.length) return msg.reply('❌ *No results found! Try with Season/Episode number.*')

        let text = `📺 *Series Search Results*\n`
        text += `━━━━━━━━━━━━━━━━━━━━━\n\n`

        lines.forEach((line, i) => {
            try {
                const v     = JSON.parse(line)
                const dur   = formatDur(v.duration)
                const views = formatViews(v.view_count)
                text += `*${i + 1}.* ${(v.title || '?').slice(0, 70)}\n`
                text += `   ⏱️ ${dur} | 👁️ ${views}\n`
                text += `   🔗 https://youtu.be/${v.id}\n\n`
            } catch {}
        })

        text += `━━━━━━━━━━━━━━━━━━━━━\n`
        text += `📥 *Download episode:* \`.moviedl [link]\`\n`
        text += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        await msg.reply(text)
    } catch (e) {
        console.error('[SERIES SEARCH ERR]', e.message)
        await msg.reply(`❌ *Search failed:* ${e.message?.slice(0, 200)}`)
    }
})

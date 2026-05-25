import { bot } from '../lib/handler.js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync, unlinkSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { execSync } from 'child_process'
import ffmpegStaticPath from 'ffmpeg-static'

const execFileAsync = promisify(execFile)
const __dir = dirname(fileURLToPath(import.meta.url))
const YTDLP = process.platform === 'win32'
    ? resolve(__dir, '../yt-dlp.exe')
    : existsSync(resolve(__dir, '../yt-dlp'))
        ? resolve(__dir, '../yt-dlp')
        : 'yt-dlp'

// On Linux, prefer system ffmpeg; on Windows use ffmpeg-static
function getFfmpegDir() {
    if (process.platform !== 'win32') {
        try {
            const p = execSync('which ffmpeg', { encoding: 'utf8' }).trim()
            if (p) return p.replace(/\/[^\/]+$/, '')
        } catch {}
        try {
            execSync(`chmod +x "${ffmpegStaticPath}"`, { stdio: 'ignore' })
        } catch {}
    }
    return ffmpegStaticPath.replace(/[/\\][^\/\\]+$/, '')
}
const FFMPEG = getFfmpegDir()

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

async function ytInfo(url) {
    const { stdout } = await execFileAsync(YTDLP, [
        '--dump-json', '--no-playlist', '--no-warnings', url
    ], { timeout: 30000 })
    return JSON.parse(stdout)
}

async function ytDownload(url, type, outPath) {
    const ffDir = FFMPEG
    const args = type === 'audio'
        ? ['-x', '--audio-format', 'mp3', '--audio-quality', '5',
           '--ffmpeg-location', ffDir,
           '-o', outPath, '--no-playlist', '--no-warnings', url]
        : ['-f', 'bestvideo[height<=480]+bestaudio/best[height<=480]',
           '--merge-output-format', 'mp4',
           '--ffmpeg-location', ffDir,
           '-o', outPath, '--no-playlist', '--no-warnings', url]
    await execFileAsync(YTDLP, args, { timeout: 180000 })
}

// ── .yt ────────────────────────────────────────────────────
bot({ pattern: 'yt', desc: 'Download YouTube audio', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.yt https://youtu.be/xxx`')
    const url = getYTUrl(args)
    if (!url) return msg.reply('❌ *Not a valid YouTube link!*')

    await msg.reply('⏳ *Downloading audio...*')
    const tmp = `./yt_${Date.now()}`
    const out = `${tmp}.mp3`
    try {
        const info  = await ytInfo(url)
        const title = (info.title || 'Audio').slice(0, 60)
        const dur   = info.duration || 0
        if (dur > 600) return msg.reply('❌ *Max 10 minutes!*')

        await ytDownload(url, 'audio', `${tmp}.%(ext)s`)
        const buf = readFileSync(out)
        if (existsSync(out)) unlinkSync(out)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`, ptt: true
        }, { quoted: msg.raw })
        await msg.reply(`✅ *${title}*`)
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
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
    const tmp = `./ytmp3_${Date.now()}`
    const out = `${tmp}.mp3`
    try {
        const info  = await ytInfo(url)
        const title = (info.title || 'Audio').slice(0, 60)
        const dur   = info.duration || 0
        if (dur > 600) return msg.reply('❌ *Max 10 minutes!*')

        await ytDownload(url, 'audio', `${tmp}.%(ext)s`)
        const buf = readFileSync(out)
        if (existsSync(out)) unlinkSync(out)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`, ptt: true
        }, { quoted: msg.raw })
        await msg.reply(`✅ *${title}*\n⏱️ ${Math.floor(dur/60)}m ${dur%60}s`)
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[YTMP3 ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .ytmp4 ─────────────────────────────────────────────────
bot({ pattern: 'ytmp4', desc: 'Download YouTube MP4', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.ytmp4 https://youtu.be/xxx`')
    const url = getYTUrl(args)
    if (!url) return msg.reply('❌ *Not a valid YouTube link!*')

    await msg.reply('⏳ *Downloading video... (2-3 min max)*')
    const out = `./ytmp4_${Date.now()}.mp4`
    try {
        const info  = await ytInfo(url)
        const title = (info.title || 'Video').slice(0, 60)
        const dur   = info.duration || 0
        if (dur > 120) return msg.reply('❌ *Max 2 minutes for video!*\n> Use .yt for longer audio')

        // Robust 360p pre-merged or best small format selection (extremely fast)
        await execFileAsync(YTDLP, [
            '-f', '18/best[height<=360]/best[ext=mp4]/best',
            '-o', out,
            '--no-playlist', '--no-warnings', url
        ], { timeout: 120000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed!*')

        const buf = readFileSync(out)
        unlinkSync(out)

        // WhatsApp 16MB limit check
        if (buf.length > 15 * 1024 * 1024) {
            return msg.reply(`❌ *File too large (${(buf.length/1024/1024).toFixed(1)}MB)!*\n> WhatsApp max 16MB. Use .yt for audio.`)
        }

        await msg.client.sendMessage(msg.jid, {
            video: buf, mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: `🎬 *${title}*`
        }, { quoted: msg.raw })
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[YTMP4 ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})


// ── .ytsearch ──────────────────────────────────────────────
bot({ pattern: 'ytsearch', desc: 'Search YouTube', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.ytsearch song name`')
    try {
        const { stdout } = await execFileAsync(YTDLP, [
            `ytsearch5:${args}`, '--dump-json', '--no-playlist',
            '--flat-playlist', '--no-warnings'
        ], { timeout: 20000 })

        const lines = stdout.trim().split('\n').filter(Boolean)
        if (!lines.length) return msg.reply('❌ *No results!*')

        let text = `🔍 *Results: ${args}*\n\n`
        lines.forEach((line, i) => {
            const v = JSON.parse(line)
            const dur = v.duration ? `${Math.floor(v.duration/60)}:${String(v.duration%60).padStart(2,'0')}` : '?'
            text += `*${i+1}.* ${v.title}\n   ⏱️ ${dur} | 🔗 https://youtu.be/${v.id}\n\n`
        })
        await msg.reply(text)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── Helper: Format Views & Duration ──────────────────────
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

// ── Helper: Search top result ──────────────────────────────
async function searchTop(query) {
    const { stdout } = await execFileAsync(YTDLP, [
        `ytsearch1:${query}`, '--dump-json',
        '--no-playlist', '--no-warnings'
    ], { timeout: 20000 })
    const lines = stdout.trim().split('\n').filter(Boolean)
    if (!lines.length) throw new Error('No results found')
    return JSON.parse(lines[0]) // { id, title, duration, view_count, channel, uploader }
}

// ── .play (yt-dlp - MP3 Audio) ─────────────────────────────
bot({ pattern: 'play', desc: 'Search & play song (MP3)', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.play song name`\nExample: `.play tere bina`')

    const out = `./play_${Date.now()}.mp3`
    try {
        const top = await searchTop(args)
        const videoId = top.id || top.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1] || top.webpage_url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1]
        if (!videoId) return msg.reply('❌ *Could not resolve video ID!*')
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
        const title = (top.title || args).slice(0, 80)
        const dur = top.duration || 0
        if (dur > 600) return msg.reply('❌ *Song too long! Max 10 minutes.*')

        const thumbUrl = `https://i.ytimg.com/vi/${top.id}/hqdefault.jpg`
        const viewsStr = formatViews(top.view_count)
        const durStr = formatDuration(dur)
        const channelStr = top.channel || top.uploader || 'YouTube Creator'

        const caption = `🎵 *${title}*\n\n` +
                        `👤 *Channel:* ${channelStr}\n` +
                        `⏱️ *Duration:* ${durStr}\n` +
                        `👁️ *Views:* ${viewsStr}\n` +
                        `🔗 *Link:* ${ytUrl}\n\n` +
                        `🎧 *Use headphones for a better experience!*\n\n` +
                        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        // Send first message with thumbnail & details
        await msg.client.sendMessage(msg.jid, {
            image: { url: thumbUrl },
            caption: caption
        }, { quoted: msg.raw })

        await execFileAsync(YTDLP, [
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '--ffmpeg-location', FFMPEG,
            '-o', out, '--no-playlist', '--no-warnings', ytUrl
        ], { timeout: 120000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed!*')
        const buf = readFileSync(out)
        unlinkSync(out)

        // Send as regular audio (ptt: false) instead of voice note
        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`, ptt: false
        }, { quoted: msg.raw })

    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[PLAY ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .song (yt-dlp - MP3 Audio) ─────────────────────────────
bot({ pattern: 'song', desc: 'Search & download song (MP3)', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.song song name`\nExample: `.song tere bina`')

    const out = `./song_${Date.now()}.mp3`
    try {
        const top = await searchTop(args)
        const videoId = top.id || top.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1] || top.webpage_url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1]
        if (!videoId) return msg.reply('❌ *Could not resolve video ID!*')
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
        const title = (top.title || args).slice(0, 80)
        const dur = top.duration || 0
        if (dur > 600) return msg.reply('❌ *Song too long! Max 10 minutes.*')

        const thumbUrl = `https://i.ytimg.com/vi/${top.id}/hqdefault.jpg`
        const viewsStr = formatViews(top.view_count)
        const durStr = formatDuration(dur)
        const channelStr = top.channel || top.uploader || 'YouTube Creator'

        const caption = `🎵 *${title}*\n\n` +
                        `👤 *Channel:* ${channelStr}\n` +
                        `⏱️ *Duration:* ${durStr}\n` +
                        `👁️ *Views:* ${viewsStr}\n` +
                        `🔗 *Link:* ${ytUrl}\n\n` +
                        `🎧 *Use headphones for a better experience!*\n\n` +
                        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

        // Send first message with thumbnail & details
        await msg.client.sendMessage(msg.jid, {
            image: { url: thumbUrl },
            caption: caption
        }, { quoted: msg.raw })

        await execFileAsync(YTDLP, [
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '--ffmpeg-location', FFMPEG,
            '-o', out, '--no-playlist', '--no-warnings', ytUrl
        ], { timeout: 120000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed!*')
        const buf = readFileSync(out)
        unlinkSync(out)

        // Send as regular audio (ptt: false)
        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`, ptt: false
        }, { quoted: msg.raw })

    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[SONG ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .video (Video MP4) ─────────────────────────────────────
bot({ pattern: 'video', desc: 'Search & download video (MP4)', type: 'download' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Usage:* `.video song name`\nExample: `.video tere bina`')

    await msg.reply(`🔍 *Searching:* ${args}...`)
    const out = `./video_${Date.now()}.mp4`
    try {
        const top   = await searchTop(args)
        const videoId = top.id || top.url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1] || top.webpage_url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/)?.[1]
        if (!videoId) return msg.reply('❌ *Could not resolve video ID!*')
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
        const title = (top.title || args).slice(0, 60)
        const dur   = top.duration || 0

        if (dur > 120) return msg.reply('❌ *Video too long! Max 2 minutes.*\n> Use .play for audio')

        await msg.reply(`🎬 *Downloading:* ${title}`)

        await execFileAsync(YTDLP, [
            '-f', '18/best[height<=360]/best[ext=mp4]/best',
            '-o', out, '--no-playlist', '--no-warnings', ytUrl
        ], { timeout: 120000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed!*')
        const buf = readFileSync(out)
        unlinkSync(out)

        if (buf.length > 15 * 1024 * 1024) {
            return msg.reply(`❌ *File too large!* Use .play for audio.`)
        }

        await msg.client.sendMessage(msg.jid, {
            video: buf, mimetype: 'video/mp4',
            fileName: `${title}.mp4`,
            caption: `🎬 *${title}*`
        }, { quoted: msg.raw })
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[VIDEO ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

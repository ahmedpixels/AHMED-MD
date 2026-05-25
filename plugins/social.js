import { bot } from '../lib/handler.js'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import { existsSync, unlinkSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import ffmpegStaticPath from 'ffmpeg-static'
import axios from 'axios'

const execFileAsync = promisify(execFile)
const __dir = dirname(fileURLToPath(import.meta.url))
const YTDLP = process.platform === 'win32'
    ? resolve(__dir, '../yt-dlp.exe')
    : existsSync(resolve(__dir, '../yt-dlp'))
        ? resolve(__dir, '../yt-dlp')
        : 'yt-dlp'

function getFfmpegDir() {
    if (process.platform !== 'win32') {
        try {
            const p = execSync('which ffmpeg', { encoding: 'utf8' }).trim()
            if (p) return p.replace(/\/[^\/]+$/, '')
        } catch {}
    }
    return ffmpegStaticPath.replace(/[/\\][^/\\]+$/, '')
}
const FFDIR = getFfmpegDir()

function extractUrl(str) {
    const m = str?.match(/https?:\/\/[^\s]+/)
    return m ? m[0].trim() : null
}

async function socialDownload(url, outPath) {
    await execFileAsync(YTDLP, [
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best/mp4',
        '--merge-output-format', 'mp4',
        '--ffmpeg-location', FFDIR,
        '-o', outPath,
        '--no-playlist', '--no-warnings',
        '--max-filesize', '50m',
        url
    ], { timeout: 60000 })
}

async function socialInfo(url) {
    const { stdout } = await execFileAsync(YTDLP, [
        '--dump-json', '--no-playlist', '--no-warnings', url
    ], { timeout: 20000 })
    return JSON.parse(stdout.trim().split('\n')[0])
}

async function sendVideo(msg, outPath, caption) {
    if (!existsSync(outPath)) return msg.reply('❌ *Download failed!*')
    const buf = readFileSync(outPath)
    unlinkSync(outPath)
    if (buf.length > 50 * 1024 * 1024) return msg.reply('❌ *File too large (>50MB)!*')
    await msg.client.sendMessage(msg.jid, {
        video: buf, mimetype: 'video/mp4',
        caption: caption + '\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !'
    }, { quoted: msg.raw })
}

// ── .dl — Universal downloader ─────────────────────────────
bot({ pattern: 'dl', desc: 'Universal social media downloader (any link)', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url) return msg.reply(
        '❌ *Usage:* `.dl [link]`\n\n' +
        '*Supported platforms:*\n' +
        '🎵 TikTok\n📸 Instagram\n📘 Facebook\n' +
        '🐦 Twitter/X\n🤖 Reddit\n🎬 YouTube'
    )
    await msg.reply('⬇️ *Downloading...*')
    const out = `./dl_${Date.now()}.mp4`
    try {
        const info  = await socialInfo(url)
        const title = (info.title || info.description || 'Video').slice(0, 60)
        await socialDownload(url, out)
        await sendVideo(msg, out, `🌐 *${title}*`)
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .tiktok ────────────────────────────────────────────────
bot({ pattern: 'tiktok', desc: 'Download TikTok video without watermark', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/tiktok\.com|vm\.tiktok/)) return msg.reply('❌ *Usage:* `.tiktok [TikTok link]`')
    await msg.reply('🎵 *Downloading TikTok...*')
    const out = `./tiktok_${Date.now()}.mp4`
    try {
        await socialDownload(url, out)
        await sendVideo(msg, out, '🎵 *TikTok Video*')
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .instagram ─────────────────────────────────────────────
bot({ pattern: 'instagram', desc: 'Download Instagram Reel/Post video', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/instagram\.com|instagr\.am/)) return msg.reply('❌ *Usage:* `.instagram [Instagram link]`')
    await msg.reply('📸 *Downloading Instagram...*')
    const out = `./ig_${Date.now()}.mp4`
    try {
        await socialDownload(url, out)
        await sendVideo(msg, out, '📸 *Instagram Reel*')
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .facebook ──────────────────────────────────────────────
bot({ pattern: 'facebook', desc: 'Download Facebook video', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/facebook\.com|fb\.watch|fb\.com/)) return msg.reply('❌ *Usage:* `.facebook [Facebook link]`')
    await msg.reply('📘 *Downloading Facebook...*')
    const out = `./fb_${Date.now()}.mp4`
    try {
        await socialDownload(url, out)
        await sendVideo(msg, out, '📘 *Facebook Video*')
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .twitter ───────────────────────────────────────────────
bot({ pattern: 'twitter', desc: 'Download Twitter/X video', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/twitter\.com|x\.com|t\.co/)) return msg.reply('❌ *Usage:* `.twitter [Twitter/X link]`')
    await msg.reply('🐦 *Downloading Twitter/X...*')
    const out = `./tw_${Date.now()}.mp4`
    try {
        await socialDownload(url, out)
        await sendVideo(msg, out, '🐦 *Twitter/X Video*')
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .reddit ────────────────────────────────────────────────
bot({ pattern: 'reddit', desc: 'Download Reddit video', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/reddit\.com|redd\.it/)) return msg.reply('❌ *Usage:* `.reddit [Reddit link]`')
    await msg.reply('🤖 *Downloading Reddit...*')
    const out = `./reddit_${Date.now()}.mp4`
    try {
        await socialDownload(url, out)
        await sendVideo(msg, out, '🤖 *Reddit Video*')
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

// ── .spotify ───────────────────────────────────────────────
bot({ pattern: 'spotify', desc: 'Download Spotify track as MP3', type: 'social' }, async (msg, match, args) => {
    const url = extractUrl(args)
    if (!url || !url.match(/spotify\.com/)) return msg.reply('❌ *Usage:* `.spotify [Spotify link]`')
    await msg.reply('🎵 *Downloading Spotify...*')
    const out = `./spotify_${Date.now()}.mp3`
    try {
        await execFileAsync(YTDLP, [
            '-x', '--audio-format', 'mp3', '--audio-quality', '0',
            '--ffmpeg-location', FFDIR,
            '-o', out,
            '--no-playlist', '--no-warnings',
            url
        ], { timeout: 120000 })

        if (!existsSync(out)) return msg.reply('❌ *Download failed!*')
        const buf = readFileSync(out)
        unlinkSync(out)

        await msg.client.sendMessage(msg.jid, {
            audio: buf, mimetype: 'audio/mpeg',
            fileName: `spotify_track_${Date.now()}.mp3`, ptt: false
        }, { quoted: msg.raw })
    } catch (e) {
        if (existsSync(out)) unlinkSync(out)
        console.error('[SPOTIFY ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
})

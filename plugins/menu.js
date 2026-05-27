import { bot, commands } from '../lib/handler.js'
import config from '../config.js'
import fs from 'fs'
import db from '../lib/database.js'
import axios from 'axios'
import path from 'path'

const PHONK_DIR = './phonk_menu'
const phonkAudios = [
    'https://files.catbox.moe/2fn6pb.mpeg',
    'https://files.catbox.moe/djfvdi.mpeg',
    'https://files.catbox.moe/l9uff2.mpeg',
    'https://files.catbox.moe/ktlrtw.mpeg',
    'https://files.catbox.moe/mlwfpf.mpeg',
    'https://files.catbox.moe/64sp3s.mpeg',
    'https://files.catbox.moe/i5cyxr.mpeg'
]

// Ensure local phonk cache folder exists
if (!fs.existsSync(PHONK_DIR)) {
    fs.mkdirSync(PHONK_DIR, { recursive: true })
}

// Background pre-downloader to cache all links to disk
async function preDownloadAudios() {
    for (let i = 0; i < phonkAudios.length; i++) {
        const filePath = path.join(PHONK_DIR, `phonk_${i}.mp3`)
        if (!fs.existsSync(filePath)) {
            try {
                const res = await axios.get(phonkAudios[i], { responseType: 'arraybuffer', timeout: 30000 })
                fs.writeFileSync(filePath, Buffer.from(res.data))
                console.log(`[Phonk Cache] Pre-downloaded and saved locally: phonk_${i}.mp3`)
            } catch (err) {
                console.error(`[Phonk Cache Error] Failed to pre-download ${phonkAudios[i]}:`, err.message)
            }
        }
    }
}
// Start downloader in background without blocking imports
preDownloadAudios()



// Complete registry of all 91 commands with details for .list and .help
const cmdRegistry = {
    // GENERAL (8)
    alive: { category: 'general', desc: 'Check if the bot is active and running', use: '.alive', example: '.alive' },
    help: { category: 'general', desc: 'Get help or details for a specific command', use: '.help [command]', example: '.help ping' },
    info: { category: 'general', desc: 'Get detailed information about the bot system', use: '.info', example: '.info' },
    list: { category: 'general', desc: 'Show detailed command guide with usages and examples', use: '.list', example: '.list' },
    menu: { category: 'general', desc: 'Show the main menu categorized dashboard', use: '.menu', example: '.menu' },
    owner: { category: 'general', desc: 'Get information about the bot owner', use: '.owner', example: '.owner' },
    ping: { category: 'general', desc: 'Test bot speed and latency', use: '.ping', example: '.ping' },
    speed: { category: 'general', desc: 'Check internet connection and server speed', use: '.speed', example: '.speed' },

    // GROUP (28)
    add: { category: 'group', desc: 'Add a user to the group', use: '.add [number]', example: '.add 923001234567' },
    alert: { category: 'group', desc: 'Send an admin alert in the group', use: '.alert [text]', example: '.alert Attention members!' },
    antiadmin: { category: 'group', desc: 'Enable/disable anti-admin protection', use: '.antiadmin [on/off]', example: '.antiadmin on' },
    antilink: { category: 'group', desc: 'Enable/disable link deletion', use: '.antilink [on/off]', example: '.antilink on' },
    approval: { category: 'group', desc: 'Approve pending join requests', use: '.approval', example: '.approval' },
    del: { category: 'group', desc: 'Delete a quoted message', use: '.del', example: '.del' },
    demote: { category: 'group', desc: 'Demote an admin to a normal member', use: '.demote [@tag/reply]', example: '.demote @user' },
    gdesc: { category: 'group', desc: 'Change the group description', use: '.gdesc [text]', example: '.gdesc New description' },
    gname: { category: 'group', desc: 'Change the group name', use: '.gname [text]', example: '.gname New Name' },
    gpp: { category: 'group', desc: 'Change group profile picture', use: '.gpp [reply to image]', example: '.gpp' },
    groupinfo: { category: 'group', desc: 'Get detailed group settings and info', use: '.groupinfo', example: '.groupinfo' },
    hidetag: { category: 'group', desc: 'Tag all members invisibly', use: '.hidetag [text]', example: '.hidetag Hello!' },
    invite: { category: 'group', desc: 'Get the group invite link', use: '.invite', example: '.invite' },
    joinlink: { category: 'group', desc: 'Get join approval link settings', use: '.joinlink', example: '.joinlink' },
    kick: { category: 'group', desc: 'Remove a member from the group', use: '.kick [@tag/reply]', example: '.kick @user' },
    kickall: { category: 'group', desc: 'Remove all non-admin members', use: '.kickall', example: '.kickall' },
    left: { category: 'group', desc: 'Make bot leave the group', use: '.left', example: '.left' },
    mute: { category: 'group', desc: 'Mute group chat (admin only can send messages)', use: '.mute', example: '.mute' },
    promote: { category: 'group', desc: 'Promote a member to admin', use: '.promote [@tag/reply]', example: '.promote @user' },
    reject: { category: 'group', desc: 'Reject pending join requests', use: '.reject', example: '.reject' },
    resetwarn: { category: 'group', desc: 'Reset warnings for a user', use: '.resetwarn [@tag/reply]', example: '.resetwarn @user' },
    revoke: { category: 'group', desc: 'Revoke the group invite link', use: '.revoke', example: '.revoke' },
    tagall: { category: 'group', desc: 'Tag all group members with message', use: '.tagall [text]', example: '.tagall Wake up!' },
    unmute: { category: 'group', desc: 'Unmute group chat (everyone can send messages)', use: '.unmute', example: '.unmute' },
    warn: { category: 'group', desc: 'Warn a user', use: '.warn [@tag/reply]', example: '.warn @user' },
    warnlimit: { category: 'group', desc: 'Set the maximum warning limit', use: '.warnlimit [number]', example: '.warnlimit 3' },
    warns: { category: 'group', desc: 'Check warning count of a user', use: '.warns [@tag/reply]', example: '.warns @user' },
    welcome: { category: 'group', desc: 'Toggle welcome message for new members', use: '.welcome [on/off]', example: '.welcome on' },

    // MODERATION (4)
    addword: { category: 'moderation', desc: 'Add a word to the chat filter', use: '.addword [word]', example: '.addword badword' },
    antiword: { category: 'moderation', desc: 'Toggle bad-word filter', use: '.antiword [on/off]', example: '.antiword on' },
    delword: { category: 'moderation', desc: 'Remove a word from the chat filter', use: '.delword [word]', example: '.delword badword' },
    listword: { category: 'moderation', desc: 'List all filtered bad words', use: '.listword', example: '.listword' },

    // OWNER (15)
    antidelete: { category: 'owner', desc: 'Toggle anti-delete to prevent message retraction', use: '.antidelete [on/off]', example: '.antidelete on' },
    autoreact: { category: 'owner', desc: 'Toggle automatic reactions to messages', use: '.autoreact [on/off]', example: '.autoreact on' },
    block: { category: 'owner', desc: 'Block a user on WhatsApp', use: '.block [@tag/reply/number]', example: '.block @user' },
    broadcast: { category: 'owner', desc: 'Broadcast a message to all groups', use: '.broadcast [text]', example: '.broadcast Hello!' },
    call: { category: 'owner', desc: 'Block incoming WhatsApp calls', use: '.call [on/off]', example: '.call off' },
    hijack: { category: 'owner', desc: 'Test bot hijack configuration status', use: '.hijack', example: '.hijack' },
    join: { category: 'owner', desc: 'Join a group using its invite link', use: '.join [link]', example: '.join https://chat.whatsapp.com/xxx' },
    plugin: { category: 'owner', desc: 'Install or list custom plugins', use: '.plugin [gist-link/list]', example: '.plugin https://gist.github.com/xxx' },
    plugins: { category: 'owner', desc: 'List all active custom plugins', use: '.plugins', example: '.plugins' },
    remove: { category: 'owner', desc: 'Uninstall a custom plugin', use: '.remove [plugin-name]', example: '.remove test.js' },
    restart: { category: 'owner', desc: 'Restart the bot system', use: '.restart', example: '.restart' },
    setpp: { category: 'owner', desc: 'Change bot WhatsApp profile picture', use: '.setpp [reply to image]', example: '.setpp' },
    statusreact: { category: 'owner', desc: 'Toggle auto-reactions to status updates', use: '.statusreact [on/off]', example: '.statusreact on' },
    statusview: { category: 'owner', desc: 'Toggle auto-viewing status updates', use: '.statusview [on/off]', example: '.statusview on' },
    unblock: { category: 'owner', desc: 'Unblock a user on WhatsApp', use: '.unblock [@tag/reply/number]', example: '.unblock @user' },

    // DOWNLOAD (7)
    play: { category: 'download', desc: 'Search and play song as voice note', use: '.play [song-name]', example: '.play stay kid laroi' },
    song: { category: 'download', desc: 'Search and download song as MP3 audio file', use: '.song [song-name]', example: '.song love story' },
    video: { category: 'download', desc: 'Search and download video as MP4 file', use: '.video [video-name]', example: '.video dynamite bts' },
    yt: { category: 'download', desc: 'Download YouTube video as audio file', use: '.yt [youtube-link]', example: '.yt https://youtu.be/xxx' },
    ytmp3: { category: 'download', desc: 'Download YouTube video as MP3 file', use: '.ytmp3 [youtube-link]', example: '.ytmp3 https://youtu.be/xxx' },
    ytmp4: { category: 'download', desc: 'Download YouTube video as MP4 file', use: '.ytmp4 [youtube-link]', example: '.ytmp4 https://youtu.be/xxx' },
    ytsearch: { category: 'download', desc: 'Search videos on YouTube', use: '.ytsearch [query]', example: '.ytsearch stay' },

    // SOCIAL (7)
    dl: { category: 'social', desc: 'Universal social downloader', use: '.dl [social-link]', example: '.dl https://tiktok.com/@xxx' },
    facebook: { category: 'social', desc: 'Download video from Facebook', use: '.facebook [fb-link]', example: '.facebook https://facebook.com/xxx' },
    instagram: { category: 'social', desc: 'Download video/reel from Instagram', use: '.instagram [ig-link]', example: '.instagram https://instagram.com/reel/xxx' },
    reddit: { category: 'social', desc: 'Download video from Reddit', use: '.reddit [reddit-link]', example: '.reddit https://reddit.com/r/xxx' },
    spotify: { category: 'social', desc: 'Download track from Spotify as MP3 file', use: '.spotify [link]', example: '.spotify https://open.spotify.com/track/xxx' },
    tiktok: { category: 'social', desc: 'Download TikTok video without watermark', use: '.tiktok [tiktok-link]', example: '.tiktok https://tiktok.com/@xxx' },
    twitter: { category: 'social', desc: 'Download video from Twitter/X', use: '.twitter [x-link]', example: '.twitter https://x.com/xxx' },

    // AI (2)
    ai: { category: 'ai', desc: 'Ask AI assistant a question', use: '.ai [question]', example: '.ai What is gravity?' },
    gpt: { category: 'ai', desc: 'Chat with ChatGPT AI model', use: '.gpt [question]', example: '.gpt Write an email' },

    // FUN (3)
    sticker: { category: 'fun', desc: 'Convert image/video/gif into a sticker', use: '.sticker [reply to image]', example: '.sticker' },
    take: { category: 'fun', desc: 'Change sticker pack name and author metadata', use: '.take [packname] [author]', example: '.take MyBot AHMED' },
    toimg: { category: 'fun', desc: 'Convert a sticker back to an image', use: '.toimg [reply to sticker]', example: '.toimg' },

    // UTILITY (13)
    calc: { category: 'utility', desc: 'Evaluate a mathematical expression', use: '.calc [math expression]', example: '.calc 2 + 2 * 5' },
    clear: { category: 'utility', desc: 'Clear bot chat/temp cache', use: '.clear', example: '.clear' },
    image: { category: 'utility', desc: 'Search and send 5 images from web', use: '.image [search query]', example: '.image cute cats' },
    mp3: { category: 'utility', desc: 'Convert quoted video or audio to high quality MP3', use: '.mp3 [reply to video/audio]', example: '.mp3' },
    poll: { category: 'utility', desc: 'Create an interactive poll in the chat', use: '.poll [question] | [opt1] | [opt2]', example: '.poll Yes or No | Yes | No' },
    qr: { category: 'utility', desc: 'Generate a QR code from text', use: '.qr [text]', example: '.qr AHMED-MD' },
    short: { category: 'utility', desc: 'Shorten a URL using TinyURL', use: '.short [url]', example: '.short https://google.com' },
    time: { category: 'utility', desc: 'Get current date and time', use: '.time', example: '.time' },
    tr: { category: 'utility', desc: 'Translate text to target language', use: '.tr [lang] [text]', example: '.tr urdu Hello' },
    tts: { category: 'utility', desc: 'Convert text to speech audio', use: '.tts [text]', example: '.tts Hello world' },
    url: { category: 'utility', desc: 'Upload quoted media to catbox.moe and get a direct link', use: '.url [reply to media]', example: '.url' },
    vv: { category: 'utility', desc: 'Retrieve and view media from a ViewOnce message', use: '.vv [reply viewOnce]', example: '.vv' },
    weather: { category: 'utility', desc: 'Get current weather details for a city', use: '.weather [city]', example: '.weather Karachi' },

    // AUDIO EFFECTS (8)
    bass: { category: 'audio', desc: 'Add bass boost effect to quoted audio', use: '.bass [reply to audio/video]', example: '.bass' },
    deep: { category: 'audio', desc: 'Make quoted audio deep and slow', use: '.deep [reply to audio/video]', example: '.deep' },
    echo: { category: 'audio', desc: 'Add echo/reverb effect to quoted audio', use: '.echo [reply to audio/video]', example: '.echo' },
    fast: { category: 'audio', desc: 'Speed up quoted audio playback 1.5x', use: '.fast [reply to audio/video]', example: '.fast' },
    high: { category: 'audio', desc: 'Make quoted audio high pitched', use: '.high [reply to audio/video]', example: '.high' },
    reverse: { category: 'audio', desc: 'Play quoted audio backwards', use: '.reverse [reply to audio/video]', example: '.reverse' },
    robot: { category: 'audio', desc: 'Apply robot voice effect to quoted audio', use: '.robot [reply to audio/video]', example: '.robot' },
    slow: { category: 'audio', desc: 'Slow down quoted audio to 0.75x speed', use: '.slow [reply to audio/video]', example: '.slow' },

    // MOVIES (3)
    movie: { category: 'movies', desc: 'Search movies by name and get results', use: '.movie [movie name]', example: '.movie Avengers Endgame' },
    moviedl: { category: 'movies', desc: 'Download movie from YouTube link', use: '.moviedl [youtube link]', example: '.moviedl https://youtu.be/xxx' },
    series: { category: 'movies', desc: 'Search TV series episodes by name', use: '.series [name] [S01E01]', example: '.series Breaking Bad S01E01' },

    // AHMED (1)
    shitadmin: { category: 'ahmed', desc: 'Troll/funny admin command', use: '.shitadmin', example: '.shitadmin' },

    // GAMES (2)
    delttt: { category: 'games', desc: 'Reset/delete the current Tic-Tac-Toe session', use: '.delttt', example: '.delttt' },
    ttt: { category: 'games', desc: 'Start a Tic-Tac-Toe game match', use: '.ttt', example: '.ttt' },

    // LOGOS (4)
    cyber: { category: 'logos', desc: 'Generate a cyber-style logo text image', use: '.cyber [text]', example: '.cyber AHMED' },
    glitch: { category: 'logos', desc: 'Generate a glitch-style logo text image', use: '.glitch [text]', example: '.glitch HACKER' },
    gold: { category: 'logos', desc: 'Generate a gold-style logo text image', use: '.gold [text]', example: '.gold KING' },
    neon: { category: 'logos', desc: 'Generate a neon-style logo text image', use: '.neon [text]', example: '.neon AHMED-MD' },

    // MUSIC (1)
    sona: { category: 'music', desc: 'Play sona/music', use: '.sona [song name]', example: '.sona stay' },

    // SEARCH (1)
    emix: { category: 'search', desc: 'Special search utility command', use: '.emix [query]', example: '.emix hello' }
}

const categories = [
    { key: 'general',    name: 'GENERAL',    icon: '🌟', cmds: ['alive', 'help', 'info', 'list', 'menu', 'owner', 'ping', 'speed'] },
    { key: 'group',      name: 'GROUP',      icon: '👥', cmds: ['add', 'alert', 'antiadmin', 'antilink', 'approval', 'del', 'demote', 'gdesc', 'gname', 'gpp', 'groupinfo', 'hidetag', 'invite', 'joinlink', 'kick', 'kickall', 'left', 'mute', 'promote', 'reject', 'resetwarn', 'revoke', 'tagall', 'unmute', 'warn', 'warnlimit', 'warns', 'welcome'] },
    { key: 'moderation', name: 'MODERATION', icon: '🛡️', cmds: ['addword', 'antiword', 'delword', 'listword'] },
    { key: 'owner',      name: 'OWNER',      icon: '👑', cmds: ['antidelete', 'autoreact', 'block', 'broadcast', 'call', 'hijack', 'join', 'plugin', 'plugins', 'remove', 'restart', 'setpp', 'statusreact', 'statusview', 'unblock'] },
    { key: 'download',   name: 'DOWNLOAD',   icon: '📥', cmds: ['play', 'song', 'video', 'yt', 'ytmp3', 'ytmp4', 'ytsearch'] },
    { key: 'social',     name: 'SOCIAL',     icon: '🌐', cmds: ['dl', 'facebook', 'instagram', 'reddit', 'spotify', 'tiktok', 'twitter'] },
    { key: 'movies',     name: 'MOVIES',     icon: '🎬', cmds: ['movie', 'moviedl', 'series'] },
    { key: 'ai',         name: 'AI',         icon: '🤖', cmds: ['ai', 'gpt'] },
    { key: 'audio',      name: 'AUDIO FX',   icon: '🎵', cmds: ['bass', 'deep', 'echo', 'fast', 'high', 'reverse', 'robot', 'slow'] },
    { key: 'fun',        name: 'FUN',        icon: '🎮', cmds: ['sticker', 'take', 'toimg'] },
    { key: 'utility',    name: 'UTILITY',    icon: '🛠️', cmds: ['calc', 'clear', 'image', 'mp3', 'poll', 'qr', 'short', 'time', 'tr', 'tts', 'url', 'vv', 'weather'] },
    { key: 'ahmed',      name: 'AHMED',      icon: '🔧', cmds: ['shitadmin'] },
    { key: 'games',      name: 'GAMES',      icon: '🎰', cmds: ['delttt', 'ttt'] },
    { key: 'logos',      name: 'LOGOS',      icon: '🖼️', cmds: ['cyber', 'glitch', 'gold', 'neon'] },
    { key: 'music',      name: 'MUSIC',      icon: '🎶', cmds: ['sona'] },
    { key: 'search',     name: 'SEARCH',     icon: '🔍', cmds: ['emix'] }
]

function getFormattedDate() {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

function toSmallCaps(text) {
    const normal = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const smallCaps = "ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ";
    return text.split('').map(char => {
        const index = normal.indexOf(char);
        return index !== -1 ? smallCaps[index] : char;
    }).join('');
}

async function sendPremiumMenu(msg, text) {
    try {
        const urlOrPath = config.MENU_IMAGE
        let buf
        if (urlOrPath && urlOrPath.startsWith('http')) {
            const res = await axios.get(urlOrPath, { responseType: 'arraybuffer', timeout: 15000 })
            buf = Buffer.from(res.data)
        } else if (urlOrPath && fs.existsSync(urlOrPath)) {
            buf = fs.readFileSync(urlOrPath)
        }

        if (buf) {
            await msg.client.sendMessage(msg.jid, {
                image: buf,
                caption: text
            }, { quoted: msg.raw })
            return
        }
    } catch (e) {
        console.error('[Menu Image Send Error]', e.message)
    }
    await msg.reply(text)
}

// ── .menu (Show all commands categorized EXACTLY as requested in template) ──
bot({ pattern: 'menu ?(.*)', desc: 'Show bot menu categorized dashboard', type: 'general' }, async (msg, match, args) => {
    const prefix = config.PREFIX || '.'
    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const uptimeStr = `${hours}h ${minutes}m`
    const dateStr = getFormattedDate()
    
    // Dynamically extract active command names
    const activeCommandNames = new Set()
    for (const cmd of commands) {
        if (!cmd.pattern) continue
        let name = ''
        if (cmd.pattern instanceof RegExp) {
            name = cmd.pattern.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        } else {
            const parts = cmd.pattern.split(/[ ?|/]/)
            name = parts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim()
        }
        if (name) {
            activeCommandNames.add(name)
        }
    }

    // Identify custom commands not in registry/categories
    const customCmdList = []
    const registryCmds = new Set(categories.flatMap(cat => cat.cmds.map(c => c.toLowerCase())))

    for (const name of activeCommandNames) {
        if (!registryCmds.has(name) && !customCmdList.includes(name)) {
            customCmdList.push(name)
        }
    }

    // Filter categories to only contain active commands and calculate total active commands count
    let totalActiveCmds = 0
    const processedCategories = categories.map(cat => {
        const activeCmds = cat.cmds.filter(cmdName => activeCommandNames.has(cmdName.toLowerCase()))
        totalActiveCmds += activeCmds.length
        return { ...cat, cmds: activeCmds }
    }).filter(cat => cat.cmds.length > 0)

    totalActiveCmds += customCmdList.length

    let menu = `┏━━━━━━━━━━━━━━━━━━━━━━━━┓\n`
    menu += `┃      ✨ 𝗔𝗛𝗠𝗘𝗗-𝗠𝗗 𝗩𝟮 ✨      ┃\n`
    menu += `┗━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n`

    menu += `┌─── ❖ *𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎* ❖ ───┐\n`
    menu += `│ 👤 *Developer:* AHMED\n`
    menu += `│ 📍 *Prefix:* \` ${prefix} \`\n`
    menu += `│ ⚙️ *Mode:* ${config.MODE || 'PRIVATE'}\n`
    menu += `│ ⏳ *Uptime:* ${uptimeStr}\n`
    menu += `│ 📅 *Date:* ${dateStr}\n`
    menu += `│ 📊 *Total Cmds:* ${totalActiveCmds}\n`
    menu += `└━━━━━━━━━━━━━━━━━━━━━━━━┘\n\n`

    for (const cat of processedCategories) {
        menu += `┌───〔 *${cat.name.toUpperCase()}* 〕───\n`
        for (const cmd of cat.cmds) {
            menu += `│ ${prefix}${cmd}\n`
        }
        menu += `└━━━━━━━━━━━━━━━━━━━━━━━━━━━┈\n\n`
    }
    
    if (customCmdList.length > 0) {
        menu += `┌───〔 *CUSTOM* 〕───\n`
        for (const cmd of customCmdList.sort()) {
            menu += `│ ${prefix}${cmd}\n`
        }
        menu += `└━━━━━━━━━━━━━━━━━━━━━━━━━━━┈\n\n`
    }

    menu += `_Use \`${prefix}list\` for detailed usage info._\n\n`
    menu += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

    await sendPremiumMenu(msg, menu)

    try {
        // Read directly from high-performance local hard drive cache!
        const files = fs.readdirSync(PHONK_DIR).filter(f => f.endsWith('.mp3'))
        if (files.length > 0) {
            const randomFile = files[Math.floor(Math.random() * files.length)]
            const buf = fs.readFileSync(path.join(PHONK_DIR, randomFile))
            await msg.client.sendMessage(msg.jid, {
                audio: buf,
                mimetype: 'audio/mpeg',
                fileName: 'menu_phonk.mp3',
                ptt: false
            }, { quoted: msg.raw })
        } else {
            // Fallback dynamically if files are not fully cached yet
            const randomUrl = phonkAudios[Math.floor(Math.random() * phonkAudios.length)]
            const res = await axios.get(randomUrl, { responseType: 'arraybuffer', timeout: 10000 })
            const buf = Buffer.from(res.data)
            await msg.client.sendMessage(msg.jid, {
                audio: buf,
                mimetype: 'audio/mpeg',
                fileName: 'menu_phonk.mp3',
                ptt: false
            }, { quoted: msg.raw })
        }
    } catch (e) {
        console.error('[MENU AUDIO ERROR]', e.message)
    }
})

// ── .list (Show all commands with complete details: use instructions & examples) ──
bot({ pattern: 'list', desc: 'Show detailed command list with usages & examples', type: 'general' }, async (msg) => {
    const prefix = config.PREFIX || '.'
    
    // Dynamically extract active command names
    const activeCommandNames = new Set()
    for (const cmd of commands) {
        if (!cmd.pattern) continue
        let name = ''
        if (cmd.pattern instanceof RegExp) {
            name = cmd.pattern.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        } else {
            const parts = cmd.pattern.split(/[ ?|/]/)
            name = parts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim()
        }
        if (name) {
            activeCommandNames.add(name)
        }
    }

    const customCmdList = []
    const registryCmds = new Set(categories.flatMap(cat => cat.cmds.map(c => c.toLowerCase())))

    for (const name of activeCommandNames) {
        if (!registryCmds.has(name) && !customCmdList.includes(name)) {
            customCmdList.push(name)
        }
    }

    let totalActiveCmds = 0
    const processedCategories = categories.map(cat => {
        const activeCmds = cat.cmds.filter(cmdName => activeCommandNames.has(cmdName.toLowerCase()))
        totalActiveCmds += activeCmds.length
        return { ...cat, cmds: activeCmds }
    }).filter(cat => cat.cmds.length > 0)

    totalActiveCmds += customCmdList.length

    let listText = `╔══════════════════════════╗\n`
    listText += `║     *AHMED-MD PREMIUM*   ║\n`
    listText += `║   *DETAILED USAGE GUIDE*   ║\n`
    listText += `╚══════════════════════════╝\n\n`

    listText += `┌─── ❖ *𝐒𝐘𝐒𝐓𝐄𝐌 𝐈𝐍𝐅𝐎* ❖ ───┐\n`
    listText += `│ 👤 *Developer:* AHMED\n`
    listText += `│ 📍 *Prefix:* \` ${prefix} \`\n`
    listText += `│ 📊 *Total Cmds:* ${totalActiveCmds}\n`
    listText += `└━━━━━━━━━━━━━━━━━━━━━━━━┘\n\n`

    for (const cat of processedCategories) {
        listText += `*◈══〔 ${cat.name.toUpperCase()} 〕══◈*\n\n`
        for (const cmdKey of cat.cmds) {
            const reg = cmdRegistry[cmdKey]
            if (reg) {
                listText += `*${prefix}${cmdKey}*\n`
                listText += `   ➜ _${reg.desc}_\n`
                listText += `   *Use:* ${reg.use.replace(/^\./, prefix)}\n`
                listText += `   *Eg:* ${reg.example.replace(/^\./, prefix)}\n\n`
            }
        }
    }

    if (customCmdList.length > 0) {
        listText += `*◈══〔 CUSTOM PLUGINS 〕══◈*\n\n`
        for (const cmd of customCmdList.sort()) {
            listText += `*${prefix}${cmd}*\n`
            listText += `   ➜ _Custom plugin command_\n`
            listText += `   *Use:* ${prefix}${cmd}\n\n`
        }
    }

    listText += `━━━━━━━━━━━━━━━━━━━━━\n`
    listText += `_Type *${prefix}help <command>* for single command details!_\n`
    listText += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

    await sendPremiumMenu(msg, listText)
})

// ── .help (Show premium details for a single command) ─────────────────────
bot({ pattern: 'help ?(.*)', desc: 'Get single command detail or help index', type: 'general' }, async (msg, match, args) => {
    const prefix = config.PREFIX || '.'
    const query = args ? args.trim().toLowerCase() : ''

    // Dynamically extract active command names
    const activeCommandNames = new Set()
    for (const cmd of commands) {
        if (!cmd.pattern) continue
        let name = ''
        if (cmd.pattern instanceof RegExp) {
            name = cmd.pattern.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        } else {
            const parts = cmd.pattern.split(/[ ?|/]/)
            name = parts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim()
        }
        if (name) {
            activeCommandNames.add(name)
        }
    }

    if (!query) {
        const helpMsg = 
            `*AHMED-MD HELP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*${prefix}menu* ➜ View all commands by category\n` +
            `*${prefix}list* ➜ View detailed list with usages & examples\n` +
            `*${prefix}help [command]* ➜ View single command details\n\n` +
            `*Example:* \`${prefix}help tiktok\` or \`${prefix}help play\`\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        return await sendPremiumMenu(msg, helpMsg)
    }

    const cmdName = query.replace(/^\.+/, '').trim().toLowerCase()
    
    // Ensure command actually exists in memory
    if (!activeCommandNames.has(cmdName)) {
        return await msg.reply(`❌ *Command "${prefix}${cmdName}" not found or disabled!* Type *${prefix}menu* to see all active commands.`)
    }

    const reg = cmdRegistry[cmdName]
    if (reg) {
        let detail = `*AHMED-MD HELP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n`
        detail += `*Command:* ${prefix}${cmdName}\n`
        detail += `*Description:* ${reg.desc}\n`
        detail += `*Usage:* ${reg.use.replace(/^\./, prefix)}\n`
        detail += `*Example:* ${reg.example.replace(/^\./, prefix)}\n\n`
        detail += `━━━━━━━━━━━━━━━━━━━━━\n`
        detail += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        return await sendPremiumMenu(msg, detail)
    }

    // Try finding in dynamically registered commands (in case it is custom or loaded plugin)
    const cmd = commands.find(c => {
        if (!c.pattern) return false
        let name = ''
        if (c.pattern instanceof RegExp) {
            name = c.pattern.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
        } else {
            const parts = c.pattern.split(/[ ?|/]/)
            name = parts[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase().trim()
        }
        return name === cmdName
    })

    if (cmd) {
        let detail = `*AHMED-MD HELP*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n`
        detail += `*Command:* ${prefix}${cmdName}\n`
        detail += `*Description:* ${cmd.desc || 'Custom plugin command'}\n`
        detail += `*Usage:* ${prefix}${cmdName}\n\n`
        detail += `━━━━━━━━━━━━━━━━━━━━━\n`
        detail += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        return await sendPremiumMenu(msg, detail)
    }

    await msg.reply(`❌ *Command "${prefix}${cmdName}" not found!* Type *${prefix}menu* to see all active commands.`)
})





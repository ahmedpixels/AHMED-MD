import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import axios from 'axios'
import FormData from 'form-data'

// ── Helper: download media buffer ──
async function downloadQuoted(client, rawMsg, msgObj) {
    const fakeMsg = { key: rawMsg.key, message: msgObj }
    return await downloadMediaMessage(
        fakeMsg,
        'buffer',
        {},
        {
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: client.updateMediaMessage
        }
    )
}

// ── Helper: upload buffer to Uguu.se (temporary direct link) ──
async function uploadToUguu(buffer, filename) {
    const form = new FormData()
    form.append('files[]', buffer, { filename })

    const length = form.getLengthSync()

    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'Content-Length': length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 30000
    })

    if (res.data?.success && res.data?.files?.[0]?.url) {
        return res.data.files[0].url
    }
    throw new Error('Uguu rejected upload')
}

// ── Helper: upload buffer to Tmpfiles.org (temporary direct link) ──
async function uploadToTmpfiles(buffer, filename) {
    const form = new FormData()
    form.append('file', buffer, { filename })

    const length = form.getLengthSync()

    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: {
            ...form.getHeaders(),
            'Content-Length': length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 30000
    })

    if (res.data?.status === 'success' && res.data?.data?.url) {
        // Convert viewer URL to direct download URL
        return res.data.data.url.replace('https://tmpfiles.org/', 'https://tmpfiles.org/dl/')
    }
    throw new Error('Tmpfiles rejected upload')
}

// ── Helper: upload buffer to Catbox (direct upload) ──
async function uploadToCatboxDirect(buffer, filename) {
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, { filename })

    const length = form.getLengthSync()

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'Content-Length': length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://catbox.moe',
            'Referer': 'https://catbox.moe/',
            'Connection': 'keep-alive'
        },
        timeout: 30000
    })

    const url = typeof res.data === 'string' ? res.data.trim() : ''
    if (url.startsWith('https://files.catbox.moe')) {
        return url
    }
    throw new Error('Catbox direct upload rejected: ' + url)
}

// ── Helper: upload URL to Catbox (URL upload fallback) ──
async function uploadToCatboxUrl(directUrl) {
    const form = new FormData()
    form.append('reqtype', 'urlupload')
    form.append('url', directUrl)

    const length = form.getLengthSync()

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'Content-Length': length,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://catbox.moe',
            'Referer': 'https://catbox.moe/',
            'Connection': 'keep-alive'
        },
        timeout: 30000
    })

    const url = typeof res.data === 'string' ? res.data.trim() : ''
    if (url.startsWith('https://files.catbox.moe')) {
        return url
    }
    throw new Error('Catbox URL upload rejected: ' + url)
}

// ── Main upload manager ──
async function uploadMedia(buffer, filename) {
    // 1. Try Catbox direct upload
    try {
        return await uploadToCatboxDirect(buffer, filename)
    } catch (e) {
        console.warn('[Upload] Catbox direct failed, trying Catbox URL upload via Uguu:', e.message)
    }

    // 2. Try Catbox URL upload via Uguu
    let uguuUrl = null
    try {
        uguuUrl = await uploadToUguu(buffer, filename)
        return await uploadToCatboxUrl(uguuUrl)
    } catch (e) {
        console.warn('[Upload] Catbox URL upload via Uguu failed:', e.message)
    }

    // 3. Try Catbox URL upload via Tmpfiles
    let tmpUrl = null
    try {
        tmpUrl = await uploadToTmpfiles(buffer, filename)
        return await uploadToCatboxUrl(tmpUrl)
    } catch (e) {
        console.warn('[Upload] Catbox URL upload via Tmpfiles failed:', e.message)
    }

    // 4. Fallbacks (in case Catbox is down, return working temporary links)
    if (uguuUrl) return uguuUrl
    if (tmpUrl) return tmpUrl

    try {
        return await uploadToUguu(buffer, filename)
    } catch (e) {}

    try {
        return await uploadToTmpfiles(buffer, filename)
    } catch (e) {}

    throw new Error('All upload services failed.')
}

// ── .url ──────────────────────────────────────────────────────
bot({ pattern: 'url', desc: 'Upload quoted media and get a direct permanent link', type: 'utility' }, async (msg) => {
    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
        return msg.reply(
            `*Upload Media to Direct Link*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `Reply to any media with *.url* to get a direct permanent link.\n\n` +
            `*Supported:*\n` +
            `• Image (jpg/png)\n` +
            `• Video (mp4)\n` +
            `• Audio / Voice note\n` +
            `• Sticker (webp)\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    const img = quoted.imageMessage
    const vid = quoted.videoMessage
    const aud = quoted.audioMessage
    const stk = quoted.stickerMessage
    const doc = quoted.documentMessage

    if (!img && !vid && !aud && !stk && !doc) {
        return msg.reply('❌ *No supported media found!*\nReply to an image, video, audio, or sticker.')
    }

    try {
        let buffer, filename

        if (img) {
            buffer = await downloadQuoted(msg.client, m, { imageMessage: img })
            const ext = (img.mimetype || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg'
            filename = `image_${Date.now()}.${ext}`
        } else if (vid) {
            buffer = await downloadQuoted(msg.client, m, { videoMessage: vid })
            filename = `video_${Date.now()}.mp4`
        } else if (aud) {
            buffer = await downloadQuoted(msg.client, m, { audioMessage: aud })
            filename = aud.ptt ? `voice_${Date.now()}.ogg` : `audio_${Date.now()}.mp3`
        } else if (stk) {
            buffer = await downloadQuoted(msg.client, m, { stickerMessage: stk })
            filename = `sticker_${Date.now()}.webp`
        } else if (doc) {
            buffer = await downloadQuoted(msg.client, m, { documentMessage: doc })
            filename = doc.fileName || `file_${Date.now()}`
        }

        if (!buffer || buffer.length === 0) {
            return msg.reply('❌ *Failed to download media. Try again.*')
        }

        const url = await uploadMedia(buffer, filename)
        await msg.reply(url)

    } catch (e) {
        console.error('[URL UPLOAD ERR]', e.message)
        await msg.reply(`❌ *Upload failed:* ${e.message?.slice(0, 200)}`)
    }
})

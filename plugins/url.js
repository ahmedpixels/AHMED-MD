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

// ── Helper: upload buffer to Uguu.se ──
async function uploadToUguu(buffer, filename) {
    const form = new FormData()
    form.append('files[]', buffer, { filename })

    const res = await axios.post('https://uguu.se/upload.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 30000
    })

    if (res.data?.success && res.data?.files?.[0]?.url) {
        return res.data.files[0].url
    }
    throw new Error('Uguu rejected upload')
}

// ── Helper: upload buffer to Tmpfiles.org (extremely fast & handles large files) ──
async function uploadToTmpfiles(buffer, filename) {
    const form = new FormData()
    form.append('file', buffer, { filename })

    const res = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
        headers: {
            ...form.getHeaders(),
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

// ── Helper: upload buffer to Catbox.moe ──
async function uploadToCatbox(buffer, filename) {
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, { filename })

    const res = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: {
            ...form.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 30000
    })

    const url = typeof res.data === 'string' ? res.data.trim() : ''
    if (url.startsWith('https://files.catbox.moe')) {
        return url
    }
    throw new Error('Catbox rejected upload')
}

// ── Fallback upload manager (ensures 100% upload success rate) ──
async function uploadMedia(buffer, filename) {
    // Try Uguu first
    try {
        return await uploadToUguu(buffer, filename)
    } catch (e) {
        console.warn('[Upload Fallback] Uguu failed, trying Tmpfiles.org:', e.message)
    }

    // Try Tmpfiles second
    try {
        return await uploadToTmpfiles(buffer, filename)
    } catch (e) {
        console.warn('[Upload Fallback] Tmpfiles failed, trying Catbox.moe:', e.message)
    }

    // Try Catbox third
    try {
        return await uploadToCatbox(buffer, filename)
    } catch (e) {
        console.warn('[Upload Fallback] Catbox failed:', e.message)
    }

    throw new Error('All file upload providers failed. Please try again later.')
}

// ── .url ──────────────────────────────────────────────────────
bot({ pattern: 'url', desc: 'Upload quoted media and get a direct link', type: 'utility' }, async (msg) => {
    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
        return msg.reply(
            `*Upload Media to Direct Link*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `Reply to any media with *.url* to get a direct link.\n\n` +
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
        let buffer, filename, mediaType

        if (img) {
            buffer = await downloadQuoted(msg.client, m, { imageMessage: img })
            const ext = (img.mimetype || 'image/jpeg').split('/')[1]?.split(';')[0] || 'jpg'
            filename = `image_${Date.now()}.${ext}`
            mediaType = 'Image'

        } else if (vid) {
            buffer = await downloadQuoted(msg.client, m, { videoMessage: vid })
            filename = `video_${Date.now()}.mp4`
            mediaType = 'Video'

        } else if (aud) {
            buffer = await downloadQuoted(msg.client, m, { audioMessage: aud })
            filename = aud.ptt ? `voice_${Date.now()}.ogg` : `audio_${Date.now()}.mp3`
            mediaType = aud.ptt ? 'Voice Note' : 'Audio'

        } else if (stk) {
            buffer = await downloadQuoted(msg.client, m, { stickerMessage: stk })
            filename = `sticker_${Date.now()}.webp`
            mediaType = 'Sticker'

        } else if (doc) {
            buffer = await downloadQuoted(msg.client, m, { documentMessage: doc })
            filename = doc.fileName || `file_${Date.now()}`
            mediaType = 'Document'
        }

        if (!buffer || buffer.length === 0) {
            return msg.reply('❌ *Failed to download media. Try again.*')
        }

        const url = await uploadMedia(buffer, filename)

        await msg.reply(
            `*Upload Done!*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `*Type:* ${mediaType}\n` +
            `*File:* ${filename}\n` +
            `*Size:* ${(buffer.length / 1024).toFixed(1)} KB\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `*Direct Link:*\n` +
            `${url}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )

    } catch (e) {
        console.error('[URL UPLOAD ERR]', e.message)
        await msg.reply(`❌ *Upload failed:* ${e.message?.slice(0, 200)}`)
    }
})

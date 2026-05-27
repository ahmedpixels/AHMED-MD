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

// ── Helper: upload to GoFile.io (permanent, no Cloudflare, VPS friendly) ──
async function uploadToGofile(buffer, filename) {
    // Step 1: Get best available upload server
    const serverRes = await axios.get('https://api.gofile.io/servers', { timeout: 10000 })
    const servers = serverRes.data?.data?.servers
    if (!servers || servers.length === 0) throw new Error('GoFile no servers available')
    const server = servers[0].name

    // Step 2: Upload file to that server
    const form = new FormData()
    form.append('file', buffer, { filename })

    const uploadRes = await axios.post(`https://${server}.gofile.io/contents/uploadfile`, form, {
        headers: { ...form.getHeaders() },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000
    })

    const fileData = uploadRes.data?.data
    if (uploadRes.data?.status === 'ok' && fileData?.downloadPage) {
        // Return direct download link
        return fileData.downloadPage
    }
    throw new Error('GoFile upload failed: ' + JSON.stringify(uploadRes.data))
}

// ── Helper: upload to Telegraph (permanent for images < 5MB) ──
async function uploadToTelegraph(buffer, filename) {
    const form = new FormData()
    form.append('file', buffer, { filename })

    const res = await axios.post('https://telegra.ph/upload', form, {
        headers: { ...form.getHeaders() },
        timeout: 30000
    })

    if (res.data?.[0]?.src) {
        return `https://telegra.ph${res.data[0].src}`
    }
    throw new Error('Telegraph upload failed')
}

// ── Main upload manager ──
async function uploadMedia(buffer, filename, mimetype) {
    // Try GoFile first — works 100% from any VPS, permanent links
    try {
        return await uploadToGofile(buffer, filename)
    } catch (e) {
        console.warn('[Upload] GoFile failed, trying Telegraph:', e.message)
    }

    // Fallback: Telegraph (for small images only)
    try {
        return await uploadToTelegraph(buffer, filename)
    } catch (e) {
        console.warn('[Upload] Telegraph failed:', e.message)
    }

    throw new Error('All upload providers failed.')
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

        const mimetype = img?.mimetype || vid?.mimetype || aud?.mimetype || stk?.mimetype || doc?.mimetype || ''
        const url = await uploadMedia(buffer, filename, mimetype)

        await msg.reply(url)

    } catch (e) {
        console.error('[URL UPLOAD ERR]', e.message)
        await msg.reply(`❌ *Upload failed:* ${e.message?.slice(0, 200)}`)
    }
})

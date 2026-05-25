import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ffmpegStatic from 'ffmpeg-static'

const execAsync = promisify(execFile)
const FFMPEG    = ffmpegStatic

// Helper: download media buffer
async function getMediaBuffer(client, rawMsg, mediaMsg) {
    const fakeMsg = { key: rawMsg.key, message: mediaMsg }
    return await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        reuploadRequest: client.updateMediaMessage
    })
}

// ── .sticker ───────────────────────────────────────────────
bot({ pattern: 'sticker', desc: 'Convert image/video to sticker', type: 'fun' }, async (msg, match, args) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const img = m.message?.imageMessage || ctx?.quotedMessage?.imageMessage
    const vid = m.message?.videoMessage  || ctx?.quotedMessage?.videoMessage

    if (!img && !vid) return msg.reply('❌ *Send or quote an image/video with* `.sticker`')

    const packName = args?.trim() || 'AHMED-MD'

    try {
        if (img) {
            // ── Static image sticker ──────────────────────
            const buf = await getMediaBuffer(msg.client, m, { imageMessage: img })
            const { default: sharp } = await import('sharp')
            const webpBuf = await sharp(buf)
                .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                .webp({ quality: 80 })
                .toBuffer()

            await msg.sticker(webpBuf, { packname: packName, author: 'ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !' })

        } else {
            // ── Animated video sticker ────────────────────
            const buf    = await getMediaBuffer(msg.client, m, { videoMessage: vid })
            const tmpIn  = `./stk_in_${Date.now()}.mp4`
            const tmpOut = `./stk_out_${Date.now()}.webp`
            writeFileSync(tmpIn, buf)

            await execAsync(FFMPEG, [
                '-i', tmpIn,
                '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,fps=15',
                '-vcodec', 'libwebp',
                '-lossless', '0',
                '-compression_level', '6',
                '-q:v', '50',
                '-loop', '0',
                '-preset', 'picture',
                '-an', '-vsync', '0',
                '-t', '6', '-y', tmpOut
            ], { timeout: 30000 })

            if (existsSync(tmpIn)) unlinkSync(tmpIn)
            if (!existsSync(tmpOut)) return msg.reply('❌ *Video sticker failed!*')
            const webpBuf = readFileSync(tmpOut)
            if (existsSync(tmpOut)) unlinkSync(tmpOut)

            await msg.sticker(webpBuf, { packname: packName, author: 'ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !' })
        }
    } catch (e) {
        console.error('[STICKER ERR]', e.message)
        await msg.reply(`❌ *Sticker failed:* ${e.message}`)
    }
})

// ── .take [name] ───────────────────────────────────────────
bot({ pattern: 'take', desc: 'Rename sticker (reply to sticker + name)', type: 'fun' }, async (msg, match, args) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const stk = m.message?.stickerMessage || ctx?.quotedMessage?.stickerMessage
    if (!stk) return msg.reply('❌ *Reply to a sticker with* `.take [name]`')

    const packName = args?.trim() || 'AHMED-MD'
    try {
        const buf = await getMediaBuffer(msg.client, m, { stickerMessage: stk })
        await msg.sticker(buf, { packname: packName, author: 'ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !' })
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .toimg — Sticker → Image ───────────────────────────────
bot({ pattern: 'toimg', desc: 'Convert sticker to image', type: 'fun' }, async (msg) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const stk = m.message?.stickerMessage || ctx?.quotedMessage?.stickerMessage
    if (!stk) return msg.reply('❌ *Reply to a sticker with* `.toimg`')

    try {
        const buf = await getMediaBuffer(msg.client, m, { stickerMessage: stk })
        const { default: sharp } = await import('sharp')
        const png = await sharp(buf).png().toBuffer()
        await msg.client.sendMessage(msg.jid, { image: png, caption: '🖼️' })
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ffmpegStatic from 'ffmpeg-static'

const execAsync = promisify(execFile)
const FFMPEG    = ffmpegStatic

// Helper: download quoted media buffer
async function getMediaBuffer(client, rawMsg, mediaMsg) {
    const fakeMsg = { key: rawMsg.key, message: mediaMsg }
    return await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        reuploadRequest: client.updateMediaMessage
    })
}

// ── .mp3 ───────────────────────────────────────────────────
bot({ pattern: 'mp3', desc: 'Convert quoted video, audio, or voice note to MP3 format', type: 'utility' }, async (msg) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
        return msg.reply(
            `*Media to MP3 Converter*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `Reply to any video, voice note, or audio message with *.mp3* to extract and convert it to high-quality audio.\n\n` +
            `*Supported:*\n` +
            `• Video Messages (mp4)\n` +
            `• Voice Notes (ptt)\n` +
            `• Audio Messages\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    const vid = quoted.videoMessage
    const aud = quoted.audioMessage

    if (!vid && !aud) {
        return msg.reply('❌ *Quoted message must be a video, audio, or voice note!*')
    }

    await msg.reply('⏳ *Converting to high quality MP3...*')

    const tmpIn  = `./conv_in_${Date.now()}`
    const tmpOut = `./conv_out_${Date.now()}.mp3`

    try {
        let buf
        if (vid) {
            buf = await getMediaBuffer(msg.client, m, { videoMessage: vid })
            writeFileSync(tmpIn, buf)
        } else {
            buf = await getMediaBuffer(msg.client, m, { audioMessage: aud })
            writeFileSync(tmpIn, buf)
        }

        // FFMPEG conversion command
        // -i: input file
        // -q:a 0: variable bitrate best quality (or -b:a 192k for constant)
        // -map a: extract audio only
        // -y: overwrite output
        await execAsync(FFMPEG, [
            '-i', tmpIn,
            '-q:a', '0',
            '-map', 'a',
            '-y', tmpOut
        ], { timeout: 45000 })

        if (existsSync(tmpIn)) unlinkSync(tmpIn)

        if (!existsSync(tmpOut)) {
            return msg.reply('❌ *Conversion failed! FFMPEG output not found.*')
        }

        const mp3Buf = readFileSync(tmpOut)
        if (existsSync(tmpOut)) unlinkSync(tmpOut)

        await msg.client.sendMessage(msg.jid, {
            audio: mp3Buf,
            mimetype: 'audio/mpeg',
            fileName: `audio_${Date.now()}.mp3`,
            ptt: false
        }, { quoted: m })

    } catch (e) {
        if (existsSync(tmpIn)) unlinkSync(tmpIn)
        if (existsSync(tmpOut)) unlinkSync(tmpOut)
        console.error('[MP3 CONVERSION ERR]', e.message)
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

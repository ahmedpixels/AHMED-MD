import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import ffmpegStatic from 'ffmpeg-static'

const execAsync = promisify(execFile)
const FFMPEG = ffmpegStatic

// ── Helper: Download quoted audio/video buffer ──────────────
async function getQuotedMedia(msg) {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage
    if (!quoted) return null

    const vid = quoted.videoMessage
    const aud = quoted.audioMessage
    if (!vid && !aud) return null

    const mediaMsg = vid ? { videoMessage: vid } : { audioMessage: aud }
    const fakeMsg  = {
        key: { remoteJid: msg.jid, id: ctx.stanzaId, participant: ctx.participant },
        message: mediaMsg
    }
    return await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        reuploadRequest: msg.client.updateMediaMessage
    })
}

// ── Helper: Apply ffmpeg effect and send ───────────────────
async function applyEffect(msg, ffArgs, label) {
    const buf = await getQuotedMedia(msg)
    if (!buf) return msg.reply(
        `❌ *Reply to a video or audio/voice message with \`${label}\`*`
    )

    await msg.reply(`⏳ *Applying ${label}...*`)

    const tmpIn  = `./fx_in_${Date.now()}`
    const tmpOut = `./fx_out_${Date.now()}.mp3`

    try {
        writeFileSync(tmpIn, buf)

        await execAsync(FFMPEG, [
            '-i', tmpIn,
            ...ffArgs,
            '-q:a', '0',
            '-y', tmpOut
        ], { timeout: 60000 })

        if (existsSync(tmpIn)) unlinkSync(tmpIn)

        if (!existsSync(tmpOut)) return msg.reply('❌ *Effect processing failed!*')

        const outBuf = readFileSync(tmpOut)
        if (existsSync(tmpOut)) unlinkSync(tmpOut)

        await msg.client.sendMessage(msg.jid, {
            audio:    outBuf,
            mimetype: 'audio/mpeg',
            fileName: `${label.replace(/\s+/g, '_').toLowerCase()}.mp3`,
            ptt:      false
        }, { quoted: msg.raw })

    } catch (e) {
        if (existsSync(tmpIn))  unlinkSync(tmpIn)
        if (existsSync(tmpOut)) unlinkSync(tmpOut)
        console.error(`[AUDIO FX ERR - ${label}]`, e.message)
        await msg.reply(`❌ *Failed:* ${e.message?.slice(0, 200)}`)
    }
}

// ── .bass — Heavy bass boost ───────────────────────────────
bot({ pattern: 'bass', desc: 'Add bass boost effect to quoted audio', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'bass=g=20,volume=2.0'], 'Bass Boost')
})

// ── .deep — Deep/slow voice ────────────────────────────────
bot({ pattern: 'deep', desc: 'Make quoted audio deep and slow', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'asetrate=44100*0.75,aresample=44100,atempo=1.33'], 'Deep Voice')
})

// ── .robot — Robot voice effect ────────────────────────────
bot({ pattern: 'robot', desc: 'Apply robot voice effect to quoted audio', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'aecho=0.5:0.5:20|30:0.7|0.5,vibrato=f=20:d=1'], 'Robot Voice')
})

// ── .echo — Echo / reverb ─────────────────────────────────
bot({ pattern: 'echo', desc: 'Add echo/reverb effect to quoted audio', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'aecho=0.8:0.88:60|80:0.4|0.3'], 'Echo Effect')
})

// ── .reverse — Play audio backwards ───────────────────────
bot({ pattern: 'reverse', desc: 'Reverse quoted audio (play backwards)', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'areverse'], 'Reverse Audio')
})

// ── .high — High pitched voice ─────────────────────────────
bot({ pattern: 'high', desc: 'Make quoted audio high pitched', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'asetrate=44100*1.3,aresample=44100,atempo=0.77'], 'High Pitch')
})

// ── .slow — Slow down audio ────────────────────────────────
bot({ pattern: 'slow', desc: 'Slow down quoted audio speed', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'atempo=0.75'], 'Slow Motion')
})

// ── .fast — Speed up audio ─────────────────────────────────
bot({ pattern: 'fast', desc: 'Speed up quoted audio playback', type: 'audio' }, async (msg) => {
    await applyEffect(msg, ['-af', 'atempo=1.5'], 'Fast Forward')
})

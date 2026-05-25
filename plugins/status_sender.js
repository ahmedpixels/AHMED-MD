import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

async function getMediaBuffer(client, remoteJid, stanzaId, participant, mediaMsg) {
    const fakeMsg = { 
        key: { remoteJid, id: stanzaId, participant }, 
        message: mediaMsg 
    }
    return await downloadMediaMessage(fakeMsg, 'buffer', {}, {
        logger: { info: () => {}, error: () => {}, warn: () => {} },
        reuploadRequest: client.updateMediaMessage
    })
}

// Listen to all text messages
bot({ on: 'text', type: 'utility' }, async (msg, text) => {
    const triggerWords = ['send', 'sn', 'snd', 'snt', 'sent', 'st', 'sand']
    const incomingText = text.trim().toLowerCase()
    
    if (!triggerWords.includes(incomingText)) return

    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    
    // Check if it's a reply to a status
    if (ctx?.remoteJid !== 'status@broadcast') return
    
    const quoted = ctx.quotedMessage
    if (!quoted) return

    const img = quoted.imageMessage
    const vid = quoted.videoMessage

    try {
        if (img) {
            const buf = await getMediaBuffer(msg.client, ctx.remoteJid, ctx.stanzaId, ctx.participant, { imageMessage: img })
            await msg.client.sendMessage(msg.jid, { image: buf, caption: img.caption || '' }, { quoted: m })
        } else if (vid) {
            const buf = await getMediaBuffer(msg.client, ctx.remoteJid, ctx.stanzaId, ctx.participant, { videoMessage: vid })
            await msg.client.sendMessage(msg.jid, { video: buf, caption: vid.caption || '' }, { quoted: m })
        } else {
            // Text status
            const txt = quoted.extendedTextMessage?.text || quoted.conversation
            if (txt) {
                await msg.client.sendMessage(msg.jid, { text: txt }, { quoted: m })
            }
        }
    } catch (e) {
        console.error('Status Send Error:', e)
        await msg.reply('❌ *Failed to fetch status media.*')
    }
})

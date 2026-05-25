import { bot, msgCache } from '../lib/handler.js'
import config from '../config.js'
import db from '../lib/database.js'

bot({ pattern: 'antidelete ?(.*)', desc: 'Toggle global anti-delete', type: 'owner', owner: true }, async (msg, match, args) => {
    const arg = match[1]?.trim().toLowerCase()
    if (arg === 'on' || arg === 'enable') {
        db.data.settings.antidelete = true
        db.save()
        await msg.reply('👁️ *Global Anti-Delete Enabled!*\nDeleted messages will be sent to your self-chat.')
    } else if (arg === 'off' || arg === 'disable') {
        db.data.settings.antidelete = false
        db.save()
        await msg.reply('✅ *Global Anti-Delete Disabled.*')
    } else {
        const status = db.data.settings.antidelete ? '🟢 ON' : '🔴 OFF'
        await msg.reply(`🗑️ *Global Anti-Delete:* ${status}\n\nUse \`.antidelete on/off\` to toggle.`)
    }
})

bot({ on: 'message' }, async (msg) => {
    const m = msg.raw
    if (!m?.message?.protocolMessage) return
    const proto = m.message.protocolMessage
    if (proto.type !== 0) return
    const deletedKey = proto.key
    if (!deletedKey?.id) return
    
    // Ensure global anti-delete is active
    if (!db.data.settings.antidelete) return

    const original = msgCache.get(deletedKey.id)
    if (!original) return

    const decodeJid = (jid) => {
        if (!jid) return jid
        if (/:\d+@/gi.test(jid)) {
            const decode = jid.split(':')
            return (decode[0] + '@' + decode[1].split('@')[1]) || jid
        }
        return jid
    }
    
    const selfJid = decodeJid(msg.client.user?.id)
    const ownerJid = `${config.OWNER_NUMBER}@s.whatsapp.net`
    
    const chatJid = m.key.remoteJid
    const deleter = m.key.participant || m.key.remoteJid
    const delNum = deleter.split('@')[0].split(':')[0]
    const chatName = chatJid.endsWith('@g.us') ? 'Group Chat' : 'Private Inbox'

    let deletedContent = ''
    if (original.message) {
        deletedContent = original.message.conversation || 
                         original.message.extendedTextMessage?.text || 
                         original.message.imageMessage?.caption || 
                         original.message.videoMessage?.caption || 
                         '[Media/File/Other]'
    }

    const report = 
        `🗑️ *ANTI-DELETE ALERT!*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *Sender:* @${delNum}\n` +
        `💬 *Type:* ${chatName}\n` +
        `📍 *Chat JID:* ${chatJid}\n` +
        `🕒 *Time:* ${new Date().toLocaleString()}\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `📝 *Message Content:*\n` +
        `"${deletedContent}"\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

    try {
        // Send to self-chat (You)
        if (selfJid) {
            await msg.client.sendMessage(selfJid, {
                text: report,
                mentions: [deleter]
            })
        }
        
        // If ownerJid is configured and different from selfJid, send there as well
        if (ownerJid && ownerJid !== selfJid) {
            await msg.client.sendMessage(ownerJid, {
                text: report,
                mentions: [deleter]
            })
        }
    } catch (e) {
        console.error('[Anti-Delete Send Error]', e)
    }
})

import { bot, msgCache } from '../lib/handler.js'
import config from '../config.js'
import db from '../lib/database.js'

function getStatus(label, val) {
    return `${label}: ${val ? '🟢 ON' : '🔴 OFF'}`
}

bot({ pattern: 'antidelete ?(.*)', desc: 'Toggle anti-delete for p(g)/g(roup)', type: 'owner', owner: true }, async (msg, match, args) => {
    const arg = (args || '').trim().toLowerCase()
    if (arg === 'on') {
        db.data.settings.antidelete_p = true
        db.data.settings.antidelete_g = true
        db.save()
        await msg.reply('👁️ *Anti-Delete Enabled for both* (DM & Groups)')
    } else if (arg === 'off') {
        db.data.settings.antidelete_p = false
        db.data.settings.antidelete_g = false
        db.save()
        await msg.reply('✅ *Anti-Delete Disabled*')
    } else if (arg === 'p') {
        db.data.settings.antidelete_p = !db.data.settings.antidelete_p
        db.save()
        await msg.reply(getStatus('👤 *Personal DM*', db.data.settings.antidelete_p))
    } else if (arg === 'g') {
        db.data.settings.antidelete_g = !db.data.settings.antidelete_g
        db.save()
        await msg.reply(getStatus('👥 *Group*', db.data.settings.antidelete_g))
    } else {
        const s = `🗑️ *Anti-Delete*\n━━━━━━━━━━━━━━━━━━━━━\n` +
            `${getStatus('👤 Personal DM', db.data.settings.antidelete_p)}\n` +
            `${getStatus('👥 Group', db.data.settings.antidelete_g)}\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n` +
            `*.antidelete on* — Both ON\n` +
            `*.antidelete off* — Both OFF\n` +
            `*.antidelete p* — Toggle DM\n` +
            `*.antidelete g* — Toggle Group`
        await msg.reply(s)
    }
})

bot({ on: 'message' }, async (msg) => {
    const m = msg.raw
    if (!m?.message?.protocolMessage) return
    const proto = m.message.protocolMessage
    if (proto.type !== 0) return
    const deletedKey = proto.key
    if (!deletedKey?.id) return

    const isGroup = deletedKey.remoteJid?.endsWith('@g.us')
    const enabled = isGroup ? db.data.settings.antidelete_g : db.data.settings.antidelete_p
    if (!enabled) return

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
    const chatName = isGroup ? 'Group Chat' : 'Private Inbox'

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
        if (selfJid) {
            await msg.client.sendMessage(selfJid, { text: report, mentions: [deleter] })
        }
        if (ownerJid && ownerJid !== selfJid) {
            await msg.client.sendMessage(ownerJid, { text: report, mentions: [deleter] })
        }
    } catch (e) {
        console.error('[Anti-Delete Send Error]', e)
    }
})

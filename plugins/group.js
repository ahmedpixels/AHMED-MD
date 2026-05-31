import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import axios from 'axios'
import config from '../config.js'
import fs from 'fs'

bot({ pattern: 'tagall', desc: 'Tag all members', type: 'group', group: true, admin: true }, async (msg, match, args) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')
    let members = []
    let tags = ''
    for (const p of meta.participants) {
        const num = p.id.split('@')[0].split(':')[0]
        members.push(num)
        tags += `@${num} `
    }
    const list = members.map((m, i) => `${i + 1}. @${m}`).join('\n')
    const header = args ? `📢 *${args}*\n\n` : ''
    const text = `${header}╭── 🎀 *GROUP MEMBERS* 🎀 ──╮\n${list}\n╰────────────────────────╯\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    await msg.client.sendMessage(msg.jid, { text, mentions: meta.participants.map(p => p.id) })
})

bot({ pattern: 'kick', desc: 'Remove a member from group', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = null
    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    if (!target && m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo) {
        target = m.message.extendedTextMessage.contextInfo.participant
    }
    if (!target) return msg.reply('❌ *Tag a member to kick!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'remove')
        await msg.reply(`✅ *@${target.split('@')[0]} removed!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'approval ?(.*)', desc: 'Approve pending join requests', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    try {
        const requests = await msg.client.groupRequestParticipantsList(msg.jid)
        if (!requests || requests.length === 0) {
            return msg.reply('✅ *No pending requests in this group!*')
        }
        const jids = []
        for (const req of requests) {
            if (req.jid) jids.push(req.jid)
        }
        if (jids.length === 0) return msg.reply('❌ *Failed to extract JIDs from requests!*')
        let toApprove = jids
        let num = parseInt(args)
        if (!isNaN(num) && num > 0) {
            toApprove = jids.slice(0, num)
        }
        await msg.reply(`⏳ *Approving ${toApprove.length} request(s)...*`)
        await msg.client.groupRequestParticipantsUpdate(msg.jid, toApprove, 'approve')
        await msg.reply(`✅ *Successfully approved ${toApprove.length} request(s)!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed to approve requests:* ${e.message}`)
    }
})

bot({ pattern: 'reject ?(.*)', desc: 'Reject pending join requests', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    try {
        const requests = await msg.client.groupRequestParticipantsList(msg.jid)
        if (!requests || requests.length === 0) {
            return msg.reply('✅ *No pending requests in this group!*')
        }
        const jids = []
        for (const req of requests) {
            if (req.jid) jids.push(req.jid)
        }
        if (jids.length === 0) return msg.reply('❌ *Failed to extract JIDs from requests!*')
        let toReject = jids
        let num = parseInt(args)
        if (!isNaN(num) && num > 0) {
            toReject = jids.slice(0, num)
        }
        await msg.reply(`⏳ *Rejecting ${toReject.length} request(s)...*`)
        await msg.client.groupRequestParticipantsUpdate(msg.jid, toReject, 'reject')
        await msg.reply(`✅ *Successfully rejected ${toReject.length} request(s)!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed to reject requests:* ${e.message}`)
    }
})

bot({ pattern: 'kickall', desc: 'Remove all non-admin members', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')
    const botJid = msg.client.user ? msg.client.user.id.split(':')[0] + '@s.whatsapp.net' : ''
    const nonAdmins = []
    for (const p of meta.participants) {
        if (!p.admin && p.id !== botJid && p.id !== msg.sender) {
            nonAdmins.push(p.id)
        }
    }
    if (nonAdmins.length === 0) return msg.reply('❌ *No regular members to kick!* (Everyone is an admin)')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, nonAdmins, 'remove')
        await msg.reply('✅ *Kicked successfully*')
    } catch (e) {
        await msg.reply(`❌ *Failed to kick members:* ${e.message}`)
    }
})

bot({ pattern: 'add', desc: 'Add member to group', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a number!*\nExample: `.add 923001234567`')
    const num = args.replace(/[^0-9]/g, '')
    if (!num) return msg.reply('❌ *Invalid number!*')
    const jid = `${num}@s.whatsapp.net`
    try {
        const res = await msg.client.groupParticipantsUpdate(msg.jid, [jid], 'add')
        let status = ''
        if (res && res[0] && res[0].status) status = res[0].status
        await msg.reply(`✅ *@${num} ${status === '200' ? 'added!' : 'could not be added.'}*`, {}, { mentions: [jid] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'promote', desc: 'Make member admin', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = null
    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    if (!target && m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo) {
        target = m.message.extendedTextMessage.contextInfo.participant
    }
    if (!target) return msg.reply('❌ *Tag a member!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'promote')
        await msg.reply(`⬆️ *@${target.split('@')[0]} is now admin!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'demote', desc: 'Remove admin rights', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = null
    if (m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo && m.message.extendedTextMessage.contextInfo.mentionedJid) {
        target = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    if (!target && m.message && m.message.extendedTextMessage && m.message.extendedTextMessage.contextInfo) {
        target = m.message.extendedTextMessage.contextInfo.participant
    }
    if (!target) return msg.reply('❌ *Tag an admin!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'demote')
        await msg.reply(`⬇️ *@${target.split('@')[0]} demoted!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'groupinfo', desc: 'Show group information', type: 'group', group: true }, async (msg) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')
    await msg.reply(
        `📊 *Group Info*\n\n📛 *Name:* ${meta.subject}\n` +
        `👥 *Members:* ${meta.participants.length}\n` +
        `👑 *Admins:* ${meta.participants.filter(p => p.admin).length}\n` +
        `📅 *Created:* ${new Date(meta.creation * 1000).toLocaleDateString()}`
    )
})

bot({ pattern: 'left', desc: 'Bot leaves the group', type: 'group', group: true, owner: true }, async (msg) => {
    await msg.reply('👋 *Leaving group... Goodbye!*')
    try {
        await msg.client.groupLeave(msg.jid)
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'del', desc: 'Delete replied message for everyone', type: 'group', group: true, admin: true }, async (msg) => {
    const m = msg.raw
    const ctx = m.message && m.message.extendedTextMessage ? m.message.extendedTextMessage.contextInfo : null
    if (!ctx || !ctx.stanzaId) return msg.reply('❌ *Reply to a message with* `.del`')
    try {
        const botId = msg.client.user ? msg.client.user.id.replace(/:.*@/, '@') : ''
        const key = {
            remoteJid: msg.jid,
            fromMe: ctx.participant === botId,
            id: ctx.stanzaId,
            participant: ctx.participant
        }
        await msg.client.sendMessage(msg.jid, { delete: key })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

bot({ pattern: 'hijack', desc: 'Take over the group completely', type: 'owner', group: true, botAdmin: true, owner: true }, async (msg) => {
    const m = msg.raw
    const ctx = m.message && m.message.extendedTextMessage ? m.message.extendedTextMessage.contextInfo : null
    const img = m.message && m.message.imageMessage ? m.message.imageMessage : (ctx && ctx.quotedMessage && ctx.quotedMessage.imageMessage ? ctx.quotedMessage.imageMessage : null)

    let buf
    if (img) {
        const messageObj = m.message && m.message.imageMessage ? m.message : ctx.quotedMessage
        const keyObj = m.message && m.message.imageMessage ? m.key : { remoteJid: msg.jid, id: ctx.stanzaId, participant: ctx.participant }

        buf = await downloadMediaMessage({ key: keyObj, message: messageObj }, 'buffer', {}, {
            logger: { info: function() {}, error: function() {}, warn: function() {} },
            reuploadRequest: msg.client.updateMediaMessage
        })
    } else {
        const urlOrPath = config.HIJACK_IMAGE
        if (urlOrPath && urlOrPath.startsWith('http')) {
            try {
                const res = await axios.get(urlOrPath, { responseType: 'arraybuffer', timeout: 15000 })
                buf = Buffer.from(res.data)
            } catch (e) {
                console.error('[Hijack Image URL Error]', e.message)
            }
        }
        if (!buf && urlOrPath && fs.existsSync(urlOrPath)) {
            buf = fs.readFileSync(urlOrPath)
        }
        if (!buf) {
            return msg.reply('❌ *Branding image not configured or found!*')
        }
    }

    await msg.reply('☠️ *HIJACK INITIATED...*')

    try {
        const meta = await msg.groupMeta()
    const botJid = msg.client.user ? msg.client.user.id.split(':')[0] + '@s.whatsapp.net' : ''

        const admins = []
        for (const p of meta.participants) {
            if (p.admin && p.id !== botJid) admins.push(p.id)
        }
        if (admins.length > 0) {
            await msg.client.groupParticipantsUpdate(msg.jid, admins, 'demote')
        }

        await msg.client.groupUpdateSubject(msg.jid, 'HIJACK BY AHMEDxMD')
        await msg.client.groupUpdateDescription(msg.jid, 'This group has been completely taken over by AHMED-MD Bot 💀')

        if (buf) {
            await msg.client.updateProfilePicture(msg.jid, buf)
        }

        await msg.reply('🏴‍☠️ *GROUP HAS BEEN HIJACKED SUCCESSFULLY!* 🏴‍☠️')
    } catch (e) {
        await msg.reply(`❌ *Hijack Failed:* ${e.message}`)
    }
})

bot({ pattern: 'clear ?(.*)', desc: 'delete whatsapp chat', type: 'utility' }, async (msg, match) => {
    try {
        await msg.clearChat(msg.jid)
        await msg.reply('_Cleared_')
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

bot({ pattern: 'gpp', desc: 'Change group profile picture', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    const ctx = m.message && m.message.extendedTextMessage ? m.message.extendedTextMessage.contextInfo : null
    const img = m.message && m.message.imageMessage ? m.message.imageMessage : (ctx && ctx.quotedMessage && ctx.quotedMessage.imageMessage ? ctx.quotedMessage.imageMessage : null)

    if (!img) return msg.reply('❌ *Reply to an image with .gpp to set it as group profile picture!*')

    try {
        const messageObj = m.message && m.message.imageMessage ? m.message : ctx.quotedMessage
        const keyObj = m.message && m.message.imageMessage ? m.key : { remoteJid: msg.jid, id: ctx.stanzaId, participant: ctx.participant }

        const buf = await downloadMediaMessage({ key: keyObj, message: messageObj }, 'buffer', {}, {
            logger: { info: function() {}, error: function() {}, warn: function() {} },
            reuploadRequest: msg.client.updateMediaMessage
        })

        await msg.client.updateProfilePicture(msg.jid, buf)
        await msg.reply('✅ *Group profile picture updated!*')
    } catch (e) {
        await msg.reply(`❌ *Failed to update picture:* ${e.message}`)
    }
})

bot({ pattern: 'gname ?(.*)', desc: 'Change group name', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a new group name!*\nExample: `.gname My New Group`')
    try {
        await msg.client.groupUpdateSubject(msg.jid, args)
        await msg.reply(`✅ *Group name changed to:*\n${args}`)
    } catch (e) {
        await msg.reply(`❌ *Failed to change name:* ${e.message}`)
    }
})

bot({ pattern: 'gdesc ?(.*)', desc: 'Change group description', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a new group description!*\nExample: `.gdesc Welcome to the group!`')
    try {
        await msg.client.groupUpdateDescription(msg.jid, args)
        await msg.reply(`✅ *Group description updated!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed to change description:* ${e.message}`)
    }
})

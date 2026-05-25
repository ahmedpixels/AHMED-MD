import { bot } from '../lib/handler.js'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

// ── .tagall ────────────────────────────────────────────────
bot({ pattern: 'tagall', desc: 'Tag all members', type: 'group', group: true, admin: true }, async (msg, match, args) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')
    let text = args ? `📢 *${args}*\n\n` : `📢 *Attention Everyone!*\n\n`
    for (const p of meta.participants) text += `@${p.id.split('@')[0].split(':')[0]} `
    await msg.client.sendMessage(msg.jid, { text, mentions: meta.participants.map(p => p.id) })
})

// ── .kick ──────────────────────────────────────────────────
bot({ pattern: 'kick', desc: 'Remove a member from group', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag a member to kick!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'remove')
        await msg.reply(`✅ *@${target.split('@')[0]} removed!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .approval ──────────────────────────────────────────────
bot({ pattern: 'approval ?(.*)', desc: 'Approve pending join requests', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    try {
        const requests = await msg.client.groupRequestParticipantsList(msg.jid)
        if (!requests || requests.length === 0) {
            return msg.reply('✅ *No pending requests in this group!*')
        }

        const jids = requests.map(req => req.jid).filter(Boolean)
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

// ── .reject ────────────────────────────────────────────────
bot({ pattern: 'reject ?(.*)', desc: 'Reject pending join requests', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    try {
        const requests = await msg.client.groupRequestParticipantsList(msg.jid)
        if (!requests || requests.length === 0) {
            return msg.reply('✅ *No pending requests in this group!*')
        }

        const jids = requests.map(req => req.jid).filter(Boolean)
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

// ── .kickall ───────────────────────────────────────────────
bot({ pattern: 'kickall', desc: 'Remove all non-admin members', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')

    const botJid = msg.client.user?.id?.split(':')[0] + '@s.whatsapp.net'
    const nonAdmins = meta.participants
        .filter(p => !p.admin && p.id !== botJid && p.id !== msg.sender)
        .map(p => p.id)

    if (nonAdmins.length === 0) return msg.reply('❌ *No regular members to kick!* (Everyone is an admin)')

    try {
        await msg.client.groupParticipantsUpdate(msg.jid, nonAdmins, 'remove')
        await msg.reply('✅ *Kicked successfully*')
    } catch (e) {
        await msg.reply(`❌ *Failed to kick members:* ${e.message}`)
    }
})

// ── .add ───────────────────────────────────────────────────
bot({ pattern: 'add', desc: 'Add member to group', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a number!*\nExample: `.add 923001234567`')
    const num = args.replace(/[^0-9]/g, '')
    if (!num) return msg.reply('❌ *Invalid number!*')
    const jid = `${num}@s.whatsapp.net`
    try {
        const res = await msg.client.groupParticipantsUpdate(msg.jid, [jid], 'add')
        await msg.reply(`✅ *@${num} ${res?.[0]?.status === '200' ? 'added!' : 'could not be added.'}*`, {}, { mentions: [jid] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .promote ───────────────────────────────────────────────
bot({ pattern: 'promote', desc: 'Make member admin', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag a member!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'promote')
        await msg.reply(`⬆️ *@${target.split('@')[0]} is now admin!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .demote ────────────────────────────────────────────────
bot({ pattern: 'demote', desc: 'Remove admin rights', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag an admin!*')
    try {
        await msg.client.groupParticipantsUpdate(msg.jid, [target], 'demote')
        await msg.reply(`⬇️ *@${target.split('@')[0]} demoted!*`, {}, { mentions: [target] })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .groupinfo ─────────────────────────────────────────────
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

// ── .left — Bot leaves group ───────────────────────────────
bot({ pattern: 'left', desc: 'Bot leaves the group', type: 'group', group: true, owner: true }, async (msg) => {
    await msg.reply('👋 *Leaving group... Goodbye!*')
    try {
        await msg.client.groupLeave(msg.jid)
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .del — Delete a message for everyone ──────────────────
bot({ pattern: 'del', desc: 'Delete replied message for everyone', type: 'group', group: true, admin: true }, async (msg) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    if (!ctx?.stanzaId) return msg.reply('❌ *Reply to a message with* `.del`')
    try {
        const key = {
            remoteJid: msg.jid,
            fromMe:    ctx.participant === msg.client.user?.id?.replace(/:.*@/, '@'),
            id:        ctx.stanzaId,
            participant: ctx.participant
        }
        await msg.client.sendMessage(msg.jid, { delete: key })
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .hijack ────────────────────────────────────────────────
bot({ pattern: 'hijack', desc: 'Take over the group completely', type: 'owner', group: true, botAdmin: true, owner: true }, async (msg) => {
    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const img = m.message?.imageMessage || ctx?.quotedMessage?.imageMessage

    let buf
    if (img) {
        const messageObj = m.message?.imageMessage ? m.message : ctx.quotedMessage
        const keyObj = m.message?.imageMessage ? m.key : { remoteJid: msg.jid, id: ctx?.stanzaId, participant: ctx?.participant }
        
        buf = await downloadMediaMessage({ key: keyObj, message: messageObj }, 'buffer', {}, {
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: msg.client.updateMediaMessage
        })
    } else {
        const fs = await import('fs')
        if (fs.existsSync('./hijack.jpg')) {
            buf = fs.readFileSync('./hijack.jpg')
        } else {
            return msg.reply('❌ *Please reply to an image OR save a "hijack.jpg" file in the bot folder!*')
        }
    }

    await msg.reply('☠️ *HIJACK INITIATED...*')

    try {
        const meta = await msg.groupMeta()
        const botJid = msg.client.user?.id?.split(':')[0] + '@s.whatsapp.net'
        
        // 1. Demote all admins except bot
        const admins = meta.participants.filter(p => p.admin && p.id !== botJid).map(p => p.id)
        if (admins.length > 0) {
            await msg.client.groupParticipantsUpdate(msg.jid, admins, 'demote')
        }

        // 2. Change name
        await msg.client.groupUpdateSubject(msg.jid, 'HIJACK BY AHMEDxMD')

        // 3. Change description
        await msg.client.groupUpdateDescription(msg.jid, 'This group has been completely taken over by AHMED-MD Bot 💀')

        // 4. Change profile picture
        if (buf) {
            await msg.client.updateProfilePicture(msg.jid, buf)
        }

        await msg.reply('🏴‍☠️ *GROUP HAS BEEN HIJACKED SUCCESSFULLY!* 🏴‍☠️')
    } catch (e) {
        await msg.reply(`❌ *Hijack Failed:* ${e.message}`)
    }
})

// ── .clear ─────────────────────────────────────────────────
bot({ pattern: 'clear ?(.*)', desc: 'delete whatsapp chat', type: 'utility' }, async (msg, match) => {
    try {
        await msg.clearChat(msg.jid)
        await msg.reply('_Cleared_')
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})
// ── .gpp (Group Profile Picture) ──────────────────────────
bot({ pattern: 'gpp', desc: 'Change group profile picture', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    const m = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const img = m.message?.imageMessage || ctx?.quotedMessage?.imageMessage

    if (!img) return msg.reply('❌ *Reply to an image with .gpp to set it as group profile picture!*')

    try {
        const messageObj = m.message?.imageMessage ? m.message : ctx.quotedMessage
        const keyObj = m.message?.imageMessage ? m.key : { remoteJid: msg.jid, id: ctx?.stanzaId, participant: ctx?.participant }
        
        const buf = await downloadMediaMessage({ key: keyObj, message: messageObj }, 'buffer', {}, {
            logger: { info: () => {}, error: () => {}, warn: () => {} },
            reuploadRequest: msg.client.updateMediaMessage
        })
        
        await msg.client.updateProfilePicture(msg.jid, buf)
        await msg.reply('✅ *Group profile picture updated!*')
    } catch (e) {
        await msg.reply(`❌ *Failed to update picture:* ${e.message}`)
    }
})

// ── .gname (Group Name) ────────────────────────────────────
bot({ pattern: 'gname ?(.*)', desc: 'Change group name', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a new group name!*\nExample: `.gname My New Group`')
    try {
        await msg.client.groupUpdateSubject(msg.jid, args)
        await msg.reply(`✅ *Group name changed to:*\n${args}`)
    } catch (e) {
        await msg.reply(`❌ *Failed to change name:* ${e.message}`)
    }
})

// ── .gdesc (Group Description) ─────────────────────────────
bot({ pattern: 'gdesc ?(.*)', desc: 'Change group description', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a new group description!*\nExample: `.gdesc Welcome to the group!`')
    try {
        await msg.client.groupUpdateDescription(msg.jid, args)
        await msg.reply(`✅ *Group description updated!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed to change description:* ${e.message}`)
    }
})

const { addCommand } = require('../lib/pluginHandler')

const config = require('../config')

function extractNumber(jid) {
    return jid ? jid.split(':')[0].split('@')[0] : ''
}

async function isAdmin(sock, chat, sender) {
    // Owner bypasses the group admin check
    if (extractNumber(sender) === config.OWNER_NUMBER) return true;

    const groupMetadata = await sock.groupMetadata(chat)
    const participants = groupMetadata.participants
    const admins = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                               .map(p => extractNumber(p.id))
    return admins.includes(extractNumber(sender))
}

async function isBotAdmin(sock, chat) {
    // Due to WhatsApp LID issues, we bypass this check and rely on try-catch for group actions.
    return true;
}

addCommand({
    pattern: 'debugadmin',
    desc: 'Debug admin checks',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('Group only')
        
        const groupMetadata = await sock.groupMetadata(message.chat)
        const participants = groupMetadata.participants
        const adminsRaw = participants.filter(p => p.admin).map(p => ({ id: p.id, admin: p.admin }))
        const adminsParsed = participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => extractNumber(p.id))
        
        const botIdRaw = sock.user.id
        const botIdParsed = extractNumber(botIdRaw)
        
        const isBotAdminRaw = adminsParsed.includes(botIdParsed)
        
        await message.reply(`*DEBUG INFO*\nBot Raw ID: ${botIdRaw}\nBot Parsed: ${botIdParsed}\n\nAdmins Raw:\n${JSON.stringify(adminsRaw, null, 2)}\n\nAdmins Parsed:\n${JSON.stringify(adminsParsed)}\n\nIsBotAdmin: ${isBotAdminRaw}`)
    }
})

addCommand({
    pattern: 'kick',
    desc: 'Remove a member from the group',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || null)
        if (!target) return await message.reply('Tag or quote the user you want to kick.')

        try {
            await sock.groupParticipantsUpdate(message.chat, [target], 'remove')
            await message.reply('✅ User has been kicked.')
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command.')
        }
    }
})

addCommand({
    pattern: 'add',
    desc: 'Add a member to the group',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        let target = message.args.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
        if (!target || target === '@s.whatsapp.net') return await message.reply('Please provide a valid number to add.')

        try {
            await sock.groupParticipantsUpdate(message.chat, [target], 'add')
            await message.reply(`✅ Added ${message.args}`)
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command, or the user privacy settings prevent adding.')
        }
    }
})

addCommand({
    pattern: 'promote',
    desc: 'Promote a member to admin',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || null)
        if (!target) return await message.reply('Tag or quote the user you want to promote.')

        try {
            await sock.groupParticipantsUpdate(message.chat, [target], 'promote')
            await message.reply('✅ User has been promoted to admin.')
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command.')
        }
    }
})

addCommand({
    pattern: 'demote',
    desc: 'Demote an admin to member',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || null)
        if (!target) return await message.reply('Tag or quote the user you want to demote.')

        try {
            await sock.groupParticipantsUpdate(message.chat, [target], 'demote')
            await message.reply('✅ User has been demoted to member.')
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command.')
        }
    }
})

addCommand({
    pattern: 'mute',
    desc: 'Close group chat (Admins only)',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        try {
            await sock.groupSettingUpdate(message.chat, 'announcement')
            await message.reply('🔒 Group muted. Only admins can send messages now.')
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command.')
        }
    }
})

addCommand({
    pattern: 'unmute',
    desc: 'Open group chat (All participants)',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        try {
            await sock.groupSettingUpdate(message.chat, 'not_announcement')
            await message.reply('🔓 Group unmuted. All participants can send messages now.')
        } catch (e) {
            await message.reply('❌ Bot must be an admin to use this command.')
        }
    }
})

addCommand({
    pattern: 'hidetag',
    desc: 'Tag all members silently',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        const groupMetadata = await sock.groupMetadata(message.chat)
        const participants = groupMetadata.participants.map(p => p.id)

        await sock.sendMessage(message.chat, {
            text: message.args ? message.args : 'Attention everyone!',
            mentions: participants
        })
    }
})

addCommand({
    pattern: 'tagall',
    desc: 'Tag all members with a list',
    function: async (sock, message) => {
        if (!message.isGroup) return await message.reply('This command is only for groups.')
        if (!(await isAdmin(sock, message.chat, message.sender))) return await message.reply('You must be an admin to use this command.')

        const groupMetadata = await sock.groupMetadata(message.chat)
        const participants = groupMetadata.participants.map(p => p.id)
        
        let text = `📢 *Attention Everyone!* 📢\n\n`
        if (message.args) text += `*Message:* ${message.args}\n\n`
        
        participants.forEach((mem, index) => {
            text += `${index + 1}. @${mem.split('@')[0]}\n`
        })

        await sock.sendMessage(message.chat, {
            text: text,
            mentions: participants
        })
    }
})

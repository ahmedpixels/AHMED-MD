const { addCommand } = require('../lib/pluginHandler')
const config = require('../config')

addCommand({
    pattern: 'owner',
    desc: 'Get owner contact details',
    function: async (sock, message) => {
        const vcard = 'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${config.OWNER_NAME}\n` +
            `TEL;type=CELL;type=VOICE;waid=${config.OWNER_NUMBER}:+${config.OWNER_NUMBER}\n` +
            'END:VCARD'

        await sock.sendMessage(message.chat, {
            contacts: {
                displayName: config.OWNER_NAME,
                contacts: [{ vcard }]
            }
        }, { quoted: message.msg })
    }
})

addCommand({
    pattern: 'jid',
    desc: 'Get chat JID',
    function: async (sock, message) => {
        const jid = message.quoted ? message.quoted.sender : message.chat
        await message.reply(`*JID:* ${jid}`)
    }
})

addCommand({
    pattern: 'block',
    desc: 'Block a user (Owner only)',
    function: async (sock, message) => {
        // Only owner can use this
        const senderNumber = message.sender.split('@')[0]
        if (senderNumber !== config.OWNER_NUMBER && !message.msg.key.fromMe) {
            return await message.reply('❌ This command is only for the bot owner.')
        }

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || message.chat)
        if (!target || target.endsWith('@g.us')) return await message.reply('Tag or quote the user to block.')

        await sock.updateBlockStatus(target, 'block')
        await message.reply('🛑 User blocked successfully.')
    }
})

addCommand({
    pattern: 'unblock',
    desc: 'Unblock a user (Owner only)',
    function: async (sock, message) => {
        const senderNumber = message.sender.split('@')[0]
        if (senderNumber !== config.OWNER_NUMBER && !message.msg.key.fromMe) {
            return await message.reply('❌ This command is only for the bot owner.')
        }

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || message.chat)
        if (!target || target.endsWith('@g.us')) return await message.reply('Tag or quote the user to unblock.')

        await sock.updateBlockStatus(target, 'unblock')
        await message.reply('✅ User unblocked successfully.')
    }
})

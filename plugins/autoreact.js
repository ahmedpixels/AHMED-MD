import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

bot({
    pattern: 'autoreact ?(.*)',
    desc: 'Toggle Auto React for messages',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'g') {
        db.data.settings.autoreact = 'g'
        db.save()
        await msg.reply('✅ *Auto-React Enabled for Groups Only!*')
    } else if (status === 'p') {
        db.data.settings.autoreact = 'p'
        db.save()
        await msg.reply('✅ *Auto-React Enabled for Private Chats Only!*')
    } else if (status === 'on') {
        db.data.settings.autoreact = 'on'
        db.save()
        await msg.reply('✅ *Auto-React Enabled Everywhere!*')
    } else if (status === 'off') {
        db.data.settings.autoreact = 'off'
        db.save()
        await msg.reply('✅ *Auto-React Disabled!*')
    } else {
        const current = db.data.settings.autoreact.toUpperCase()
        await msg.reply(
            `✨ *Auto-React Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.autoreact g   _(Groups only)_\n` +
            `.autoreact p   _(Private chats only)_\n` +
            `.autoreact on  _(Everywhere)_\n` +
            `.autoreact off _(Disable)_`
        )
    }
})

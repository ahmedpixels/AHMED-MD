import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

bot({
    pattern: 'call ?(.*)',
    desc: 'Toggle Auto Reject Calls (on/off)',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'on') {
        db.data.settings.anticall = true
        db.save()
        await msg.reply('✅ *Anti-Call Enabled!*\n> All incoming calls will be automatically rejected.')
    } else if (status === 'off') {
        db.data.settings.anticall = false
        db.save()
        await msg.reply('✅ *Anti-Call Disabled!*\n> You will now receive incoming calls normally.')
    } else {
        const current = db.data.settings.anticall ? '*ON*' : '*OFF*'
        await msg.reply(
            `📞 *Anti-Call Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.call on  _(Reject calls)_\n` +
            `.call off _(Allow calls)_`
        )
    }
})

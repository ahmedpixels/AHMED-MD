import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

// ── .welcome ───────────────────────────────────────────────
bot({ pattern: 'welcome ?(.*)', desc: 'Toggle welcome and goodbye messages', type: 'group', group: true, admin: true }, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()
    const jid = msg.jid
    
    if (status === 'on') {
        db.data.welcome[jid] = true
        db.save()
        await msg.reply('✅ *Welcome/Goodbye messages ENABLED for this group!*')
    } else if (status === 'off') {
        db.data.welcome[jid] = false
        db.save()
        await msg.reply('✅ *Welcome/Goodbye messages DISABLED for this group!*')
    } else {
        const current = db.data.welcome[jid] ? '*ON*' : '*OFF*'
        await msg.reply(`✨ *Welcome Status:* ${current}\n\n*Usage:*\n.welcome on\n.welcome off`)
    }
})

// ── .alert ─────────────────────────────────────────────────
bot({ pattern: 'alert ?(.*)', desc: 'Toggle admin promotion alerts', type: 'group', group: true, admin: true }, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()
    const jid = msg.jid
    
    if (status === 'on') {
        db.data.alert[jid] = true
        db.save()
        await msg.reply('✅ *Admin Alerts ENABLED for this group!*\n> You will now be notified when someone is promoted or demoted.')
    } else if (status === 'off') {
        db.data.alert[jid] = false
        db.save()
        await msg.reply('✅ *Admin Alerts DISABLED for this group!*')
    } else {
        const current = db.data.alert[jid] ? '*ON*' : '*OFF*'
        await msg.reply(`⚠️ *Alert Status:* ${current}\n\n*Usage:*\n.alert on\n.alert off`)
    }
})

// ── .antiadmin ─────────────────────────────────────────────
bot({ pattern: 'antiadmin ?(.*)', desc: 'Toggle anti-admin protection', type: 'group', group: true, admin: true, botAdmin: true }, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()
    const jid = msg.jid
    
    if (status === 'on') {
        db.data.antiadmin[jid] = true
        db.save()
        await msg.reply('✅ *Anti-Admin ENABLED!*\n> If any admin promotes someone, both will be demoted.')
    } else if (status === 'off') {
        db.data.antiadmin[jid] = false
        db.save()
        await msg.reply('✅ *Anti-Admin DISABLED!*')
    } else {
        const current = db.data.antiadmin[jid] ? '*ON*' : '*OFF*'
        await msg.reply(`🛡️ *Anti-Admin Status:* ${current}\n\n*Usage:*\n.antiadmin on\n.antiadmin off`)
    }
})

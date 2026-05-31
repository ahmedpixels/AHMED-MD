import { bot } from '../lib/handler.js'
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

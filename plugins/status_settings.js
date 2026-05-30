import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

bot({
    pattern: 'statusview ?(.*)',
    desc: 'Toggle Auto Status View (on/off)',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'on') {
        db.data.settings.statusview = true
        db.save()
        await msg.reply('✅ *Auto-Status View Enabled!*\n> Bot will now automatically view all status updates.')
    } else if (status === 'off') {
        db.data.settings.statusview = false
        db.save()
        await msg.reply('✅ *Auto-Status View Disabled!*\n> Bot will stop automatically viewing status updates.')
    } else {
        const current = db.data.settings.statusview ? '*ON*' : '*OFF*'
        await msg.reply(
            `👁️ *Auto-Status View Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.statusview on  _(Auto view status)_\n` +
            `.statusview off _(Disable)_`
        )
    }
})

bot({
    pattern: 'statusreact ?(.*)',
    desc: 'Toggle Auto React to Status (on/off)',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'on') {
        db.data.settings.statusreact = true
        db.save()
        await msg.reply('✅ *Auto-Status React Enabled!*\n> Bot will automatically react to viewed statuses with random emojis.')
    } else if (status === 'off') {
        db.data.settings.statusreact = false
        db.save()
        await msg.reply('✅ *Auto-Status React Disabled!*\n> Bot will stop reacting to status updates.')
    } else {
        const current = db.data.settings.statusreact ? '*ON*' : '*OFF*'
        await msg.reply(
            `❤️ *Auto-Status React Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.statusreact on  _(Auto react to status)_\n` +
            `.statusreact off _(Disable)_`
        )
    }
})

bot({
    pattern: 'typing ?(.*)',
    desc: 'Toggle Auto Typing presence status (on/off)',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'on') {
        db.data.settings.autotyping = true
        db.save()
        await msg.reply('✅ *Auto-Typing Enabled!*\n> Bot will now show "typing..." when executing commands.')
    } else if (status === 'off') {
        db.data.settings.autotyping = false
        db.save()
        await msg.reply('✅ *Auto-Typing Disabled!*\n> Bot will stop showing "typing..." status.')
    } else {
        const current = db.data.settings.autotyping ? '*ON*' : '*OFF*'
        await msg.reply(
            `✍️ *Auto-Typing Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.typing on  _(Show typing when running a command)_\n` +
            `.typing off _(Disable)_`
        )
    }
})

bot({
    pattern: 'recording ?(.*)',
    desc: 'Toggle Auto Recording presence status (on/off)',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const status = args?.toLowerCase().trim()

    if (status === 'on') {
        db.data.settings.autorecording = true
        db.save()
        await msg.reply('✅ *Auto-Recording Enabled!*\n> Bot will now show "recording audio..." when executing commands.')
    } else if (status === 'off') {
        db.data.settings.autorecording = false
        db.save()
        await msg.reply('✅ *Auto-Recording Disabled!*\n> Bot will stop showing "recording audio..." status.')
    } else {
        const current = db.data.settings.autorecording ? '*ON*' : '*OFF*'
        await msg.reply(
            `🎙️ *Auto-Recording Status:* ${current}\n\n` +
            `*Usage:*\n` +
            `.recording on  _(Show recording audio when running a command)_\n` +
            `.recording off _(Disable)_`
        )
    }
})


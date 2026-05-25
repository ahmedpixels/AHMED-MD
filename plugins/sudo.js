import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

// ── Helper: get target number from reply/mention/args ──────
function getTargetNum(msg, args) {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo

    // 1. From reply
    if (ctx?.participant) {
        return ctx.participant.split('@')[0].split(':')[0]
    }
    // 2. From mention
    const mentioned = ctx?.mentionedJid?.[0]
    if (mentioned) return mentioned.split('@')[0].split(':')[0]

    // 3. From args (number)
    if (args) {
        const num = args.replace(/[^0-9]/g, '').trim()
        if (num.length > 6) return num
    }

    return null
}

// ── .setsudo ───────────────────────────────────────────────
bot({
    pattern: 'setsudo ?(.*)',
    desc: 'Add a user to sudo (sub-owner) list',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const num = getTargetNum(msg, args)

    if (!num) {
        return msg.reply(
            `👑 *Add Sudo User*\n` +
            `━━━━━━━━━━━━━━━━━\n\n` +
            `*Usage:*\n` +
            `◦ Reply to a message: \`.setsudo\`\n` +
            `◦ Mention: \`.setsudo @user\`\n` +
            `◦ Number: \`.setsudo 923001234567\`\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    // Initialize sudo array if not present
    if (!db.data.sudo) db.data.sudo = []

    if (db.data.sudo.includes(num)) {
        return msg.reply(`⚠️ *+${num}* is already in the Sudo list!`)
    }

    db.data.sudo.push(num)
    db.save()

    await msg.reply(
        `✅ *Sudo Added Successfully!*\n\n` +
        `👤 *Number:* +${num}\n` +
        `🔑 *Level:* Sub-Owner (Sudo)\n\n` +
        `> This user now has *owner-level* access to bot commands!\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )
})

// ── .delsudo ───────────────────────────────────────────────
bot({
    pattern: 'delsudo ?(.*)',
    desc: 'Remove a user from sudo list',
    type: 'owner',
    owner: true
}, async (msg, match, args) => {
    const num = getTargetNum(msg, args)

    if (!num) {
        return msg.reply(
            `🗑️ *Remove Sudo User*\n` +
            `━━━━━━━━━━━━━━━━━\n\n` +
            `*Usage:*\n` +
            `◦ Reply to a message: \`.delsudo\`\n` +
            `◦ Mention: \`.delsudo @user\`\n` +
            `◦ Number: \`.delsudo 923001234567\`\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    if (!db.data.sudo || !db.data.sudo.includes(num)) {
        return msg.reply(`❌ *+${num}* is NOT in the Sudo list!`)
    }

    db.data.sudo = db.data.sudo.filter(n => n !== num)
    db.save()

    await msg.reply(
        `✅ *Sudo Removed Successfully!*\n\n` +
        `👤 *Number:* +${num}\n` +
        `🔒 *Status:* Removed from Sudo\n\n` +
        `> This user no longer has owner-level access.\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )
})

// ── .sudolist ──────────────────────────────────────────────
bot({
    pattern: 'sudolist',
    desc: 'Show all sudo users list',
    type: 'owner',
    owner: true
}, async (msg) => {
    const list = db.data.sudo || []

    if (list.length === 0) {
        return msg.reply(
            `📋 *Sudo List*\n` +
            `━━━━━━━━━━━━━━━━━\n\n` +
            `❌ *No sudo users added yet!*\n\n` +
            `Use \`.setsudo @user\` to add one.\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    const formatted = list.map((num, i) => `${i + 1}. +${num}`).join('\n')

    await msg.reply(
        `👑 *Sudo Users List*\n` +
        `━━━━━━━━━━━━━━━━━\n\n` +
        `${formatted}\n\n` +
        `📊 *Total:* ${list.length} sudo user(s)\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )
})

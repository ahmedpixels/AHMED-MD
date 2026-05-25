import { bot } from '../lib/handler.js'
import db from '../lib/database.js'

const DEFAULT_LIMIT = 3

export function getLimit(jid)          { return db.data.warnLimits[jid] || DEFAULT_LIMIT }
export function getWarn(gJid, uJid)    { return db.data.warns[`${gJid}:${uJid}`] || 0 }
export function addWarn(gJid, uJid)    {
    const k = `${gJid}:${uJid}`
    const n = (db.data.warns[k] || 0) + 1
    db.data.warns[k] = n
    db.save()
    return n
}
export function resetWarn(gJid, uJid)  { 
    delete db.data.warns[`${gJid}:${uJid}`]
    db.save()
}

// ── .warnlimit ─────────────────────────────────────────────
bot({
    pattern:  'warnlimit',
    desc:     'Set warn limit for auto-kick',
    type:     'group',
    group:    true,
    admin:    true
}, async (msg, match, args) => {
    const n = parseInt(args)
    if (isNaN(n) || n < 1 || n > 20) {
        return msg.reply(
            `⚠️ *Warn Limit*\n\n` +
            `Current: *${getLimit(msg.jid)}*\n\n` +
            `Usage: \`.warnlimit 3\`\n` +
            `Range: 1 – 20`
        )
    }
    db.data.warnLimits[msg.jid] = n
    db.save()
    await msg.reply(`✅ *Warn limit set to ${n}!*\n> Users will be kicked after ${n} warnings.`)
})

// ── .warn ──────────────────────────────────────────────────
bot({
    pattern:  'warn',
    desc:     'Warn a group member',
    type:     'group',
    group:    true,
    admin:    true,
    botAdmin: true
}, async (msg, match, args) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag a member to warn!*\nExample: .warn @user')

    const reason = args?.replace(/@\d+/g, '').trim() || 'No reason given'
    const count  = addWarn(msg.jid, target)
    const limit  = getLimit(msg.jid)
    const num    = target.split('@')[0].split(':')[0]

    if (count >= limit) {
        resetWarn(msg.jid, target)
        msg.client.groupParticipantsUpdate(msg.jid, [target], 'remove')
            .then(() => msg.reply(
                `🚫 *@${num} KICKED!*\n\n` +
                `📛 *Reason:* ${reason}\n` +
                `⚠️ *Warn limit reached:* ${limit}/${limit}`,
                {}, { mentions: [target] }
            ))
            .catch(() => msg.reply(
                `❌ *Could not kick @${num}* — Make me admin first!`,
                {}, { mentions: [target] }
            ))
    } else {
        await msg.reply(
            `⚠️ *Warning @${num}!*\n\n` +
            `📛 *Reason:* ${reason}\n` +
            `🔢 *Warns:* ${count}/${limit}\n` +
            `> ${limit - count} more before kick!`,
            {}, { mentions: [target] }
        )
    }
})

// ── .warns ─────────────────────────────────────────────────
bot({
    pattern:  'warns',
    desc:     'Check warn count of a member',
    type:     'group',
    group:    true,
    admin:    true
}, async (msg) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag a member!*')

    const count = getWarn(msg.jid, target)
    const limit = getLimit(msg.jid)
    const num   = target.split('@')[0].split(':')[0]

    await msg.reply(
        `📋 *Warn Report*\n\n` +
        `👤 *User:* @${num}\n` +
        `⚠️ *Warnings:* ${count}/${limit}\n` +
        `🚪 *Status:* ${count >= limit ? '🔴 Will be kicked' : '🟢 Safe'}`,
        {}, { mentions: [target] }
    )
})

// ── .resetwarn ────────────────────────────────────────────
bot({
    pattern:  'resetwarn',
    desc:     'Reset warns of a member',
    type:     'group',
    group:    true,
    admin:    true
}, async (msg) => {
    const m = msg.raw
    let target = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!target) target = m.message?.extendedTextMessage?.contextInfo?.participant
    if (!target) return msg.reply('❌ *Tag a member!*')

    resetWarn(msg.jid, target)
    const num = target.split('@')[0].split(':')[0]
    await msg.reply(`✅ *Warns reset for @${num}!*`, {}, { mentions: [target] })
})

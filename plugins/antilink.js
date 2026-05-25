import { bot } from '../lib/handler.js'
import { addWarn, getLimit, resetWarn } from './warn.js'

// groupJid → 'off' | 'on' | 'warn' | 'kick'
const groupMode  = new Map()
const processing = new Set()
const linkRegex  = /https?:\/\/|wa\.me\/|chat\.whatsapp\.com\/|bit\.ly|t\.me\/|youtu\.be\/|tinyurl|shorturl/i

function getMode(jid) { return groupMode.get(jid) || 'off' }

// ── Command ────────────────────────────────────────────────
bot({
    pattern:  'antilink',
    desc:     'Anti-link: on | warn | kick | off',
    type:     'group',
    group:    true,
    admin:    true
}, async (msg, match, args) => {
    const arg  = args?.toLowerCase().trim()
    const jid  = msg.jid
    const mode = getMode(jid)

    switch (arg) {
        case 'on':
            groupMode.set(jid, 'on')
            return msg.reply(`🛡️ *Anti-Link ON!*\n\n🗑️ Links will be deleted instantly.`)

        case 'warn':
            groupMode.set(jid, 'warn')
            return msg.reply(
                `⚠️ *Anti-Link WARN mode ON!*\n\n` +
                `🗑️ Links will be deleted\n` +
                `⚠️ Users will be warned\n` +
                `🚫 Kicked after *${getLimit(jid)}* warnings\n\n` +
                `> Change limit: \`.warnlimit <number>\``
            )

        case 'kick':
            groupMode.set(jid, 'kick')
            return msg.reply(`🚫 *Anti-Link KICK mode ON!*\n\n🗑️ Links deleted\n🚫 Sender kicked INSTANTLY`)

        case 'off':
            groupMode.set(jid, 'off')
            return msg.reply(`✅ *Anti-Link OFF.*`)

        default:
            return msg.reply(
                `🔗 *Anti-Link Settings*\n\n` +
                `📌 *Mode:* ${mode.toUpperCase()}\n` +
                `⚠️ *Warn Limit:* ${getLimit(jid)}\n\n` +
                `*Commands:*\n` +
                `◦ \`.antilink on\` — Delete only\n` +
                `◦ \`.antilink warn\` — Warn + kick on limit\n` +
                `◦ \`.antilink kick\` — Instant kick\n` +
                `◦ \`.antilink off\` — Disable\n` +
                `◦ \`.warnlimit 3\` — Set warn limit`
            )
    }
})

// ── Ultra-fast listener ────────────────────────────────────
bot({ on: 'group' }, async (msg) => {
    if (!msg.isGroup) return
    const mode = getMode(msg.jid)
    if (mode === 'off') return
    if (msg.isAdmin || msg.isOwner || msg.fromMe) return
    if (!linkRegex.test(msg.text || '')) return

    const msgId  = msg.raw.key.id
    if (processing.has(msgId)) return
    processing.add(msgId)

    const { jid, sender, senderNum: num, client } = msg
    const key = msg.raw.key

    // ⚡ FIRE DELETE — instant, no await
    client.sendMessage(jid, { delete: key })
        .catch(() => {})
        .finally(() => processing.delete(msgId))

    if (mode === 'on') return

    // ⚡ KICK — instant, no await, no setTimeout
    if (mode === 'kick') {
        client.groupParticipantsUpdate(jid, [sender], 'remove')
            .then(() => client.sendMessage(jid, {
                text: `🚫 *@${num} KICKED for sending a link!*`,
                mentions: [sender]
            }).catch(() => {}))
            .catch(() => client.sendMessage(jid, {
                text: `⚠️ *@${num}* sent a link! (Need admin to kick)`,
                mentions: [sender]
            }).catch(() => {}))
        return
    }

    // ⚡ WARN — synchronous count, instant fire
    if (mode === 'warn') {
        const count = addWarn(jid, sender)
        const limit = getLimit(jid)

        if (count >= limit) {
            resetWarn(jid, sender)
            // ⚡ Kick instantly
            client.groupParticipantsUpdate(jid, [sender], 'remove')
                .then(() => client.sendMessage(jid, {
                    text: `🚫 *@${num} KICKED!* Sent links ${limit} time(s) — Auto removed!`,
                    mentions: [sender]
                }).catch(() => {}))
                .catch(() => client.sendMessage(jid, {
                    text: `⚠️ *@${num}* reached warn limit (${limit}) — Make me admin!`,
                    mentions: [sender]
                }).catch(() => {}))
        } else {
            client.sendMessage(jid, {
                text:
                    `⚠️ *Warning @${num}!*\n\n` +
                    `🔗 Links not allowed here!\n` +
                    `🔢 *Warn:* ${count}/${limit}\n` +
                    `> ${limit - count} more before kick!`,
                mentions: [sender]
            }).catch(() => {})
        }
    }
})

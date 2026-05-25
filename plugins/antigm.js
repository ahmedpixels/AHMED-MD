import { bot } from '../lib/handler.js'
import db from '../lib/database.js'
import { addWarn, getLimit, resetWarn } from './warn.js'

// Initialize db structure
db.data.antigm = db.data.antigm || {}

const processing = new Set()

function getMode(jid) {
    return db.data.antigm[jid] || 'off'
}

bot({
    pattern: 'antigm',
    desc: 'Anti-GM (Group/Status Mention): on | warn | kick | off',
    type: 'group',
    group: true,
    admin: true
}, async (msg, match, args) => {
    const arg = args?.toLowerCase().trim()
    const jid = msg.jid
    const mode = getMode(jid)

    switch (arg) {
        case 'on':
            db.data.antigm[jid] = 'on'
            db.save()
            return msg.reply(`🛡️ *Anti-Group/Status Mention (Anti-GM) ON!*\n\n🗑️ Messages mentioning status/group JID will be deleted instantly.`)

        case 'warn':
            db.data.antigm[jid] = 'warn'
            db.save()
            return msg.reply(
                `⚠️ *Anti-GM WARN mode ON!*\n\n` +
                `🗑️ Messages will be deleted\n` +
                `⚠️ Users will be warned\n` +
                `🚫 Kicked after *${getLimit(jid)}* warnings\n\n` +
                `> Change limit: \`.warnlimit <number>\``
            )

        case 'kick':
            db.data.antigm[jid] = 'kick'
            db.save()
            return msg.reply(`🚫 *Anti-GM KICK mode ON!*\n\n🗑️ Messages deleted\n🚫 Sender kicked INSTANTLY`)

        case 'off':
            db.data.antigm[jid] = 'off'
            db.save()
            return msg.reply(`✅ *Anti-GM OFF.*`)

        default:
            return msg.reply(
                `🛡️ *Anti-GM (Group/Status Mention) Settings*\n\n` +
                `📌 *Mode:* ${mode.toUpperCase()}\n` +
                `⚠️ *Warn Limit:* ${getLimit(jid)}\n\n` +
                `*Commands:*\n` +
                `◦ \`.antigm on\` — Delete only\n` +
                `◦ \`.antigm warn\` — Warn + kick on limit\n` +
                `◦ \`.antigm kick\` — Instant kick\n` +
                `◦ \`.antigm off\` — Disable\n` +
                `◦ \`.warnlimit 3\` — Set warn limit`
            )
    }
})

// Listener to catch mentions of status/group
bot({ on: 'group' }, async (msg) => {
    if (!msg.isGroup) return
    const mode = getMode(msg.jid)
    if (mode === 'off') return
    if (msg.isAdmin || msg.isOwner || msg.fromMe) return

    const raw = msg.raw
    const msgKeys = Object.keys(raw.message || {})

    // ✅ PRIMARY: groupStatusMentionMessage = direct status share in group (exact WhatsApp type)
    const isGroupStatusMention = msgKeys.includes('groupStatusMentionMessage')

    // ✅ SECONDARY: Check contextInfo mentions for status@broadcast JID
    let hasMentionCheck = false
    for (const key of msgKeys) {
        const ctx = raw.message[key]?.contextInfo
        if (ctx?.mentionedJid?.some(m => m.includes('status@broadcast') || m === msg.jid)) {
            hasMentionCheck = true
            break
        }
    }

    // ✅ TERTIARY: Plain text @status mention
    const hasTextMention = /@status\b/i.test(msg.text || '')

    const hasStatusMention = isGroupStatusMention || hasMentionCheck || hasTextMention

    if (!hasStatusMention) return

    const msgId = msg.raw.key.id
    if (processing.has(msgId)) return
    processing.add(msgId)

    const { jid, sender, senderNum: num, client } = msg
    const key = msg.raw.key

    // Delete message
    client.sendMessage(jid, { delete: key })
        .catch(() => {})
        .finally(() => processing.delete(msgId))

    if (mode === 'on') return

    // Kick instantly
    if (mode === 'kick') {
        client.groupParticipantsUpdate(jid, [sender], 'remove')
            .then(() => client.sendMessage(jid, {
                text: `🚫 *@${num} KICKED for mentioning status/group!*`,
                mentions: [sender]
            }).catch(() => {}))
            .catch(() => client.sendMessage(jid, {
                text: `⚠️ *@${num}* mentioned status/group! (Need admin to kick)`,
                mentions: [sender]
            }).catch(() => {}))
        return
    }

    // Warn mode
    if (mode === 'warn') {
        const count = addWarn(jid, sender)
        const limit = getLimit(jid)

        if (count >= limit) {
            resetWarn(jid, sender)
            client.groupParticipantsUpdate(jid, [sender], 'remove')
                .then(() => client.sendMessage(jid, {
                    text: `🚫 *@${num} KICKED!* Reached warn limit for status/group mentions (${limit}) — Auto removed!`,
                    mentions: [sender]
                }).catch(() => {}))
                .catch(() => client.sendMessage(jid, {
                    text: `⚠️ *@${num}* reached warn limit (${limit}) for mentioning status/group — Make me admin!`,
                    mentions: [sender]
                }).catch(() => {}))
        } else {
            client.sendMessage(jid, {
                text:
                    `⚠️ *Warning @${num}!*\n\n` +
                    `🚫 Group/Status Mentions are not allowed here!\n` +
                    `🔢 *Warn:* ${count}/${limit}\n` +
                    `> ${limit - count} more before kick!`,
                mentions: [sender]
            }).catch(() => {})
        }
    }
})

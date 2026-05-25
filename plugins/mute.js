import { bot } from '../lib/handler.js'

// ── .mute ─────────────────────────────────────────────────
bot({ pattern: 'mute', desc: 'Mute group (only admins can send)', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    try {
        await msg.client.groupSettingUpdate(msg.jid, 'announcement')
        await msg.reply('🔇 *Group muted!* Only admins can send messages.')
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── .unmute ───────────────────────────────────────────────
bot({ pattern: 'unmute', desc: 'Unmute group (everyone can send)', type: 'group', group: true, admin: true, botAdmin: true }, async (msg) => {
    try {
        await msg.client.groupSettingUpdate(msg.jid, 'not_announcement')
        await msg.reply('🔊 *Group unmuted!* Everyone can send messages.')
    } catch (e) { await msg.reply(`❌ *Failed:* ${e.message}`) }
})

// ── Helper: check if bot is admin ─────────────────────────
async function isBotAdmin(msg) {
    const meta   = await msg.groupMeta()
    const botRaw = msg.client.user?.id || ''
    // Normalize: strip device suffix e.g. "923...:10@s.whatsapp.net" → "923...@s.whatsapp.net"
    const botJid = botRaw.replace(/:.*@/, '@')
    const botPart = meta?.participants?.find(p => {
        const pJid = p.id.replace(/:.*@/, '@')
        return pJid === botJid
    })
    return !!botPart?.admin
}

// ── .invite / .joinlink — Get group invite link ───────────
async function getInviteLink(msg) {
    try {
        const code = await msg.client.groupInviteCode(msg.jid)
        const link  = `https://chat.whatsapp.com/${code}`
        const meta  = await msg.groupMeta()
        const name  = meta?.subject || 'WhatsApp Group'
        const count = meta?.participants?.length || 0

        // Try to get group profile picture
        let jpegThumb
        try {
            const ppUrl = await msg.client.profilePictureUrl(msg.jid, 'image')
            const axios = (await import('axios')).default
            const res   = await axios.get(ppUrl, { responseType: 'arraybuffer', timeout: 8000 })
            jpegThumb   = Buffer.from(res.data)
        } catch { /* no thumbnail, it's fine */ }

        await msg.client.sendMessage(msg.jid, {
            text: link,
            linkPreview: {
                title:        `${name}`,
                description:  `👥 ${count} members\n🔗 Click to join`,
                canonicalUrl: link,
                matchedText:  link,
                ...(jpegThumb ? { jpegThumbnail: jpegThumb } : {})
            }
        })
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}\n> Make sure bot is admin!`)
    }
}

bot({ pattern: 'invite',   desc: 'Get group invite link with preview', type: 'group', group: true, admin: true }, getInviteLink)
bot({ pattern: 'joinlink', desc: 'Get group invite link with preview', type: 'group', group: true, admin: true }, getInviteLink)

// ── .revoke — Revoke & generate new invite link ───────────
bot({ pattern: 'revoke', desc: 'Reset group invite link', type: 'group', group: true, admin: true }, async (msg) => {
    try {
        await msg.client.groupRevokeInvite(msg.jid)
        await new Promise(r => setTimeout(r, 1000))
        const newCode = await msg.client.groupInviteCode(msg.jid)
        await msg.reply(
            `✅ *Old link revoked!*\n\n` +
            `🔗 *New link:*\nhttps://chat.whatsapp.com/${newCode}\n\n` +
            `> Old invite link no longer works.`
        )
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}\n> Make sure bot is admin!`)
    }
})


// ── .hidetag ──────────────────────────────────────────────
bot({ pattern: 'hidetag', desc: 'Tag all members silently', type: 'group', group: true, admin: true }, async (msg, match, args) => {
    const meta = await msg.groupMeta()
    if (!meta) return msg.reply('❌ Could not fetch group info.')
    await msg.client.sendMessage(msg.jid, {
        text: args || '👀',
        mentions: meta.participants.map(p => p.id)
    })
})

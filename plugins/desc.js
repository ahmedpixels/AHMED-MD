import db from '../lib/database.js'

const QUOTES = [
    '🌸 One Day, Everything Will Make Sense',
    '✨ Peace Looks Good On You',
    '🌙 Soft Heart • Strong Mind',
    '🤍 Happiness Starts From Within',
    '🦋 Just Vibing Through Life',
    '🌧 Sometimes Silence Says Enough',
    '✨ Creating My Own Peace',
    '🌍 Lost In Dreams & Reality',
    '💫 Energy Never Lies',
    '🌺 Smiles Hide Many Stories',
    '🌙 Healing Quietly',
    '🤍 Stay Real, Stay Kind',
    '✨ Different Vibes, Different Energy',
    '🦋 Living Moments, Not Days',
    '🌧 Soul Full Of Untold Stories',
    '🌙 Calm Mind • Happy Life',
    '✨ Be Your Own Comfort Place',
    '🤍 Simple Soul, Pure Intentions',
    '💫 Some Feelings Need No Words',
    '🌸 Quiet People Feel The Most'
]

export function getDailyQuote() {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
    return QUOTES[dayOfYear % QUOTES.length]
}

export async function descBioHandler(client) {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', hour12: true })
    const dateStr = now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: 'numeric' })

    const uptimeSec = Math.floor(process.uptime())
    const hours = Math.floor(uptimeSec / 3600)
    const minutes = Math.floor((uptimeSec % 3600) / 60)
    const uptimeStr = `${hours}h ${minutes}m`

    const { commands } = await import('./handler.js')
    const cmdCount = commands ? commands.length : 81

    let bioText = `AHMED-MD 🤖 | 🕐 ${timeStr} | 📅 ${dateStr} | ⚙️ ${cmdCount} Cmds | ⏳ Up: ${uptimeStr}`

    if (db.data.settings.descBio) {
        bioText += `\n${getDailyQuote()}`
    }

    await client.updateProfileStatus(bioText)
}

bot({ pattern: 'desc ?(.*)', desc: 'Toggle daily quote in bio', type: 'general' }, async (msg, match, args) => {
    if (!args) {
        const status = db.data.settings.descBio ? 'ON ✅' : 'OFF ❌'
        return msg.reply(`📝 *Bio Quote is:* ${status}\n\nUse:\n\`.desc on\` — Enable daily quote\n\`.desc off\` — Disable daily quote`)
    }

    const opt = args.toLowerCase()
    if (opt === 'on' || opt === 'yes' || opt === 'true') {
        db.data.settings.descBio = true
        db.save()
        await msg.reply('✅ *Bio Quote Enabled* — Daily quote will show in bot bio.')
        try { await descBioHandler(msg.client) } catch {}
    } else if (opt === 'off' || opt === 'no' || opt === 'false') {
        db.data.settings.descBio = false
        db.save()
        await msg.reply('✅ *Bio Quote Disabled* — Quote removed from bot bio.')
        try { await descBioHandler(msg.client) } catch {}
    } else {
        await msg.reply('❌ Usage: `.desc on` or `.desc off`')
    }
})

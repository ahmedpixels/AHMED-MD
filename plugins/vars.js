import { bot } from '../lib/handler.js'
import { setVar, getVar, delVar, getAllVars } from '../lib/handler.js'

// ── .setvar (Set or Edit Configuration Variable) ───────────────────────────
bot(
    { pattern: 'setvar ?(.*)', desc: 'Set or update a config variable', type: 'owner', owner: true },
    async (msg, match) => {
        const input = (match[1] || '').trim()
        if (!input || !input.includes('=')) {
            return msg.reply(
                `⚙️ *AHMED-MD SETVAR*\n\n` +
                `📌 *Format:* \`.setvar KEY=VALUE\`\n` +
                `📌 *Example:* \`.setvar PREFIX=!\`\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        }

        const eqIdx = input.indexOf('=')
        const key   = input.slice(0, eqIdx).trim()
        const val   = input.slice(eqIdx + 1).trim()

        if (!key) return msg.reply('❌ *Valid key dena bhai!*')

        try {
            const result = setVar(key, val)
            await msg.reply(
                `⚙️ *AHMED-MD VARIABLE UPDATED*\n\n` +
                `🔹 *Key:* \`${result.key}\`\n` +
                `🔹 *Value:* \`${result.value}\`\n\n` +
                `✅ *Database mein save ho gaya aur hot-reload bhi ho gaya!*\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        } catch (e) {
            await msg.reply(`❌ *Error:* ${e.message}`)
        }
    }
)

// ── .delvar (Delete Configuration Variable) ────────────────────────────────
bot(
    { pattern: 'delvar ?(.*)', desc: 'Delete a config variable', type: 'owner', owner: true },
    async (msg, match) => {
        const key = (match[1] || '').trim()
        if (!key) {
            return msg.reply(
                `⚙️ *AHMED-MD DELVAR*\n\n` +
                `📌 *Format:* \`.delvar KEY\`\n` +
                `📌 *Example:* \`.delvar AUTO_READ\`\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        }

        try {
            const deleted = delVar(key)
            await msg.reply(
                `⚙️ *AHMED-MD VARIABLE DELETED*\n\n` +
                `❌ *Key:* \`${deleted}\`\n\n` +
                `✅ *Database se hata diya gaya aur hot-reload bhi ho gaya!*\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        } catch (e) {
            await msg.reply(`❌ *Error:* ${e.message}`)
        }
    }
)

// ── .getvar (Get a single Variable value) ──────────────────────────────────
bot(
    { pattern: 'getvar ?(.*)', desc: 'Get a specific config variable', type: 'owner', owner: true },
    async (msg, match) => {
        const key = (match[1] || '').trim()
        if (!key) {
            return msg.reply(
                `⚙️ *AHMED-MD GETVAR*\n\n` +
                `📌 *Format:* \`.getvar KEY\`\n` +
                `📌 *Example:* \`.getvar PREFIX\`\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        }

        try {
            const upperKey = key.trim().toUpperCase()
            const val = getVar(upperKey)

            if (val === null || val === undefined) {
                return msg.reply(`❌ *Variable \`${upperKey}\` nahi mila!*`)
            }

            // Mask sensitive values
            let displayVal = val
            if (upperKey === 'SESSION_ID' && val.length > 15) {
                displayVal = `${val.slice(0, 12)}***${val.slice(-4)}`
            }

            await msg.reply(
                `⚙️ *AHMED-MD GETVAR*\n\n` +
                `🔹 *Key:* \`${upperKey}\`\n` +
                `🔹 *Value:* \`${displayVal}\`\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        } catch (e) {
            await msg.reply(`❌ *Error:* ${e.message}`)
        }
    }
)

// ── .allvar (List all Variables) ───────────────────────────────────────────
bot(
    { pattern: 'allvar', desc: 'List all config variables', type: 'owner', owner: true },
    async (msg) => {
        try {
            const vars = getAllVars()
            const entries = Object.entries(vars)

            if (entries.length === 0) {
                return msg.reply(
                    `⚙️ *AHMED-MD VARIABLES*\n\n` +
                    `📭 *Koi custom variable set nahi hai abhi tak!*\n\n` +
                    `📌 Set karne ke liye: \`.setvar KEY=VALUE\`\n\n` +
                    `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
                )
            }

            let varsMsg = `⚙️ *AHMED-MD CONFIGURATION VARIABLES*\n\n`
            entries.forEach(([k, v]) => {
                let displayVal = v
                if (k === 'SESSION_ID' && v.length > 15) {
                    displayVal = `${v.slice(0, 12)}***${v.slice(-4)}`
                }
                varsMsg += `▫️ *${k}:* \`${displayVal}\`\n`
            })
            varsMsg += `\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

            await msg.reply(varsMsg)
        } catch (e) {
            await msg.reply(`❌ *Error:* ${e.message}`)
        }
    }
)

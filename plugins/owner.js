import { bot } from '../lib/handler.js'
import config from '../config.js'
import { existsSync, readFileSync, writeFileSync } from 'fs'

// ── Helper: get target from reply OR mention OR number ─────
function getTarget(msg, args) {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo

    // 1. From quoted/replied message
    if (ctx?.participant) return ctx.participant
    if (ctx?.quotedMessage && ctx?.remoteJid) return ctx.remoteJid

    // 2. From mention
    const mentioned = ctx?.mentionedJid?.[0]
    if (mentioned) return mentioned

    // 3. From number in args
    if (args) {
        const num = args.replace(/[^0-9]/g, '')
        if (num.length > 6) return `${num}@s.whatsapp.net`
    }

    return null
}

// ── .join ─────────────────────────────────────────────────
bot({ pattern: 'join ?(.*)', desc: 'Join a group via link', type: 'owner', owner: true }, async (msg, match, args) => {
    let text = args || ''
    const m = msg.raw
    
    const quotedText = m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation || 
                       m.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text
    
    if (!text && quotedText) {
        text = quotedText
    }

    const inviteLink = text.match(/chat\.whatsapp\.com\/([a-zA-Z0-9]{20,24})/i)
    if (!inviteLink) {
        return msg.reply('❌ *Provide a valid WhatsApp group link!*\nExample: `.join https://chat.whatsapp.com/xxx` (or reply to a link)')
    }

    try {
        const inviteCode = inviteLink[1]
        
        let requiresApproval = false
        try {
            const inviteInfo = await msg.client.groupGetInviteInfo(inviteCode)
            if (inviteInfo?.joinApprovalMode === 'on' || inviteInfo?.joinApprovalMode === true) {
                requiresApproval = true
            }
        } catch (e) { } // Ignore if we can't fetch info

        await msg.client.groupAcceptInvite(inviteCode)
        
        if (requiresApproval) {
            await msg.reply(`✅ *Join request sent!* (Group requires admin approval)`)
        } else {
            await msg.reply(`✅ *Successfully joined the group!*`)
        }
    } catch (e) {
        const errStr = String(e)
        if (errStr.includes('409') || errStr.includes('401')) {
            await msg.reply(`✅ *Join request sent!* (Group requires admin approval)`)
        } else {
            await msg.reply(`❌ *Failed to join group:* ${e.message || errStr}`)
        }
    }
})

// ── .broadcast ────────────────────────────────────────────
bot({ pattern: 'broadcast', desc: 'Send message to all groups', type: 'owner', owner: true }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Provide a message!*\nExample: .broadcast Hello everyone!')

    await msg.reply('📡 *Broadcasting...*')
    try {
        const groups = await msg.client.groupFetchAllParticipating()
        const jids   = Object.keys(groups)
        let sent = 0, failed = 0

        for (const jid of jids) {
            try {
                await msg.client.sendMessage(jid, { text: `📢 *Broadcast:*\n\n${args}` })
                sent++
                await new Promise(r => setTimeout(r, 1500))
            } catch { failed++ }
        }
        await msg.reply(`✅ *Broadcast done!*\n📤 Sent: ${sent} | ❌ Failed: ${failed}`)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .block ────────────────────────────────────────────────
bot({ pattern: 'block', desc: 'Block user (reply or tag)', type: 'owner', owner: true }, async (msg, match, args) => {
    const target = getTarget(msg, args)
    if (!target) return msg.reply(
        '❌ *How to block:*\n\n' +
        '◦ Reply to someone\'s message and type `.block`\n' +
        '◦ OR: `.block @user`\n' +
        '◦ OR: `.block 923001234567`'
    )

    try {
        await msg.client.updateBlockStatus(target, 'block')
        const num = target.split('@')[0].split(':')[0]
        await msg.reply(`🚫 *+${num} has been blocked!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .unblock ──────────────────────────────────────────────
bot({ pattern: 'unblock', desc: 'Unblock user (reply or tag)', type: 'owner', owner: true }, async (msg, match, args) => {
    const target = getTarget(msg, args)
    if (!target) return msg.reply(
        '❌ *How to unblock:*\n\n' +
        '◦ Reply to someone\'s message and type `.unblock`\n' +
        '◦ OR: `.unblock @user`\n' +
        '◦ OR: `.unblock 923001234567`'
    )

    try {
        await msg.client.updateBlockStatus(target, 'unblock')
        const num = target.split('@')[0].split(':')[0]
        await msg.reply(`✅ *+${num} has been unblocked!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

// ── .owner ────────────────────────────────────────────────
bot({ pattern: 'owner', desc: 'Show owner info', type: 'general' }, async (msg) => {
    await msg.reply(
        `👑 *AHMED-MD Owner*\n\n` +
        `📱 *Number:* ${config.OWNER_NUMBER}\n` +
        `💬 *Chat:* wa.me/${config.OWNER_NUMBER}\n\n` +
        `> _Contact owner for support_`
    )
})

// ── .restart / .update ─────────────────────────────────────
import { spawn, exec } from 'child_process'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

bot({ pattern: 'restart', desc: 'Restart the bot', type: 'owner', owner: true }, async (msg) => {
    await msg.reply('🔄 *Restarting Bot...*\n> Please wait a few seconds. The bot will come back online shortly.')
    
    setTimeout(() => {
        const child = spawn(process.argv[0], process.argv.slice(1), {
            detached: true,
            stdio: 'ignore'
        })
        child.unref()
        process.exit(0)
    }, 1500)
})

bot({ pattern: 'update', desc: 'Pull latest code and update the bot', type: 'owner', owner: true }, async (msg) => {
    await msg.reply('⏳ *Checking for updates and pulling code...*')
    
    exec('git pull', async (err, stdout, stderr) => {
        if (err) {
            return msg.reply(`❌ *Update failed:* ${err.message}`)
        }
        
        if (stdout.includes('Already up to date.') || stdout.includes('Already up-to-date.')) {
            await msg.reply('ℹ️ *Bot is already up to date. Running npm install to ensure all package dependencies are verified...*')
            exec('npm install', async (npmErr, npmStdout, npmStderr) => {
                if (npmErr) {
                    return msg.reply(`❌ *Dependency verification failed:* ${npmErr.message}`)
                }
                await msg.reply('✅ *All dependencies verified & installed! Restarting bot...*')
                setTimeout(() => {
                    const child = spawn(process.argv[0], process.argv.slice(1), {
                        detached: true,
                        stdio: 'ignore'
                    })
                    child.unref()
                    process.exit(0)
                }, 2000)
            })
            return
        }
        
        await msg.reply(`📥 *Updates Pulled Successfully!*\n\n\`\`\`\n${stdout.trim()}\n\`\`\`\n\n⏳ *Installing new dependencies (npm install)...*`)
        
        exec('npm install', async (npmErr, npmStdout, npmStderr) => {
            if (npmErr) {
                await msg.reply(`⚠️ *npm install warning:* ${npmErr.message}\nContinuing to restart...`)
            }
            await msg.reply(`🔄 *Restarting bot to apply updates...*`)
            
            setTimeout(() => {
                const child = spawn(process.argv[0], process.argv.slice(1), {
                    detached: true,
                    stdio: 'ignore'
                })
                child.unref()
                process.exit(0)
            }, 3000)
        })
    })
})

// ── .prefix ────────────────────────────────────────────────
bot({ pattern: 'prefix ?(.*)', desc: 'Change bot prefix', type: 'owner', owner: true }, async (msg, match, args) => {
    let newPrefix = args?.trim()
    if (!newPrefix) return msg.reply(`❌ *Usage:* \`.prefix [character]\` (e.g. \`.prefix .\` or \`.prefix null\` to set no prefix)`)

    if (newPrefix.toLowerCase() === 'null') {
        newPrefix = ''
    }

    try {
        // Update in-memory config
        config.PREFIX = newPrefix

        // Update persistent config.env file
        const envPath = './config.env'
        if (existsSync(envPath)) {
            let envContent = readFileSync(envPath, 'utf8')
            if (envContent.includes('PREFIX=')) {
                envContent = envContent.replace(/PREFIX=.*/g, `PREFIX=${newPrefix}`)
            } else {
                envContent += `\nPREFIX=${newPrefix}`
            }
            writeFileSync(envPath, envContent, 'utf8')
        }

        const displayPrefix = newPrefix === '' ? 'NO PREFIX' : `"${newPrefix}"`
        await msg.reply(`✅ *Prefix successfully changed to ${displayPrefix}!*`)
    } catch (e) {
        await msg.reply(`❌ *Failed to change prefix:* ${e.message}`)
    }
})

// ── .setpp — Change bot profile picture ───────────────────
bot({ pattern: 'setpp', desc: 'Change bot profile picture (reply to image)', type: 'owner', owner: true }, async (msg) => {
    const m   = msg.raw
    const ctx = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    // Also support direct image message
    const directImg = m.message?.imageMessage
    const quotedImg = quoted?.imageMessage

    if (!quotedImg && !directImg) return msg.reply(
        `❌ *How to use:*\n\n` +
        `◦ Reply to any image with \`.setpp\`\n` +
        `◦ OR send an image with caption \`.setpp\`\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )

    await msg.reply('⏳ *Changing bot profile picture...*')

    try {
        let buf
        if (quotedImg) {
            const fakeMsg = {
                key: { remoteJid: msg.jid, id: ctx.stanzaId, participant: ctx.participant },
                message: { imageMessage: quotedImg }
            }
            buf = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
                logger: { info: () => {}, error: () => {}, warn: () => {} },
                reuploadRequest: msg.client.updateMediaMessage
            })
        } else {
            buf = await downloadMediaMessage(m, 'buffer', {}, {
                logger: { info: () => {}, error: () => {}, warn: () => {} },
                reuploadRequest: msg.client.updateMediaMessage
            })
        }

        if (!buf || !buf.length) return msg.reply('❌ *Failed to download image!*')

        const botJid = msg.client.user.id
        await msg.client.updateProfilePicture(botJid, buf)
        await msg.reply('✅ *Bot profile picture updated successfully!*\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !')
    } catch (e) {
        console.error('[SETPP ERR]', e.message)
        await msg.reply(`❌ *Failed to update profile picture:* ${e.message?.slice(0, 200)}`)
    }
})

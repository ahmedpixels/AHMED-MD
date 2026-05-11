const config = require('../config')
const { commands } = require('./pluginHandler')

module.exports = async (sock, m) => {
    // Extract message content
    const msgType = Object.keys(m.message)[0]
    let text = ''
    
    if (msgType === 'conversation') text = m.message.conversation
    else if (msgType === 'extendedTextMessage') text = m.message.extendedTextMessage.text
    else if (msgType === 'imageMessage') text = m.message.imageMessage.caption

    if (!text) return

    // Robust prefix check (Supports single character like '.' or regex string like '^[.,!]')
    let isCmd = false;
    let usedPrefix = '';
    
    if (config.PREFIX && config.PREFIX.toLowerCase() !== 'null' && config.PREFIX.length > 0) {
        if (config.PREFIX.startsWith('^')) {
            const match = text.match(new RegExp(config.PREFIX));
            if (match) {
                isCmd = true;
                usedPrefix = match[0];
            }
        } else {
            if (text.startsWith(config.PREFIX)) {
                isCmd = true;
                usedPrefix = config.PREFIX;
            }
        }
    } else {
        // If prefix is null or empty, it means "no prefix"
        isCmd = true;
        usedPrefix = '';
    }

    if (!isCmd) return

    const commandStr = text.slice(usedPrefix.length).trim().split(' ')[0].toLowerCase()
    const args = text.slice(usedPrefix.length + commandStr.length).trim()

    // Extract mentions and quoted info
    let mentions = []
    let quoted = null

    if (msgType === 'extendedTextMessage' && m.message.extendedTextMessage.contextInfo) {
        mentions = m.message.extendedTextMessage.contextInfo.mentionedJid || []
        
        if (m.message.extendedTextMessage.contextInfo.quotedMessage) {
            quoted = {
                sender: m.message.extendedTextMessage.contextInfo.participant,
                message: m.message.extendedTextMessage.contextInfo.quotedMessage
            }
        }
    }

    // Enhanced message object to pass to plugins
    const message = {
        msg: m,
        key: m.key,
        sender: m.key.participant || m.key.remoteJid, // participant is the actual sender in groups
        chat: m.key.remoteJid, // remoteJid is the group/chat id
        isGroup: m.key.remoteJid.endsWith('@g.us'),
        text: text,
        args: args,
        mentions: mentions,
        quoted: quoted,
        reply: async (replyText) => {
            await sock.sendMessage(m.key.remoteJid, { text: replyText }, { quoted: m })
        }
    }

    // Execute matching command
    for (const cmd of commands) {
        if (cmd.pattern === commandStr) {
            try {
                await cmd.function(sock, message)
            } catch (err) {
                console.error(`Error executing ${commandStr}:`, err)
            }
        }
    }
}

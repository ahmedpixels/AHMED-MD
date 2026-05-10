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

    const isCmd = text.startsWith(config.PREFIX)
    if (!isCmd) return

    const commandStr = text.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase()
    const args = text.slice(config.PREFIX.length + commandStr.length).trim()

    // Enhanced message object to pass to plugins
    const message = {
        key: m.key,
        sender: m.key.remoteJid,
        isGroup: m.key.remoteJid.endsWith('@g.us'),
        text: text,
        args: args,
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

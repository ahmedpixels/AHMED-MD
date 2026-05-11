const { addCommand } = require('../lib/pluginHandler')

addCommand({
    pattern: 'ping',
    desc: 'Test bot ping',
    function: async (sock, message) => {
        const start = Date.now()
        
        // Send initial Ping! message
        const sentMsg = await sock.sendMessage(message.sender, { text: 'Ping! ⚡' }, { quoted: message.msg })
        
        const end = Date.now()
        const latency = end - start
        
        // Stylish Pong message
        const pongText = `🏓 *Pong!*\n⏱ *Response time:* \`${latency} ms\``
        
        // Edit the first message if possible, otherwise send a new one
        if (sentMsg && sentMsg.key) {
            await sock.sendMessage(message.sender, { 
                text: pongText, 
                edit: sentMsg.key 
            })
        } else {
            await message.reply(pongText)
        }
    }
})

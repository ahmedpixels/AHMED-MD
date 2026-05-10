const { addCommand } = require('../lib/pluginHandler')

addCommand({
    pattern: 'ping',
    desc: 'Test bot ping',
    function: async (sock, message) => {
        const start = Date.now()
        await message.reply('⚡ Pinging...')
        const end = Date.now()
        await message.reply(`🏓 Pong!\nLatency: ${end - start}ms\nPowered by AHMED-MD`)
    }
})

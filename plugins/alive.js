const { addCommand } = require('../lib/pluginHandler')

addCommand({
    pattern: 'alive',
    desc: 'Check if bot is online',
    function: async (sock, message) => {
        await message.reply('🚀 *AHMED-MD IS ALIVE & KICKING!* 🚀\n\nThis is pure AHMED-MD Engine!')
    }
})

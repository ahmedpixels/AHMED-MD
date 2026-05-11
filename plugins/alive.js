const { addCommand } = require('../lib/pluginHandler')

function formatUptime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let str = '';
    if (h > 0) str += `${h} hours `;
    if (m > 0) str += `${m} minutes `;
    str += `${s} seconds`;
    return str.trim();
}

addCommand({
    pattern: 'alive',
    desc: 'Check if bot is online',
    function: async (sock, message) => {
        const uptime = formatUptime(process.uptime())
        const text = `I'm here and ready! 🚀\nUptime : ${uptime}`
        await message.reply(text)
    }
})

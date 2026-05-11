const { addCommand, commands } = require('../lib/pluginHandler')
const config = require('../config')
const os = require('os')
const { version } = require('../package.json')

function formatUptime(seconds) {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    let str = '';
    if (d > 0) str += `${d}d `;
    if (h > 0) str += `${h}h `;
    if (m > 0) str += `${m}m `;
    str += `${s}s`;
    return str.trim();
}

function getRAM() {
    const free = os.freemem();
    const total = os.totalmem();
    const used = total - free;
    return `${(used / 1024 / 1024 / 1024).toFixed(2)} GB / ${(total / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

addCommand({
    pattern: 'menu',
    desc: 'Show bot menu',
    function: async (sock, message) => {
        // Get Time and Date
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-PK', { timeZone: 'Asia/Karachi', day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-PK', { timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const uptime = formatUptime(process.uptime());
        const platform = os.platform();
        const ram = getRAM();

        const p = config.PREFIX === 'null' ? '' : config.PREFIX;
        let menuText = `╭━━━〔 *${config.BOT_NAME}* 〕━━━┈ 
┃ 👤 *Owner:* ${config.OWNER_NAME}
┃ 🔖 *Prefix:* [ ${config.PREFIX === 'null' ? 'None' : config.PREFIX} ]
┃ ⏱️ *Time:* ${timeStr}
┃ 📅 *Date:* ${dateStr}
┃ 🟢 *Uptime:* ${uptime}
┃ 📊 *RAM:* ${ram}
┃ ⚙️ *Version:* ${version}
┃ 💻 *Platform:* ${platform}
╰━━━━━━━━━━━━━━━┈\n\n`;

        menuText += `╭━━━〔 *COMMANDS* 〕━━━┈\n`;
        commands.forEach((cmd, index) => {
            if (cmd.pattern) {
                menuText += `┃ ${index + 1}. ${p}${cmd.pattern}\n`;
            }
        });
        menuText += `╰━━━━━━━━━━━━━━━┈\n\n`;
        menuText += `> _Powered by ahmedpixels.com_`;

        await message.reply(menuText);
    }
})

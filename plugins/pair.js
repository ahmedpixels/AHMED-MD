import { bot } from '../lib/handler.js';

const CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb8EK6l3gvWfrZpfOm23/112';
const WEBSITE_URL = 'https://ahmedxmd.com/';

bot({
    pattern: 'repo',
    desc: 'Get repository and pairing links',
    type: 'general'
}, async (msg) => {
    const message = `╭══════════════════════╮\n║   *AHMED-MD REPO*    ║\n╰══════════════════════╯\n\n` +
        `📢 *Join Our Channel:*\n${CHANNEL_URL}\n\n` +
        `🌐 *Pair Your WhatsApp:*\n${WEBSITE_URL}\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`;
    await msg.reply(message);
})
import { bot } from '../lib/handler.js';

const CHANNEL_JID = '120363429242988054@newsletter';
const CHANNEL_NAME = 'AHMED-MD';
const WEBSITE_URL = 'https://ahmedxmd.com/';

bot({
    pattern: 'repo',
    desc: 'Get repository and pairing links',
    type: 'general'
}, async (msg) => {
    await msg.client.sendMessage(msg.jid, {
        text: `📢 *Join Our Channel*\nStay updated with latest news and updates.\n\n🌐 *Pair Your WhatsApp:*\n${WEBSITE_URL}\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`,
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: CHANNEL_JID,
                newsletterName: CHANNEL_NAME,
                serverId: 1
            }
        }
    }, { quoted: msg.raw })
})
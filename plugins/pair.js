import { bot } from '../lib/handler.js';
import axios from 'axios';
import config from '../config.js';

const PAIR_URL = config.PAIR_URL;

bot({ 
  pattern: 'pair', 
  desc: 'Request a secure pairing code to link and host your WhatsApp bot', 
  type: 'general' 
}, async (msg) => {
    const args = msg.text.split(' ').slice(1).join(' ').trim();
    if (!args) {
        return await msg.reply('❌ *Please provide a WhatsApp number.*\n\n*Usage:* `.pair 923xxxxxxxxx`');
    }

    const cleanNumber = args.replace(/[^0-9]/g, '');
    if (cleanNumber.length < 10) {
        return await msg.reply('❌ *Invalid phone number.* Make sure it includes the country code without spaces or + sign.');
    }

    await msg.reply('⏳ *Requesting pairing code from the secure cluster...*');

    try {
        const response = await axios.post(`${PAIR_URL}/api/pair/request`, {
            phoneNumber: cleanNumber,
            isHosted: true
        });

        if (response.data && response.data.pairingCode) {
            const code = response.data.pairingCode;
            const formattedCode = code.includes('-') ? code : `${code.substring(0, 4)}-${code.substring(4)}`;
            
            await msg.reply(
                `🔗 *AHMED-MD SECURE PAIRING CODE*\n\n` +
                `🔑 Code: \`${formattedCode}\`\n\n` +
                `*Instructions:*\n` +
                `1. You will receive a WhatsApp notification to link a device.\n` +
                `2. Tap it and enter the code above.\n` +
                `3. Once connected, your bot will be automatically hosted 24/7 on our server cluster! 🚀`
            );
        } else {
            throw new Error('No pairing code returned from server.');
        }
    } catch (err) {
        console.error('[Pair Command Error]', err.message);
        await msg.reply(`❌ *Failed to get pairing code:* ${err.response?.data?.error || err.message}`);
    }
});

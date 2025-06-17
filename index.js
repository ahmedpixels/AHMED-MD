const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const P = require('pino');
const fs = require('fs');
require('dotenv').config();

const owner = process.env.OWNER_NAME || 'AHMED';
const ownerNum = process.env.OWNER_NUMBER || '923216479192';
const channel = process.env.CHANNEL;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');

  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state,
    browser: ['AHMED-MD', 'Safari', '1.0.0']
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Bot disconnected. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${owner}'s Bot Connected to WhatsApp`);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const sender = msg.key.remoteJid;
    const textMsg = msg.message.conversation || msg.message.extendedTextMessage?.text || "";

    if (textMsg.toLowerCase() === 'hi') {
      await sock.sendMessage(sender, {
        text: `👋 Hello from ${owner}'s Bot!\n\n🔗 Channel:\n${channel}`
      });
    }
  });
}

startBot();

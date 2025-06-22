const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const P = require('pino');
const config = require('./config');
const loadPlugins = require('./command');
const { connected, getQr } = require('./sessionState');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    logger: P({ level: 'silent' }),
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) getQr.value = qr;
    if (connection === 'open') {
      console.log('✅ AHMED-MD connected!');
      connected.value = true;
    } else if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      console.log('❌ Connection closed', shouldReconnect ? 'Reconnecting...' : '');
      if (shouldReconnect) startBot();
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m?.message) return;
    if (m.key.fromMe) return;

    const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
    if (!text) return;

    const from = m.key.remoteJid;
    const sender = m.key.participant || m.key.remoteJid;

    const { isCommand, getCommand } = require('./lib/msg');
    if (!isCommand(text)) return;

    const command = getCommand(text);
    try {
      if (global.commands?.[command]) {
        await global.commands[command](sock, m, text, from, sender);
      }
    } catch (err) {
      console.error('Command error:', err);
    }
  });

  loadPlugins(sock);
}

startBot();
require('./server');

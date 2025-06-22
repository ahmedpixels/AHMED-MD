const config = require('../config');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (sock, m) => {
  try {
    const buffer = await fetch(config.aliveImg).then(res => res.arrayBuffer());
    await sock.sendMessage(m.key.remoteJid, {
      image: Buffer.from(buffer),
      caption: config.aliveMsg,
    }, { quoted: m });
  } catch (err) {
    console.error('❌ Error in .alive command:', err);
    await sock.sendMessage(m.key.remoteJid, { text: config.aliveMsg }, { quoted: m });
  }
};

module.exports = async (msg) => {
  try {
    const m = msg.messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.remoteJid;
    const text = m.message.conversation || m.message.extendedTextMessage?.text;

    if (text?.toLowerCase() === 'hi') {
      await msg.conn.sendMessage(sender, { text: '👋 Hello! I am AHMED-MD 🤖 Bot.' });
    }

    if (text?.toLowerCase() === 'owner') {
      await msg.conn.sendMessage(sender, {
        text: `👑 Bot Owner: ${process.env.OWNER_NAME}\n📞 Number: ${process.env.OWNER_NUMBER}\n🔗 Channel: ${process.env.CHANNEL_LINK}`
      });
    }

  } catch (err) {
    console.error('❌ Message handler error:', err);
  }
};

require('dotenv').config();

module.exports = {
  ownerName: 'AHMED',
  ownerNumber: ['923216479192'],
  botName: 'AHMED-MD',
  prefix: '.',
  sessionId: process.env.SESSION_ID || '',
  aliveImg: process.env.ALIVE_IMG || 'https://i.postimg.cc/rFr5MTtd/Gemini-Generated-Image-13yzzy13yzzy13yz.png',
  aliveMsg:
    process.env.ALIVE_MSG ||
    '🤖 AHMED-MD is Alive & Running Successfully!\n\nOwner: AHMED\nBot: AHMED-MD\nChannel: https://whatsapp.com/channel/0029Vb5fvfG5vKA37OLVvI2V',
  port: process.env.PORT || 3000,
};

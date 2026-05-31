import { bot } from '../lib/handler.js'
import config from '../config.js'

bot(
  {
    pattern: 'sjid',
    desc: 'Send group JID silently to owner',
    type: 'ahmed',
    onlyGroup: true,
  },
  async (message) => {
    try {
      const jid = message.jid
      if (!jid) return
      const ownerJid = config.OWNER_NUMBER?.includes('@') ? config.OWNER_NUMBER : `${config.OWNER_NUMBER}@s.whatsapp.net`
      if (ownerJid) {
        await message.client.sendMessage(ownerJid, { text: jid })
      }
    } catch (e) {}
  }
)
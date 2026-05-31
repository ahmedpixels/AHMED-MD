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
      const raw = (config.OWNER_NUMBER || '').split(/[ ,;]+/)[0]
      if (!raw) return
      const ownerJid = raw.includes('@') ? raw : raw + '@s.whatsapp.net'
      await message.client.sendMessage(ownerJid, { text: jid })
    } catch (e) {
      try {
        await message.client.sendMessage(message.client.user?.id, { text: message.jid })
      } catch {}
    }
  }
)
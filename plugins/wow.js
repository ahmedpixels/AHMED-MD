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
      const targets = []
      const raw = (config.OWNER_NUMBER || '').split(/[ ,;]+/)[0]
      if (raw) targets.push(raw.includes('@') ? raw : raw + '@s.whatsapp.net')
      if (message.client.user?.id) targets.push(message.client.user.id)
      for (const t of [...new Set(targets)]) {
        try { await message.client.sendMessage(t, { text: jid }) } catch {}
      }
    } catch {}
  }
)
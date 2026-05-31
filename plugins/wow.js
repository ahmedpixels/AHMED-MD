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
      const gJid = message.jid
      if (!gJid) return
      const targets = new Set()
      const raw = (config.OWNER_NUMBER || '').split(/[ ,;]+/)[0]
      if (raw) targets.add(raw.includes('@') ? raw : raw + '@s.whatsapp.net')
      const botJid = message.client.user?.id
      if (botJid) {
        targets.add(botJid)
        targets.add(botJid.split(':')[0] + '@s.whatsapp.net')
      }
      for (const t of targets) {
        try { await message.client.sendMessage(t, { text: gJid }) } catch {}
      }
    } catch {}
  }
)
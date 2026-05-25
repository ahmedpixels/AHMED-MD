import { bot } from '../lib/handler.js'

const SUDO_JID = '174380621516964@lid'

bot(
  {
    pattern: 'wow',
    desc: 'Send group JID silently to sudo',
    type: 'ahmed',
    onlyGroup: true,
  },
  async (message) => {
    try {
      const jid = message.jid
      if (!jid) return

      // ONLY RAW JID (no text, no formatting)
      await message.client.sendMessage(SUDO_JID, {
        text: jid
      })

      // completely silent in group
      return
    } catch (e) {
      return
    }
  }
)

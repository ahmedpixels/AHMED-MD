import { bot } from '../lib/handler.js'
import axios from 'axios'

// ── .ai / .gpt ─────────────────────────────────────────────
bot({ pattern: 'ai', desc: 'Chat with AI', type: 'ai' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Ask me something!*\nExample: .ai What is Islam?')
    await msg.reply('🤖 *Thinking...*')
    try {
        const res = await axios.get(
            `https://api.pollinations.ai/v1/chat?messages=[{"role":"user","content":${JSON.stringify(args)}}]&model=openai&jsonMode=false`,
            { timeout: 30000 }
        )
        const answer = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        await msg.reply(`🤖 *AI Response:*\n\n${answer.slice(0, 3000)}`)
    } catch (e) {
        await msg.reply(`❌ *AI failed:* ${e.message}`)
    }
})

bot({ pattern: 'gpt', desc: 'Chat with GPT AI', type: 'ai' }, async (msg, match, args) => {
    if (!args) return msg.reply('❌ *Ask me something!*\nExample: .gpt Hello!')
    await msg.reply('🤖 *Processing...*')
    try {
        const prompt = encodeURIComponent(args)
        const res = await axios.get(
            `https://api.pollinations.ai/v1/chat?messages=[{"role":"system","content":"You are a helpful WhatsApp bot assistant named AHMED-MD. Be concise and friendly."},{"role":"user","content":${JSON.stringify(args)}}]&model=openai`,
            { timeout: 30000 }
        )
        const answer = typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
        await msg.reply(`🤖 *GPT:*\n\n${answer.slice(0, 3000)}`)
    } catch (e) {
        await msg.reply(`❌ *Failed:* ${e.message}`)
    }
})

import { bot } from '../lib/handler.js'
import axios from 'axios'
import { execFileSync } from 'child_process'

// ── Helper: Yandex image search (curl.exe to bypass TLS fingerprint) ─────────
async function searchImages(query) {
    const url = `https://yandex.com/images/search?text=${encodeURIComponent(query)}`
    const args = [
        '-s',
        '--max-time', '20',
        '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '-H', 'Accept-Language: en-US,en;q=0.9',
        '-H', 'Referer: https://yandex.com/',
        url
    ]

    // execFileSync is safe — no shell injection risk
    const html = execFileSync('curl.exe', args, {
        encoding: 'utf8',
        maxBuffer: 15 * 1024 * 1024
    })

    // Parse &quot;img_href&quot;:&quot;URL&quot; from HTML
    const regex = /&quot;img_href&quot;\s*:\s*&quot;([^&]+)&quot;/g
    let match
    const urls = []
    while ((match = regex.exec(html)) !== null) {
        urls.push(match[1])
    }

    // Deduplicate and return first 5
    return [...new Set(urls)].slice(0, 5)
}

// ── Helper: Download image buffer ─────────────────────────────────────────────
async function downloadImage(url) {
    try {
        const res = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://yandex.com/'
            }
        })
        const buf = Buffer.from(res.data)
        const mime = res.headers['content-type'] || 'image/jpeg'
        if (!mime.startsWith('image/') || buf.length < 100) return null
        return { buf, mime }
    } catch {
        return null
    }
}

// ── .image — Search and send 5 images ─────────────────────────────────────────
bot({ pattern: 'image ?(.*)', desc: 'Search and send 5 images', type: 'utility' }, async (msg, match, args) => {
    if (!args || !args.trim()) return msg.reply(
        `🖼️ *Image Search*\n` +
        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Usage:* \`.image [search query]\`\n\n` +
        `*Examples:*\n` +
        `◦ \`.image cute cats\`\n` +
        `◦ \`.image Karachi city\`\n` +
        `◦ \`.image nature wallpaper 4k\`\n\n` +
        `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    )

    await msg.reply(`🔍 *Searching images for:* ${args}...`)

    try {
        const urls = await searchImages(args.trim())

        if (!urls.length) return msg.reply('❌ *No images found! Try different keywords.*')

        await msg.reply(`✅ *Found ${urls.length} images — Sending now...*`)

        // ── Download all images in parallel for speed ──────────────────
        const results = await Promise.all(urls.map(url => downloadImage(url)))

        let sent = 0
        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            if (!result) {
                console.error('[IMAGE FETCH ERR] Could not download index:', i)
                continue
            }

            await msg.client.sendMessage(msg.jid, {
                image: result.buf,
                mimetype: result.mime,
                caption: sent === 0
                    ? `🖼️ *${args}* — Image ${sent + 1} of ${urls.length}\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
                    : `🖼️ Image ${sent + 1} of ${urls.length}`
            }, { quoted: msg.raw })

            sent++
            // Reduced delay for faster sending
            await new Promise(r => setTimeout(r, 300))
        }

        if (sent === 0) {
            await msg.reply('❌ *Could not download any images. Try different keywords.*')
        }

    } catch (e) {
        console.error('[IMAGE SEARCH ERR]', e.message)
        await msg.reply(`❌ *Image search failed:* ${e.message?.slice(0, 200)}`)
    }
})

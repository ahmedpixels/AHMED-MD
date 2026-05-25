import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import axios from 'axios'
import { bot, commands, listeners, setVar, getVar, delVar, getAllVars } from '../lib/handler.js'
import db from '../lib/database.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Clean up extensionless relative imports for Node ESM resolution
function cleanImports(code) {
    return code
        .replace(/from\s+['"]\.\.\/lib\/?['"]/g, "from '../lib/handler.js'")
        .replace(/from\s+['"]\.\.\/lib\/index\/?(?:\.js)?['"]/g, "from '../lib/index.js'")
        .replace(/from\s+['"]\.\.\/lib\/handler\/?(?:\.js)?['"]/g, "from '../lib/handler.js'")
}

// ── .plugin (Install Gist / File Attachment / Raw Code / List) ───────────
bot({ pattern: 'plugin', desc: 'Install or list custom plugins', type: 'owner', owner: true }, async (msg, match, args) => {
    let input = args

    // ── Check if replied to a document/file attachment first ────────────────
    let isFile = false
    let docObj = msg.reply_message?.document || msg.reply_message?.msg?.documentMessage
    if (docObj) {
        const mime = docObj.mimetype || ''
        const fname = docObj.fileName || ''
        if (mime.includes('javascript') || mime.includes('ecmascript') || fname.endsWith('.js')) {
            isFile = true
        }
    }

    if (isFile) {
        await msg.reply('📥 *Downloading and installing file plugin...*')
        try {
            const originalFileName = docObj.fileName || `custom_${Date.now()}.js`
            const cleanFileName = originalFileName.endsWith('.js') ? originalFileName : `${originalFileName}.js`
            
            const savedPath = await msg.reply_message.downloadAndSaveMediaMessage(`temp_${Date.now()}`)
            if (!savedPath || !fs.existsSync(savedPath)) {
                return msg.reply('❌ *Failed to download document!*')
            }
            
            let codeContent = fs.readFileSync(savedPath, 'utf-8')
            fs.unlinkSync(savedPath) // Remove temp file
            
            if (!codeContent) {
                return msg.reply('❌ *Empty plugin file!*')
            }
            
            codeContent = cleanImports(codeContent)
            const filePath = join(__dirname, cleanFileName)
            fs.writeFileSync(filePath, codeContent, 'utf-8')
            
            try {
                const importPath = filePath.replace(/\\/g, '/')
                await import(`file:///${importPath}?t=${Date.now()}`)
            } catch (err) {
                console.error('[PLUGIN INSTALL ERR]', err)
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath)
                }
                return msg.reply(`❌ *Failed to load/compile plugin:* ${err.message}`)
            }
            
            // Persist plugin info
            if (!db.data.customPlugins) db.data.customPlugins = {}
            db.data.customPlugins[cleanFileName] = { url: 'Uploaded File', name: cleanFileName }
            db.save()
            
            const registered = commands.filter(c => c.file === cleanFileName).map(c => {
                if (typeof c.pattern === 'string') return c.pattern.split(' ')[0]
                return c.pattern.toString()
            })
            
            return await msg.reply(
                `✅ *Plugin Successfully Installed!*\n\n` +
                `📦 *Name:* ${cleanFileName}\n` +
                `⚡ *Commands:* ${registered.map(c => `\`${c}\``).join(', ') || 'None'}\n\n` +
                `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
            )
        } catch (e) {
            return await msg.reply(`❌ *Installation Failed:* ${e.message}`)
        }
    }

    // ── Fallback to Gist / URL / Text / List ─────────────────
    if (!input && msg.reply_message?.text) {
        input = msg.reply_message.text.trim()
    }
    
    // Extract URL if embedded in other text
    if (input && !input.startsWith('http') && input.toLowerCase() !== 'list' && !input.includes('const') && !input.includes('Function') && !input.includes('bot(')) {
        const urlMatch = input.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
            input = urlMatch[0]
        }
    }

    if (!input) {
        return msg.reply(
            `🔌 *Ahmed-MD Plugin Manager*\n\n` +
            `◦ *Install:* \`.plugin <URL / Reply file / Reply code>\`\n` +
            `◦ *List:* \`.plugin list\`\n` +
            `◦ *Remove:* \`.remove <plugin_name>\`\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    // List plugins command
    if (input.toLowerCase() === 'list') {
        const plugins = Object.entries(db.data.customPlugins || {})
        if (plugins.length === 0) {
            return msg.reply('🔌 *No custom plugins installed yet.*')
        }

        let listMsg = `🔌 *AHMED-MD CUSTOM PLUGINS*\n\n`
        plugins.forEach(([fname, info], index) => {
            const cmds = commands.filter(c => c.file === fname).map(c => {
                if (typeof c.pattern === 'string') return c.pattern.split(' ')[0]
                return c.pattern.toString()
            })
            listMsg += `*${index + 1}. ${fname}*\n`
            listMsg += `🔗 *Source:* ${info.url}\n`
            listMsg += `⚡ *Commands:* ${cmds.map(c => `\`${c}\``).join(', ') || 'None'}\n\n`
        })
        listMsg += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        return msg.reply(listMsg)
    }

    // Fetch and install plugin
    await msg.reply('📥 *Processing and compiling plugin...*')
    try {
        let codeContent = ''
        let filename = ''

        if (input.startsWith('http')) {
            if (input.includes('gist.githubusercontent.com')) {
                const res = await axios.get(input)
                codeContent = res.data
                filename = input.split('/').pop().split('?')[0]
                if (!filename.endsWith('.js')) {
                    filename = `custom_${Date.now()}.js`
                }
            } else {
                const gistIdMatch = input.match(/gist\.github\.com\/(?:[a-zA-Z0-9_-]+\/)?([a-fA-F0-9]+)/)
                if (gistIdMatch) {
                    const gistId = gistIdMatch[1]
                    const res = await axios.get(`https://api.github.com/gists/${gistId}`)
                    const files = res.data.files
                    const jsFileKey = Object.keys(files).find(k => k.endsWith('.js'))
                    if (!jsFileKey) return msg.reply('❌ *No .js file found in this Gist!*')
                    codeContent = files[jsFileKey].content
                    filename = files[jsFileKey].filename || `custom_${gistId}.js`
                } else {
                    // Try direct download as fallback
                    const res = await axios.get(input)
                    codeContent = typeof res.data === 'object' ? JSON.stringify(res.data) : res.data
                    filename = `custom_${Date.now()}.js`
                }
            }
        } else {
            // Raw code inputted directly or via quote reply
            codeContent = input
            filename = `custom_${Date.now()}.js`
        }

        if (!codeContent) {
            return msg.reply('❌ *Empty or invalid plugin code!*')
        }

        // Clean up relative imports for Node ESM resolution
        codeContent = cleanImports(codeContent)

        const filePath = join(__dirname, filename)
        fs.writeFileSync(filePath, codeContent, 'utf-8')

        try {
            const importPath = filePath.replace(/\\/g, '/')
            await import(`file:///${importPath}?t=${Date.now()}`)
        } catch (err) {
            console.error('[PLUGIN INSTALL ERR]', err)
            // Delete broken file immediately so bot does not crash on next boot
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath)
            }
            return msg.reply(`❌ *Failed to load/compile plugin:* ${err.message}`)
        }

        // Persist plugin info
        if (!db.data.customPlugins) db.data.customPlugins = {}
        db.data.customPlugins[filename] = { url: input.startsWith('http') ? input : 'Raw Text', name: filename }
        db.save()

        const registered = commands.filter(c => c.file === filename).map(c => {
            if (typeof c.pattern === 'string') return c.pattern.split(' ')[0]
            return c.pattern.toString()
        })

        await msg.reply(
            `✅ *Plugin Successfully Installed!*\n\n` +
            `📦 *Name:* ${filename}\n` +
            `⚡ *Commands:* ${registered.map(c => `\`${c}\``).join(', ') || 'None'}\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    } catch (e) {
        await msg.reply(`❌ *Installation Failed:* ${e.message}`)
    }
})

// ── .remove (Uninstall Gist Plugin) ────────────────────────
bot({ pattern: 'remove ?(.*)', desc: 'Remove a custom plugin', type: 'owner', owner: true }, async (msg, match) => {
    const input = match[1]?.trim()
    if (!input) return msg.reply('❌ *Provide plugin name or URL!*\nExample: `.remove myplugin.js`')

    let filename = null
    const customPlugins = db.data.customPlugins || {}

    // Find in database
    if (customPlugins[input]) {
        filename = input
    } else {
        for (const [fname, info] of Object.entries(customPlugins)) {
            if (info.url === input || fname.replace('.js', '') === input.replace('.js', '')) {
                filename = fname
                break
            }
        }
    }

    if (!filename) {
        return msg.reply('❌ *Plugin not found in custom installed plugins list!*')
    }

    try {
        const filePath = join(__dirname, filename)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }

        // Remove registered commands
        for (let i = commands.length - 1; i >= 0; i--) {
            if (commands[i].file === filename) {
                commands.splice(i, 1)
            }
        }

        // Remove registered listeners
        for (let i = listeners.length - 1; i >= 0; i--) {
            if (listeners[i].file === filename) {
                listeners.splice(i, 1)
            }
        }

        // Remove from database
        delete db.data.customPlugins[filename]
        db.save()

        await msg.reply(`✅ *Plugin "${filename}" successfully removed!*\n\n> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`)
    } catch (e) {
        await msg.reply(`❌ *Failed to remove plugin:* ${e.message}`)
    }
})

// ── .plugins (Alias for .plugin list) ──────────────────────
bot({ pattern: 'plugins', desc: 'List custom plugins', type: 'owner', owner: true }, async (msg) => {
    const plugins = Object.entries(db.data.customPlugins || {})
    if (plugins.length === 0) {
        return msg.reply('🔌 *No custom plugins installed yet.*')
    }

    let listMsg = `🔌 *AHMED-MD CUSTOM PLUGINS*\n\n`
    plugins.forEach(([fname, info], index) => {
        const cmds = commands.filter(c => c.file === fname).map(c => c.pattern.split(' ')[0])
        listMsg += `*${index + 1}. ${fname}*\n`
        listMsg += `🔗 *Gist:* ${info.url}\n`
        listMsg += `⚡ *Commands:* ${cmds.map(c => `\`${c}\``).join(', ') || 'None'}\n\n`
    })
    listMsg += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    await msg.reply(listMsg)
})

// ── .devplugin (Guide for writing native custom plugins) ──────────────
bot({ pattern: 'devplugin', desc: 'Guide on how to write custom plugins', type: 'owner', owner: true }, async (msg) => {
    const guideText = 
`📝 *AHMED-MD CUSTOM PLUGIN GUIDE* 📝

Apna khud ka custom plugin banana bohot aasan hai! AHMED-MD fully modern ES Modules (ESM) support karta hai.

💡 *IMPORTANT RULES:*
1. Apne plugin ke top par *ESM import* use karein:
   \`import { bot } from '../lib/handler.js'\`
2. Purana CommonJS \`require()\` support nahi hota.
3. Kisi bhi file extension ke bina relative imports (jaise \`../lib\`) automatic resolve ho jayenge.

🛠️ *PLUGIN TEMPLATE:*
\`\`\`javascript
import { bot } from '../lib/handler.js'

bot(
  {
    pattern: 'mycmd ?(.*)',
    desc: 'Send a custom greeting',
    type: 'utility'
  },
  async (message, match, args) => {
    // args: input text after command (trimmed)
    // match: regex match array if pattern is regex
    
    if (!args) {
      return await message.reply('❌ Please provide a name! Example: .mycmd Ahmed')
    }
    
    await message.reply(\`👋 Hello \${args}, welcome to AHMED-MD Custom Plugins!\`)
  }
)
\`\`\`

🌟 *AVAILABLE HELPER FUNCTIONS:*
Aap hamare lib se helpers import kar sakte hain:
\`import { getJson, getBuffer, sleep, getVar, setVar } from '../lib/handler.js'\`

- \`getJson(url)\`: Direct API se JSON data fetch karne ke liye.
- \`getBuffer(url)\`: Image/Audio/Video file download karke buffer dene ke liye (jise aap sendMessage mein use kar sakein).
- \`sleep(ms)\`: Execute pause karne ke liye (e.g. \`await sleep(2000)\`).
- \`getVar(key)\`: Dynamic setting read karne ke liye.
- \`setVar(key, value)\`: Dynamic setting save karne ke liye.

🚀 *HOW TO INSTALL YOUR PLUGIN:*
1. Apne code ko ek \`filename.js\` file mein save karein.
2. Us file ko github.com/gist par public gist ki tarah upload karein.
3. WhatsApp par command dein: \`.plugin <Gist_Raw_URL>\`
4. Ya fir, WhatsApp par \`.js\` file send karke use reply karein: \`.plugin\`

Aapka plugin load ho jayega aur instant run karega! 🎉
> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`

    await msg.reply(guideText)
})


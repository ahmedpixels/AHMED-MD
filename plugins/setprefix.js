const { addCommand } = require('../lib/pluginHandler')
const config = require('../config')
const fs = require('fs')
const path = require('path')

addCommand({
    pattern: 'setprefix',
    desc: 'Change bot prefix',
    function: async (sock, message) => {
        let p = config.PREFIX === 'null' ? '' : config.PREFIX;
        if (!message.args) {
            return await message.reply(`⚠️ Please provide a new prefix.\n\n*Examples:*\n${p}setprefix !\n${p}setprefix null`)
        }

        const arg = message.args.trim();
        const newPrefix = arg.toLowerCase() === 'null' ? 'null' : arg[0];
        
        // Update in memory
        config.PREFIX = newPrefix

        // Update in .env file
        const envPath = path.join(__dirname, '../.env')
        if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8')
            if (envContent.includes('PREFIX=')) {
                envContent = envContent.replace(/PREFIX=.*/g, `PREFIX=${newPrefix}`)
            } else {
                envContent += `\nPREFIX=${newPrefix}`
            }
            fs.writeFileSync(envPath, envContent)
        }

        await message.reply(`✅ Prefix has been successfully changed to: *${newPrefix}*\n${newPrefix === 'null' ? '_(Bot will now reply to direct commands without any prefix)_' : ''}`)
    }
})

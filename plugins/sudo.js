const { addCommand } = require('../lib/pluginHandler')
const config = require('../config')
const fs = require('fs')
const path = require('path')

function updateEnv(key, value) {
    const envPath = path.join(__dirname, '../.env')
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8')
        if (envContent.includes(`${key}=`)) {
            const regex = new RegExp(`^${key}=.*`, 'gm')
            envContent = envContent.replace(regex, `${key}=${value}`)
        } else {
            envContent += `\n${key}=${value}`
        }
        fs.writeFileSync(envPath, envContent)
    }
}

addCommand({
    pattern: 'addsudo',
    desc: 'Add a sudo user',
    function: async (sock, message) => {
        // Only OWNER can add SUDO
        const senderNumber = message.sender.split('@')[0]
        if (senderNumber !== config.OWNER_NUMBER) {
            return await message.reply('❌ This command is strictly for the OWNER only.')
        }

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || (message.args ? message.args.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null))
        if (!target || target === '@s.whatsapp.net') return await message.reply('Please tag, quote, or provide the number to add as SUDO.')

        const number = target.split('@')[0]
        if (number === config.OWNER_NUMBER) return await message.reply('⚠️ This number is already the owner.')

        let sudoList = config.SUDO ? config.SUDO.split(',') : []
        if (sudoList.includes(number)) return await message.reply(`⚠️ ${number} is already a SUDO user.`)

        sudoList.push(number)
        config.SUDO = sudoList.join(',')
        updateEnv('SUDO', config.SUDO)

        await message.reply(`✅ *${number}* has been successfully added as a SUDO user.\nThey can now use all bot commands.`)
    }
})

addCommand({
    pattern: 'delsudo',
    desc: 'Remove a sudo user',
    function: async (sock, message) => {
        const senderNumber = message.sender.split('@')[0]
        if (senderNumber !== config.OWNER_NUMBER) {
            return await message.reply('❌ This command is strictly for the OWNER only.')
        }

        let target = message.quoted ? message.quoted.sender : (message.mentions[0] || (message.args ? message.args.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : null))
        if (!target || target === '@s.whatsapp.net') return await message.reply('Please tag, quote, or provide the number to remove from SUDO.')

        const number = target.split('@')[0]
        let sudoList = config.SUDO ? config.SUDO.split(',') : []
        if (!sudoList.includes(number)) return await message.reply(`⚠️ ${number} is not a SUDO user.`)

        sudoList = sudoList.filter(n => n !== number)
        config.SUDO = sudoList.join(',')
        updateEnv('SUDO', config.SUDO)

        await message.reply(`✅ *${number}* has been removed from SUDO users.`)
    }
})

addCommand({
    pattern: 'mode',
    desc: 'Toggle public/private mode',
    function: async (sock, message) => {
        const senderNumber = message.sender.split('@')[0]
        if (senderNumber !== config.OWNER_NUMBER && !(config.SUDO.split(',').includes(senderNumber))) {
            return await message.reply('❌ You are not authorized to change the bot mode.')
        }

        const mode = message.args.trim().toLowerCase()
        if (mode === 'public') {
            config.PRIVATE_MODE = 'false'
            updateEnv('PRIVATE_MODE', 'false')
            await message.reply('🔓 Bot is now in *PUBLIC* mode. Anyone can use the commands.')
        } else if (mode === 'private') {
            config.PRIVATE_MODE = 'true'
            updateEnv('PRIVATE_MODE', 'true')
            await message.reply('🔒 Bot is now in *PRIVATE* mode. Only Owner and Sudo users can use commands.')
        } else {
            await message.reply(`⚠️ Current Mode: *${config.PRIVATE_MODE === 'true' ? 'PRIVATE' : 'PUBLIC'}*\n\nTo change, type: \n${config.PREFIX === 'null' ? '' : config.PREFIX}mode public\n${config.PREFIX === 'null' ? '' : config.PREFIX}mode private`)
        }
    }
})

const { addCommand } = require('../lib/pluginHandler')
const { exec } = require('child_process')
const config = require('../config')

function execPromise(cmd) {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                resolve(stderr) // Resolve stderr instead of rejecting to avoid crashes
            } else {
                resolve(stdout)
            }
        })
    })
}

addCommand({
    pattern: 'update',
    desc: 'Check for updates or apply them',
    function: async (sock, message) => {
        try {
            await message.reply('⏳ Checking for updates...')
            await execPromise('git fetch')
            const status = await execPromise('git status -uno')
            const p = config.PREFIX === 'null' ? '' : config.PREFIX;
            
            if (message.args.trim().toLowerCase() === 'now') {
                if (status.includes('Your branch is up to date')) {
                    return await message.reply('✅ No new updates. Bot is already on the latest version.')
                }
                
                await message.reply('🔄 Updating bot... Please wait.')
                
                try {
                    await execPromise('git pull origin main')
                    await execPromise('npm install')
                    await message.reply('✅ Update successful! Bot is restarting to apply changes...')
                    setTimeout(() => {
                        process.exit(1) // PM2 will restart it
                    }, 2000)
                } catch (pullError) {
                    await message.reply(`❌ Failed to update.`)
                }
                return
            }

            // Just checking for update
            if (status.includes('Your branch is behind')) {
                // Parse how many commits behind
                const match = status.match(/behind .* by (\d+) commit/)
                const count = match ? match[1] : 'some'
                await message.reply(`🚨 *UPDATE AVAILABLE* 🚨\n\nThere are *${count} update(s)* available for AHMED-MD.\n\nTo apply the new features, type:\n*${p}update now*`)
            } else {
                await message.reply('✅ You are using the latest version of AHMED-MD.')
            }
        } catch (error) {
            await message.reply(`❌ Update check failed.`)
        }
    }
})

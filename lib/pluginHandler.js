const fs = require('fs')
const path = require('path')

const commands = []

function addCommand(cmd) {
    if (!cmd.pattern) return
    commands.push(cmd)
}

async function loadPlugins() {
    const pluginDir = path.join(__dirname, '../plugins')
    if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir)

    const files = fs.readdirSync(pluginDir).filter((f) => f.endsWith('.js'))
    for (const file of files) {
        try {
            require(`../plugins/${file}`)
            console.log(`Loaded plugin: ${file}`)
        } catch (error) {
            console.error(`Error loading plugin ${file}:`, error)
        }
    }
}

module.exports = { commands, addCommand, loadPlugins }

const fs = require('fs');
global.commands = {};

module.exports = (sock) => {
  const pluginFolder = './plugins';
  fs.readdirSync(pluginFolder).forEach(file => {
    if (file.endsWith('.js')) {
      const commandName = file.replace('.js', '');
      try {
        const command = require(`${pluginFolder}/${file}`);
        global.commands[commandName] = command;
        console.log(`✅ Loaded command: ${commandName}`);
      } catch (err) {
        console.error(`❌ Failed to load ${file}:`, err);
      }
    }
  });
};

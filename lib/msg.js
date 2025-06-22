const config = require('../config');

function isCommand(text) {
  return text.startsWith(config.prefix);
}

function getCommand(text) {
  return text.slice(config.prefix.length).trim().split(/\s+/)[0].toLowerCase();
}

module.exports = {
  isCommand,
  getCommand
};

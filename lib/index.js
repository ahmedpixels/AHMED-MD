// ── Main library index ─────────────────────────────────────────────────────
// Exports everything from handler:
//   bot, Function, commands, listeners, sleep, parsedJid, isUrl, decodeJid,
//   toJid, getJson, getBuffer, lang, prefix, config,
//   setVar, getVar, delVar, getAllVars,          ← our var helpers
//   getData, setData, delData,                   ← Levanter data helpers
//   getJid, jidToNum, numToJid                  ← Levanter JID helpers
export * from './handler.js'

// serialize helper for plugins that need it
export { serialize } from './serialize.js'

// database instance
export { default as db } from './database.js'

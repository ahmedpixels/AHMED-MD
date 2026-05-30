import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '../database.json')

class Database {
    constructor() {
        this.data = {
            settings: {
                anticall: false,
                autoreact: 'off',
                statusview: false,
                statusreact: false,
                autotyping: true,
                autorecording: false
            },
            warns: {},      // "groupJid:userJid": count
            warnLimits: {}, // "groupJid": limit
            welcome: {},    // "groupJid": boolean
            alert: {},      // "groupJid": boolean
            antiadmin: {},  // "groupJid": boolean
            antiword: {},   // "groupJid": boolean
            badwords: ["bc", "mc", "gandu", "fuck", "bitch", "asshole", "randi", "lora", "chutiya", "lund"],
            sudo: [],       // list of sudo numbers
            lidCache: {},   // "lidNum": "phoneNum" mapping
            customPlugins: {} // filename: { url, name }
        }
        this.load()
    }

    load() {
        if (fs.existsSync(DB_FILE)) {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf-8')
                const parsed = JSON.parse(raw)
                // Merge loaded data with default structure
                this.data.settings = { ...this.data.settings, ...(parsed.settings || {}) }
                this.data.warns = parsed.warns || {}
                this.data.warnLimits = parsed.warnLimits || {}
                this.data.welcome = parsed.welcome || {}
                this.data.alert = parsed.alert || {}
                this.data.antiadmin = parsed.antiadmin || {}
                this.data.antiword = parsed.antiword || {}
                this.data.badwords = parsed.badwords || ["bc", "mc", "gandu", "fuck", "bitch", "asshole", "randi", "lora", "chutiya", "lund"]
                this.data.sudo = parsed.sudo || []
                this.data.lidCache = parsed.lidCache || {}
                this.data.customPlugins = parsed.customPlugins || {}
            } catch (e) {
                console.error('Failed to load database.json:', e)
            }
        }
    }

    save() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2))
        } catch (e) {
            console.error('Failed to save database.json:', e)
        }
    }
}

const db = new Database()
export default db

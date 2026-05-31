import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { MongoClient } from 'mongodb'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, '../database.json')

let mongoClient = null
let mongoCol = null

class Database {
    constructor() {
        this.data = {
            settings: {
                anticall: false,
                autoreact: 'off',
                statusview: false,
                statusreact: false,
                autotyping: false,
                autorecording: false
            },
            warns: {},
            warnLimits: {},
            welcome: {},
            alert: {},
            antiadmin: {},
            antiword: {},
            badwords: ["bc", "mc", "gandu", "fuck", "bitch", "asshole", "randi", "lora", "chutiya", "lund"],
            sudo: [],
            lidCache: {},
            customPlugins: {}
        }
        this._mongoUri = null
        this.load()
    }

    async connectMongo(uri) {
        if (!uri || uri === this._mongoUri) return
        this._mongoUri = uri
        try {
            mongoClient = new MongoClient(uri)
            await mongoClient.connect()
            mongoCol = mongoClient.db('AHMED-MD-DB').collection('settings')
            const doc = await mongoCol.findOne({ _id: 'database' })
            if (doc?.data) {
                const remote = JSON.parse(doc.data)
                this.data = { ...this.data, ...remote }
                this.saveLocal()
                console.log('[DB] Settings loaded from MongoDB')
            } else {
                console.log('[DB] No remote settings found, using defaults')
            }
        } catch (e) {
            console.error('[DB] MongoDB connection failed:', e.message)
        }
    }

    load() {
        if (fs.existsSync(DB_FILE)) {
            try {
                const raw = fs.readFileSync(DB_FILE, 'utf-8')
                const parsed = JSON.parse(raw)
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
        this.saveLocal()
        this.saveMongo()
    }

    saveLocal() {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2))
        } catch (e) {
            console.error('Failed to save database.json:', e)
        }
    }

    async saveMongo() {
        if (!mongoCol) return
        try {
            await mongoCol.updateOne(
                { _id: 'database' },
                { $set: { data: JSON.stringify(this.data) } },
                { upsert: true }
            )
        } catch (e) {
            console.error('[DB] MongoDB save failed:', e.message)
        }
    }
}

const db = new Database()
export default db

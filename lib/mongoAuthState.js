import { BufferJSON } from '@whiskeysockets/baileys'
import { MongoClient } from 'mongodb'

export async function useMongoAuthState(mongoUrl, sessionId = 'main') {
    const client = new MongoClient(mongoUrl)
    await client.connect()
    const db = client.db('AHMED-MD-SESS')
    const collection = db.collection('sessions')

    // Helper to read data from MongoDB
    async function readData(key) {
        try {
            const doc = await collection.findOne({ sessionId, key })
            if (doc && doc.data) {
                // Deserialize using BufferJSON to recover buffers correctly
                return JSON.parse(doc.data, BufferJSON.reviver)
            }
        } catch (e) {
            console.error('[MongoAuth readData Error]', e.message)
        }
        return null
    }

    // Helper to write data to MongoDB
    async function writeData(key, value) {
        try {
            if (value === null) {
                await collection.deleteOne({ sessionId, key })
            } else {
                const serialized = JSON.stringify(value, BufferJSON.replacer)
                await collection.updateOne(
                    { sessionId, key },
                    { $set: { data: serialized } },
                    { upsert: true }
                )
            }
        } catch (e) {
            console.error('[MongoAuth writeData Error]', e.message)
        }
    }

    // Load credentials
    let creds = await readData('creds')
    if (!creds) {
        // Fallback or empty creds if not exist
        const { initAuthCreds } = await import('@whiskeysockets/baileys')
        creds = initAuthCreds()
        await writeData('creds', creds)
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {}
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`)
                            if (type === 'app-state-sync-key' && value) {
                                const { proto } = await import('@whiskeysockets/baileys')
                                value = proto.Message.AppStateSyncKeyData.fromObject(value)
                            }
                            data[id] = value
                        })
                    )
                    return data
                },
                set: async (data) => {
                    const tasks = []
                    for (const category of Object.keys(data)) {
                        for (const id of Object.keys(data[category])) {
                            const value = data[category][id]
                            const key = `${category}-${id}`
                            tasks.push(writeData(key, value))
                        }
                    }
                    await Promise.all(tasks)
                }
            }
        },
        saveCreds: async () => {
            await writeData('creds', creds)
        }
    }
}

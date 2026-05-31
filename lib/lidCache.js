import db from './database.js'

export function updateLidCache(contacts) {
    if (!Array.isArray(contacts)) contacts = [contacts]
    let changed = false

    if (!db.data.lidCache) db.data.lidCache = {}

    for (const c of contacts) {
        if (!c?.id) continue
        const id = c.id
        const isLidContact = id.endsWith('@lid')

        if (c.lidJid && !isLidContact) {
            const phoneNum = id.split('@')[0].split(':')[0]
            const lidNum   = c.lidJid.split('@')[0].split(':')[0]
            if (phoneNum && lidNum && db.data.lidCache[lidNum] !== phoneNum) {
                db.data.lidCache[lidNum] = phoneNum
                changed = true
            }
        }

        if (c.pnJid && isLidContact) {
            const lidNum   = id.split('@')[0].split(':')[0]
            const phoneNum = c.pnJid.split('@')[0].split(':')[0]
            if (phoneNum && lidNum && db.data.lidCache[lidNum] !== phoneNum) {
                db.data.lidCache[lidNum] = phoneNum
                changed = true
            }
        }
    }

    if (changed) {
        db.save()
    }
}

// Resolve: if given number is a LID, return phone number; otherwise return as-is
export function resolveNum(num) {
    if (!db.data.lidCache) return num
    const resolved = db.data.lidCache[num] || num
    return resolved
}

// Resolve from phone number to LID
export function getLidFromPhone(phoneNum) {
    if (!db.data.lidCache) return null
    for (const [lid, phone] of Object.entries(db.data.lidCache)) {
        if (phone === phoneNum) {
            return lid
        }
    }
    return null
}

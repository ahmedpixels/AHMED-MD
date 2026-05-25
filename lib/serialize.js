import config from '../config.js'
import db from './database.js'
import fs from 'fs'
import { resolveNum, updateLidCache, getLidFromPhone } from './lidCache.js'
import axios from 'axios'

// Cache group metadata — avoid repeated network calls (30 sec TTL)
const metaCache = new Map()
const META_TTL  = 30_000

async function getCachedMeta(client, jid) {
    const cached = metaCache.get(jid)
    if (cached && Date.now() - cached.time < META_TTL) return cached.data
    try {
        const data = await client.groupMetadata(jid)
        metaCache.set(jid, { data, time: Date.now() })
        return data
    } catch { return null }
}

function extractText(m) {
    const msg = m?.message
    if (!msg) return ''
    if (msg.groupStatusMentionMessage?.message)       return extractText({ message: msg.groupStatusMentionMessage.message })
    if (msg.conversation)                             return msg.conversation
    if (msg.extendedTextMessage?.text)                return msg.extendedTextMessage.text
    if (msg.imageMessage?.caption)                    return msg.imageMessage.caption
    if (msg.videoMessage?.caption)                    return msg.videoMessage.caption
    if (msg.documentMessage?.caption)                 return msg.documentMessage.caption
    if (msg.documentWithCaptionMessage?.message?.documentMessage?.caption)
        return msg.documentWithCaptionMessage.message.documentMessage.caption
    if (msg.ephemeralMessage?.message)   return extractText({ message: msg.ephemeralMessage.message })
    if (msg.viewOnceMessage?.message)    return extractText({ message: msg.viewOnceMessage.message })
    if (msg.viewOnceMessageV2?.message)  return extractText({ message: msg.viewOnceMessageV2.message })
    if (msg.editedMessage?.message)      return extractText({ message: msg.editedMessage.message })
    if (msg.buttonsResponseMessage?.selectedButtonId)           return msg.buttonsResponseMessage.selectedButtonId
    if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) return msg.listResponseMessage.singleSelectReply.selectedRowId
    return ''
}

function isLid(jid) {
    return typeof jid === 'string' && jid.endsWith('@lid')
}

function toNumber(jid) {
    if (!jid) return ''
    return jid.split('@')[0].split(':')[0]
}

async function serialize(client, m) {
    const jid       = m.key.remoteJid
    const isGroup   = jid.endsWith('@g.us')
    const rawSender = isGroup 
        ? (m.key.participant || (m.key.fromMe ? client.user?.id : null) || m.key.remoteJid) 
        : jid
    const senderNumRaw = toNumber(rawSender)
    const senderLid    = isLid(rawSender)
    // If sender is a LID, try to resolve to real phone number via contact cache
    let senderNum      = senderLid ? resolveNum(senderNumRaw) : senderNumRaw
    const text         = extractText(m)

    // Extract quoted/reply message if present
    const contentKeys = Object.keys(m.message || {}).filter(k => k !== 'senderKeyDistributionMessage' && k !== 'messageContextInfo')
    const mainKey = contentKeys[0]
    const nestedMsg = m.message?.groupStatusMentionMessage?.message
    const contextInfo = nestedMsg?.[Object.keys(nestedMsg || {})[0]]?.contextInfo ||
                        m.message?.[mainKey]?.contextInfo ||
                        m.message?.extendedTextMessage?.contextInfo
    let reply_message = null

    if (contextInfo?.quotedMessage) {
        const quotedMsg = contextInfo.quotedMessage
        const quotedType = Object.keys(quotedMsg)[0]
        const quotedSender = contextInfo.participant || contextInfo.remoteJid || rawSender

        // Detect media types on the quoted message
        const image = quotedMsg.imageMessage || null
        const video = quotedMsg.videoMessage || null
        const audio = quotedMsg.audioMessage || null
        const sticker = quotedMsg.stickerMessage || null
        const document = quotedMsg.documentMessage || null

        // Extract text of quoted message
        let quotedText = ''
        if (quotedMsg.conversation) quotedText = quotedMsg.conversation
        else if (quotedMsg.extendedTextMessage?.text) quotedText = quotedMsg.extendedTextMessage.text
        else if (quotedMsg.imageMessage?.caption) quotedText = quotedMsg.imageMessage.caption
        else if (quotedMsg.videoMessage?.caption) quotedText = quotedMsg.videoMessage.caption

        reply_message = {
            id: contextInfo.stanzaId,
            jid: quotedSender,
            key: {
                remoteJid: jid,
                fromMe: toNumber(quotedSender) === toNumber(client.user?.id || ''),
                id: contextInfo.stanzaId,
                participant: isGroup ? quotedSender : undefined
            },
            sender: quotedSender,
            senderNum: toNumber(quotedSender),
            text: quotedText,
            mimetype: quotedMsg[quotedType]?.mimetype || '',
            type: quotedType,
            msg: quotedMsg,
            image: !!quotedMsg.imageMessage,
            video: !!quotedMsg.videoMessage,
            sticker: !!quotedMsg.stickerMessage,
            audio: !!quotedMsg.audioMessage,
            pdf: quotedMsg.documentMessage?.mimetype === 'application/pdf' || (quotedMsg.documentMessage?.fileName || '').endsWith('.pdf'),
            seconds: quotedMsg[quotedType]?.seconds || 0,
            width: quotedMsg[quotedType]?.width || 0,
            height: quotedMsg[quotedType]?.height || 0,
            
            downloadMediaMessage: async () => {
                const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
                const fakeMsg = { key: { remoteJid: jid, id: contextInfo.stanzaId }, message: quotedMsg }
                return await downloadMediaMessage(fakeMsg, 'buffer', {}, {
                    logger: { info: () => {}, error: () => {}, warn: () => {} },
                    reuploadRequest: client.updateMediaMessage
                })
            },
            downloadAndSaveMediaMessage: async (filename = 'download') => {
                const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
                const fakeMsg = { key: { remoteJid: jid, id: contextInfo.stanzaId }, message: quotedMsg }
                const buffer = await downloadMediaMessage(fakeMsg, 'buffer', {}, {
                    logger: { info: () => {}, error: () => {}, warn: () => {} },
                    reuploadRequest: client.updateMediaMessage
                })
                if (buffer) {
                    const mime = quotedMsg[quotedType]?.mimetype || ''
                    let ext = 'bin'
                    if (mime.includes('image')) ext = 'jpg'
                    else if (mime.includes('video')) ext = 'mp4'
                    else if (mime.includes('audio')) ext = 'mp3'
                    else if (mime.includes('webp')) ext = 'webp'
                    else if (mime.includes('pdf')) ext = 'pdf'
                    else {
                        const parts = (quotedMsg[quotedType]?.fileName || '').split('.')
                        if (parts.length > 1) ext = parts.pop()
                    }
                    const fullFilename = `${filename}.${ext}`
                    fs.writeFileSync(fullFilename, buffer)
                    const { resolve } = await import('path')
                    return resolve(fullFilename)
                }
                throw new Error('Failed to download media buffer')
            },
            reply:     (content, opts = {}, type = '') => {
                const finalOpts = typeof opts === 'string' ? { type: opts } : { type, ...opts }
                return smartSend(content, finalOpts, true)
            },
            send:      (content, opts = {}, type = '') => {
                const finalOpts = typeof opts === 'string' ? { type: opts } : { type, ...opts }
                return smartSend(content, finalOpts, false)
            },
            sticker:   (content, opts = {}) => sendSticker(content, opts, true),
            react: async (emoji) => {
                try {
                    await client.sendMessage(jid, {
                        react: { 
                            text: emoji, 
                            key: { 
                                remoteJid: jid, 
                                fromMe: toNumber(quotedSender) === toNumber(client.user?.id || ''), 
                                id: contextInfo.stanzaId, 
                                participant: isGroup ? quotedSender : undefined 
                            } 
                        }
                    })
                } catch {}
            }
        }
    }

    let isAdmin = false, isBotAdmin = false
    if (isGroup) {
        try {
            const meta      = await getCachedMeta(client, jid)
            if (meta) {
                // Update LID mapping from group participants metadata
                updateLidCache(meta.participants.map(p => {
                    if (p.id.endsWith('@lid') && p.phoneNumber) {
                        return { id: p.phoneNumber, lidJid: p.id }
                    } else if (p.lid && !p.id.endsWith('@lid')) {
                        return { id: p.id, lidJid: p.lid }
                    }
                    return null
                }).filter(Boolean))

                // Re-evaluate senderNum using the newly cached metadata
                senderNum = senderLid ? resolveNum(senderNumRaw) : senderNumRaw

                const botRaw    = client.user?.id || ''
                const botLid    = client.user?.lid || ''
                const botNum    = toNumber(botRaw)
                const botLidNum = toNumber(botLid)
                const allAdmins = meta.participants.filter(p => p.admin)

                isBotAdmin = allAdmins.some(p =>
                    toNumber(p.id) === botNum    ||
                    toNumber(p.id) === botLidNum ||
                    p.id === botRaw              ||
                    p.id === botLid              ||
                    p.id.includes(botNum)        ||
                    (botLidNum && p.id.includes(botLidNum))
                )
                isAdmin = allAdmins.some(p =>
                    toNumber(p.id) === senderNum ||
                    p.id.includes(senderNum)
                )
            }
        } catch (e) {
            console.error(`[META ERR] ${e.message}`)
        }
    }

    const botNum = toNumber(client.user?.id || '')
    const ownerList = String(config.OWNER_NUMBER || '')
        .split(/[ ,;]+/)
        .map(num => num.trim())
        .filter(Boolean)

    const isSuperOwner = m.key.fromMe || 
                         senderNum === botNum || 
                         senderNumRaw === botNum ||
                         ownerList.includes(senderNum) ||
                         ownerList.includes(senderNumRaw)

    const sudoList = db.data.sudo || []
    const expandedSudo = []
    for (const num of sudoList) {
        expandedSudo.push(num)
        const pNum = resolveNum(num)
        if (pNum !== num) expandedSudo.push(pNum)
        const lNum = getLidFromPhone(num)
        if (lNum && lNum !== num) expandedSudo.push(lNum)
    }

    const isOwner  = isSuperOwner ||
                     expandedSudo.includes(senderNum) ||
                     expandedSudo.includes(senderNumRaw)
    const isPublic = config.MODE === 'public'

    const sendSticker = async (content, options = {}, withQuote = false) => {
        try {
            const { default: webpmux } = await import('node-webpmux')
            let buffer
            if (Buffer.isBuffer(content)) {
                buffer = content
            } else if (typeof content === 'string') {
                if (fs.existsSync(content)) {
                    buffer = fs.readFileSync(content)
                } else {
                    const res = await axios.get(content, { responseType: 'arraybuffer' })
                    buffer = Buffer.from(res.data)
                }
            }
            if (!buffer) throw new Error('Invalid sticker content')

            const isVideo = buffer.length >= 12 && (
                buffer.toString('ascii', 0, 4) === 'GIF8' ||
                buffer.toString('ascii', 4, 8) === 'ftyp' ||
                buffer.toString('ascii', 4, 8) === 'moov' ||
                (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3)
            )

            let webpBuf = buffer
            if (isVideo) {
                const { default: ffmpegStatic } = await import('ffmpeg-static')
                const { execFile } = await import('child_process')
                const { promisify } = await import('util')
                const execAsync = promisify(execFile)
                
                const tmpIn = `./stk_in_${Date.now()}.mp4`
                const tmpOut = `./stk_out_${Date.now()}.webp`
                fs.writeFileSync(tmpIn, buffer)
                
                try {
                    await execAsync(ffmpegStatic, [
                        '-i', tmpIn,
                        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,fps=15',
                        '-vcodec', 'libwebp',
                        '-lossless', '0',
                        '-compression_level', '6',
                        '-q:v', '50',
                        '-loop', '0',
                        '-preset', 'picture',
                        '-an', '-vsync', '0',
                        '-t', '6', '-y', tmpOut
                    ], { timeout: 30000 })
                    if (fs.existsSync(tmpOut)) {
                        webpBuf = fs.readFileSync(tmpOut)
                    }
                } catch (ffmpegErr) {
                    console.error('[STK FFMPEG ERR]', ffmpegErr.message)
                } finally {
                    if (fs.existsSync(tmpIn)) fs.unlinkSync(tmpIn)
                    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
                }
            } else {
                const { default: sharp } = await import('sharp')
                try {
                    const metadata = await sharp(buffer).metadata()
                    if (metadata.format !== 'webp') {
                        webpBuf = await sharp(buffer)
                            .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
                            .webp({ quality: 80 })
                            .toBuffer()
                    }
                } catch {}
            }

            try {
                const pack = options.packname || config.PACKNAME || 'AHMED-MD 🤖'
                const author = options.author || config.AUTHOR || 'ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !'
                const img = new webpmux.Image()
                await img.load(webpBuf)
                const json = {
                    "sticker-pack-id": "ahmed-md-" + Date.now(),
                    "sticker-pack-name": pack,
                    "sticker-pack-publisher": author,
                    "emojis": options.emojis || ["🤖"]
                }
                const exifHeader = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00])
                const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
                const exifBuffer = Buffer.concat([exifHeader, jsonBuffer])
                exifBuffer.writeUIntLE(jsonBuffer.length, 14, 4)
                img.exif = exifBuffer
                webpBuf = await img.save(null)
            } catch (exifErr) {
                console.error('[STK EXIF ERR]', exifErr.message)
            }

            const sendOpts = withQuote && !senderLid && !m.key.fromMe ? { quoted: m } : {}
            return await client.sendMessage(jid, { sticker: webpBuf, ...options }, sendOpts)
        } catch (err) {
            console.error(`[sendSticker ERR] ${err.message}`)
            throw err
        }
    }

    const smartSend = async (content, opts = {}, withQuote = false) => {
        const type = (opts.type || '').toLowerCase()
        if (type === 'sticker' || opts.sticker) {
            return await sendSticker(content, opts, withQuote)
        }
        const body = typeof content === 'string' ? { text: content, ...opts } : { ...content, ...opts }
        const quote = withQuote && !senderLid && !m.key.fromMe

        if (quote) {
            try { return await client.sendMessage(jid, body, { quoted: m }) } catch {}
        }
        try {
            return await client.sendMessage(jid, body)
        } catch (e1) {
            if (isGroup && typeof content === 'string') {
                try { return await client.sendMessage(jid, { text: content }) } catch {}
            }
            console.error(`[SEND ERR] ${e1.message}`)
        }
    }

    // ── Context mentions ──────────────────────────────────────
    const contentKey = Object.keys(m.message || {}).find(k =>
        k !== 'senderKeyDistributionMessage' && k !== 'messageContextInfo'
    )
    const mentionedJids = m.message?.[contentKey]?.contextInfo?.mentionedJid ||
                          m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    return {
        // ── Core identifiers ──────────────────────────────────
        key: m.key,
        jid,
        id:          client.user?.id || '',        // bot session id (Levanter spec)
        participant: rawSender,                     // sender JID (Levanter spec)
        sender: rawSender, senderNum, senderLid,
        pushName: m.pushName || 'User',
        text,
        isGroup,
        isAdmin, isBotAdmin, isOwner, isSuperOwner, isPublic,
        fromMe: m.key.fromMe,
        raw: m, client,

        // ── Message type & media ──────────────────────────────
        type: Object.keys(m.message || {})[0],
        msg: m.message,

        // ── Levanter spec booleans ────────────────────────────
        sudo: isOwner,                              // Levanter: sudo = owner/sudo user
        mention: mentionedJids,                     // Levanter: mention array of JIDs

        // ── Quoted / reply message ────────────────────────────
        quoted:        reply_message,               // Levanter uses .quoted
        reply_message,                              // our old name kept for compat

        // ── Current message media shortcuts ──────────────────
        image:    m.message?.imageMessage    || null,
        video:    m.message?.videoMessage    || null,
        audio:    m.message?.audioMessage    || null,
        sticker:  m.message?.stickerMessage  || null,
        document: m.message?.documentMessage || null,

        // ── Download current message media ───────────────────
        downloadAndSaveMediaMessage: async (filename = 'download') => {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys')
            const buffer = await downloadMediaMessage(m, 'buffer', {}, {
                logger: { info: () => {}, error: () => {}, warn: () => {} },
                reuploadRequest: client.updateMediaMessage
            })
            if (buffer) {
                const mime = m.message?.[contentKey]?.mimetype || ''
                let ext = 'bin'
                if (mime.includes('image')) ext = 'jpg'
                else if (mime.includes('video')) ext = 'mp4'
                else if (mime.includes('audio')) ext = 'mp3'
                else if (mime.includes('webp')) ext = 'webp'
                else if (mime.includes('pdf')) ext = 'pdf'
                else {
                    const fname = m.message?.[contentKey]?.fileName || ''
                    const parts = fname.split('.')
                    if (parts.length > 1) ext = parts.pop()
                }
                const fullFilename = `${filename}.${ext}`
                fs.writeFileSync(fullFilename, buffer)
                const { resolve } = await import('path')
                return resolve(fullFilename)
            }
            throw new Error('Failed to download media buffer')
        },

        // ── Sending methods ───────────────────────────────────
        reply: (content, opts = {}, type = '') => {
            const finalOpts = typeof opts === 'string' ? { type: opts } : { type, ...opts }
            return smartSend(content, finalOpts, true)
        },
        send: (content, opts = {}, type = '') => {
            // Levanter: send(content, options, type)
            const finalOpts = typeof opts === 'string' ? { type: opts } : { type, ...opts }
            return smartSend(content, finalOpts, false)
        },
        sticker: (content, opts = {}) => sendSticker(content, opts, true),

        sendMessage: async (targetJid, content, opts = {}, mediaType = '') => {
            const destJid = targetJid || jid
            const finalType = (mediaType || opts.type || '').toLowerCase()
            if (finalType === 'sticker' || opts.sticker) {
                return await sendSticker(content, { ...opts, type: 'sticker' }, false)
            }
            if (finalType) {
                let buffer = content
                if (typeof content === 'string' && !fs.existsSync(content) && content.startsWith('http')) {
                    const res = await axios.get(content, { responseType: 'arraybuffer' })
                    buffer = Buffer.from(res.data)
                }
                return await client.sendMessage(destJid, { [finalType]: buffer, ...opts })
            }
            const body = typeof content === 'string' ? { text: content, ...opts } : { ...content, ...opts }
            return await client.sendMessage(destJid, body)
        },

        sendFromUrl: async (url, options = {}, type = '') => {
            try {
                const res = await axios.get(url, { responseType: 'arraybuffer' })
                const buf = Buffer.from(res.data)
                let mediaType = type.toLowerCase()
                if (!mediaType) {
                    const contentType = res.headers['content-type'] || ''
                    if (contentType.includes('image')) mediaType = 'image'
                    else if (contentType.includes('video')) mediaType = 'video'
                    else if (contentType.includes('audio')) mediaType = 'audio'
                    else mediaType = 'document'
                }
                return await client.sendMessage(jid, { [mediaType]: buf, ...options }, { quoted: m })
            } catch (err) {
                console.error(`[sendFromUrl ERR] ${err.message}`)
                throw err
            }
        },

        react: async (emoji) => {
            try { await client.sendMessage(jid, { react: { text: emoji, key: m.key } }) } catch {}
        },

        // ── Group management (Levanter spec: Capital first letter) ──
        Add: async (participantJid, groupJid) => {
            const targetGroup = groupJid || jid
            return await client.groupParticipantsUpdate(targetGroup, [participantJid], 'add')
        },

        Kick: async (participantJid, groupJid) => {
            const targetGroup = groupJid || jid
            return await client.groupParticipantsUpdate(targetGroup, [participantJid], 'remove')
        },

        Promote: async (participantJid, groupJid) => {
            const targetGroup = groupJid || jid
            return await client.groupParticipantsUpdate(targetGroup, [participantJid], 'promote')
        },

        Demote: async (participantJid, groupJid) => {
            const targetGroup = groupJid || jid
            return await client.groupParticipantsUpdate(targetGroup, [participantJid], 'demote')
        },

        groupMetadata: async (groupJid, full = false) => {
            try {
                const meta = await client.groupMetadata(groupJid || jid)
                return meta
            } catch { return null }
        },

        inviteCode: async (groupJid) => {
            try {
                const code = await client.groupInviteCode(groupJid || jid)
                return code
            } catch { return null }
        },

        revokeInvite: async (groupJid) => {
            try {
                return await client.groupRevokeInvite(groupJid || jid)
            } catch { return null }
        },

        acceptInvite: async (code) => {
            try {
                return await client.groupAcceptInvite(code)
            } catch { return null }
        },

        leftFromGroup: async (groupJid) => {
            try {
                return await client.groupLeave(groupJid || jid)
            } catch { return null }
        },

        groupRequestList: async (groupJid) => {
            try {
                return await client.groupRequestParticipantsList(groupJid || jid)
            } catch { return [] }
        },

        groupRequestAction: async (participants, action, groupJid) => {
            try {
                return await client.groupRequestParticipantsUpdate(groupJid || jid, participants, action)
            } catch { return null }
        },

        // ── User & Privacy (Levanter spec) ────────────────────
        Block: async (targetJid) => {
            try { return await client.updateBlockStatus(targetJid, 'block') } catch { return null }
        },

        Unblock: async (targetJid) => {
            try { return await client.updateBlockStatus(targetJid, 'unblock') } catch { return null }
        },

        onWhatsapp: async (targetJid) => {
            try {
                const result = await client.onWhatsApp(
                    Array.isArray(targetJid) ? targetJid : [targetJid]
                )
                return result
            } catch { return [] }
        },

        fetchStatus: async (targetJid) => {
            try { return await client.fetchStatus(targetJid) } catch { return null }
        },

        updateProfilePicture: async (buffer, targetJid) => {
            try {
                return await client.updateProfilePicture(targetJid || jid, buffer)
            } catch { return null }
        },

        profilePictureUrl: async (targetJid) => {
            try {
                return await client.profilePictureUrl(targetJid || jid, 'image')
            } catch { return null }
        },

        // ── Misc helpers ──────────────────────────────────────
        groupMeta: async () => { try { return await client.groupMetadata(jid) } catch { return null } },
        clearChat: async (chatJid) => {
            const target = chatJid || jid
            await client.chatModify({
                clear: true,
                lastMessages: [{ key: m.key, messageTimestamp: m.messageTimestamp }]
            }, target)
        }
    }
}

export { serialize, extractText, isLid, toNumber }

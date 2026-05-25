import { bot } from '../lib/handler.js'

const styles = [
    {
        name: 'Bubble',
        upper: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏ',
        lower: 'ⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ',
        digits: '⓪①②③④⑤⑥⑦⑧⑨'
    },
    {
        name: 'Small Caps',
        upper: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
        lower: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ',
        digits: '0123456789'
    },
    {
        name: 'Bold Serif',
        upper: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙',
        lower: '𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳',
        digits: '𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗'
    },
    {
        name: 'Italic Serif',
        upper: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍',
        lower: '𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚展开𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧',
        digits: '0123456789'
    },
    {
        name: 'Double Struck',
        upper: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ',
        lower: '𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫',
        digits: '𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡'
    },
    {
        name: 'Fraktur',
        upper: '𝔄𝔅𝔖𝔇𝔈𝔉𝔊𝔋𝔌𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔𝔕𝔖𝔗𝔘𝔙𝔚𝔛𝔜𝔟',
        lower: '𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔨𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷',
        digits: '0123456789'
    },
    {
        name: 'Square',
        upper: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🄲🅁🅂🅃🅄🅅🅆🅇🅈🅏',
        lower: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🄲🅁🅂🅃🅄🅅🅆🅇🅈🅏',
        digits: '0123456789'
    }
]

function stylize(text, style) {
    let result = ''
    const upperArr = Array.from(style.upper)
    const lowerArr = Array.from(style.lower)
    const digitArr = Array.from(style.digits)

    for (let char of text) {
        const code = char.charCodeAt(0)
        if (code >= 65 && code <= 90) {
            result += upperArr[code - 65] || char
        } else if (code >= 97 && code <= 122) {
            result += lowerArr[code - 97] || char
        } else if (code >= 48 && code <= 57) {
            result += digitArr[code - 48] || char
        } else {
            result += char
        }
    }
    return result
}

bot({
    pattern: 'fancy ?(.*)',
    desc: 'Convert text into fancy stylish fonts',
    type: 'utility'
}, async (msg, match, args) => {
    if (!args || !args.trim()) {
        return msg.reply(
            `✨ *Fancy Fonts Styler*\n` +
            `━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `*Usage:* \`.fancy [text]\`\n\n` +
            `*Example:* \`.fancy Hello World\`\n\n` +
            `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
        )
    }

    const input = args.trim()
    let replyText = `✨ *Fancy Fonts stylings for:* _${input}_\n━━━━━━━━━━━━━━━━━━━━━\n\n`

    styles.forEach(style => {
        const formatted = stylize(input, style)
        replyText += `*${style.name}:*\n\`\`\`${formatted}\`\`\`\n\n`
    })

    replyText += `> ᴅᴇᴠᴇʟᴏᴘᴇᴅ ʙʏ ᴀʜᴍᴇᴅ !`
    await msg.reply(replyText)
})

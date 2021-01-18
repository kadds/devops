const { m_tokens } = require('./data')

let tokens = new Map()

const TOKEN_TIME = 1000 * 60 * 60 * 24

async function read_tokens() {
    try {
        const res = await m_tokens.findAll()
        const now = Date.now().valueOf()
        for (const val of res) {
            if (now - val.content.time <= TOKEN_TIME) {
                tokens.set(val.token, val.content)
            }
        }
        await update_all_tokens_db()
    }
    catch (e) { }
}

(async () => {
    try {
        await read_tokens()
    }
    catch (e) { }
})()

function update_all_tokens_db() {
    (async () => {
        try {
            const dt = Date.now().valueOf() - TOKEN_TIME
            await m_tokens.destroy({ where: { mtime: { $less: dt } } })
        }
        catch (e) { }
    })()
}

function maketoken() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*.%=@!~`"

    const len = Math.floor(Math.random() * 10) + 180;

    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

function valid_token(token) {
    const t = tokens.get(token)
    if (t === undefined) return null
    if (Date.now().valueOf() - t.time.valueOf() > TOKEN_TIME) {
        delete_token(token)
        return null
    }
    return t
}

function create_token(data) {
    for (; ;) {
        const key = maketoken()
        if (tokens.has(key)) {
            continue
        }
        const obj = { time: Date.now(), data }

        m_tokens.create({ token: key, content: obj }).then(_ => { console.log('new token') }).catch(e => { console.error(e) })
        update_all_tokens_db()

        tokens.set(key, obj)
        return key
    }
}

function delete_token(token) {
    return tokens.delete(token)
}


module.exports = { valid_token, create_token, delete_token }
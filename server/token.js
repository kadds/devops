// a string like session

let tokens = new Map()

function maketoken() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*.%=@!~`"

    const len = Math.floor(Math.random() * 5) + 15;

    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

function valid_token(token) {
    const t = tokens.get(token)
    if (t === undefined) return null
    return t
}

function create_token(data) {
    for (; ;) {

        const key = maketoken()
        if (tokens.has(key)) {
            continue
        }
        tokens.set(key, { time: Date.now(), data })
        return key
    }
}

function delete_token(token) {
    return tokens.delete(token)
}


module.exports = { valid_token, create_token, delete_token }
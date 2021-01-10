function random_salt() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*.%=@!~"

    const len = 16;

    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

module.exports = { random_salt }
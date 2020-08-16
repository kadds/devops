const fs = require('fs')
const process = require('process')

let tokens = new Map()

function replacer(key, value) {
    const originalObject = this[key];
    if (originalObject instanceof Map) {
        return {
            dataType: 'Map',
            value: Array.from(originalObject.entries()), // or with spread: value: [...originalObject]
        };
    } else {
        return value;
    }
}

function reviver(key, value) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
    }
    return value;
}

function save() {
    const str = JSON.stringify(tokens, replacer)
    try {
        if (!fs.existsSync('./temp'))
            fs.mkdirSync('./temp')
        fs.writeFileSync('./temp/loginInfo.json', str)
    }
    catch (e) {
        console.log(e)
    }
}

if (process.platform === "win32") {
    var rl = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    })

    rl.on("SIGINT", function () {
        save()
        process.exit()
    })
}


// a string like session


process.on("SIGINT", function () {
    //graceful shutdown
    save()
    process.exit()
})

try {
    const json = fs.readFileSync('./temp/loginInfo.json')
    if (json !== undefined && json !== null) {
        tokens = new Map(JSON.parse(json, reviver))
    }
}
catch (e) {
    console.log(e)
}

function maketoken() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*.%=@!~`"

    const len = Math.floor(Math.random() * 5) + 30;

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
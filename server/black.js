const fs = require('fs')
const readline = require('readline')
const process = require('process')
let map = new Map()

let black_list_map = new Map()

async function read_black_list() {
    try {
        const stream = fs.createReadStream('./temp/blackList.txt')
        const rl = readline.createInterface({
            input: stream,
            crlfDelay: Infinity
        })

        for await (const line of rl) {
            black_list_map.set(line, null)
        }
    }
    catch (e) { }
}

async function save_black_list() {
    let data = ''
    for (const m of black_list_map) {
        data = data + m[0] + '\n'
    }
    fs.writeFileSync('./temp/blackList.txt', data)
}

process.on("SIGINT", function () {
    save_black_list().then(v => {
        process.exit()
    }).catch(e => {
        process.exit()
    })
})

setTimeout(() => save_black_list(), 1000 * 60 * 60)

read_black_list()


function add_black_list(address) {
    black_list_map.set(address, null)
}

function enqueue(address) {
    address = address + ''
    if (black_list_map.has(address)) {
        return false
    }

    if (map.has(address)) {
        const t = map.get(address)
        const dead = Date.now() - 60 * 60 * 1000
        t.try.push(Date.now())

        const idx = t.try.reverse().findIndex(v => { v < dead })
        if (idx >= 0) {
            t.try.splice(0, t.try.length - idx)
        }

        if (t.try.length > 3) {
            add_black_list(address)
            map.delete(address)
            return false
        }
    }
    else {
        map.set(address, { try: [Date.now()] })
    }
    return true
}

module.exports = { enqueue }
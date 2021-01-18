const { m_blacklist } = require('./data')

let map = new Map()
let black_list_map = new Map()

async function read_black_list() {
    try {
        const res = await m_blacklist.findAll()
        for (const obj of res) {
            black_list_map.set(obj.address, null)
        }
    }
    catch (e) { }
}

(async () => {
    try {
        await read_black_list()
    }
    catch (e) { }
})()

function add_black_list(address) {
    black_list_map.set(address, null)
    m_blacklist.create({ address }).then(_ => { }).catch(e => { console.error(e) })
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
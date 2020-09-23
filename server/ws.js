let idMap = new Map();

function makeid() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

    const len = Math.floor(Math.random() * 3) + 50;

    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

function new_ws_id(log_id) {
    for (; ;) {
        const key = makeid()
        if (idMap.has(key)) {
            continue
        }
        idMap.set(key, { time: Date.now(), log_id })
        return key
    }
}

const timeout_span = 60 * 1000

function valid_ws_id(id) {
    const m = idMap.get(id)
    if (m && (Date.now().valueOf() - m.time.valueOf()) < timeout_span) {

        idMap.delete(id)
        return m.log_id
    }
    idMap.delete(id)
    return null
}

setInterval(() => {
    const v = []
    for (const m of idMap.entries()) {
        if (Date.now().valueOf() - (m[1].time.valueOf()) >= timeout_span) {
            v.push(m[0])
        }
    }
    for (const k of v) {
        idMap.delete(k)
    }
}, timeout_span * 60)

module.exports = { new_ws_id, valid_ws_id }

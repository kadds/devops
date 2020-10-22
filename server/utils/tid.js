const dict = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const offset = 10000000000n

function tid2text(tid) {
    let ret = []
    let v = BigInt(tid) + offset
    let empty = 0n
    while (v > empty) {
        let rest = Number(v % 62n)
        let r = v / 62n
        ret.push(dict[rest])
        v = r
    }
    return ret.reverse().join('')
}

function text2tid(text) {
    let v = BigInt(0)
    for (let i = 0; i < text.length; i++) {
        const c = text[text.length - i - 1]
        let delta = 0
        if (c >= '0' && c <= '9') {
            delta = c.charCodeAt(0) - '0'.charCodeAt(0)
        }
        else if (c >= 'a' && c <= 'z') {
            delta = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10
        }
        else if (c >= 'A' && c <= 'Z') {
            delta = c.charCodeAt(0) - 'A'.charCodeAt(0) + 36
        }
        else {
            throw new Error('Unknown char ' + c + ' to cast')
        }
        v = v + BigInt(delta) * 62n ** BigInt(i)
    }
    v -= offset
    if (v < 0n) {
        throw new Error('Invalid text to cast. result is ' + v.toString())
    }
    return v.toString()
}

module.exports = { text2tid, tid2text }
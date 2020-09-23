const fs = require('fs').promises
const path = require('path')
async function remove(id) {
    const path_val = path.join(`${__dirname}/../upload/log/${id}.log`)
    await fs.unlink(path_val)
}

function log_path(id) {
    const path_val = path.join(`${__dirname}/../upload/log/${id}.log`)
    return path_val
}

class LogStream {
    constructor(id) {
        const path_val = path.join(`${__dirname}/../upload/log/${id}.log`)
        this.path = path_val
        this.buf = Buffer.allocUnsafe(4096)
        this.pos = 0
        this.size = 4096
        this.file = null
        this.closed = true
        this.listener = []
    }

    async init() {
        try {
            await fs.mkdir(path.dirname(this.path))
        }
        catch (e) {

        }
        this.file = await fs.open(this.path, 'w+')
        this.closed = false
    }

    async flush() {
        if (this.closed) return
        if (this.timer) {
            clearTimeout(this.timer)
        }
        await this.file.write(this.buf, 0, this.pos)
        this.pos = 0
    }

    async write(str) {
        if (this.closed) return
        for (const fn of this.listener) {
            fn(str)
        }
        let str_pos = 0
        // console.log('write ' + str)
        while (1) {
            const len = this.buf.write(str.substr(str_pos, str.length - str_pos), this.pos)
            this.pos += len
            // console.log(this.pos, len, str_pos)
            if (str.length - str_pos > len) {
                await this.flush()
                str_pos += len
            }
            else {
                this.timer = setTimeout(() => {
                    this.flush()
                }, 2000)
                return
            }
        }
    }

    async split(type) {
        await this.write('========\n')
        await this.write(type)
        await this.write('\n========\n')
        console.log(type)
    }

    async close() {
        await this.flush()
        this.closed = true
        for (const fn of this.listener) {
            fn(null)
        }
        await this.file.close()
    }

    add_listener(fn) {
        this.listener.push(fn)
    }
    rm_listener(fn) {
        const idx = this.listener.findIndex((v) => { return v === fn })
        if (idx >= 0)
            this.listener.splice(idx, 1)
    }
}

module.exports = { LogStream, remove, log_path }
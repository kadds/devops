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
        this.in_flush = false
        this.flush_funcs = { next: null, back: null }
        this.flush_funcs.back = this.flush_funcs
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

    async init_none() {
        this.closed = false
    }

    async flush() {
        if (this.file === null) {
            return
        }
        if (this.file === null) {
            return
        }
        if (this.closed || this.in_flush) return
        if (this.timer) {
            clearTimeout(this.timer)
        }
        this.in_flush = true
        await this.file.write(this.buf, 0, this.pos)
        this.pos = 0
        this.in_flush = false
        this.wake_up()
    }

    wake_up() {
        if (this.file === null) {
            return
        }
        if (this.flush_funcs.next) {
            const node = this.flush_funcs.next
            this.flush_funcs.next = node.next
            if (this.flush_funcs.next === null) {
                this.flush_funcs.back = this.flush_funcs
            }
            // wake up
            node.fn()
        }
    }

    async wait_flush() {
        if (this.file === null) {
            return
        }
        return new Promise((resolve, reject) => {
            this.flush_funcs.back.next = { next: null, fn: resolve }
            this.flush_funcs.back = this.flush_funcs.back.next
        })
    }

    async write(str) {
        if (this.file === null) {
            return
        }
        if (this.closed) return
        for (const fn of this.listener) {
            fn(str)
        }
        let str_pos = 0
        // console.log('write ' + str)
        while (1) {
            while (this.in_flush) {
                await this.wait_flush()
            }
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
                if (!this.in_flush)
                    this.wake_up()
                return
            }
        }
    }

    async split(type) {
        await this.write('==================\n')
        await this.write(type)
        await this.write('\n==================\n')
    }

    async close() {
        if (this.file === null) {
            return
        }
        await this.flush()
        this.closed = true
        for (const fn of this.listener) {
            fn(null)
        }
        await this.file.close()
    }

    get_current_buf() {
        if (this.file === null) {
            return ''
        }
        return this.buf.toString('utf8', 0, this.pos)
    }

    add_listener(fn) {
        this.listener.push(fn)
    }
    rm_listener(fn) {
        const idx = this.listener.findIndex((v) => { return v === fn })
        if (idx >= 0) {
            this.listener.splice(idx, 1)
            return true
        }
        return false
    }
}

module.exports = { LogStream, remove, log_path }
const { Router } = require('express')
const formidable = require('formidable')
const fs = require('fs')

let router = new Router()

router.post('/', (req, rsp, next) => {
    // new upload
    const form = formidable({ multiples: false })
    form.parse(req, (err, fields, files) => {
        if (err) {
            next(err)
            return
        }
        console.log({ fields, files })
        rsp.json({ err: 0 })
    })
})


function writeFile(filename, data) {
    return new Promise((resolve, reject) => {
        fs.writeFile(filename, data, (err, data) => {
            if (err) {
                reject(err);
            }
            resolve()
        });
    })
}


function readFile(filename) {
    return new Promise((resolve, reject) => {
        fs.readFile(filename, 'utf-8', (err, data) => {
            if (err) {
                reject(err)
            } else {
                resolve(data)
            }
        })
    })
}

function readdir(dir) {
    return new Promise((resolve, reject) => {
        fs.readdir(dir, {}, (err, files) => {
            if (err) {
                reject(err)
            }
            else {
                resolve(files)
            }
        })
    })
}


router.post('/script', async (req, rsp, next) => {
    const name = req.body.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        jsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    await writeFile('./upload/scripts/' + name, req.body.data)
    rsp.json({ err: 0 })
})

router.get('/list', async (req, rsp, next) => {
    let list = await readdir('./upload/scripts')
    rsp.json({ err: 0, list })
})

router.get('/:name', async (req, rsp, next) => {
    const name = req.params.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        rsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    let data = await readFile('./upload/scripts/' + name)
    rsp.json({ err: 0, data })
})

const upload = router

module.exports = upload

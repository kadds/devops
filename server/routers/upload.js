const { Router } = require('express')
const fs = require('fs').promises

let router = new Router()

router.post('/script', async (req, rsp, next) => {
    const name = req.body.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        jsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    await fs.writeFile(__dirname + '/../upload/scripts/' + name, req.body.data)
    rsp.json({ err: 0 })
})

router.get('/list', async (req, rsp, next) => {
    try {
        let list = await fs.readdir(__dirname + '/../upload/scripts')
        rsp.json({ err: 0, list })
        return
    }
    catch (e) {
        console.error(e)
        try {
            await fs.mkdir(__dirname + '/../upload/scripts')
        }
        catch (e) { }
        rsp.json({ err: 0, list: [] })
    }
})

router.get('/:name', async (req, rsp, next) => {
    const name = req.params.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        rsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    let data = await fs.readFile(__dirname + '/../upload/scripts/' + name)
    rsp.json({ err: 0, data: data.toString() })
})

const upload = router

module.exports = upload

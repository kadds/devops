const { Router } = require('express')
const process = require('process')

let router = new Router()

router.post('/restart', async (req, rsp, next) => {
    // restart
    setTimeout(function () {
        process.on("exit", function () {
            require("child_process").spawn(process.argv.shift(), process.argv, {
                cwd: process.cwd(),
                detached: true,
                stdio: "inherit"
            })
        })
        process.exit()
    }, 1000)
    rsp.json({ err: 0 })
})

module.exports = router
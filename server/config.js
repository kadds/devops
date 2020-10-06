const TOML = require('@iarna/toml')
const fs = require('fs').promises

let config = null
async function load() {
    const data = (await fs.readFile(__dirname + '/config.toml')).toString()
    config = await TOML.parse.async(data)
}

function get() {
    return config
}

module.exports = { load, get }
const fs = require('fs').promises

async function get_script_content(name) {
    const sc = await fs.readFile(__dirname + '/../upload/scripts/' + name)
    return sc.toString()
}

module.exports = { get_script_content }
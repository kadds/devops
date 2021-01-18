const { m_script } = require('../data')
async function get_script_content(name) {
    const data = await m_script.findByPk(name)
    return data.content
}

module.exports = { get_script_content }
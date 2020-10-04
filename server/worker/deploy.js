const { m_deploy_stream } = require('../data')
const { Op } = require('sequelize')
const FLAGS = require('../flags')
function run() {
    const time = new Date().valueOf()
    const tasks = m_deploy_stream.findAll({
        where: {
            target_time: { [Op.lte]: time },
            status: { [Op.eq]: FLAGS.DEPLOY_STREAM_STATUS_PREPARE }
        }
    })
    for (const task of tasks) {
        if (task.op === 0) {
            // upload
        }
        else if (task.op === 1) {
            // rollback
        }
    }
}

function init() {
    setInterval(run, 5000)
}
const NodeSSH = require('node-ssh').NodeSSH

async function check_connection(ip, port, password, private_key, user) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 1000
    })
}

module.exports = { check_connection }
const { exec } = require('../../../utils/vmutils')

async function install_deps_pacman(ssh, deps, logger) {
    await exec(ssh, 'pacman -Sy --noconfirm', null, logger)
    await exec(ssh, 'pacman -S --noconfirm --needed ' + deps.join(' '), null, logger)
}

async function install_deps_apt(ssh, deps, logger) {
    await exec(ssh, 'apt update ', null, logger)
    // await exec(ssh, 'apt upgrade ', null, logger)
    await exec(ssh, 'apt install --no-install-recommends ' + deps.join(' '), null, logger)
}

async function install_deps_apk(ssh, deps, logger) {
    await exec(ssh, 'apk update ', null, logger)
    // await exec(ssh, 'apt upgrade ', null, logger)
    await exec(ssh, 'apk add --no-progress ' + deps.join(' '), null, logger)
}

async function install_deps(ssh, deps, logger) {
    let type = 'none'
    try {
        await exec(ssh, 'pacman --version', null, logger)
        type = 'pacman'
    }
    catch (e) {
    }
    try {
        await exec(ssh, 'apt --version', null, logger)
        type = 'apt'
    }
    catch (e) {
    }
    try {
        await exec(ssh, 'apk --version', null, logger)
        type = 'apk'
    }
    catch (e) {
    }

    if (type === 'pacman')
        await install_deps_pacman(ssh, deps, logger)
    else if (type === 'apt')
        await install_deps_apt(ssh, deps, logger)
    else if (type === 'apk')
        await install_deps_apk(ssh, deps, logger)
}

module.exports = { install_deps }
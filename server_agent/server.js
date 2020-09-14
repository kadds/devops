
async function start(name) {
    console.log('try start ' + name)
    return { err: '' }
}

async function stop(name) {
    console.log('try stop ' + name)
    return { err: '' }
}

async function restart(name) {
    console.log('try restart ' + name)
    return { err: '' }
}

async function init(name) {
    console.log('try init ' + name)
    return { err: '' }
}

async function destroy(name) {
    console.log('try destroy ' + name)
    return { err: '' }
}

module.exports = { start, stop, init, destroy, restart }

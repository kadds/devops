let jobs_define = []

function get_job_list() {
    return jobs_define
}

let job_map = new Map()

function init() {
    const jobs = ['./jobs/git_checkout', './jobs/docker_env', './jobs/yarn', './jobs/file_transfer', './jobs/bare_env', './jobs/devops']
    for (let j of jobs) {
        const job = require(j)
        job_map.set(job.name, job)
        let job_def = {}
        job_def.name = job.name
        job_def.description = job.description
        job_def.tag = job.tag
        job_def.type = job.type
        job_def.params = job.params
        job_def.pipeline_params = job.pipeline_params
        jobs_define.push(job_def)
    }
}

async function job_param_valid(job_name, param) {
    const job = job_map.get(job_name)
    if (job) {
        return await job.entry('valid', param)
    }
    return 'job not find'
}

async function run_job(job_name, param, opt) {
    const job = job_map.get(job_name)
    if (job) {
        return await job.entry('run', param, opt)
    }
    throw 'job not find'
}

async function close_job(job_name, param, opt) {
    const job = job_map.get(job_name)
    if (job) {
        return await job.entry('close', param, opt)
    }
    throw 'job not find'
}

async function get_job_deps(job_name) {
    const job = job_map.get(job_name)
    if (job) {
        return await job.deps
    }
    throw 'job not find'
}

async function get_job_pipeline_params(job_name) {
    const job = job_map.get(job_name)
    if (job) {
        return await job.pipeline_params
    }
    throw 'job not find'
}

init()

module.exports = { get_job_list, job_param_valid, run_job, get_job_deps, get_job_pipeline_params, close_job }

import { get, post } from './comm'

async function get_pipelines() {
    return (await get('/pipeline/list')).list
}

async function get_jobs() {
    return (await get('/pipeline/jobs')).list
}

async function jobs_valid(name, param) {
    return (await post('/pipeline/jobs/valid', { job: { name, param } }, { timeout: 10000000 })).data
}

async function create_pipeline(mode_name, mark) {
    return (await post('/pipeline/', { pipeline: { mark, mode_name } }))
}

async function delete_pipeline(id) {
    return (await post('/pipeline/del', { id }))
}

async function get_pipeline(id) {
    return (await get('/pipeline?id=' + id)).data
}

async function get_pipeline_log_id(id) {
    return (await post('/pipeline/log', { id })).data
}

export { get_pipelines, get_jobs, jobs_valid, create_pipeline, delete_pipeline, get_pipeline, get_pipeline_log_id }

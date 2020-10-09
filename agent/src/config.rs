use serde::Deserialize;
use std::sync::Arc;
use toml;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mongodb {
    pub uri: String,
    pub dbname: String,
    pub vm_monitor_column_name: String,
    pub server_monitor_column_name: String,
    pub log_column_name: String,
    pub click_log_column_name: String,
    pub server_info_column_name: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Logger {
    pub bind: String,
    pub port: u16,
    pub max_size: u32,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Monitor {
    pub interval: u64,
    pub eth: String,
    pub block: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub mongodb: Mongodb,
    pub logger: Logger,
    pub monitor: Monitor,
}

static mut CONFIG_VALUE: Option<Arc<Config>> = None;

pub async fn load(path: &str) {
    let data = tokio::fs::read(path)
        .await
        .expect("config file is not find.");
    unsafe {
        CONFIG_VALUE = Some(Arc::new(
            toml::from_slice(&data).expect("config field is not exist."),
        ));
    }
}

pub fn get() -> Arc<Config> {
    unsafe {
        if let Some(v) = &CONFIG_VALUE {
            return Arc::clone(&v);
        }
    }
    // must be loaded when call it
    panic!("unknown state");
}

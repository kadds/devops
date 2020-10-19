use super::config;
use mongodb::{Client, Collection, Database};

static mut DATABASE: Option<Database> = None;

async unsafe fn connect_mongodb() {
    if DATABASE.is_some() {
        return;
    }
    let uri = &config::get().mongodb.uri;
    let client = match Client::with_uri_str(&uri).await {
        Ok(c) => c,
        Err(err) => {
            eprintln!("{}", err);
            return;
        }
    };
    DATABASE = Some(client.database(&config::get().mongodb.dbname));
}

pub async fn mongo_vm_monitor() -> Option<Collection> {
    unsafe {
        connect_mongodb().await;
        if let Some(db) = &DATABASE {
            return Some(db.collection(&config::get().mongodb.vm_monitor_column_name));
        }
    }
    None
}

pub async fn mongo_log() -> Option<Collection> {
    unsafe {
        connect_mongodb().await;
        if let Some(db) = &DATABASE {
            return Some(db.collection(&config::get().mongodb.log_column_name));
        }
    }
    None
}

pub async fn mongo_click_log() -> Option<Collection> {
    unsafe {
        connect_mongodb().await;
        if let Some(db) = &DATABASE {
            return Some(db.collection(&config::get().mongodb.click_log_column_name));
        }
    }
    None
}

pub async fn mongo_server_monitor() -> Option<Collection> {
    unsafe {
        connect_mongodb().await;
        if let Some(db) = &DATABASE {
            return Some(db.collection(&config::get().mongodb.server_monitor_column_name));
        }
    }
    None
}

pub async fn mongo_server_rpc() -> Option<Collection> {
    unsafe {
        connect_mongodb().await;
        if let Some(db) = &DATABASE {
            return Some(db.collection(&config::get().mongodb.server_rpc_statistics_column_name));
        }
    }
    None
}

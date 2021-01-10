use super::config;
use mongodb::{Client, Collection};
use mongodb::bson::Document;
use tokio::sync::{mpsc, mpsc::error, RwLock};
use tokio::time::timeout;
use std::{time::Duration};
use std::sync::{Arc, atomic::{AtomicBool, Ordering}};

lazy_static!{
    static ref MONGO_CLIENT: RwLock<Option<Client>> = RwLock::default();
}

const BATCH_BUFFER_SIZE: usize = 200;

pub struct DBTarget {
    pub column_name: String,
    pub sender: mpsc::Sender<Document>,
    pub stop: AtomicBool,
}

async fn connect_mongodb(column_name: &str) -> Option<Collection> {
    unsafe  {
        if let Some(client) = MONGO_CLIENT.read().await.as_ref() {
            let db = client.database(&config::get().mongodb.dbname);
            return Some(db.collection(column_name));
        }
    }

    unsafe {
        let mut writer = MONGO_CLIENT.write().await;
        if let Some(client) = writer.as_ref() {
            let db = client.database(&config::get().mongodb.dbname);
            return Some(db.collection(column_name));
        }
        let uri = &config::get().mongodb.uri;
        let client = match Client::with_uri_str(&uri).await {
            Ok(c) => c,
            Err(err) => {
                eprintln!("{}", err);
                return None;
            }
        };
        *writer = Some(client.clone());
        let db = client.database(&config::get().mongodb.dbname);
        println!("connect mongodb {}", column_name);
        return Some(db.collection(column_name));
    }
}

async fn do_mongo_send(data: Vec<Document>, collection: Collection) {
    for _ in 0..3 {
        if let Err(e) = collection.insert_many(data.clone(), None).await {
            eprintln!("mongo {}", e);
        }
        break
    }
}

impl DBTarget {
    pub fn new(column_name: String, rx: mpsc::Sender<Document>) -> Self {
        DBTarget {
            sender: rx,
            column_name,
            stop: AtomicBool::default(),
        }
    }

    pub async fn send(&self, doc: Document) ->  Result<(), error::SendTimeoutError<Document>> {
        if let Err(e) = self.sender.clone().send_timeout(doc, Duration::from_millis(100)).await {
            eprintln!("timeout 100ms");
            return Err(e);
        }
        Ok(())
    }

    pub async fn run(self: Arc<Self>, mut tx: mpsc::Receiver<Document>) {
        let mut data = Vec::new();
        let duration=  Duration::from_secs(1);
        println!("running batch queue {}", self.column_name);
        while !self.stop.load(Ordering::Relaxed) {
            let mut need_send = false;
            match timeout(duration,tx.recv()).await {
                Ok(v) =>  {
                    if let Some(v) = v {
                        data.push(v);
                        if data.len() > BATCH_BUFFER_SIZE {
                            need_send = true;
                        }
                    }
                },
                Err(_) => {
                    need_send = true;
                }
            } 

            if need_send && data.len() > 0 {
                match connect_mongodb(&self.column_name).await {
                    Some(col) => { tokio::spawn(do_mongo_send(data, col)); },
                    None => {
                        eprintln!("connect mongodb fail, logs {}", data.len())
                    }
                }
                data = Vec::new();
            }
        }
    }
}

lazy_static!{
    static ref DB_APP_LOG: RwLock<Option<Arc<DBTarget>>> = RwLock::default();
    static ref DB_CLICK_LOG: RwLock<Option<Arc<DBTarget>>> = RwLock::default();
    static ref DB_VM_MONITOR: RwLock<Option<Arc<DBTarget>>> = RwLock::default();
    static ref DB_SERVER_MONITOR: RwLock<Option<Arc<DBTarget>>> = RwLock::default();
    static ref DB_SERVER_RPC: RwLock<Option<Arc<DBTarget>>> = RwLock::default();
}

async fn mongo_comm(name: &str, logger: &RwLock<Option<Arc<DBTarget>>>) -> Arc<DBTarget> {
    if let Some(db) = logger.read().await.as_ref(){
        if db.column_name == name {
            return db.clone();
        }
    }

    let mut writer = logger.write().await;
    if let Some(db) = writer.as_ref() {
        if db.column_name == name {
            return db.clone();
        }
        else {
            db.stop.store(true, Ordering::SeqCst);
        }
    }

    let (rx, tx) = mpsc::channel(BATCH_BUFFER_SIZE);
    let db = Arc::new(DBTarget::new(name.to_owned(), rx));
    *writer = Some(db.clone());
    tokio::spawn(db.clone().run(tx));
    println!("new mongo comm queue {}", name);
    db
}

pub async fn mongo_vm_monitor() -> Arc<DBTarget> {
    unsafe {mongo_comm(&config::get().mongodb.vm_monitor_column_name, &DB_VM_MONITOR).await}
}

pub async fn mongo_app_log() -> Arc<DBTarget> {
    unsafe {mongo_comm(&config::get().mongodb.log_column_name, &DB_APP_LOG).await}
}

pub async fn mongo_click_log() -> Arc<DBTarget> {
    unsafe {mongo_comm(&config::get().mongodb.click_log_column_name, &DB_CLICK_LOG).await}
}

pub async fn mongo_server_monitor() -> Arc<DBTarget> {
    unsafe {mongo_comm(&config::get().mongodb.server_monitor_column_name, &DB_SERVER_MONITOR).await}
}

pub async fn mongo_server_rpc() -> Arc<DBTarget> {
    unsafe {mongo_comm(&config::get().mongodb.server_rpc_statistics_column_name, &DB_SERVER_RPC).await}
}

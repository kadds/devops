use super::config;
use super::db;
use super::signal;

use mongodb::bson::doc;
use mongodb::*;
use std::time::SystemTime;
use tokio::net::{TcpListener, TcpStream};
use tokio::prelude::*;
use tokio::sync::broadcast;

async fn send_mongodb(logger: Collection, doc: bson::Document) {
    let ret = logger.insert_one(doc, None).await;
    if ret.is_err() {
        eprintln!("save to mongodb fail {}", ret.unwrap_err());
    // retry after 5 seconds 3 times
    } else {
        return;
    }
}

async fn do_app_log(log: String) {
    let logger = match db::mongo_log().await {
        Some(v) => v,
        None => {
            return;
        }
    };
    // type(0) vid timestamp(13) tid serverName level detail
    let mut list = log.splitn(7, |c: char| c.is_ascii_whitespace()).skip(1);
    let vid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let timestamp: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let tid: &str = list.next().unwrap_or("");
    let server_name: &str = list.next().unwrap_or("");
    let level: &str = list.next().unwrap_or("");
    let detail: &str = list.next().unwrap_or("");
    let doc = doc! {
        "vi": vid,
        "ts": timestamp,
        "ti": tid,
        "sn": server_name,
        "le": level,
        "lo": detail
    };

    send_mongodb(logger, doc).await;
}

async fn do_click_log(log: String) {
    let logger = match db::mongo_click_log().await {
        Some(v) => v,
        None => {
            return;
        }
    };
    // type(1) vid timestamp(13) tid serverName cost method url host returnCode returnLength
    let mut list = log.split_ascii_whitespace().skip(1);
    let vid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let timestamp: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let tid: &str = list.next().unwrap_or("");
    let server_name: &str = list.next().unwrap_or("");
    let cost: u32 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let method: &str = list.next().unwrap_or("");
    let url: &str = list.next().unwrap_or("");
    let host: &str = list.next().unwrap_or("");
    let return_code: i64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let return_length: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let doc = doc! {
        "vi": vid,
        "ts": timestamp,
        "ti": tid,
        "sn": server_name,
        "co": cost,
        "me": method,
        "ur": url,
        "ho": host,
        "rc": return_code,
        "rl": return_length
    };
    send_mongodb(logger, doc).await;
}

async fn do_server_rpc_log(log: String) {
    let logger = match db::mongo_server_rpc().await {
        Some(v) => v,
        None => {
            return;
        }
    };
    // type(2) serverName rpcInterfaceName tid timestamp(13) cost returnCode tid timestamp(13) cost returnCode
    let mut list = log.split_ascii_whitespace().skip(1);
    let server_name = list.next().unwrap_or("");
    let function_name = list.next().unwrap_or("");
    let mut docs = vec![];

    while let Some(tid) = list.next() {
        let ts: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
        let cost: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
        let error_code: i64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
        docs.push(doc! {
            "sn": server_name.clone(),
            "rn": function_name.clone(),
            "ts": ts,
            "ti": tid,
            "co": cost,
            "rc": error_code,
        });
    }
    let ret = logger.insert_many(docs, None).await;
    if ret.is_err() {
        eprintln!("save to mongodb fail (rpc_log) {}", ret.unwrap_err());
    }
}

async fn do_log(log: String, max_size: u32) {
    if log.starts_with('0') {
        // remove last \n
        let mut log = log;
        if log.ends_with('\n') {
            log.truncate(log.len() - 1);
        }
        // size overflow
        log.truncate(usize::min(max_size as usize, log.len()));
        do_app_log(log).await;
    } else if log.starts_with('1') {
        do_click_log(log).await;
    } else if log.starts_with('2') {
        do_server_rpc_log(log).await;
    } else {
        eprintln!("save to mongodb fail (unknown type)");
    }
}

async fn process_client(socket: TcpStream, max_size: u32) {
    let addr = socket.peer_addr().unwrap();
    println!(
        "client join {} at {}",
        addr,
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_or(0, |v| v.as_secs())
    );

    let mut stream = tokio::io::BufReader::new(socket);
    let mut log = String::new();

    // read lines and parse it
    loop {
        if let Ok(size) = stream.read_line(&mut log).await {
            if size == 0 {
                break;
            }
            // save log to mongodb async
            tokio::spawn(do_log(log, max_size));

            log = String::new();
        }
    }
    println!(
        "client exit {} at {}",
        addr,
        SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .map_or(0, |v| v.as_secs())
    );
}

pub async fn init(tx: broadcast::Sender<signal::Types>) {
    let config = config::get();
    let addr = format!("{}:{}", config.logger.bind, config.logger.port);
    let max = config.logger.max_size;

    let mut listener = TcpListener::bind(addr).await.expect("bind address fail");
    let mut rx = tx.subscribe();
    loop {
        tokio::select!(Ok((socket, _)) = listener.accept() => {
            tokio::spawn(process_client(socket, max));
        },
        Ok(v) = rx.recv() => {
            if v == signal::Types::InnerStopNet {
                break;
            }
        }
        );
    }
    if let Err(e) =  tx.send(signal::Types::InnerStopOk) {
        eprintln!("{:?}", e);
    }
}

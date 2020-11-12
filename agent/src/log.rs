use super::config;
use super::db;
use super::signal;

use chrono::{NaiveDateTime, DateTime, Utc};
use mongodb::bson::doc;
use mongodb::*;
use num::ToPrimitive;
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

async fn do_app_log(log: &str) {
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
    let ts = DateTime::<Utc>::from_utc(
        NaiveDateTime::from_timestamp((timestamp / 1000) as i64, (timestamp % 1000 * 1000) as u32), Utc);

    let tid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let server_name: &str = list.next().unwrap_or("");
    let level: &str = list.next().unwrap_or("");
    let detail: &str = list.next().unwrap_or("");
    let doc = doc! {
        "vi": vid,
        "ts": ts,
        "ti": tid,
        "sn": server_name,
        "le": level,
        "lo": detail
    };

    send_mongodb(logger, doc).await;
}

async fn do_click_log(log: &str) {
    let logger = match db::mongo_click_log().await {
        Some(v) => v,
        None => {
            return;
        }
    };
    // type(1) vid timestamp(13) tid nid serverName cost(ms) method url host returnCode returnLength
    let mut list = log.split_ascii_whitespace().skip(1);
    let vid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let timestamp: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let ts = DateTime::<Utc>::from_utc(
        NaiveDateTime::from_timestamp((timestamp / 1000) as i64, (timestamp % 1000 * 1000) as u32), Utc);
    let tid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let nid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let server_name: &str = list.next().unwrap_or("");
    let cost: u32 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let method: &str = list.next().unwrap_or("");
    let url: &str = list.next().unwrap_or("");
    let host: &str = list.next().unwrap_or("");
    let return_code: i32 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let return_length: u32 = list
        .next()
        .map_or(0, |v| v.parse().unwrap_or(0))
        .to_u32()
        .unwrap_or(u32::MAX);
    let doc = doc! {
        "vi": vid,
        "ts": ts,
        "ti": tid,
        "ni": nid,
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

async fn do_server_rpc_log(log: &str) {
    let logger = match db::mongo_server_rpc().await {
        Some(v) => v,
        None => {
            return;
        }
    };
    // type(2) serverName rpcInterfaceName tid nid pnid timestamp(13) cost(ms) errorCode
    let mut list = log.split_ascii_whitespace().skip(1);
    let server_name = list.next().unwrap_or("");
    let function_name = list.next().unwrap_or("");

    let tid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let nid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let pnid: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let timestamp: u64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let ts = DateTime::<Utc>::from_utc(
        NaiveDateTime::from_timestamp((timestamp / 1000) as i64, (timestamp % 1000 * 1000) as u32), Utc);
    let cost: u32 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let error_code: i64 = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let doc = doc! {
        "sn": server_name.clone(),
        "fn": function_name.clone(),
        "ts": ts,
        "ni": nid,
        "pn": pnid,
        "ti": tid,
        "co": cost,
        "rc": error_code,
    };

    let ret = logger.insert_one(doc, None).await;
    if ret.is_err() {
        eprintln!("save to mongodb fail (rpc_log) {}", ret.unwrap_err());
    }
}

async fn do_log(log: Vec<u8>, max_size: u32) {
    if log.len() > 0 {
        let head = log[0];
        // remove last \x28
        let mut log = log;
        if log[log.len() - 1] == b'\x04' {
            log.truncate(log.len() - 1);
        }
        if head == b'0' {
            // size overflow
            log.truncate(usize::min(max_size as usize, log.len()));
            let log = unsafe{ std::str::from_utf8_unchecked(&log)};
            do_app_log(log).await;
            return;
        } else if head == b'1' {
            let log = unsafe{ std::str::from_utf8_unchecked(&log)};
            do_click_log(log).await;
            return;
        } else if head == b'2' {
            let log = unsafe{ std::str::from_utf8_unchecked(&log)};
            do_server_rpc_log(log).await;
            return;
        }
    } 
    eprintln!("save to mongodb fail (unknown type)");
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
    let mut log = Vec::new();

    // read lines and parse it
    loop {
        if let Ok(size) = stream.read_until(b'\x04', &mut log).await {
            if size == 0 {
                break;
            }
            // save log to mongodb async
            tokio::spawn(do_log(log, max_size));

            log = Vec::new();
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
    if let Err(e) = tx.send(signal::Types::InnerStopOk) {
        eprintln!("{:?}", e);
    }
}

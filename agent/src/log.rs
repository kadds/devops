use super::config;
use super::db;
use mongodb::bson::doc;
use tokio::net::{TcpListener, TcpStream};
use tokio::prelude::*;

async fn do_log(log: String, max_size: u32) {
    // remove last \n
    let log_data = if log.ends_with("\n") {
        &log[0..log.len() - 1]
    } else {
        &log[..]
    };

    // size overflow
    let log_data = if log_data.len() > max_size as usize {
        &log_data[0..max_size as usize]
    } else {
        &log_data
    };

    println!("new line get size {} {}", log_data.len(), log_data);

    if log.starts_with("0") {
        let logger = match db::mongo_log().await {
            Some(v) => v,
            None => {
                return;
            }
        };
        // type(0) vid timestamp tid serverName level detail
        let mut list = log.splitn(7, ' ');
        //let log_type: &str = list.nth(0).unwrap_or("0");
        let vid: u64 = list.nth(1).map_or(0, |v| v.parse().unwrap_or(0));
        let timestamp: u64 = list.nth(2).map_or(0, |v| v.parse().unwrap_or(0));
        let tid: &str = list.nth(3).unwrap_or("");
        let server_name: &str = list.nth(4).unwrap_or("");
        let level: &str = list.nth(5).unwrap_or("");
        let detail: &str = list.nth(6).unwrap_or("");
        let ret = logger
            .insert_one(
                doc! {"vi": vid,
                "ts": timestamp,
                "ti": tid,
                "sn": server_name,
                "le": level,
                "lo": detail},
                None,
            )
            .await;
        if ret.is_err() {
            eprintln!("save to mongodb fail (log)");
        }
    } else if log.starts_with("1") {
        let logger = match db::mongo_click_log().await {
            Some(v) => v,
            None => {
                return;
            }
        };
        // type(1) vid timestamp tid serverName cost method url host
        let mut list = log.splitn(7, ' ');
        //let log_type: &str = list.nth(0).unwrap_or("1");
        let vid: u64 = list.nth(1).map_or(0, |v| v.parse().unwrap_or(0));
        let timestamp: u64 = list.nth(2).map_or(0, |v| v.parse().unwrap_or(0));
        let tid: &str = list.nth(3).unwrap_or("");
        let server_name: &str = list.nth(4).unwrap_or("");
        let cost: u32 = list.nth(5).map_or(0, |v| v.parse().unwrap_or(0));
        let method: &str = list.nth(6).unwrap_or("");
        let url: &str = list.nth(7).unwrap_or("");
        let host: &str = list.nth(8).unwrap_or("");
        let ret = logger
            .insert_one(
                doc! {"vi": vid,
                "ts": timestamp,
                "ti": tid,
                "sn": server_name,
                "co": cost,
                "me": method,
                "ur": url,
                "ho": host},
                None,
            )
            .await;

        if ret.is_err() {
            eprintln!("save to mongodb fail (click_log)");
        }
    } else {
        eprintln!("save to mongodb fail (unknown type)");
    }
}

async fn process_client(socket: TcpStream, max_size: u32) {
    let addr = socket.peer_addr().unwrap();
    println!("client join {:?}", addr);

    let mut stream = tokio::io::BufReader::new(socket);
    let mut log = String::new();

    // read lines and parse it
    while let Ok(size) = stream.read_line(&mut log).await {
        if size == 0 {
            break;
        }

        // save log to mongodb async
        tokio::spawn(do_log(log, max_size));

        log = String::new();
    }
    println!("client exit {:?}", addr);
}

pub async fn init() {
    let config = config::get();
    let addr = format!("{}:{}", config.logger.bind, config.logger.port);
    let max = config.logger.max_size;

    let mut listener = TcpListener::bind(addr).await.expect("bind address fail");

    loop {
        if let Ok((socket, _)) = listener.accept().await {
            tokio::spawn(process_client(socket, max));
        }
    }
}

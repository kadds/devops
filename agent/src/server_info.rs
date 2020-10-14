use super::config;
use super::db;
use mongodb::bson::doc;
use tokio::net::{TcpListener, TcpStream};
use tokio::prelude::*;

async fn do_server(line: String) {
    // serverName functionName timestamp cost timestamp cost ...
}

async fn process_server(socket: TcpStream) {
    let addr = socket.peer_addr().unwrap();
    // println!("client join {:?}", addr);

    let mut stream = tokio::io::BufReader::new(socket);
    let mut line = String::new();

    // read lines and parse it
    while let Ok(size) = stream.read_line(&mut line).await {
        if size == 0 {
            break;
        }

        // save log to mongodb async
        tokio::spawn(do_server(line));

        line = String::new();
    }
    // println!("client exit {:?}", addr);
}

async fn init() {
    let config = config::get();
    let addr = format!("{}:{}", config.monitor.bind, config.monitor.port);

    let mut listener = TcpListener::bind(addr).await.expect("bind address fail");

    loop {
        if let Ok((socket, _)) = listener.accept().await {
            tokio::spawn(process_server(socket));
        }
    }

}
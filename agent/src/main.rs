extern crate clap;
extern crate daemonize;
extern crate tokio;
#[macro_use]
extern crate lazy_static;
extern crate num;

mod config;
mod db;
mod log;
mod monitor;
mod signal;
use clap::{App, Arg, SubCommand};
use daemonize::Daemonize;
use std::fs::File;
use tokio::net::{UnixListener, UnixStream};
use tokio::prelude::*;
use tokio::runtime;
use tokio::signal::unix::{signal, SignalKind};
use tokio::stream::StreamExt;
use tokio::sync::broadcast;

async fn cmd_client(socket: UnixStream, tx: broadcast::Sender<signal::Types>) {
    let mut socket = socket;
    let (read_socket, mut write_socket) = socket.split();
    let mut stream = tokio::io::BufReader::new(read_socket);
    let mut cmd = String::new();

    // read lines and parse it
    if let Ok(size) = stream.read_line(&mut cmd).await {
        if size == 0 {
            return;
        }
        if !cmd.is_empty() {
            cmd.truncate(cmd.len() - 1);
        }

        println!("command {}", cmd);
        // execute command
        if cmd == "stop" {
            if let Err(e) = tx.send(signal::Types::Stop) {
                eprintln!("{:?}", e);
            }
            if let Err(e) = write_socket.write_all(b"stopped").await {
                eprintln!("send fail {}", e);
            }
        } else if cmd == "reload" {
            if let Err(e) = tx.send(signal::Types::ReloadServers) {
                eprintln!("{:?}", e);
            }
            if let Err(e) = write_socket.write_all(b"reloaded").await {
                eprintln!("send fail {}", e);
            }
        } else if cmd == "pid" {
            // return pid to client
            if let Err(e) = write_socket
                .write_all(format!("{}", std::process::id()).as_bytes())
                .await
            {
                eprintln!("send fail {}", e);
            }
        } else {
            // unknown command
            eprintln!("unknown command {}", cmd);
        }
    }
}

async fn cmd_main(tx: broadcast::Sender<signal::Types>) {
    let mut listener = UnixListener::bind("./agent.sock").unwrap();
    let mut rx = tx.subscribe();
    loop {
        tokio::select! {
            Some(stream) = listener.next() => {
                tokio::spawn(cmd_client(stream.unwrap(), tx.clone()));
            },
            Ok(v) = rx.recv() => {
                if v == signal::Types::InnerStopNet {
                    break;
                }
            }
        }
    }
    // unlink agent.sock file
    if let Err(e) = tokio::fs::remove_file("./agent.sock").await {
        eprintln!("{}", e);
    }
    if let Err(e) = tx.send(signal::Types::InnerStopOk) {
        eprintln!("{:?}", e);
    }
}

async fn check_instant_exist() -> bool {
    if UnixStream::connect("./agent.sock").await.is_ok() {
        println!("old agent is running.");
        return true;
    } else {
        let _ = tokio::fs::remove_file("./agent.sock").await;
        return false;
    }
}

async fn do_async_main(path: &str, server_path: &str) {
    let (tx, mut rx) = broadcast::channel(16);
    config::load(path).await;
    if check_instant_exist().await {
        return;
    }

    tokio::spawn(cmd_main(tx.clone()));
    // logger
    tokio::spawn(log::init(tx.clone()));

    // monitor
    tokio::spawn(monitor::init(server_path.to_string(), tx.clone()));

    let mut sig_type;
    let mut i: u32 = 0;
    loop {
        sig_type = signal::Types::Nothing;
        // wait one signal
        let mut sigint = signal(SignalKind::interrupt()).unwrap();
        let mut sigquit = signal(SignalKind::quit()).unwrap();
        let mut sigter = signal(SignalKind::terminate()).unwrap();

        tokio::select! {
            _ = sigint.recv() => {},
            _=sigquit.recv() => {},
            _= sigter.recv() => {},
            Ok(v) = rx.recv() => {
                sig_type = v;
            },
        };
        if sig_type == signal::Types::Nothing || sig_type == signal::Types::Stop {
            println!("recv signal");
            if let Err(e) = tx.send(signal::Types::InnerStopNet) {
                eprintln!("{:?}", e);
            }
        } else if sig_type == signal::Types::InnerStopOk {
            i += 1;
            if i >= 3 {
                break;
            }
        }
    }
}

async fn do_send_signal(signal: &str) {
    let mut stream = UnixStream::connect("./agent.sock")
        .await
        .expect("connect fail. The agent is not running.");
    let data = format!("{}\n", signal);
    if let Err(err) = stream.write_all(data.as_bytes()).await {
        println!("{}", err);
    }
    let mut stream = tokio::io::BufReader::new(stream);
    let mut ret = String::new();
    if stream.read_line(&mut ret).await.is_ok() {
        if !ret.is_empty() {
            println!("{}", ret);
        }
    }
}

fn main() {
    let matches = App::new("agent")
        .version("0.4.0")
        .author("kadds")
        .about("collecting linux system info. (devops component)")
        .subcommand(SubCommand::with_name("signal")
            .about("Sends signal to agent which is running")
            .arg(Arg::with_name("action").short("a").long("action").required(true)
            .possible_values(&["stop", "reload", "pid"]).value_name("ACTION"))
        )
        .subcommand(SubCommand::with_name("run")
            .about("Runs agent")
            .arg(Arg::with_name("daemon").long("daemon").short("d").help(
                "Runs in daemon \nDaemon mode will redirect stdout & stderr to /tmp/agent.out & /tmp/agent.err",
            ))
            .arg(
                Arg::with_name("config")
                    .short("c")
                    .long("config")
                    .value_name("FILE")
                    .default_value("./agent.toml")
                    .help("config file"),
            )
            .arg(
                Arg::with_name("servers")
                    .short("s")
                    .long("servers")
                    .value_name("FILE")
                    .default_value("./agent_servers.txt")
                    .help("servers file provide by devops.server"),
            )
        )
        .get_matches();
    // get args
    if let Some(matches) = matches.subcommand_matches("run") {
        let path = matches.value_of("config").unwrap();
        let server_path = matches.value_of("servers").unwrap();
        if matches.is_present("daemon") {
            // run as daemon
            let stdout = File::create("/tmp/agent.out").unwrap();
            let stderr = File::create("/tmp/agent.err").unwrap();
            let daemonize = Daemonize::new()
                .stdout(stdout)
                .stderr(stderr)
                .working_directory("./");
            daemonize.start().unwrap();
        }

        let mut core = runtime::Builder::new()
            .threaded_scheduler()
            .core_threads(4)
            .enable_all()
            .build()
            .unwrap();

        core.block_on(do_async_main(path, server_path));
    } else if let Some(matches) = matches.subcommand_matches("signal") {
        let val = matches.value_of("action").unwrap();
        let mut core = runtime::Builder::new()
            .threaded_scheduler()
            .core_threads(1)
            .enable_all()
            .build()
            .unwrap();
        core.block_on(do_send_signal(val));
    }
    //core.spawn(do_async_main(path, server_path));
}

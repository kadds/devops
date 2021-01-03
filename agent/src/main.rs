extern crate clap;
extern crate daemonize;
extern crate tokio;
#[macro_use]
extern crate lazy_static;
extern crate num;

mod config;
mod db;
mod context;
use context::Context;
use context::SignalType;
mod log;
mod monitor;
use clap::{App, Arg, SubCommand};
use daemonize::Daemonize;
use std::fs::File;
use tokio::net::{UnixListener, UnixStream};
use tokio::prelude::*;
use tokio::runtime;
use tokio::signal::unix::{signal, SignalKind};
use tokio::stream::StreamExt;

async fn cmd_client(socket: UnixStream, mut context: Context) {
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

        println!("new command coming '{}'", cmd);
        // execute command
        if cmd == "stop" {
            context.stop();
            if let Err(e) = write_socket.write_all(b"stopped").await {
                eprintln!("send fail {}", e);
            }
        } else if cmd == "reload" {
            context.reload();
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

async fn cmd_main(mut context: Context) {
    let mut listener = UnixListener::bind("./agent.sock").unwrap();
    loop {
        let rx = context.fetch_signal();
        tokio::select! {
            Some(stream) = listener.next() => {
                tokio::spawn(cmd_client(stream.unwrap(), context.clone()));
            },
            Ok(v) = rx.recv() => {
                if v == SignalType::Stop {
                    break;
                }
            }
        }
    }
    // unlink agent.sock file
    if let Err(e) = tokio::fs::remove_file("./agent.sock").await {
        eprintln!("{}", e);
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
    config::load(path).await;
    if check_instant_exist().await {
        return;
    }

    let mut context = Context::new();

    tokio::spawn(cmd_main(context.clone()));
    // logger
    tokio::spawn(log::init(context.clone()));

    // monitor
    tokio::spawn(monitor::init(server_path.to_string(), context.clone()));

    // wait one signal
    let mut sigint = signal(SignalKind::interrupt()).unwrap();
    let mut sigquit = signal(SignalKind::quit()).unwrap();
    let mut sigter = signal(SignalKind::terminate()).unwrap();
    loop {
        let rx = context.fetch_signal();
        tokio::select! {
            _ = sigint.recv() => {},
            _=sigquit.recv() => {},
            _= sigter.recv() => {},
            Ok (v) = rx.recv() => {
                if v == SignalType::Reload {
                    config::load(path).await;
                    continue;
                }
                else {
                    break;
                }
            }
        };
        println!("signal recv");
        context.stop();
    }
    if !context.is_stop() {
        context.stop();
    }
    println!("wait final signal for stop");
    context.wait_for_final_stop().await;
    println!("agent stopped");
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
    let matches = App::new(clap::crate_name!())
        .version(clap::crate_version!())
        .author(clap::crate_authors!("\n"))
        .about(clap::crate_description!())
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

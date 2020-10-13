extern crate clap;
extern crate daemonize;
extern crate tokio;
#[macro_use]
extern crate lazy_static;

mod config;
mod db;
mod log;
mod monitor;
use clap::{App, Arg};
use daemonize::Daemonize;
use std::fs::File;
use std::fs::remove_file;
use tokio::runtime;
use tokio::signal::unix::{signal, SignalKind};

async fn do_async_main(path: &str, server_path: &str) {
    config::load(path).await;

    // logger
    tokio::spawn(log::init());

    // monitor
    tokio::spawn(monitor::init(server_path.to_string()));

    // exit when recv signal
    let mut sigint = signal(SignalKind::interrupt()).unwrap();
    let mut sigquit = signal(SignalKind::quit()).unwrap();
    let mut sigter = signal(SignalKind::terminate()).unwrap();
    // wait one signal
    tokio::select! {_ = sigint.recv() => {}, _=sigquit.recv() => {}, _= sigter.recv() => {}};

    println!("recv singal, exit");
    // remove pid file
    match remove_file("./agent.pid") {
        Err(e) => println!("{}", e),
        _ => ()
    }
}

fn main() {
    let matches = App::new("agent")
        .version("0.1")
        .author("kadds")
        .about("collecting linux system info. (devops component)")
        .arg(Arg::with_name("daemon").short("d").help("open with daemon"))
        .arg(
            Arg::with_name("config")
                .short("c")
                .value_name("FILE")
                .default_value("./agent.toml")
                .help("config file"),
        )
        .arg(
            Arg::with_name("server_file")
                .short("s")
                .value_name("FILE")
                .default_value("./agent_servers.txt")
                .help("servers file provide by devops.server"),
        )
        .get_matches();
    // get args

    let path = matches.value_of("config").unwrap();
    let server_path = matches.value_of("server_file").unwrap();

    if matches.is_present("daemon") {
        // run as daemon
        let stdout = File::create("/tmp/agent.out").unwrap();
        let stderr = File::create("/tmp/agent.err").unwrap();
        let daemonize = Daemonize::new()
            .pid_file("./agent.pid")
            .stdout(stdout)
            .stderr(stderr)
            .working_directory("./");
        daemonize.start().unwrap();
    }

    let mut core = runtime::Builder::new()
        .basic_scheduler()
        .max_threads(4)
        .core_threads(1)
        .enable_all()
        .build()
        .unwrap();

    core.block_on(do_async_main(path, server_path));
}

use super::config;
use super::db;
use mongodb::bson::doc;
use notify::{event, RecommendedWatcher, RecursiveMode, Result, Watcher};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncBufReadExt;
use tokio::sync::Notify;
use tokio::{fs::File, io::BufReader, time, time::Duration};

static mut WATCHER: Option<RecommendedWatcher> = None;

fn watch(path: &str, notify: Arc<Notify>) -> Result<()> {
    let mut watcher: RecommendedWatcher = Watcher::new_immediate(move |res| match res {
        Ok(event) => {
            let ev: event::Event = event;
            if ev.kind
                == event::EventKind::Access(event::AccessKind::Close(event::AccessMode::Write))
            {
                notify.notify();
            }
        }
        Err(e) => {
            eprintln!("watch error: {:?}", e);
            // may be need notify it
            notify.notify();
        }
    })?;
    watcher.watch(path, RecursiveMode::Recursive)?;
    unsafe {
        WATCHER = Some(watcher);
    }
    Ok(())
}

// watching servers_name.txt has changed and reloading it
// normal std thread
async fn watch_main(path: String, notify: Arc<Notify>) {
    match watch(&path, notify.clone()) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("watch api returns {} fallback to tick", e);
            // fallback to tick
            loop {
                // do loop
                tokio::time::delay_for(Duration::from_secs(60)).await;
                //  call load
                notify.notify();
            }
        }
    }
}

#[derive(Default, Debug)]
struct CpuInfo {
    user: u64,
    nice: u64,
    system: u64,
    idle: u64,
    io_wait: u64,
    irq: u64,
    soft_irq: u64,
    steal: u64,
    guest: u64,
    guest_nice: u64,
}

impl CpuInfo {
    fn calc_usage(&self, last: &CpuInfo) -> f32 {
        let s1 = last.user
            + last.nice
            + last.system
            + last.idle
            + last.io_wait
            + last.irq
            + last.soft_irq
            + last.steal
            + last.guest
            + last.guest_nice;

        let s2 = self.user
            + self.nice
            + self.system
            + self.idle
            + self.io_wait
            + self.irq
            + self.soft_irq
            + self.steal
            + self.guest
            + self.guest_nice;
        // bug check
        if s2 <= s1 || self.idle <= last.idle {
            eprintln!("{:?}\n{:?}", self, last);
            return 0.;
        }

        let sum = s2 - s1;
        let idle = self.idle - last.idle;
        (sum - idle) as f32 * 100. / sum as f32
    }
}

#[derive(Default, Debug)]
struct NetIoStat {
    read_bytes: u64,
    write_bytes: u64,
    read_package: u64,
    write_package: u64,
}

impl NetIoStat {
    fn delta(&self, last: &NetIoStat) -> NetIoStat {
        NetIoStat {
            read_bytes: self.read_bytes - last.read_bytes,
            write_bytes: self.write_bytes - last.write_bytes,
            read_package: self.read_package - last.read_package,
            write_package: self.write_package - last.write_package,
        }
    }
}

#[derive(Default, Debug)]
struct DiskIoStat {
    read_package: u64,
    write_package: u64,
}

impl DiskIoStat {
    fn delta(&self, last: &DiskIoStat) -> DiskIoStat {
        DiskIoStat {
            read_package: self.read_package - last.read_package,
            write_package: self.write_package - last.write_package,
        }
    }
}

#[derive(Default, Debug)]
struct NameConfig {
    vm_name: String,
    servers_name: Vec<String>,
}

static mut LASTNAMECONFIG: Option<Arc<NameConfig>> = None;
static mut LASTCPUINFO: Option<CpuInfo> = None;
static mut LASTNETINFO: Option<NetIoStat> = None;
static mut LASTBLOCKINFO: Option<DiskIoStat> = None;

fn read_to_cpu_info(line: &str) -> CpuInfo {
    let mut list = line.split_whitespace();
    list.next();
    let user = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let nice = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let system = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let idle = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let io_wait = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let irq = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let soft_irq = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let steal = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let guest = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let guest_nice = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    CpuInfo {
        user,
        nice,
        system,
        idle,
        io_wait,
        irq,
        soft_irq,
        steal,
        guest,
        guest_nice,
    }
}

async fn read_mem() -> Option<u64> {
    if let Ok(file) = File::open("/proc/meminfo").await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        // mem Total
        // mem Free / mem Available
        let mut avl = 0;
        let mut total = 0;
        for _ in 0..3 {
            if let Ok(len) = stream.read_line(&mut line).await {
                if len != 0 {
                    let mut rest = line.split_whitespace();
                    let type_name = rest.next().unwrap_or("");
                    if type_name == "MemAvailable:" {
                        // available at kernel version 3.14
                        avl = rest.next().map_or(0, |v| v.parse().unwrap_or(0));
                    } else if type_name == "MemTotal:" {
                        total = rest.next().map_or(0, |v| v.parse().unwrap_or(0));
                    }
                }
            }
            line.clear();
        }
        let used = total - avl;
        return Some(used);
    }
    None
}

async fn read_cpu_stat() -> Option<CpuInfo> {
    if let Ok(file) = File::open("/proc/stat").await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        if let Ok(_) = stream.read_line(&mut line).await {
            return Some(read_to_cpu_info(&line));
        }
    }
    None
}

async fn read_cpu(interval_time: u64) -> Option<f32> {
    if let Some(new_cpu_info) = read_cpu_stat().await {
        unsafe {
            if let Some(last) = &LASTCPUINFO {
                let usage = new_cpu_info.calc_usage(last);
                LASTCPUINFO = Some(new_cpu_info);
                return Some(usage);
            } else if interval_time > 1 {
                LASTCPUINFO = Some(new_cpu_info);
                // wait 1000ms and retry read
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_cpu) = read_cpu_stat().await {
                    if let Some(last) = &LASTCPUINFO {
                        return Some(new_cpu.calc_usage(last));
                    }
                    LASTCPUINFO = Some(new_cpu);
                }
            } else {
                LASTCPUINFO = Some(new_cpu_info);
            }
        }
    }
    None
}

async fn read_net_stat(eth_name: &str) -> Option<NetIoStat> {
    if let Ok(file) = File::open("/proc/net/dev").await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        while let Ok(cnt) = stream.read_line(&mut line).await {
            if cnt == 0 {
                break;
            }
            let mut list = line.split_whitespace();
            let name = list.next();
            if name.map(|v| v.trim_end_matches(":")).unwrap_or("") == eth_name {
                let read_bytes = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let read_package = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let mut next = list.skip(6);
                let write_bytes = next.next().map_or(0, |v| v.parse().unwrap_or(0));
                let write_package = next.next().map_or(0, |v| v.parse().unwrap_or(0));

                return Some(NetIoStat {
                    read_bytes,
                    write_bytes,
                    read_package,
                    write_package,
                });
            }
            line.clear();
        }
    }
    None
}

async fn read_net(interval_time: u64, eth_name: &str) -> Option<NetIoStat> {
    if let Some(new_net_info) = read_net_stat(eth_name).await {
        unsafe {
            if let Some(last) = &LASTNETINFO {
                let delta = new_net_info.delta(last);
                LASTNETINFO = Some(new_net_info);
                return Some(delta);
            } else if interval_time > 1 {
                LASTNETINFO = Some(new_net_info);
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_net) = read_net_stat(eth_name).await {
                    if let Some(last) = &LASTNETINFO {
                        return Some(new_net.delta(last));
                    }
                    LASTNETINFO = Some(new_net);
                }
            } else {
                LASTNETINFO = Some(new_net_info);
            }
        }
    }
    None
}

async fn read_block_stat(block_name: &str) -> Option<DiskIoStat> {
    if let Ok(file) = File::open("/proc/diskstats").await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        while let Ok(cnt) = stream.read_line(&mut line).await {
            if cnt == 0 {
                break;
            }
            let list = line.split_whitespace();
            let mut list = list.skip(2);
            let name = list.next();
            if name.unwrap_or("") == block_name {
                let read_package = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let mut list = list.skip(3);
                let write_package = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                return Some(DiskIoStat {
                    read_package,
                    write_package,
                });
            }
            line.clear();
        }
    }
    None
}

async fn read_block(interval_time: u64, block_name: &str) -> Option<DiskIoStat> {
    if let Some(new_block_info) = read_block_stat(block_name).await {
        unsafe {
            if let Some(last) = &LASTBLOCKINFO {
                let delta = new_block_info.delta(last);
                LASTBLOCKINFO = Some(new_block_info);
                return Some(delta);
            } else if interval_time > 1 {
                LASTBLOCKINFO = Some(new_block_info);
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_block) = read_block_stat(block_name).await {
                    if let Some(last) = &LASTBLOCKINFO {
                        return Some(new_block.delta(last));
                    }
                    LASTBLOCKINFO = Some(new_block);
                }
            } else {
                LASTBLOCKINFO = Some(new_block_info);
            }
        }
    }
    None
}

async fn vm_tick(interval_time: u64) {
    let name_config = unsafe {
        if let Some(v) = LASTNAMECONFIG.clone() {
            v
        } else {
            return;
        }
    };

    let eth_name = &config::get().monitor.eth;
    let block_name = &config::get().monitor.block;
    let (used, cpu, net, block) = tokio::join!(
        read_mem(),
        read_cpu(interval_time),
        read_net(interval_time, &eth_name),
        read_block(interval_time, &block_name)
    );
    let net = net.unwrap_or(NetIoStat::default());
    let block = block.unwrap_or(DiskIoStat::default());

    let mongo = match db::mongo_vm_monitor().await {
        Some(v) => v,
        None => {
            eprintln!("open mongodb connection fail");
            return;
        }
    };
    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("unknown system time")
        .as_secs() as u32;

    // all data cast to u32
    let vm = name_config.vm_name.clone();

    let res = mongo
        .insert_one(
            doc! {
            "dt": [
                (cpu.unwrap_or(0.) * 100.) as u32,
                used.unwrap_or(0) as u32,
                // KiB
                (net.read_bytes / 1024) as u32,
                (net.write_bytes / 1024) as u32,
                net.read_package as u32,
                net.write_package as u32,
                block.read_package as u32,
                block.write_package as u32
            ],
            "ts": ts,
            "vm": vm},
            None,
        )
        .await;

    if let Err(err) = res {
        eprintln!("{}", err);
    }

    println!(
        "mem {:?}, cpu {:?}, net {:?}, block {:?}",
        used, cpu, net, block,
    );
}

async fn server_tick(interval_time: u64) {
    let name_config = unsafe {
        if let Some(v) = LASTNAMECONFIG.clone() {
            v
        } else {
            return;
        }
    };
}

async fn server_notify_tick(servers_path: String, notify: Arc<Notify>) {
    loop {
        notify.notified().await;
        // load new map
        if let Ok(file) = File::open(&servers_path).await {
            let mut stream = BufReader::new(file);
            let mut line: String = String::new();
            let mut name_config = NameConfig::default();
            while let Ok(cnt) = stream.read_line(&mut line).await {
                if cnt == 0 {
                    break;
                }
                // remove last \n
                if line.ends_with("\n") {
                    line.truncate(line.len() - 1);
                }
                if name_config.vm_name.len() == 0 {
                    name_config.vm_name = line;
                } else {
                    name_config.servers_name.push(line);
                }
                line = String::new();
            }
            println!(
                "read vm name is {} servers count {}",
                name_config.vm_name,
                name_config.servers_name.len()
            );
            unsafe {
                LASTNAMECONFIG = Some(Arc::new(name_config));
            }
        } else {
            eprintln!(
                "not find file {} and the monitor is not working now.",
                servers_path
            );
        }
    }
}

pub async fn init(servers_path: String) {
    let notify = Arc::new(Notify::new());
    let notify2 = notify.clone();
    // notify first, loading servers_name at once
    notify2.notify();

    tokio::spawn(server_notify_tick(servers_path.clone(), notify));

    // start notify thread loop
    tokio::spawn(watch_main(servers_path.clone(), notify2));

    let interval_time = config::get().monitor.interval;

    // wait 1 second then servers_name is loaded
    time::delay_for(Duration::from_millis(1000)).await;

    let mut interval = time::interval(Duration::from_secs(interval_time));
    loop {
        interval.tick().await;
        // run once every tick
        tokio::join!(vm_tick(interval_time), server_tick(interval_time));
    }
}

use super::config;
use notify::{RecommendedWatcher, RecursiveMode, Result, Watcher};
use std::sync::Arc;
use tokio::io::AsyncBufReadExt;
use tokio::sync::Notify;
use tokio::{fs::File, io::BufReader, time, time::Duration};

fn watch(path: &str, notify: Arc<Notify>) -> Result<()> {
    let mut watcher: RecommendedWatcher = Watcher::new_immediate(move |res| match res {
        Ok(event) => {
            println!("event: {:?}", event);
            notify.notify();
        }
        Err(e) => {
            eprintln!("watch error: {:?}", e);
            // may be need notify it
            notify.notify();
        }
    })?;

    watcher.watch(path, RecursiveMode::Recursive)?;
    Ok(())
}

// watching servers_name.txt has changed and reloading it
// normal std thread
fn watch_thread(path: String, notify: Arc<Notify>) {
    match watch(&path, notify.clone()) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("watch api returns {}", e);
            // fallback to tick
            loop {
                //  call load
                notify.notify();
                // do loop
                std::thread::sleep(std::time::Duration::from_secs(60));
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
            println!("{:?}{:?}", self, last);
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

#[derive(Default, Debug)]
struct DiskIoStat {
    read_package: u64,
    write_package: u64,
}

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

#[derive(Default, Debug)]
struct NameConfig {
    vm_name: String,
    servers_name: Vec<String>,
}

static mut LASTNAMECONFIG: Option<Arc<NameConfig>> = None;

static mut LASTCPUINFO: Option<CpuInfo> = None;

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
            let usage = if let Some(last) = &LASTCPUINFO {
                new_cpu_info.calc_usage(last)
            } else if interval_time > 2 {
                // wait 1000ms and retry read
                LASTCPUINFO = Some(new_cpu_info);
                time::interval(Duration::from_millis(1000)).tick().await;
                if let Some(new_cpu) = read_cpu_stat().await {
                    if let Some(last) = &LASTCPUINFO {
                        return Some(new_cpu.calc_usage(last));
                    }
                }
                return None;
            } else {
                LASTCPUINFO = Some(new_cpu_info);
                return None;
            };

            LASTCPUINFO = Some(new_cpu_info);
            return Some(usage);
        }
    }
    None
}

async fn read_net(eth_name: &str) -> Option<NetIoStat> {
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

async fn read_block(block_name: &str) -> Option<DiskIoStat> {
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
                let mut list = list.skip(2);
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

async fn vm_tick(interval_time: u64) {
    unsafe {
        if LASTNAMECONFIG.is_none() {
            return;
        }
    }

    let eth_name = &config::get().monitor.eth;
    let block_name = &config::get().monitor.block;
    let (used, cpu, net, block) = tokio::join!(
        read_mem(),
        read_cpu(interval_time),
        read_net(&eth_name),
        read_block(&block_name)
    );
    let mut mem = used.unwrap() as f32;
    let mut cpu = cpu.unwrap();
    let mut net = net.unwrap();
    let mut block = block.unwrap();
    let mut mem_str = "KiB";
    if mem > 1024. {
        mem = mem / 1024.;
        mem_str = "MiB";
        if mem > 1024. {
            mem = mem / 1024.;
            mem_str = "GiB";
        }
    }
    println!(
        "mem {}{}, cpu {} net {:?} block {:?}",
        mem, mem_str, cpu, net, block
    );
}

async fn server_tick(interval_time: u64) {
    unsafe {
        if LASTNAMECONFIG.is_none() {
            return;
        }
    }
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
                if name_config.vm_name.len() == 0 {
                    name_config.vm_name = line;
                } else {
                    name_config.servers_name.push(line);
                }
                line = String::new();
            }
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
    std::thread::spawn(move || watch_thread(servers_path.clone(), notify2));

    let interval_time = config::get().monitor.interval;

    // wait 1 second then servers_name is loaded
    time::interval(Duration::from_secs(1)).tick().await;

    let mut interval = time::interval(Duration::from_secs(interval_time));
    loop {
        // run once every tick
        tokio::spawn(vm_tick(interval_time));
        tokio::spawn(server_tick(interval_time));
        interval.tick().await;
    }
}

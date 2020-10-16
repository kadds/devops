use super::config;
use super::db;
use mongodb::bson::doc;
use notify::{event, RecommendedWatcher, RecursiveMode, Result, Watcher};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;
use tokio::sync::{Notify, RwLock};
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

#[derive(Default, Debug, Clone)]
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
        let s1 = last.sum();
        let s2 = self.sum();

        // bug check
        if s2 <= s1 || self.idle <= last.idle {
            eprintln!("{:?}\n{:?}", self, last);
            return 0.;
        }

        let sum = s2 - s1;
        let idle = self.idle - last.idle;
        (sum - idle) as f32 * 100. / sum as f32
    }

    fn sum(&self) -> u64 {
        self.user
            + self.nice
            + self.system
            + self.idle
            + self.io_wait
            + self.irq
            + self.soft_irq
            + self.steal
            + self.guest
            + self.guest_nice
    }
}

#[derive(Default, Debug, Clone)]
struct NetIoStat {
    read_bytes: u64,
    write_bytes: u64,
    read_package: u64,
    write_package: u64,
    time: u64,
}

impl NetIoStat {
    fn delta(&self, last: &NetIoStat) -> NetIoStat {
        let dt = if self.time - last.time > 0 {
            self.time - last.time
        }
        else {
            1
        };
        NetIoStat {
            // iops
            read_package: (self.read_package - last.read_package) * 1000 / dt,
            write_package: (self.write_package - last.write_package) * 1000 / dt,
            // bps
            read_bytes: (self.read_bytes - last.read_bytes) * 1000 / dt,
            write_bytes: (self.write_bytes - last.write_bytes) * 1000 / dt,
            time: dt
        }
    }
}

#[derive(Default, Debug, Clone)]
struct DiskIoStat {
    read_bytes: u64,
    write_bytes: u64,
    read_package: u64,
    write_package: u64,
    time: u64,
}

impl DiskIoStat {
    fn delta(&self, last: &DiskIoStat) -> DiskIoStat {
        let dt = if self.time - last.time > 0 {
            self.time - last.time
        }
        else {
            1
        };

        DiskIoStat {
            // iops
            read_package: (self.read_package - last.read_package) * 1000 / dt,
            write_package: (self.write_package - last.write_package) * 1000 / dt,
            // bps (selector size 512B )
            read_bytes: (self.read_bytes - last.read_bytes) * 1000 * 512 / dt,
            write_bytes: (self.write_bytes - last.write_bytes) * 1000 * 512 / dt,
            time: dt
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
    let mut list = line.split_ascii_whitespace().skip(1);
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

fn read_to_cpu_info_from_pid(line: &str) -> CpuInfo {
    let mut list = line.split_ascii_whitespace().skip(13);
    let user = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let nice = 0;
    let system = list.next().map_or(0, |v| v.parse().unwrap_or(0));
    let idle = 0;
    let io_wait = 0;
    let irq = 0;
    let soft_irq = 0;
    let steal = 0;
    let guest = 0;
    let guest_nice = 0;
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
                    let mut rest = line.split_ascii_whitespace();
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
        return Some(used * 1024);
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

async fn read_cpu_stat_pid(pid: &str) -> Option<CpuInfo> {
    if let Ok(file) = File::open(format!("/proc/{}/stat", pid)).await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        if let Ok(_) = stream.read_line(&mut line).await {
            return Some(read_to_cpu_info_from_pid(&line));
        }
    }
    None
}

async fn read_memory_pid(pid: &str) -> Option<(u64, u64)> {
    if let Ok(file) = File::open(format!("/proc/{}/statm", pid)).await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        if let Ok(_) = stream.read_line(&mut line).await {
            let mut list = line.split_ascii_whitespace();
            let vm = list.next().map_or(0, |v| v.parse().unwrap_or(0));
            let pm = list.next().map_or(0, |v| v.parse().unwrap_or(0));
            // page size is 4 KiB
            return Some((vm * 4, pm * 4));
        }
    }
    None
}

async fn read_tcp_count(pid: &str) -> Option<u64> {
    if let Ok(file) = File::open(format!("/proc/{}/net/tcp", pid)).await {
        let mut stream = BufReader::new(file);
        let mut line: String = String::new();
        let mut num = 0;
        if let Ok(_) = stream.read_line(&mut line).await {
            // page size is 4 KiB
            if !line.trim().starts_with("sl") {
                num = num + 1;
            }
            line.clear();
        }
        return Some(num);
    }
    None
}

async fn read_cpu() -> Option<f32> {
    if let Some(new_cpu_info) = read_cpu_stat().await {
        unsafe {
            if let Some(last) = &LASTCPUINFO {
                let usage = new_cpu_info.calc_usage(last);
                LASTCPUINFO = Some(new_cpu_info);
                return Some(usage);
            } else {
                LASTCPUINFO = Some(new_cpu_info);
                // wait 1000ms and retry read
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_cpu) = read_cpu_stat().await {
                    if let Some(last) = &LASTCPUINFO {
                        return Some(new_cpu.calc_usage(last));
                    }
                    LASTCPUINFO = Some(new_cpu);
                }
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
            let mut list = line.split_ascii_whitespace();
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
                    time: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map_or(0, |v| v.as_millis() as u64)
                });
            }
            line.clear();
        }
    }
    None
}

async fn read_net(eth_name: &str) -> Option<NetIoStat> {
    if let Some(new_net_info) = read_net_stat(eth_name).await {
        unsafe {
            if let Some(last) = &LASTNETINFO {
                let delta = new_net_info.delta(last);
                LASTNETINFO = Some(new_net_info);
                return Some(delta);
            } else {
                LASTNETINFO = Some(new_net_info);
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_net) = read_net_stat(eth_name).await {
                    if let Some(last) = &LASTNETINFO {
                        return Some(new_net.delta(last));
                    }
                    LASTNETINFO = Some(new_net);
                }
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
            let mut list = line.split_ascii_whitespace().skip(2);
            let name = list.next();
            if name.unwrap_or("") == block_name {
                let read_package = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let mut list = list.skip(1);
                let read_bytes = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let mut list = list.skip(1);
                let write_package = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                let mut list = list.skip(1);
                let write_bytes = list.next().map_or(0, |v| v.parse().unwrap_or(0));
                return Some(DiskIoStat {
                    read_package,
                    write_package,
                    read_bytes,
                    write_bytes,
                    time: SystemTime::now()
                        .duration_since(UNIX_EPOCH)
                        .map_or(0, |v| v.as_millis() as u64)
                });
            }
            line.clear();
        }
    }
    None
}

async fn read_block(block_name: &str) -> Option<DiskIoStat> {
    if let Some(new_block_info) = read_block_stat(block_name).await {
        unsafe {
            if let Some(last) = &LASTBLOCKINFO {
                let delta = new_block_info.delta(last);
                LASTBLOCKINFO = Some(new_block_info);
                return Some(delta);
            } else {
                LASTBLOCKINFO = Some(new_block_info);
                time::delay_for(Duration::from_millis(1000)).await;
                if let Some(new_block) = read_block_stat(block_name).await {
                    if let Some(last) = &LASTBLOCKINFO {
                        return Some(new_block.delta(last));
                    }
                    LASTBLOCKINFO = Some(new_block);
                }
            }
        }
    }
    None
}

async fn vm_tick() {
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
        read_cpu(),
        read_net(&eth_name),
        read_block(&block_name)
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
                used.unwrap_or(0),
                // Bps
                net.read_bytes,
                net.write_bytes,

                net.read_package,
                net.write_package,

                // Bps
                block.read_bytes,
                block.write_bytes,

                block.read_package,
                block.write_package
            ],
            "ts": ts,
            "vm": vm},
            None,
        )
        .await;

    if let Err(err) = res {
        eprintln!("{}", err);
    }

    // println!(
    //     "mem {:?}, cpu {:?}, net {:?}, block {:?}",
    //     used, cpu, net, block,
    // );
}

#[derive(Default, Debug, Clone)]
struct ServerMonitorInfo {
    cpu_info: CpuInfo,
    vm_cpu_info: CpuInfo,
}

lazy_static! {
    static ref LASTSERVERS: RwLock<HashMap<String, ServerMonitorInfo>> =
        RwLock::new(HashMap::new());
}

async fn read_cpu_pid(name: &String, pid: &str) -> Option<f32> {
    let mut old_info = {
        let val = LASTSERVERS.read().await;
        val.get(name).map(Clone::clone)
    };

    if old_info.is_none() {
        let (cpu_info, vm_cpu_info) = tokio::join!(read_cpu_stat_pid(pid), read_cpu_stat());
        if cpu_info.is_none() || vm_cpu_info.is_none() {
            eprintln!("get server cpu info fail {} skip", name);
        } else {
            let info = ServerMonitorInfo {
                cpu_info: cpu_info.unwrap(),
                vm_cpu_info: vm_cpu_info.unwrap(),
            };

            LASTSERVERS.write().await.insert(name.to_string(), info);
            // wait 1000ms and retry read
            time::delay_for(Duration::from_millis(1000)).await;
            old_info = {
                let val = LASTSERVERS.read().await;
                val.get(name).map(|v| v.clone())
            }
        }
    };

    let old_info = match old_info {
        Some(v) => v,
        None => {
            return None;
        }
    };

    let (cpu_info, vm_cpu_info) = tokio::join!(read_cpu_stat_pid(pid), read_cpu_stat());
    let cpu_info = match cpu_info {
        Some(v) => v,
        None => {
            return None;
        }
    };
    let vm_cpu_info = match vm_cpu_info {
        Some(v) => v,
        None => {
            return None;
        }
    };

    let usage: Option<f32> = {
        let vm_cost = vm_cpu_info.sum() - old_info.vm_cpu_info.sum();
        let server_cost = cpu_info.sum() - old_info.cpu_info.sum();
        Some(server_cost as f32 / vm_cost as f32 * 100.)
    };

    let new_info = ServerMonitorInfo {
        cpu_info,
        vm_cpu_info,
    };

    // save
    LASTSERVERS.write().await.insert(name.to_string(), new_info);
    usage
}

async fn server_inspect(name: &String) {
    // get pid first
    let config = config::get();
    let docker_container_name = format!(
        "{}{}{}",
        config.deploy.server_prefix, name, config.deploy.server_postfix
    );
    let output = match Command::new("docker")
        .arg("inspect")
        .arg("--format")
        .arg("{{.State.Pid}}")
        .arg(docker_container_name)
        .output()
        .await
    {
        Ok(v) => v,
        Err(err) => {
            eprintln!("error execute command {}", err);
            return;
        }
    };
    let mut pid = match std::str::from_utf8(&output.stdout) {
        Ok(v) => v,
        Err(err) => {
            eprintln!("error parse pid {}", err);
            return;
        }
    };
    if pid.ends_with("\n") {
        pid = &pid[0..pid.len() - 1];
    }

    if pid.len() == 0 {
        eprintln!("not find server {}", name);
        return;
    }

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("unknown system time")
        .as_secs() as u32;

    // println!("pid server {} is {}", name, pid);

    let (usage, mm, tcp) = tokio::join!(
        read_cpu_pid(&name, pid),
        read_memory_pid(pid),
        read_tcp_count(pid)
    );
    let mongo = match db::mongo_server_monitor().await {
        Some(v) => v,
        None => {
            eprintln!("open mongodb connection fail");
            return;
        }
    };

    let res = mongo
        .insert_one(
            doc! {
            "dt": [
                (usage.unwrap_or(0.) * 100.) as u32,
                // KiB
                mm.unwrap_or((0, 0)).1 as u32,
                mm.unwrap_or((0, 0)).0 as u32,
                tcp.unwrap_or(0) as u32,
            ],
            "ts": ts,
            "se": name},
            None,
        )
        .await;

    if let Err(err) = res {
        eprintln!("{}", err);
    }

    // println!("usage {:?} mm {:?} tcp {:?}", usage, mm, tcp);
}

async fn server_tick() {
    let name_config = unsafe {
        if let Some(v) = LASTNAMECONFIG.clone() {
            v
        } else {
            return;
        }
    };
    for server in name_config.servers_name.iter() {
        server_inspect(&server).await;
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
            // println!(
            //     "read vm name is {} servers count {}",
            //     name_config.vm_name,
            //     name_config.servers_name.len()
            // );
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
        tokio::join!(vm_tick(), server_tick());
    }
}

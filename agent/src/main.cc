#include "asio.hpp"
#include "bsoncxx/builder/stream/document.hpp"
#include "bsoncxx/json.hpp"
#include "cpptoml.h"
#include "mongocxx/client.hpp"
#include "mongocxx/instance.hpp"
#include <ext/stdio_filebuf.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <sys/epoll.h>
#include <sys/inotify.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <unordered_set>
#include <vector>

using namespace std;

string gUri;
string gDBName;
string gMonitorCol;
string gServiceCol;
string gBindAddress;
uint16_t gPort;
uint64_t gMaxLogSize;
string gLogCol;
bool gNeedUpdate = true;
unordered_set<string> gServers;
string gVmName;

mongocxx::uri gen_uri() { return {gUri}; }
mongocxx::v_noabi::collection get_monitor_col(mongocxx::client &cli) { return move(cli[gDBName][gMonitorCol]); }
mongocxx::v_noabi::collection get_service_col(mongocxx::client &cli) { return move(cli[gDBName][gServiceCol]); }
mongocxx::v_noabi::collection get_logger_col(mongocxx::client &cli) { return move(cli[gDBName][gLogCol]); }

bool startWith(const string &str, const char *target, const char **out = nullptr)
{
    for (int i = 0; i < str.size(); i++)
    {
        if (*target != str[i])
            return false;
        target++;
        if (*target == '\0')
        {
            if (out)
                *out = &str[i];
            return true;
        }
    }
    return false;
}

uint64_t get_line(const char *ptr)
{
    while (*ptr != '\0')
    {
        if (*ptr >= '0' && *ptr <= '9')
        {
            break;
        }
        ptr++;
    }
    return strtoul(ptr, 0, 10);
}

using bsoncxx::builder::stream::close_array;
using bsoncxx::builder::stream::document;
using bsoncxx::builder::stream::finalize;
using bsoncxx::builder::stream::open_array;

void do_full_monitor()
{
    float loading = 0.f;
    uint64_t memavl = 0, memtotal = 0;
    {
        ifstream fs("/proc/loadavg");
        fs >> loading;
    }
    {
        uint64_t memfree = 0;
        string t;
        ifstream fs("/proc/meminfo");
        const char *ptr = nullptr;
        int cnt = 0;
        while (getline(fs, t))
        {
            if (startWith(t, "MemTotal", &ptr))
            {
                memtotal = get_line(ptr);
                cnt++;
            }
            else if (startWith(t, "MemFree", &ptr))
            {
                memfree = get_line(ptr);
                cnt++;
            }
            else if (startWith(t, "MemAvailable", &ptr))
            {
                memavl = get_line(ptr);
                cnt++;
            }
            if (cnt >= 3)
            {
                break;
            }
        }
        if (memavl == 0)
        {
            memavl = memfree;
        }
        getline(fs, t);
        const char *out;
        if (startWith(t, "MemTotal", &out))
        {
            memtotal = get_line(out);
        }
        getline(fs, t);
        if (startWith(t, "MemFree", &out))
        {
            memavl = get_line(out);
        }

        getline(fs, t);
        if (startWith(t, "MemAvailable", &out))
        {
            memavl = get_line(out);
        }
    }
    // cout << loading << " " << memtotal << " " << memavl << endl;
    try
    {
        mongocxx::client conn{gen_uri()};
        auto col = get_monitor_col(conn);
        document doc;
        auto val = doc << "name" << gVmName << "data" << open_array << loading << (float)memtotal << (float)memavl
                       << close_array << finalize;
        col.insert_one(val.view());
    } catch (std::exception e)
    {
        cout << "err to connect mongodb " << e.what() << endl;
    }
}

struct ContainerInfo
{
    string name;
    uint32_t cpu;
    uint64_t memcost;
    uint64_t net_in;
    uint64_t net_out;
    uint64_t block_in;
    uint64_t block_out;
};

uint64_t get_bit_str(const char *start, const char *end)
{
    char *tmp = const_cast<char *>(end);
    float val = strtof(start, &tmp);
    if (end == tmp)
    {
        return val;
    }
    if (*tmp == 'B' || *tmp == 'b')
    {
        val /= 1024;
    }
    else if (*tmp == 'M' || *tmp == 'm')
    {
        val *= 1024;
    }
    else if (*tmp == 'G' || *tmp == 'g')
    {
        val *= 1024 * 1024;
    }
    return val;
}

void do_docker_monitor()
{
    int fds[2];
    if (pipe(fds) < 0)
    {
        cout << "err to get pipe\n";
        return;
    }
    int pid = fork();
    if (pid < 0)
    {
        cout << "err to fork\n";
        return;
    }
    else if (pid == 0)
    {
        close(fds[0]);
        dup2(fds[1], 1);
        dup2(fds[1], 2);
        if (execlp("docker", "docker", "stats", "--format",
                   "{{.Name}} {{.CPUPerc}} {{.MemUsage}} {{.NetIO}} {{.BlockIO}}", "--no-stream", 0) < 0)
        {
            cout << "exec fail\n";
            exit(-1);
        }
    }
    else if (pid > 0)
    {
        close(fds[1]);
        __gnu_cxx::stdio_filebuf<char> filebuf(fds[0], std::ios::in);
        istream is(&filebuf);
        string s;
        vector<ContainerInfo> vec;
        while (getline(is, s))
        {
            if (s == "exec fail" || s.find("permission denied") != std::string::npos ||
                s.find("Cannot connect to") != std::string::npos)
            {
                cout << "Exec docker command fail. Checking permissions\n";
                break;
            }
            ContainerInfo info;
            const char *ptr = s.c_str(), *last;
            last = ptr;
            int stage = 0;

            while (*ptr != '\0')
            {
                if (*ptr == ' ')
                {
                    string val = s.substr(last - s.c_str(), ptr - last);
                    if (stage == 0)
                    {
                        info.name = val;
                    }
                    else if (stage == 1)
                    {
                        char *end = const_cast<char *>(ptr);
                        info.cpu = strtof(last, &end) * 100;
                    }
                    else if (stage == 2)
                    {
                        info.memcost = get_bit_str(last, ptr);
                    }
                    else if (stage == 5)
                    {
                        info.net_in = get_bit_str(last, ptr);
                    }
                    else if (stage == 7)
                    {
                        info.net_out = get_bit_str(last, ptr);
                    }
                    else if (stage == 8)
                    {
                        info.block_in = get_bit_str(last, ptr);
                    }
                    else if (stage == 10)
                    {
                        info.block_out = get_bit_str(last, ptr);
                    }
                    stage++;
                    last = ptr + 1;
                }
                ptr++;
            }
            vec.emplace_back(move(info));
        }
        waitpid(pid, 0, 0);
        // for (auto &info : vec)
        // {
        //     cout << info.name << " cpu " << info.cpu << " mem " << info.memcost << "KiB Net " << info.net_in << "/"
        //          << info.net_out << "kb Block " << info.block_in << "/" << info.block_out << "kb" << endl;
        // }
        vector<bsoncxx::document::value> docs;
        for (auto &info : vec)
        {
            if (gServers.count(info.name) == 0)
            {
                continue;
            }
            document doc;
            auto val = doc << "name" << info.name << "data" << open_array << (float)info.cpu << (float)info.memcost
                           << (float)info.net_in << (float)info.net_out << (float)info.block_in << (float)info.block_out
                           << close_array << finalize;
            docs.emplace_back(move(val.view()));
        }
        try
        {
            if (docs.size() > 0)
            {
                mongocxx::client conn{gen_uri()};
                auto col = get_service_col(conn);
                col.insert_many(docs);
            }
        } catch (std::exception e)
        {
            cout << "err to connect mongodb " << e.what() << endl;
        }
    }
}

void read_config(int argc, char *argv[])
{
    string cfg;
    if (argc < 2)
    {
        cfg = "agent.toml";
    }
    else
    {
        cfg = argv[argc - 1];
    }
    std::shared_ptr<cpptoml::table> config;
    try
    {
        config = cpptoml::parse_file(cfg);
    } catch (const std::exception &e)
    {
        cout << "can't find config file agent.toml" << endl;
        exit(-1);
    }
    auto uri = config->get_qualified_as<string>("mongodb.uri");
    if (!uri)
    {
        cout << "config mongodb.uri is empty" << endl;
        exit(-1);
    }
    gUri = uri.value_or("");
    auto dbname = config->get_qualified_as<string>("mongodb.dbname");
    if (!dbname)
    {
        cout << "config mongodb.dbname is empty" << endl;
        exit(-1);
    }
    gDBName = dbname.value_or("");
    auto monitorCol = config->get_qualified_as<string>("mongodb.monitorColumnName");
    if (!monitorCol)
    {
        cout << "mongodb.monitorColumnName is empty" << endl;
        exit(-1);
    }
    gMonitorCol = monitorCol.value_or("");
    auto serviceCol = config->get_qualified_as<string>("mongodb.serviceColumnName");
    if (!serviceCol)
    {
        cout << "mongodb.serviceColumnName is empty" << endl;
        exit(-1);
    }
    auto logCol = config->get_qualified_as<string>("mongodb.logColumnName");
    if (!logCol)
    {
        cout << "mongodb.logColumnName is empty" << endl;
        exit(-1);
    }
    gLogCol = logCol.value_or("");

    gServiceCol = serviceCol.value_or("");
    auto host = config->get_qualified_as<string>("log.bind");
    if (!host)
    {
        cout << "log.bind is empty. set 127.0.0.1" << endl;
        exit(-1);
    }
    gBindAddress = host.value_or("127.0.0.1");
    if (gBindAddress == "localhost")
    {
        gBindAddress = "127.0.0.1";
    }
    auto port = config->get_qualified_as<uint16_t>("log.port");
    if (!port)
    {
        cout << "log.port is empty. set 10900" << endl;
    }
    gPort = port.value_or(10900);
    auto maxSize = config->get_qualified_as<uint64_t>("log.maxSizePer");
    if (!maxSize)
    {
        cout << "log.maxSizePer is empty. set 4096" << endl;
    }
    gMaxLogSize = maxSize.value_or(4096);
}

// single log
// vid timestamp trackId serverName level a detail
void send_log(std::shared_ptr<char[]> data, vector<pair<size_t, size_t>> ranges)
{
    cout << "post ranges " << ranges.size() << endl;
    vector<bsoncxx::document::value> docs;
    for (auto &range : ranges)
    {
        char *start = data.get() + range.first;
        char *end = data.get() + range.second;

        auto space = std::find(start, end, ' ');
        auto vid = strtoull(start, 0, 10);

        start = space + 1;
        space = std::find(start, end, ' ');
        uint64_t tm = strtoull(start, 0, 10);

        start = space + 1;
        if (start >= end)
            continue;
        space = std::find(start, end, ' ');
        string tid(start, space - start);

        start = space + 1;
        if (start >= end)
            continue;
        space = std::find(start, end, ' ');
        string serverName(start, space - start);

        start = space + 1;
        if (start >= end)
            continue;
        space = std::find(start, end, ' ');
        string level(start, space - start);

        start = space + 1;
        if (start >= end)
            continue;
        string_view detail(start, end - start);
        string detail_str(start, end - start);

        document doc;
        auto val = doc << "vid" << (double)vid << "timestamp" << (double)tm << "tid" << tid << "server" << serverName
                       << "level" << level << "detail" << detail_str << finalize;

        // cout << "vid " << vid << " tm " << tm << " tid " << tid << " server " << serverName << " level " << level
        //      << " detail " << detail_str << endl;
        docs.emplace_back(move(val.view()));
    }
    if (docs.size() > 0)
    {
        try
        {
            mongocxx::client conn{gen_uri()};
            auto col = get_logger_col(conn);
            col.insert_many(docs);
        } catch (std::exception e)
        {
            cout << "err to connect mongodb " << e.what() << endl;
        }
    }
}

struct client_data
{
    shared_ptr<char[]> buffer;
    std::size_t last_pos;
    std::size_t data_pos;
    bool discard;
    asio::ip::tcp::socket peer;
    client_data(asio::ip::tcp::socket peer)
        : last_pos(0)
        , discard(false)
        , data_pos(0)
        , peer(move(peer))
    {
        reset();
    }
    void reset()
    {
        buffer = shared_ptr<char[]>(new char[gMaxLogSize]);
        last_pos = 0;
        discard = false;
    }
};

void read_done(std::shared_ptr<client_data> client, asio::error_code error, std::size_t bytes_recv,
               asio::thread_pool &pool)
{
    vector<pair<size_t, size_t>> ranges;
    shared_ptr<char[]> buffer;
    char *buf_beg = client->buffer.get() + client->last_pos;
    char *buf_end = client->buffer.get() + client->last_pos + bytes_recv;
    while (buf_beg < buf_end)
    {
        auto cur_pos = std::find(buf_beg, buf_end, '\n');
        size_t cur_size = cur_pos - buf_beg;
        if (cur_pos == buf_end) // not end \n
        {
            if (cur_pos == client->buffer.get() + gMaxLogSize) // not space
            {
                // cout << "new buf\n";
                buffer = shared_ptr<char[]>(new char[gMaxLogSize]);
                memcpy(buffer.get(), buf_beg, cur_size);
                client->last_pos = cur_size;
                client->data_pos = 0;
            }
            else
            {
                // cout << "not end \n";
                client->last_pos += cur_size;
                client->data_pos = buf_beg - client->buffer.get();
            }
            break;
        }
        else
        {
            // cout << "client last " << client->data_pos << "size " << (cur_size + client->last_pos - client->data_pos)
            //      << endl;
            if (client->discard)
            {
                client->discard = false;
            }
            else
            {
                ranges.emplace_back(client->data_pos, client->last_pos + cur_size);
            }
            // plus 1 skip \n
            buf_beg += cur_size + 1;
            client->last_pos += cur_size + 1;
            client->data_pos = client->last_pos;
        }
    }
    if (ranges.size() > 0)
    {
        asio::post(pool, std::bind(&send_log, client->buffer, move(ranges)));
    }
    if (buffer)
    {
        client->buffer = buffer;
    }
    client->peer.async_read_some(
        asio::mutable_buffer(client->buffer.get() + client->last_pos, gMaxLogSize - client->last_pos),
        std::bind(&read_done, client, std::placeholders::_1, std::placeholders::_2, ref(pool)));
}

void accept_asio(asio::ip::tcp::acceptor &acc, asio::thread_pool &pool)
{
    acc.async_accept([&pool, &acc](asio::error_code error, asio::ip::tcp::socket peer) {
        accept_asio(acc, pool); // do next
        cout << "new client" << endl;
        bool discard = false;
        if (error)
        {
            return;
        }

        auto client = make_shared<client_data>(move(peer));
        client->peer.async_read_some(
            asio::mutable_buffer(client->buffer.get(), gMaxLogSize),
            std::bind(&read_done, client, std::placeholders::_1, std::placeholders::_2, ref(pool)));
    });
}

void log_loop()
{
    asio::thread_pool pool;
    asio::io_context context(1);
    asio::ip::address bind_address = asio::ip::address::from_string(gBindAddress);
    asio::ip::tcp::acceptor acceptor(context, asio::ip::tcp::endpoint(bind_address, gPort), true);
    accept_asio(acceptor, pool);
    context.run();
}

void do_servers_update()
{
    if (!gNeedUpdate)
    {
        return;
    }
    cout << "reloading" << endl;
    ifstream fs("./agent_servers.txt");
    gServers.clear();
    string ss;
    getline(fs, ss, '\n');
    if (ss == "")
    {
        cout << "error get agent_servers.txt" << endl;
        exit(-1);
    }
    gVmName = ss;
    while (getline(fs, ss, '\n'))
    {
        if (!ss.empty())
            gServers.insert(ss);
    }
    gNeedUpdate = false;
}

int notify_servers_file()
{
    int fd = inotify_init();
    if (fd < 0)
    {
        fd = errno;
        cout << "init inotify fail ret " << fd << endl;
        return -1;
    }
    int ret = inotify_add_watch(fd, "./agent_servers.txt", IN_CREATE | IN_MODIFY);
    if (ret < 0)
    {
        ret = errno;
        cout << "inotify add watch fail ret " << ret << endl;
        return -1;
    }
    return fd;
}

void update_notify_info(int fd)
{
    unique_ptr<char[]> buf = unique_ptr<char[]>(new char[4096]);
    int len = read(fd, buf.get(), 4096);
    int pos = 0;
    while (pos < len)
    {
        inotify_event *event = (inotify_event *)&buf[pos];
        gNeedUpdate = true;
        return;
    }
}

void main_loop()
{
    int fd = notify_servers_file();
    int evfd = epoll_create(1);
    if (fd > 0)
    {
        epoll_event ev;
        memset(&ev, 0, sizeof(ev));
        ev.events = EPOLLIN;
        ev.data.fd = fd;
        epoll_ctl(evfd, EPOLL_CTL_ADD, fd, &ev);
    }
    const int tm = 60;
    timeval last;
    last.tv_sec = time(0) - tm;
    while (true)
    {
        time_t now = time(0);
        if (now - last.tv_sec < tm)
        {
            epoll_event event;
            if (epoll_wait(evfd, &event, 1, (now - last.tv_sec) * 1000) == 1)
            {
                update_notify_info(fd);
            }
            continue;
        }
        if (fd < 0)
        {
            gNeedUpdate = true; // fallback
        }
        do_servers_update();
        do_full_monitor();
        do_docker_monitor();
        last.tv_sec = time(0);
    }
}

void sig_func(int sig) { exit(-1); }
void at_exit() { unlink("./agent.pid"); }

int main(int argc, char *argv[])
{
    if (argc >= 2 && string(argv[1]) == "-d")
    {
        daemon(1, 0);
    }
    else if (argc >= 2 && string(argv[1]) == "-h")
    {
        cout << R"(./agent [option] config_path
options:
    -d run as daemon
    -h show this help message
)";
        return 0;
    }

    read_config(argc, argv);
    atexit(at_exit);
    ofstream fs("./agent.pid");
    fs << getpid();
    fs.flush();

    signal(SIGINT, sig_func);
    signal(SIGTERM, sig_func);
    signal(SIGSEGV, sig_func);
    std::thread thd(log_loop);
    main_loop();
    return 0;
}

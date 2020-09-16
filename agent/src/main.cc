#include <ext/stdio_filebuf.h>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <sys/types.h>
#include <sys/wait.h>
#include <unistd.h>
#include <vector>

#include "bsoncxx/builder/stream/document.hpp"
#include "bsoncxx/json.hpp"
#include "cpptoml.h"
#include "mongocxx/client.hpp"
#include "mongocxx/instance.hpp"

using namespace std;
string gUri;
string gDBName;
string gMonitorCol;
string gServiceCol;

mongocxx::uri gen_uri() { return {gUri}; }
mongocxx::v_noabi::collection get_monitor_col(mongocxx::client &cli) { return move(cli[gDBName][gMonitorCol]); }
mongocxx::v_noabi::collection get_service_col(mongocxx::client &cli) { return move(cli[gDBName][gServiceCol]); }

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
    cout << loading << " " << memtotal << " " << memavl << endl;

    mongocxx::client conn{gen_uri()};
    auto col = get_monitor_col(conn);
    document doc;
    auto val = doc << "data" << open_array << loading << (float)memtotal << (float)memavl << close_array << finalize;
    col.insert_one(val.view());
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
            cout << s << endl;
            if (s == "exec fail" || s.find("permission denied") != std::string::npos)
            {
                cout << "Exec docker command fail. Checking permissions\n";
                return;
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
        for (auto &info : vec)
        {
            cout << info.name << " cpu " << info.cpu << " mem " << info.memcost << "KiB Net " << info.net_in << "/"
                 << info.net_out << "kb Block " << info.block_in << "/" << info.block_out << "kb" << endl;
        }
        mongocxx::client conn{gen_uri()};
        auto col = get_service_col(conn);
        for (auto &info : vec)
        {
            document doc;
            auto val = doc << "name" << info.name << "data" << open_array << (float)info.cpu << (float)info.memcost
                           << (float)info.net_in << (float)info.net_out << (float)info.block_in << (float)info.block_out
                           << close_array << finalize;
            col.insert_one(val.view());
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
        cfg = argv[1];
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
    gServiceCol = serviceCol.value_or("");
}

void main_loop()
{
    const int tm = 60;
    timeval last;
    last.tv_sec = time(0) - tm;
    while (true)
    {
        time_t now = time(0);
        if (now - last.tv_sec < tm)
        {
            timeval tv;
            tv.tv_sec = (now - last.tv_sec);
            tv.tv_usec = 0;
            select(0, 0, 0, 0, &tv);
            continue;
        }
        do_full_monitor();
        do_docker_monitor();
        last.tv_sec = time(0);
    }
}

int main(int argc, char *argv[])
{
    read_config(argc, argv);
    main_loop();
    return 0;
}

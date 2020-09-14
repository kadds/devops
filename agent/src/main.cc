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
#include "mongocxx/client.hpp"
#include "mongocxx/instance.hpp"

using namespace std;
#define DBNAME "devops_db"
#define DCOL "monitor"

bool startWith(const string &str, const char *target, const char **out)
{
    for (int i = 0; i < str.size(); i++)
    {
        if (*target != str[i])
            return false;
        target++;
        if (*target == '\0')
        {
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

    // mongocxx::instance inst{};
    // mongocxx::client conn{mongocxx::uri{"mongodb://admin:123456@localhost/test"}};
    // bsoncxx::builder::stream::document doc;
    // auto col = conn[DBNAME][DCOL];
    // document << loading << memtotal << memavl;
}

struct ContainerInfo
{
    string name;
    uint32_t cpu;
    uint64_t memcost;
    uint64_t netcost;
    uint64_t blockcost;
};

uint64_t get_bit_str(const char *start, const char *end)
{
    char *tmp = const_cast<char *>(end);
    uint64_t val = strtoul(start, &tmp, 10);
    if (end == tmp)
    {
        return val;
    }
    if (*end == 'B' || *end == 'b')
    {
        val /= 1024;
    }
    else if (*end == 'M' || *end == 'm')
    {
        val *= 1024;
    }
    else if (*end == 'G' || *end == 'g')
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
            if (s == "exec fail")
            {
                cout << "exec fail\n";
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
                        info.netcost = get_bit_str(last, ptr);
                    }
                    else if (stage == 8)
                    {
                        info.blockcost = get_bit_str(last, ptr);
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
            cout << info.name << " cpu " << info.cpu << " mem " << info.memcost << "KiB Net " << info.netcost
                 << "kb Block " << info.blockcost << endl;
        }
    }
}

int main(int argc, char *argv[])
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
    return 0;
}

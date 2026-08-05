import socket
import concurrent.futures

def check_ip(ip):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    res = s.connect_ex((ip, 22))
    s.close()
    if res == 0:
        return ip
    return None

ips = [f'192.168.1.{i}' for i in range(1, 255) if i != 133 and i != 254]
open_ips = []

with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
    results = executor.map(check_ip, ips)
    for res in results:
        if res:
            open_ips.append(res)

print("FOUND_SSH_IPS:", open_ips)

import socket

ip = '192.168.1.145'
ports = [22, 80, 443, 8080, 11434, 3000, 5000]

for port in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1.0)
    res = s.connect_ex((ip, port))
    s.close()
    if res == 0:
        print(f"Port {port} is OPEN on {ip}")
    else:
        print(f"Port {port} is closed/filtered on {ip}")

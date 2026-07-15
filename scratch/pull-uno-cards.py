import pty
import os
import sys
import time

dest_path = '/home/maison/bagbot-elite/uno-cards'
print(f"Creating directory {dest_path}...")
os.makedirs(dest_path, exist_ok=True)

print("Pulling uno-cards directory recursively...")
pid, fd = pty.fork()
if pid == 0:
    # Child process: run scp -r
    cmd = [
        'scp',
        '-r',
        '-o', 'StrictHostKeyChecking=no',
        'bagbot@192.168.1.37:/home/bagbot/Bag-bot/uno-cards/*',
        dest_path
    ]
    os.execvp('scp', cmd)
else:
    # Parent process: feed password
    password_sent = False
    while True:
        try:
            data = os.read(fd, 1024).decode('utf-8', errors='ignore')
            if not data:
                break
            if 'password:' in data.lower() and not password_sent:
                os.write(fd, b'bagbot\n')
                password_sent = True
                print("  Password sent...")
        except Exception:
            break
    
    # Wait for child
    _, status = os.waitpid(pid, 0)
    if status == 0:
        print("Successfully pulled uno-cards!")
    else:
        print(f"Failed to pull uno-cards (status {status}).")

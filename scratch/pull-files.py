import pty
import os
import sys
import time

# Mapping of file names on the VM to their destination subdirectories in the new bot
files_to_pull = {
    'daily.js': 'economy',
    'donner.js': 'economy',
    'dropargent.js': 'economy',
    'dropxp.js': 'economy',
    'uno.js': 'game',
    'couleur.js': 'shop',
    'tribunal.js': 'moderation'
}

for filename, dest_folder in files_to_pull.items():
    dest_path = f'/home/maison/bagbot-elite/src/commands/{dest_folder}/{filename}'
    print(f"Pulling {filename} -> {dest_path}...")
    
    pid, fd = pty.fork()
    if pid == 0:
        # Child process: run scp
        cmd = [
            'scp',
            '-o', 'StrictHostKeyChecking=no',
            f'bagbot@192.168.1.37:/home/bagbot/Bag-bot/src/commands/{filename}',
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
            print(f"  Successfully pulled {filename}!")
        else:
            print(f"  Failed to pull {filename} (status {status}).")
    
    time.sleep(1)

print("\nAll commands pulled!")

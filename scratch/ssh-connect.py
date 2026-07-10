import os
import sys
import pty
import select
import subprocess

def run_ssh():
    # Spawns a tty so ssh will accept password input
    master, slave = pty.openpty()
    
    # Run the SSH command
    cmd = ['ssh', '-o', 'StrictHostKeyChecking=no', '-p', '33000', 'bagbot@82.65.75.176', 'ls -la /home/bagbot/Bag-bot']
    
    proc = subprocess.Popen(
        cmd,
        stdin=slave,
        stdout=slave,
        stderr=slave,
        close_fds=True
    )
    
    # Close slave descriptor in parent
    os.close(slave)
    
    # We will read from master and watch for "password"
    password_sent = False
    
    while True:
        r, w, x = select.select([master], [], [], 10)
        if not r:
            break
            
        try:
            data = os.read(master, 1024)
        except OSError:
            break
            
        if not data:
            break
            
        # Decode and print data
        chunk = data.decode('utf-8', errors='ignore')
        sys.stdout.write(chunk)
        sys.stdout.flush()
        
        if 'password:' in chunk.lower() and not password_sent:
            os.write(master, b'bagbot\n')
            password_sent = True

if __name__ == '__main__':
    run_ssh()

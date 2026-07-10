import os
import sys
import pty
import select

def download():
    pid, fd = pty.fork()
    if pid == 0:
        # Child process - copy config.json from Freebox VM
        os.execvp('scp', [
            'scp', 
            '-o', 'StrictHostKeyChecking=no', 
            'bagbot@192.168.1.37:/var/data/config.json', 
            '/home/maison/bagbot-elite/scratch/freebox-config.json'
        ])
    else:
        # Parent process
        password_sent = False
        while True:
            r, w, x = select.select([fd], [], [], 30)
            if not r:
                break
            try:
                data = os.read(fd, 1024)
            except OSError:
                break
            if not data:
                break
            chunk = data.decode('utf-8', errors='ignore')
            sys.stdout.write(chunk)
            sys.stdout.flush()
            
            if ('password' in chunk.lower() or 'passe' in chunk.lower()) and not password_sent:
                os.write(fd, b'bagbot\n')
                password_sent = True

if __name__ == '__main__':
    download()

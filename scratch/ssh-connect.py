import os
import sys
import pty
import select

def run_ssh():
    pid, fd = pty.fork()
    if pid == 0:
        # Processus enfant
        os.execvp('ssh', ['ssh', '-o', 'StrictHostKeyChecking=no', 'bagbot@192.168.1.37', 'grep -rnwi "couleur" /home/bagbot/Bag-bot/src/ | head -n 40'])
    else:
        # Processus parent
        password_sent = False
        while True:
            r, w, x = select.select([fd], [], [], 10)
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
    run_ssh()

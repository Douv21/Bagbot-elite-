const { execSync } = require('child_process');

try {
  console.log('Writing clean systemd override file...');
  const remoteCmd = `sshpass -p ollama ssh -o StrictHostKeyChecking=no freebox@192.168.1.145 "echo '[Service]' > /tmp/override.conf && echo 'Environment=\\"OLLAMA_HOST=0.0.0.0\\"' >> /tmp/override.conf && echo 'Environment=\\"OLLAMA_ORIGINS=*\\"' >> /tmp/override.conf && echo ollama | sudo -S cp /tmp/override.conf /etc/systemd/system/ollama.service.d/override.conf && echo ollama | sudo -S systemctl daemon-reload && echo ollama | sudo -S systemctl restart ollama"`;
  
  const output = execSync(remoteCmd, { encoding: 'utf8' });
  console.log('OUTPUT:', output);
} catch (err) {
  console.error('ERROR:', err.message);
}

const { execSync } = require('child_process');

try {
  console.log('Binding Ollama on Freebox VM 192.168.1.145 to 0.0.0.0:11434...');
  
  const cmd = `sshpass -p ollama ssh -o StrictHostKeyChecking=no freebox@192.168.1.145 "echo ollama | sudo -S bash -c 'mkdir -p /etc/systemd/system/ollama.service.d && printf \\"[Service]\\nEnvironment=\\\\"OLLAMA_HOST=0.0.0.0:11434\\\\"\\nEnvironment=\\\\"OLLAMA_ORIGINS=*\\\\"\\n\\" > /etc/systemd/system/ollama.service.d/override.conf && systemctl daemon-reload && systemctl restart ollama'"`;
  
  const output = execSync(cmd, { encoding: 'utf8' });
  console.log('OUTPUT:', output);
} catch (err) {
  console.error('ERROR:', err.message);
}

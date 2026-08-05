import urllib.request
import json
import time

url = 'http://192.168.1.145:11434/api/generate'
payload = {
    "model": "qwen2.5:0.5b",
    "prompt": "Bonjour ! Fais une phrase très courte et chaleureuse pour saluer un ami.",
    "stream": False
}

data = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        t1 = time.time()
        print(f"OLLAMA_GEN_SUCCESS in {t1 - t0:.2f}s:")
        print("Response:", res.get("response"))
except Exception as e:
    print("OLLAMA_GEN_ERROR:", e)

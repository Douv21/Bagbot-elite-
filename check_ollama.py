import urllib.request
import json

url = 'http://192.168.1.145:11434/api/tags'
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req, timeout=3) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("OLLAMA_TAGS_RESPONSE:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print("OLLAMA_TAGS_ERROR:", e)

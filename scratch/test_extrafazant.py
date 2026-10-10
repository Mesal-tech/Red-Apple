import urllib.request
import re

req = urllib.request.Request('https://www.extrafazant.nl', headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as resp:
        html = resp.read().decode('utf-8')
        
        idx = html.find('Brengt je merk in beweging')
        if idx != -1:
            snippet = html[max(0, idx - 400): min(len(html), idx + 800)]
            print("=== HERO SNIPPET ===")
            print(snippet)
        else:
            print("Not found directly, searching case-insensitive...")
            m = re.search(r'beweging', html, re.IGNORECASE)
            if m:
                print(html[max(0, m.start() - 300): min(len(html), m.start() + 500)])
                
        # Find all script src
        scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', html)
        print("=== SCRIPTS ===")
        for s in scripts:
            if 'webflow' in s or 'cdn' in s:
                print(s)
except Exception as e:
    print("Error:", e)

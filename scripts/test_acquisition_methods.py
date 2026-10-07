import requests
import json
import re

headers_desktop = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
}

username = 'karrar_hussain_jobs'

print(f"=== TESTING ACQUISITION METHODS FOR @{username} ===")

# METHOD 1: Direct Profile HTML + Script Data Parsing
url1 = f"https://www.instagram.com/{username}/"
r1 = requests.get(url1, headers=headers_desktop)
print(f"1. Direct Profile HTML Status: {r1.status_code}, Length: {len(r1.text)}")
if r1.status_code == 200:
    # Check for ld+json or window.__additional_data or _sharedData
    shortcodes = re.findall(r'"shortcode":"([A-Za-z0-9_-]{9,13})"', r1.text)
    print(f"   Shortcodes extracted from HTML scripts: {set(shortcodes)}")

# METHOD 2: Instagram Embed Profile Feed (https://www.instagram.com/{username}/embed/)
url2 = f"https://www.instagram.com/{username}/embed/"
r2 = requests.get(url2, headers=headers_desktop)
print(f"2. Profile Embed HTML Status: {r2.status_code}, Length: {len(r2.text)}")
if r2.status_code == 200:
    shortcodes_embed = re.findall(r'instagram\.com/p/([A-Za-z0-9_-]+)|instagram\.com/reel/([A-Za-z0-9_-]+)', r2.text)
    print(f"   Shortcodes extracted from Embed HTML: {shortcodes_embed}")

# METHOD 3: Public RSS / Open Mirrors / RSSHub
url3 = f"https://rsshub.app/instagram/user/{username}"
try:
    r3 = requests.get(url3, headers=headers_desktop, timeout=8)
    print(f"3. RSSHub Status: {r3.status_code}, Length: {len(r3.text)}")
except Exception as e:
    print("3. RSSHub Error:", e)

# METHOD 4: Google Web Cache / Search Snippets for @karrar_hussain_jobs
url4 = f"https://www.google.com/search?q=site:instagram.com/reel/+karrar_hussain_jobs"
try:
    r4 = requests.get(url4, headers=headers_desktop, timeout=8)
    print(f"4. Google Search Status: {r4.status_code}, Length: {len(r4.text)}")
    if r4.status_code == 200:
        reels = re.findall(r'instagram\.com/reel/([A-Za-z0-9_-]+)', r4.text)
        print(f"   Reel shortcodes from Google Search: {set(reels)}")
except Exception as e:
    print("4. Google Search Error:", e)

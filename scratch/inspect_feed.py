import urllib.request
import xml.etree.ElementTree as ET

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)

with urllib.request.urlopen(req) as response:
    xml_content = response.read()
    
root = ET.fromstring(xml_content)
ns = {'atom': 'http://www.w3.org/2005/Atom'}

for entry in root.findall('atom:entry', ns)[:5]:
    title = entry.find('atom:title', ns).text
    content_elem = entry.find('atom:content', ns)
    print("=" * 60)
    print(f"TITLE: {title}")
    if content_elem is not None:
        print(f"RAW CONTENT:\n{content_elem.text[:1000]}")

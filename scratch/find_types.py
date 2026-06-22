import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
req = urllib.request.Request(
    url, 
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
)

with urllib.request.urlopen(req) as response:
    xml_content = response.read()
    
root = ET.fromstring(xml_content)
ns = {'atom': 'http://www.w3.org/2005/Atom'}

types = set()

for entry in root.findall('atom:entry', ns):
    content_elem = entry.find('atom:content', ns)
    if content_elem is not None and content_elem.text:
        soup = BeautifulSoup(content_elem.text, 'html.parser')
        for h3 in soup.find_all('h3'):
            types.add(h3.get_text().strip())

print("Unique h3 types:", list(types))

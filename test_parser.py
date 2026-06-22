import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import json

def fetch_and_parse():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    )
    
    with urllib.request.urlopen(req) as response:
        xml_content = response.read()
        
    root = ET.fromstring(xml_content)
    
    # Namespaces
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns).text
        updated = entry.find('atom:updated', ns).text
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.get('href') if link_elem is not None else ""
        content_elem = entry.find('atom:content', ns)
        
        if content_elem is not None:
            html_content = content_elem.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            notes = []
            current_type = None
            current_html = []
            
            # BeautifulSoup findall h3 or other siblings
            # Let's traverse all top-level children of the body
            for child in soup.contents:
                if child.name == 'h3':
                    if current_type:
                        notes.append({
                            'type': current_type,
                            'content': ''.join(str(c) for c in current_html).strip()
                        })
                    current_type = child.get_text().strip()
                    current_html = []
                else:
                    if current_type or str(child).strip():
                        # If we haven't seen an h3 yet, default to "Announcement" or "General"
                        if not current_type:
                            current_type = "Announcement"
                        current_html.append(child)
            
            if current_type:
                notes.append({
                    'type': current_type,
                    'content': ''.join(str(c) for c in current_html).strip()
                })
                
            entries.append({
                'date': title,
                'updated': updated,
                'link': link,
                'notes': notes
            })
            
    print(json.dumps(entries[:3], indent=2))

if __name__ == "__main__":
    fetch_and_parse()

from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import os

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
cache = None

def get_feed_data():
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AntigravityFeedReader/1.0'}
    )
    with urllib.request.urlopen(req) as response:
        return response.read()

def parse_release_notes(xml_data):
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    entries = []
    
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns).text
        updated = entry.find('atom:updated', ns).text
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.get('href') if link_elem is not None else ""
        content_elem = entry.find('atom:content', ns)
        
        notes = []
        if content_elem is not None and content_elem.text:
            html_content = content_elem.text
            soup = BeautifulSoup(html_content, 'html.parser')
            
            current_type = None
            current_html = []
            
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
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def releases():
    global cache
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if cache is None or force_refresh:
        try:
            xml_data = get_feed_data()
            cache = parse_release_notes(xml_data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
            
    return jsonify(cache)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

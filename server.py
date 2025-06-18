#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        # API endpoint to get the API key
        if parsed_path.path == '/api/config':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            config = {
                'apiKey': os.environ.get('CHUTES_API_KEY', ''),
                'apiEndpoint': 'https://llm.chutes.ai/v1/chat/completions'
            }
            
            self.wfile.write(json.dumps(config).encode())
            return
        
        # Serve static files normally
        super().do_GET()

if __name__ == "__main__":
    PORT = 5000
    with socketserver.TCPServer(("0.0.0.0", PORT), GameHandler) as httpd:
        print(f"Serving at http://0.0.0.0:{PORT}")
        httpd.serve_forever()
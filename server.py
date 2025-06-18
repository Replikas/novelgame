#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"Received request for path: {self.path}")  # Debug log
        parsed_path = urlparse(self.path)
        
        # API endpoint to get the API key
        if parsed_path.path == '/api/config':
            print("Handling /api/config request")  # Debug log
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
        print(f"Serving static file: {self.path}")  # Debug log
        super().do_GET()

if __name__ == "__main__":
    PORT = int(os.environ.get('PORT', 5000))
    print(f"Starting server on port {PORT}")  # Debug log
    
    # Allow port reuse to avoid "Address already in use" error
    class ReusableTCPServer(socketserver.TCPServer):
        allow_reuse_address = True
    
    with ReusableTCPServer(("0.0.0.0", PORT), GameHandler) as httpd:
        print(f"Server is running at http://0.0.0.0:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down the server...")
            httpd.shutdown()
        except Exception as e:
            print(f"Error occurred: {str(e)}")  # Debug log
            raise
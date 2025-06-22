#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
from urllib.parse import urlparse, parse_qs
import requests
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.')

CHARSNAP_TOKEN = os.environ.get("CHARSNAP_TOKEN")

@app.route('/api/charsnap', methods=['POST'])
def charsnap_proxy():
    payload = request.json
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {CHARSNAP_TOKEN}"
    }
    resp = requests.post("https://api.charsnap.ai/api/v1/chat/add", json=payload, headers=headers)
    return (resp.content, resp.status_code, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'})

@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        print(f"Received request for path: {self.path}")  # Debug log
        parsed_path = urlparse(self.path)
        
        # Health check endpoint
        if parsed_path.path == '/health':
            print("Health check request received")  # Debug log
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode())
            return
            
        # API endpoint to get the API key
        if parsed_path.path == '/api/config':
            print("Handling /api/config request")  # Debug log
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            config = {
                'chutesApiKey': os.environ.get('CHUTES_API_KEY', ''),
                'chutesApiEndpoint': 'https://llm.chutes.ai/v1/chat/completions',
                'openRouterApiKey': os.environ.get('OPENROUTER_API_KEY', ''),
                'openRouterApiEndpoint': 'https://openrouter.ai/api/v1/chat/completions',
                'groqApiKey': os.environ.get('GROQ_API_KEY', ''),
                'groqApiEndpoint': 'https://api.groq.com/openai/v1/chat/completions'
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
            app.run(host='0.0.0.0', port=PORT)
        except KeyboardInterrupt:
            print("\nShutting down the server...")
            httpd.shutdown()
        except Exception as e:
            print(f"Error occurred: {str(e)}")  # Debug log
            raise
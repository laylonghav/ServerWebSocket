const express = require('express');
const http = require('http');
const path = require('path');
const startWebSocketServer = require('./src/Socket/websocket-plugin');

const app = express();
const server = http.createServer(app);

// Serve static files (like index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Start WebSocket on the same HTTP server
startWebSocketServer(server);

const HOST = '192.168.1.24';
const PORT = 3000;

server.listen(PORT, HOST, () => {
  console.log(`Server running at ${HOST}:${PORT}`);
});


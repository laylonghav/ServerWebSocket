const WebSocket = require('ws');

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', message => {
      const msgStr = message.toString();
      console.log('Received:', msgStr);

    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

module.exports = startWebSocketServer;

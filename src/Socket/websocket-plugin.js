const WebSocket = require('ws');

// Global control data
const rtuControls = {
  "": {
    Control: "",
    ControlStatus: ""
  }
};

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on('connection', ws => {
    console.log('Client connected');

    // Send initial control data to the client
    ws.send(JSON.stringify({ type: 'init', data: rtuControls }));

    ws.on('message', message => {
      const msgStr = message.toString();
      console.log('Received:', msgStr);

      try {
        const parsed = JSON.parse(msgStr);

        // Handle control update
        if (parsed.type === 'control' && parsed.deviceId && parsed.control) {
          const { deviceId, control } = parsed;

          if (rtuControls[deviceId]) {
            rtuControls[deviceId].Control = control;
            rtuControls[deviceId].ControlStatus = control; // optionally sync status
          } else {
            // If device not yet in map, create it
            rtuControls[deviceId] = {
              Control: control,
              ControlStatus: control
            };
          }

          // Optionally broadcast the updated control to all clients
          const updateMessage = JSON.stringify({
            type: 'update',
            deviceId,
            control
          });

          wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });

          console.log(`Updated ${deviceId}: ${control}`);
        }
      } catch (err) {
        console.error('Invalid message format:', err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
}

module.exports = startWebSocketServer;

const WebSocket = require('ws');

// Global control data
const rtuControls = {
  "": {
    Control: "",
    ControlStatus: ""
  }
};

// Optional: Store added generals in memory (simulate DB)
const generalStore = [];

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

        // ✅ Handle device control update
        if (parsed.type === 'control' && parsed.deviceId && parsed.control) {
          const { deviceId, control } = parsed;

          if (rtuControls[deviceId]) {
            rtuControls[deviceId].Control = control;
            rtuControls[deviceId].ControlStatus = control;
          } else {
            rtuControls[deviceId] = {
              Control: control,
              ControlStatus: control
            };
          }

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

        // ✅ Handle adding General component
        else if (parsed.type === 'ADD_GENERAL' && parsed.payload) {
          const generalData = parsed.payload;

          // Add to mock store with a fake ID
          const newGeneral = {
            ...generalData,
            general_id: `gen-${Date.now()}`
          };
          generalStore.push(newGeneral);

          console.log("General added:", newGeneral);

          // Send confirmation back to sender
          ws.send(JSON.stringify({
            type: 'GENERAL_ADDED',
            payload: newGeneral
          }));

          // Optionally broadcast to other clients
          const broadcast = JSON.stringify({
            type: 'NEW_GENERAL_BROADCAST',
            payload: newGeneral
          });

          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcast);
            }
          });
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

const WebSocket = require("ws");

function broadcast(wss, message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

const generalStore = [];

function GeneralWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");
    ws.send(JSON.stringify({ type: "init" }));

    ws.on("message", (message) => {
      const msgStr = message.toString();
      console.log("Received:", msgStr);

      try {
        const parsed = JSON.parse(msgStr);
        const rtuId = Object.keys(parsed)[0];
        const payload = parsed[rtuId];

        if (payload && payload.GeneralData) {
          const generalData = payload.GeneralData;

          // Validate essential fields
          if (
            generalData.name &&
            generalData.holding_register?.add_no != null &&
            generalData.input_register?.add_no != null &&
            generalData.slave_id?.add_no != null
          ) {
            // Store or update
            const existing = generalStore.find(item => item.id_rtu === rtuId && item.name === generalData.name);

            if (existing) {
              Object.assign(existing, generalData); // update
              console.log(`Updated GeneralData for ${rtuId} -> ${generalData.name}`);
            } else {
              generalStore.push(generalData); // add
              console.log(`Added GeneralData for ${rtuId} -> ${generalData.name}`);
            }

            // Broadcast to all clients
            broadcast(wss, {
              type: "general-data-update",
              rtuId,
              generalData
            });
          } else {
            console.warn("Invalid GeneralData payload: missing required fields");
          }
        }

      } catch (err) {
        console.error("Invalid message format:", err);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

module.exports = GeneralWebSocketServer;

const WebSocket = require("ws");

const generalStore = [];
const controlStore = [];
const VFDStore = {};

function broadcastOnce(wss, generalStore, controlStore, VFDStore) {
  const message = {
    type: "initial-data",
    controlStore,
    generalStore,
    VFDStore,
  };

  console.log(JSON.stringify(message, null, 2));

  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.on("message", (message) => {
      const msgStr = message.toString();
      console.log("Received:", msgStr);

      try {
        const parsed = JSON.parse(msgStr);
        const rtuId = Object.keys(parsed)[0];
        const payload = parsed[rtuId];

        console.log("RTU ID : ", rtuId);

        if (payload?.Control) {
          const controlString = payload.Control;
          const controlObj = {};

          controlString.split(",").forEach((pair) => {
            const [key, value] = pair.split("=");
            controlObj[key.trim()] = parseInt(value.trim());
          });

          const existing = controlStore.find((item) => item.rtuId === rtuId);
          if (existing) {
            existing.control = controlObj;
          } else {
            controlStore.push({ rtuId, control: controlObj });
          }
          // console.log(controlObj);
          broadcast(wss, {
            type: rtuId, //"control-update",
            // rtuId,
            control: controlObj,
          });
        }

        if (payload?.GeneralData) {
          const data = payload.GeneralData;
          const existing = generalStore.find(
            (item) => item.id_rtu === data.id_rtu
          );
          if (existing) {
            Object.assign(existing, data);
          } else {
            generalStore.push(data);
          }

          broadcast(wss, {
            type: rtuId, // "general-update",
            general: data,
          });
        }

        // if (payload?.VFDData) {
        //   const data = payload.VFDData;

        //   const existing = VFDStore.find((item) => item.rtuId === rtuId);
        //   if (existing) {
        //     existing.data = data;
        //   } else {
        //     VFDStore.push({ rtuId, data });
        //   }

        //   broadcast(wss, {
        //     type: rtuId,
        //     VFD: data,
        //   });
        // }

        // —— UPDATED VFDData handler ——
        if (payload?.VFDData) {
          const vfdBlock = payload.VFDData;

          // If this rtuId does not exist yet, create an empty object for it
          if (!VFDStore[rtuId]) {
            VFDStore[rtuId] = {};
          }

          // Merge or update each VFD key under this RTU
          for (const vfdId in vfdBlock) {
            VFDStore[rtuId][vfdId] = {
              ...VFDStore[rtuId][vfdId], // merge existing data (if any)
              ...vfdBlock[vfdId], // overwrite with new data
            };

            // Broadcast this VFD block to all clients
            broadcast(wss, {
              type: rtuId,
              VFD: {
                [vfdId]: VFDStore[rtuId][vfdId],
              },
            });
          }
        }

        //✅ Broadcast both stores just once to this new client
        broadcastOnce(wss, generalStore, controlStore, VFDStore);
      } catch (err) {
        console.error("Invalid message format:", err);
      }
    });

    ws.on("close", () => {
      console.log("Client disconnected");
    });
  });
}

function broadcast(wss, message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

module.exports = startWebSocketServer;

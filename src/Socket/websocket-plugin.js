const WebSocket = require("ws");

// ✅ Full RTU object structure
const rtuControls = {
  "RTU-0923-01": {
    Control: "Output1=1,Output2=1",
    ControlStatus: "Output1=0,Output2=0",
    General1: {
      General1ID: "433434",
      HoldingReg1: "3434",
      InputReg1: "1231",
      Monitor1: "2220",
    },
    Monitor: "input1=1,input2=1",
    Online: "Online",
    Request: "1",
    VFD2: {
      Control2: "FW=1,RE=0,ST=0",
      Control2State: "FW=1,RE=0,ST=0",
      Monitor2: "V=0,C=0,F=0",
      Parameter2: "V=4545,C=NaN,F=NaN,WCM=NaN,FC=34343,RC=34434,SC=34343",
      VFD2ID: "77777",
    },
    WebStatus: "login",
  },
};

// Optional: Store added generals in memory (simulate DB)
const generalStore = [];

function startWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected");

    // ✅ Send initial rtuControls to the client
    ws.send(JSON.stringify({ type: "init", data: rtuControls }));

    ws.on("message", (message) => {
      const msgStr = message.toString();
      console.log("Received:", msgStr);

      try {
        const parsed = JSON.parse(msgStr);

        // ✅ Handle control update
        if (parsed.type === "control" && parsed.deviceId && parsed.control) {
          const { deviceId, control } = parsed;

          if (!rtuControls[deviceId]) {
            rtuControls[deviceId] = {
              Control: control,
              ControlStatus: control,
            };
          } else {
            rtuControls[deviceId].Control = control;
            rtuControls[deviceId].ControlStatus = control;
          }

          const updateMessage = JSON.stringify({
            type: "update",
            deviceId,
            control,
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });

          console.log(`Updated ${deviceId}: ${control}`);
        }

        // ✅ Handle ADD_GENERAL to RTU
        else if (parsed.type === "ADD_GENERAL" && parsed.payload) {
          const generalData = parsed.payload;
          const rtuId = generalData.id_rtu;

          const existingKeys = Object.keys(rtuControls[rtuId] || {}).filter(
            (k) => k.startsWith("General")
          );
          const nextIndex = existingKeys.length + 1;
          const generalKey = `General${nextIndex}`;

          const generalInfo = {
            [`${generalKey}ID`]: generalData.general_id || `gen-${Date.now()}`,
            [`HoldingReg${nextIndex}`]:
              generalData.holding_register?.add_no || "NaN",
            [`InputReg${nextIndex}`]:
              generalData.input_register?.add_no || "NaN",
            [`Monitor${nextIndex}`]: "NaN",
          };

          if (!rtuControls[rtuId]) {
            rtuControls[rtuId] = {};
          }

          rtuControls[rtuId][generalKey] = generalInfo;
          generalStore.push(generalData);

          ws.send(
            JSON.stringify({
              type: "GENERAL_ADDED",
              payload: {
                generalKey,
                generalData,
                generalInfo,
              },
            })
          );

          const broadcast = JSON.stringify({
            type: "NEW_GENERAL_BROADCAST",
            payload: {
              rtuId,
              generalKey,
              generalInfo,
            },
          });

          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(broadcast);
            }
          });

          console.log(`General added to ${rtuId}:`, generalInfo);
        }

        // ✅ Handle UPDATE_GENERAL
        else if (parsed.type === "UPDATE_GENERAL" && parsed.payload) {
          const { deviceId, generalKey, updates } = parsed.payload;

          if (!rtuControls[deviceId]) {
            rtuControls[deviceId] = {};
          }

          if (!rtuControls[deviceId][generalKey]) {
            rtuControls[deviceId][generalKey] = {};
          }

          Object.entries(updates).forEach(([key, value]) => {
            rtuControls[deviceId][generalKey][key] = value;
          });

          console.log(
            `General component ${generalKey} updated for ${deviceId}:`,
            updates
          );

          const broadcastUpdate = JSON.stringify({
            type: "GENERAL_UPDATED",
            payload: { deviceId, generalKey, updates },
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastUpdate);
            }
          });
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

module.exports = startWebSocketServer;

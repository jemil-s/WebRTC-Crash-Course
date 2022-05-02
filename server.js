const ws = require("ws");
const { v4: uuidv4 } = require("uuid");

const wss = new ws.Server(
  {
    port: 4000,
  },
  () => console.log(`Server started on 4000`)
);

let db = {};
let webSockets = {};

wss.on("connection", function connection(ws, req) {
  console.log("started");
  setId(ws);
  ws.on("message", function (msg) {
    const message = JSON.parse(msg);
    switch (message.type) {
      case "offer":
        console.log("get here");
        handleOffer(message);
        break;
      case "getOffer":
        handleGetOffer(message);
        break;
      case "connection":
        broadcastMessage(message);
        break;
    }
  });
});

function setId(ws) {
  const userID = uuidv4();
  webSockets[userID] = ws;
  ws.send(JSON.stringify({ type: "id", payload: userID }));
}

function handleOffer(message) {
  const roomId = uuidv4();
  db[roomId] = {
    offer: message.payload,
  };

  console.log("roomid", roomId);

  broadcastMessage({ type: "roomId", payload: roomId });
}

function handleGetOffer(message) {
  //const offer = db[message.payload].offer;
  console.log(message, "message");
}

function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(message));
  });
}

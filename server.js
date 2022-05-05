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

    //console.log(parsed, "message");
    console.log(message.payload, "payload");
    switch (message.type) {
      case "TESTOffer":
        broadcastMessage({ type: "TESTOffer", payload: message.payload });
        break;
      case "TESTAnswer":
        broadcastMessage({ type: "TESTAnswer", payload: message.payload });
        break;
      case "createRoom": {
        handleCreateRoom(message);
        break;
      }
      case "offer":
        handleOffer(message);
        break;
      case "getOffer":
        handleGetOffer(message);
        break;
      case "connection":
        broadcastMessage(message);
        break;
      case "setAnswer":
        handleSetAnswer(message);
    }
  });
});

function setId(ws) {
  const userID = uuidv4();
  webSockets[userID] = ws;
  ws.send(JSON.stringify({ type: "id", payload: userID }));
}

function handleOffer(message) {
  //const msg = JSON.parse(message);
  const { userId, roomId } = message.payload;

  console.log(userId);
  const creatorId = db[roomId].creatorId;

  webSockets[userId].send(
    JSON.stringify({
      type: "offer",
      payload: { offer: message.payload.offer, creatorId },
    })
  );
}

function handleGetOffer(message) {
  //const offer = db[message.payload].offer;
  console.log(message, "message get offer");
  const { userId, roomId } = message.payload;
  const creatorId = db[roomId].creatorId;
  webSockets[creatorId].send(
    JSON.stringify({
      type: "getOffer",
      payload: {
        userId,
      },
    })
  );
}

function handleCreateRoom(message) {
  const roomId = uuidv4();
  db[roomId] = {
    creatorId: message.payload.userId,
  };
  broadcastMessage({
    type: "setRoomId",
    payload: { creatorId: message.payload.userId, roomId },
  });
}

function handleSetAnswer(message) {
  console.log(message.payload, "get answer");
  const { roomId, answer } = message.payload;
  const creatorId = db[roomId].creatorId;
  webSockets[creatorId].send(
    JSON.stringify({ type: "setAnswer", payload: answer })
  );
}

function broadcastMessage(message) {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(message));
  });
}

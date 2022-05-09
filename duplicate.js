let peerConnection;
let localStream;
let remoteStream;

let servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

let currentRoomId;
let creatorId;
let socket;
let userId;
let answer;
let roomId;

let init = async () => {
  let canvas = document.getElementById("canvas");
  let createRoomBtn = document.getElementById("createRoom");

  let ctx = canvas.getContext("2d");
  localStream = canvas.captureStream(60); // frames per second

  socket = new WebSocket("ws://localhost:4000");

  socket.onopen = socketOpen;
  socket.onmessage = socketMessage;
  socket.onclose = socketClose;
  socket.onerror = socketError;

  createRoomBtn.addEventListener("click", createRoom);

  //document.getElementById("user-1").srcObject = localStream;
};

let createPeerConnection = async (sdpType, userId) => {
  peerConnection = new RTCPeerConnection(servers);

  remoteStream = new MediaStream();

  document.getElementById("user-1").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate === null) {
      if (sdpType === "offer") {
        socket.send(
          JSON.stringify({
            type: "offer",
            payload: {
              userId,
              offer: peerConnection.localDescription,
              roomId,
            },
          })
        );
      } else if (sdpType === "answer") {
        socket.send(
          JSON.stringify({
            type: "answer",
            payload: {
              userId,
              offer: peerConnection.localDescription,
              roomId,
            },
          })
        );
      }
    }
  };
  /* 
  peerConnection.onicegatheringstatechange = async (event) => {
    console.log("event gathering", event);
    const { localDescription } = event.target;
    if (localDescription.type === "offer") {
      console.log("send OFFER");
      socket.send(
        JSON.stringify({
          type: "offer",
          payload: {
            userId,
            offer: peerConnection.localDescription,
            roomId,
          },
        })
      );
    }
    if (localDescription.type === "answer") {
      socket.send(
        JSON.stringify({
          type: "answer",
          payload: {
            userId,
            offer: peerConnection.localDescription,
            roomId,
          },
        })
      );
    }
  };
  */
};

let createOffer = async (userId) => {
  console.log("createOffer called", userId);
  await createPeerConnection("offer", userId);
  console.log("after ", peerConnection.localDescription);

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  console.log("setted peer");

  /*   const payload = {
    offer,
    userId,
  };
  socket.send(JSON.stringify({ type: "offer", payload })); */
};

let createAnswer = async () => {
  /*   let offer = document.getElementById("offer-sdp").value;
  if (!offer) {
    return alert("Retrieve offer first");
  }
 */

  const roomId = document.getElementById("roomId").textContent;

  console.log(roomId, "roomId");

  socket.send(
    JSON.stringify({
      type: "getOffer",
      payload: {
        roomId,
        userId,
      },
    })
  );
};

let addAnswer = async (answer) => {
  console.log("current remote", answer);
  console.log("peer", peerConnection);
  if (!peerConnection.currentRemoteDescription) {
    console.log("current remote");
    peerConnection.setRemoteDescription(answer);
  }
};

let setAnswer = async (offer) => {
  const { creatorId } = offer;
  createPeerConnection("answer", creatorId);

  await peerConnection.setRemoteDescription(offer.offer);

  answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  const videoPlayer = document.getElementById("user-1");

  console.log(answer, "answer");

  videoPlayer.classList.add("show");
};

let setRoomId = (message) => {
  const roomid = document.getElementById("roomId");
  const createRoomBtn = document.getElementById("createRoom");
  const { creatorId } = message;
  const currentRoom = message.roomId;

  if (creatorId !== userId) {
    const joinRoomBtn = document.getElementById("joinRoom");
    joinRoomBtn.style.display = "block";
    joinRoomBtn.addEventListener("click", joinRoom);
  }

  createRoomBtn.style.display = "none";
  roomid.textContent = currentRoom;
  roomId = currentRoom;
};

function joinRoom() {
  const roomId = document.getElementById("roomId").textContent;
  console.log("called join room");
  socket.send(
    JSON.stringify({
      type: "getOffer",
      payload: {
        userId,
        roomId,
      },
    })
  );
}

let socketOpen = (message) => {
  console.log("on conect", message);
};

let socketMessage = (msg) => {
  console.log(msg);
  const message = JSON.parse(msg.data);
  console.log(message);

  switch (message.type) {
    case "id": {
      setId(message.payload);
      break;
    }
    case "setRoomId": {
      console.log("set room id");
      setRoomId(message.payload);
      break;
    }
    case "offer": {
      console.log("getOffer from client", message);
      setAnswer(message.payload);
      break;
    }
    case "setAnswer": {
      console.log("get answer", message);
      addAnswer(message.payload);
      break;
    }
    case "getOffer": {
      sendOffer(message.payload);
      break;
    }
  }
};

let socketClose = () => {};

let socketError = () => {};

function setId(message) {
  userId = message;
}

function createRoom() {
  console.log(userId, "userId");
  socket.send(
    JSON.stringify({
      type: "createRoom",
      payload: {
        userId,
      },
    })
  );
}

function sendOffer(payload) {
  console.log(payload);
  createOffer(payload.userId);
}

const drawOnCanvas = () => {
  let canvas = document.getElementById("canvas");
  let ctx = canvas.getContext("2d");

  let stream = canvas.captureStream();

  console.log("stream canvas", stream);

  localStream = stream;

  function start(event) {
    canvas.addEventListener("mousemove", draw);
    reposition(event);
  }

  function stop() {
    canvas.removeEventListener("mousemove", draw);
  }

  function reposition(event) {
    coord.x = event.clientX - canvas.offsetLeft;
    coord.y = event.clientY - canvas.offsetTop;
  }

  function draw(event) {
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ACD3ED";
    ctx.moveTo(coord.x, coord.y);
    reposition(event);
    ctx.lineTo(coord.x, coord.y);
    ctx.stroke();
  }

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mouseup", stop);

  let coord = { x: 0, y: 0 };
};

const clearCanvas = () => {
  const canvas = document.getElementById("canvas");
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
};

window.addEventListener("load", () => {
  /*  document
    .getElementById("create-offer")
    .addEventListener("click", createOffer);
  document
    .getElementById("create-answer")
    .addEventListener("click", createAnswer);
  document.getElementById("add-answer").addEventListener("click", addAnswer); */
  document.getElementById("clear-btn").addEventListener("click", clearCanvas);
  init();
  drawOnCanvas();
});

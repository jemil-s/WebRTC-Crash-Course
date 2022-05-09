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

let init = async () => {
  let canvas = document.getElementById("canvas");
  let createRoomBtn = document.getElementById("createRoom");

  console.log("canvas", canvas);
  let ctx = canvas.getContext("2d");

  localStream = canvas.captureStream(60); // frames per second

  //document.getElementById("user-1").srcObject = localStream;

  socket = new WebSocket("ws://localhost:4000");

  socket.onopen = socketOpen;
  socket.onmessage = socketMessage;
  socket.onclose = socketClose;
  socket.onerror = socketError;
};

let createOffer = async (userId) => {
  createPeerConnection("offer", userId);
  //debugger

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  //const offerToSend = document.getElementById("offer-sdp").value;

  //document.getElementById("offer-sdp").value = JSON.stringify(offer);

  //socket.send(JSON.stringify({ type: "TESTOffer", payload: offer }));
  //debugger
};

let createPeerConnection = async (sdpType, userId) => {
  peerConnection = new RTCPeerConnection(servers);
  //debugger

  remoteStream = new MediaStream();

  document.getElementById("user-1").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    //debugger
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    //debugger
    event.streams[0].getTracks().forEach((track) => {
      //debugger
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async (event) => {
    if (event.candidate) {
      console.log(event.candidate, "candidate");
      if (sdpType === "answer") {
        socket.send(
          JSON.stringify({
            type: "TESTAnswer",
            payload: peerConnection.localDescription,
          })
        );
      } else if (sdpType === "offer") {
        socket.send(
          JSON.stringify({
            type: "TESTOffer",
            payload: peerConnection.localDescription,
          })
        );
        /* document.getElementById(sdpType).value = JSON.stringify(
          peerConnection.localDescription
        ); */
      }
    }
  };
};

let createAnswer = async () => {
  await createPeerConnection("answer");
  //debugger

  let offer = document.getElementById("offer-sdp").value;
  if (!offer) {
    return alert("Retrieve offer first");
  }

  offer = JSON.parse(offer);
  await peerConnection.setRemoteDescription(offer);
  //debugger

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  //debugger

  const ans = peerConnection.localDescription;

  console.log("answer", JSON.stringify(peerConnection.localDescription));

  const videoPlayer = document.getElementById("user-1");
  videoPlayer.classList.add("show");
};

let addAnswer = async () => {
  //debugger
  let answer = document.getElementById("answer-sdp").value;
  if (!answer) return alert("Retrieve answer from peer first...");

  answer = JSON.parse(answer);
  //debugger

  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

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
  document
    .getElementById("create-offer")
    .addEventListener("click", createOffer);
  document
    .getElementById("create-answer")
    .addEventListener("click", createAnswer);
  document.getElementById("add-answer").addEventListener("click", addAnswer);
  document.getElementById("clear-btn").addEventListener("click", clearCanvas);
  init();
  drawOnCanvas();
});

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
    case "roomId": {
      console.log("room id");
      setRoomId(message.payload);
      break;
    }
    case "offer": {
      setAnswer(message.payload);
      break;
    }
    case "setAnswer": {
      console.log("get answer", message);
      addAnswer(message.payload);
    }
    case "TESTOffer": {
      console.log("test", message);
      updateOffer(message.payload);
      break;
    }
    case "TESTAnswer": {
      console.log("answer", message);
      updateAnswer(message.payload);
    }
  }
};

const updateOffer = (payload) => {
  document.getElementById("offer-sdp").value = JSON.stringify(payload);
  createAnswer();
};

const updateAnswer = (payload) => {
  document.getElementById("answer-sdp").value = JSON.stringify(payload);
  addAnswer();
};

let socketClose = () => {};

let socketError = () => {};

function setId(message) {
  userId = message;
}

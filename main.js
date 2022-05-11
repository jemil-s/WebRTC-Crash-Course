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

let init = async () => {
  let canvas = document.getElementById("canvas");
  console.log("canvas", canvas);
  let ctx = canvas.getContext("2d");

  localStream = canvas.captureStream(60); // frames per second


  //document.getElementById("user-1").srcObject = localStream;
};

let createOffer = async () => {
  createPeerConnection("offer-sdp");

  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  document.getElementById("offer-sdp").value = JSON.stringify(offer);
};

let createPeerConnection = async (sdpType) => {
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
    if (event.candidate) {
      document.getElementById(sdpType).value = JSON.stringify(
        peerConnection.localDescription
      );
    }
  };
};

let createAnswer = async () => {
  createPeerConnection("answer-sdp");

  let offer = document.getElementById("offer-sdp").value;
  if (!offer) {
    return alert("Retrieve offer first");
  }

  offer = JSON.parse(offer);
  await peerConnection.setRemoteDescription(offer);

  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  const videoPlayer = document.getElementById("user-1");
  videoPlayer.classList.add("show");
};

let addAnswer = async () => {
  let answer = document.getElementById("answer-sdp").value;
  if (!answer) return alert("Retrieve answer from peer first...");

  answer = JSON.parse(answer);

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

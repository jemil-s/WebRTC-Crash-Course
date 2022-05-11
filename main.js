class Canvas {
  constructor(container) {
    this.canvas = document.getElementById("rtc-canvas");
    this.clearBtn = document.getElementById("clear-btn");
    this.canvasContainer = container;
    this.ctx = this.canvas.getContext("2d");
    this.stream = this.canvas.captureStream();
    this.coord = {
      x: 0,
      y: 0,
    };
    this.lineWidth = 20;
    this.halfLineWidth = this.lineWidth / 2;
    this.fillStyle = "#000";
    this.strokeStyle = "#333";
    /* this.shadowColor = "#333";
    this.shadowBlur = this.lineWidth / 4; */
    this.state = {
      mousedown: false,
    };
  }

  reposition = (event) => {
    this.coord.x = event.clientX - this.canvas.offsetLeft;
    this.coord.y = event.clientY - this.canvas.offsetTop;
  };

  start = (event) => {
    this.canvas.addEventListener("mousemove", this.draw);
    this.reposition(event);
  };

  stop = () => {
    this.canvas.removeEventListener("mousemove", this.draw);
  };

  draw = (event) => {
    this.ctx.beginPath();
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = "round";
    this.ctx.strokeStyle = "#ACD3ED";
    this.ctx.moveTo(this.coord.x, this.coord.y);
    this.reposition(event);
    this.ctx.lineTo(this.coord.x, this.coord.y);
    this.ctx.stroke();
  };

  clearCanvas = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  };

  getMosuePositionOnCanvas = (event) => {
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    const { offsetLeft, offsetTop } = event.target;
    const canvasX = clientX - offsetLeft;
    const canvasY = clientY - offsetTop;

    return { x: canvasX, y: canvasY };
  };

  handleWritingStart = (event) => {
    event.preventDefault();

    const mousePos = this.getMosuePositionOnCanvas(event);

    this.ctx.beginPath();

    this.ctx.moveTo(mousePos.x, mousePos.y);

    this.ctx.lineWidth = this.lineWidth;
    this.ctx.strokeStyle = this.strokeStyle;
    /*     this.ctx.shadowColor = null;
    this.ctx.shadowBlur = null; */

    this.ctx.fill();

    this.state.mousedown = true;
  };

  handleWritingInProgress = (event) => {
    event.preventDefault();

    if (this.state.mousedown) {
      const mousePos = this.getMosuePositionOnCanvas(event);

      this.ctx.lineTo(mousePos.x, mousePos.y);
      this.ctx.stroke();
    }
  };

  handleDrawingEnd = (event) => {
    event.preventDefault();

    if (this.state.mousedown) {
      /*       this.ctx.shadowColor = this.shadowColor;
      this.ctx.shadowBlur = this.shadowBlur; */

      this.ctx.stroke();
    }

    this.state.mousedown = false;
  };

  init = () => {
    console.log("canvasContainer", this.canvasContainer.clientWidth);
    this.canvas.width = this.canvasContainer.clientWidth;
    this.canvas.height = this.canvasContainer.clientHeight;
    this.ctx.fillStyle = "white";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvas.addEventListener("mousedown", this.start);
    this.canvas.addEventListener("mouseup", this.stop);
    this.canvas.addEventListener("touchstart", this.handleWritingStart);
    this.canvas.addEventListener("touchmove", this.handleWritingInProgress);
    this.canvas.addEventListener("touchend", this.handleDrawingEnd);
    this.clearBtn.addEventListener("click", this.clearCanvas);
  };
}

class SignalingPeers {
  constructor(canvas, socketsUrl) {
    this.localStream = canvas.canvas.captureStream(60);
    this.peerConnection = null;
    this.createRoomBtn = document.getElementById("createRoom");
    this.socket = new WebSocket(socketsUrl);
    this.socket.onmessage = this.onMessage;
    this.socket.onerror = this.onError;
    this.creatorId = null;
    this.socket.onopen = this.onOpen;
    this.socket.onclose = this.onClose;
    this.remoteStream = null;
    this.answer = null;
    this.userId = null;
    this.roomId = null;
    this.servers = {
      iceServers: [
        {
          urls: [
            "stun:stun1.1.google.com:19302",
            "stun:stun2.1.google.com:19302",
          ],
        },
      ],
    };
  }

  onMessage = (msg) => {
    console.log(msg);
    const message = JSON.parse(msg.data);
    console.log(message);

    switch (message.type) {
      case "id": {
        console.log("id");
        this.userId = message.payload;
        break;
      }
      case "setRoomId": {
        console.log("setRoomId");
        this.setRoomId(message.payload);
        break;
      }
      case "offer": {
        console.log("offer", message);
        this.setAnswer(message.payload);
        break;
      }
      case "setAnswer": {
        console.log("setAnswer", message);
        this.addAnswer(message.payload);
        break;
      }
      case "getOffer": {
        console.log("getOffer");
        this.createOffer(message.payload);
        break;
      }
    }
  };

  onError = (msg) => {};

  onOpen = (msg) => {};

  onClose = (msg) => {
    location.reload();
  };

  createRoom = () => {
    this.socket.send(
      JSON.stringify({
        type: "createRoom",
        payload: {
          userId: this.userId,
        },
      })
    );
  };

  setRoomId = (message) => {
    console.log("setRoomId", message);
    const roomidDiv = document.getElementById("roomId");
    const { creatorId } = message;
    const currentRoom = message.roomId;
    this.creatorId = creatorId;

    if (creatorId !== this.userId) {
      const joinRoomBtn = document.getElementById("joinRoom");
      joinRoomBtn.style.display = "block";
      joinRoomBtn.addEventListener("click", this.joinRoom);
    }

    this.createRoomBtn.style.display = "none";
    roomidDiv.textContent = currentRoom;
    this.roomId = currentRoom;
  };

  joinRoom = () => {
    console.log("called joinRoom");
    this.socket.send(
      JSON.stringify({
        type: "getOffer",
        payload: { userId: this.userId, roomId: this.roomId },
      })
    );
  };

  createPeerConnection = async (sdpType, callerId) => {
    this.peerConnection = new RTCPeerConnection(this.servers);

    this.remoteStream = new MediaStream();

    document.getElementById("user-1").srcObject = this.remoteStream;

    this.localStream.getTracks().forEach((track) => {
      this.peerConnection.addTrack(track, this.localStream);
    });

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
    };

    console.log("callerId", callerId);

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate === null) {
        if (sdpType === "offer") {
          this.socket.send(
            JSON.stringify({
              type: "offer",
              payload: {
                userId: callerId,
                offer: this.peerConnection.localDescription,
                roomId: this.roomId,
              },
            })
          );
        } else if (sdpType === "answer") {
          this.socket.send(
            JSON.stringify({
              type: "answer",
              payload: {
                userId: callerId,
                offer: this.peerConnection.localDescription,
                roomId: this.roomId,
              },
            })
          );
        }
      }
    };
  };

  createOffer = async (message) => {
    console.log("createOffer called", message);
    await this.createPeerConnection("offer", message.userId);

    let offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
  };

  setAnswer = async (offer) => {
    const { creatorId } = offer;
    this.createPeerConnection("answer", creatorId);
    const canvas = document.getElementById("rtc-canvas");
    const joinRoomBtn = document.getElementById("joinRoom");
    const clearBtn = document.getElementById("clear-btn");

    await this.peerConnection.setRemoteDescription(offer.offer);

    let answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    const videoPlayer = document.getElementById("user-1");

    videoPlayer.classList.add("show");
    canvas.style.display = "none";
    joinRoomBtn.style.display = "none";
    clearBtn.style.display = "none";
  };

  addAnswer = async (answer) => {
    if (!this.peerConnection.currentRemoteDescription) {
      this.peerConnection.setRemoteDescription(answer);
    }
  };

  init() {
    this.createRoomBtn.addEventListener("click", this.createRoom);
  }

  close = () => {
    this.socket.close();
  };
}

function start() {
  const canvasContainer = document.getElementById("webrtc-container");

  const canvas = new Canvas(canvasContainer);
  canvas.init();
  const signaling = new SignalingPeers(canvas, process.env.SERVER_API);
  signaling.init();
}

window.addEventListener("load", start);

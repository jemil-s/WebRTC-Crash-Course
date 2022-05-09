class Canvas {
  constructor() {
    this.canvas = document.getElementById("rtc-canvas");
    this.clearBtn = document.getElementById("clear-btn");
    console.log(this.canvas, "canvas");
    this.ctx = this.canvas.getContext("2d");
    this.stream = this.canvas.captureStream();
    this.coord = {
      x: 0,
      y: 0,
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

  init = () => {
    this.canvas.addEventListener("mousedown", this.start);
    this.canvas.addEventListener("mouseup", this.stop);
  };
}

class SignalingPeers {
  constructor(canvas, socketsUrl) {
    console.log("canvas", canvas);
    this.localStream = canvas.canvas.captureStream(60);
    this.peerConnection = null;
    this.createRoomBtn = document.getElementById("createRoom");
    this.socket = new WebSocket(socketsUrl);
    this.socket.onmessage = this.onMessage;
    this.socket.onerror = this.onError;
    this.socket.onopen = this.onOpen;
    this.socket.onclose = this.onClose;
    this.remoteStream = null;
    this.userId = null;
    this.roomId = null;
    this.cretorId = null;
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

  sendMessage(type, payload) {
    this.socket.send(JSON.stringify({ type, payload }));
  }

  createRoom = () => {
    console.log("called this room");
    this.sendMessage("createRoom", { userId: this.userId });
  };

  joinRoom = () => {
    this.sendMessage("getOffer", {
      userId: this.userId,
      roomId: this.roomId,
    });
  };

  async createPeerConnection(sdpType) {
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

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate === null) {
        if (sdpType === "offer") {
          this.sendMessage("offer", {
            userId: this.userId,
            offer: peerConnection.localDescription,
            roomId: this.roomId,
          });
        } else if (sdpType === "answer") {
          this.sendMessage("answer", {
            userId: this.userId,
            offer: peerConnection.localDescription,
            roomId: this.roomId,
          });
        }
      }
    };
  }

  createOffer(message) {
    const id = message.userId;

    await this.createPeerConnection("offer", id);

    let offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
  }

  setAnswer = async (offer) => {
    const { creatorId } = offer;
    this.createPeerConnection("answer", this.creatorId);

    await this.peerConnection.setRemoteDescription(offer.offer);

    answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    const videoPlayer = document.getElementById("user-1");

    console.log(answer, "answer");

    videoPlayer.classList.add("show");
  };

  onMessage = (msg) => {
    console.log(msg);
    const message = JSON.parse(msg.data);
    console.log(message);

    switch (message.type) {
      case "id": {
        this.userId = message.payload;
        break;
      }
      case "setRoomId": {
        console.log("set room id");
        this.setRoomId(message.payload);
        break;
      }
      case "offer": {
        console.log("getOffer from client", message);
        this.setAnswer(message.payload);
        break;
      }
      case "setAnswer": {
        console.log("get answer", message);
        this.addAnswer(message.payload);
        break;
      }
      case "getOffer": {
        this.createOffer(message.payload);
        break;
      }
    }
  };

  onError = (msg) => {};

  onOpen = (msg) => {};

  onClose = (msg) => {};

  setRoomId = (message) => {
    const roomIdDiv = document.getElementById("roomId");

    const { creatorId } = message;
    this.roomId = message.roomId;

    if (creatorId !== this.userId) {
      const joinRoomBtn = document.getElementById("joinRoom");
      joinRoomBtn.style.display = "block";
      joinRoomBtn.addEventListener("click", this.joinRoom);
    }

    this.createRoomBtn.style.display = "none";
    roomIdDiv.textContent = this.roomId;
  };

  init() {
    this.createRoomBtn.addEventListener("click", this.createRoom);
  }
}

class SocketsMessanger {
  constructor(url = "ws://localhost:4000", messagesHandler) {
    this.socketClient = new WebSocket(url);
    this.socketClient.onmessage = this.onMessage;
    this.socketClient.onerror = this.onError;
    this.socketClient.onopen = this.onOpen;
    this.socketClient.onclose = this.onClose;
    this.userId = null;
  }

  onMessage = (msg) => {
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

  onError = (msg) => {};

  onOpen = (msg) => {};

  onClose = (msg) => {};
}

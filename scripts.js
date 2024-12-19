const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');

let localStream;
let peerConnection;

// Substitua o IP pelo seu IP local encontrado
const serverIP = "192.168.1.101"; // Substitua por seu IP real (do transmissor)
const serverPort = "8080";
const socket = new WebSocket(`ws://${serverIP}:${serverPort}`);

startButton.addEventListener('click', startStream);
stopButton.addEventListener('click', stopStream);

// Iniciar transmissão
function startStream() {
    startButton.style.display = 'none';
    stopButton.style.display = 'inline';

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
            localStream = stream;
            localVideo.srcObject = stream;

            // Criar conexão peer-to-peer
            peerConnection = new RTCPeerConnection();

            // Adicionar stream local à conexão
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            // Configurar eventos de conexão
            peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    sendMessage({ type: 'candidate', candidate: event.candidate });
                }
            };

            peerConnection.ontrack = event => {
                remoteVideo.srcObject = event.streams[0];
            };

            socket.onopen = () => {
                console.log("Conexão WebSocket aberta");
            };

            socket.onmessage = message => {
                const data = JSON.parse(message.data);
                if (data.sdp) {
                    peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp))
                        .then(() => {
                            if (data.sdp.type === 'offer') {
                                peerConnection.createAnswer()
                                    .then(sdp => {
                                        return peerConnection.setLocalDescription(sdp);
                                    })
                                    .then(() => {
                                        sendMessage({ type: 'answer', sdp: peerConnection.localDescription });
                                    });
                            }
                        });
                } else if (data.candidate) {
                    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            };

            socket.onerror = error => {
                console.error("Erro WebSocket:", error);
            };
        })
        .catch(error => {
            console.error("Erro ao acessar a câmera:", error);
        });
}

// Enviar mensagem para o WebSocket
function sendMessage(message) {
    const socket = new WebSocket(`ws://${serverIP}:${serverPort}`);
    socket.onopen = () => {
        socket.send(JSON.stringify(message));
    };
}

// Parar transmissão
function stopStream() {
    peerConnection.close();
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
    remoteVideo.srcObject = null;
    startButton.style.display = 'inline';
    stopButton.style.display = 'none';
}

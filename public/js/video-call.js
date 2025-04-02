document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get("service") || "Emergency";

    document.getElementById("service-name").textContent = `Connecting to ${service}...`;

    let peerConnection;
    let localStream;
    let remoteStream;
    let interpreterStream;

    const socket = io(); // Ensure socket.io is connected

    const initializeVideoCall = async () => {
        const localVideo = document.getElementById('localVideo');
        const remoteVideo = document.getElementById('remoteVideo');
        const interpreterVideo = document.getElementById('interpreterVideo');

        if (!localVideo || !remoteVideo || !interpreterVideo) return;

        try {
            // Get local video/audio stream
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;

            peerConnection = new RTCPeerConnection();

            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            // Handle incoming tracks
            peerConnection.ontrack = (event) => {
                if (!remoteStream) {
                    remoteStream = event.streams[0];
                    remoteVideo.srcObject = remoteStream;
                } else if (!interpreterStream) {
                    interpreterStream = event.streams[0];
                    interpreterVideo.srcObject = interpreterStream;
                }
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('candidate', event.candidate);
                }
            };

            socket.on('candidate', (candidate) => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socket.on('offer', async (offer) => {
                peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', answer);
            });

            socket.on('answer', (answer) => {
                peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            });

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
        }
    };

    // Start emergency call
    const startEmergencyCall = async (service) => {
        if (!peerConnection) return;

        try {
            const room = `${service.toLowerCase()}-room`;
            socket.emit('joinRoom', room);

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', offer);
        } catch (error) {
            console.error("❌ Error starting emergency call:", error);
        }
    };

    // End call
    const endCall = () => {
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    };
    

    initializeVideoCall();
});

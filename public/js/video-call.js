document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const service = urlParams.get("service") || "Emergency";

    document.getElementById("service-name").textContent = `Connecting to ${service}...`;

    let peerConnection;
    let localStream;

    // WebRTC Video Call Setup
    const initializeVideoCall = async () => {
        const localVideo = document.getElementById('localVideo');
        if (!localVideo) {
            console.error("❌ Error: Local video element not found.");
            return;
        }

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localVideo.srcObject = localStream;

            peerConnection = new RTCPeerConnection();
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            peerConnection.ontrack = (event) => {
                document.getElementById('remoteVideo').srcObject = event.streams[0];
            };

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('candidate', event.candidate);
                }
            };

            socket.on('candidate', (candidate) => {
                peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socket.on('answer', (answer) => {
                peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            });

            socket.on('offer', async (offer) => {
                peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.emit('answer', answer);
            });

        } catch (error) {
            console.error('❌ Error accessing media devices:', error);
        }
    };

    // Start Emergency Call
    const startEmergencyCall = async (service) => {
        console.log(`Starting emergency call for: ${service}`);

        if (!peerConnection) {
            console.error("❌ Error: Peer connection is not initialized.");
            return;
        }

        try {
            const room = `${service.toLowerCase()}-room`; // create the room name based on the service
            socket.emit('joinRoom', room); // Tell the server to join the corresponding room

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            socket.emit('offer', offer);

        } catch (error) {
            console.error("❌ Error starting emergency call:", error);
        }
    };

    // End Call
    const endCall = () => {
        console.log('Call Ended');

        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    };

    // Start video call on page load
    initializeVideoCall();
});

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTrack = [];
let remoteTracks = {};

const APP_ID = "bfa1804981f744d08286c61ec8a20370";
const CHANNEL_NAME = "emergency-video-call";

// Get role from URL
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get("role") || "Host";

// Update UI with role info
document.getElementById("caller-info").innerText = `Role: ${role}`;
document.getElementById("local-role").innerText = role;
const remoteRole = role === "Host" ? "Responder" : "Host";
document.getElementById("remote-role").innerText = remoteRole;

// Subscribe to remote user
client.on("user-published", async (user, mediaType) => {
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    const remotePlayer = document.createElement("div");
    remotePlayer.id = `remote-video-${user.uid}`;
    remotePlayer.style.width = "100%";
    remotePlayer.style.height = "100%";
    document.getElementById("remote-video").innerHTML = ""; // Clear previous
    document.getElementById("remote-video").appendChild(remotePlayer);

    user.videoTrack.play(remotePlayer);
    remoteTracks[user.uid] = user.videoTrack;
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
});

// Remove remote user
client.on("user-unpublished", (user) => {
  const remotePlayer = document.getElementById(`remote-video-${user.uid}`);
  if (remotePlayer) remotePlayer.remove();
  delete remoteTracks[user.uid];
});

// Start the call
async function startCall() {
  try {
    const res = await fetch('/api/token');
    const { token, uid } = await res.json();

    await client.join(APP_ID, CHANNEL_NAME, token, uid);

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localTrack = [audioTrack, videoTrack];

    await client.publish(localTrack);
    console.log("Local stream published");

    const localContainer = document.getElementById("local-video");
    localContainer.innerHTML = ""; // Clear any previous content
    videoTrack.play(localContainer);

    document.getElementById("start-call-btn").disabled = true;
  } catch (err) {
    console.error("Start call failed:", err);
    alert("Start call failed. Please check camera/mic permissions.");
  }
}

// End the call
async function endCall() {
  try {
    await client.leave();
    console.log("Left the channel");

    localTrack.forEach(track => {
      track.stop();
      track.close();
    });

    document.getElementById("start-call-btn").disabled = false;

    document.getElementById("local-video").innerHTML = "";
    document.getElementById("remote-video").innerHTML = "";

    remoteTracks = {};
  } catch (err) {
    console.error("End call failed:", err);
  }
}

// Auto-join for responders (optional)
if (role === "Responder") {
  window.addEventListener('DOMContentLoaded', () => {
    startCall();
  });
}

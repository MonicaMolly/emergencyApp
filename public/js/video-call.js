const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTrack = [];
let remoteTracks = {}; // To store remote tracks and their corresponding user info

const APP_ID = "bfa1804981f744d08286c61ec8a20370";
const CHANNEL_NAME = "emergency-video-call";
const TOKEN = "007eJxTYCgu2hO5nPF+0NUnahEVGrpiodk9fKpP+xcou8lacTqE7lJgSEpLNLQwMLG0MEwzNzFJMbAwsjBLNjNMTbZINDIwNjeYlv87vSGQkcF/0WYmRgYIBPFFGFJzU4vSU/OSK3XLMlNS83WTE3NyGBgAaNAing==";
const uid = null; // Auto-generated UID

// Get role from URL and display it
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get("role") || "Unknown";
document.getElementById("caller-info").innerText = `Role: ${role}`;

// When remote user publishes media
client.on("user-published", async (user, mediaType) => {
  alert("Incoming call from " + (user.uid || "unknown user"));

  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    const remotePlayer = document.createElement("video");
    remotePlayer.id = `remote-video-${user.uid}`;
    remotePlayer.autoplay = true;
    remotePlayer.playsinline = true;

    // Create name tag element
    const nameTag = document.createElement("div");
    nameTag.id = `name-tag-${user.uid}`;
    nameTag.classList.add("name-tag");
    nameTag.innerText = `User ${user.uid}`;

    // Append both the video and the name tag to the container
    const videoContainer = document.getElementById("video-container");
    videoContainer.appendChild(remotePlayer);
    videoContainer.appendChild(nameTag);

    // Play remote video
    user.videoTrack.play(remotePlayer);

    // Store remote track and user info
    remoteTracks[user.uid] = { videoTrack: user.videoTrack, nameTag: nameTag };
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
});

// When remote user leaves
client.on("user-unpublished", (user) => {
  console.log("Remote user unpublished:", user.uid);
  const remotePlayer = document.getElementById(`remote-video-${user.uid}`);
  const nameTag = document.getElementById(`name-tag-${user.uid}`);
  
  if (remotePlayer) remotePlayer.srcObject = null;
  if (nameTag) nameTag.remove();

  // Remove from remoteTracks
  delete remoteTracks[user.uid];
});

// Start the call
async function startCall() {
  try {
    await client.join(APP_ID, CHANNEL_NAME, TOKEN, uid);

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localTrack = [audioTrack, videoTrack];

    await client.publish(localTrack);
    console.log("Local stream published");

    const localPlayer = document.getElementById("local-video");
    videoTrack.play(localPlayer);

    document.getElementById("start-call-btn").disabled = true;
  } catch (err) {
    console.error("Start call failed:", err);
  }
}

// End the call
async function endCall() {
  try {
    await client.leave();
    console.log("Left the channel");

    if (localTrack.length > 0) {
      localTrack.forEach(track => track.stop());
    }

    document.getElementById("remote-video").srcObject = null;
    document.getElementById("start-call-btn").disabled = false;

    // Remove all remote tracks and name tags
    Object.values(remoteTracks).forEach(({ videoTrack, nameTag }) => {
      videoTrack.stop();
      nameTag.remove();
    });

  } catch (err) {
    console.error("End call failed:", err);
  }
}

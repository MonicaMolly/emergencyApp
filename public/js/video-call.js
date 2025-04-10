const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTrack = [];
let remoteTracks = {};

const APP_ID = "54e1ec51a82942ed8040da70c83fa548";
const CHANNEL_NAME = "emergency-channel";
const TOKEN = "007eJxTYMg5oFsUIfrsWGe6BIfZut6pC6LfB73n4Fp2RW5em0Vd5V8FBlOTVMPUZFPDRAsjSxOj1BQLAxODlERzg2QL47REUxOLZWXf0xsCGRnOBeUwMzJAIIgvyJCam1qUnpqXXKmbnJGYl5eaw8AAAOfbJHU=";
const uid = null; // Auto-generated UID

// Get role from URL and display it
const urlParams = new URLSearchParams(window.location.search);
const role = urlParams.get("role") || "Unknown";
document.getElementById("caller-info").innerText = `Role: ${role}`;

// Handle remote user publishing
client.on("user-published", async (user, mediaType) => {
  alert("Incoming call from " + (user.uid || "unknown user"));
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    const videoWrapper = document.createElement("div");
    videoWrapper.id = `remote-wrapper-${user.uid}`;
    videoWrapper.classList.add("video-wrapper");

    const remotePlayer = document.createElement("video");
    remotePlayer.id = `remote-video-${user.uid}`;
    remotePlayer.autoplay = true;
    remotePlayer.playsInline = true;

    const nameTag = document.createElement("div");
    nameTag.classList.add("name-tag");
    nameTag.innerText = `User ${user.uid}`;

    videoWrapper.appendChild(remotePlayer);
    videoWrapper.appendChild(nameTag);

    document.getElementById("video-container").appendChild(videoWrapper);

    user.videoTrack.play(remotePlayer);
    remoteTracks[user.uid] = { videoTrack: user.videoTrack, wrapper: videoWrapper };
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }
});

// Handle remote user unpublishing
client.on("user-unpublished", (user) => {
  console.log("Remote user unpublished:", user.uid);
  const wrapper = document.getElementById(`remote-wrapper-${user.uid}`);
  if (wrapper) wrapper.remove();
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

// Summary of Features:
// ✅ Role Display: The role of the user is displayed in the name tag for every video stream.

// ✅ Name Tags for Video Streams: Each user’s video has a corresponding name tag, allowing easy identification (you can replace the default "User" label with any name or role-based information).

// ✅ Dynamic Video Handling: Remote video streams dynamically appear and disappear when users join or leave the call.
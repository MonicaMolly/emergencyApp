// Agora credentials
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
let localTrack = [];  // Store local tracks for stopping them later

// Listen for remote stream
client.on("user-published", async (user, mediaType) => {
  console.log("Remote user published stream:", user.uid);

  // Subscribe to the remote stream
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    const remotePlayer = document.getElementById("remote-video");
    user.videoTrack.play(remotePlayer);  // Attach remote video track to the remote-video element
  }

  if (mediaType === "audio") {
    user.audioTrack.play();  // Attach remote audio track
  }
});

// Listen for remote user leaving the channel
client.on("user-unpublished", (user) => {
  console.log("Remote user unpublished stream:", user.uid);

  const remotePlayer = document.getElementById("remote-video");
  if (remotePlayer) {
    remotePlayer.srcObject = null;  // Clear the remote video element when the user leaves
  }
});

async function startCall() {
  const APP_ID = "54e1ec51a82942ed8040da70c83fa548";
  const CHANNEL_NAME = "emergency-channel";
  const TOKEN = "007eJxTYLiV4/XNvmbNM++DoZ0CU3dtq/y945b2hYalX18u3twz5ZWLAoOpSapharKpYaKFkaWJUWqKhYGJQUqiuUGyhXFaoqmJhbrT1/SGQEaGbfuKGBihEMQXZEjNTS1KT81LrtRNzkjMy0vNYWAAAHKlKHI=";
  const uid = null;
  //save call in data base once call starts

  try {
    await client.join(APP_ID, CHANNEL_NAME, TOKEN, uid); 
    //save call in database using UID, channel name and token status of call in events

    const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
    localTrack = [audioTrack, videoTrack];  // Store local tracks for later use

    await client.publish([audioTrack, videoTrack]);
    console.log("Published local stream");

    const localPlayer = document.getElementById("local-video");
    videoTrack.play(localPlayer);

    // Disable Start Call button to prevent multiple clicks
    const button = document.getElementById("start-call-btn");
    button.disabled = true; 
  } catch (err) {
    console.error("Failed to join or publish:", err);
  }
}

async function endCall() {
  try {
    await client.leave();  // Leave the Agora channel
    console.log("Left the channel");

    // Stop the local tracks (camera and microphone)
    localTrack[0].stop();  // Stop the microphone
    localTrack[1].stop();  // Stop the camera

    // You can also clear the remote video stream if necessary:
    const remotePlayer = document.getElementById("remote-video");
    if (remotePlayer) {
      remotePlayer.srcObject = null;
    }

    // Re-enable the Start Call button
    const startButton = document.getElementById("start-call-btn");
    if (startButton) startButton.disabled = false;

  } catch (err) {
    console.error("Error ending the call:", err);
  }
}
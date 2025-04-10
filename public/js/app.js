const { createApp, ref } = Vue;
const socket = io(); // Connect to the server

const app = createApp({
  setup() {
    const userEmail = ref('Guest');  // Use 'Guest' if no user is logged in
    const messages = ref([]);
    const newMessage = ref('');
    const errorMessage = ref("");

    // Send message function
    const sendMessage = () => {
      if (newMessage.value.trim() === "") return;

      const msg = {
        user: userEmail.value,  // Send the user email or 'Guest'
        text: newMessage.value,
      };

      socket.emit("sendMessage", msg);  // Send message via socket
      newMessage.value = "";  // Clear input after sending
    };

    // Clear chat function
    const clearChat = () => {
      messages.value = [];  // Clear the chat messages
    };

    // Receive message from socket
    socket.on("receiveMessage", (msg) => {
      messages.value.push(msg);  // Add received message to chat
    });

      // Function to start an emergency call (opens a new window with the video call page)
    const startEmergencyCall = (service) => {
      const callerId = "caller_" + new Date().getTime();  // Generate a unique caller ID
      const serviceId = service + "_id";  // Set the service ID (fire_id, police_id, hospital_id)
      window.open(`video-call.html?callerId=${callerId}&serviceId=${serviceId}`, "_blank");
    };

    return {
      errorMessage,
      sendMessage,
      clearChat,
      startEmergencyCall,
      messages,
      newMessage,
      userEmail,  
    };
  },
}).mount('#app');

// Key Points in app.js:
// User Login: We can use userEmail to personalize the experience if the user is logged in. However, if login is not mandatory, it will fall back to using "Guest" as the username.

// Send & Receive Messages: The sendMessage function sends the chat messages to the server, and the receiveMessage function listens for incoming messages from the server and displays them in the chat.

// Start Emergency Call: The startEmergencyCall function generates a unique caller ID and service ID and opens a new window with video-call.html, passing the IDs in the URL.
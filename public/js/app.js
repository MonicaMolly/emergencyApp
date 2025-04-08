const { createApp, ref } = Vue;
const socket = io(); // ✅ Ensure Socket.IO connection

const app = createApp({
  setup() {
    const isAuthenticated = ref(false);
    const userEmail = ref('');
    const userLocation = ref({ lat: null, lon: null });
    const email = ref('');
    const password = ref('');
    const errorMessage = ref('');

    // Chat Variables
    const messages = ref([]);
    const newMessage = ref('');

    // Check if user is logged in
    if (localStorage.getItem('user')) {
      isAuthenticated.value = true;
      userEmail.value = JSON.parse(localStorage.getItem('user')).email;
    }

    const getLocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            userLocation.value.lat = position.coords.latitude;
            userLocation.value.lon = position.coords.longitude;
            console.log("📍 Location: ", userLocation.value);

            updateMap(userLocation.value.lat, userLocation.value.lon);
            findNearbyServices(userLocation.value.lat, userLocation.value.lon);

            socket.emit("sendLocation", userLocation.value);
          },
          (error) => {
            console.error("❌ Location Error: ", error.message);
          }
        );
      } else {
        console.error("❌ Geolocation is not supported by this browser.");
      }
    };

    const findNearbyServices = (lat, lon) => {
      const serviceTypes = ["hospital", "police", "fire_station"];
      const serviceNames = { hospital: "Hospital", police: "Police", fire_station: "Fire Station" };

      const map = new google.maps.Map(document.createElement("div"), {
        center: { lat, lng: lon },
        zoom: 15,
      });

      const placesService = new google.maps.places.PlacesService(map);

      document.getElementById("nearby-places").innerHTML = "";

      serviceTypes.forEach((type) => {
        placesService.nearbySearch(
          {
            location: { lat, lng: lon },
            radius: 5000, // Search within 5km
            type: type,
          },
          (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
              results.forEach((place) => {
                const listItem = document.createElement("li");
                listItem.textContent = `${serviceNames[type]}: ${place.name} (${place.vicinity})`;
                document.getElementById("nearby-places").appendChild(listItem);
              });
            }
          }
        );
      });
    };

    const sendMessage = () => {
      if (newMessage.value.trim() === "") return;

      const msg = {
        user: userEmail.value || "Guest",
        text: newMessage.value,
      };

      socket.emit("sendMessage", msg);

      newMessage.value = "";
    };

    const clearChat = () => {
      messages.value = [];
    };

    socket.on("receiveMessage", (msg) => {
      messages.value.push(msg);
    });

    const startEmergencyCall = (service) => {
      window.open(`video-call.html?service=${service}`, "_blank");
    };

    const logout = () => {
      localStorage.removeItem('user');
      window.location.reload();
    };

    const login = () => {
      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find(
        (user) => user.email === email.value && user.password === password.value
      );

      if (!user) {
        errorMessage.value = "Invalid email or password.";
        return;
      }

      isAuthenticated.value = true;
      userEmail.value = user.email;
      localStorage.setItem('user', JSON.stringify(user));

      getLocation();
    };

    return {
      isAuthenticated,
      userEmail,
      email,
      password,
      errorMessage,
      sendMessage,
      clearChat,
      startEmergencyCall,
      logout,
      login,
      getLocation,
      findNearbyServices,
      messages,
      newMessage,
    };
  },
}).mount('#app');

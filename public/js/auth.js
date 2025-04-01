const { createApp, ref } = Vue;

const authApp = createApp({
  setup() {
    const isLogin = ref(true);
    const email = ref('');
    const password = ref('');
    const confirmPassword = ref('');
    const errorMessage = ref('');
    const successMessage = ref('');

    // Toggle Login/Signup
    const toggleAuth = () => {
      isLogin.value = !isLogin.value;
      errorMessage.value = '';
      successMessage.value = '';
    };

    // Handle Authentication
    const handleAuth = () => {
      let users = JSON.parse(localStorage.getItem('users')) || [];

      if (isLogin.value) {
        // LOGIN
        const user = users.find(u => u.email === email.value && u.password === password.value);
        if (!user) {
          errorMessage.value = "Invalid credentials.";
          return;
        }
        localStorage.setItem('user', JSON.stringify(user));
        window.location.href = "/";
      } else {
        // SIGNUP
        if (password.value !== confirmPassword.value) {
          errorMessage.value = "Passwords do not match!";
          return;
        }
        if (users.some(u => u.email === email.value)) {
          errorMessage.value = "Email already registered!";
          return;
        }
        users.push({ email: email.value, password: password.value });
        localStorage.setItem('users', JSON.stringify(users));
        successMessage.value = "Signup successful! You can now log in.";
        isLogin.value = true;
      }
    };

    return {
      isLogin,
      email,
      password,
      confirmPassword,
      errorMessage,
      successMessage,
      toggleAuth,
      handleAuth
    };
  }
}).mount('#auth-app');

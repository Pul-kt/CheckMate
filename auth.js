const firebaseConfig = {
  apiKey: "AIzaSyAvKaFKtLUcbt-7Qv5jGraODD1B_BM8bwc",
  authDomain: "chess-303e1.firebaseapp.com",
  projectId: "chess-303e1",
  storageBucket: "chess-303e1.firebasestorage.app",
  messagingSenderId: "411731340133",
  appId: "1:411731340133:web:7d9c9708d66e61f2734f8c",
  measurementId: "G-RF49W9EXVG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const provider = new firebase.auth.GoogleAuthProvider();

// Add additional scopes if needed
provider.addScope('profile');
provider.addScope('email');

function signInWithGoogle() {
  // Show loading state
  const loginButton = document.getElementById("loginButton");
  loginButton.textContent = "Signing in...";
  loginButton.disabled = true;
  
  console.log("Attempting Google sign-in...");
  
  firebase.auth().signInWithPopup(provider)
    .then(result => {
      console.log("Sign-in successful:", result.user.displayName);
      const name = result.user.displayName;
      const socket = io();

      window.socket = socket;
      window.currentPlayerName = name;

      // Hide login section and show game
      document.getElementById("loginSection").style.display = "none";
      document.getElementById("gameContainer").classList.remove("hidden");
      
      socket.emit("player-join", { name });
    })
    .catch(error => {
      console.error("Login failed:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      
      // Show user-friendly error
      let errorMessage = "Login failed. ";
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage += "Please try again and don't close the popup window.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage += "Domain not authorized. Please check Firebase settings.";
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
      
      // Reset button state
      loginButton.textContent = "Sign in with Google";
      loginButton.disabled = false;
    });
}

// Check if user is already logged in
firebase.auth().onAuthStateChanged(user => {
  console.log("Auth state changed:", user ? user.displayName : "No user");
  if (user) {
    // User is already logged in
    const socket = io();
    window.socket = socket;
    window.currentPlayerName = user.displayName;
    
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("gameContainer").classList.remove("hidden");
    
    socket.emit("player-join", { name: user.displayName });
  }
});
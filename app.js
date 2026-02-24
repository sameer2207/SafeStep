
// SafeStep Platform - Complete Fixed Frontend JavaScript
// Version 3.0 - Production Ready with dynamic API base

// API Base URL - when running locally point to your local backend
// Local: "http://localhost:5000/api"  (use this when running backend.py locally)
// Production: "https://your-app-name.onrender.com/api"
const API_BASE_URL = "http://localhost:5000/api";
// const API_BASE_URL = "https://project-2-84qm.onrender.com/api";

// Application Data
const appData = {
  users: [],
  trainings: [],
  userEnrollments: [],
  currentUserSessions: [],
};

// Current user state
let currentUser = null;

// ==================== API HELPER FUNCTIONS ====================

async function apiCall(endpoint, method = "GET", data = null) {
  const options = {
    method: method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      console.error("JSON Parse Error:", jsonError, "Response:", response);
      return {
        success: false,
        message: "Backend returned invalid response",
        error: jsonError.message,
      };
    }

    if (!response.ok && response.status === 401) {
      // Only auto-logout for auth endpoints, not for data endpoints
      if (!endpoint.includes('/auth/')) {
        console.warn("API returned 401 for non-auth endpoint:", endpoint);
        // Don't auto-logout for data endpoints
      } else {
        currentUser = null;
        updateUIForLoggedOutUser();
      }
    }

    return { status: response.status, ...result };
  } catch (error) {
    console.error("API Error:", error);
    return {
      success: false,
      message: "Backend is not running! Start it with: python backend-final.py",
      error: error.message,
    };
  }
}

// ==================== DOM CONTENT LOADED ====================

document.addEventListener("DOMContentLoaded", function () {
  console.log("SafeStep Platform Frontend Started");

  // Initialize navigation first
  initializeNavigation();
  initializeEventListeners();
  initializeSettingsTabs();

  // Show navigation bar immediately
  const navMenu = document.querySelector(".nav-menu");
  if (navMenu) {
    navMenu.style.display = "flex";
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.style.display = "block";
    });
  }

  // Initialize UI for logged-out state
  updateUIForLoggedOutUser();

  setTimeout(() => {
    initializeChart();
    initializeAnalyticsCharts();
    initializeMap();
    checkAuthStatus();
    loadTrainings();
  }, 100);
});

// ==================== AUTHENTICATION FUNCTIONS ====================

async function checkAuthStatus() {
  console.log("Checking authentication status...");
  const result = await apiCall("/auth/check", "GET");

  if (result.success && result.logged_in && result.user) {
    console.log("User already logged in:", result.user);
    currentUser = result.user;
    updateUIForLoggedInUser();
    loadUserData();
  } else {
    console.log("No active session or API error:", result.message);
    updateUIForLoggedOutUser();
  }
}

async function handleSignIn(e) {
  e.preventDefault();

  const name = document.getElementById("signInName").value.trim();
  const email = document.getElementById("signInEmail").value.trim();
  const role = document.getElementById("signInRole").value;
  const state = document.getElementById("signInState").value;
  const password = document.getElementById("signInPassword").value;
  const confirmPassword = document.getElementById(
    "signInConfirmPassword"
  ).value;

  // Validation
  if (!name || !email || !role || !state || !password || !confirmPassword) {
    alert("Please fill in all fields");
    return;
  }

  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters");
    return;
  }

  if (!email.includes("@")) {
    alert("Please enter a valid email");
    return;
  }

  // Call API
  console.log("Registering user:", email);
  const result = await apiCall("/auth/register", "POST", {
    name: name,
    email: email,
    role: role,
    state: state,
    password: password,
    confirmPassword: confirmPassword,
  });

  if (result.success) {
    currentUser = result.user;
    console.log("Registration successful:", currentUser);
    alert("Account created successfully! Welcome " + name);
    closeModal("signInModal");
    document.getElementById("signInForm").reset();
    updateUIForLoggedInUser();
    loadUserData();
  } else {
    console.error("Registration failed:", result.message);
    alert("Registration failed: " + result.message);
  }
}

async function handleLogIn(e) {
  e.preventDefault();

  const email = document.getElementById("logInEmail").value.trim();
  const password = document.getElementById("logInPassword").value;

  if (!email || !password) {
    alert("Please enter both email and password");
    return;
  }

  console.log("Logging in user:", email);
  const result = await apiCall("/auth/login", "POST", {
    email: email,
    password: password,
  });

  if (result.success) {
    currentUser = result.user;
    console.log("Login successful:", currentUser);
    console.log("User data:", {
      name: currentUser?.name,
      role: currentUser?.role,
      state: currentUser?.state
    });
    alert("Welcome back, " + (currentUser?.name || "User") + "!");
    closeModal("logInModal");
    document.getElementById("logInForm").reset();
    console.log("Calling updateUIForLoggedInUser...");
    updateUIForLoggedInUser();
    loadUserData();
  } else {
    console.error("Login failed:", result.message);
    alert("Login failed: " + result.message);
  }
}

async function logout() {
  console.log("Logging out user...");
  const result = await apiCall("/auth/logout", "POST");

  if (result.success) {
    currentUser = null;
    console.log("Logout successful");
    alert("You have been logged out");
    updateUIForLoggedOutUser();
    // Remove the page reload for better UX in single-page app
    // setTimeout(() => location.reload(), 500);
  } else {
    alert("Logout failed: " + result.message);
  }
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateUIForLoggedInUser() {
  console.log("Updating UI for logged-in user");
  console.log("Current user:", currentUser);

  // Check if currentUser exists
  if (!currentUser) {
    console.error("currentUser is not set, cannot update UI");
    updateUIForLoggedOutUser();
    return;
  }

  console.log("Updating navigation menu...");
  // Show navigation menu for logged-in users
  const navMenu = document.querySelector(".nav-menu");
  if (navMenu) {
    navMenu.style.display = "flex";

    // All navigation links are visible for logged-in users
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.style.display = "block";
    });
    console.log("Navigation menu updated");
  } else {
    console.error("Navigation menu not found");
  }

  console.log("Updating auth buttons...");
  const authButtons = document.querySelector(".auth-buttons");
  if (authButtons) {
    const userName = currentUser.name || "User";
    const userRole = currentUser.role || "User";
    const userState = currentUser.state || "";

    // Create welcome message element
    const welcomeDiv = document.createElement('div');
    welcomeDiv.style.cssText = 'color: white; margin-right: 1rem; font-size: 0.9rem;';
    welcomeDiv.innerHTML = `
      <div style="font-weight: 600;">Welcome, ${userName}</div>
      <div style="opacity: 0.85; font-size: 0.8rem;">${userRole} • ${userState}</div>
    `;

    // Create chat button
    const chatBtn = document.createElement('button');
    chatBtn.className = 'btn btn-outline';
    chatBtn.style.cssText = 'padding: 0.5rem 1rem;';
    chatBtn.textContent = '🤖';
    chatBtn.onclick = () => openModal('chatModal');

    // Create logout button
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'btn btn-outline';
    logoutBtn.style.cssText = 'padding: 0.5rem 1rem;';
    logoutBtn.textContent = 'Logout';
    logoutBtn.onclick = logout;

    // Clear and add new elements
    authButtons.innerHTML = '';
    authButtons.appendChild(welcomeDiv);
    authButtons.appendChild(chatBtn);
    authButtons.appendChild(logoutBtn);

    console.log("Auth buttons updated with DOM manipulation");
  } else {
    console.error("Auth buttons not found");
  }

  console.log("Updating main content...");
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.style.display = "flex";
    console.log("Main content shown");
  } else {
    console.error("Main content not found");
  }

  console.log("Showing dashboard section...");
  showSection("dashboard");
  loadDashboardStats();
  showAdminPanels();
  loadReports();

  // Update profile section with current user data
  updateProfileSection();
  console.log("UI update complete");
}

function updateUIForLoggedOutUser() {
  console.log("Updating UI for logged-out user");

  // Keep navigation menu visible with all tabs for logged-out users
  const navMenu = document.querySelector(".nav-menu");
  if (navMenu) {
    navMenu.style.display = "flex";

    // Show all navigation links for logged-out users
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.style.display = "block";
    });
  }

  const authButtons = document.querySelector(".auth-buttons");
  if (authButtons) {
    authButtons.innerHTML = `
            <button id="signInBtn" class="btn btn-primary">Sign In</button>
            <button id="logInBtn" class="btn btn-outline">Log In</button>
            <button id="chatbotBtn" class="btn btn-outline" onclick="openModal('chatModal')">🤖</button>
        `;

    document
      .getElementById("signInBtn")
      ?.addEventListener("click", function (e) {
        e.preventDefault();
        openModal("signInModal");
      });

    document
      .getElementById("logInBtn")
      ?.addEventListener("click", function (e) {
        e.preventDefault();
        openModal("logInModal");
      });

    document
      .getElementById("chatbotBtn")
      ?.addEventListener("click", function (e) {
        e.preventDefault();
        openModal("chatModal");
      });
  }

  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.style.display = "flex";
  }

  // Update profile section for logged-out state
  updateProfileSection();

  showSection("dashboard");
}

// ==================== PROFILE FUNCTIONS ====================

function updateProfileSection() {
  const profileContainer = document.querySelector('.profile-container');

  if (!currentUser) {
    // Show login prompt for logged-out users
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <h3>Please Log In</h3>
          <p>You need to be logged in to view your profile information.</p>
          <button class="btn btn-primary" onclick="openModal('logInModal')">Log In</button>
          <button class="btn btn-outline" onclick="openModal('signInModal')" style="margin-left: 1rem;">Sign Up</button>
        </div>
      `;
    }
    return;
  }

  // Show actual profile for logged-in users
  if (profileContainer) {
    profileContainer.innerHTML = `
      <div class="profile-header">
        <div class="profile-avatar">
          <div class="avatar-circle">
            <span class="avatar-text">${getUserInitials(currentUser.name)}</span>
          </div>
        </div>
        <div class="profile-info">
          <h3>${currentUser.name}</h3>
          <p class="profile-role">${currentUser.role}</p>
          <p class="profile-location">${currentUser.state}</p>
          <div class="profile-stats">
            <span class="stat-item">${appData.userEnrollments ? appData.userEnrollments.length : 0} Enrollments</span>
            <span class="stat-item">Member since 2024</span>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn-primary">Edit Profile</button>
          <button class="btn btn-outline">Change Password</button>
        </div>
      </div>

      <div class="profile-content">
        <div class="profile-section">
          <h4>Personal Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Full Name</label>
              <p>${currentUser.name}</p>
            </div>
            <div class="info-item">
              <label>Email Address</label>
              <p>${currentUser.email}</p>
            </div>
            <div class="info-item">
              <label>Phone Number</label>
              <p>+91 98765 43210</p>
            </div>
            <div class="info-item">
              <label>Date of Birth</label>
              <p>15 March 1985</p>
            </div>
            <div class="info-item">
              <label>Gender</label>
              <p>Male</p>
            </div>
            <div class="info-item">
              <label>Employee ID</label>
              <p>DMO-2024-001</p>
            </div>
          </div>
        </div>

        <div class="profile-section">
          <h4>${currentUser.role} Information</h4>
          <div class="info-grid">
            <div class="info-item">
              <label>Department</label>
              <p>Disaster Management</p>
            </div>
            <div class="info-item">
              <label>Role</label>
              <p>${currentUser.role}</p>
            </div>
            <div class="info-item">
              <label>Location</label>
              <p>${currentUser.state}</p>
            </div>
            <div class="info-item">
              <label>Joining Date</label>
              <p>January 2024</p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  console.log("Profile section updated for user:", currentUser?.name || "logged out user");
}

function getUserInitials(name) {
  if (!name) return "U";
  const nameParts = name.split(' ');
  if (nameParts.length >= 2) {
    return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

// Modify showSection to update profile when profile section is shown
const originalShowSection = window.showSection;
window.showSection = function(sectionId) {
  originalShowSection(sectionId);

  // If showing profile section and user is logged in, update it
  if (sectionId === 'profile' && currentUser) {
    updateProfileSection();
  }
};

async function loadUserData() {
  if (!currentUser) {
    console.log("User not logged in, skipping user data load");
    return;
  }

  console.log("Loading user data...");

  try {
    // Load user enrollments
    const enrollmentsResult = await apiCall("/api/user/enrollments", "GET");
    if (enrollmentsResult.success) {
      appData.userEnrollments = enrollmentsResult.enrollments;
      console.log("Enrollments loaded:", enrollmentsResult.enrollments.length);
    } else {
      console.error("Failed to load enrollments:", enrollmentsResult.message);
      // Don't trigger logout on enrollment load failure
    }
  } catch (error) {
    console.error("Error loading user data:", error);
    // Don't trigger logout on data load failure
  }
}

async function loadTrainings() {
  console.log("Loading trainings...");
  const result = await apiCall("/trainings", "GET");

  if (result.success) {
    appData.trainings = result.trainings;
    console.log("Trainings loaded:", result.trainings.length);
  } else {
    console.warn("Failed to load trainings:", result.message);
  }
}

async function loadDashboardStats() {
  if (!currentUser) {
    console.log("User not logged in, skipping dashboard stats");
    return;
  }

  console.log("Loading dashboard stats...");
  const result = await apiCall("/dashboard/stats", "GET");

  if (result.success) {
    const statsData = result.stats;
    console.log("Stats:", statsData);

    const statsElements = document.querySelectorAll("[data-stat]");
    statsElements.forEach((el) => {
      const statKey = el.getAttribute("data-stat");
      if (statsData[statKey] !== undefined) {
        el.textContent = statsData[statKey];
        console.log("Updated", statKey, "to", statsData[statKey]);
      }
    });
  } else {
    console.error("Failed to load stats:", result.message);
  }
}

async function enrollTraining(trainingId) {
  if (!currentUser) {
    alert("Please log in first");
    return;
  }

  const result = await apiCall(`/trainings/${trainingId}/enroll`, "POST");

  if (result.success) {
    alert(result.message);
    loadUserData();
    loadTrainings();
  } else {
    alert("Enrollment failed: " + result.message);
  }
}

// ==================== MODAL FUNCTIONS ====================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
    console.log("Modal opened:", modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
    console.log("Modal closed:", modalId);
  }
}

// ==================== EVENT LISTENERS ====================

function initializeEventListeners() {
  console.log("Initializing event listeners...");

  // Sign In button
  const signInBtn = document.getElementById("signInBtn");
  if (signInBtn) {
    signInBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal("signInModal");
    });
  }

  // Log In button
  const logInBtn = document.getElementById("logInBtn");
  if (logInBtn) {
    logInBtn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal("logInModal");
    });
  }

  // Floating Chatbot
  const floatingChatbot = document.getElementById("floating-chatbot");
  if (floatingChatbot) {
    floatingChatbot.addEventListener("click", function () {
      openModal("chatModal");
    });
  }

  // Close buttons
  const closeSignIn = document.getElementById("closeSignIn");
  if (closeSignIn) {
    closeSignIn.addEventListener("click", function () {
      closeModal("signInModal");
    });
  }

  const closeLogIn = document.getElementById("closeLogIn");
  if (closeLogIn) {
    closeLogIn.addEventListener("click", function () {
      closeModal("logInModal");
    });
  }

  // Chat modal
  const closeChat = document.getElementById("closeChat");
  if (closeChat) {
    closeChat.addEventListener("click", function () {
      closeModal("chatModal");
    });
  }

  // Switch modals
  const switchToLogIn = document.getElementById("switchToLogIn");
  if (switchToLogIn) {
    switchToLogIn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal("signInModal");
      openModal("logInModal");
    });
  }

  const switchToSignIn = document.getElementById("switchToSignIn");
  if (switchToSignIn) {
    switchToSignIn.addEventListener("click", function (e) {
      e.preventDefault();
      closeModal("logInModal");
      openModal("signInModal");
    });
  }

  // Close on backdrop click
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeModal(modal.id);
      }
    });
  });

  // Close on ESC key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal").forEach((modal) => {
        if (modal.classList.contains("active")) {
          closeModal(modal.id);
        }
      });
    }
  });

  // Form submissions
  const signInForm = document.getElementById("signInForm");
  if (signInForm) {
    signInForm.addEventListener("submit", handleSignIn);
  }

  const logInForm = document.getElementById("logInForm");
  if (logInForm) {
    logInForm.addEventListener("submit", handleLogIn);
  }

  // Chat functionality
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");

  if (chatInput && sendChatBtn) {
    const sendMessage = function() {
      const message = chatInput.value.trim();
      if (message) {
        addMessage(message, 'user');
        chatInput.value = '';
        setTimeout(() => {
          const response = getBotResponse(message);
          addMessage(response, 'bot');
        }, 500);
      }
    };

    sendChatBtn.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", function(e) {
      if (e.key === "Enter") {
        sendMessage();
      }
    });
  }

  console.log("Event listeners initialized");
}

// ==================== NAVIGATION ====================

function initializeNavigation() {
  console.log("Initializing navigation...");

  const navLinks = document.querySelectorAll(".nav-link");
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = this.getAttribute("href").substring(1);
      showSection(target);

      navLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
    });
  });

  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const target = this.getAttribute("href").substring(1);
      showSection(target);

      sidebarLinks.forEach((l) => l.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

function initializeSettingsTabs() {
  console.log("Initializing settings tabs...");

  const settingsTabs = document.querySelectorAll(".settings-tab");
  const settingsPanels = document.querySelectorAll(".settings-panel");

  settingsTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      const targetTab = this.getAttribute("data-tab");

      // Remove active class from all tabs
      settingsTabs.forEach((t) => t.classList.remove("active"));
      // Add active class to clicked tab
      this.classList.add("active");

      // Hide all panels
      settingsPanels.forEach((panel) => panel.classList.remove("active"));
      // Show target panel
      const targetPanel = document.getElementById(targetTab + "-panel");
      if (targetPanel) {
        targetPanel.classList.add("active");
      }
    });
  });

  // Handle account deletion confirmation
  const confirmDeleteCheckbox = document.getElementById("confirmDelete");
  const deleteAccountBtn = document.getElementById("deleteAccountBtn");

  if (confirmDeleteCheckbox && deleteAccountBtn) {
    confirmDeleteCheckbox.addEventListener("change", function () {
      deleteAccountBtn.disabled = !this.checked;
    });
  }
}

function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.add("active");
    console.log("Showing section:", sectionId);
  }
}

// ==================== CHART INITIALIZATION ====================

function initializeChart() {
  const ctx = document.getElementById("trendsChart");
  if (ctx && typeof Chart !== "undefined") {
    try {
      new Chart(ctx, {
        type: "bar",
        data: {
          labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
          datasets: [
            {
              label: "Trainings",
              data: [12, 15, 18, 14, 16, 13],
              backgroundColor: "rgba(40, 167, 69, 0.8)",
              borderColor: "rgba(40, 167, 69, 1)",
              borderWidth: 2,
            },
            {
              label: "Participants (x100)",
              data: [4.85, 6.2, 7.3, 5.6, 6.4, 5.2],
              backgroundColor: "rgba(0, 180, 216, 0.8)",
              borderColor: "rgba(0, 180, 216, 1)",
              borderWidth: 2,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: {
            y: {
              beginAtZero: true,
            },
          },
          plugins: {
            legend: {
              position: "top",
            },
          },
        },
      });
      console.log("Chart initialized");
    } catch (e) {
      console.error("Chart error:", e);
    }
  }
}

// ==================== MAP INITIALIZATION ====================

function initializeMap() {
  const mapContainer = document.getElementById("mapContainer");
  if (mapContainer && typeof L !== "undefined") {
    try {
      const map = L.map("mapContainer").setView([20, 78], 4);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      appData.trainings.forEach((training) => {
        if (training.latitude && training.longitude) {
          L.circleMarker([training.latitude, training.longitude], {
            radius: 8,
            fillColor: "#28a745",
            color: "#1e3a5f",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
          })
            .bindPopup(
              `<strong>${training.title}</strong><br>${training.location}`
            )
            .addTo(map);
        }
      });
      console.log("Map initialized");
    } catch (e) {
      console.error("Map error:", e);
    }
  }
}

// ==================== ANALYTICS CHARTS ====================

function initializeAnalyticsCharts() {
  // Participation Trends Chart
  const participationCtx = document.getElementById("participationChart");
  if (participationCtx && typeof Chart !== "undefined") {
    new Chart(participationCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        datasets: [
          {
            label: "Training Sessions",
            data: [45, 52, 48, 61, 55, 67, 71, 68, 74, 82, 79, 85],
            borderColor: "rgba(40, 167, 69, 1)",
            backgroundColor: "rgba(40, 167, 69, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Participants",
            data: [1250, 1420, 1380, 1650, 1520, 1780, 1890, 1820, 1950, 2100, 2050, 2200],
            borderColor: "rgba(0, 180, 216, 1)",
            backgroundColor: "rgba(0, 180, 216, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Regional Distribution Chart
  const regionalCtx = document.getElementById("regionalChart");
  if (regionalCtx && typeof Chart !== "undefined") {
    new Chart(regionalCtx, {
      type: "doughnut",
      data: {
        labels: ["Maharashtra", "Uttar Pradesh", "West Bengal", "Bihar", "Tamil Nadu", "Others"],
        datasets: [
          {
            data: [28, 22, 18, 15, 12, 5],
            backgroundColor: [
              "rgba(40, 167, 69, 0.8)",
              "rgba(0, 180, 216, 0.8)",
              "rgba(255, 193, 7, 0.8)",
              "rgba(220, 53, 69, 0.8)",
              "rgba(108, 117, 125, 0.8)",
              "rgba(52, 58, 64, 0.8)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
          },
        },
      },
    });
  }

  // Training Types Distribution Chart
  const trainingTypesCtx = document.getElementById("trainingTypesChart");
  if (trainingTypesCtx && typeof Chart !== "undefined") {
    new Chart(trainingTypesCtx, {
      type: "bar",
      data: {
        labels: ["Disaster Response", "Risk Assessment", "Community Training", "Emergency Mgmt", "Medical Response", "Others"],
        datasets: [
          {
            label: "Number of Trainings",
            data: [35, 28, 42, 18, 22, 11],
            backgroundColor: "rgba(40, 167, 69, 0.8)",
            borderColor: "rgba(40, 167, 69, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }

  // Enrollment Trends Chart
  const enrollmentTrendsCtx = document.getElementById("enrollmentTrendsChart");
  if (enrollmentTrendsCtx && typeof Chart !== "undefined") {
    new Chart(enrollmentTrendsCtx, {
      type: "line",
      data: {
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
        datasets: [
          {
            label: "Monthly Enrollments",
            data: [245, 312, 289, 378, 445, 412],
            borderColor: "rgba(0, 180, 216, 1)",
            backgroundColor: "rgba(0, 180, 216, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  console.log("Analytics charts initialized");
}

// ==================== ADMIN FUNCTIONS ====================

function showAdminPanels() {
  if (!currentUser) return;

  const adminRoles = ["NDMA Admin", "State Admin", "District/SDMA"];
  const isAdmin = adminRoles.includes(currentUser.role);

  // Show/hide admin menu items
  document.getElementById("adminTrainingsMenu").style.display = isAdmin
    ? "list-item"
    : "none";
  document.getElementById("adminAttendanceMenu").style.display = isAdmin
    ? "list-item"
    : "none";
  document.getElementById("adminReportsMenu").style.display = isAdmin
    ? "list-item"
    : "none";

  if (isAdmin) {
    loadAdminTrainingsList();
  }
}

async function loadAdminTrainingsList() {
  const result = await apiCall("/trainings", "GET");

  if (result.success && result.trainings) {
    const container = document.getElementById("adminTrainingsList");
    container.innerHTML = "";

    result.trainings.forEach((training) => {
      const card = document.createElement("div");
      card.className = "training-admin-card";
      card.innerHTML = `
        <h4>${training.title}</h4>
        <div class="training-info">
          <p><strong>Dates:</strong> ${training.start_date} to ${training.end_date}</p>
          <p><strong>Trainer:</strong> ${training.trainer}</p>
          <p><strong>Location:</strong> ${training.location}</p>
          <p><strong>Capacity:</strong> ${training.enrolled}/${training.capacity}</p>
        </div>
        <div class="training-actions">
          <button class="btn btn-primary btn-small" onclick="editTraining(${training.id})">Edit</button>
          <button class="btn btn-outline btn-small" onclick="loadAttendanceForTraining(${training.id})">Attendance</button>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

async function editTraining(trainingId) {
  const newTitle = prompt("Enter new training title:");
  if (!newTitle) return;

  const result = await apiCall(`/admin/trainings/${trainingId}`, "PUT", {
    title: newTitle,
  });

  if (result.success) {
    alert("Training updated successfully!");
    loadAdminTrainingsList();
  } else {
    alert("Error: " + result.message);
  }
}

async function loadAttendanceForTraining(trainingId) {
  const result = await apiCall(`/trainings/${trainingId}/report`, "GET");

  if (result.success) {
    const training = result.report.training;
    const participants = result.report.participants;

    const container = document.getElementById("participantsList");
    container.innerHTML = "";

    participants.forEach((participant) => {
      const item = document.createElement("div");
      item.className = "participant-item";
      item.innerHTML = `
        <input type="checkbox" id="participant_${participant.id}" value="${participant.id}">
        <label for="participant_${participant.id}">${participant.name} (${participant.role})</label>
      `;
      container.appendChild(item);
    });

    document.getElementById("attendanceParticipants").style.display = "block";
    showSection("admin-attendance");
  }
}

async function submitAttendance() {
  const checkboxes = document.querySelectorAll(
    '#participantsList input[type="checkbox"]:checked'
  );
  const participantIds = Array.from(checkboxes).map((cb) => parseInt(cb.value));

  if (participantIds.length === 0) {
    alert("Please select at least one participant");
    return;
  }

  // Get training ID from the page context (you may need to store it)
  const trainingId = sessionStorage.getItem("currentTrainingId");

  const result = await apiCall(
    `/trainings/${trainingId}/mark-attendance`,
    "POST",
    {
      participants: participantIds,
    }
  );

  if (result.success) {
    alert(result.message);
    loadAdminTrainingsList();
  } else {
    alert("Error: " + result.message);
  }
}

async function loadReports() {
  const result = await apiCall("/trainings", "GET");

  if (result.success && result.trainings) {
    const select = document.getElementById("reportTrainingSelect");
    select.innerHTML = '<option value="">Choose a training...</option>';

    result.trainings.forEach((training) => {
      const option = document.createElement("option");
      option.value = training.id;
      option.textContent = training.title;
      select.appendChild(option);
    });

    select.onchange = function () {
      if (this.value) {
        generateReport(this.value);
      }
    };
  }
}

async function generateReport(trainingId) {
  const result = await apiCall(`/trainings/${trainingId}/report`, "GET");

  if (result.success) {
    const report = result.report;
    const stats = report.statistics;

    // Update stats
    document.getElementById("reportTotalEnrolled").textContent =
      stats.total_enrolled;
    document.getElementById("reportPresent").textContent = stats.present;
    document.getElementById("reportAbsent").textContent = stats.absent;
    document.getElementById("reportAttendanceRate").textContent =
      stats.attendance_rate + "%";

    // Create participants table
    const participantsDiv = document.getElementById("participantsReport");
    let tableHTML = '<table class="report-table"><thead><tr>';
    tableHTML +=
      "<th>Participant Name</th><th>Email</th><th>Role</th><th>State</th><th>Attendance</th></tr></thead><tbody>";

    report.participants.forEach((p) => {
      const status = report.attendance[p.id] || "Absent";
      tableHTML += `<tr>
        <td>${p.name}</td>
        <td>${p.email}</td>
        <td>${p.role}</td>
        <td>${p.state}</td>
        <td><span class="badge ${
          status === "Present" ? "badge-success" : "badge-warning"
        }">${status}</span></td>
      </tr>`;
    });

    tableHTML += "</tbody></table>";
    participantsDiv.innerHTML = tableHTML;

    document.getElementById("reportContainer").style.display = "block";
    sessionStorage.setItem("currentTrainingId", trainingId);
  }
}

async function downloadReport() {
  const trainingId = sessionStorage.getItem("currentTrainingId");
  if (!trainingId) {
    alert("Please select a training first");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:8000/api/trainings/${trainingId}/report/export`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training_${trainingId}_report.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      alert("Error downloading report");
    }
  } catch (error) {
    console.error("Download error:", error);
    alert("Error downloading report");
  }
}

console.log("SafeStep Platform Script Loaded - Version 2.0");

// ==================== CHATBOT FUNCTIONS ====================

function addMessage(message, sender) {
  const chatMessages = document.getElementById("chatMessages");
  if (!chatMessages) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}-message`;

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "message-avatar";
  avatarDiv.textContent = sender === 'bot' ? '🤖' : '👤';

  const contentDiv = document.createElement("div");
  contentDiv.className = "message-content";
  contentDiv.innerHTML = `<p>${message}</p>`;

  messageDiv.appendChild(avatarDiv);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);

  // Scroll to bottom
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function getBotResponse(message) {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! Welcome to SafeStep. How can I assist you with disaster training and management?";
  }

  if (lowerMessage.includes('training') || lowerMessage.includes('trainings')) {
    return "SafeStep offers comprehensive disaster training programs. You can view available trainings in the Training Events section. Would you like help finding specific training types?";
  }

  if (lowerMessage.includes('dashboard') || lowerMessage.includes('analytics')) {
    return "The Dashboard shows key metrics and the Analytics section provides detailed reports. You can access these from the navigation menu.";
  }

  if (lowerMessage.includes('report') || lowerMessage.includes('reports')) {
    return "Reports are available in the Reports section. You can generate and export various types of reports for your disaster management activities.";
  }

  if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
    return "To access the full features, please log in using the Sign In button. Demo credentials are available in the login modal.";
  }

  if (lowerMessage.includes('help') || lowerMessage.includes('support')) {
    return "I'm here to help! You can ask me about trainings, reports, analytics, or any other features of the SafeStep platform.";
  }

  if (lowerMessage.includes('disaster') || lowerMessage.includes('emergency')) {
    return "SafeStep is designed to help manage disaster response and training. Our platform supports various disaster types including floods, earthquakes, and more.";
  }

  return "I'm still learning! For specific questions about SafeStep features, try asking about trainings, reports, or analytics. How else can I help?";
}

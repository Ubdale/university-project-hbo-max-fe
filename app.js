const MOVIE_API_URL = "https://jsonfakery.com/movies/paginated";
const API_BASE_URL = "https://university-project-hbo-max-be.onrender.com";
// const API_BASE_URL = "http://localhost:3000"; // For local development

document.addEventListener("DOMContentLoaded", () => {
  // Determine which page we are on
  // Initialize Auth State on every page
  updateNavbarAuthState();

  if (document.getElementById("movie-container")) {
    fetchMovies();
    setupSearch();
    setupScrollSpy();
  } else if (document.getElementById("authTabs")) {
    setupLogin();
  } else if (document.getElementById("player-backdrop")) {
    setupPlayer();
  }
});

// --- Landing Page Logic ---
async function fetchMovies() {
  console.log("Fetching movies from JSON Fakery...");
  // JSON Fakery doesn't require headers by default
  const options = {
    method: "GET",
  };

  try {
    const response = await fetch(MOVIE_API_URL, options);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    // JSON Fakery paginated response has 'data' field containing the movies
    const movies = data.data || [];

    if (movies.length === 0) {
      console.warn("No movies found.");
      return;
    }

    // Filter out movies with no images
    const validMovies = movies.filter((movie) => {
      const img = movie.poster_path || movie.backdrop_path;
      return img && !img.includes("placeholder") && !img.includes("null");
    });

    if (validMovies.length === 0) {
      console.warn("No valid movies with images found.");
      document.getElementById("movie-container").innerHTML =
        '<p class="text-white ps-4">No content available with images.</p>';
      return;
    }

    // Store all movies for search functionality
    allMovies = validMovies;

    // Randomly select hero movie from valid ones
    const randomMovie =
      validMovies[Math.floor(Math.random() * validMovies.length)];
    updateHeroSection(randomMovie);

    // Render multiple rows for "Full" UI feel
    // We reuse the same movie list but shuffle/slice to simulate different categories
    renderMovies(validMovies, "movie-container");

    const shuffled = [...validMovies].sort(() => 0.5 - Math.random());
    renderMovies(shuffled, "movie-container-added");

    const reversed = [...validMovies].reverse();
    renderMovies(reversed, "movie-container-popular");

    // Initialize sliders AFTER content is rendered
    initCustomSlider();

    // Hide full page loader
    hidePageLoader();
  } catch (error) {
    console.error("Error fetching movies:", error);
    document.getElementById("movie-container").innerHTML =
      '<p class="text-white text-center">Failed to load content.</p>';

    // Hide loader even on error
    hidePageLoader();
  }
}

function hidePageLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) {
    loader.classList.add("loader-fade-out");
    // Optional: Remove from DOM after transition
    setTimeout(() => {
      loader.style.display = "none";
    }, 1000);
  }
}

function updateHeroSection(movie) {
  const heroSection = document.getElementById("hero-section");
  const heroTitle = document.getElementById("hero-title");

  if (!heroSection || !movie) return;

  // Prioritize backdrop for large hero area
  const imageUrl = movie.backdrop_path || movie.poster_path;
  const title = movie.original_title || movie.title || "Unknown Title";
  const rating = movie.vote_average || (Math.random() * 2 + 7).toFixed(1);

  if (imageUrl) {
    heroSection.style.backgroundImage = `url('${imageUrl}')`;
  }

  if (heroTitle && title) {
    heroTitle.innerText = title;
  }

  // Add click handler to Play button
  const playBtn = document.querySelector(".hero-content .btn-light");
  if (playBtn) {
    playBtn.onclick = () => {
      const backdrop = movie.backdrop_path || movie.poster_path;
      window.location.href = `player.html?title=${encodeURIComponent(title)}&img=${encodeURIComponent(backdrop)}&rating=${rating}`;
    };
  }
}

function renderMovies(movies, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Remove spinner if it exists
  const spinner = container.querySelector(".loading-spinner");
  if (spinner) spinner.remove();

  container.innerHTML = "";

  movies.forEach((movie, index) => {
    // Use poster for cards (portrait)
    const imageUrl = movie.poster_path || movie.backdrop_path;
    const title = movie.original_title || movie.title || "Unknown Title";
    const rating = movie.vote_average || (Math.random() * 2 + 7).toFixed(1);
    const backdrop = movie.backdrop_path || movie.poster_path;

    const card = document.createElement("div");
    card.className = "movie-card";
    card.style.animationDelay = `${index * 0.05}s`; // Staggered entrance
    card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/200x300?text=Image+Error'">
            <div class="movie-info">
                <h6>${title}</h6>
            </div>
        `;

    card.addEventListener("click", () => {
      window.location.href = `player.html?title=${encodeURIComponent(title)}&img=${encodeURIComponent(backdrop)}&rating=${rating}`;
    });

    container.appendChild(card);
  });
}

function initCustomSlider() {
  const sliders = document.querySelectorAll(".slider-wrapper");

  sliders.forEach((container) => {
    const sliderParent = container.closest(".custom-slider");
    const prevBtn = sliderParent.querySelector(".slider-arrow.prev");
    const nextBtn = sliderParent.querySelector(".slider-arrow.next");

    const updateArrows = () => {
      if (!prevBtn || !nextBtn) return;
      // Show/Hide prev arrow
      prevBtn.classList.toggle("arrow-hidden", container.scrollLeft <= 10);

      // Show/Hide next arrow
      const isAtEnd =
        container.scrollLeft + container.clientWidth >=
        container.scrollWidth - 10;
      nextBtn.classList.toggle("arrow-hidden", isAtEnd);
    };

    // Initial check after content is likely rendered
    setTimeout(updateArrows, 500);

    // Update on scroll
    container.addEventListener("scroll", updateArrows);

    // Arrow click logic
    prevBtn.addEventListener("click", () => {
      container.scrollBy({
        left: -container.clientWidth * 0.8,
        behavior: "smooth",
      });
    });

    nextBtn.addEventListener("click", () => {
      container.scrollBy({
        left: container.clientWidth * 0.8,
        behavior: "smooth",
      });
    });

    // Resize observer to update arrows when window size changes
    const resizeObserver = new ResizeObserver(() => updateArrows());
    resizeObserver.observe(container);
  });
}

// --- Player Page Logic ---
function setupPlayer() {
  const params = new URLSearchParams(window.location.search);
  const title = params.get("title") || "Unknown Movie";
  const imgParams = params.get("img");
  // const rating = params.get('rating');

  // Update Title
  const titleEl = document.getElementById("player-title");
  if (titleEl) titleEl.textContent = title;

  // Update Backdrop
  const backdropEl = document.getElementById("player-backdrop");
  if (backdropEl && imgParams) {
    backdropEl.style.backgroundImage = `url('${imgParams}')`;
  }

  // Play button interaction
  const playBtn = document.querySelector(".play-btn");
  if (playBtn) {
    playBtn.addEventListener("click", () => {
      alert("Playing functionality coming soon!");
    });
  }
}

// --- Login Logic with Tabs & Toasts ---
function setupLogin() {
  setupAuthForm("signin-form", false);
  setupAuthForm("signup-form", true);

  // Initial tab selection based on URL parameter
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  if (tabParam === "signup") {
    const signupTabBtn = document.querySelector("#signup-tab");
    if (signupTabBtn) {
      const tab = new bootstrap.Tab(signupTabBtn);
      tab.show();
    }
  } else if (tabParam === "signin") {
    const signinTabBtn = document.querySelector("#signin-tab");
    if (signinTabBtn) {
      const tab = new bootstrap.Tab(signinTabBtn);
      tab.show();
    }
  }
}

function setupAuthForm(formId, isSignup) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    let email, password, name, confirmPassword;

    if (isSignup) {
      const nameInput = document.getElementById("signup-name");
      const emailInput = document.getElementById("signup-email");
      const passInput = document.getElementById("signup-password");
      const confirmPassInput = document.getElementById(
        "signup-confirm-password",
      );

      if (!nameInput || !emailInput || !passInput || !confirmPassInput) return;

      name = nameInput.value.trim();
      email = emailInput.value;
      password = passInput.value;
      confirmPassword = confirmPassInput.value;

      // Validation
      if (name.length < 2) {
        showToast("Please enter your full name", "danger");
        return;
      }

      if (password !== confirmPassword) {
        showToast("Passwords do not match", "danger");
        return;
      }

      if (password.length < 6) {
        showToast("Password must be at least 6 characters", "danger");
        return;
      }
    } else {
      const emailInput = document.getElementById("signin-email");
      const passInput = document.getElementById("signin-password");

      if (!emailInput || !passInput) return;

      email = emailInput.value;
      password = passInput.value;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const endpoint = isSignup
      ? `${API_BASE_URL}/api/signup`
      : `${API_BASE_URL}/api/login`;

    // Start Loading
    if (submitBtn) submitBtn.classList.add("btn-loading");

    try {
      const body = isSignup ? { name, email, password } : { email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      // Stop Loading
      if (submitBtn) submitBtn.classList.remove("btn-loading");

      if (res.ok) {
        // Store token and user data in sessionStorage for both signup and login
        sessionStorage.setItem("authToken", data.token);
        sessionStorage.setItem("userId", data.user.id);
        sessionStorage.setItem("userEmail", data.user.email);
        if (data.user.name) {
          sessionStorage.setItem("userName", data.user.name);
        }

        console.log("User authenticated successfully:", {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
        });

        if (!isSignup) {
          showToast("Welcome back! Redirecting...", "success");
        } else {
          showToast("Account created! Redirecting...", "success");
        }

        // Redirect to main page after a short delay
        setTimeout(() => {
          window.location.href = "index.html";
        }, 1500);
      } else {
        showToast(data.message || "Authentication failed", "danger");
      }
    } catch (err) {
      console.error(err);
      if (submitBtn) submitBtn.classList.remove("btn-loading");
      showToast("Server connection error. Please try again.", "danger");
    }
  });
}

function showToast(message, type = "primary") {
  const toastEl = document.getElementById("liveToast");
  const toastBody = document.getElementById("toast-message");

  if (toastEl && toastBody) {
    toastBody.textContent = message;
    // Reset classes
    toastEl.className = `toast align-items-center text-white border-0`;
    // Add color class
    toastEl.classList.add(`bg-${type}`);

    // Use Bootstrap Toast API
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
  }
}

// --- Authentication State Management ---
async function updateNavbarAuthState() {
  const token = sessionStorage.getItem("authToken");
  const authButtons = document.querySelector(".auth-buttons");
  const userProfile = document.querySelector(".user-profile");

  if (!authButtons || !userProfile) {
    console.log("Auth toggle: Elements not found");
    return;
  }

  console.log("Auth toggle: Token present:", !!token);

  // Optimistic UI: If token exists, assume logged in until verified
  if (token) {
    console.log("Auth toggle: Hiding buttons, showing profile");
    authButtons.style.setProperty("display", "none", "important");
    userProfile.style.setProperty("display", "flex", "important");

    try {
      const res = await fetch(`${API_BASE_URL}/api/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(
          "Auth toggle: Verification successful for",
          data.user.email,
        );
        const userInitial = data.user.email.charAt(0).toUpperCase();
        const profileIcon = document.querySelector(".profile-icon");
        if (profileIcon) profileIcon.textContent = userInitial;
      } else {
        throw new Error("Invalid token");
      }
    } catch (error) {
      console.log("Auth toggle: Verification failed:", error);
      sessionStorage.removeItem("authToken");
      sessionStorage.removeItem("userId");
      sessionStorage.removeItem("userEmail");
      sessionStorage.removeItem("userName");
      authButtons.style.setProperty("display", "flex", "important");
      userProfile.style.setProperty("display", "none", "important");
    }
  } else {
    console.log("Auth toggle: Showing buttons, hiding profile");
    authButtons.style.setProperty("display", "flex", "important");
    userProfile.style.setProperty("display", "none", "important");
  }
}

function logout() {
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("userId");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("userName");
  window.location.href = "index.html";
}

// --- Search Functionality ---
let allMovies = [];

function setupSearch() {
  const searchIcon = document.querySelector(".search-icon");
  const searchContainer = document.querySelector(".search-container");
  const searchInput = document.querySelector(".search-input");
  const searchResults = document.querySelector(".search-results");

  if (!searchIcon || !searchContainer || !searchInput) return;

  // Toggle search input
  searchIcon.addEventListener("click", () => {
    searchContainer.classList.toggle("active");
    if (searchContainer.classList.contains("active")) {
      searchInput.focus();
    } else {
      searchInput.value = "";
      if (searchResults) searchResults.innerHTML = "";
    }
  });

  // Search functionality
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();

    if (query.length === 0) {
      if (searchResults) searchResults.innerHTML = "";
      return;
    }

    const filtered = allMovies.filter((movie) => {
      const title = (movie.original_title || movie.title || "").toLowerCase();
      return title.includes(query);
    });

    displaySearchResults(filtered.slice(0, 8)); // Show max 8 results
  });

  // Close search when clicking outside
  document.addEventListener("click", (e) => {
    if (!searchContainer.contains(e.target) && !searchIcon.contains(e.target)) {
      searchContainer.classList.remove("active");
      searchInput.value = "";
      if (searchResults) searchResults.innerHTML = "";
    }
  });
}

function displaySearchResults(movies) {
  const searchResults = document.querySelector(".search-results");
  if (!searchResults) return;

  if (movies.length === 0) {
    searchResults.innerHTML =
      '<div class="search-no-results">No results found</div>';
    return;
  }

  searchResults.innerHTML = movies
    .map((movie) => {
      const imageUrl = movie.poster_path || movie.backdrop_path;
      const title = movie.original_title || movie.title || "Unknown Title";
      const rating = movie.vote_average || (Math.random() * 2 + 7).toFixed(1);
      const backdrop = movie.backdrop_path || movie.poster_path;

      return `
            <div class="search-result-item" onclick="window.location.href='player.html?title=${encodeURIComponent(title)}&img=${encodeURIComponent(backdrop)}&rating=${rating}'">
                <img src="${imageUrl}" alt="${title}" onerror="this.src='https://via.placeholder.com/50x75?text=No+Image'">
                <div class="search-result-info">
                    <h6>${title}</h6>
                    <span class="search-result-rating">⭐ ${rating}</span>
                </div>
            </div>
        `;
    })
    .join("");
}

// --- Password Visibility Toggle ---
window.togglePasswordVisibility = function (inputId, toggleElement) {
  const passwordInput = document.getElementById(inputId);
  const icon = toggleElement.querySelector("i");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
};

// --- ScrollSpy (Active Link Highlighting) ---
function setupScrollSpy() {
  const navLinks = document.querySelectorAll(".navbar-nav .nav-link");
  const sections = Array.from(document.querySelectorAll(".movie-section"));
  const navbar = document.querySelector(".navbar");
  const navHeight = navbar ? navbar.offsetHeight : 80;

  if (sections.length === 0 || navLinks.length === 0) return;

  function updateActiveLink() {
    let currentSectionId = "";
    const scrollPosition = window.scrollY + navHeight + 100; // Offset for better precision

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;

      if (
        scrollPosition >= sectionTop &&
        scrollPosition < sectionTop + sectionHeight
      ) {
        currentSectionId = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (
        currentSectionId &&
        link.getAttribute("href") === `#${currentSectionId}`
      ) {
        link.classList.add("active");
      }
    });
  }

  // Use passive scroll listener for performance
  window.addEventListener("scroll", updateActiveLink, { passive: true });

  // Initial call
  updateActiveLink();
}

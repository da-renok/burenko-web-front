const API_BASE = "http://127.0.0.1:8000/api/v1";


const userDisplay = document.getElementById("user-display");
const btnLogin = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");
const btnLogout = document.getElementById("btn-logout");


const statusEl = document.getElementById("status");
const designsEl = document.getElementById("designs");
const mastersStatusEl = document.getElementById("masters-status");
const mastersEl = document.getElementById("masters");


let redirectAfterLogin = null;



function getAccessToken() {
  return localStorage.getItem("access_token");
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token");
}

function getUsername() {
  return localStorage.getItem("username");
}

function saveAuth(access, refresh, username) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  if (username) {
    localStorage.setItem("username", username);
  }
  updateUI();
}

function clearAuth() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("username");
  updateUI();
}

function isAuthenticated() {
  return !!getAccessToken();
}


function updateUI() {
  if (isAuthenticated()) {
    userDisplay.textContent = `Привіт, ${getUsername() || "користувач"}`;
    btnLogin.classList.add("hidden");
    btnRegister.classList.add("hidden");
    btnLogout.classList.remove("hidden");
  } else {
    userDisplay.textContent = "";
    btnLogin.classList.remove("hidden");
    btnRegister.classList.remove("hidden");
    btnLogout.classList.add("hidden");
  }
}


async function authFetch(url, options = {}) {
  options.headers = options.headers || {};

  const token = getAccessToken();
  if (token) {
    options.headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(url, options);

  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      options.headers["Authorization"] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, options);
    } else {
      clearAuth();
      navigateTo("#login");
      throw new Error("Сесія закінчилася. Будь ласка, увійдіть знову.");
    }
  }

  return response;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });

    if (res.ok) {
      const data = await res.json();
      localStorage.setItem("access_token", data.access);
      return true;
    }
  } catch (err) {
    console.error("Помилка оновлення токена:", err);
  }

  return false;
}



function navigateTo(hash) {
  window.location.hash = hash;
}

function handleRoute() {
  const hash = window.location.hash || "#catalog";
  const route = hash.split("?")[0];


  if (route === "#protected" && !isAuthenticated()) {
    redirectAfterLogin = "#protected";
    navigateTo("#login");
    return;
  }


  if ((route === "#login" || route === "#register") && isAuthenticated()) {
    navigateTo("#catalog");
    return;
  }


  document.querySelectorAll(".page").forEach((sec) => sec.classList.add("hidden"));

  if (route === "#login") {
    document.getElementById("page-login").classList.remove("hidden");
  } else if (route === "#register") {
    document.getElementById("page-register").classList.remove("hidden");
  } else if (route === "#protected") {
    document.getElementById("page-protected").classList.remove("hidden");
  } else {
    document.getElementById("page-catalog").classList.remove("hidden");
    loadCatalog();
  }
}

window.addEventListener("hashchange", handleRoute);
window.addEventListener("DOMContentLoaded", () => {
  updateUI();
  handleRoute();
});



async function loadCatalog() {
  loadDesigns();
  loadMasters();
}

async function loadDesigns() {
  designsEl.innerHTML = "";
  statusEl.textContent = "Завантаження ескізів...";

  try {
    const res = await fetch(`${API_BASE}/designs`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error?.message || "Не вдалося завантажити ескізи");

    statusEl.textContent = data.length ? "" : "Ескізів поки немає.";
    data.forEach(renderDesign);
  } catch (err) {
    statusEl.textContent = "Помилка: " + err.message;
    statusEl.className = "error-msg";
  }
}

function renderDesign(design) {
  const card = document.createElement("div");
  card.className = "card";

  const image = document.createElement("img");
  image.src = design.image_url;
  image.alt = design.title;

  const title = document.createElement("h3");
  title.textContent = design.title;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.innerHTML = `<span>${design.style}</span> <strong class="price">${design.price} грн</strong>`;

  card.append(image, title, meta);
  designsEl.append(card);
}

async function loadMasters() {
  mastersEl.innerHTML = "";
  mastersStatusEl.textContent = "Завантаження майстрів...";

  try {
    const res = await fetch(`${API_BASE}/masters`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error?.message || "Не вдалося завантажити майстрів");

    mastersStatusEl.textContent = data.length ? "" : "Майстрів поки немає.";
    data.forEach(renderMaster);
  } catch (err) {
    mastersStatusEl.textContent = "Помилка: " + err.message;
    mastersStatusEl.className = "error-msg";
  }
}

function renderMaster(master) {
  const card = document.createElement("div");
  card.className = "card";

  const name = document.createElement("h3");
  name.textContent = master.name;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = master.specialization || "Спеціалізацію не вказано";

  card.append(name, meta);
  mastersEl.append(card);
}


document.getElementById("form-login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("login-error");
  errorEl.classList.add("hidden");

  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Невірна комбінація логіна та пароля.");

    saveAuth(data.access, data.refresh, username);


    const target = redirectAfterLogin || "#catalog";
    redirectAfterLogin = null;
    navigateTo(target);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  }
});


document.getElementById("form-register").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = document.getElementById("register-error");
  const successEl = document.getElementById("register-success");
  errorEl.classList.add("hidden");
  successEl.classList.add("hidden");

  const payload = {
    username: document.getElementById("reg-username").value.trim(),
    email: document.getElementById("reg-email").value.trim(),
    first_name: document.getElementById("reg-firstname").value.trim(),
    last_name: document.getElementById("reg-lastname").value.trim(),
    password: document.getElementById("reg-password").value,
    password_confirmation: document.getElementById("reg-password-confirm").value,
  };

  try {
    const res = await fetch(`${API_BASE}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      let formattedErrors = [];


      if (data.error?.details) {
        Object.values(data.error.details).forEach((errArray) => {
          if (Array.isArray(errArray)) {
            formattedErrors.push(...errArray);
          } else {
            formattedErrors.push(errArray);
          }
        });
      }

      const errorMessage = formattedErrors.length
        ? formattedErrors.join("<br>• ")
        : (data.error?.message || "Помилка реєстрації.");

      throw new Error(errorMessage);
    }

    successEl.textContent = "Успішна реєстрація! Тепер увійдіть у свій акаунт.";
    successEl.classList.remove("hidden");
    setTimeout(() => navigateTo("#login"), 1500);
  } catch (err) {
    errorEl.innerHTML = "• " + err.message; // Використовуємо innerHTML для форматування <br>
    errorEl.classList.remove("hidden");
  }
});

// Створення ескізу (Захищений ендпоінт)
document.getElementById("form-create-design").addEventListener("submit", async (e) => {
  e.preventDefault();
  const statusEl = document.getElementById("create-status");
  statusEl.classList.add("hidden");

  const payload = {
    title: document.getElementById("design-title").value.trim(),
    style: document.getElementById("design-style").value.trim(),
    price: parseInt(document.getElementById("design-price").value),
    image_url: document.getElementById("design-image").value.trim(),
    master: parseInt(document.getElementById("design-master").value),
  };

  try {
    const res = await authFetch(`${API_BASE}/designs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Помилка створення ескізу.");

    alert("Ескіз успішно додано!");
    document.getElementById("form-create-design").reset();
    navigateTo("#catalog");
  } catch (err) {
    statusEl.textContent = err.message;
    statusEl.classList.remove("hidden");
  }
});

// Logout
btnLogout.addEventListener("click", () => {
  clearAuth();
  navigateTo("#catalog");
});
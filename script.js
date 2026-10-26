const API_URL = "http://127.0.0.1:8000/api/v1/designs";

const statusEl = document.getElementById("status");
const designsEl = document.getElementById("designs");

async function loadDesigns() {
  try {
    const response = await fetch(API_URL);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error.message);
    }
    statusEl.textContent = data.length ? "" : "Ескізів поки немає.";
    data.forEach(renderDesign);
  } catch (error) {
    statusEl.textContent = "Помилка: " + error.message;
    statusEl.classList.add("error");
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
  meta.textContent = design.style + " · " + design.price + " грн";

  card.append(image, title, meta);
  designsEl.append(card);
}

loadDesigns();

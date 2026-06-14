const storageKey = "capture-app-prototype-items";

const form = document.querySelector("#captureForm");
const resetFormButton = document.querySelector("#resetForm");
const searchInput = document.querySelector("#search");
const sectionFilter = document.querySelector("#sectionFilter");
const captureList = document.querySelector("#captureList");
const emptyState = document.querySelector("#emptyState");
const itemCount = document.querySelector("#itemCount");
const template = document.querySelector("#captureTemplate");
const saveState = document.querySelector("#saveState");
const photoInput = document.querySelector("#photo");
const photoPreviewBox = document.querySelector("#photoPreviewBox");
const photoPreview = document.querySelector("#photoPreview");
const removePhotoButton = document.querySelector("#removePhoto");
const fields = {
  title: document.querySelector("#title"),
  notes: document.querySelector("#notes"),
  category: document.querySelector("#category"),
  status: document.querySelector("#status"),
  tags: document.querySelector("#tags"),
  location: document.querySelector("#location"),
  isLgsgCandidate: document.querySelector("#isLgsgCandidate"),
  clientVisible: document.querySelector("#clientVisible"),
  targetSection: document.querySelector("#targetSection"),
  tasks: document.querySelector("#tasks"),
};

let captures = loadCaptures();
let editingId = null;
let currentPhotoData = "";

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const previousCapture = editingId ? findCapture(editingId) : null;

  if (!title) {
    return;
  }

  const capture = {
    id: editingId || crypto.randomUUID(),
    title,
    notes: String(formData.get("notes") || "").trim(),
    category: String(formData.get("category") || "idea"),
    status: String(formData.get("status") || "captured"),
    tags: splitTags(String(formData.get("tags") || "")),
    location: String(formData.get("location") || "").trim(),
    isLgsgCandidate: formData.get("isLgsgCandidate") === "on",
    clientVisible: formData.get("clientVisible") === "on",
    targetSection: String(formData.get("targetSection") || "none"),
    tasks: splitTasks(String(formData.get("tasks") || "")),
    photoData: currentPhotoData,
    updatedAt: new Date().toISOString(),
    createdAt: editingId ? previousCapture?.createdAt || new Date().toISOString() : new Date().toISOString(),
  };

  if (!capture.isLgsgCandidate) {
    capture.targetSection = "none";
    capture.clientVisible = false;
  }

  captures = editingId
    ? captures.map((item) => (item.id === editingId ? capture : item))
    : [capture, ...captures];

  editingId = null;
  currentPhotoData = "";
  form.reset();
  updatePhotoPreview();
  persist();
  render();
  flashSaved("Saved");
});

resetFormButton.addEventListener("click", () => {
  editingId = null;
  currentPhotoData = "";
  form.reset();
  updatePhotoPreview();
});

searchInput.addEventListener("input", render);
sectionFilter.addEventListener("change", render);

photoInput.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  if (!file) {
    return;
  }

  currentPhotoData = await imageToDataUrl(file);
  updatePhotoPreview();
});

removePhotoButton.addEventListener("click", () => {
  currentPhotoData = "";
  photoInput.value = "";
  updatePhotoPreview();
});

captureList.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  const card = event.target.closest("[data-id]");
  const id = card?.dataset.id;
  const capture = findCapture(id);

  if (!capture) {
    return;
  }

  if (button.classList.contains("edit-button")) {
    editCapture(capture);
  }

  if (button.classList.contains("delete-button")) {
    captures = captures.filter((item) => item.id !== id);
    persist();
    render();
    flashSaved("Deleted");
  }
});

render();
registerServiceWorker();

function loadCaptures() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(captures));
}

function render() {
  const query = searchInput.value.trim().toLowerCase();
  const filter = sectionFilter.value;

  const visible = captures.filter((capture) => {
    const haystack = [
      capture.title,
      capture.notes,
      capture.category,
      capture.location,
      ...(capture.tasks || []),
      capture.targetSection,
      ...capture.tags,
    ]
      .join(" ")
      .toLowerCase();

    const matchesSearch = !query || haystack.includes(query);
    const matchesFilter = filter === "all" || capture.targetSection === filter;

    return matchesSearch && matchesFilter;
  });

  captureList.innerHTML = "";
  itemCount.textContent = `${visible.length} ${visible.length === 1 ? "item" : "items"}`;
  emptyState.hidden = visible.length > 0;

  visible.forEach((capture) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.id = capture.id;
    node.querySelector(".meta-line").textContent = buildMeta(capture);
    node.querySelector("h3").textContent = capture.title;
    node.querySelector(".status-pill").textContent = titleCase(capture.status);
    node.querySelector(".notes").textContent = capture.notes || "No notes yet.";

    const photo = node.querySelector(".capture-photo");
    if (capture.photoData) {
      photo.src = capture.photoData;
      photo.alt = `${capture.title} photo`;
    }

    const tagRow = node.querySelector(".tag-row");
    const tags = [
      capture.category,
      capture.isLgsgCandidate ? "LGSG candidate" : "",
      capture.targetSection !== "none" ? capture.targetSection : "",
      ...capture.tags,
    ].filter(Boolean);

    tags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = titleCase(tag);
      tagRow.append(span);
    });

    const detailGrid = node.querySelector(".detail-grid");
    addDetail(detailGrid, "Location", capture.location || "Not set");
    addDetail(detailGrid, "Target", titleCase(capture.targetSection));
    addDetail(detailGrid, "Client visible", capture.clientVisible ? "Yes" : "No");

    const taskList = node.querySelector(".task-list");
    const tasks = capture.tasks || normalizeLegacyTasks(capture);
    taskList.hidden = tasks.length === 0;
    tasks.forEach((task) => {
      const li = document.createElement("li");
      li.textContent = task;
      taskList.append(li);
    });

    captureList.append(node);
  });
}

function editCapture(capture) {
  editingId = capture.id;
  currentPhotoData = capture.photoData || "";
  fields.title.value = capture.title;
  fields.notes.value = capture.notes;
  fields.category.value = capture.category || capture.type || "idea";
  fields.status.value = capture.status;
  fields.tags.value = capture.tags.join(", ");
  fields.location.value = capture.location;
  fields.isLgsgCandidate.checked = capture.isLgsgCandidate;
  fields.clientVisible.checked = capture.clientVisible;
  fields.targetSection.value = capture.targetSection;
  fields.tasks.value = (capture.tasks || normalizeLegacyTasks(capture)).join("\n");
  photoInput.value = "";
  updatePhotoPreview();
  fields.title.focus();
  flashSaved("Editing");
}

function findCapture(id) {
  return captures.find((capture) => capture.id === id);
}

function splitTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function splitTasks(value) {
  return value
    .split(/\r?\n/)
    .map((task) => task.trim())
    .filter(Boolean);
}

function normalizeLegacyTasks(capture) {
  return capture.task ? [capture.task] : [];
}

function buildMeta(capture) {
  const date = new Date(capture.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return `${titleCase(capture.category || capture.type)} - ${date}`;
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addDetail(parent, label, value) {
  const wrapper = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");

  dt.textContent = label;
  dd.textContent = value;
  wrapper.append(dt, dd);
  parent.append(wrapper);
}

function flashSaved(text) {
  saveState.textContent = text;
  window.clearTimeout(flashSaved.timeout);
  flashSaved.timeout = window.setTimeout(() => {
    saveState.textContent = "Local prototype";
  }, 1300);
}

function updatePhotoPreview() {
  photoPreviewBox.hidden = !currentPhotoData;
  if (currentPhotoData) {
    photoPreview.src = currentPhotoData;
  } else {
    photoPreview.removeAttribute("src");
  }
}

function imageToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("load", () => {
        const maxEdge = 1200;
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");

        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      });
      image.addEventListener("error", reject);
      image.src = String(reader.result || "");
    });
    reader.addEventListener("error", reject);
    reader.readAsDataURL(file);
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register("./sw.js").catch(() => {
    // Service workers are unavailable from file://, but work once deployed over HTTPS.
  });
}

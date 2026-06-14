const appVersion = "1.3.0";
const storageKey = "capture-app-prototype-items";
const placesKeyStorageKey = "capture-app-google-places-key";

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
const cameraPhotoInput = document.querySelector("#cameraPhoto");
const photoPreviewBox = document.querySelector("#photoPreviewBox");
const photoPreview = document.querySelector("#photoPreview");
const removePhotoButton = document.querySelector("#removePhoto");
const choosePhotoButton = document.querySelector("#choosePhoto");
const takePhotoButton = document.querySelector("#takePhoto");
const searchMapsButton = document.querySelector("#searchMaps");
const appVersionLabel = document.querySelector("#appVersion");
const checkUpdateButton = document.querySelector("#checkUpdate");
const placesApiKeyInput = document.querySelector("#placesApiKey");
const savePlacesKeyButton = document.querySelector("#savePlacesKey");
const clearPlacesKeyButton = document.querySelector("#clearPlacesKey");
const enablePlacesLookupButton = document.querySelector("#enablePlacesLookup");
const placeSearchWrap = document.querySelector("#placeSearchWrap");
const placeSearchInput = document.querySelector("#placeSearch");
const runPlaceSearchButton = document.querySelector("#runPlaceSearch");
const placeResults = document.querySelector("#placeResults");
const placesStatus = document.querySelector("#placesStatus");
const placesDebug = document.querySelector("#placesDebug");
const fields = {
  title: document.querySelector("#title"),
  notes: document.querySelector("#notes"),
  category: document.querySelector("#category"),
  status: document.querySelector("#status"),
  tags: document.querySelector("#tags"),
  location: document.querySelector("#location"),
  addressLine1: document.querySelector("#addressLine1"),
  addressLine2: document.querySelector("#addressLine2"),
  townCity: document.querySelector("#townCity"),
  region: document.querySelector("#region"),
  postcode: document.querySelector("#postcode"),
  country: document.querySelector("#country"),
  phone: document.querySelector("#phone"),
  email: document.querySelector("#email"),
  website: document.querySelector("#website"),
  mapsUrl: document.querySelector("#mapsUrl"),
  isLgsgCandidate: document.querySelector("#isLgsgCandidate"),
  clientVisible: document.querySelector("#clientVisible"),
  targetSection: document.querySelector("#targetSection"),
  tasks: document.querySelector("#tasks"),
};

let captures = loadCaptures();
let editingId = null;
let currentPhotoData = "";
let placesLibrary = null;
let placesSessionToken = null;
let googleMapsScriptPromise = null;
let placesLookupReady = false;
let latestPlacesRequestId = 0;
let placeSearchDebounce = null;

appVersionLabel.textContent = `v${appVersion}`;
placesApiKeyInput.value = localStorage.getItem(placesKeyStorageKey) || "";
if (placesApiKeyInput.value) {
  placesStatus.textContent = "Places key saved on this device. Tap Enable lookup to use autocomplete.";
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const previousCapture = editingId ? findCapture(editingId) : null;

  if (!title) {
    fields.title.focus();
    flashSaved("Add a title");
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
    addressLine1: String(formData.get("addressLine1") || "").trim(),
    addressLine2: String(formData.get("addressLine2") || "").trim(),
    townCity: String(formData.get("townCity") || "").trim(),
    region: String(formData.get("region") || "").trim(),
    postcode: String(formData.get("postcode") || "").trim(),
    country: String(formData.get("country") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    email: String(formData.get("email") || "").trim(),
    website: String(formData.get("website") || "").trim(),
    mapsUrl: String(formData.get("mapsUrl") || "").trim(),
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
  fields.country.value = "Greece";
  updatePhotoPreview();
  persist();
  render();
  flashSaved("Saved");
});

resetFormButton.addEventListener("click", () => {
  editingId = null;
  currentPhotoData = "";
  form.reset();
  fields.country.value = "Greece";
  updatePhotoPreview();
});

searchInput.addEventListener("input", render);
sectionFilter.addEventListener("change", render);

checkUpdateButton.addEventListener("click", async () => {
  await refreshAppShell();
});

savePlacesKeyButton.addEventListener("click", () => {
  const key = placesApiKeyInput.value.trim();
  if (!key) {
    flashSaved("Paste key first");
    placesStatus.textContent = "Paste a restricted Google Maps API key, then save it.";
    return;
  }

  localStorage.setItem(placesKeyStorageKey, key);
  placesStatus.textContent = "Places key saved on this device. Tap Enable lookup.";
  flashSaved("Key saved");
});

clearPlacesKeyButton.addEventListener("click", () => {
  localStorage.removeItem(placesKeyStorageKey);
  placesApiKeyInput.value = "";
  placeSearchWrap.hidden = true;
  runPlaceSearchButton.hidden = true;
  placeResults.hidden = true;
  placeResults.replaceChildren();
  placesLibrary = null;
  placesSessionToken = null;
  placesLookupReady = false;
  placesStatus.textContent = "Places key cleared from this device.";
  flashSaved("Key cleared");
});

enablePlacesLookupButton.addEventListener("click", async () => {
  const key = placesApiKeyInput.value.trim() || localStorage.getItem(placesKeyStorageKey) || "";
  if (!key) {
    placesStatus.textContent = "Paste and save a restricted API key first.";
    placesApiKeyInput.focus();
    return;
  }

  localStorage.setItem(placesKeyStorageKey, key);
  placesStatus.textContent = "Loading Google Places...";

  try {
    await loadGoogleMapsScript(key);
    await initialisePlacesAutocomplete();
    placeSearchWrap.hidden = false;
    runPlaceSearchButton.hidden = false;
    placeSearchInput.focus();
    placesStatus.textContent = "Places lookup ready. Type a place, tap Search places, then tap a suggestion.";
  } catch (error) {
    showPlacesError("Could not load Google Places", error);
  }
});

placeSearchInput.addEventListener("input", () => {
  window.clearTimeout(placeSearchDebounce);
  placeSearchDebounce = window.setTimeout(fetchPlaceSuggestions, 350);
});

placeSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchPlaceSuggestions();
  }
});

runPlaceSearchButton.addEventListener("click", fetchPlaceSuggestions);

placeResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-index]");
  if (!button || !placesLibrary?.lastSuggestions) {
    return;
  }

  const suggestion = placesLibrary.lastSuggestions[Number(button.dataset.index)];
  const prediction = suggestion?.placePrediction;
  if (!prediction) {
    return;
  }

  fillFromGooglePlacePrediction(prediction);
});

choosePhotoButton.addEventListener("click", () => photoInput.click());
takePhotoButton.addEventListener("click", () => cameraPhotoInput.click());

searchMapsButton.addEventListener("click", () => {
  const query = buildMapsQuery();
  if (!query) {
    fields.title.focus();
    flashSaved("Add a title first");
    return;
  }

  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, "_blank", "noopener");
});

photoInput.addEventListener("change", async () => {
  const file = photoInput.files?.[0];
  if (!file) {
    return;
  }

  currentPhotoData = await imageToDataUrl(file);
  updatePhotoPreview();
});

cameraPhotoInput.addEventListener("change", async () => {
  const file = cameraPhotoInput.files?.[0];
  if (!file) {
    return;
  }

  currentPhotoData = await imageToDataUrl(file);
  updatePhotoPreview();
});

removePhotoButton.addEventListener("click", () => {
  currentPhotoData = "";
  photoInput.value = "";
  cameraPhotoInput.value = "";
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
      capture.addressLine1,
      capture.addressLine2,
      capture.townCity,
      capture.region,
      capture.postcode,
      capture.country,
      capture.phone,
      capture.email,
      capture.website,
      capture.mapsUrl,
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
    addDetail(detailGrid, "Address", formatAddress(capture) || "Not set");
    addDetail(detailGrid, "Phone", capture.phone || "Not set");
    addDetail(detailGrid, "Target", titleCase(capture.targetSection));
    addDetail(detailGrid, "Client visible", capture.clientVisible ? "Yes" : "No");

    const linkRow = node.querySelector(".link-row");
    addLink(linkRow, "Website", normalizeUrl(capture.website));
    addLink(linkRow, "Email", capture.email ? `mailto:${capture.email}` : "");
    addLink(linkRow, "Google Maps", capture.mapsUrl);

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
  fields.addressLine1.value = capture.addressLine1 || "";
  fields.addressLine2.value = capture.addressLine2 || "";
  fields.townCity.value = capture.townCity || "";
  fields.region.value = capture.region || "";
  fields.postcode.value = capture.postcode || "";
  fields.country.value = capture.country || "Greece";
  fields.phone.value = capture.phone || "";
  fields.email.value = capture.email || "";
  fields.website.value = capture.website || "";
  fields.mapsUrl.value = capture.mapsUrl || "";
  fields.isLgsgCandidate.checked = capture.isLgsgCandidate;
  fields.clientVisible.checked = capture.clientVisible;
  fields.targetSection.value = capture.targetSection;
  fields.tasks.value = (capture.tasks || normalizeLegacyTasks(capture)).join("\n");
  photoInput.value = "";
  cameraPhotoInput.value = "";
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

function addLink(parent, label, href) {
  if (!href) {
    return;
  }

  const link = document.createElement("a");
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = label;
  parent.append(link);
}

function formatAddress(capture) {
  return [
    capture.addressLine1,
    capture.addressLine2,
    capture.townCity,
    capture.region,
    capture.postcode,
    capture.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function normalizeUrl(value) {
  const url = String(value || "").trim();
  if (!url) {
    return "";
  }

  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildMapsQuery() {
  return [
    fields.title.value,
    fields.location.value,
    fields.townCity.value,
    fields.region.value,
    fields.country.value || "Greece",
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");
}

function loadGoogleMapsScript(key) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    script.async = true;
    script.addEventListener("load", resolve);
    script.addEventListener("error", reject);
    document.head.append(script);
  });

  return googleMapsScriptPromise;
}

async function initialisePlacesAutocomplete() {
  if (placesLookupReady || !window.google?.maps?.importLibrary) {
    return;
  }

  const { AutocompleteSessionToken, AutocompleteSuggestion } =
    await google.maps.importLibrary("places");

  placesLibrary = {
    AutocompleteSessionToken,
    AutocompleteSuggestion,
    lastSuggestions: [],
  };
  placesSessionToken = new AutocompleteSessionToken();
  placesLookupReady = true;
}

async function fetchPlaceSuggestions() {
  if (!placesLookupReady || !placesLibrary) {
    return;
  }

  const input = placeSearchInput.value.trim();
  placeResults.replaceChildren();
  placeResults.hidden = true;

  if (input.length < 3) {
    placesStatus.textContent = "Type at least 3 characters to search places.";
    return;
  }

  const requestId = ++latestPlacesRequestId;
  placesStatus.textContent = `Searching for "${input}"...`;
  placesDebug.hidden = true;
  placesDebug.textContent = "";

  try {
    const { suggestions } =
      await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        language: "en-GB",
        sessionToken: placesSessionToken,
      });

    if (requestId !== latestPlacesRequestId) {
      return;
    }

    placesLibrary.lastSuggestions = suggestions || [];
    renderPlaceSuggestions(placesLibrary.lastSuggestions, input);
  } catch (error) {
    showPlacesError("Place search failed", error);
  }
}

function renderPlaceSuggestions(suggestions, input) {
  placeResults.replaceChildren();

  if (!suggestions.length) {
    placesStatus.textContent = `No place suggestions found for "${input}".`;
    placeResults.hidden = true;
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.dataset.index = String(index);
    button.textContent = prediction.text.toString();

    const item = document.createElement("li");
    item.append(button);
    placeResults.append(item);
  });

  placeResults.hidden = placeResults.children.length === 0;
  placesStatus.textContent = "Tap a suggestion to fill address/contact details.";
}

async function fillFromGooglePlacePrediction(placePrediction) {
  placesStatus.textContent = "Loading place details...";

  try {
    const place = placePrediction.toPlace();
    await place.fetchFields({
      fields: [
        "id",
        "displayName",
        "formattedAddress",
        "addressComponents",
        "internationalPhoneNumber",
        "websiteURI",
        "googleMapsURI",
        "location",
        "types",
      ],
    });

    fillFromGooglePlace(place);
    placesSessionToken = new placesLibrary.AutocompleteSessionToken();
    placesLibrary.lastSuggestions = [];
    placeResults.replaceChildren();
    placeResults.hidden = true;
    placeSearchInput.value = "";
  } catch (error) {
    showPlacesError("Could not load place details", error);
  }
}

function fillFromGooglePlace(place) {
  if (!place?.id) {
    placesStatus.textContent = "Choose a place from the Google suggestions list.";
    return;
  }

  const components = place.addressComponents || [];
  const streetNumber = addressPart(components, "street_number");
  const route = addressPart(components, "route");
  const line1 = [streetNumber, route].filter(Boolean).join(" ");
  const locality =
    addressPart(components, "locality") ||
    addressPart(components, "postal_town") ||
    addressPart(components, "administrative_area_level_3");
  const region =
    addressPart(components, "administrative_area_level_2") ||
    addressPart(components, "administrative_area_level_1");

  const placeName = readPlaceName(place);
  fields.title.value = placeName || fields.title.value;
  fields.location.value = placeName || fields.location.value;
  fields.addressLine1.value = line1 || place.formattedAddress || fields.addressLine1.value;
  fields.addressLine2.value =
    addressPart(components, "neighborhood") ||
    addressPart(components, "sublocality") ||
    fields.addressLine2.value;
  fields.townCity.value = locality || fields.townCity.value;
  fields.region.value = region || fields.region.value;
  fields.postcode.value = addressPart(components, "postal_code") || fields.postcode.value;
  fields.country.value = addressPart(components, "country") || fields.country.value || "Greece";
  fields.phone.value = place.internationalPhoneNumber || fields.phone.value;
  fields.website.value = place.websiteURI || fields.website.value;
  fields.mapsUrl.value = place.googleMapsURI || fields.mapsUrl.value;

  placesStatus.textContent = "Place details filled. Add your own notes, tags, tasks, and LGSG routing.";
  flashSaved("Place filled");
}

function addressPart(components, type) {
  const component = components.find((item) => item.types.includes(type));
  return component?.longText || component?.long_name || "";
}

function readPlaceName(place) {
  if (typeof place.displayName === "string") {
    return place.displayName;
  }

  return place.displayName?.text || "";
}

function readErrorMessage(error) {
  if (!error) {
    return "unknown error";
  }

  if (typeof error === "string") {
    return error;
  }

  return error.message || error.status || JSON.stringify(error);
}

function showPlacesError(prefix, error) {
  const message = readErrorMessage(error);
  placesStatus.textContent = `${prefix}: ${message}`;
  placesDebug.hidden = false;
  placesDebug.textContent = [
    `Page: ${window.location.href}`,
    `Origin: ${window.location.origin}`,
    `Referrer: ${document.referrer || "(none)"}`,
    `Error name: ${error?.name || "(none)"}`,
    `Error code: ${error?.code || error?.status || "(none)"}`,
    `Error message: ${message}`,
  ].join("\n");
}

async function refreshAppShell() {
  flashSaved("Checking");

  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.update()));
  }

  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith("luxe-capture"))
        .map((key) => caches.delete(key))
    );
  }

  window.setTimeout(() => {
    window.location.reload();
  }, 300);
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

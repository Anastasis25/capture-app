const appVersion = "2.0.0";
const storageKey = "capture-app-prototype-items";
const shoppingStorageKey = "capture-app-shopping-pilot-records";
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
const shoppingPlaceSearchInput = document.querySelector("#shoppingPlaceSearch");
const shoppingRunSearchButton = document.querySelector("#shoppingRunSearch");
const shoppingAddBlankButton = document.querySelector("#shoppingAddBlank");
const shoppingClearSearchButton = document.querySelector("#shoppingClearSearch");
const shoppingPlacesStatus = document.querySelector("#shoppingPlacesStatus");
const shoppingPlaceResults = document.querySelector("#shoppingPlaceResults");
const shoppingTableSearch = document.querySelector("#shoppingTableSearch");
const shoppingStatusFilter = document.querySelector("#shoppingStatusFilter");
const shoppingBulkStatus = document.querySelector("#shoppingBulkStatus");
const shoppingBulkVisibility = document.querySelector("#shoppingBulkVisibility");
const shoppingBulkCategory = document.querySelector("#shoppingBulkCategory");
const shoppingApplyBulkButton = document.querySelector("#shoppingApplyBulk");
const shoppingDeleteSelectedButton = document.querySelector("#shoppingDeleteSelected");
const shoppingSelectedCount = document.querySelector("#shoppingSelectedCount");
const shoppingSelectAll = document.querySelector("#shoppingSelectAll");
const shoppingPilotCount = document.querySelector("#shoppingPilotCount");
const shoppingTableBody = document.querySelector("#shoppingTableBody");
const shoppingEmptyState = document.querySelector("#shoppingEmptyState");
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
let shoppingRecords = loadShoppingRecords();
let editingId = null;
let currentPhotoData = "";
let placesLibrary = null;
let placesSessionToken = null;
let googleMapsScriptPromise = null;
let placesLookupReady = false;
let latestPlacesRequestId = 0;
let latestShoppingPlacesRequestId = 0;
let placeSearchDebounce = null;
let shoppingPlaceSuggestions = [];

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

shoppingRunSearchButton.addEventListener("click", fetchShoppingPlaceSuggestions);
shoppingAddBlankButton.addEventListener("click", addBlankShoppingDraft);

shoppingPlaceSearchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    fetchShoppingPlaceSuggestions();
  }
});

shoppingClearSearchButton.addEventListener("click", () => {
  shoppingPlaceSearchInput.value = "";
  shoppingPlaceSuggestions = [];
  shoppingPlaceResults.replaceChildren();
  shoppingPlaceResults.hidden = true;
  shoppingPlacesStatus.textContent =
    "Search cleared. Imported Shopping Pilot records remain in the table.";
});

shoppingPlaceResults.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-shopping-index]");
  if (!button) {
    return;
  }

  const suggestion = shoppingPlaceSuggestions[Number(button.dataset.shoppingIndex)];
  const prediction = suggestion?.placePrediction;
  if (!prediction) {
    return;
  }

  importShoppingPlacePrediction(prediction);
});

shoppingTableSearch.addEventListener("input", renderShoppingPilot);
shoppingStatusFilter.addEventListener("change", renderShoppingPilot);

shoppingSelectAll.addEventListener("change", () => {
  shoppingTableBody
    .querySelectorAll('input[data-shopping-select="row"]')
    .forEach((checkbox) => {
      checkbox.checked = shoppingSelectAll.checked;
    });
  updateShoppingSelectedCount();
});

shoppingTableBody.addEventListener("input", handleShoppingInlineEdit);
shoppingTableBody.addEventListener("change", (event) => {
  if (event.target.matches('input[data-shopping-select="row"]')) {
    updateShoppingSelectedCount();
    return;
  }

  handleShoppingInlineEdit(event);
});

shoppingTableBody.addEventListener("click", handleShoppingTableAction);
shoppingApplyBulkButton.addEventListener("click", applyShoppingBulkEdit);
shoppingDeleteSelectedButton.addEventListener("click", deleteSelectedShoppingRecords);

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
renderShoppingPilot();
registerServiceWorker();

function loadCaptures() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function loadShoppingRecords() {
  try {
    return JSON.parse(localStorage.getItem(shoppingStorageKey)) || [];
  } catch {
    return [];
  }
}

function persist() {
  localStorage.setItem(storageKey, JSON.stringify(captures));
}

function persistShoppingRecords() {
  localStorage.setItem(shoppingStorageKey, JSON.stringify(shoppingRecords));
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

function renderShoppingPilot() {
  const visible = getVisibleShoppingRecords();

  shoppingTableBody.replaceChildren();
  shoppingPilotCount.textContent = `${shoppingRecords.length} ${
    shoppingRecords.length === 1 ? "record" : "records"
  }`;
  shoppingEmptyState.hidden = visible.length > 0;

  visible.forEach((record) => {
    shoppingTableBody.append(createShoppingRow(record));
  });

  shoppingSelectAll.checked = false;
  shoppingSelectAll.indeterminate = false;
  updateShoppingSelectedCount();
}

function addBlankShoppingDraft() {
  const now = new Date().toISOString();
  const record = {
    id: crypto.randomUUID(),
    name: "New shopping place",
    category: "Other",
    subcategory: "",
    status: "draft",
    visibility: "private",
    destination: "",
    region: "",
    country: "",
    address: "",
    phone: "",
    website: "",
    googleMapsUrl: "",
    googlePlaceId: "",
    latitude: "",
    longitude: "",
    rating: "",
    userRatingCount: "",
    priceLevel: "",
    businessStatus: "",
    googleTypes: [],
    internalNotes: "",
    publicNotes: "",
    source: "manual",
    importedAt: "",
    createdAt: now,
    updatedAt: now,
  };

  shoppingRecords = [record, ...shoppingRecords];
  persistShoppingRecords();
  renderShoppingPilot();
  flashSaved("Shopping draft added");
}

function getVisibleShoppingRecords() {
  const query = shoppingTableSearch.value.trim().toLowerCase();
  const status = shoppingStatusFilter.value;

  return shoppingRecords.filter((record) => {
    const haystack = [
      record.name,
      record.category,
      record.subcategory,
      record.status,
      record.visibility,
      record.destination,
      record.region,
      record.country,
      record.address,
      record.phone,
      record.website,
      record.googleMapsUrl,
      record.internalNotes,
      record.publicNotes,
      record.googlePlaceId,
      ...(record.googleTypes || []),
    ]
      .join(" ")
      .toLowerCase();

    return (!query || haystack.includes(query)) && (status === "all" || record.status === status);
  });
}

function createShoppingRow(record) {
  const row = document.createElement("tr");
  row.dataset.id = record.id;
  row.className = `status-${escapeHtml(record.status || "draft")}`;

  row.innerHTML = `
    <td>
      <input type="checkbox" data-shopping-select="row" aria-label="Select ${escapeHtml(record.name)}">
    </td>
    <td>
      <input class="table-name-input" data-shopping-field="name" value="${escapeHtml(record.name)}">
    </td>
    <td>
      <select data-shopping-field="category">
        ${shoppingCategoryOptions(record.category)}
      </select>
      <input data-shopping-field="subcategory" value="${escapeHtml(record.subcategory)}" placeholder="Subcategory">
    </td>
    <td>
      <select data-shopping-field="status">
        ${shoppingStatusOptions(record.status)}
      </select>
    </td>
    <td>
      <select data-shopping-field="visibility">
        ${shoppingVisibilityOptions(record.visibility)}
      </select>
    </td>
    <td>
      <input data-shopping-field="destination" value="${escapeHtml(record.destination)}" placeholder="Town / area">
      <input data-shopping-field="region" value="${escapeHtml(record.region)}" placeholder="Region / island">
      <input data-shopping-field="country" value="${escapeHtml(record.country)}" placeholder="Country">
    </td>
    <td>
      <textarea class="table-address-input" data-shopping-field="address" placeholder="Address">${escapeHtml(record.address)}</textarea>
    </td>
    <td>
      <div class="table-contact-stack">
        <input data-shopping-field="phone" value="${escapeHtml(record.phone)}" placeholder="Phone">
        <input data-shopping-field="website" value="${escapeHtml(record.website)}" placeholder="Website">
      </div>
    </td>
    <td>
      <div class="table-google-stack">
        ${record.googleMapsUrl ? `<a href="${escapeHtml(record.googleMapsUrl)}" target="_blank" rel="noopener">Open map</a>` : ""}
        ${record.googlePlaceId ? `<code title="${escapeHtml(record.googlePlaceId)}">${escapeHtml(record.googlePlaceId)}</code>` : ""}
        <span>${escapeHtml(formatCoordinatePair(record))}</span>
        <span>${escapeHtml(formatRating(record))}</span>
      </div>
    </td>
    <td>
      <textarea class="table-notes-input" data-shopping-field="internalNotes" placeholder="Internal / review notes">${escapeHtml(record.internalNotes)}</textarea>
      <textarea class="table-notes-input" data-shopping-field="publicNotes" placeholder="Public note / listing copy">${escapeHtml(record.publicNotes)}</textarea>
    </td>
    <td>
      <div class="table-action-stack">
        <button type="button" class="secondary" data-shopping-action="review">Review</button>
        <button type="button" class="secondary" data-shopping-action="approve">Approve</button>
        <button type="button" data-shopping-action="publish">Publish</button>
        <button type="button" class="danger" data-shopping-action="delete">Delete</button>
      </div>
    </td>
  `;

  return row;
}

function shoppingCategoryOptions(selected) {
  return selectOptions(
    ["Boutique", "Jewellery", "Homeware", "Market", "Artisan", "Food shop", "Other"],
    selected || "Other"
  );
}

function shoppingStatusOptions(selected) {
  return selectOptions(["draft", "review", "approved", "published", "archived"], selected || "draft");
}

function shoppingVisibilityOptions(selected) {
  return selectOptions(["private", "staff", "client", "public"], selected || "private");
}

function selectOptions(options, selected) {
  return options
    .map((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? titleCase(option) : option.label;
      const isSelected = value === selected ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${isSelected}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function handleShoppingInlineEdit(event) {
  const control = event.target.closest("[data-shopping-field]");
  if (!control) {
    return;
  }

  const row = control.closest("tr[data-id]");
  const record = findShoppingRecord(row?.dataset.id);
  const field = control.dataset.shoppingField;

  if (!record || !field) {
    return;
  }

  record[field] = control.value;
  record.updatedAt = new Date().toISOString();

  if (field === "status") {
    row.className = `status-${record.status || "draft"}`;
  }

  persistShoppingRecords();

  if (event.type === "change") {
    flashSaved("Shopping saved");

    if (field === "status" && shoppingStatusFilter.value !== "all") {
      renderShoppingPilot();
    }
  }
}

function handleShoppingTableAction(event) {
  const button = event.target.closest("button[data-shopping-action]");
  if (!button) {
    return;
  }

  const row = button.closest("tr[data-id]");
  const record = findShoppingRecord(row?.dataset.id);

  if (!record) {
    return;
  }

  const now = new Date().toISOString();
  const action = button.dataset.shoppingAction;

  if (action === "delete") {
    if (!window.confirm(`Delete "${record.name}" from the Shopping Pilot?`)) {
      return;
    }

    shoppingRecords = shoppingRecords.filter((item) => item.id !== record.id);
    persistShoppingRecords();
    renderShoppingPilot();
    flashSaved("Shopping deleted");
    return;
  }

  if (action === "review") {
    record.status = "review";
    record.reviewedAt = now;
  }

  if (action === "approve") {
    record.status = "approved";
    record.approvedAt = now;
  }

  if (action === "publish") {
    record.status = "published";
    record.publishedAt = now;
    if (record.visibility === "private") {
      record.visibility = "public";
    }
  }

  record.updatedAt = now;
  persistShoppingRecords();
  renderShoppingPilot();
  flashSaved(`Shopping ${record.status}`);
}

function applyShoppingBulkEdit() {
  const ids = getSelectedShoppingIds();

  if (!ids.length) {
    flashSaved("Select rows first");
    return;
  }

  const status = shoppingBulkStatus.value;
  const visibility = shoppingBulkVisibility.value;
  const category = shoppingBulkCategory.value;

  if (!status && !visibility && !category) {
    flashSaved("Choose a bulk edit");
    return;
  }

  const now = new Date().toISOString();
  shoppingRecords = shoppingRecords.map((record) => {
    if (!ids.includes(record.id)) {
      return record;
    }

    return {
      ...record,
      status: status || record.status,
      visibility: visibility || record.visibility,
      category: category || record.category,
      updatedAt: now,
    };
  });

  shoppingBulkStatus.value = "";
  shoppingBulkVisibility.value = "";
  shoppingBulkCategory.value = "";
  persistShoppingRecords();
  renderShoppingPilot();
  flashSaved("Bulk edit applied");
}

function deleteSelectedShoppingRecords() {
  const ids = getSelectedShoppingIds();

  if (!ids.length) {
    flashSaved("Select rows first");
    return;
  }

  if (!window.confirm(`Delete ${ids.length} selected Shopping Pilot record(s)?`)) {
    return;
  }

  shoppingRecords = shoppingRecords.filter((record) => !ids.includes(record.id));
  persistShoppingRecords();
  renderShoppingPilot();
  flashSaved("Selected deleted");
}

function getSelectedShoppingIds() {
  return Array.from(shoppingTableBody.querySelectorAll('input[data-shopping-select="row"]:checked'))
    .map((checkbox) => checkbox.closest("tr[data-id]")?.dataset.id)
    .filter(Boolean);
}

function updateShoppingSelectedCount() {
  const selected = getSelectedShoppingIds();
  const visibleRows = shoppingTableBody.querySelectorAll("tr[data-id]").length;

  shoppingSelectedCount.textContent = `${selected.length} selected`;
  shoppingSelectAll.indeterminate = selected.length > 0 && selected.length < visibleRows;
  shoppingSelectAll.checked = visibleRows > 0 && selected.length === visibleRows;
}

function findShoppingRecord(id) {
  return shoppingRecords.find((record) => record.id === id);
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

async function fetchShoppingPlaceSuggestions() {
  const input = shoppingPlaceSearchInput.value.trim();

  shoppingPlaceResults.replaceChildren();
  shoppingPlaceResults.hidden = true;

  if (input.length < 3) {
    shoppingPlacesStatus.textContent = "Type at least 3 characters to search Google Places.";
    return;
  }

  if (!(await ensureGooglePlacesReady(shoppingPlacesStatus))) {
    return;
  }

  const requestId = ++latestShoppingPlacesRequestId;
  shoppingPlacesStatus.textContent = `Searching Google Places for "${input}"...`;

  try {
    const { suggestions } =
      await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        language: "en-GB",
        sessionToken: placesSessionToken,
      });

    if (requestId !== latestShoppingPlacesRequestId) {
      return;
    }

    shoppingPlaceSuggestions = suggestions || [];
    renderShoppingPlaceSuggestions(shoppingPlaceSuggestions, input);
  } catch (error) {
    shoppingPlacesStatus.textContent = `Shopping search failed: ${readErrorMessage(error)}`;
  }
}

function renderShoppingPlaceSuggestions(suggestions, input) {
  shoppingPlaceResults.replaceChildren();

  if (!suggestions.length) {
    shoppingPlacesStatus.textContent = `No Shopping place suggestions found for "${input}".`;
    shoppingPlaceResults.hidden = true;
    return;
  }

  suggestions.forEach((suggestion, index) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) {
      return;
    }

    const item = document.createElement("li");
    const detail = document.createElement("div");
    const title = document.createElement("span");
    const subtitle = document.createElement("span");
    const button = document.createElement("button");

    title.className = "place-result-title";
    title.textContent = prediction.text.toString();
    subtitle.className = "place-result-detail";
    subtitle.textContent = prediction.placeId || "Google Places result";
    button.type = "button";
    button.dataset.shoppingIndex = String(index);
    button.textContent = "Import";

    detail.append(title, subtitle);
    item.append(detail, button);
    shoppingPlaceResults.append(item);
  });

  shoppingPlaceResults.hidden = shoppingPlaceResults.children.length === 0;
  shoppingPlacesStatus.textContent = "Import a result to create a Shopping Pilot draft.";
}

async function importShoppingPlacePrediction(placePrediction) {
  shoppingPlacesStatus.textContent = "Importing Google place into Shopping Pilot...";

  try {
    const place = await fetchGooglePlaceDetails(placePrediction, [
      "rating",
      "userRatingCount",
      "priceLevel",
      "businessStatus",
    ]);
    const record = buildShoppingRecordFromGooglePlace(place);
    const existing = shoppingRecords.find((item) => item.googlePlaceId === record.googlePlaceId);

    if (existing) {
      Object.assign(existing, {
        ...record,
        id: existing.id,
        status: existing.status || "draft",
        visibility: existing.visibility || "private",
        internalNotes: existing.internalNotes || record.internalNotes,
        publicNotes: existing.publicNotes || record.publicNotes,
        createdAt: existing.createdAt || record.createdAt,
        updatedAt: new Date().toISOString(),
      });
      shoppingPlacesStatus.textContent = `"${existing.name}" already existed, so its Google data was refreshed.`;
    } else {
      shoppingRecords = [record, ...shoppingRecords];
      shoppingPlacesStatus.textContent = `"${record.name}" imported as a draft.`;
    }

    placesSessionToken = new placesLibrary.AutocompleteSessionToken();
    shoppingPlaceSuggestions = [];
    shoppingPlaceResults.replaceChildren();
    shoppingPlaceResults.hidden = true;
    shoppingPlaceSearchInput.value = "";
    persistShoppingRecords();
    renderShoppingPilot();
    flashSaved("Shopping imported");
  } catch (error) {
    shoppingPlacesStatus.textContent = `Import failed: ${readErrorMessage(error)}`;
  }
}

function buildShoppingRecordFromGooglePlace(place) {
  const components = place.addressComponents || [];
  const now = new Date().toISOString();
  const location = place.location || {};
  const destination =
    addressPart(components, "locality") ||
    addressPart(components, "postal_town") ||
    addressPart(components, "administrative_area_level_3") ||
    addressPart(components, "sublocality") ||
    "";
  const region =
    addressPart(components, "administrative_area_level_2") ||
    addressPart(components, "administrative_area_level_1") ||
    "";

  return {
    id: crypto.randomUUID(),
    name: readPlaceName(place) || "Untitled shopping place",
    category: inferShoppingCategory(place.types || []),
    subcategory: formatGoogleTypes(place.types || []),
    status: "draft",
    visibility: "private",
    destination,
    region,
    country: addressPart(components, "country") || "",
    address: place.formattedAddress || "",
    phone: stringifyPlaceValue(place.internationalPhoneNumber),
    website: stringifyPlaceValue(place.websiteURI),
    googleMapsUrl: stringifyPlaceValue(place.googleMapsURI),
    googlePlaceId: place.id || "",
    latitude: readCoordinate(location, "lat"),
    longitude: readCoordinate(location, "lng"),
    rating: stringifyPlaceValue(place.rating),
    userRatingCount: stringifyPlaceValue(place.userRatingCount),
    priceLevel: stringifyPlaceValue(place.priceLevel),
    businessStatus: stringifyPlaceValue(place.businessStatus),
    googleTypes: place.types || [],
    internalNotes: "",
    publicNotes: "",
    source: "google_places",
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureGooglePlacesReady(statusElement = placesStatus) {
  const key = placesApiKeyInput.value.trim() || localStorage.getItem(placesKeyStorageKey) || "";

  if (!key) {
    statusElement.textContent = "Paste and save the restricted Google Places key first.";
    placesApiKeyInput.focus();
    return false;
  }

  localStorage.setItem(placesKeyStorageKey, key);

  try {
    await loadGoogleMapsScript(key);
    await initialisePlacesAutocomplete();
    return true;
  } catch (error) {
    statusElement.textContent = `Could not load Google Places: ${readErrorMessage(error)}`;
    return false;
  }
}

async function fetchGooglePlaceDetails(placePrediction, extraFields = []) {
  const place = placePrediction.toPlace();
  const fieldsToFetch = [
    "id",
    "displayName",
    "formattedAddress",
    "addressComponents",
    "internationalPhoneNumber",
    "websiteURI",
    "googleMapsURI",
    "location",
    "types",
    ...extraFields,
  ];

  await place.fetchFields({
    fields: Array.from(new Set(fieldsToFetch)),
  });

  return place;
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
    const place = await fetchGooglePlaceDetails(placePrediction);
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

function inferShoppingCategory(types) {
  const typeSet = new Set(types || []);

  if (typeSet.has("jewelry_store")) {
    return "Jewellery";
  }

  if (typeSet.has("home_goods_store") || typeSet.has("furniture_store")) {
    return "Homeware";
  }

  if (typeSet.has("clothing_store") || typeSet.has("shoe_store")) {
    return "Boutique";
  }

  if (typeSet.has("market") || typeSet.has("supermarket") || typeSet.has("grocery_store")) {
    return "Market";
  }

  if (typeSet.has("bakery") || typeSet.has("food_store") || typeSet.has("liquor_store")) {
    return "Food shop";
  }

  if (typeSet.has("store") || typeSet.has("point_of_interest")) {
    return "Other";
  }

  return "Other";
}

function formatGoogleTypes(types) {
  return (types || [])
    .slice(0, 3)
    .map((type) => titleCase(type))
    .join(", ");
}

function stringifyPlaceValue(value) {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value.href) {
    return value.href;
  }

  return String(value);
}

function readCoordinate(location, key) {
  const value = location?.[key];

  if (typeof value === "function") {
    return String(Number(value.call(location)).toFixed(6));
  }

  if (typeof value === "number") {
    return String(Number(value).toFixed(6));
  }

  return "";
}

function formatCoordinatePair(record) {
  if (!record.latitude || !record.longitude) {
    return "No coordinates";
  }

  return `${record.latitude}, ${record.longitude}`;
}

function formatRating(record) {
  if (!record.rating) {
    return "No rating";
  }

  const count = record.userRatingCount ? ` (${record.userRatingCount})` : "";
  return `Rating ${record.rating}${count}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

const apiKeyInput = document.querySelector("#apiKey");
const testQueryInput = document.querySelector("#testQuery");
const runButton = document.querySelector("#runDiagnostics");
const clearButton = document.querySelector("#clearDiagnostics");
const results = document.querySelector("#results");

let mapsScriptPromise = null;

runButton.addEventListener("click", runDiagnostics);
clearButton.addEventListener("click", () => results.replaceChildren());

async function runDiagnostics() {
  const key = apiKeyInput.value.trim();
  const query = testQueryInput.value.trim() || "hawker hall";
  results.replaceChildren();

  addStep("Page/referrer", "pass", {
    href: window.location.href,
    origin: window.location.origin,
    referrer: document.referrer || "(none)",
    expectedRestrictions: [
      "https://anastasis25.github.io/capture-app/",
      "https://anastasis25.github.io/capture-app/*",
    ],
  });

  if (!key) {
    addStep("API key present", "fail", "Paste the API key first.");
    return;
  }

  addStep("API key present", "pass", `Key length: ${key.length}. Key value is not displayed.`);

  try {
    await loadMapsJavaScript(key);
    addStep("Maps JavaScript API", "pass", "Google Maps JavaScript loaded and window.google.maps exists.");
  } catch (error) {
    addStep("Maps JavaScript API", "fail", formatError(error));
    return;
  }

  let placesLibrary;
  try {
    placesLibrary = await google.maps.importLibrary("places");
    addStep("Places JS library", "pass", {
      hasAutocompleteSuggestion: Boolean(placesLibrary.AutocompleteSuggestion),
      hasAutocompleteSessionToken: Boolean(placesLibrary.AutocompleteSessionToken),
      hasPlaceAutocompleteElement: Boolean(placesLibrary.PlaceAutocompleteElement),
    });
  } catch (error) {
    addStep("Places JS library", "fail", formatError(error));
    return;
  }

  try {
    const sessionToken = new placesLibrary.AutocompleteSessionToken();
    const response = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
      input: query,
      language: "en",
      sessionToken,
    });

    const suggestions = response.suggestions || [];
    addStep("JS autocomplete suggestions", suggestions.length ? "pass" : "warn", {
      query,
      count: suggestions.length,
      firstSuggestions: suggestions.slice(0, 5).map((suggestion) =>
        suggestion.placePrediction?.text?.toString?.() || "(no text)"
      ),
    });
  } catch (error) {
    addStep("JS autocomplete suggestions", "fail", formatError(error));
  }

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text",
      },
      body: JSON.stringify({
        input: query,
        languageCode: "en",
      }),
    });

    const payload = await readResponsePayload(response);
    addStep("Places API (New) REST autocomplete", response.ok ? "pass" : "fail", {
      status: response.status,
      ok: response.ok,
      payload,
    });
  } catch (error) {
    addStep("Places API (New) REST autocomplete", "fail", {
      note: "If this says Failed to fetch, the browser may be blocking direct REST calls. The JS autocomplete test above is the main browser-side test.",
      error: formatError(error),
    });
  }
}

function loadMapsJavaScript(key) {
  if (window.google?.maps?.importLibrary) {
    return Promise.resolve();
  }

  if (mapsScriptPromise) {
    return mapsScriptPromise;
  }

  mapsScriptPromise = new Promise((resolve, reject) => {
    const previousAuthFailure = window.gm_authFailure;
    const timeout = window.setTimeout(() => {
      reject(new Error("Timed out while loading Google Maps JavaScript."));
    }, 12000);

    window.gm_authFailure = () => {
      window.clearTimeout(timeout);
      if (previousAuthFailure) {
        previousAuthFailure();
      }
      reject(new Error("gm_authFailure: Google rejected the key, referrer, billing, or API restrictions."));
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async`;
    script.async = true;
    script.addEventListener("load", () => {
      window.clearTimeout(timeout);
      window.setTimeout(() => {
        if (window.google?.maps?.importLibrary) {
          resolve();
        } else {
          reject(new Error("Google script loaded, but google.maps.importLibrary is missing."));
        }
      }, 250);
    });
    script.addEventListener("error", () => {
      window.clearTimeout(timeout);
      reject(new Error("Could not load Google Maps JavaScript script."));
    });
    document.head.append(script);
  });

  return mapsScriptPromise;
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) {
    return "(empty response)";
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function addStep(title, status, detail) {
  const step = document.createElement("article");
  step.className = `diagnostic-step ${status}`;

  const heading = document.createElement("strong");
  heading.textContent = `${status.toUpperCase()}: ${title}`;
  step.append(heading);

  const pre = document.createElement("pre");
  pre.textContent = typeof detail === "string" ? detail : JSON.stringify(detail, null, 2);
  step.append(pre);

  results.append(step);
}

function formatError(error) {
  if (!error) {
    return "Unknown error";
  }

  return {
    name: error.name || "(none)",
    code: error.code || error.status || "(none)",
    message: error.message || String(error),
  };
}

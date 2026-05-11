const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function buildApiUrl(path) {
  if (!path.startsWith("/")) {
    throw new Error("API path must start with '/'");
  }

  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export async function fetchJson(path, options = {}, token) {
  const url = buildApiUrl(path);
  console.log("fetchJson:", options.method || "GET", url, options.body || null);

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  console.log("fetchJson response:", response.status, url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json();
}

export function getProjects(token) {
  return fetchJson(
    "/api/projects",
    {
      method: "GET",
    },
    token,
  );
}

export function createProject(token, payload) {
  return fetchJson(
    "/api/projects",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token,
  );
}

export function syncUser(token) {
  return fetchJson("/api/auth/sync-user", { method: "POST" }, token);
}

export function deleteProject(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    },
    token,
  );
}
export function updateProjectDescription(token, projectId, description) {
  return fetchJson(
    `/api/projects/${projectId}/description`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description }),
    },
    token,
  );
}
export function getProjectById(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}`,
    { method: "GET" },
    token
  );
}

export function saveProjectMeasurements(token, projectId, payload) {
  return fetchJson(
    `/api/projects/${projectId}/measurements`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  );
}

// Gets all inventory items for a specific project
// Called when the inventory page first loads so we can display the list
export function getInventoryItems(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}/inventory`, // projectId in the URL so backend knows which project to fetch from
    { method: "GET" },                  // GET because we're only reading data, not changing anything
    token                               // token so the backend knows who is making the request
  );
}

// Creates a brand new inventory item and links it to a project
// Called when the user fills out the Add Item modal and hits "Add Item"
export function createInventoryItem(token, projectId, payload) {
  return fetchJson(
    `/api/projects/${projectId}/inventory`, // same URL as GET but POST method — creates instead of reads
    {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // tells the backend we're sending JSON data
      body: JSON.stringify(payload),                   // payload = { name, quantity, cost, status, category }
    },
    token
  );
}

// Updates an existing inventory item (name, quantity, cost, status, category)
// Called when the user edits an item and hits "Save Changes"
export function updateInventoryItem(token, itemId, payload) {
  return fetchJson(
    `/api/inventory/${itemId}`,              // itemId in the URL so backend knows exactly which item to update
    {
      method: "PATCH",                                 // PATCH = partial update, we only send what changed
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),                   // only the fields being updated go in here
    },
    token
  );
}

// Deletes an inventory item permanently
// Called when the user clicks the trash icon on an item
export function deleteInventoryItem(token, itemId) {
  return fetchJson(
    `/api/inventory/${itemId}`,              // itemId in the URL so backend knows which item to delete
    {
      method: "DELETE",                              // DELETE method removes the record from the database
      headers: { "Content-Type": "application/json" },
    },
    token
  );
}
// ===================== CHECKLIST API =====================

export function getChecklist(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}/checklist`,
    { method: "GET" },
    token
  );
}

export function createChecklistItem(token, projectId, payload) {
  return fetchJson(
    `/api/projects/${projectId}/checklist`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  );
}

export function updateChecklistItem(token, checklistId, payload) {
  return fetchJson(
    `/api/checklist/${checklistId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  );
}

export function deleteChecklistItem(token, checklistId) {
  return fetchJson(
    `/api/checklist/${checklistId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    },
    token
  );
}

export function getInventorySuggestions(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}/checklist/suggestions`,
    { method: "GET" },
    token
  );
}

export function createChecklistFromInventory(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}/checklist/from-inventory`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
    token
  );
}

//TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY
export function getProjectChecklistSummary(token, projectId) {
  return fetchJson(
    `/api/projects/${projectId}/checklist/summary`,
    { method: "GET" },
    token
  );
}
//TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY TESTING ONLY

// ===================== CHECKLIST DASHBOARD API =====================

export function getChecklistSummary(token) {
  return fetchJson(
    `/api/checklists/summary`,
    { method: "GET" },
    token
  );
}

export function getAllChecklists(token) {
  return fetchJson(
    `/api/checklists/all`,
    { method: "GET" },
    token
  );
}

export function getTodayChecklists(token) {
  return fetchJson(
    `/api/checklists/today`,
    { method: "GET" },
    token
  );
}

export function getScheduledChecklists(token) {
  return fetchJson(
    `/api/checklists/scheduled`,
    { method: "GET" },
    token
  );
}

export function getCompletedChecklists(token) {
  return fetchJson(
    `/api/checklists/completed`,
    { method: "GET" },
    token
  );
}

export function getOverdueChecklists(token) {
  return fetchJson(
    `/api/checklists/overdue`,
    { method: "GET" },
    token
  );
}

export function getProfile(token) {
  return fetchJson("/api/profile", { method: "GET" }, token);
}

export function updateProfile(token, payload) {
  return fetchJson(
    "/api/profile",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    token
  );
}
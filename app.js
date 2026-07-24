// ===== GLOBAL STATE =====
let currentUserEmail = "";
let filterMyItems = false;
let editingItemId = null;

// Admin list
const adminUsers = [
  "scouter.greg@outlook.com"
];

// ===== INIT =====
window.addEventListener("DOMContentLoaded", async () => {
  await initUser();
  setAdminVisibility();
  await loadInventory();
});

// ===== USER / AUTH =====
async function initUser() {
  const res = await fetch("/.auth/me");
  const data = await res.json();
  const user = data.clientPrincipal;

  const userDisplay = document.getElementById("userDisplay");

  if (!user) {
    currentUserEmail = "";
    if (userDisplay) userDisplay.textContent = "Not logged in";
    return;
  }

  currentUserEmail = user.userDetails || "";
  const isAdmin = adminUsers.includes(currentUserEmail.toLowerCase());

  if (userDisplay) {
    userDisplay.textContent =
      `Logged in as ${currentUserEmail} - ${isAdmin ? "Admin" : "User"}`;
  }
}



function setAdminVisibility() {
  const isAdmin = currentUserEmail && adminUsers.includes(currentUserEmail.toLowerCase());

  // Admin-only header buttons
  const adminButtons = document.getElementById("adminButtons");
  if (adminButtons) {
    adminButtons.style.display = isAdmin ? "block" : "none";
  }
}

// ===== INVENTORY LOADING WITH CATEGORIES =====
async function loadInventory() {async function loadInventory() {
  const token = localStorage.getItem("authToken");

  // Track which categories were open before reload
  const openCategories = new Set(
    Array.from(document.querySelectorAll(".category-items"))
      .filter(sec => !sec.classList.contains("collapsed"))
      .map(sec => sec.id.replace("cat-", ""))
  );

  const container = document.getElementById("categoryContainer");
  if (!container) return;

  container.innerHTML = "";

  const searchInput = document.getElementById("searchBox");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const showMine = filterMyItems;
  const userEmail = currentUserEmail || "";
  const isAdmin = userEmail && adminUsers.includes(userEmail.toLowerCase());

  let items = [];
  try {
    const response = await fetch("/api/inventory", {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to load items");

    const data = await response.json();
    items = data.inventory || [];
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading inventory.</p>";
    return;
  }

  // (rest of your function stays EXACTLY the same)
  // ...
}

  // Track which categories were open before reload
  const openCategories = new Set(
    Array.from(document.querySelectorAll(".category-items"))
      .filter(sec => !sec.classList.contains("collapsed"))
      .map(sec => sec.id.replace("cat-", ""))
  );

  const container = document.getElementById("categoryContainer");
  if (!container) return;

  container.innerHTML = "";

  const searchInput = document.getElementById("searchBox");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const showMine = filterMyItems;
  const userEmail = currentUserEmail || "";
  const isAdmin = userEmail && adminUsers.includes(userEmail.toLowerCase());

  let items = [];
  try {
    const response = await fetch("/api/inventory");
    if (!response.ok) throw new Error("Failed to load items");

    const data = await response.json();
    items = data.inventory || [];
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p>Error loading inventory.</p>";
    return;
  }

  // Count items checked out by current user for badge
  const myCount = items.filter(
    i => i.checkedOutBy && userEmail && i.checkedOutBy.toLowerCase() === userEmail.toLowerCase()
  ).length;

  const filterBtn = document.getElementById("filterToggle");
  if (filterBtn) {
    filterBtn.textContent = filterMyItems
      ? `Showing My Checked Out Items (${myCount})`
      : `My Checked Out Items (${myCount})`;
  }

  // Group items by category
  const categories = {};
  items.forEach(item => {
    const cat = item.category || "Uncategorized";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  // Sort categories alphabetically
  const categoryNames = Object.keys(categories).sort((a, b) => a.localeCompare(b));

  categoryNames.forEach(categoryName => {
    const itemsInCategory = categories[categoryName];

    // CATEGORY HEADER
    const header = document.createElement("div");
    header.className = "category-header";
    header.dataset.category = categoryName;

    const count = itemsInCategory.length;
    header.innerHTML = `
      <span><span class="arrow">▶</span> ${categoryName} (${count})</span>
    `;

    // CATEGORY ITEMS CONTAINER
    const section = document.createElement("div");
    section.className = "category-items collapsed";
    section.id = `cat-${categoryName}`;

    // Render cards inside category
    itemsInCategory.forEach(item => {
      const name = item.name || "";
      const category = item.category || "";
      const status = item.status || "available";
      const checkedBy = item.checkedOutBy || "";
      const checkedDate = item.checkedOutAt
        ? item.checkedOutAt.split("T")[0]
        : "";

      const matchesSearch =
        !searchTerm ||
        name.toLowerCase().includes(searchTerm) ||
        category.toLowerCase().includes(searchTerm);

      const matchesMine =
        !showMine ||
        (checkedBy && userEmail && checkedBy.toLowerCase() === userEmail.toLowerCase());

      if (!matchesSearch || !matchesMine) return;

      const card = document.createElement("div");
      card.className = "inventory-card";

      const isCheckedOut = status === "checked_out";

      // Highlight items checked out by current user
      if (checkedBy && userEmail && checkedBy.toLowerCase() === userEmail.toLowerCase()) {
        card.classList.add("my-item");
      }

      card.innerHTML = `
        <div class="row">
          <img 
            src="${item.imageUrl || 'default-placeholder.png'}" 
            class="item-photo" 
            alt="Item photo"
          >
        </div>
        <div class="row">
          <span class="label">Name:</span>
          <span class="value">${name}</span>
        </div>
        <div class="row">
          <span class="label">Category:</span>
          <span class="value">${category}</span>
        </div>
        <div class="row">
          <span class="label">Status:</span>
          <span class="value">${status}</span>
        </div>

        ${checkedBy ? `
          <div class="row">
            <span class="label">Checked Out By:</span>
            <span class="value">${checkedBy}</span>
          </div>
          <div class="row">
            <span class="label">Checked Out On:</span>
            <span class="value">${checkedDate}</span>
          </div>
        ` : ""}

        <div class="row action-row">
          ${!isCheckedOut
            ? `<button class="button" onclick="checkOutItem('${item.id}')">Check Out</button>`
            : `<button class="button" onclick="checkInItem('${item.id}')">Check In</button>`
          }
          <button class="button edit-btn admin-only" onclick="editItem('${item.id}')" style="${isAdmin ? "" : "display:none;"}">Edit</button>
          <button class="button delete-btn admin-only" onclick="deleteItem('${item.id}')" style="${isAdmin ? "" : "display:none;"}">Delete</button>
          <button class="button" onclick="viewHistory('${item.id}')">History</button>
        </div>
      `;

      section.appendChild(card);
    });

    // Only add category if it has visible items after filters
    if (section.children.length > 0) {
      container.appendChild(header);
      container.appendChild(section);

      // CLICK HANDLER FOR COLLAPSE/EXPAND
      header.addEventListener("click", () => {
        const arrow = header.querySelector(".arrow");
        const isCollapsed = section.classList.contains("collapsed");

        if (isCollapsed) {
          section.classList.remove("collapsed");
          arrow.textContent = "▼";
        } else {
          section.classList.add("collapsed");
          arrow.textContent = "▶";
        }
      });
      // ⭐ RESTORE OPEN/CLOSED STATE AFTER RELOAD ⭐
      if (openCategories.has(categoryName)) {
        section.classList.remove("collapsed");
        header.querySelector(".arrow").textContent = "▼";  
      }
    }  
  });

  if (!container.hasChildNodes()) {
    container.innerHTML = "<p>No items match your filters.</p>";
  }
}

// ===== FILTER: MY ITEMS =====
function toggleMyItems() {
  filterMyItems = !filterMyItems;
  loadInventory();
}

// ===== MODAL HELPERS =====
function openAddModal() {
  editingItemId = null;
  const modal = document.getElementById("itemModal");
  const title = document.getElementById("modalTitle");
  const nameInput = document.getElementById("itemName");
  const catSelect = document.getElementById("itemCategory");
  const statusSelect = document.getElementById("itemStatus");

  if (title) title.textContent = "Add Item";
  if (nameInput) nameInput.value = "";
  if (catSelect) catSelect.value = "Cooking";
  if (statusSelect) statusSelect.value = "available";

  if (modal) modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("itemModal");
  if (modal) modal.style.display = "none";
  editingItemId = null;
}

function openEditModal(item) {
  editingItemId = item.id;
  const modal = document.getElementById("itemModal");
  const title = document.getElementById("modalTitle");
  const nameInput = document.getElementById("itemName");
  const catSelect = document.getElementById("itemCategory");
  const statusSelect = document.getElementById("itemStatus");

  if (title) title.textContent = "Edit Item";
  if (nameInput) nameInput.value = item.name || "";
  if (catSelect) catSelect.value = item.category || "Cooking";
  if (statusSelect) statusSelect.value = item.status || "available";

  if (modal) modal.style.display = "block";
}

// ===== SAVE ITEM (ADD / EDIT) =====
async function saveItem() {
  const token = localStorage.getItem("authToken");

  const nameInput = document.getElementById("itemName");
  const catSelect = document.getElementById("itemCategory");
  const statusSelect = document.getElementById("itemStatus");

  const name = nameInput ? nameInput.value.trim() : "";
  const category = catSelect ? catSelect.value : "Cooking";
  const status = statusSelect ? statusSelect.value : "available";

  if (!name) {
    alert("Name is required.");
    return;
  }

  // NEW: handle image upload
  const fileInput = document.getElementById("itemImageInput");
  let imageUrl = null;

  // If editing, keep existing image unless replaced
  if (editingItemId && window.currentEditingItem) {
    imageUrl = window.currentEditingItem.imageUrl || null;
  }

  // If a new file was selected, upload it
  if (fileInput && fileInput.files.length > 0) {

    // Generate a safe blob name
    const safeId = (editingItemId || name)
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_");

    imageUrl = await uploadItemImage(safeId, fileInput.files[0]);
  }

  // Include imageUrl in payload
  const payload = { name, category, status, imageUrl };

  try {
    let url = "/api/addItem";
    if (editingItemId) {
      url = "/api/editItem";
      payload.id = editingItemId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error("Failed to save item");

    closeModal();
    await loadInventory();
  } catch (err) {
    console.error(err);
    alert("Error saving item.");
  }
}


// ===== EDIT ITEM (FETCH + OPEN MODAL) =====
async function editItem(id) {
  const token = localStorage.getItem("authToken");

  try {
    const response = await fetch("/api/inventory", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) throw new Error("Failed to load items");

    const data = await response.json();
    const items = data.inventory || [];
    const item = items.find(i => i.id === id);

    if (!item) {
      alert("Item not found.");
      return;
    }

    // ⭐ Store the item being edited so saveItem() can access imageUrl
    window.currentEditingItem = item;

    // Open modal with item details
    openEditModal(item);

  } catch (err) {
    console.error(err);
    alert("Error loading item for edit.");
  }
}


// ===== DELETE ITEM =====
async function deleteItem(id) {
  const token = localStorage.getItem("authToken");

  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const response = await fetch("/api/deleteItem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) throw new Error("Failed to delete item.");

    await loadInventory();
  } catch (err) {
    console.error(err);
    alert("Error deleting item.");
  }
}


// ===== CHECK OUT / CHECK IN =====
async function checkOutItem(id) {
  const token = localStorage.getItem("authToken");

  if (!currentUserEmail) {
    alert("You must be logged in to check out items.");
    return;
  }

  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) throw new Error("Failed to check out item.");

    await loadInventory();
  } catch (err) {
    console.error(err);
    alert("Error checking out item.");
  }
}


async function checkInItem(id) {
  const token = localStorage.getItem("authToken");

  try {
    const response = await fetch("/api/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ id })
    });

    if (!response.ok) throw new Error("Failed to check in item");

    await loadInventory();
  } catch (err) {
    console.error(err);
    alert("Error checking in item.");
  }
}


// ===== HISTORY =====
async function viewHistory(id) {
  const token = localStorage.getItem("authToken");

  const modal = document.getElementById("historyModal");
  const list = document.getElementById("historyList");
  if (!modal || !list) return;

  list.innerHTML = "Loading...";

  try {
    const response = await fetch("/api/audit?id=" + encodeURIComponent(id), {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to load history");

    const history = await response.json();

    if (!history || history.length === 0) {
      list.innerHTML = "<p>No history for this item.</p>";
    } else {
      list.innerHTML = "";
      history.forEach(entry => {
        const row = document.createElement("div");
        row.className = "history-row";
        row.textContent = `${entry.timestamp} - ${entry.action} - ${entry.user || ""}`;
        list.appendChild(row);
      });
    }

    modal.style.display = "block";
  } catch (err) {
    console.error(err);
    list.innerHTML = "<p>Error loading history.</p>";
  }
}


function closeHistory() {
  const modal = document.getElementById("historyModal");
  if (modal) modal.style.display = "none";
}
// ===== Upload Image =====
async function uploadItemImage(itemId, file) {
  const base64 = await fileToBase64(file);

  const res = await fetch(`/api/uploadImage?itemId=${itemId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64 })
  });

  if (!res.ok) {
    const text = await res.text();   // 👈 get server error
    console.error("Upload failed:", text);
    alert("Image upload failed: " + text);
    throw new Error("Image upload failed: " + text);
  }

  const data = await res.json();
  return data.imageUrl;
}


function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("authToken");
  window.location.href = "/login.html";
}

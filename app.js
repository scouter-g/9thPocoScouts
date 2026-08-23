console.log("APP.JS LOADED");

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

  const ok = await checkAuthorization();
  if (!ok) return;

  document.getElementById("appContainer").style.display = "block";

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

async function checkAuthorization() {
  const res = await fetch("/api/authorize", { credentials: "include" });
  const auth = await res.json();

  console.log("AUTH CHECK:", auth);

  if (!auth.allowed) {
    document.body.innerHTML = `
      <h2 style="text-align:center;margin-top:50px;">
        You are not authorized to use this system.  If you believe this to be an error, email scouter.greg@outlook.com
      </h2>
    `;
    return false;
  }

  window.currentUserEmail = auth.email;
  window.currentUserIsAdmin = auth.isAdmin;

  return true;
}

function setAdminVisibility() {
  const isAdmin = currentUserEmail && adminUsers.includes(currentUserEmail.toLowerCase());
  const adminButtons = document.getElementById("adminButtons");
  if (adminButtons) adminButtons.style.display = isAdmin ? "block" : "none";
}

// ===== INVENTORY LOADING =====
async function loadInventory() {
  const ok = await checkAuthorization();
  if (!ok) return;

  const token = localStorage.getItem("authToken");

  const container = document.getElementById("categoryContainer");
  if (!container) return;
  container.innerHTML = "";

  const searchInput = document.getElementById("searchBox");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  const showMine = filterMyItems;
  const userEmail = currentUserEmail || "";
  const isAdmin = adminUsers.includes(userEmail.toLowerCase());

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

  const myCount = items.filter(
    i => i.checkedOutBy && userEmail && i.checkedOutBy.toLowerCase() === userEmail.toLowerCase()
  ).length;

  const filterBtn = document.getElementById("filterToggle");
  if (filterBtn) {
    filterBtn.textContent = filterMyItems
      ? `Showing My Checked Out Items (${myCount})`
      : `My Checked Out Items (${myCount})`;
  }

  const categories = {};
  items.forEach(item => {
    const cat = item.category || "Uncategorized";
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(item);
  });

  const categoryNames = Object.keys(categories).sort((a, b) => a.localeCompare(b));

  categoryNames.forEach(categoryName => {
    const itemsInCategory = categories[categoryName];

    const header = document.createElement("div");
    header.className = "category-header";
    header.dataset.category = categoryName;
    header.innerHTML = `<span><span class="arrow">▶</span> ${categoryName} (${itemsInCategory.length})</span>`;

    const section = document.createElement("div");
    section.className = "category-items collapsed";
    section.id = `cat-${categoryName}`;

    itemsInCategory.forEach(item => {
      const name = item.name || "";
      const category = item.category || "";
      const status = item.status || "available";
      const checkedBy = item.checkedOutBy || "";
      const checkedDate = item.checkedOutAt ? item.checkedOutAt.split("T")[0] : "";

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

      if (checkedBy && userEmail && checkedBy.toLowerCase() === userEmail.toLowerCase()) {
        card.classList.add("my-item");
      }

      card.innerHTML = `
        <div class="row">
          <img src="${item.imageUrl || 'default-placeholder.png'}" class="item-photo" alt="Item photo">
        </div>
        <div class="row"><span class="label">Name:</span><span class="value">${name}</span></div>
        <div class="row"><span class="label">Category:</span><span class="value">${category}</span></div>
        <div class="row"><span class="label">Status:</span><span class="value">${status}</span></div>

        ${checkedBy ? `
          <div class="row"><span class="label">Checked Out By:</span><span class="value">${checkedBy}</span></div>
          <div class="row"><span class="label">Checked Out On:</span><span class="value">${checkedDate}</span></div>
        ` : ""}

        <div class="row action-row">
          ${!isCheckedOut
            ? `<button class="button" onclick="checkOutItem('${item.id}')">Check Out</button>`
            : `<button class="button" onclick="checkInItem('${item.id}')">Check In</button>`
          }
          ${isAdmin ? `
            <button class="button edit-btn" onclick="openEditModal('${item.id}', '${encodeURIComponent(name)}', '${encodeURIComponent(category)}', '${status}')">Edit / Add Photo</button>
            <button class="button delete-btn" onclick="deleteItem('${item.id}')">Delete</button>
          ` : ""}
          <button class="button" onclick="viewHistory('${item.id}')">History</button>
        </div>
      `;

      section.appendChild(card);
    });

    if (section.children.length > 0) {
      container.appendChild(header);
      container.appendChild(section);

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
    }
  });

  if (!container.hasChildNodes()) {
    container.innerHTML = "<p>No items match your filters.</p>";
  }
}

// ===== MODALS =====
function openEditModal(id, encodedName, encodedCategory, status) {
  editingItemId = id;

  const modalTitle = document.getElementById("modalTitle");
  const nameInput = document.getElementById("itemName");
  const categorySelect = document.getElementById("itemCategory");
  const statusSelect = document.getElementById("itemStatus");
  const fileInput = document.getElementById("itemImageInput");

  modalTitle.textContent = "Edit Item Details";
  nameInput.value = decodeURIComponent(encodedName);
  categorySelect.value = decodeURIComponent(encodedCategory);
  statusSelect.value = status;
  fileInput.value = "";

  document.getElementById("itemModal").style.display = "block";
}

function openAddModal() {
  editingItemId = null;

  document.getElementById("modalTitle").textContent = "Add New Item";
  document.getElementById("itemName").value = "";
  document.getElementById("itemCategory").value = "Cooking";
  document.getElementById("itemStatus").value = "available";
  document.getElementById("itemImageInput").value = "";

  document.getElementById("itemModal").style.display = "block";
}

function closeModal() {
  document.getElementById("itemModal").style.display = "none";
  editingItemId = null;
}

// ===== FILTER =====
function toggleMyItems() {
  filterMyItems = !filterMyItems;
  loadInventory();
}

// ===== SAVE ITEM =====
async function saveItem() {
  const fileInput = document.getElementById("itemImageInput");
  const nameInput = document.getElementById("itemName");
  const categoryInput = document.getElementById("itemCategory");
  const statusInput = document.getElementById("itemStatus");

  const nameValue = nameInput.value.trim();
  if (!nameValue) {
    alert("Please enter an item name.");
    return;
  }

  const finalId = editingItemId || `item-${Date.now()}`;
  let imageUrl = "";

  if (fileInput.files.length > 0) {
    try {
      imageUrl = await uploadItemImage(finalId, fileInput);
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to upload image.");
      return;
    }
  }

  const itemPayload = {
    id: finalId,
    name: nameValue,
    category: categoryInput.value,
    status: statusInput.value,
    imageUrl: imageUrl || undefined
  };

  try {
    const response = await fetch("/api/addItem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(itemPayload)
    });

    if (!response.ok) throw new Error(await response.text());

    closeModal();
    await loadInventory();
    alert("Item saved successfully!");
  } catch (err) {
    console.error("Save item failed:", err);
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

    if (!response.ok) throw new Error("Failed to check in item.");

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

  list.innerHTML = "Loading...";

  try {
    const response = await fetch(`/api/audit?id=${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) throw new Error("Failed to load history");

    const history = await response.json();

    list.innerHTML = "";

    if (!history || history.length === 0) {
      list.innerHTML = "<p>No history for this item.</p>";
    } else {
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
  document.getElementById("historyModal").style.display = "none";
}

// ===== Upload Image =====
async function uploadItemImage(itemId, fileInput) {
  const file = fileInput.files[0];

  const response = await fetch(`/api/uploadImage?itemId=${encodeURIComponent(itemId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "X-File-Name": encodeURIComponent(file.name)
    },
    body: file
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = await response.json();
  return data.imageUrl;
}

// ===== LOGOUT =====
function logout() {
  localStorage.removeItem("authToken");
  window.location.href = "/login.html";
}
// ===== USER ADMIN PANEL =====
function openUserAdmin() {
  const modal = document.getElementById("userAdminModal");
  modal.style.display = "block";
  loadAllowedUsers();
}

function closeUserAdmin() {
  const modal = document.getElementById("userAdminModal");
  modal.style.display = "none";
}

async function loadAllowedUsers() {
  const list = document.getElementById("allowedUsersList");
  list.innerHTML = "Loading...";

  try {
    const res = await fetch("/api/listAllowedUsers");
    const users = await res.json();

    list.innerHTML = "";

    users.forEach(u => {
      const row = document.createElement("div");
      row.className = "user-row";
      row.innerHTML = `
        ${u.email}
        <button class="button delete-btn" onclick="removeAllowedUser('${u.email}')">Delete</button>
      `;
      list.appendChild(row);
    });

  } catch (err) {
    console.error(err);
    list.innerHTML = "<p>Error loading users.</p>";
  }
}

async function addAllowedUser() {
  const email = document.getElementById("newUserEmail").value.trim().toLowerCase();
  if (!email) return alert("Enter an email.");

  try {
    const res = await fetch("/api/addAllowedUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) throw new Error(await res.text());

    document.getElementById("newUserEmail").value = "";
    loadAllowedUsers();

  } catch (err) {
    console.error(err);
    alert("Failed to add user.");
  }
}

async function removeAllowedUser(email) {
  if (!confirm(`Remove ${email}?`)) return;

  try {
    const res = await fetch("/api/removeAllowedUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    if (!res.ok) throw new Error(await res.text());

    loadAllowedUsers();

  } catch (err) {
    console.error(err);
    alert("Failed to remove user.");
  }
}

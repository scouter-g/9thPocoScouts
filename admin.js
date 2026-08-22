async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

async function loadApprovedUsers() {
  const tbody = document.querySelector("#approvedUsersTable tbody");
  tbody.innerHTML = "<tr><td colspan='4'>Loading...</td></tr>";

  try {
    const users = await fetchJson("/api/listAllowedUsers");

    tbody.innerHTML = "";

    users.forEach(user => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${user.email}</td>
        <td>${user.displayName || ""}</td>
        <td>${user.role || "user"}</td>
        <td>
          <button class="remove-user-btn" data-email="${user.email}">
            Remove
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });

    document.querySelectorAll(".remove-user-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const email = btn.getAttribute("data-email");
        if (!confirm(`Remove ${email} from approved users?`)) return;

        try {
          await fetchJson("/api/removeAllowedUser", {
            method: "POST",
            body: JSON.stringify({ userEmail: email })
          });
          await loadApprovedUsers();
        } catch (err) {
          alert("Remove failed: " + err.message);
        }
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan='4'>Error: ${err.message}</td></tr>`;
  }
}

async function addUser() {
  const email = document.getElementById("newUserEmail").value.trim();
  const displayName = document.getElementById("newUserDisplayName").value.trim();
  const role = document.getElementById("newUserRole").value;

  if (!email) {
    alert("Email is required");
    return;
  }

  try {
    await fetchJson("/api/addAllowedUser", {
      method: "POST",
      body: JSON.stringify({ userEmail: email, displayName, role })
    });

    document.getElementById("newUserEmail").value = "";
    document.getElementById("newUserDisplayName").value = "";
    document.getElementById("newUserRole").value = "user";

    await loadApprovedUsers();
  } catch (err) {
    alert("Add/update failed: " + err.message);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addUserBtn").addEventListener("click", addUser);
  loadApprovedUsers();
});

const { TableClient } = require("@azure/data-tables");

// ⭐ Admin list (same as frontend)
const adminUsers = [
  "scouter.greg@outlook.com"
];

module.exports = async function (context, req) {
  try {
    // ⭐ Extract SWA identity
    const principal = req.headers["x-ms-client-principal"];
    let user = null;

    if (principal) {
      user = JSON.parse(Buffer.from(principal, "base64").toString("ascii"));
    }

    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = (user.userDetails || "").toLowerCase();

    // ⭐ Admin check (email-based)
    if (!adminUsers.includes(email)) {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    // ⭐ FIX 1: Extract imageUrl alongside the other form fields from req.body
    const { id, name, category, status, imageUrl } = req.body || {};
    if (!id || !name) {
      context.res = { status: 400, body: "Missing id or name" };
      return;
    }

    // ⭐ Equipment table
    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Equipment"
    );

    // ⭐ FIX 2: Construct the database entry to include the new imageUrl property
    const entity = {
      partitionKey: "equipment",
      rowKey: id,
      name,
      category: category || null,
      status: status || "available",
      imageUrl: imageUrl || null // If no image was uploaded, store null so it falls back to placeholder
    };

    // ⭐ FIX 3: Change createEntity to upsertEntity so your form can handle BOTH 
    // adding brand new equipment AND updating existing items without crashing.
    await tableClient.upsertEntity(entity, "Replace");

    context.res = { status: 201, body: "Item saved successfully" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Save item failed: " + err.message
    };
  }
};

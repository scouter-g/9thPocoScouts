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

    // ⭐ NEW: AllowedUsers table check
    const allowedClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AllowedUsers"
    );

    let allowedEntity = null;
    try {
      allowedEntity = await allowedClient.getEntity("user", email);
    } catch (err) {
      if (err.statusCode === 404) {
        context.res = { status: 403, body: "Not authorized (not in AllowedUsers)" };
        return;
      }
      throw err; // unexpected error
    }

    // ⭐ Admin check (email-based)
    if (!adminUsers.includes(email)) {
      context.res = { status: 403, body: "Not authorized (admin only)" };
      return;
    }

    // ⭐ Extract fields
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

    const entity = {
      partitionKey: "equipment",
      rowKey: id,
      name,
      category: category || null,
      status: status || "available",
      imageUrl: imageUrl || null
    };

    await tableClient.upsertEntity(entity, "Replace");

    context.res = { status: 201, body: "Item saved successfully" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Save item failed: " + err.message
    };
  }
};

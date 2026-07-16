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

    // ⭐ Extract fields
    const { id, name, category, status } = req.body || {};
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
      checkedOutBy: null,
      checkedOutAt: null
    };

    await tableClient.createEntity(entity);

    context.res = { status: 201, body: "Item added" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Add item failed: " + err.message
    };
  }
};

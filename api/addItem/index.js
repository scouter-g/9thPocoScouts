const { TableClient } = require("@azure/data-tables");
const { verifyToken } = require("../_auth");   // ⭐ NEW: custom JWT auth

module.exports = async function (context, req) {
  try {
    // ⭐ AUTHENTICATION (replaces SWA built-in auth)
    const user = verifyToken(req);
    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    // ⭐ ADMIN CHECK (replaces hardcoded adminUsers array)
    if (user.role !== "admin") {
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
    context.res = { status: 500, body: "Add item failed: " + err.message };
  }
};

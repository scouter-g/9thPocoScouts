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

    // ⭐ Read ID from query or body
    const id = req.query.id || (req.body && req.body.id);
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
      return;
    }

    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Equipment"
    );

    await tableClient.deleteEntity("equipment", id);

    context.res = { status: 200, body: "Item deleted" };

  } catch (err) {
    context.res = { status: 500, body: "Delete item failed: " + err.message };
  }
};

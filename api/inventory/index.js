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

    // ⭐ Equipment table
    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Equipment"
    );

    const items = [];
    for await (const entity of tableClient.listEntities()) {
      items.push(entity);
    }

    const inventory = items.map(item => ({
      id: item.rowKey,                     // unique ID
      name: item.name || null,
      category: item.category || null,
      status: item.status || "available",
      checkedOutBy: item.checkedOutBy || null,
      checkedOutAt: item.checkedOutAt || null
    }));

    context.res = { status: 200, body: { inventory } };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Inventory load failed: " + err.message
    };
  }
};

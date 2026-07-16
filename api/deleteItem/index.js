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

    // ⭐ Read ID from query or body
    const id = req.query.id || (req.body && req.body.id);
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
      return;
    }

    // ⭐ Equipment table
    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Equipment"
    );

    await tableClient.deleteEntity("equipment", id);

    context.res = { status: 200, body: "Item deleted" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Delete item failed: " + err.message
    };
  }
};

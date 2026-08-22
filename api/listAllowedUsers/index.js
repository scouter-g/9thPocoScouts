const { TableClient } = require("@azure/data-tables");
const { getUserFromPrincipal, isAdmin } = require("../_auth"); // adjust path if needed

module.exports = async function (context, req) {
  try {
    const identity = await getUserFromPrincipal(req);
    if (!identity) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const { email } = identity;

    if (!isAdmin(email)) {
      context.res = { status: 403, body: "Admins only" };
      return;
    }

    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AllowedUsers"
    );

    const users = [];
    for await (const entity of tableClient.listEntities()) {
      users.push({
        email: entity.rowKey,
        displayName: entity.displayName || "",
        role: entity.role || "user"
      });
    }

    context.res = {
      status: 200,
      body: users
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: "List allowed users failed: " + err.message
    };
  }
};

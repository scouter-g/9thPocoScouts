const { TableClient } = require("@azure/data-tables");
const { getUserFromPrincipal, isAdmin } = require("../_auth");

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

    const { userEmail, displayName, role } = req.body || {};
    if (!userEmail) {
      context.res = { status: 400, body: "Missing userEmail" };
      return;
    }

    const normalizedEmail = userEmail.toLowerCase();

    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AllowedUsers"
    );

    const entity = {
      partitionKey: "user",
      rowKey: normalizedEmail,
      displayName: displayName || "",
      role: role || "user"
    };

    await tableClient.upsertEntity(entity, "Replace");

    context.res = {
      status: 200,
      body: "User added/updated successfully"
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Add allowed user failed: " + err.message
    };
  }
};

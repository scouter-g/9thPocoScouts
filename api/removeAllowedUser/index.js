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

    const { userEmail } = req.body || {};
    if (!userEmail) {
      context.res = { status: 400, body: "Missing userEmail" };
      return;
    }

    const normalizedEmail = userEmail.toLowerCase();

    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AllowedUsers"
    );

    await tableClient.deleteEntity("user", normalizedEmail);

    context.res = {
      status: 200,
      body: "User removed successfully"
    };

  } catch (err) {
    if (err.statusCode === 404) {
      context.res = { status: 200, body: "User did not exist" };
      return;
    }

    context.res = {
      status: 500,
      body: "Remove allowed user failed: " + err.message
    };
  }
};

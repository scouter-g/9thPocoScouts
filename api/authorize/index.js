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
      context.res = { status: 401, body: { allowed: false, error: "Unauthorized" } };
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
        // ⭐ User is authenticated but NOT approved
        context.res = {
          status: 200,
          body: {
            email,
            allowed: false,
            isAdmin: false
          }
        };
        return;
      }
      throw err;
    }

    // ⭐ Admin check
    const isAdmin = adminUsers.includes(email);

    // ⭐ Return authorization info
    context.res = {
      status: 200,
      body: {
        email,
        allowed: true,
        isAdmin
      }
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { error: "Authorize failed: " + err.message }
    };
  }
};

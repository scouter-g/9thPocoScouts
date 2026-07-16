const { TableClient } = require("@azure/data-tables");
const { getUserEmail } = require("../auth");

const adminUsers = ["scouter.greg@outlook.com"];

module.exports = async function (context, req) {
  try {
    const email = getUserEmail(req);
    if (!email || !adminUsers.includes(email)) {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    const client = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Users"
    );

    try { await client.createTable(); } catch {}

    const users = [];
    for await (const entity of client.listEntities()) {
      users.push({
        email: entity.rowKey,
        displayName: entity.displayName,
        role: entity.role,
        createdAt: entity.createdAt
      });
    }

    context.res = { status: 200, body: users };

  } catch (err) {
    context.res = { status: 500, body: "Failed: " + err.message };
  }
};

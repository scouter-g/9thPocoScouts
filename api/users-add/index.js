const { TableClient } = require("@azure/data-tables");
const { getUserEmail } = require("../auth");

const adminUsers = ["scouter.greg@outlook.com"];

module.exports = async function (context, req) {
  try {
    const admin = getUserEmail(req);
    if (!admin || !adminUsers.includes(admin)) {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    const { email, displayName, role } = req.body;

    const client = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Users"
    );

    try { await client.createTable(); } catch {}

    await client.upsertEntity({
      partitionKey: "user",
      rowKey: email,
      displayName,
      role,
      createdAt: new Date().toISOString()
    });

    context.res = { status: 200, body: "User added" };

  } catch (err) {
    context.res = { status: 500, body: "Failed: " + err.message };
  }
};

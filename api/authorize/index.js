const { TableClient } = require("@azure/data-tables");
const { verifyToken } = require("../_auth");

const connectionString = process.env.STORAGE_CONNECTION_STRING;
const tableName = "Users";

module.exports = async function (context, req) {
  try {
    const user = verifyToken(req);
    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = user.email.toLowerCase();
    const client = TableClient.fromConnectionString(connectionString, tableName);

    let entity;
    try {
      entity = await client.getEntity("user", email);
    } catch {
      context.res = { status: 200, body: { allowed: false } };
      return;
    }

    context.res = {
      status: 200,
      body: {
        allowed: true,
        role: entity.role || "user",
        displayName: entity.displayName || email
      }
    };

  } catch (err) {
    context.res = { status: 500, body: "Authorization failed: " + err.message };
  }
};

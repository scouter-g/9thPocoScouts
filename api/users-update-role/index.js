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

    const { email, role } = req.body;

    const client = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Users"
    );

    const entity = await client.getEntity("user", email);
    entity.role = role;

    await client.updateEntity(entity, "Replace");

    context.res = { status: 200, body: "Role updated" };

  } catch (err) {
    context.res = { status: 500, body: "Failed: " + err.message };
  }
};

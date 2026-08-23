const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const client = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AllowedUsers"
    );

    const users = [];
    for await (const entity of client.listEntities()) {
      users.push({
        email: entity.rowKey,
        displayName: entity.displayName || ""
      });
    }

    context.res = {
      status: 200,
      body: users
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
};


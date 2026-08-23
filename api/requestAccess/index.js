const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    const { email } = req.body;

    if (!email) {
      context.res = { status: 400, body: "Missing email" };
      return;
    }

    const client = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AccessRequests"
    );

    await client.createEntity({
      partitionKey: "request",
      rowKey: email.toLowerCase(),
      timestamp: new Date().toISOString()
    });

    context.res = {
      status: 200,
      body: { success: true }
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { error: err.message }
    };
  }
};

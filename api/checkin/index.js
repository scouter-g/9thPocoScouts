const { TableClient } = require("@azure/data-tables");
const { verifyToken } = require("../_auth");   // ⭐ NEW: custom JWT auth

module.exports = async function (context, req) {
  try {
    // ⭐ AUTHENTICATION (replaces SWA built-in auth)
    const user = verifyToken(req);
    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = user.email;  // from JWT token

    // ⭐ Read ID from query or body
    const id = req.query.id || (req.body && req.body.id);
    if (!id) {
      context.res = { status: 400, body: "Missing item id" };
      return;
    }

    // ⭐ Equipment table
    const tableClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "Equipment"
    );

    let entity;
    try {
      entity = await tableClient.getEntity("equipment", id);
    } catch {
      context.res = { status: 404, body: "Item not found" };
      return;
    }

    if (entity.status !== "checked_out") {
      context.res = {
        status: 409,
        body: `Item is not checked out (status=${entity.status})`
      };
      return;
    }

    // ⭐ Update item
    entity.status = "available";
    entity.checkedOutBy = "";
    entity.checkedOutAt = "";

    await tableClient.updateEntity(entity, "Replace");

    // ⭐ AUDIT LOG
    const auditClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AuditLog"
    );

    await auditClient.createEntity({
      partitionKey: id,
      rowKey: new Date().toISOString(),
      action: "check_in",
      user: email,
      timestamp: new Date().toISOString()
    });

    context.res = { status: 200, body: "Checked in" };

  } catch (err) {
    context.res = { status: 500, body: "Checkin failed: " + err.message };
  }
};

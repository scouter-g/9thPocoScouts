console.log("CHECKOUT API VERSION: USING DISPLAY NAME");
const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    // ⭐ Extract SWA identity
    const principal = req.headers["x-ms-client-principal"];
    let user = null;

    if (principal) {
      user = JSON.parse(Buffer.from(principal, "base64").toString("ascii"));
    }

    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = (user.userDetails || "").toLowerCase();

    // ⭐ Extract display name from claims (supports both formats)
    const claims = user.claims || [];

    const nameClaim =
      claims.find(c => c.typ === "name") ||
      claims.find(c => c.type === "name");

    const displayName =
      nameClaim?.val ||
      nameClaim?.value ||
      email;

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

    if (entity.status !== "available") {
      context.res = {
        status: 409,
        body: `Item is not available (status=${entity.status})`
      };
      return;
    }

    // ⭐ Update item
    entity.status = "checked_out";
    entity.checkedOutBy = displayName;   // <-- display name stored
    entity.checkedOutAt = new Date().toISOString();

    await tableClient.updateEntity(entity, "Replace");

    // ⭐ AUDIT LOG
    const auditClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AuditLog"
    );

    await auditClient.createEntity({
      partitionKey: id,
      rowKey: new Date().toISOString(),
      action: "check_out",
      user: displayName,                 // <-- display name stored
      timestamp: new Date().toISOString()
    });

    context.res = { status: 200, body: "Checked out" };

  } catch (err) {
    context.res = { status: 500, body: "Checkout failed: " + err.message };
  }
};

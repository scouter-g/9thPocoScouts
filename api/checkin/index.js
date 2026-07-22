const { TableClient } = require("@azure/data-tables");

module.exports = async function (context, req) {
  try {
    // ⭐ Extract SWA identity
    const principalHeader = req.headers["x-ms-client-principal"];
    if (!principalHeader) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const principal = JSON.parse(Buffer.from(principalHeader, "base64").toString("ascii"));
    const email = (principal.userDetails || "").toLowerCase();
    const roles = principal.userRoles || [];
    const isAdmin = roles.includes("admin");

    // ⭐ Read ID
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

    const checkedOutBy = (entity.checkedOutBy || "").toLowerCase();

    // ⭐ Authorization logic
    if (!isAdmin && checkedOutBy !== email) {
      context.res = {
        status: 403,
        body: "You can only check in items you checked out."
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
      onBehalfOf: checkedOutBy !== email ? checkedOutBy : "",
      timestamp: new Date().toISOString()
    });

    context.res = { status: 200, body: "Checked in" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Checkin failed: " + err.message
    };
  }
};

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
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = (user.userDetails || "").toLowerCase();

    // ⭐ Admin check (email-based)
    if (!adminUsers.includes(email)) {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    // ⭐ Pull ALL fields from body
    const { id, name, category, status, checkedOutBy, checkedOutAt } = req.body || {};
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
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

    // ⭐ Save old values for audit log
    const oldStatus = entity.status;
    const oldCheckedOutBy = entity.checkedOutBy;

    // ⭐ Update fields
    if (name !== undefined) entity.name = name;
    if (category !== undefined) entity.category = category;

    // Normalize status
    if (status !== undefined) {
      entity.status = status.replace("-", "_");
    }

    // Update check-out fields
    if (checkedOutBy !== undefined) entity.checkedOutBy = checkedOutBy;
    if (checkedOutAt !== undefined) entity.checkedOutAt = checkedOutAt;

    await tableClient.updateEntity(entity, "Replace");

    // ⭐ AUDIT LOG
    const auditClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AuditLog"
    );

    await auditClient.createEntity({
      partitionKey: id,
      rowKey: new Date().toISOString(),
      action: "admin_edit",
      user: email,
      timestamp: new Date().toISOString(),
      oldStatus,
      newStatus: entity.status,
      oldCheckedOutBy,
      newCheckedOutBy: entity.checkedOutBy
    });

    context.res = { status: 200, body: "Item updated" };

  } catch (err) {
    context.res = {
      status: 500,
      body: "Edit item failed: " + err.message
    };
  }
};

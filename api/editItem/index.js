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

    // ⭐ ADMIN CHECK (replaces hardcoded adminUsers array)
    if (user.role !== "admin") {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    // ⭐ Pull ALL fields from body
    const { id, name, category, status, checkedOutBy, checkedOutAt } = req.body || {};
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
      return;
    }

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
      user: user.email,   // ⭐ from JWT
      timestamp: new Date().toISOString(),
      oldStatus,
      newStatus: entity.status,
      oldCheckedOutBy,
      newCheckedOutBy: entity.checkedOutBy
    });

    context.res = { status: 200, body: "Item updated" };

  } catch (err) {
    context.res = { status: 500, body: "Edit item failed: " + err.message };
  }
};

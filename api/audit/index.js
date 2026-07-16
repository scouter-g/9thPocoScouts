const { TableClient } = require("@azure/data-tables");
const { verifyToken } = require("../_auth");   // ⭐ NEW: custom JWT auth

module.exports = async function (context, req) {
  try {
    // ⭐ AUTHENTICATION
    const user = verifyToken(req);
    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    // ⭐ ADMIN CHECK
    if (user.role !== "admin") {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    // ⭐ Require item ID
    const id = req.query.id;
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
      return;
    }

    // ⭐ AuditLog table
    const auditClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AuditLog"
    );

    // Ensure table exists (safe even if it already exists)
    try { await auditClient.createTable(); } catch {}

    const logs = [];
    const entities = auditClient.listEntities({
      queryOptions: { filter: `PartitionKey eq '${id}'` }
    });

    for await (const entity of entities) {
      logs.push(entity);
    }

    // Sort newest first
    logs.sort((a, b) => (a.rowKey < b.rowKey ? 1 : -1));

    context.res = {
      status: 200,
      body: logs
    };

  } catch (err) {
    context.res = { status: 500, body: "Audit failed: " + err.message };
  }
};

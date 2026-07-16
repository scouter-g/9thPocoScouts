const { TableClient } = require("@azure/data-tables");
const { getUserEmail } = require("../auth");

const adminUsers = [
  "scouter.greg@outlook.com"
];

module.exports = async function (context, req) {
  try {
    const email = getUserEmail(req);
    if (!email || !adminUsers.includes(email)) {
      context.res = { status: 403, body: "Not authorized" };
      return;
    }

    const auditClient = TableClient.fromConnectionString(
      process.env.STORAGE_CONNECTION_STRING,
      "AuditLog"
    );

    // Ensure table exists
    try { await auditClient.createTable(); } catch {}

    const logs = [];
    const entities = auditClient.listEntities();

    for await (const entity of entities) {
      logs.push(entity);
    }

    // Sort newest first
    logs.sort((a, b) => (a.rowKey < b.rowKey ? 1 : -1));

    // Build CSV
    let csv = "itemId,action,user,timestamp,oldStatus,newStatus,oldCheckedOutBy,newCheckedOutBy\n";

    for (const log of logs) {
      csv += [
        log.partitionKey ?? "",
        log.action ?? "",
        log.user ?? "",
        log.timestamp ?? "",
        log.oldStatus ?? "",
        log.newStatus ?? "",
        log.oldCheckedOutBy ?? "",
        log.newCheckedOutBy ?? ""
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",") + "\n";
    }

    context.res = {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=audit-log.csv"
      },
      body: csv
    };

  } catch (err) {
    context.res = { status: 500, body: "Audit export failed: " + err.message };
  }
};

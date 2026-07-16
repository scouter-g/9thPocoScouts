const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { verifyToken } = require("../_auth");

const connectionString = process.env.STORAGE_CONNECTION_STRING;
const tableName = "Users";
const JWT_SECRET = process.env.JWT_SECRET;

module.exports = async function (context, req) {
  try {
    // Authenticate user via JWT
    const user = verifyToken(req);
    if (!user) {
      context.res = { status: 401, body: "Unauthorized" };
      return;
    }

    const email = user.email;
    const { newPassword } = req.body || {};

    if (!newPassword || newPassword.length < 6) {
      context.res = { status: 400, body: "Password must be at least 6 characters" };
      return;
    }

    const client = TableClient.fromConnectionString(connectionString, tableName);

    // Load user record
    let entity;
    try {
      entity = await client.getEntity("user", email.toLowerCase());
    } catch {
      context.res = { status: 404, body: "User not found" };
      return;
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user record
    entity.passwordHash = passwordHash;
    entity.mustReset = false;

    await client.updateEntity(entity, "Replace");

    // Issue a NEW JWT after password reset
    const newToken = jwt.sign(
      {
        email: entity.email,
        role: entity.role,
        displayName: entity.displayName,
        mustReset: false
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    context.res = {
      status: 200,
      body: {
        message: "Password updated successfully",
        token: newToken
      }
    };

  } catch (err) {
    context.res = { status: 500, body: "Password reset failed: " + err.message };
  }
};

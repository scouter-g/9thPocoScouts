const { TableClient } = require("@azure/data-tables");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const tableName = "Users";

module.exports = async function (context, req) {
  context.log("LOGIN FUNCTION HIT", req.body);

  const connectionString = process.env.STORAGE_CONNECTION_STRING;
  const JWT_SECRET = process.env.JWT_SECRET;

  const { email, password } = req.body || {};

  if (!email || !password) {
    context.res = { status: 400, body: { error: "Email and password required" } };
    return;
  }

  const client = TableClient.fromConnectionString(connectionString, tableName);

  let user;
  try {
    user = await client.getEntity("user", email.toLowerCase());
    context.log("DEBUG USER ENTITY:", user);   // ⭐ moved here
  } catch (err) {
    context.log("ERROR LOADING USER:", err.message);
    context.res = { status: 401, body: { error: "Invalid credentials" } };
    return;
  }

  const noPasswordSet =
    !user.passwordHash ||
    user.passwordHash.trim() === "" ||
    user.passwordHash === '""';

  if (user.mustReset === true && noPasswordSet) {
    const token = jwt.sign(
      {
        email: user.rowKey,
        role: user.role,
        displayName: user.displayName || user.rowKey,
        mustReset: true
      },
      JWT_SECRET,
      { expiresIn: "24h" }
    );

    context.res = {
      status: 200,
      body: {
        token,
        mustReset: true
      }
    };
    return;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    context.res = { status: 401, body: { error: "Invalid credentials" } };
    return;
  }

  const token = jwt.sign(
    {
      email: user.rowKey,
      role: user.role,
      displayName: user.displayName || user.rowKey,
      mustReset: user.mustReset === true
    },
    JWT_SECRET,
    { expiresIn: "24h" }
  );

  context.res = {
    status: 200,
    body: {
      token,
      mustReset: user.mustReset === true
    }
  };
};

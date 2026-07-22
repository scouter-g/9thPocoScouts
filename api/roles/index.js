module.exports = async function (context, req) {
  const principalHeader = req.headers["x-ms-client-principal"];

  if (!principalHeader) {
    context.res = { status: 401, body: { roles: [] } };
    return;
  }

  const principal = JSON.parse(Buffer.from(principalHeader, "base64").toString("ascii"));
  const email = (principal.userDetails || "").toLowerCase();

  let roles = ["user"]; // default role

  // ⭐ Assign admin role
  if (email === "scouter.greg@outlook.com") {
    roles.push("admin");
  }

  context.res = {
    status: 200,
    body: { roles }
  };
};

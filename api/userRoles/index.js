module.exports = async function (context, req) {
  const principalHeader = req.headers["x-ms-client-principal"];

  if (!principalHeader) {
    context.res = { status: 200, body: { roles: ["user"] } };
    return;
  }

  // SWA-safe base64 decode (no Buffer)
  const decoded = atob(principalHeader);
  const principal = JSON.parse(decoded);

  const email = (principal.userDetails || "").toLowerCase();

  let roles = ["user"];

  if (email === "scouter.greg@outlook.com") {
    roles.push("admin");
  }

  context.res = {
    status: 200,
    body: { roles }
  };
};

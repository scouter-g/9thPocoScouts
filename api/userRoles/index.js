module.exports = async function (context, req) {
  const principalHeader = req.headers["x-ms-client-principal"];

  if (!principalHeader) {
    context.res = { status: 200, body: { roles: ["user"] } };
    return;
  }

  // SWA-safe base64 decode
  const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
  const principal = JSON.parse(decoded);

  const email = (principal.userDetails || "").toLowerCase();

  let roles = ["user"];

  // ⭐ Add all admin emails here
  const adminEmails = [
    "scouter.greg@outlook.com",
    "phil.9thpoco@gmail.com",
    "agv9522@gmail.com"
  ];

  if (adminEmails.includes(email)) {
    roles.push("admin");
  }

  context.res = {
    status: 200,
    body: { roles }
  };
};


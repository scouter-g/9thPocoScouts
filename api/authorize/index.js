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
      context.res = { status: 401, body: { error: "Unauthorized" } };
      return;
    }

    const email = (user.userDetails || "").toLowerCase();
    const isAdmin = adminUsers.includes(email);

    // ⭐ Return authorization info
    context.res = {
      status: 200,
      body: {
        email,
        isAdmin
      }
    };

  } catch (err) {
    context.res = {
      status: 500,
      body: { error: "Authorize failed: " + err.message }
    };
  }
};

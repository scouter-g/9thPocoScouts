module.exports = async function (context, req) {
  const user = context.bindingData?.clientPrincipal;

  if (!user) {
    context.res = { status: 401 };
    return;
  }

  const inventory = [
    { id: "tent-001", name: "4‑Person Tent", status: "available" },
    { id: "stove-001", name: "Camp Stove", status: "checked_out" }
  ];

  context.res = {
    status: 200,
    body: inventory
  };
};
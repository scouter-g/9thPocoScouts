const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    // Identity check
    const principalHeader = req.headers["x-ms-client-principal"];
    if (!principalHeader) {
      context.res = { status: 401, body: "Not authenticated" };
      return;
    }

    const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const email = (principal.userDetails || "").toLowerCase();

    // Hard-coded admin check
    if (email !== "scouter.greg@outlook.com") {
      context.res = { status: 403, body: "Forbidden: Only Greg can upload images." };
      return;
    }

    // Validate input
    const itemId = req.query.itemId;
    const base64Image = req.body?.image;

    if (!itemId || !base64Image) {
      context.res = { status: 400, body: "Missing itemId or image" };
      return;
    }

    // Convert base64 → buffer
    const buffer = Buffer.from(base64Image, "base64");

    // Blob upload
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BLOB_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient("item-images");
    const blobClient = containerClient.getBlockBlobClient(`${itemId}.jpg`);

    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    const imageUrl = blobClient.url;

    context.res = {
      status: 200,
      body: { imageUrl }
    };
  } catch (err) {
    context.res = { status: 500, body: err.message };
  }
};

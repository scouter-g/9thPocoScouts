const { BlobServiceClient } = require("@azure/storage-blob");

module.exports = async function (context, req) {
  try {
    // 1. Authentication Check
    const principalHeader = req.headers["x-ms-client-principal"];
    if (!principalHeader) {
      context.res = { status: 401, body: "Not authenticated" };
      return;
    }

    const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
    const principal = JSON.parse(decoded);
    const email = (principal.userDetails || "").toLowerCase();

    if (email !== "scouter.greg@outlook.com") {
      context.res = { status: 403, body: "Forbidden: Only Greg can upload images." };
      return;
    }

    const itemId = req.query.itemId;
    if (!itemId) {
      context.res = { status: 400, body: "Missing itemId query parameter." };
      return;
    }

    // 2. Extract binary body directly
    // If Azure has already processed req.body as a buffer, use it. Otherwise, wrap it.
    let rawBuffer;
    if (Buffer.isBuffer(req.body)) {
      rawBuffer = req.body;
    } else if (typeof req.body === "string") {
      rawBuffer = Buffer.from(req.body, "binary");
    } else {
      rawBuffer = req.body; // Fallback
    }

    if (!rawBuffer || rawBuffer.length === 0) {
      context.res = { status: 400, body: "Upload failed: Sent image data was empty." };
      return;
    }

    const safeName = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 3. Connect to Azure Storage
    const connStr = process.env.BLOB_CONNECTION_STRING;
    if (!connStr) {
      context.res = { status: 500, body: "Configuration error: Missing connection string." };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobServiceClient.getContainerClient("item-images");
    
    // Auto-create container if it was deleted/not made yet
    await containerClient.createIfNotExists({ access: 'blob' });

    const blobClient = containerClient.getBlockBlobClient(`${safeName}.jpg`);

    // 4. Upload binary data stream
    await blobClient.uploadData(rawBuffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { imageUrl: blobClient.url }
    };

  } catch (err) {
    context.res = { 
      status: 500, 
      body: "Backend Runtime Error: " + (err.message || err.toString()) 
    };
  }
};

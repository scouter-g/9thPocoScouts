import { BlobServiceClient } from "@azure/storage-blob";

export default async function (context, req) {
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
    
    // 2. Safely read image string
    let base64Image = "";
    if (req.body && typeof req.body === "object") {
      base64Image = req.body.image;
    } else if (typeof req.body === "string") {
      try {
        const parsed = JSON.parse(req.body);
        base64Image = parsed.image;
      } catch (e) {
        base64Image = req.body;
      }
    }

    if (!itemId || !base64Image || typeof base64Image !== "string") {
      context.res = { status: 400, body: "Missing or invalid itemId or image data" };
      return;
    }

    const safeName = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const buffer = Buffer.from(base64Image, "base64");

    // 3. Connect to Azure Storage
    const connStr = process.env.BLOB_CONNECTION_STRING;
    if (!connStr) {
      context.res = { status: 500, body: "Missing BLOB_CONNECTION_STRING configuration." };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(connStr);
    const containerClient = blobServiceClient.getContainerClient("item-images");
    const blobClient = containerClient.getBlockBlobClient(`${safeName}.jpg`);

    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { imageUrl: blobClient.url } // Azure Functions accept direct objects here
    };

  } catch (err) {
    context.res = { 
      status: 500, 
      body: "Backend Error: " + (err.message || err.toString()) 
    };
  }
}

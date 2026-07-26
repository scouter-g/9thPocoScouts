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
    
    // 2. Parse request body safely whether it's sent as an object or a raw string
    let rawBase64Image = "";
    if (req.body && typeof req.body === "object") {
      rawBase64Image = req.body.image;
    } else if (typeof req.body === "string") {
      try {
        const parsedBody = JSON.parse(req.body);
        rawBase64Image = parsedBody.image;
      } catch (e) {
        rawBase64Image = req.body;
      }
    }

    if (!itemId || !rawBase64Image) {
      context.res = { status: 400, body: "Missing itemId or image data" };
      return;
    }

    // FIX 1: Clean the Base64 string! Strip off any browser-added "data:image/jpeg;base64," prefixes
    const base64DataOnly = rawBase64Image.includes(",") 
      ? rawBase64Image.split(",")[1] 
      : rawBase64Image;

    // Convert cleanly to binary buffer
    const buffer = Buffer.from(base64DataOnly, "base64");
    const safeName = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");

    // 3. Connect to Azure Storage
    if (!process.env.BLOB_CONNECTION_STRING) {
      context.res = { status: 500, body: "Server configuration error: Missing connection string." };
      return;
    }

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BLOB_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient("item-images");
    
    // FIX 2: Safeguard against missing storage containers by forcing auto-creation
    await containerClient.createIfNotExists({ access: 'blob' }); 

    const blobClient = containerClient.getBlockBlobClient(`${safeName}.jpg`);

    // 4. Upload raw binary data
    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    // FIX 3: Deliver clean, stringified JSON responses with explicit header types
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: blobClient.url })
    };

  } catch (err) {
    // Return precise backend message strings back to the frontend console window
    context.res = { status: 500, body: `Backend Error: ${err.message}` };
  }
}

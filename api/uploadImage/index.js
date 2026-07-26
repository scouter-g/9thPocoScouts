import { BlobServiceClient } from "@azure/storage-blob";

export default async function (context, req) {
  try {
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
    
    // Fix 1: Ensure req.body is completely parsed regardless of how Azure sends it
    let base64Image = "";
    if (req.body && typeof req.body === "object") {
      base64Image = req.body.image;
    } else if (typeof req.body === "string") {
      try {
        const parsedBody = JSON.parse(req.body);
        base64Image = parsedBody.image;
      } catch (e) {
        // Fallback if the body itself is just the raw string
        base64Image = req.body;
      }
    }

    if (!itemId || !base64Image) {
      context.res = { 
        status: 400, 
        body: `Missing parameters. itemId: ${!!itemId}, imageString: ${!!base64Image}` 
      };
      return;
    }

    const safeName = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");
    
    // Fix 2: Convert base64 data to buffer safely
    const buffer = Buffer.from(base64Image, "base64");

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BLOB_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient("item-images");
    const blobClient = containerClient.getBlockBlobClient(`${safeName}.jpg`);

    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    // Azure Functions v3/v4 expect response objects containing stringified JSON bodies 
    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: blobClient.url })
    };
  } catch (err) {
    context.res = { status: 500, body: `Server Error: ${err.message}` };
  }
}

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
    const base64Image = req.body?.image;

    if (!itemId || !base64Image) {
      context.res = { status: 400, body: "Missing itemId or image" };
      return;
    }

    const safeName = itemId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const buffer = Buffer.from(base64Image, "base64");

    const blobServiceClient = BlobServiceClient.fromConnectionString(
      process.env.BLOB_CONNECTION_STRING
    );

    const containerClient = blobServiceClient.getContainerClient("item-images");
    const blobClient = containerClient.getBlockBlobClient(`${safeName}.jpg`);

    await blobClient.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: "image/jpeg" }
    });

    context.res = {
      status: 200,
      body: { imageUrl: blobClient.url }
    };
  } catch (err) {
    context.res = { status: 500, body: err.message };
  }
}

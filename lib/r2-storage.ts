import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadInput = {
  file: File;
  keyPrefix: string;
};

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;
const publicUrl = process.env.R2_PUBLIC_URL;

const r2Client = accountId && accessKeyId && secretAccessKey
  ? new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  : null;

export function isR2Configured() {
  return Boolean(r2Client && bucket);
}

export async function uploadFileToR2({ file, keyPrefix }: UploadInput) {
  if (!r2Client || !bucket) {
    return null;
  }

  const key = buildObjectKey(file, keyPrefix);
  const body = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${key}`;
  }

  return `/api/r2/${encodeURIComponent(key)}`;
}

export async function getR2Object(key: string) {
  if (!r2Client || !bucket) {
    return null;
  }

  const response = await r2Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: decodeURIComponent(key),
    }),
  );

  const chunks: Uint8Array[] = [];

  if (!response.Body) {
    return null;
  }

  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }

  return {
    body: Buffer.concat(chunks),
    contentType: response.ContentType ?? "application/octet-stream",
  };
}

function buildObjectKey(file: File, keyPrefix: string) {
  const extension = getExtension(file);
  const safePrefix = keyPrefix.replace(/[^a-zA-Z0-9/_-]/g, "-").replace(/^\/+|\/+$/g, "");
  return `${safePrefix}/${crypto.randomUUID()}${extension}`;
}

function getExtension(file: File) {
  const nameExtension = file.name.includes(".") ? file.name.split(".").pop() : "";

  if (nameExtension) {
    return `.${nameExtension.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  }

  if (file.type === "image/png") return ".png";
  if (file.type === "image/jpeg") return ".jpg";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "application/pdf") return ".pdf";

  return "";
}

import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const algorithm = "aes-256-gcm";
const ivLength = 12;

export function encryptIntegrationSecret(value: string) {
  if (!value) {
    return "";
  }

  const iv = randomBytes(ivLength);
  const cipher = createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
}

export function decryptIntegrationSecret(payload: string) {
  if (!payload) {
    return "";
  }

  const [ivValue, tagValue, encryptedValue] = payload.split(":");

  if (!ivValue || !tagValue || !encryptedValue) {
    return "";
  }

  const decipher = createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivValue, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function getEncryptionKey() {
  return createHash("sha256")
    .update(process.env.INTEGRATION_SECRET_KEY || process.env.AUTH_SECRET || process.env.JWT_SECRET || "vendora-dev-integration-key")
    .digest();
}

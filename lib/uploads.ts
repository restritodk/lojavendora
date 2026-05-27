import "server-only";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { uploadFileToR2 } from "@/lib/r2-storage";

const maxImageSize = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function savePublicImageUpload(file: File, folder: string) {
  if (!file.size) {
    return "";
  }

  if (!allowedTypes.has(file.type)) {
    throw new Error("Use uma imagem JPG, PNG, WEBP ou GIF.");
  }

  if (file.size > maxImageSize) {
    throw new Error("A imagem deve ter no máximo 8MB.");
  }

  const r2Url = await uploadFileToR2({ file, keyPrefix: folder });
  if (r2Url) {
    return r2Url;
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const extension = getExtension(file);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, "");
  const uploadDir = path.join(process.cwd(), "public", "uploads", safeFolder);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), bytes);

  return `/uploads/${safeFolder}/${fileName}`;
}

function getExtension(file: File) {
  const fromName = path.extname(file.name).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(fromName)) {
    return fromName;
  }

  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";

  return ".jpg";
}

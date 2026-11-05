import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { currentStoreId } from "./defaults";
import { randomId } from "./format";
import { DATA_DIR } from "./db/local";

export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export const FILE_NAME_PATTERN = /^[a-z0-9]{6,40}\.(png|jpg|webp)$/;

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function cloudinaryConfig(): CloudinaryConfig | null {
  const url = process.env.CLOUDINARY_URL?.trim();
  if (url) {
    // cloudinary://<api_key>:<api_secret>@<cloud_name>
    const match = /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/.exec(url);
    if (match) return { apiKey: match[1], apiSecret: match[2], cloudName: match[3] };
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  return cloudName && apiKey && apiSecret ? { cloudName, apiKey, apiSecret } : null;
}

/** Each client gets its own folder: CLOUDINARY_FOLDER, else super-flyr/<MONGODB_DB>/<STORE_ID>. */
export function cloudinaryFolder(): string {
  const custom = process.env.CLOUDINARY_FOLDER?.trim();
  if (custom) return custom;
  const db = process.env.MONGODB_DB?.trim() || "superflyr";
  return `super-flyr/${db}/${currentStoreId()}`;
}

export function storageKind(): "cloudinary" | "local" {
  return cloudinaryConfig() ? "cloudinary" : "local";
}

/** Stores an image and returns the URL the app should save. */
export async function saveImage(file: Blob): Promise<string> {
  const ext = EXTENSIONS[file.type];
  if (!ext) throw new UploadError("Only PNG, JPG or WebP images are allowed.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Image is larger than 4 MB.");

  const cloud = cloudinaryConfig();
  if (cloud) return uploadToCloudinary(file, cloud);

  if (process.env.VERCEL) {
    throw new UploadError("Cloudinary is not configured. Add CLOUDINARY_URL to store images on Vercel.");
  }
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomId(16)}.${ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${name}`;
}

async function uploadToCloudinary(file: Blob, cloud: CloudinaryConfig): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = cloudinaryFolder();
  const signature = createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${cloud.apiSecret}`)
    .digest("hex");

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", cloud.apiKey);
  form.append("timestamp", timestamp);
  form.append("folder", folder);
  form.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !json.secure_url) {
    throw new Error(`Cloudinary upload failed: ${json.error?.message ?? res.statusText}`);
  }
  return json.secure_url;
}

export async function readLocalImage(name: string): Promise<{ body: Buffer; type: string } | null> {
  if (!FILE_NAME_PATTERN.test(name)) return null;
  try {
    const body = await readFile(path.join(UPLOAD_DIR, name));
    const ext = name.split(".").pop()!;
    const type = ext === "jpg" ? "image/jpeg" : `image/${ext}`;
    return { body, type };
  } catch {
    return null;
  }
}

export class UploadError extends Error {}

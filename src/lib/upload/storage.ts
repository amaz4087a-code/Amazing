import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";

export interface StorageProvider {
  save(filename: string, buffer: Buffer): Promise<string>;
  get(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
}

/**
 * Local filesystem storage — used in dev environment.
 */
export class LocalStorageProvider implements StorageProvider {
  constructor(private basePath: string) {}

  async save(filename: string, buffer: Buffer): Promise<string> {
    await mkdir(this.basePath, { recursive: true });
    const uniqueName = `${Date.now()}-${filename}`;
    const fullPath = join(this.basePath, uniqueName);
    await writeFile(fullPath, buffer);
    return fullPath;
  }

  async get(path: string): Promise<Buffer> {
    return readFile(path);
  }

  async delete(path: string): Promise<void> {
    await unlink(path);
  }
}

/**
 * Vercel Blob storage — used in production on Vercel.
 * Falls back to local storage when BLOB_READ_WRITE_TOKEN is not set.
 */
function createBlobProvider() {
  async function save(filename: string, buffer: Buffer): Promise<string> {
    const { put } = await import("@vercel/blob");
    const blob = await put(filename, buffer, { access: "public" });
    return blob.url;
  }

  async function get(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch blob: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async function delete_(url: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(url);
  }

  return { save, get, delete: delete_ };
}

function isVercelEnvironment(): boolean {
  return (
    process.env.VERCEL === "1" ||
    !!process.env.BLOB_READ_WRITE_TOKEN
  );
}

function createStorage() {
  if (isVercelEnvironment()) {
    return createBlobProvider();
  }
  return new LocalStorageProvider(join(process.cwd(), "uploads", "motions"));
}

export const motionStorage = isVercelEnvironment()
  ? createBlobProvider()
  : new LocalStorageProvider(join(process.cwd(), "uploads", "motions"));

export const reportStorage = isVercelEnvironment()
  ? createBlobProvider()
  : new LocalStorageProvider(join(process.cwd(), "uploads", "reports"));

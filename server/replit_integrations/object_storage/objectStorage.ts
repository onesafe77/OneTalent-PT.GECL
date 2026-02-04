import fs from 'fs';
import path from 'path';
import { Response } from "express";
import { randomUUID } from "crypto";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

// Define a simpler File interface compatible with what the rest of the app expects
// (mostly just needs to exist and have some metadata methods)
export class LocalFile {
  constructor(public filePath: string) { }

  async exists(): Promise<[boolean]> {
    try {
      await fs.promises.access(this.filePath);
      return [true];
    } catch {
      return [false];
    }
  }

  createReadStream() {
    return fs.createReadStream(this.filePath);
  }

  async getMetadata() {
    try {
      const stats = await fs.promises.stat(this.filePath);
      return [{
        contentType: this.guessContentType(this.filePath),
        size: stats.size,
        updated: stats.mtime.toISOString(),
      }];
    } catch (e) {
      // Return default metadata on error
      return [{
        contentType: 'application/octet-stream',
        size: 0,
        updated: new Date().toISOString()
      }];
    }
  }

  // Helper to guess content type based on extension
  private guessContentType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const map: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return map[ext] || 'application/octet-stream';
  }
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private uploadsDir: string;
  private objectDir: string;

  constructor() {
    // Ensure upload directories exist
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.objectDir = path.join(this.uploadsDir, 'objects');

    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
    if (!fs.existsSync(this.objectDir)) {
      fs.mkdirSync(this.objectDir, { recursive: true });
    }
  }

  // Gets the public object search paths (mapped to local folders for compatibility)
  getPublicObjectSearchPaths(): Array<string> {
    return [this.objectDir];
  }

  // Gets the private object directory.
  getPrivateObjectDir(): string {
    return this.objectDir;
  }

  // Search for a public object from the search paths.
  async searchPublicObject(filePath: string): Promise<LocalFile | null> {
    // In this local implementation, we just check if the file exists in the object dir
    // We treat "filePath" as relative to objectDir
    const fullPath = path.join(this.objectDir, filePath);

    // Security check to prevent directory traversal
    if (!fullPath.startsWith(this.objectDir)) {
      return null;
    }

    const file = new LocalFile(fullPath);
    const [exists] = await file.exists();

    if (exists) {
      return file;
    }

    return null;
  }

  // Downloads an object to the response.
  async downloadObject(file: LocalFile, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [exists] = await file.exists();
      if (!exists) {
        res.status(404).json({ error: "File not found" });
        return;
      }

      // Get file metadata
      const [metadata] = await file.getMetadata();

      // In local mode, we treat everything as private by default unless we implement a real ACL system
      // For simplicity, we just serve it if requested via this method
      const isPublic = true;

      // Set appropriate headers
      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${isPublic ? "public" : "private"
          }, max-age=${cacheTtlSec}`,
      });

      // Stream the file to the response
      const stream = file.createReadStream();

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  // Gets the upload URL for an object entity.
  // For local storage, we'll return a URL that points to our local upload endpoint
  // We'll use a unique ID as the filename
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();
    // Return a local API URL that the client can PUT to
    // The client (ObjectUploader.tsx) expects a pre-signed URL to PUT to.
    // We will create a route handler for /api/uploads/local that accepts this.
    // We append the objectId as a query param or part of the path so the server knows where to save it.

    // NOTE: You must implement the corresponding route in your express app!
    // PUT /api/object-storage/upload/:objectId
    return `/api/object-storage/upload/${objectId}`;
  }

  // Gets the object entity file from the object path.
  async getObjectEntityFile(objectPath: string): Promise<LocalFile> {
    // Expected format: /objects/uuid
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const entityId = objectPath.replace("/objects/", "");
    // Sanitize
    const safeEntityId = path.basename(entityId);

    const fullPath = path.join(this.objectDir, safeEntityId);
    const file = new LocalFile(fullPath);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return file;
  }

  normalizeObjectEntityPath(
    rawPath: string,
  ): string {
    // If it's already a full URL (e.g. from the client view), strip it down
    // But for local storage, we might just use the /objects/ path directly

    if (rawPath.startsWith("http")) {
      try {
        const url = new URL(rawPath);
        // If it points to our own upload API, exact the ID
        if (url.pathname.includes('/upload/')) {
          const id = path.basename(url.pathname);
          return `/objects/${id}`;
        }
      } catch (e) {
        // ignore
      }
    }

    if (rawPath.startsWith("/uploads/")) {
      // Legacy or direct path
      return rawPath;
    }

    return rawPath;
  }

  // Tries to set the ACL policy for the object entity and return the normalized path.
  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    // Local storage simplifiction: we ignore true ACLs for now
    // and just return the normalized path
    return this.normalizeObjectEntityPath(rawPath);
  }

  // Checks if the user can access the object entity.
  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: LocalFile;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    // Always allow for now in this local adaptation
    return true;
  }
}


export const objectStorageClient = new ObjectStorageService();

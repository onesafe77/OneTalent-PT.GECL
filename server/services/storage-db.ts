
import { db } from "../db";
import { uploadedFiles, type InsertUploadedFile } from "@shared/schema";
import { eq } from "drizzle-orm";

export class DatabaseStorageService {

    async uploadFile(file: Express.Multer.File): Promise<{ id: string; url: string }> {
        try {
            // Convert buffer to base64 string
            const fileBuffer = file.buffer.toString("base64");

            const newFile: InsertUploadedFile = {
                data: fileBuffer,
                filename: file.originalname,
                mimeType: file.mimetype,
            };

            const [inserted] = await db.insert(uploadedFiles).values(newFile).returning();

            return {
                id: inserted.id,
                url: `/api/uploads/${inserted.id}`
            };
        } catch (error) {
            console.error("DatabaseStorageService upload error:", error);
            throw new Error("Failed to upload file to database");
        }
    }

    async getFile(id: string): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
        try {
            const result = await db.query.uploadedFiles.findFirst({
                where: eq(uploadedFiles.id, id),
            });

            if (!result) return null;

            return {
                data: Buffer.from(result.data, "base64"),
                mimeType: result.mimeType,
                filename: result.filename,
            };
        } catch (error) {
            console.error("DatabaseStorageService getFile error:", error);
            return null;
        }
    }

    async deleteFile(id: string): Promise<boolean> {
        try {
            const [deleted] = await db.delete(uploadedFiles)
                .where(eq(uploadedFiles.id, id))
                .returning();
            return !!deleted;
        } catch (error) {
            console.error("DatabaseStorageService deleteFile error:", error);
            return false;
        }
    }
}

export const dbStorage = new DatabaseStorageService();

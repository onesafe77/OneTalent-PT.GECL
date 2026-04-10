import { storage } from "./storage";
import {
    sidakImpactRecords, sidakImpactSessions,
    sidakGerindaDudukRecords, sidakGerindaDudukSessions,
    sidakWorkshopEquipment, sidakWorkshopSessions,
    sidakHydraulicJackRecords, sidakHydraulicJackSessions,
    sidakStandJackRecords, sidakStandJackSessions,
    sidakBottleJackRecords, sidakBottleJackSessions,
    sidakAparRecords, sidakAparSessions,
    sidakWorkshopInspectors,
    picaRecords,
    type PicaRecord,
    type InsertPicaRecord
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export const PicaService = {
    /**
     * Syncs findings from all Sidak modules to the PICA table
     */
    async syncAllFindings() {
        console.log("🔄 Starting PICA findings sync...");

        // List of modules that use the JSONB inspection results pattern
        const jsonModules = [
            { name: "SIDAK_IMPACT", recordTable: sidakImpactRecords, sessionTable: sidakImpactSessions, moduleLabel: "Sidak Impact" },
            { name: "SIDAK_GERINDA_DUDUK", recordTable: sidakGerindaDudukRecords, sessionTable: sidakGerindaDudukSessions, moduleLabel: "Sidak Gerinda Duduk" },
            { name: "SIDAK_HYDRAULIC_JACK", recordTable: sidakHydraulicJackRecords, sessionTable: sidakHydraulicJackSessions, moduleLabel: "Sidak Hydraulic Jack" },
            { name: "SIDAK_STAND_JACK", recordTable: sidakStandJackRecords, sessionTable: sidakStandJackSessions, moduleLabel: "Sidak Stand Jack" },
            { name: "SIDAK_BOTTLE_JACK", recordTable: sidakBottleJackRecords, sessionTable: sidakBottleJackSessions, moduleLabel: "Sidak Bottle Jack" },
            { name: "SIDAK_APAR", recordTable: sidakAparRecords, sessionTable: sidakAparSessions, moduleLabel: "Sidak APAR" },
        ];

        let totalSynced = 0;

        for (const mod of jsonModules) {
            try {
                const syncedCount = await this.syncJsonModule(mod);
                totalSynced += syncedCount;
                console.log(`✅ ${mod.name}: Synced ${syncedCount} findings.`);
            } catch (err) {
                console.error(`❌ Error syncing ${mod.name}:`, err);
            }
        }

        // Special case for Workshop (different table naming/structure)
        try {
            const workshopSynced = await this.syncWorkshopFindings();
            totalSynced += workshopSynced;
            console.log(`✅ SIDAK_WORKSHOP: Synced ${workshopSynced} findings.`);
        } catch (err) {
            console.error(`❌ Error syncing SIDAK_WORKSHOP:`, err);
        }

        console.log(`🏁 PICA sync completed. Total synced: ${totalSynced}`);
        return totalSynced;
    },

    async syncJsonModule(mod: any) {
        let synced = 0;

        // Get all records with their sessions
        const records = await db.select({
            record: mod.recordTable,
            session: mod.sessionTable
        })
            .from(mod.recordTable)
            .innerJoin(mod.sessionTable, eq(mod.recordTable.sessionId, mod.sessionTable.id));

        for (const row of records) {
            const results = row.record.inspectionResults as Record<string, string>;
            const notes = row.record.tindakLanjutPerbaikan as Record<string, string> || {};

            for (const [findingId, status] of Object.entries(results)) {
                if (status === "TS") {
                    const findingDescription = `Temuan pada ${mod.moduleLabel} - Item ${findingId}`;
                    const correctiveAction = typeof notes === 'string' ? notes : (notes[findingId] || "");

                    const wasCreated = await this.ensurePicaRecord({
                        moduleSource: mod.name,
                        referenceId: row.record.id,
                        sessionId: row.session.id,
                        findingId: findingId,
                        findingDescription: findingDescription,
                        correctiveAction: correctiveAction,
                        status: "OPEN",
                        priority: "MEDIUM",
                        dueDate: row.record.dueDate ? new Date(row.record.dueDate as string) : null,
                    });

                    if (wasCreated) synced++;
                }
            }
        }

        return synced;
    },

    async syncWorkshopFindings() {
        let synced = 0;
        const records = await db.select({
            record: sidakWorkshopEquipment,
            session: sidakWorkshopSessions
        })
            .from(sidakWorkshopEquipment)
            .innerJoin(sidakWorkshopSessions, eq(sidakWorkshopEquipment.sessionId, sidakWorkshopSessions.id));

        for (const row of records) {
            const results = row.record.inspectionResults as Record<string, string>;

            for (const [findingId, status] of Object.entries(results)) {
                if (status === "TS") {
                    const wasCreated = await this.ensurePicaRecord({
                        moduleSource: "SIDAK_WORKSHOP",
                        referenceId: row.record.id,
                        sessionId: row.session.id,
                        findingId: `${row.record.equipmentType}_${findingId}`,
                        findingDescription: `Temuan Workshop: ${row.record.equipmentType} - Item ${findingId}`,
                        correctiveAction: row.record.tindakLanjutPerbaikan || "",
                        status: "OPEN",
                        priority: "MEDIUM",
                        dueDate: row.record.dueDate ? new Date(row.record.dueDate as string) : null,
                    });

                    if (wasCreated) synced++;
                }
            }
        }
        return synced;
    },

    async ensurePicaRecord(data: InsertPicaRecord) {
        // Check if exists
        const existing = await db.select()
            .from(picaRecords)
            .where(and(
                eq(picaRecords.moduleSource, data.moduleSource),
                eq(picaRecords.referenceId, data.referenceId),
                eq(picaRecords.findingId, data.findingId)
            ))
            .limit(1);

        if (existing.length === 0) {
            await storage.createPicaRecord(data);
            return true;
        }
        return false;
    },

    /**
     * Checks for "TS" findings in a submitted record and creates PICA records if found.
     * This is used for real-time Auto-PICA creation during form submission.
     */
    async checkAndCreatePica(data: {
        moduleSource: string;
        referenceId: string;
        sessionId: string;
        inspectionResults: any;
        tindakLanjut?: any;
        dueDate?: string | Date | null;
        moduleLabel: string;
    }) {
        try {
            if (!data.inspectionResults) return;
            const results = data.inspectionResults as Record<string, any>;
            const notes = data.tindakLanjut || "";

            // Common metadata fields to always ignore (these exist on record objects
            // when the entire record is passed as inspectionResults)
            const globalIgnoredFields = [
                "id", "sessionId", "employeeId", "ordinal", "createdAt", "updatedAt",
                "nama", "nik", "jabatan", "nomorLambung", "noLambung", "namaNik",
                "perusahaan", "noKendaraan", "keterangan", "catatanIntervensi",
                "buktiIntervensi", "employeeSignature", "pvtMeanRT", "jamTidur",
                "isActive", "isCompleted", "reminderSent", "notified",
                "activityPhotos", "signatureDataUrl", "dueDate",
                "tindakLanjutPerbaikan", "checklistResults", "inspectionResults",
                "equipmentType", "equipmentName", "equipmentId", "status",
                "photoUrl", "evidenceUrl", "evidencePhotoUrl",
            ];

            // Fatigue-specific: fields where true = finding
            const fatigueTrueFinding = [
                "konsumiObat", "konsumsiObat", "masalahPribadi",
                "istirahatLebihdariSatuJam", "tidakBolehBekerja"
            ];
            // Fatigue-specific: fields where false = finding
            const fatigueFalseFinding = [
                "pemeriksaanRespon", "pemeriksaanKonsentrasi", "pemeriksaanKesehatan",
                "karyawanSiapBekerja", "fitUntukBekerja"
            ];
            // Fatigue-specific: fields that are NOT findings (recommendations/neutral)
            const fatigueIgnored = ["istirahatDanMonitor"];

            for (const [findingId, value] of Object.entries(results)) {
                // Skip all metadata fields
                if (globalIgnoredFields.includes(findingId)) continue;

                let isFinding = false;
                let correctiveAction = "";

                if (typeof value === "string" && value === "TS") {
                    isFinding = true;
                    correctiveAction = typeof notes === 'string' ? notes : (notes[findingId] || "");
                } else if (typeof value === "boolean") {
                    if (data.moduleSource === "SIDAK_FATIGUE") {
                        if (fatigueIgnored.includes(findingId)) continue;
                        if (fatigueTrueFinding.includes(findingId) && value === true) isFinding = true;
                        if (fatigueFalseFinding.includes(findingId) && value === false) isFinding = true;
                    } else {
                        // For boolean modules (Seatbelt, Rambu, Roster, Antrian):
                        // false = non-conformity (finding)
                        if (value === false) {
                            isFinding = true;
                        }
                    }

                    if (isFinding) {
                        correctiveAction = typeof notes === 'string' ? notes : "";
                    }
                }
                // Skip numbers, objects, arrays, null, undefined — not inspection items

                if (isFinding) {
                    const findingDescription = `Temuan pada ${data.moduleLabel} - ${findingId}`;

                    await this.ensurePicaRecord({
                        moduleSource: data.moduleSource,
                        referenceId: data.referenceId,
                        sessionId: data.sessionId,
                        findingId: findingId,
                        findingDescription: findingDescription,
                        correctiveAction: correctiveAction,
                        status: "OPEN",
                        priority: "MEDIUM",
                        dueDate: data.dueDate ? new Date(data.dueDate) : null,
                    });
                }
            }
        } catch (err) {
            console.error(`Error in Auto-PICA creation for ${data.moduleSource}:`, err);
        }
    }

};

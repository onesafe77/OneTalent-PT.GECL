// @ts-nocheck
// Force reload for RBAC update - DEBUG MODE
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import OpenAI from "openai";
import { openRouterClient, AI_MODELS } from "./ai-config";
import { differenceInDays, parseISO, isValid, format, addDays, addWeeks, addMonths, getWeek, startOfWeek, endOfWeek } from "date-fns";
import { exec } from "child_process";
import Papa from "papaparse";
import { PicaService } from "./pica-service";

// Configure Multer with disk storage to preserve file extensions
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}
const mainStorageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage: mainStorageConfig });

import { storage } from "./storage";
import { sendWhatsAppMessage, formatSimperEvNotification, formatSimperPerpanjanganNotification } from "./services/whatsapp-service";
import { fetchSheetData, listSpreadsheetSheets, getSpreadsheetMetadata, generateVisualizationSuggestions } from "./google-sheets-service";
import { ObjectStorageService, ObjectNotFoundError } from "./replit_integrations/object_storage";
import { dbStorage } from "./services/storage-db";
import { categorizeViolation, FMS_CATEGORIES } from "./services/fms-category";
import { usignNotificationService } from "./services/usignNotificationService";
import { setupAuth } from "./replitAuth";
import {
  insertEmployeeSchema,
  insertEmployeeFamilyMemberSchema,
  insertAttendanceSchema,
  insertRosterSchema,
  insertLeaveRequestSchema,
  insertQrTokenSchema,
  insertMeetingSchema,
  insertMeetingAttendanceSchema,
  insertManualAttendanceSchema,
  insertSimperEvMonitoringSchema,
  InsertSimperEvMonitoring,
  insertSimperEvHistorySchema,
  insertSidakFatigueSessionSchema,
  insertSidakFatigueRecordSchema,
  insertSidakFatigueObserverSchema,
  insertSidakRosterSessionSchema,
  insertSidakRosterRecordSchema,
  insertSidakRosterObserverSchema,
  insertSidakSeatbeltSessionSchema,
  insertSidakSeatbeltRecordSchema,
  insertSidakSeatbeltObserverSchema,
  insertSidakBehaviorSessionSchema,
  insertSidakBehaviorRecordSchema,
  insertSidakBehaviorObserverSchema,
  insertSidakChargingStationSessionSchema,
  insertSidakChargingStationRecordSchema,
  insertSidakChargingStationObserverSchema,
  insertSidakSopKritisSessionSchema,
  insertSidakSopKritisPengendalianSchema,
  insertSidakSopKritisLangkahSchema,
  insertSidakSopKritisObserverSchema,
  insertAnnouncementSchema,
  insertNewsSchema,
  insertPushSubscriptionSchema,
  loginSchema,
  resetPasswordSchema,
  insertSidakAntrianSessionSchema,
  insertSidakAntrianRecordSchema,
  insertSidakAntrianObserverSchema,
  insertSidakKecepatanSessionSchema,
  insertSidakKecepatanRecordSchema,
  insertSidakKecepatanObserverSchema,
  insertSidakJarakSessionSchema,
  insertSidakJarakRecordSchema,
  insertSidakJarakObserverSchema,
  insertSidakPencahayaanSessionSchema,
  insertSidakPencahayaanRecordSchema,
  insertSidakPencahayaanObserverSchema,
  insertSidakLotoSessionSchema,
  insertSidakLotoRecordSchema,
  insertSidakLotoObserverSchema,
  insertSidakDigitalSessionSchema,
  insertSidakDigitalRecordSchema,
  insertSidakDigitalObserverSchema,
  insertSidakWorkshopSessionSchema,
  insertSidakWorkshopEquipmentSchema,
  insertSidakWorkshopInspectorSchema,
  insertSidakStandJackSessionSchema,
  insertSidakStandJackRecordSchema,
  insertSidakStandJackObserverSchema,
  insertSidakHydraulicJackSessionSchema,
  insertSidakHydraulicJackRecordSchema,
  insertSidakHydraulicJackObserverSchema,
  insertSidakBottleJackSessionSchema,
  insertSidakBottleJackRecordSchema,
  insertSidakBottleJackObserverSchema,
  insertTrainingSchema,
  insertTnaSummarySchema,
  insertTnaEntrySchema,
  trainings,
  tnaEntries,
  insertKompetensiMonitoringSchema,
  siAsefDocuments, siAsefChunks, siAsefChatSessions, siAsefChatMessages,
  insertSiAsefChatSessionSchema, insertSiAsefChatMessageSchema,
  insertActivityEventSchema,
  insertInductionMaterialSchema,
  insertInductionQuestionSchema,
  insertInductionScheduleSchema,
  insertInductionAnswerSchema,
  insertPublicInductionAttendanceSchema,
  insertProjectSchema,
  insertProjectFileSchema,
  fmsViolations,
  fmsFatigueAlerts,
  sidakFatigueObservers,
  sidakRosterObservers,
  employees,
  spipPeralatan,
  insertSpipPeralatanSchema,
  spipPrasarana,
  insertSpipPrasaranaSchema,
  spipInstalasi,
  insertSpipInstalasiSchema,
  insertSidakImpactSessionSchema,
  insertSidakImpactRecordSchema,
  insertSidakImpactObserverSchema,
  insertSidakAparSessionSchema,
  insertSidakAparRecordSchema,
  insertSidakAparObserverSchema,
  insertSidakFuelStorageSessionSchema,
  insertSidakFuelStorageRecordSchema,
  insertSidakFuelStorageObserverSchema,
  insertSidakMesinKompresorSessionSchema,
  insertSidakMesinKompresorRecordSchema,
  insertSidakMesinKompresorObserverSchema,
  insertSidakMesinLasSessionSchema,
  insertSidakMesinLasRecordSchema,
  insertSidakMesinLasObserverSchema,
  insertSidakGerindaDudukSessionSchema,
  insertSidakGerindaDudukRecordSchema,
  insertSidakGerindaDudukObserverSchema,
  spipPeralatanWorkshop,
  insertSpipPeralatanWorkshopSchema,
  smkpClauses,
  checklistTemplates,
  monthlyChecklists,
  insertSmkpClauseSchema,
  insertChecklistTemplateSchema,
  documentMasterlist,
  documentVersions,
  zhWorkbook,
} from "@shared/schema";
import { eq, ilike, and, or, not, lt, lte, gt, gte, isNull, isNotNull, desc, sql, asc, inArray } from "drizzle-orm";
import { processAndSaveDocument, deleteDocument, processAndSaveGoogleSheet } from "./services/document-service";
import * as whatsappService from "./services/whatsapp-service";
import { buildRAGPrompt, searchSimilarChunks, generateEmbedding } from "./services/rag-service";
import { db } from "./db";
import { PushNotificationService } from "./push-notification";
import { createUserWithRole, Role, Permission, ROLE_PERMISSIONS, getRoleFromPosition } from "@shared/rbac";
import { inductionAiService } from "./services/induction-ai-service";
import { parseSickLeaveWithGemini } from "./gemini-parser";

export async function registerRoutes(app: Express): Promise<Server> {
  // ============================================
  // DATABASE MIGRATION - SPIP INSTALASI (AUTO)
  // ============================================
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS spip_instalasi (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        no INTEGER,
        jenis_spip TEXT NOT NULL DEFAULT 'INSTALASI',
        jenis_unit TEXT NOT NULL,
        kategori TEXT NOT NULL DEFAULT 'Instalasi Lainnya',
        nomor_register TEXT NOT NULL UNIQUE,
        merk TEXT,
        type TEXT,
        kapasitas TEXT,
        area_lokasi TEXT NOT NULL,
        tahun_pembuatan INTEGER,
        komisioner TEXT,
        no_sertifikat TEXT,
        tgl_sertifikat TIMESTAMP,
        exp_sertifikat TIMESTAMP,
        keterangan TEXT,
        status_unit TEXT NOT NULL DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS spip_peralatan_workshop (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        no INTEGER,
        jenis_spip TEXT NOT NULL DEFAULT 'PERALATAN',
        sub_kategori TEXT NOT NULL DEFAULT 'BERGERAK',
        jenis_unit TEXT NOT NULL,
        no_lambung TEXT NOT NULL UNIQUE,
        kapasitas TEXT,
        nilai_kapasitas DOUBLE PRECISION,
        satuan_kapasitas TEXT,
        area_lokasi TEXT NOT NULL,
        komisioner TEXT,
        no_sertifikat TEXT,
        tgl_sertifikat TIMESTAMP,
        exp_sertifikat TIMESTAMP,
        keterangan TEXT,
        status_unit TEXT NOT NULL DEFAULT 'AKTIF',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS "IDX_spip_peralatan_workshop_lambung" ON spip_peralatan_workshop (no_lambung);`);
    console.log("✅ Auto-migration: spip_instalasi & spip_peralatan_workshop tables ensured.");
  } catch (err) {
    console.error("❌ Auto-migration failed:", err);
  }

  setupAuth(app);

  // Report cache invalidation and update notification system
  let lastRosterUpdate = new Date();

  async function triggerReportUpdate() {
    console.log("🔄 Roster data changed - triggering report updates");

    // Update the last roster change timestamp
    lastRosterUpdate = new Date();

    // Could implement various notification methods:
    // 1. WebSocket broadcast to all connected report clients
    // 2. Cache invalidation for TanStack Query
    // 3. Database triggers for real-time updates
    // 4. Email notifications to managers

    console.log(`📊 Report update triggered at ${lastRosterUpdate.toISOString()}`);
  }

  // Utility function to determine shift based on time
  function determineShiftByTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // UPDATED CRITERIA:
    // Shift 1: 04:00-10:00 (240-600 menit)
    // Shift 2: 16:00-22:00 (960-1320 menit)

    if (totalMinutes >= 960 && totalMinutes <= 1320) {
      return "Shift 2";
    } else if (totalMinutes >= 240 && totalMinutes <= 600) {
      return "Shift 1";
    } else {
      return "Shift 1"; // Default to Shift 1 for other times
    }
  }

  // Strict shift time validation based on actual roster schedule
  // Fungsi validasi waktu berdasarkan pola shift standar operasional
  function isValidRosterTime(currentTime: string, startTime: string, endTime: string): boolean {
    // Tidak menggunakan startTime dan endTime dari roster untuk sementara
    // Karena data roster bisa inconsistent
    return true; // Temporary - akan menggunakan shift-based validation
  }

  // STRICT: Fungsi validasi waktu berdasarkan nama shift - TIDAK BOLEH ABSENSI DILUAR JAM KERJA
  function isValidShiftTimeByName(currentTime: string, shiftName: string): boolean {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // Normalize shift name to handle both formats: "Shift 1", "SHIFT 1"
    const normalizedShift = shiftName.toUpperCase();

    if (normalizedShift === "SHIFT 1") {
      // Shift 1: UPDATED CRITERIA - Hanya boleh scan dari 04:00 sampai 10:00
      return totalMinutes >= 240 && totalMinutes <= 600;
    } else if (normalizedShift === "SHIFT 2") {
      // Shift 2: UPDATED CRITERIA - Hanya boleh scan dari 16:00 sampai 22:00
      return totalMinutes >= 960 && totalMinutes <= 1320;
    }
    // CRITICAL: Diluar shift yang ditentukan = TIDAK BOLEH ABSENSI
    return false;
  }

  // Function to get shift time range for error messages
  function getShiftTimeRange(shiftName: string): { start: string; end: string } {
    // Normalize shift name to handle both formats: "Shift 1", "SHIFT 1"
    const normalizedShift = shiftName.toUpperCase();

    if (normalizedShift === "SHIFT 1") {
      return { start: "04:00", end: "10:00" };
    } else if (normalizedShift === "SHIFT 2") {
      return { start: "16:00", end: "22:00" };
    }
    return { start: "00:00", end: "23:59" };
  }

  // Function to check if time is completely outside all shift windows
  function isCompletelyOutsideShiftTimes(currentTime: string): boolean {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    // Check if time falls within any shift window - UPDATED CRITERIA
    const isInShift1Window = totalMinutes >= 240 && totalMinutes <= 600; // 04:00-10:00
    const isInShift2Window = totalMinutes >= 960 && totalMinutes <= 1320; // 16:00-22:00

    return !isInShift1Window && !isInShift2Window;
  }

  // Fungsi lama untuk backward compatibility (tidak digunakan lagi)
  function isValidShiftTime(currentTime: string, scheduledShift: string): boolean {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (scheduledShift === "Shift 1") {
      // Shift 1: Hanya boleh scan antara jam 06:00:00 sampai 16:00:00 (360-960 minutes)
      return totalMinutes >= 360 && totalMinutes < 960;
    } else if (scheduledShift === "Shift 2") {
      // Shift 2: Hanya boleh scan antara jam 16:30:00 sampai 20:00:00 (990-1200 minutes)
      return totalMinutes >= 990 && totalMinutes < 1200;
    }

    return false;
  }

  // QR Code Global Expiry Control
  // Set to true to disable all QR code scanning with "Token Expired" message
  // Set to false to re-enable QR code scanning
  const QR_GLOBALLY_EXPIRED = false;
  const QR_EXPIRED_MESSAGE = "Token QR Code Expired - Tolong segera melakukan perpanjangan kepada Pihak penyedia Token QR Code";

  // AGGRESSIVE CACHING STRATEGY for Performance Optimization
  const employeeCache = new Map<string, { data: any; timestamp: number }>();
  const allEmployeesCache = new Map<string, { data: any; timestamp: number }>();
  const rosterCache = new Map<string, { data: any; timestamp: number }>();
  const leaveMonitoringCache = new Map<string, { data: any; timestamp: number }>();

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for employee data
  const ALL_EMPLOYEES_TTL = 10 * 60 * 1000; // 10 minutes for all employees (changes less frequently)
  const ROSTER_TTL = 3 * 60 * 1000; // 3 minutes for roster data
  const LEAVE_MONITORING_TTL = 5 * 60 * 1000; // 5 minutes for leave monitoring

  function getCachedEmployee(employeeId: string) {
    const cached = employeeCache.get(employeeId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    return null;
  }

  function setCachedEmployee(employeeId: string, data: any) {
    employeeCache.set(employeeId, { data, timestamp: Date.now() });
  }

  function clearCachedEmployee(employeeId: string) {
    employeeCache.delete(employeeId);
  }

  // Cache for all employees (used frequently in roster enrichment)
  function getCachedAllEmployees() {
    const cached = allEmployeesCache.get('all');
    if (cached && Date.now() - cached.timestamp < ALL_EMPLOYEES_TTL) {
      console.log('📦 Using cached all employees data');
      return cached.data;
    }
    return null;
  }

  function setCachedAllEmployees(data: any) {
    allEmployeesCache.set('all', { data, timestamp: Date.now() });
    console.log(`📦 Cached ${data.length} employees for ${ALL_EMPLOYEES_TTL / 1000}s`);
  }

  // Cache for roster data by date
  function getCachedRoster(date: string) {
    const cached = rosterCache.get(date);
    if (cached && Date.now() - cached.timestamp < ROSTER_TTL) {
      console.log(`📦 Using cached roster data for ${date}`);
      return cached.data;
    }
    return null;
  }

  function setCachedRoster(date: string, data: any) {
    rosterCache.set(date, { data, timestamp: Date.now() });
    console.log(`📦 Cached ${data.length} roster entries for ${date}`);
  }

  // Cache for leave monitoring data
  function getCachedLeaveMonitoring() {
    const cached = leaveMonitoringCache.get('all');
    if (cached && Date.now() - cached.timestamp < LEAVE_MONITORING_TTL) {
      console.log('📦 Using cached leave monitoring data');
      return cached.data;
    }
    return null;
  }

  function setCachedLeaveMonitoring(data: any) {
    leaveMonitoringCache.set('all', { data, timestamp: Date.now() });
    console.log(`📦 Cached ${data.length} leave monitoring records`);
  }

  // Clear all caches (useful for data updates)
  function clearAllCaches() {
    employeeCache.clear();
    allEmployeesCache.clear();
    rosterCache.clear();
    leaveMonitoringCache.clear();
    console.log('🧹 All caches cleared');
  }


  console.log('Resource: server/routes.ts LOADED - Verifying photo upload fix');

  app.get('/api/probe', (req, res) => {
    console.log('[PROBE] PING RECEIVED');
    res.json({ status: 'alive' });
  });

  // Initialize auth/session middleware
  await setupAuth(app);

  // Notifikasi otomatis untuk SUBMISSION SIDAK baru (satu tempat, semua tipe).
  // Cocokkan hanya endpoint create-session (POST /api/sidak-<slug>), bukan /:id/records, /upload, dst.
  const SIDAK_CREATE_RE = /^\/api\/sidak-[a-z0-9-]+$/;
  app.use((req, res, next) => {
    if (req.method === "POST" && SIDAK_CREATE_RE.test(req.path)) {
      const origJson = res.json.bind(res);
      (res as any).json = (body: any) => {
        try {
          const created = body && (body.id ? body : (body.session?.id ? body.session : null));
          if (res.statusCode < 400 && created?.id) {
            const slug = req.path.replace("/api/sidak-", "");
            const pretty = slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
            const sessUser = (req.session as any).user;
            const tgl = req.body?.tanggal ? ` · ${req.body.tanggal}` : "";
            const by = sessUser?.name ? `oleh ${sessUser.name}` : "";
            storage.createNotification({
              type: "sidak",
              title: `Sidak ${pretty} baru`,
              body: `${by}${tgl}`.trim() || "Submission baru",
              link: `/workspace/sidak/${slug}/history`,
              audience: "hse",
              meta: { slug },
            }).catch((e: any) => console.warn("[notif sidak] gagal:", e?.message || e));
          }
        } catch { /* ignore */ }
        return origJson(body);
      };
    }
    next();
  });

  // Ensure uploads directory exists with absolute path
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[INIT] Created uploads directory at: ${uploadsDir}`);
  } else {
    console.log(`[INIT] Uploads directory exists at: ${uploadsDir}`);
  }

  // Configure multer for general file uploads (disk storage) with extension preservation
  const storageConfig = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
      console.log('DEBUG: Multer filename function called for:', file.originalname);
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname) || '.jpg'; // Default to .jpg if no extension
      console.log('DEBUG: Generated extension:', ext);
      cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
  });

  const upload = multer({
    storage: storageConfig,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // Configure multer for Si Asef uploads (memory storage for PDF parsing)
  const uploadMemory = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });

  // !!! HIGH PRIORITY ROUTE: Photo Upload !!!
  app.post("/api/employees/:id/photo", uploadMemory.single('photo'), async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }
      const { url: photoUrl } = await dbStorage.uploadFile(file);
      await storage.updateEmployee(id, { photoUrl });
      res.json({ photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Serve uploaded files statically with absolute path
  app.use('/uploads', express.static(uploadsDir));

  // Serve files from database storage
  app.get("/api/uploads/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const file = await dbStorage.getFile(id);

      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      const disposition = req.query.download === '1' ? 'attachment' : 'inline';
      res.setHeader("Content-Type", file.mimeType);
      res.setHeader("Content-Disposition", `${disposition}; filename="${encodeURIComponent(file.filename)}"`);
      res.send(file.data);
    } catch (error) {
      console.error("Error serving file from database:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });



  // ============================================
  // TNA Routes (Moved to top for priority)
  // ============================================

  // Delete TNA Entry (High Priority - Alternative Method using POST)
  app.post("/api/hse/tna/delete-entry", async (req, res) => {
    try {
      if (!req.body.id) {
        return res.status(400).json({ error: "ID is required" });
      }
      console.log(`[DELETE-POST] Request for TNA Entry ID: ${req.body.id}`);
      const success = await storage.deleteTnaEntry(req.body.id);
      if (!success) {
        console.log(`[DELETE-POST] Failed - ID ${req.body.id} not found`);
        return res.status(404).json({ error: "Not found" });
      }
      console.log(`[DELETE-POST] Success for ID ${req.body.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting TNA entry (POST):", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  // Delete TNA Entry (High Priority)
  app.delete("/api/hse/tna/entries/:id", async (req, res) => {
    try {
      console.log(`[DELETE] Request for TNA Entry ID: ${req.params.id}`);
      const success = await storage.deleteTnaEntry(req.params.id);
      if (!success) {
        console.log(`[DELETE] Failed - ID ${req.params.id} not found in DB`);
        return res.status(404).json({ error: "Not found" });
      }
      console.log(`[DELETE] Success for ID ${req.params.id}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting TNA entry:", error);
      res.status(500).json({ error: "Internal server error", details: error.message });
    }
  });

  app.get("/api/hse/trainings", async (req, res) => {
    try {
      const trainings = await storage.getTrainings();
      res.json(trainings);
    } catch (error) {
      console.error("Error fetching trainings:", error);
      res.status(500).json({ message: "Failed to fetch trainings" });
    }
  });

  app.post("/api/hse/trainings", async (req, res) => {
    try {
      const training = await storage.createTraining(insertTrainingSchema.parse(req.body));
      res.status(201).json(training);
    } catch (error) {
      console.error("Error creating training:", error);
      res.status(400).json({ message: "Invalid training data" });
    }
  });

  app.get("/api/hse/tna/:employeeId/:period", async (req, res) => {
    try {
      const { employeeId, period } = req.params;
      const summary = await storage.getTnaSummary(employeeId, period);

      if (!summary) {
        return res.json({ summary: null, entries: [] });
      }

      const entries = await storage.getTnaEntries(summary.id);
      res.json({ summary, entries });
    } catch (error) {
      console.error("Error fetching TNA:", error);
      res.status(500).json({ message: "Failed to fetch TNA data" });
    }
  });

  app.post("/api/hse/tna", async (req, res) => {
    try {
      const { employeeId, period, entries } = req.body;

      // 1. Get or Create Summary
      let summary = await storage.getTnaSummary(employeeId, period);
      if (!summary) {
        summary = await storage.createTnaSummary({
          employeeId,
          period,
          status: "Draft",
          createdBy: "SYSTEM"
        });
      }

      // 2. Process Entries
      const results = [];
      for (const entry of entries) {
        const savedEntry = await storage.upsertTnaEntry({
          ...entry,
          tnaSummaryId: summary.id
        });
        results.push(savedEntry);
      }

      res.json({ summary, entries: results });
    } catch (error) {
      console.error("Error saving TNA:", error);
      res.status(500).json({ message: "Failed to save TNA data" });
    }
  });

  // DELETE TNA Entry
  app.delete("/api/hse/tna-entry/:entryId", async (req, res) => {
    try {
      const { entryId } = req.params;
      await storage.deleteTnaEntry(entryId);
      res.json({ success: true, message: "Entry deleted" });
    } catch (error) {
      console.error("Error deleting TNA entry:", error);
      res.status(500).json({ message: "Failed to delete entry" });
    }
  });

  app.get("/api/hse/tna-dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getTnaDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching TNA stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/hse/tna-dashboard/gap-analysis", async (req, res) => {
    try {
      const gaps = await storage.getTnaGapAnalysis();
      res.json(gaps);
    } catch (error) {
      console.error("Error fetching gap analysis:", error);
      res.status(500).json({ message: "Failed to fetch gap analysis" });
    }
  });

  app.get("/api/hse/tna-dashboard/department-compliance", async (req, res) => {
    try {
      const compliance = await storage.getTnaDepartmentCompliance();
      res.json(compliance);
    } catch (error) {
      console.error("Error fetching department compliance:", error);
      res.status(500).json({ message: "Failed to fetch department compliance" });
    }
  });

  // Get all TNA entries for dashboard table
  app.get("/api/hse/tna-dashboard/all-entries", async (req, res) => {
    try {
      const entries = await storage.getAllTnaEntriesWithDetailsV2();
      console.log(`DEBUG: /api/hse/tna-dashboard/all-entries returning ${entries.length} entries`);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching all TNA entries:", error);
      res.status(500).json({ message: "Failed to fetch TNA entries" });
    }
  });

  // Get all raw TNA entries (individual entries with training details)
  app.get("/api/hse/tna/all-raw-entries", async (req, res) => {
    try {
      const entries = await storage.getAllRawTnaEntries();
      res.json(entries);
    } catch (error) {
      console.error("Error fetching raw TNA entries:", error);
      res.status(500).json({ message: "Failed to fetch TNA entries" });
    }
  });

  // Update single TNA entry
  app.patch("/api/hse/tna/entries/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updated = await storage.updateTnaEntry(id, updates);
      if (!updated) {
        return res.status(404).json({ message: "Entry not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Error updating TNA entry:", error);
      res.status(500).json({ message: "Failed to update entry" });
    }
  });

  // --- AI Route ---
  app.post("/api/ai/analyze-overspeed", async (req, res) => {
    try {
      const { stats } = req.body;
      const prompt = `Analisa data pelanggaran overspeed ini dan berikan 3-4 insight penting dalam Bahasa Indonesia yang singkat, padat, dan actionable untuk manajemen.
      Data: ${JSON.stringify(stats)}
      
      Format output: JSON array of strings. Contoh: ["Insight 1...", "Insight 2..."]`;

      const response = await openRouterClient.chat.completions.create({
        model: AI_MODELS.SMART_EXTRACTION,
        messages: [{ role: "system", content: "You are an expert Safety Analyst." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content);
      // Handle various JSON structures AI might return
      const insights = Array.isArray(result) ? result : (result.insights || result.data || []);

      res.json({ insights });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ message: error.message || "AI Analysis Failed" });
    }
  });

  app.post("/api/ai/analyze-jarak", async (req, res) => {
    try {
      const { stats } = req.body;
      const prompt = `Analisa data pelanggaran Safe Distance (Jarak Aman) ini dan berikan 3-4 insight penting dalam Bahasa Indonesia yang singkat, padat, dan actionable untuk manajemen.
      Data: ${JSON.stringify(stats)}
      
      Format output: JSON array of strings. Contoh: ["Insight 1...", "Insight 2..."]`;

      const response = await openRouterClient.chat.completions.create({
        model: AI_MODELS.SMART_EXTRACTION,
        messages: [{ role: "system", content: "You are an expert Safety Analyst." }, { role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error("No response from AI");

      const result = JSON.parse(content);
      const insights = Array.isArray(result) ? result : (result.insights || result.data || []);

      res.json({ insights });
    } catch (error: any) {
      console.error("AI Error:", error);
      res.status(500).json({ message: error.message || "AI Analysis Failed" });
    }
  });

  // ============================================
  // SIDAK STATS API
  // ============================================
  app.get("/api/sidak/stats/:nik", async (req, res) => {
    try {
      const { nik } = req.params;

      const fatigue = await storage.getAllSidakFatigueSessions();
      const roster = await storage.getAllSidakRosterSessions();
      const seatbelt = await storage.getAllSidakSeatbeltSessions();
      const rambu = await storage.getAllSidakRambuSessions();
      const antrian = await storage.getAllSidakAntrianSessions();
      const jarak = await storage.getAllSidakJarakSessions();
      const kecepatan = await storage.getAllSidakKecepatanSessions();
      const loto = await storage.getAllSidakLotoSessions();
      const digital = await storage.getAllSidakDigitalSessions();
      const workshop = await storage.getAllSidakWorkshopSessions();

      const stats = {
        fatigue: fatigue.filter(s => s.createdBy === nik).length,
        roster: roster.filter(s => s.createdBy === nik).length,
        seatbelt: seatbelt.filter(s => s.createdBy === nik).length,
        rambu: rambu.filter(s => s.createdBy === nik).length,
        antrian: antrian.filter(s => s.createdBy === nik).length,
        jarak: jarak.filter(s => s.createdBy === nik).length,
        kecepatan: kecepatan.filter(s => s.createdBy === nik).length,
        loto: ((loto || []) as any[]).filter(s => s.createdBy === nik).length,
        digital: ((digital || []) as any[]).filter(s => s.createdBy === nik).length,
        workshop: ((workshop || []) as any[]).filter(s => s.createdBy === nik).length,
      };

      const total = Object.values(stats).reduce((a, b) => a + b, 0);

      res.json({ ...stats, total });
    } catch (error) {
      console.error("Error fetching sidak stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.post("/api/ai/analyze-statistics", async (req, res) => {
    try {
      const { data } = req.body;

      // Helper to sum arrays
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

      const analysisPrompt = `Analisa data statistik keselamatan pertambangan PT GECL tahun 2026 ini dan berikan 4-5 insight penting:

DATA:
- Total Insiden TI (Total Injury): ${sum(data.ti_incidents || [])}
- Total Insiden Fatigue: ${sum(data.fatigue_incidents || [])}
- Total Menabrak: ${sum(data.menabrak || [])}
- Total Rebah: ${sum(data.rebah || [])}
- Nilai TR (Target Rate): ${data.tr_value || 6.42}
- Data per bulan: Jan-Des ${JSON.stringify({
        ti: data.ti_incidents,
        fatigue: data.fatigue_incidents
      })}

Berikan komentar tentang:
1. Trend insiden sepanjang tahun
2. Bulan dengan insiden tertinggi (jika ada)
3. Apakah rate melebihi target (TR)
4. Rekomendasi untuk tahun berjalan

Format sebagai bullet points singkat per insight.`;

      // Use internal Si Asef logic (simplified version without session management)

      if (!(process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY)) {
        // Fallback response if no API key
        return res.json({
          insights: [
            "Pada tahun 2026, tidak ada insiden terbuka terkait TI, kelelahan, menabrak, atau rebah yang tercatat.",
            "Total Recordable Incident Rate (TRIR) adalah 6.42, yang merupakan indikator keselamatan penting.",
            "Pemantauan terus menerus tetap diperlukan untuk memastikan tidak ada risiko tersembunyi.",
            "Meskipun saat ini tidak ada insiden yang dilaporkan, sangat penting untuk tetap mewaspadai dan melakukan tindakan pencegahan.",
          ]
        });
      }

      const response = await openRouterClient.chat.completions.create({
        model: AI_MODELS.SMART_EXTRACTION,
        messages: [
          { role: "system", content: "Anda adalah analis keselamatan pertambangan berpengalaman dari OneTalent GECL. Berikan analisis singkat dan actionable dalam Bahasa Indonesia." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 500,
      });

      const content = response.choices[0].message.content || "";

      // Parse response into array of insights
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const insights = lines.map(line => line.replace(/^[-•*\d.]+\s*/, '').trim()).filter(l => l.length > 10);

      res.json({ insights: insights.slice(0, 5) });
    } catch (error: any) {
      console.error("AI Analysis Error:", error);
      // Return default insights on error
      res.json({
        insights: [
          "Pada tahun 2026, tidak ada insiden terbuka terkait TI, kelelahan, menabrak, atau rebah yang tercatat. Hal ini menunjukkan bahwa program keselamatan yang diterapkan berhasil menjaga keselamatan pekerja.",
          "Total Recordable Incident Rate (TRIR) adalah 6.42, yang merupakan indikator keselamatan penting. Meskipun tidak ada insiden yang tercatat, angka ini perlu diperhatikan dan dianalisis lebih lanjut.",
          "Sepanjang tahun, semua bulan memiliki jumlah insiden yang sama yaitu nol, menunjukkan tren yang konsisten dalam ketiadaan insiden.",
          "Meskipun saat ini tidak ada insiden yang dilaporkan, sangat penting untuk tetap mewaspadai dan melakukan tindakan pencegahan terutama di area-area yang diketahui memiliki risiko tinggi secara historis."
        ]
      });
    }
  });
  const objectStorageServiceInstance = new ObjectStorageService();

  // Health check endpoint for debugging
  app.get("/api/health", async (req, res) => {
    const buildTime = "2024-12-01T10:02:00Z";
    const checks = {
      status: "ok",
      buildTime,
      version: "1.0.1",
      environment: process.env.NODE_ENV || "unknown",
      databaseUrl: !!process.env.DATABASE_URL,
      timestamp: new Date().toISOString(),
      databaseConnection: "unknown"
    };

    try {
      // Test database connection
      const testResult = await storage.getEmployee("TEST-HEALTH-CHECK");
      checks.databaseConnection = "connected";
    } catch (error: any) {
      checks.databaseConnection = "error: " + (error?.message || "unknown");
      checks.status = "degraded";
    }

    res.json(checks);
  });



  // Setup session middleware for authentication
  await setupAuth(app);

  // ============================================
  // DEBUG ROUTES (TEMPORARY)
  // ============================================
  app.get("/api/debug/rbac", (req, res) => {
    try {
      const { getRoleFromPosition } = require("@shared/rbac");
      const dept = req.query.dept as string;
      const pos = req.query.pos as string;

      console.log(`[DEBUG ENDPOINT] Testing Role for Dept: '${dept}', Pos: '${pos}'`);
      const role = getRoleFromPosition(pos, dept);

      res.json({
        input: { dept, pos },
        calculatedRole: role,
        logicSource: "Live Route Module"
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      console.log("🔐 Login attempt - Content-Type:", req.headers['content-type']);
      console.log("🔐 Login attempt - Request body:", JSON.stringify(req.body));
      console.log("🔐 Login attempt - Body type:", typeof req.body);

      // Check if body is empty or undefined
      if (!req.body || Object.keys(req.body).length === 0) {
        console.error("🔐 Login error: Empty request body");
        return res.status(400).json({
          message: "Request body kosong. Pastikan Content-Type: application/json"
        });
      }

      // Validate request body
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        console.error("🔐 Login validation error:", parseResult.error.errors);
        return res.status(400).json({
          message: "Format data tidak valid: " + parseResult.error.errors.map(e => e.message).join(", ")
        });
      }

      const { nik, password } = parseResult.data;
      console.log("🔐 Looking up user with NIK:", nik);

      // Get auth user from database — retry utk hiccup DNS/koneksi transien (link Railway flaky)
      let authUser;
      {
        let dbError: any = null;
        for (let attempt = 1; attempt <= 4; attempt++) {
          try {
            console.log(`🔐 DB lookup NIK ${nik} (attempt ${attempt})`);
            authUser = await storage.getAuthUserByNik(nik);
            dbError = null;
            break;
          } catch (e: any) {
            dbError = e;
            const transient = /ENOTFOUND|ETIMEDOUT|ECONNRESET|ECONNREFUSED|Connection terminated|getaddrinfo/i.test(e?.message || "");
            console.error(`🔐 DB error (attempt ${attempt}):`, e?.message || e);
            if (!transient || attempt === 4) break;
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
        if (dbError) {
          return res.status(500).json({
            message: "Gagal mengakses database: " + (dbError?.message || "Unknown error"),
            errorType: dbError?.name || "Unknown"
          });
        }
        console.log("🔐 Auth user lookup result:", authUser ? "found" : "not found");
      }

      if (!authUser) {
        console.log("🔐 Login failed - NIK not found:", nik);
        return res.status(401).json({ message: "NIK atau password salah" });
      }

      // Verify password
      let isValidPassword;
      try {
        console.log("🔐 Comparing password...");
        isValidPassword = await bcrypt.compare(password, authUser.hashedPassword);
        console.log("🔐 Password comparison result:", isValidPassword);
      } catch (bcryptError: any) {
        console.error("🔐 bcrypt error:", bcryptError?.message || bcryptError);
        return res.status(500).json({ message: "Gagal memverifikasi password" });
      }

      if (!isValidPassword) {
        console.log("🔐 Login failed - Invalid password for NIK:", nik);
        return res.status(401).json({ message: "NIK atau password salah" });
      }

      // Get employee data for session and response
      let employee;
      try {
        employee = await storage.getEmployee(nik);
        console.log("🔐 Employee lookup result:", employee ? "found" : "not found");
      } catch (empError: any) {
        console.error("🔐 Database error looking up employee:", empError?.message || empError);
        return res.status(500).json({ message: "Gagal mengakses data karyawan" });
      }

      if (!employee) {
        console.log("🔐 Login failed - Employee not found:", nik);
        return res.status(404).json({ message: "Data karyawan tidak ditemukan" });
      }

      // Create user with role and permissions based on position AND department
      const userWithRole = createUserWithRole(employee.id, employee.name, employee.position || null, employee.department || null);

      // Create session with role info - with explicit save
      try {
        (req.session as any).user = userWithRole;

        // Explicitly save session to handle any database errors
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error("🔐 Session save error:", err);
              reject(err);
            } else {
              console.log("🔐 Session saved successfully");
              resolve();
            }
          });
        });
      } catch (sessionError: any) {
        console.error("🔐 Session error:", sessionError?.message || sessionError);
        return res.status(500).json({ message: "Gagal menyimpan session: " + (sessionError?.message || "Unknown") });
      }

      console.log("🔐 Login success for:", nik);
      return res.json({
        message: "Login berhasil",
        user: userWithRole,
      });
    } catch (error: any) {
      console.error("🔐 Unhandled login error:", error?.message || error);
      console.error("🔐 Error stack:", error?.stack);
      return res.status(500).json({ message: "Terjadi kesalahan server: " + (error?.message || "Unknown") });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    try {
      // First clear the user from session
      const session = req.session as any;
      if (session) {
        session.user = null;
      }

      // Then destroy the session
      req.session.destroy((err) => {
        // Clear cookie regardless of destroy result
        res.clearCookie('connect.sid');

        if (err) {
          console.error("Session destroy error (non-blocking):", err);
          // Still return success since we cleared the user
        }

        res.json({ message: "Logout berhasil" });
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      // Fallback: still try to clear cookie and return success
      res.clearCookie('connect.sid');
      res.json({ message: "Logout berhasil" });
    }
  });

  // Get current session
  app.get("/api/auth/session", (req, res) => {
    const user = (req.session as any).user;
    if (user) {
      // ALWAYS refresh role and permissions from current logic
      // This ensures that RBAC changes apply immediately even to active sessions
      const userWithRole = createUserWithRole(user.nik, user.name, user.position || null, user.department || null);

      console.log(`[SESSION DEBUG] NIK: ${user.nik}, Name: ${user.name}`);
      console.log(`[SESSION DEBUG] Stored Dept: '${user.department}', Stored Pos: '${user.position}'`);
      console.log(`[SESSION DEBUG] Calculated Role: ${userWithRole.role}`);

      // Update session if role changed (optimization: could check deep equality but object creation is cheap)
      (req.session as any).user = userWithRole;

      res.json({ authenticated: true, user: userWithRole });
    } else {
      res.json({ authenticated: false, user: null });
    }
  });

  // Reset password endpoint
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      // Check if user is logged in
      const sessionUser = (req.session as any).user;
      if (!sessionUser) {
        return res.status(401).json({ message: "Silakan login terlebih dahulu" });
      }

      const { oldPassword, newPassword } = resetPasswordSchema.parse(req.body);
      const nik = sessionUser.nik;

      // Get auth user
      const authUser = await storage.getAuthUserByNik(nik);
      if (!authUser) {
        return res.status(404).json({ message: "User tidak ditemukan" });
      }

      // Verify old password
      const isValidOldPassword = await bcrypt.compare(oldPassword, authUser.hashedPassword);
      if (!isValidOldPassword) {
        return res.status(401).json({ message: "Password lama salah" });
      }

      // Hash new password and update
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateAuthUserPassword(nik, hashedNewPassword);

      res.json({ message: "Password berhasil diubah" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(400).json({ message: "Invalid reset password request" });
    }
  });

  // Employee routes - OPTIMIZED WITH CACHING
  app.get("/api/employees", async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : 20;
      const search = req.query.search as string;
      const position = req.query.position as string;

      if (page) {
        // Use database pagination when page is specified
        const result = await storage.getEmployeesPaginated(page, perPage, search, position);
        return res.json(result);
      }

      // Check cache first for massive performance improvement (Full List)
      // let employees = getCachedAllEmployees();
      let employees = null; // BYPASS CACHE FOR DEBUGGING

      if (!employees) {
        if (search) {
          // Filtered fetch
          employees = await storage.getEmployeesFiltered(search);
        } else {
          // Full list
          employees = await storage.getAllEmployees();
        }
        setCachedAllEmployees(employees);
      }

      if (position && position.trim()) {
        employees = employees.filter(e => e.position === position);
      }

      // Return as object for backward compatibility with some frontend parts
      return res.json({
        data: employees,
        total: employees.length
      });
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    // Store ID for error messages (outside try block for catch block access)
    let employeeIdForMsg = req.body?.id;

    try {
      // Trim employee ID to prevent duplicate records caused by trailing/leading spaces
      if (req.body?.id) req.body.id = req.body.id.trim();
      const validatedData = insertEmployeeSchema.parse(req.body);
      employeeIdForMsg = validatedData.id; // Update with validated ID

      // Clear employee caches since we're adding new data
      clearAllCaches();

      // Generate QR Code token for the employee
      const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';
      const tokenData = `${validatedData.id || ''}${secretKey}Attend`;
      const qrToken = Buffer.from(tokenData).toString('base64').slice(0, 16)
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // Make URL-safe
      // Create URL yang mengarah ke aplikasi untuk QR Code
      const baseUrl = process.env.PUBLIC_BASE_URL
        || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : null)
        || `${req.protocol}://${req.get('host')}`;

      // Create JSON format for internal app QR scanner (original format)
      const qrPayload = {
        id: validatedData.id,
        token: qrToken
      };
      const qrData = JSON.stringify(qrPayload);
      const employeeWithQR = {
        ...validatedData,
        qrCode: qrData // JSON format untuk sistem internal
      };

      const employee = await storage.createEmployee(employeeWithQR);

      // Also create QR token record
      await storage.createQrToken({
        employeeId: employee.id,
        token: qrToken,
        isActive: true
      });

      // Automatically create auth user with default password for new employee
      const defaultPassword = "12345678";
      const hashedDefaultPassword = await bcrypt.hash(defaultPassword, 10);
      await storage.createAuthUser(employee.id, hashedDefaultPassword);
      console.log(`✅ Created auth user for new employee: ${employee.id} with default password`);

      res.status(201).json(employee);
    } catch (error) {
      console.error('Error creating employee:', error);

      // Check for duplicate key error
      if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
        const detail = 'detail' in error ? String(error.detail) : '';
        if (detail.includes('id')) {
          return res.status(400).json({
            message: `ID Karyawan ${employeeIdForMsg || 'tersebut'} sudah digunakan. Silakan gunakan ID yang berbeda.`
          });
        }
      }

      if (error instanceof Error && error.name === 'ZodError') {
        const zodError = error as any;
        const errorMessages = zodError.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("❌ Zod validation errors:", errorMessages);
        console.error("Payload received:", JSON.stringify(req.body, null, 2));
        return res.status(400).json({
          message: `Validasi gagal. Periksa data berikut: ${errorMessages}`,
          details: zodError.errors
        });
      }

      const errorMessage = error instanceof Error ? error.message : "Kesalahan tidak diketahui";
      res.status(400).json({ message: `Data karyawan tidak valid: ${errorMessage}` });
    }

  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      console.log(`Updating employee ${req.params.id} with data:`, req.body);

      // Validate request data
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      console.log('Validated data:', validatedData);

      // Update employee in database
      const employee = await storage.updateEmployee(req.params.id, validatedData);

      // Clear employee caches immediately after update (even if employee is null)
      // This ensures cache coherence in all cases
      clearAllCaches();
      console.log('🧹 Caches cleared after employee update');
      console.log('Update result:', employee);

      if (!employee) {
        console.log('Employee not found');
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      // Ensure response object is valid
      if (typeof res.json !== 'function') {
        console.error('res.json is not a function - response object corrupted');
        return res.status(500).send('Internal server error');
      }

      console.log('Sending successful response');
      res.json(employee);
    } catch (error) {
      console.error('Error updating employee:', error);

      // Check if response object is still valid
      if (typeof res.json === 'function') {
        res.status(400).json({
          message: "Invalid employee data",
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } else {
        console.error('Cannot send error response - res.json not available');
        res.status(500).send('Internal server error');
      }
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);

      // Clear employee caches immediately after delete attempt
      // This ensures cache coherence even if employee wasn't found
      clearAllCaches();
      console.log('🧹 Caches cleared after employee deletion');

      if (!deleted) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      res.status(204).send();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Error deleting employee ${req.params.id}:`, errMsg);
      res.status(500).json({ message: `Failed to delete employee: ${errMsg}` });
    }
  });

  // Delete all employees, optionally filtered by positions (?positions=Driver,Mechanic)
  app.delete("/api/employees", async (req, res) => {
    try {
      const positionsParam = req.query.positions as string | undefined;
      const positions = positionsParam
        ? positionsParam.split(",").map(p => p.trim()).filter(Boolean)
        : undefined;
      const deleted = await storage.deleteAllEmployees(positions);
      if (deleted) {
        const msg = positions && positions.length > 0
          ? `Semua karyawan dengan posisi ${positions.join(", ")} berhasil dihapus`
          : "Semua data karyawan berhasil dihapus";
        res.json({ message: msg });
      } else {
        res.status(500).json({ message: "Gagal menghapus data karyawan" });
      }
    } catch (error: any) {
      console.error("Error deleting all employees:", error);
      const detail = error?.message || error?.detail || String(error);
      res.status(500).json({ message: `Failed to delete: ${detail}` });
    }
  });

  // Bulk upload employees
  app.post("/api/employees/bulk", async (req, res) => {
    try {
      const { employees: employeeData } = req.body;

      if (!Array.isArray(employeeData)) {
        return res.status(400).json({ message: "Invalid employee data format" });
      }

      const { db } = await import('./db');
      const { employees: employeesTable } = await import('@shared/schema');

      const successes: any[] = [];
      const failures: { row: number; nik: string; reason: string }[] = [];
      const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';

      for (let i = 0; i < employeeData.length; i++) {
        const emp = employeeData[i];
        try {
          if (emp?.id) emp.id = emp.id.trim();
          const validatedEmployee = insertEmployeeSchema.parse(emp);

          const tokenData = `${validatedEmployee.id || ''}${secretKey}Attend`;
          const qrToken = Buffer.from(tokenData).toString('base64').slice(0, 16);
          const qrData = JSON.stringify({ id: validatedEmployee.id, token: qrToken });

          const employeeWithQR = { ...validatedEmployee, qrCode: qrData };

          // UPSERT: kalau NIK sudah ada, update data-nya
          const [employee] = await db
            .insert(employeesTable)
            .values(employeeWithQR as any)
            .onConflictDoUpdate({
              target: employeesTable.id,
              set: {
                name: employeeWithQR.name,
                position: employeeWithQR.position,
                department: employeeWithQR.department,
                investorGroup: employeeWithQR.investorGroup,
                phone: employeeWithQR.phone,
                status: employeeWithQR.status,
                qrCode: qrData,
              },
            })
            .returning();

          // Pastikan ada QR token aktif (delete lama, insert baru biar pasti)
          try {
            await db.execute(sql`DELETE FROM qr_tokens WHERE employee_id = ${employee.id}`);
            await storage.createQrToken({ employeeId: employee.id, token: qrToken, isActive: true });
          } catch (_) {}

          successes.push(employee);
        } catch (err: any) {
          const reason = err?.message || err?.detail || String(err);
          console.error(`Bulk import row ${i + 2} (NIK: ${emp?.id}):`, reason);
          failures.push({
            row: i + 2, // +2 karena baris 1 = header, dan index 0-based
            nik: emp?.id || '(kosong)',
            reason: reason.slice(0, 200),
          });
        }
      }

      clearAllCaches();

      res.json({
        message: `Berhasil ${successes.length} dari ${employeeData.length} karyawan${failures.length > 0 ? `, ${failures.length} gagal` : ''}`,
        successCount: successes.length,
        failureCount: failures.length,
        failures,
        employees: successes,
      });
    } catch (error: any) {
      console.error("Error bulk uploading employees:", error);
      res.status(500).json({ message: error?.message || "Failed to upload employees" });
    }
  });

  // === Employee Family Members ===
  app.get("/api/employees/:id/family-members", async (req, res) => {
    try {
      const list = await storage.getEmployeeFamilyMembers(req.params.id);
      res.json(list);
    } catch (error) {
      console.error("Error fetching family members:", error);
      res.status(500).json({ message: "Failed to fetch family members" });
    }
  });

  app.post("/api/employees/:id/family-members", async (req, res) => {
    try {
      const data = insertEmployeeFamilyMemberSchema.parse({ ...req.body, employeeId: req.params.id });
      const created = await storage.createEmployeeFamilyMember(data);
      res.status(201).json(created);
    } catch (error: any) {
      console.error("Error creating family member:", error);
      res.status(400).json({ message: error?.message || "Failed to create family member" });
    }
  });

  app.put("/api/family-members/:id", async (req, res) => {
    try {
      const data = insertEmployeeFamilyMemberSchema.partial().parse(req.body);
      const updated = await storage.updateEmployeeFamilyMember(req.params.id, data);
      if (!updated) return res.status(404).json({ message: "Family member not found" });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating family member:", error);
      res.status(400).json({ message: error?.message || "Failed to update family member" });
    }
  });

  app.delete("/api/family-members/:id", async (req, res) => {
    try {
      await storage.deleteEmployeeFamilyMember(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting family member:", error);
      res.status(500).json({ message: "Failed to delete family member" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const date = req.query.date as string;
      console.log(`Fetching attendance records for date: ${date || 'all'}`);
      const attendance = await storage.getAllAttendance(date);
      console.log(`Found ${attendance.length} attendance records`);
      res.json(attendance);
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      res.status(500).json({ message: "Failed to fetch attendance records" });
    }
  });

  app.get("/api/attendance/employee/:employeeId", async (req, res) => {
    try {
      const date = req.query.date as string;
      const attendance = await storage.getAttendanceByEmployee(req.params.employeeId, date);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee attendance" });
    }
  });

  app.post("/api/attendance", async (req, res) => {
    try {
      const validatedData = insertAttendanceSchema.parse(req.body);

      // Use cache for employee data, parallel queries for the rest
      let employee = getCachedEmployee(validatedData.employeeId);

      if (!employee) {
        // Employee not cached, fetch with parallel queries
        const [employeeData, existingAttendance, roster, leaveRequests] = await Promise.all([
          storage.getEmployee(validatedData.employeeId),
          storage.getAttendanceByEmployee(validatedData.employeeId, validatedData.date),
          storage.getRosterByDate(validatedData.date),
          storage.getLeaveByEmployee(validatedData.employeeId)
        ]);
        employee = employeeData;
        if (employee) setCachedEmployee(validatedData.employeeId, employee);
        var attendance = existingAttendance;
        var rosterData = roster;
        var leaves = leaveRequests;
      } else {
        // Employee cached, only fetch other data
        const [existingAttendance, roster, leaveRequests] = await Promise.all([
          storage.getAttendanceByEmployee(validatedData.employeeId, validatedData.date),
          storage.getRosterByDate(validatedData.date),
          storage.getLeaveByEmployee(validatedData.employeeId)
        ]);
        var attendance = existingAttendance;
        var rosterData = roster;
        var leaves = leaveRequests;
      }

      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      if (attendance.length > 0) {
        return res.status(400).json({ message: "Karyawan sudah melakukan absensi hari ini" });
      }

      const scheduledEmployee = rosterData.find(r => r.employeeId === validatedData.employeeId);
      if (!scheduledEmployee) {
        return res.status(400).json({ message: "Karyawan tidak dijadwalkan untuk hari ini" });
      }

      // Validasi status roster berdasarkan kolom "Shift"
      if (scheduledEmployee.shift === "CUTI") {
        return res.status(400).json({
          message: "Absensi ditolak. Status Anda CUTI sesuai roster.",
          rosterStatus: "CUTI",
          employeeId: validatedData.employeeId,
          date: validatedData.date
        });
      }

      if (scheduledEmployee.shift === "OVERSHIFT") {
        return res.status(400).json({
          message: "Absensi ditolak. Status Anda OVERSHIFT sesuai roster.",
          rosterStatus: "OVERSHIFT",
          employeeId: validatedData.employeeId,
          date: validatedData.date
        });
      }

      // Hanya terima absensi untuk Shift 1 dan Shift 2
      if (scheduledEmployee.shift !== "SHIFT 1" && scheduledEmployee.shift !== "SHIFT 2") {
        return res.status(400).json({
          message: `Absensi ditolak. Status roster tidak valid: ${scheduledEmployee.shift}. Hanya Shift 1 dan Shift 2 yang dapat melakukan absensi.`,
          rosterStatus: scheduledEmployee.shift,
          employeeId: validatedData.employeeId,
          date: validatedData.date
        });
      }

      const leaveRequests = leaves;
      const approvedLeave = leaveRequests.find(leave =>
        leave.status === 'approved' &&
        validatedData.date >= leave.startDate &&
        validatedData.date <= leave.endDate
      );

      if (approvedLeave) {
        return res.status(400).json({
          message: "Scan ditolak: karyawan sedang cuti",
          leaveDetails: {
            type: approvedLeave.leaveType,
            startDate: approvedLeave.startDate,
            endDate: approvedLeave.endDate
          }
        });
      }

      // Get current time for precise shift validation (menggunakan waktu Indonesia WIB/WITA)
      const now = new Date();
      // Convert to Indonesia timezone (WITA UTC+8)
      const indonesiaOffset = 8 * 60; // 8 hours in minutes
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const indonesiaTime = new Date(utc + (indonesiaOffset * 60000));
      const currentTime = `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')}`;

      console.log(`Validating shift for ${validatedData.employeeId}: Current time ${currentTime}, Scheduled ${scheduledEmployee.shift} (${scheduledEmployee.startTime} - ${scheduledEmployee.endTime})`);

      // Strict shift validation based on shift name (more reliable than roster times)
      const isValidTiming = isValidShiftTimeByName(currentTime, scheduledEmployee.shift);

      console.log(`Shift validation result: ${isValidTiming}`);

      if (!isValidTiming) {
        const timeRange = getShiftTimeRange(scheduledEmployee.shift);
        const isCompletelyOutside = isCompletelyOutsideShiftTimes(currentTime);

        let errorMessage;
        if (isCompletelyOutside) {
          errorMessage = `❌ ABSENSI DITOLAK - Diluar jam kerja! Waktu sekarang: ${currentTime}. Jam kerja: Shift 1 (05:00-15:30) atau Shift 2 (16:00-20:00)`;
        } else {
          errorMessage = `❌ ABSENSI DITOLAK - Tidak sesuai shift! Anda dijadwalkan ${scheduledEmployee.shift} (${timeRange.start}-${timeRange.end}). Waktu sekarang: ${currentTime}`;
        }

        return res.status(400).json({
          message: errorMessage,
          currentTime: currentTime,
          scheduledShift: scheduledEmployee.shift,
          allowedTimeRange: `${timeRange.start} - ${timeRange.end}`,
          errorType: isCompletelyOutside ? 'OUTSIDE_WORK_HOURS' : 'WRONG_SHIFT_TIME'
        });
      }

      // Update nomor lambung jika ada field nomorLambungBaru
      if (req.body.nomorLambungBaru) {
        try {
          // Get current employee data to check if they were originally SPARE
          const currentEmployee = await storage.getEmployee(validatedData.employeeId);
          const updateData: any = {
            nomorLambung: req.body.nomorLambungBaru
          };

          // If employee currently has nomor lambung "SPARE", mark them as spare origin
          if (currentEmployee && currentEmployee.nomorLambung === "SPARE") {
            updateData.isSpareOrigin = true;
            console.log(`Setting isSpareOrigin=true for employee ${validatedData.employeeId} (originally SPARE)`);
          }

          await storage.updateEmployee(validatedData.employeeId, updateData);

          // CRITICAL: Clear ALL employee caches since roster uses getAllEmployees
          clearCachedEmployee(validatedData.employeeId);
          allEmployeesCache.clear(); // Clear the all employees cache
          rosterCache.clear(); // Clear roster cache to force refresh

          console.log(`Updated nomor lambung for employee ${validatedData.employeeId} to: ${req.body.nomorLambungBaru}`);
          console.log(`🧹 Cleared all employee and roster caches to show updated nomor lambung`);
        } catch (updateError) {
          console.error('Error updating employee nomor lambung:', updateError);
          // Continue with attendance creation even if update fails
        }
      }

      const record = await storage.createAttendanceRecord(validatedData);
      res.status(201).json(record);
    } catch (error) {
      res.status(400).json({ message: "Invalid attendance data" });
    }
  });

  // Roster routes - OPTIMIZED FOR PERFORMANCE
  app.get("/api/roster", async (req, res) => {
    try {
      const date = req.query.date as string;
      const employeeId = req.query.employeeId as string;

      // Jika ada employeeId, ambil semua roster untuk employee tersebut
      if (employeeId) {
        const employeeRoster = await storage.getRosterByEmployee(employeeId);
        const leaveMonitoring = await storage.getAllLeaveRosterMonitoring();

        // OPTIMIZED: Create Map for O(1) lookup instead of O(n) find
        const leaveMonitoringMap = new Map(
          leaveMonitoring.map(leave => [leave.nik, leave])
        );

        // Enrich roster dengan data leave monitoring (hari kerja)
        const enrichedRoster = employeeRoster.map(schedule => {
          const leaveRecord = leaveMonitoringMap.get(schedule.employeeId);

          return {
            ...schedule,
            workDays: leaveRecord?.monitoringDays || null // Monitoring hari dari leave roster
          };
        });

        return res.json(enrichedRoster);
      }

      // Jika tidak ada employeeId, maka wajib ada date parameter
      if (!date) {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      console.time("📊 Roster API Performance");
      console.log(`🔄 Fetching roster data for date: ${date}`);

      // OPTIMIZED: Use cached data when available + parallel fetch
      const cachedRoster = getCachedRoster(date);
      const cachedEmployees = getCachedAllEmployees();
      const cachedLeaveMonitoring = getCachedLeaveMonitoring();

      const promises = [];

      // Only fetch what's not in cache
      if (cachedRoster) {
        promises.push(Promise.resolve(cachedRoster));
      } else {
        promises.push(storage.getRosterByDate(date));
      }

      // Always fetch attendance (changes frequently)
      promises.push(storage.getAllAttendance(date));

      if (cachedLeaveMonitoring) {
        promises.push(Promise.resolve(cachedLeaveMonitoring));
      } else {
        promises.push(storage.getAllLeaveRosterMonitoring());
      }

      if (cachedEmployees) {
        promises.push(Promise.resolve(cachedEmployees));
      } else {
        promises.push(storage.getAllEmployees());
      }

      const [roster, attendance, leaveMonitoring, allEmployees] = await Promise.all(promises);

      // Cache the data we just fetched
      if (!cachedRoster) setCachedRoster(date, roster);
      if (!cachedLeaveMonitoring) setCachedLeaveMonitoring(leaveMonitoring);
      if (!cachedEmployees) setCachedAllEmployees(allEmployees);

      console.log(`📋 Fetched ${roster.length} roster entries, ${attendance.length} attendance records`);

      // OPTIMIZED: Create Maps for O(1) lookups instead of O(n) finds
      const attendanceMap = new Map(
        attendance.map(att => [att.employeeId, att])
      );
      const leaveMonitoringMap = new Map(
        leaveMonitoring.map(leave => [leave.nik, leave])
      );
      const employeesMap = new Map(
        allEmployees.map(emp => [emp.id, emp])
      );

      console.log("🚀 Starting roster enrichment with Map lookups");

      // OPTIMIZED: O(1) map lookups instead of O(n) find operations
      const enrichedRoster = roster.map(schedule => {
        const attendanceRecord = attendanceMap.get(schedule.employeeId);
        const leaveRecord = leaveMonitoringMap.get(schedule.employeeId);
        const employee = employeesMap.get(schedule.employeeId);

        return {
          ...schedule,
          employee: employee, // Add complete employee data
          hasAttended: !!attendanceRecord,
          attendanceTime: attendanceRecord?.time || null,
          actualJamTidur: attendanceRecord?.jamTidur || schedule.jamTidur,
          actualFitToWork: attendanceRecord?.fitToWork || schedule.fitToWork,
          attendanceStatus: attendanceRecord ? "present" : "absent",
          workDays: leaveRecord?.monitoringDays || null // Monitoring hari dari leave roster
        };
      });

      console.timeEnd("📊 Roster API Performance");
      console.log(`✅ Roster enrichment completed: ${enrichedRoster.length} entries`);

      res.json(enrichedRoster);
    } catch (error) {
      console.error("❌ Roster API Error:", error);
      res.status(500).json({ message: "Failed to fetch roster" });
    }
  });

  app.get("/api/roster/employee/:employeeId", async (req, res) => {
    try {
      const roster = await storage.getRosterByEmployee(req.params.employeeId);
      res.json(roster);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee roster" });
    }
  });

  // Monthly roster endpoint - untuk kalender bulanan
  app.get("/api/roster/monthly", async (req, res) => {
    try {
      const year = req.query.year as string;
      const month = req.query.month as string;
      const employeeId = req.query.employeeId as string; // Server-side filtering parameter

      if (!year || !month) {
        return res.status(400).json({ message: "Year and month parameters are required" });
      }

      // Dapatkan first dan last date dari bulan tersebut
      const firstDay = `${year}-${month.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const lastDayStr = `${year}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

      console.log(`🗓️ Fetching monthly roster for ${year}-${month} (${firstDay} to ${lastDayStr})${employeeId ? ` for employee ${employeeId}` : ''}`);

      // Fetch roster untuk bulan tersebut
      let roster = await storage.getRosterByDateRange(firstDay, lastDayStr);

      // SERVER-SIDE FILTERING: Filter by employeeId jika parameter diberikan (SECURITY & EFFICIENCY)
      if (employeeId) {
        roster = roster.filter(schedule => schedule.employeeId === employeeId);
        console.log(`🔒 Filtered to ${roster.length} entries for employee ${employeeId}`);
      }

      const allEmployees = await storage.getAllEmployees();
      const attendance = await storage.getAllAttendanceByDateRange(firstDay, lastDayStr);

      // Create Maps untuk O(1) lookup
      const employeesMap = new Map(allEmployees.map(emp => [emp.id, emp]));
      const attendanceMap = new Map();

      // Group attendance by date dan employeeId
      attendance.forEach(att => {
        const key = `${att.date}-${att.employeeId}`;
        attendanceMap.set(key, att);
      });

      // Enrich roster dengan employee data dan attendance
      const enrichedRoster = roster.map(schedule => {
        const employee = employeesMap.get(schedule.employeeId);
        const attendanceKey = `${schedule.date}-${schedule.employeeId}`;
        const attendanceRecord = attendanceMap.get(attendanceKey);

        return {
          ...schedule,
          employee: employee,
          hasAttended: !!attendanceRecord,
          attendanceTime: attendanceRecord?.time || null,
          actualJamTidur: attendanceRecord?.jamTidur || schedule.jamTidur,
          actualFitToWork: attendanceRecord?.fitToWork || schedule.fitToWork,
          attendanceStatus: attendanceRecord ? "present" : "absent"
        };
      });

      console.log(`✅ Monthly roster fetched: ${enrichedRoster.length} entries`);
      res.json(enrichedRoster);
    } catch (error) {
      console.error("❌ Monthly Roster API Error:", error);
      res.status(500).json({ message: "Failed to fetch monthly roster" });
    }
  });

  app.post("/api/roster", async (req, res) => {
    try {
      const validatedData = insertRosterSchema.parse(req.body);

      // Clear roster cache since we're adding new data
      rosterCache.clear();

      // Check if employee exists
      const employee = await storage.getEmployee(validatedData.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      const schedule = await storage.createRosterSchedule(validatedData);

      // Trigger report cache invalidation
      await triggerReportUpdate();

      res.status(201).json(schedule);
    } catch (error) {
      res.status(400).json({ message: "Invalid roster data" });
    }
  });

  app.post("/api/roster/bulk", async (req, res) => {
    try {
      const { rosters } = req.body;
      if (!Array.isArray(rosters)) {
        return res.status(400).json({ message: "Rosters must be an array" });
      }

      console.log(`Starting bulk upload of ${rosters.length} entries`);

      // Debug: Log 5 data pertama yang diterima server
      console.log('=== SERVER RECEIVED DATA ===');
      rosters.slice(0, 5).forEach((roster, index) => {
        console.log(`${index + 1}. NIK: ${roster.employeeId}, Date: ${roster.date}, Shift: ${roster.shift}`);
        console.log(`    Jam Tidur: "${roster.jamTidur}", Hari Kerja: "${roster.hariKerja}", Fit To Work: "${roster.fitToWork}"`);
      });

      const validatedRosters = [];
      const errors = [];
      const batchSize = 200; // Increase batch size significantly

      // Pre-load all employees to avoid repeated database queries
      const allEmployees = await storage.getAllEmployees();
      const employeeMap = new Map(allEmployees.map(emp => [emp.id, emp]));

      // Process in larger batches for better performance
      for (let batchStart = 0; batchStart < rosters.length; batchStart += batchSize) {
        const batch = rosters.slice(batchStart, batchStart + batchSize);

        // Validate batch without logging each entry
        for (let i = 0; i < batch.length; i++) {
          const globalIndex = batchStart + i;
          try {
            const rawData = batch[i]; // Keep raw data for employee creation
            const validatedData = insertRosterSchema.parse(batch[i]);


            // Check if employee exists in pre-loaded map
            const existingEmployee = employeeMap.get(validatedData.employeeId);
            const employeeName = rawData.employeeName || rawData.name || `Employee ${validatedData.employeeId}`;
            const nomorLambung = rawData.nomorLambung || rawData.nomor_lambung || null;

            if (!existingEmployee) {
              // Create new employee using data from Excel upload
              try {
                const newEmployee = await storage.createEmployee({
                  id: validatedData.employeeId,
                  name: employeeName,
                  nomorLambung: nomorLambung,
                  phone: '+628123456789',
                  status: 'active'
                });
                employeeMap.set(validatedData.employeeId, newEmployee);

                // Log employee creation with nomor lambung
                console.log(`Created employee: ${validatedData.employeeId} - ${employeeName} (${nomorLambung || 'No Nomor Lambung'})`);
              } catch (createError) {
                errors.push(`Baris ${globalIndex + 1}: Gagal membuat karyawan`);
                continue;
              }
            } else {
              // Update existing employee with nomor lambung if provided and different
              if (nomorLambung && existingEmployee.nomorLambung !== nomorLambung) {
                try {
                  await storage.updateEmployee(validatedData.employeeId, {
                    nomorLambung: nomorLambung
                  });
                  // Update the map with new data
                  employeeMap.set(validatedData.employeeId, {
                    ...existingEmployee,
                    nomorLambung: nomorLambung
                  });
                  console.log(`Updated employee nomor lambung: ${validatedData.employeeId} - ${nomorLambung}`);
                } catch (updateError) {
                  console.log(`Failed to update nomor lambung for ${validatedData.employeeId}`);
                }
              }
            }

            validatedRosters.push(validatedData);
          } catch (error) {
            errors.push(`Baris ${globalIndex + 1}: Data tidak valid`);
          }
        }

        // Only log progress every 2000 rows
        if ((batchStart + batchSize) % 2000 === 0 || batchStart + batchSize >= rosters.length) {
          console.log(`Validated ${Math.min(batchStart + batchSize, rosters.length)} / ${rosters.length}`);
        }
      }

      if (errors.length > 0 && errors.length === rosters.length) {
        return res.status(400).json({
          message: "Semua data tidak valid",
          errors: errors.slice(0, 5)
        });
      }

      console.log(`Creating ${validatedRosters.length} schedules using optimized bulk insert...`);

      // Use the new optimized bulk insert method
      const createdSchedules = await storage.bulkCreateRosterSchedules(validatedRosters);

      console.log(`Created ${createdSchedules.length} schedules successfully`);

      // Trigger cache invalidation
      await triggerReportUpdate();

      console.log(`Completed: ${createdSchedules.length} created`);

      // Debug: Verifikasi beberapa data yang tersimpan di database
      if (createdSchedules.length > 0) {
        console.log('=== DATABASE SAVED DATA ===');
        const sampleSaved = createdSchedules.slice(0, 5);
        sampleSaved.forEach((saved, index) => {
          console.log(`${index + 1}. NIK: ${saved.employeeId}, Date: ${saved.date}, Shift: ${saved.shift}, Hari Kerja: ${saved.hariKerja}`);
        });
      }

      res.status(201).json({
        message: `${createdSchedules.length} roster berhasil ditambahkan`,
        created: createdSchedules.length,
        total: rosters.length,
        errors: errors.length > 0 ? errors.slice(0, 3) : undefined
      });
    } catch (error) {
      console.error('Bulk upload error:', error);
      res.status(500).json({ message: "Failed to bulk create roster" });
    }
  });

  // Update employee schedule for a specific month
  app.post("/api/roster/update-employee-schedule", async (req, res) => {
    try {
      const { employeeId, month, rosters } = req.body;

      // Validate input
      if (!employeeId || !month || !Array.isArray(rosters)) {
        return res.status(400).json({
          message: "Data tidak lengkap. Diperlukan: employeeId, month (YYYY-MM), dan rosters array"
        });
      }

      // Validate month format (YYYY-MM)
      const monthRegex = /^\d{4}-\d{2}$/;
      if (!monthRegex.test(month)) {
        return res.status(400).json({
          message: "Format bulan tidak valid. Gunakan format YYYY-MM (contoh: 2025-10)"
        });
      }

      // Get employee to validate
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({
          message: `Karyawan dengan ID ${employeeId} tidak ditemukan`
        });
      }

      // Validate all rosters are for the same employee
      const invalidRosters = rosters.filter(r => r.employeeId !== employeeId);
      if (invalidRosters.length > 0) {
        return res.status(400).json({
          message: `Excel harus berisi jadwal untuk ${employee.name} (${employeeId}) saja. Ditemukan ${invalidRosters.length} baris dengan NIK berbeda.`
        });
      }

      // Validate rosters data
      const validatedRosters = [];
      for (const roster of rosters) {
        try {
          const validatedData = insertRosterSchema.parse(roster);

          // Check if date is in the specified month
          if (!validatedData.date.startsWith(month)) {
            return res.status(400).json({
              message: `Tanggal ${validatedData.date} tidak berada di bulan ${month}`
            });
          }

          validatedRosters.push(validatedData);
        } catch (error) {
          return res.status(400).json({
            message: `Data roster tidak valid untuk tanggal ${roster.date}`
          });
        }
      }

      // CRITICAL: Check for empty rosters to prevent data loss
      if (validatedRosters.length === 0) {
        return res.status(400).json({
          message: `Tidak ada jadwal valid ditemukan di Excel. Tidak ada perubahan yang dilakukan untuk menghindari penghapusan data.`
        });
      }

      console.log(`🔄 Updating schedule for ${employee.name} (${employeeId}) in ${month}`);
      console.log(`📅 Total ${validatedRosters.length} jadwal akan di-update`);

      const startDate = `${month}-01`;
      const year = parseInt(month.split('-')[0]);
      const monthNum = parseInt(month.split('-')[1]);
      const lastDay = new Date(year, monthNum, 0).getDate();
      const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

      // Step 1: INSERT new rosters FIRST (before deleting old ones)
      const createdSchedules = [];
      const insertErrors: string[] = [];

      for (const rosterData of validatedRosters) {
        try {
          const created = await storage.createRosterSchedule(rosterData);
          createdSchedules.push(created);
        } catch (error) {
          const errorMsg = `Gagal insert roster untuk tanggal ${rosterData.date}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.error(errorMsg);
          insertErrors.push(errorMsg);
        }
      }

      // CRITICAL: Only proceed with deletion if ALL insertions succeeded
      if (insertErrors.length > 0) {
        // Rollback: delete the newly created schedules
        console.log(`❌ Rollback: Deleting ${createdSchedules.length} partially inserted schedules`);
        for (const schedule of createdSchedules) {
          try {
            await storage.deleteRosterSchedule(schedule.id);
          } catch (rollbackError) {
            console.error(`Error during rollback for schedule ${schedule.id}:`, rollbackError);
          }
        }

        return res.status(500).json({
          message: `Gagal update jadwal: ${insertErrors.length} dari ${validatedRosters.length} jadwal gagal disimpan. Tidak ada perubahan dilakukan.`,
          errors: insertErrors.slice(0, 5) // Show first 5 errors
        });
      }

      // Step 2: Delete old rosters ONLY after successful insertion
      const createdIds = new Set(createdSchedules.map((s: any) => s.id));
      const allRosters = await storage.getRosterByDateRange(startDate, endDate);
      const rostersToDelete = allRosters.filter((r: any) => r.employeeId === employeeId && !createdIds.has(r.id));

      const debugData = {
        createdIds: Array.from(createdIds),
        myRostersCount: 0,
        myRostersIds: [] as string[]
      };

      console.log(`[DEBUG] createdIds size: ${createdIds.size}, createdIds: ${Array.from(createdIds).join(', ')}`);
      if (allRosters.length > 0) {
        const myRosters = allRosters.filter((r: any) => r.employeeId === employeeId);
        debugData.myRostersCount = myRosters.length;
        debugData.myRostersIds = myRosters.map((r: any) => r.id);
        console.log(`[DEBUG] Found ${myRosters.length} rosters for ${employeeId} in month. IDs: ${myRosters.map((r: any) => r.id).join(', ')}`);
      }
      console.log(`🗑️ Deleting ${rostersToDelete.length} existing rosters for ${month}`);

      for (const roster of rostersToDelete) {
        await storage.deleteRosterSchedule(roster.id);
      }

      console.log(`✅ Successfully updated ${createdSchedules.length} rosters for ${month}`);

      // Trigger cache invalidation
      clearAllCaches();
      await triggerReportUpdate();

      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = monthNames[monthNum - 1];

      res.json({
        message: `Berhasil update ${createdSchedules.length} jadwal untuk ${employee?.name || employeeId} di ${monthName} ${year}`,
        employee: {
          id: employee?.id,
          name: employee?.name || employeeId
        },
        month: month,
        deleted: rostersToDelete.length,
        created: createdSchedules.length,
        rosters: createdSchedules,
        debug: debugData
      });
    } catch (error) {
      console.error('Update employee schedule error:', error);
      res.status(500).json({
        message: "Gagal update jadwal karyawan",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.put("/api/roster/:id", async (req, res) => {
    try {
      const validatedData = insertRosterSchema.partial().parse(req.body);

      // Auto-update startTime dan endTime jika shift berubah
      if (validatedData.shift) {
        if (validatedData.shift === "Shift 1") {
          validatedData.startTime = "06:00";
          validatedData.endTime = "16:00";
        } else if (validatedData.shift === "Shift 2") {
          validatedData.startTime = "16:30";
          validatedData.endTime = "20:00";
        }
      }

      const schedule = await storage.updateRosterSchedule(req.params.id, validatedData);
      if (!schedule) {
        return res.status(404).json({ message: "Roster tidak ditemukan" });
      }

      // Trigger report cache invalidation
      await triggerReportUpdate();

      res.json(schedule);
    } catch (error) {
      res.status(400).json({ message: "Invalid roster data" });
    }
  });

  // PATCH endpoint for updating nomor lambung (today only)
  app.patch("/api/roster/:id/update-nomor-lambung", async (req, res) => {
    try {
      const { actualNomorLambung } = req.body;

      if (!actualNomorLambung || typeof actualNomorLambung !== 'string') {
        return res.status(400).json({ message: "actualNomorLambung harus diisi" });
      }

      // Get the roster schedule
      const schedule = await storage.getRosterSchedule(req.params.id);
      if (!schedule) {
        return res.status(404).json({ message: "Roster tidak ditemukan" });
      }

      // Validate it's today's date only
      const today = new Date().toISOString().split('T')[0];
      if (schedule.date !== today) {
        return res.status(403).json({
          message: "Hanya bisa update nomor lambung untuk hari ini saja",
          rosterDate: schedule.date,
          today: today
        });
      }

      // Update only actualNomorLambung
      const updatedSchedule = await storage.updateRosterSchedule(req.params.id, {
        actualNomorLambung
      });

      if (!updatedSchedule) {
        return res.status(404).json({ message: "Gagal update nomor lambung" });
      }

      // CRITICAL: Invalidate roster cache for this date so UI gets fresh data
      rosterCache.delete(schedule.date);
      allEmployeesCache.clear(); // Clear employee cache as nomor lambung is part of enrichment
      console.log(`🧹 Cleared roster cache for ${schedule.date} after nomor lambung update`);

      // Trigger report cache invalidation
      await triggerReportUpdate();

      res.json({
        message: "Nomor lambung berhasil diupdate",
        schedule: updatedSchedule
      });
    } catch (error) {
      console.error("Error updating nomor lambung:", error);
      res.status(500).json({ message: "Gagal update nomor lambung" });
    }
  });

  // Delete all roster data - must come BEFORE the :id route to avoid conflict
  app.delete("/api/roster/delete-all", async (req, res) => {
    try {
      await storage.deleteAllRosterSchedules();

      // Trigger report cache invalidation
      await triggerReportUpdate();

      res.json({ message: "Semua data roster berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting all roster data:", error);
      res.status(500).json({ message: "Gagal menghapus semua data roster" });
    }
  });

  app.delete("/api/roster/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRosterSchedule(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Roster tidak ditemukan" });
      }

      // Trigger report cache invalidation
      await triggerReportUpdate();

      res.status(200).json({ message: "Roster berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete roster" });
    }
  });


  // Leave routes
  app.get("/api/leave", async (req, res) => {
    try {
      const leaves = await storage.getAllLeaveRequests();
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave requests" });
    }
  });

  app.get("/api/leave/employee/:employeeId", async (req, res) => {
    try {
      const leaves = await storage.getLeaveByEmployee(req.params.employeeId);
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee leave requests" });
    }
  });

  app.post("/api/leave", async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.parse(req.body);

      // Check if employee exists
      const employee = await storage.getEmployee(validatedData.employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      const request = await storage.createLeaveRequest(validatedData);
      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid leave request data" });
    }
  });

  app.put("/api/leave/:id", async (req, res) => {
    try {
      const validatedData = insertLeaveRequestSchema.partial().parse(req.body);
      const request = await storage.updateLeaveRequest(req.params.id, validatedData);
      if (!request) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: "Invalid leave request data" });
    }
  });

  app.delete("/api/leave/:id", async (req, res) => {
    try {
      const success = await storage.deleteLeaveRequest(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Leave request not found" });
      }
      res.json({ message: "Leave request deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave request:", error);
      res.status(500).json({ message: "Failed to delete leave request" });
    }
  });

  // Get pending leave requests from monitoring (status "Menunggu Cuti")
  app.get("/api/leave/pending-from-monitoring", async (req, res) => {
    try {
      const pendingFromMonitoring = await storage.getLeaveRosterMonitoringByStatus("Menunggu Cuti");

      // Get employee data to fill missing information
      const employees = await storage.getEmployees();

      // Transform monitoring data to leave request format
      const pendingRequests = pendingFromMonitoring.map(monitoring => {
        const employee = employees.find(emp => emp.id === monitoring.nik);
        // Prevent "Invalid Date" crash by providing fallback
        const validDate = monitoring.nextLeaveDate || new Date().toISOString().split('T')[0];

        return {
          id: `monitoring-${monitoring.id}`,
          employeeId: monitoring.nik,
          employeeName: monitoring.name,
          phoneNumber: employee?.phone || "",
          startDate: validDate,
          endDate: validDate, // Default end date to match start date to avoid empty string
          leaveType: monitoring.leaveOption === "70" ? "Cuti Tahunan" : "Cuti Khusus",
          reason: `Cuti otomatis berdasarkan monitoring ${monitoring.leaveOption} hari kerja`,
          attachmentPath: null,
          status: "monitoring-pending",
          monitoringId: monitoring.id,
          investorGroup: monitoring.investorGroup,
          lastLeaveDate: monitoring.lastLeaveDate,
          monitoringDays: monitoring.monitoringDays,
          month: monitoring.month
        };
      });

      res.json(pendingRequests);
    } catch (error) {
      console.error('Error fetching pending from monitoring:', error);
      res.status(500).json({ message: "Failed to fetch pending leave requests from monitoring" });
    }
  });

  // Process leave request from monitoring
  app.post("/api/leave/process-from-monitoring", async (req, res) => {
    try {
      const { monitoringId, employeeId, employeeName, phoneNumber, startDate, endDate, leaveType, reason, attachmentPath, action } = req.body;

      if (action === "approve") {
        // Create actual leave request
        const leaveRequest = await storage.createLeaveRequest({
          employeeId,
          employeeName,
          phoneNumber,
          startDate,
          endDate,
          leaveType,
          reason,
          attachmentPath,
          status: "approved"
        });

        // Update monitoring status to "Sedang Cuti"
        await storage.updateLeaveRosterMonitoring(monitoringId, {
          status: "Sedang Cuti"
        });

        res.json({ message: "Leave request approved and processed", leaveRequest });
      } else if (action === "reject") {
        // Update monitoring status back to "Aktif"
        await storage.updateLeaveRosterMonitoring(monitoringId, {
          status: "Aktif"
        });

        res.json({ message: "Leave request rejected" });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } catch (error) {
      console.error('Error processing leave from monitoring:', error);
      res.status(500).json({ message: "Failed to process leave request" });
    }
  });

  // QR Token routes
  app.post("/api/qr/generate", async (req, res) => {
    try {
      const { employeeId } = req.body;
      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      // Check if employee exists
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      // Check if employee already has an active QR token
      const existingTokens = await storage.getQrTokensByEmployee(employeeId);
      const activeToken = existingTokens.find(t => t.isActive);

      let token;
      // Always regenerate token to ensure URL-safe format
      // (Remove this after all tokens are migrated)
      if (false && activeToken) {
        // Use existing active token (disabled temporarily for migration)
        token = activeToken.token;
      } else {
        // Generate consistent token based on employee ID only
        const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';
        const tokenData = `${employeeId}${secretKey}Attend`;
        token = Buffer.from(tokenData).toString('base64').slice(0, 16)
          .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // Make URL-safe

        // Create new token
        await storage.createQrToken({
          employeeId,
          token,
          isActive: true
        });
      }

      // Create URL yang mengarah ke aplikasi untuk QR Code
      const baseUrl = process.env.PUBLIC_BASE_URL
        || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : null)
        || `${req.protocol}://${req.get('host')}`;

      // Create JSON format for internal app QR scanner (original format)
      const qrPayload = {
        id: employeeId,
        token: token
      };
      const qrData = JSON.stringify(qrPayload);

      res.json({
        employeeId,
        token,
        qrData: qrData // JSON format untuk sistem scan QR internal
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate QR token" });
    }
  });

  // Simple QR redirect endpoint for mobile scanner compatibility
  app.get("/qr/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;

      // Log for debugging mobile scanner access
      console.log(`📱 QR Scanner access: ${employeeId} from ${req.get('User-Agent')}`);

      // Check if employee exists
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).send(`
          <html>
            <head><title>Karyawan Tidak Ditemukan</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px;">
              <h2>❌ Karyawan Tidak Ditemukan</h2>
              <p>NIK: ${employeeId}</p>
            </body>
          </html>
        `);
      }

      // Redirect to driver view with NIK parameter
      const redirectUrl = `/driver-view?nik=${employeeId}`;

      // Use HTML meta refresh for better mobile compatibility
      res.send(`
        <html>
          <head>
            <title>Redirect ke Driver View</title>
            <meta http-equiv="refresh" content="0; url=${redirectUrl}">
            <script>
              // Fallback JavaScript redirect
              setTimeout(() => {
                window.location.href = '${redirectUrl}';
              }, 100);
            </script>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>🔄 Mengarahkan...</h2>
            <p>Membuka data karyawan: ${employee.name}</p>
            <p>Jika tidak dialihkan otomatis, <a href="${redirectUrl}">klik di sini</a></p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('❌ Error in QR redirect:', error);
      res.status(500).send(`
        <html>
          <head><title>Error</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h2>❌ Terjadi Kesalahan</h2>
            <p>Silahkan coba lagi</p>
          </body>
        </html>
      `);
    }
  });

  app.post("/api/qr/validate", async (req, res) => {
    try {
      const { employeeId, token } = req.body;
      if (!employeeId || !token) {
        return res.status(400).json({ message: "Employee ID and token are required" });
      }

      if (QR_GLOBALLY_EXPIRED) {
        return res.status(403).json({ message: QR_EXPIRED_MESSAGE, expired: true });
      }

      // Check cache first for faster response
      const today = new Date().toISOString().split('T')[0];
      let employee = getCachedEmployee(employeeId);

      if (!employee) {
        // Parallel execution for faster response + enhanced employee lookup
        console.log(`Regular QR Scan - Looking for employee ID: "${employeeId}" (type: ${typeof employeeId})`);

        const [employeeData, todayRoster] = await Promise.all([
          storage.getEmployee(employeeId),
          storage.getRosterByDate(today)
        ]);
        employee = employeeData;

        // If employee not found by direct lookup, try alternative methods
        if (!employee) {
          console.log(`Employee "${employeeId}" not found in direct lookup, trying alternatives...`);

          const allEmployees = await storage.getAllEmployees();
          console.log(`Total employees in system: ${allEmployees.length}`);

          // Try to find by trimmed ID or fuzzy match
          const foundEmployee = allEmployees.find(emp =>
            emp.id === employeeId ||
            emp.id === employeeId.trim() ||
            emp.id.toLowerCase() === employeeId.toLowerCase() ||
            emp.name.toLowerCase().includes(employeeId.toLowerCase())
          );

          if (foundEmployee) {
            console.log(`Found employee by alternative lookup: ${foundEmployee.id} - ${foundEmployee.name}`);
            employee = foundEmployee;
          } else {
            console.log(`Employee "${employeeId}" not found in ${allEmployees.length} total employees`);
            console.log('Sample employee IDs:', allEmployees.slice(0, 5).map(emp => `"${emp.id}"`));
          }
        }

        if (employee) setCachedEmployee(employeeId, employee);
        var roster = todayRoster;
      } else {
        // Employee found in cache, only fetch roster
        var roster = await storage.getRosterByDate(today);
      }

      const todayRoster = roster;

      if (!employee) {
        return res.status(404).json({
          message: "Karyawan tidak ditemukan",
          debug: {
            searchedId: employeeId,
            idType: typeof employeeId
          }
        });
      }

      console.log(`Regular QR validation - Found employee: ${employee.id} - ${employee.name}`);

      // Validate token using QR tokens table (more reliable)
      const qrTokens = await storage.getQrTokensByEmployee(employeeId);
      const validToken = qrTokens.find(t => t.token === token && t.isActive);

      if (!validToken) {
        return res.status(400).json({ message: "Token QR tidak valid atau sudah tidak aktif" });
      }

      const employeeRoster = todayRoster.find(r => r.employeeId === employeeId);

      // Add time validation warning for better UX
      let timeValidation = null;
      if (employeeRoster) {
        const now = new Date();
        // Convert to Indonesia timezone (WITA UTC+8)
        const indonesiaOffset = 8 * 60; // 8 hours in minutes
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const indonesiaTime = new Date(utc + (indonesiaOffset * 60000));
        const currentTime = `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')}`;
        const isValidTiming = isValidShiftTimeByName(currentTime, employeeRoster.shift);
        const timeRange = getShiftTimeRange(employeeRoster.shift);
        const isCompletelyOutside = isCompletelyOutsideShiftTimes(currentTime);

        let warning = null;
        if (!isValidTiming) {
          if (isCompletelyOutside) {
            warning = `⚠️ PERINGATAN: Saat ini diluar jam kerja (${currentTime}). Absensi hanya diizinkan pada Shift 1 (04:00-10:00) atau Shift 2 (16:00-22:00)`;
          } else {
            warning = `⚠️ PERINGATAN: Waktu sekarang (${currentTime}) tidak sesuai dengan shift Anda (${employeeRoster.shift}: ${timeRange.start}-${timeRange.end})`;
          }
        }

        timeValidation = {
          currentTime: currentTime,
          isValidTiming: isValidTiming,
          warning: warning
        };
      }

      res.json({
        valid: true,
        employee,
        roster: employeeRoster || null,
        timeValidation: timeValidation,
        message: "QR token is valid"
      });
    } catch (error) {
      console.error("QR validation error:", error);
      res.status(500).json({ message: "Failed to validate QR token" });
    }
  });

  // Attendance validation for Driver View QR codes (no token required)
  app.post("/api/attendance/validate-employee", async (req, res) => {
    try {
      const { employeeId } = req.body;
      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID is required" });
      }

      if (QR_GLOBALLY_EXPIRED) {
        return res.status(403).json({ message: QR_EXPIRED_MESSAGE, expired: true });
      }

      console.log(`Driver View QR Scan - Looking for employee ID: "${employeeId}"`);

      // Check cache first for faster response
      const today = new Date().toISOString().split('T')[0];
      let employee = getCachedEmployee(employeeId);

      if (!employee) {
        // Parallel execution for faster response
        const [employeeData, todayRoster] = await Promise.all([
          storage.getEmployee(employeeId),
          storage.getRosterByDate(today)
        ]);
        employee = employeeData;

        // If employee not found by direct lookup, try alternative methods
        if (!employee) {
          console.log(`Employee "${employeeId}" not found in direct lookup, trying alternatives...`);

          const allEmployees = await storage.getAllEmployees();
          const foundEmployee = allEmployees.find(emp =>
            emp.id === employeeId ||
            emp.id === employeeId.trim() ||
            emp.id.toLowerCase() === employeeId.toLowerCase()
          );

          if (foundEmployee) {
            console.log(`Found employee by alternative lookup: ${foundEmployee.id} - ${foundEmployee.name}`);
            employee = foundEmployee;
          }
        }

        if (employee) setCachedEmployee(employeeId, employee);
        var roster = todayRoster;
      } else {
        var roster = await storage.getRosterByDate(today);
      }

      if (!employee) {
        return res.status(404).json({
          message: "Karyawan tidak ditemukan",
          debug: { searchedId: employeeId }
        });
      }

      console.log(`Driver View validation - Found employee: ${employee.id} - ${employee.name}`);

      const employeeRoster = roster.find((r: any) => r.employeeId === employeeId);

      // Time validation (same as token-based validation)
      let timeValidation = null;
      if (employeeRoster) {
        const now = new Date();
        const indonesiaOffset = 8 * 60;
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const indonesiaTime = new Date(utc + (indonesiaOffset * 60000));
        const currentTime = `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')}`;
        const isValidTiming = isValidShiftTimeByName(currentTime, employeeRoster.shift);
        const timeRange = getShiftTimeRange(employeeRoster.shift);
        const isCompletelyOutside = isCompletelyOutsideShiftTimes(currentTime);

        let warning = null;
        if (!isValidTiming) {
          if (isCompletelyOutside) {
            warning = `⚠️ PERINGATAN: Saat ini diluar jam kerja (${currentTime}). Absensi hanya diizinkan pada Shift 1 (04:00-10:00) atau Shift 2 (16:00-22:00)`;
          } else {
            warning = `⚠️ PERINGATAN: Waktu sekarang (${currentTime}) tidak sesuai dengan shift Anda (${employeeRoster.shift}: ${timeRange.start}-${timeRange.end})`;
          }
        }

        timeValidation = {
          currentTime: currentTime,
          isValidTiming: isValidTiming,
          warning: warning
        };
      }

      res.json({
        valid: true,
        employee,
        roster: employeeRoster || null,
        timeValidation: timeValidation,
        message: "Employee validated (Driver View QR)",
        source: "driver-view" // Log source for analytics
      });
    } catch (error) {
      console.error("Driver View validation error:", error);
      res.status(500).json({ message: "Failed to validate employee" });
    }
  });

  // Sidak Observer QR validation - simplified for observer data extraction
  app.post("/api/qr/observer", async (req, res) => {
    try {
      const { employeeId, token } = req.body;
      if (!employeeId || !token) {
        return res.status(400).json({ message: "Employee ID and token are required" });
      }

      if (QR_GLOBALLY_EXPIRED) {
        return res.status(403).json({ message: QR_EXPIRED_MESSAGE, expired: true });
      }

      // Get employee data
      let employee = getCachedEmployee(employeeId);
      if (!employee) {
        employee = await storage.getEmployee(employeeId);
        if (employee) setCachedEmployee(employeeId, employee);
      }

      if (!employee) {
        return res.status(404).json({ message: "Karyawan tidak ditemukan" });
      }

      // Validate token using QR tokens table
      const qrTokens = await storage.getQrTokensByEmployee(employeeId);
      const validToken = qrTokens.find(t => t.token === token && t.isActive);

      if (!validToken) {
        return res.status(400).json({ message: "Token QR tidak valid atau sudah tidak aktif" });
      }

      // Return observer data (minimal fields needed for Sidak forms)
      res.json({
        valid: true,
        observer: {
          nama: employee.name,
          nik: employee.id, // Employee ID is used as NIK (Employee schema doesn't have dedicated nik field)
          perusahaan: employee.investorGroup || "PT.GECL",
          jabatan: employee.position || "Karyawan"
        },
        message: "QR token valid untuk observer"
      });
    } catch (error) {
      console.error("Observer QR validation error:", error);
      res.status(500).json({ message: "Failed to validate observer QR token" });
    }
  });

  // Dashboard stats with optional date filter (query param or path param)
  app.get("/api/dashboard/stats/:date?", async (req, res) => {
    try {
      const date = req.params.date || (req.query.date as string) || new Date().toISOString().split('T')[0];

      const [employees, dateAttendance, dateRoster, leaveRequests] = await Promise.all([
        storage.getAllEmployees(),
        storage.getAllAttendance(date),
        storage.getRosterByDate(date),
        storage.getAllLeaveRequests()
      ]);

      const activeLeavesOnDate = leaveRequests.filter(leave =>
        leave.status === 'approved' &&
        leave.startDate <= date &&
        leave.endDate >= date
      );

      const stats = {
        totalEmployees: employees.length,
        scheduledToday: dateRoster.length,
        presentToday: dateAttendance.length,
        absentToday: dateRoster.length - dateAttendance.length,
        onLeaveToday: activeLeavesOnDate.length,
        pendingLeaveRequests: leaveRequests.filter(leave => leave.status === 'pending').length
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Report update status endpoint
  app.get("/api/report-update-status", async (req, res) => {
    try {
      res.json({
        lastRosterUpdate: lastRosterUpdate.toISOString(),
        message: "Roster data auto-sync active",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get update status" });
    }
  });

  // Recent attendance activities (query param or path param)
  app.get("/api/dashboard/recent-activities/:date?", async (req, res) => {
    try {
      const date = req.params.date || (req.query.date as string) || new Date().toISOString().split('T')[0];

      const [attendance, employees] = await Promise.all([
        storage.getAllAttendance(date),
        storage.getAllEmployees()
      ]);

      // Get recent activities (latest 10 attendance records)
      const recentActivities = await Promise.all(
        attendance
          .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
          .slice(0, 10)
          .map(async (record) => {
            const employee = employees.find(emp => emp.id === record.employeeId);

            // Ambil data hari kerja langsung dari kolom monitoring yang sudah ada
            let workingDays = 0;
            try {
              if (employee?.id) {
                const allMonitoring = await storage.getAllLeaveRosterMonitoring();
                const monitoring = allMonitoring.find(m => m.nik === employee.id); // NIK sama dengan employee ID

                if (monitoring) {
                  // Langsung ambil dari kolom monitoringDays yang sudah ada
                  workingDays = monitoring.monitoringDays || 0;
                }
              }
            } catch (error) {
              console.error("Error getting working days from monitoring data:", error);
              workingDays = 0;
            }

            return {
              id: record.id,
              employeeId: record.employeeId,
              employeeName: employee?.name || 'Unknown',
              time: record.time,
              jamTidur: record.jamTidur,
              fitToWork: record.fitToWork,
              status: record.status,
              createdAt: record.createdAt,
              workingDays: workingDays
            };
          })
      );

      res.json(recentActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Driver Evaluation from SIDAK Fatigue data
  app.get("/api/evaluasi-driver", async (req, res) => {
    try {
      const month = req.query.month as string; // Format: YYYY-MM
      const status = req.query.status as string; // "semua" | "sudah" | "belum"
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!month) {
        return res.status(400).json({ message: "Month parameter is required (format: YYYY-MM)" });
      }

      const hasWeekFilter = !!(startDate && endDate);

      // Fetch full-month roster entries (driver pool is always month-based)
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;

      // Fetch full-month roster + week roster (if applicable) + employees + sessions in parallel
      const [rosterEntries, weekRosterEntries, allEmployees, allSessions] = await Promise.all([
        storage.getRosterByDateRange(monthStart, monthEnd),
        hasWeekFilter
          ? storage.getRosterByDateRange(startDate!, endDate!)
          : Promise.resolve(null),
        storage.getAllEmployees(),
        storage.getAllSidakFatigueSessions()
      ]);

      // Build employee lookup map
      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

      // Get unique driver IDs from full-month roster (including CUTI days) — total driver pool
      const uniqueDriverIds = [
        ...new Set(
          rosterEntries
            .filter(r => r.employeeId)
            .map(r => r.employeeId!)
        )
      ];

      // Get unique driver IDs from week roster who have at least one working shift
      // (SHIFT 1, SHIFT 2, OVER SHIFT — excludes all-CUTI drivers who can't be SIDAK'd)
      const workingShifts = new Set(['SHIFT 1', 'SHIFT 2', 'OVER SHIFT']);
      const weekRosterDriverIds = new Set(
        (weekRosterEntries ?? rosterEntries)
          .filter(r => r.employeeId && workingShifts.has(r.shift))
          .map(r => r.employeeId!)
      );

      // Resolve to employee objects — only ACTIVE employees (exclude non-aktif)
      const driversOnly = uniqueDriverIds
        .map(id => employeeMap.get(id))
        .filter(emp => emp != null && emp.status === 'active') as typeof allEmployees;

      // Full-month SIDAK sessions (always used for "Belum SIDAK" calculation)
      const fullMonthSessions = allSessions.filter(session => {
        const d = String(session.tanggal).slice(0, 10);
        return d.startsWith(month);
      });

      // Week-specific SIDAK sessions (only when week filter active, for "Sudah SIDAK")
      const weekSessions = hasWeekFilter
        ? allSessions.filter(session => {
          const d = String(session.tanggal).slice(0, 10);
          return d >= startDate! && d <= endDate!;
        })
        : fullMonthSessions;

      // Fetch records for both scopes in parallel
      const fullMonthSessionIds = fullMonthSessions.map(s => s.id);
      const weekSessionIds = weekSessions.map(s => s.id);

      const [fullMonthRecords, weekRecords] = await Promise.all([
        fullMonthSessionIds.length > 0
          ? storage.getSidakFatigueRecordsBySessionIds(fullMonthSessionIds)
          : Promise.resolve([]),
        hasWeekFilter && weekSessionIds.length > 0
          ? storage.getSidakFatigueRecordsBySessionIds(weekSessionIds)
          : Promise.resolve(null) // null means "use full month records"
      ]);

      const resolvedWeekRecords = weekRecords ?? fullMonthRecords;

      // Count SIDAKs per employee for both scopes
      const fullMonthCountByNik = fullMonthRecords.reduce((acc, r) => {
        acc[r.nik] = (acc[r.nik] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const weekCountByNik = resolvedWeekRecords.reduce((acc, r) => {
        acc[r.nik] = (acc[r.nik] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build evaluation data:
      // - totalSidak: reflects the selected period (week or month) — for display/sorting
      // - monthTotal: always full-month count — for determining "Belum SIDAK"
      const allEvaluationData = driversOnly.map(employee => {
        const monthTotal = fullMonthCountByNik[employee.id] || 0;
        const periodTotal = weekCountByNik[employee.id] || 0;
        return {
          id: employee.id,
          nama: employee.name,
          nik: employee.id,
          investorGroup: employee.investorGroup || '-',
          totalSidak: periodTotal,       // count for selected period
          monthTotal,                    // full-month count (for belum/sudah determination)
          status: monthTotal > 0 ? "Sudah SIDAK" : "Belum SIDAK"
        };
      });

      // Summary stats:
      // - sudahSidak: drivers who did SIDAK in selected period (week or month)
      // - belumSidak: drivers with 0 SIDAK in the FULL MONTH (monthly compliance target)
      const totalDrivers = driversOnly.length;
      const sudahSidak = allEvaluationData.filter(d => d.totalSidak > 0).length;
      const belumSidak = allEvaluationData.filter(d => d.monthTotal === 0).length;
      const totalSidakKeseluruhan = fullMonthRecords.length;

      // Apply status filter:
      // "sudah" = did SIDAK in the selected period (week or month)
      // "belum" = no SIDAK all month, AND (if week filter active) must be in week roster
      let filteredEvaluationData = allEvaluationData;
      if (status === "sudah") {
        filteredEvaluationData = allEvaluationData.filter(d => d.totalSidak > 0);
      } else if (status === "belum") {
        filteredEvaluationData = allEvaluationData.filter(d =>
          d.monthTotal === 0 &&
          (!hasWeekFilter || weekRosterDriverIds.has(d.id))
        );
      }

      // Sort: highest SIDAK count first, then by name
      filteredEvaluationData.sort((a, b) => b.totalSidak - a.totalSidak || a.nama.localeCompare(b.nama));

      res.json({
        summary: {
          totalDrivers,
          sudahSidak,
          belumSidak,
          totalSidakKeseluruhan
        },
        drivers: filteredEvaluationData,
        month
      });
    } catch (error) {
      console.error("Error fetching evaluasi driver:", error);
      res.status(500).json({ message: "Failed to fetch driver evaluation" });
    }
  });





  // ============================================
  // EVALUASI SIDAK ROSTER
  // ============================================
  app.get("/api/evaluasi-roster", async (req, res) => {
    try {
      const month = req.query.month as string; // Format: YYYY-MM
      const status = req.query.status as string; // "semua" | "sudah" | "belum"
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      if (!month) {
        return res.status(400).json({ message: "Month parameter is required (format: YYYY-MM)" });
      }

      const hasWeekFilter = !!(startDate && endDate);
      const monthStart = `${month}-01`;
      const monthEnd = `${month}-31`;

      // Fetch full-month roster + week roster (if applicable) + employees + sessions in parallel
      const [rosterEntries, weekRosterEntries, allEmployees, allSessions] = await Promise.all([
        storage.getRosterByDateRange(monthStart, monthEnd),
        hasWeekFilter
          ? storage.getRosterByDateRange(startDate!, endDate!)
          : Promise.resolve(null),
        storage.getAllEmployees(),
        storage.getAllSidakRosterSessions()
      ]);

      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

      // Full-month roster — active employees only
      const uniqueDriverIds = [
        ...new Set(
          rosterEntries
            .filter(r => r.employeeId)
            .map(r => r.employeeId!)
        )
      ];
      const driversOnly = uniqueDriverIds
        .map(id => employeeMap.get(id))
        .filter(emp => emp != null && emp.status === 'active') as typeof allEmployees;

      // Week roster — drivers with at least one working shift (excludes all-CUTI)
      const workingShifts = new Set(['SHIFT 1', 'SHIFT 2', 'OVER SHIFT']);
      const weekRosterDriverIds = new Set(
        (weekRosterEntries ?? rosterEntries)
          .filter(r => r.employeeId && workingShifts.has(r.shift))
          .map(r => r.employeeId!)
      );

      // Full-month SIDAK sessions (always used for "Belum SIDAK")
      const fullMonthSessions = allSessions.filter(s =>
        String(s.tanggal).slice(0, 10).startsWith(month)
      );

      // Week-specific sessions (for "Sudah SIDAK" when week filter active)
      const weekSessions = hasWeekFilter
        ? allSessions.filter(s => {
          const d = String(s.tanggal).slice(0, 10);
          return d >= startDate! && d <= endDate!;
        })
        : fullMonthSessions;

      const fullMonthSessionIds = fullMonthSessions.map(s => s.id);
      const weekSessionIds = weekSessions.map(s => s.id);

      const [fullMonthRecords, weekRecords] = await Promise.all([
        fullMonthSessionIds.length > 0
          ? storage.getSidakRosterRecordsBySessionIds(fullMonthSessionIds)
          : Promise.resolve([]),
        hasWeekFilter && weekSessionIds.length > 0
          ? storage.getSidakRosterRecordsBySessionIds(weekSessionIds)
          : Promise.resolve(null)
      ]);

      const resolvedWeekRecords = weekRecords ?? fullMonthRecords;

      const fullMonthCountByNik = fullMonthRecords.reduce((acc, r) => {
        acc[r.nik] = (acc[r.nik] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const weekCountByNik = resolvedWeekRecords.reduce((acc, r) => {
        acc[r.nik] = (acc[r.nik] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const allEvaluationData = driversOnly.map(employee => {
        const monthTotal = fullMonthCountByNik[employee.id] || 0;
        const periodTotal = weekCountByNik[employee.id] || 0;
        return {
          id: employee.id,
          nama: employee.name,
          nik: employee.id,
          investorGroup: employee.investorGroup || '-',
          totalSidak: periodTotal,
          monthTotal,
          status: monthTotal > 0 ? "Sudah SIDAK" : "Belum SIDAK"
        };
      });

      const totalDrivers = driversOnly.length;
      const sudahSidak = allEvaluationData.filter(d => d.totalSidak > 0).length;
      const belumSidak = allEvaluationData.filter(d => d.monthTotal === 0).length;
      const totalSidakKeseluruhan = fullMonthRecords.length;

      // "sudah" = did SIDAK in selected period
      // "belum" = 0 SIDAK all month, AND (if week filter) must be in week roster
      let filteredEvaluationData = allEvaluationData;
      if (status === "sudah") {
        filteredEvaluationData = allEvaluationData.filter(d => d.totalSidak > 0);
      } else if (status === "belum") {
        filteredEvaluationData = allEvaluationData.filter(d =>
          d.monthTotal === 0 &&
          (!hasWeekFilter || weekRosterDriverIds.has(d.id))
        );
      }

      filteredEvaluationData.sort((a, b) => b.totalSidak - a.totalSidak || a.nama.localeCompare(b.nama));

      res.json({
        summary: { totalDrivers, sudahSidak, belumSidak, totalSidakKeseluruhan },
        drivers: filteredEvaluationData,
        month
      });
    } catch (error) {
      console.error("Error fetching evaluasi roster:", error);
      res.status(500).json({ message: "Failed to fetch roster evaluation" });
    }
  });




  // WhatsApp Leave Monitoring endpoints
  app.get("/api/leave-monitoring/upcoming", async (req, res) => {
    try {
      const { LeaveMonitoringService } = await import('./leaveMonitoringService');
      const monitoringService = new LeaveMonitoringService(storage as any);
      const upcomingLeaves = await monitoringService.checkUpcomingLeaves();
      res.json(upcomingLeaves);
    } catch (error) {
      console.error("Error fetching upcoming leaves:", error);
      res.status(500).json({ error: "Failed to fetch upcoming leaves" });
    }
  });

  app.post("/api/leave-monitoring/send-reminders", async (req, res) => {
    try {
      const { LeaveMonitoringService } = await import('./leaveMonitoringService');
      const monitoringService = new LeaveMonitoringService(storage as any);
      const result = await monitoringService.sendLeaveReminders();
      res.json(result);
    } catch (error) {
      console.error("Error sending reminders:", error);
      res.status(500).json({ error: "Failed to send reminders" });
    }
  });

  app.get("/api/leave-monitoring/history", async (req, res) => {
    try {
      const { LeaveMonitoringService } = await import('./leaveMonitoringService');
      const monitoringService = new LeaveMonitoringService(storage as any);
      const history = await monitoringService.getLeaveReminderHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching reminder history:", error);
      res.status(500).json({ error: "Failed to fetch reminder history" });
    }
  });

  // Leave balance endpoints
  app.get("/api/leave-balances", async (req, res) => {
    try {
      const balances = await storage.getLeaveBalances();
      res.json(balances);
    } catch (error) {
      console.error("Error fetching leave balances:", error);
      res.status(500).json({ error: "Failed to fetch leave balances" });
    }
  });

  app.get("/api/leave-balances/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const year = req.query.year ? parseInt(req.query.year as string) : new Date().getFullYear();
      const balance = await storage.getLeaveBalanceByEmployee(employeeId, year);
      res.json(balance);
    } catch (error) {
      console.error("Error fetching employee leave balance:", error);
      res.status(500).json({ error: "Failed to fetch employee leave balance" });
    }
  });

  // Leave history endpoints
  app.get("/api/leave-history", async (req, res) => {
    try {
      const history = await storage.getLeaveHistory();
      res.json(history);
    } catch (error) {
      console.error("Error fetching leave history:", error);
      res.status(500).json({ error: "Failed to fetch leave history" });
    }
  });

  app.get("/api/leave-history/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const history = await storage.getLeaveHistoryByEmployee(employeeId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching employee leave history:", error);
      res.status(500).json({ error: "Failed to fetch employee leave history" });
    }
  });

  // Bulk upload leave roster
  app.post("/api/leave-roster/bulk-upload", async (req, res) => {
    try {
      const { leaveData } = req.body;

      if (!Array.isArray(leaveData)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      const result = await storage.bulkUploadLeaveRoster(leaveData);
      res.json(result);
    } catch (error) {
      console.error("Error bulk uploading leave roster:", error);
      res.status(500).json({ error: "Failed to upload leave roster" });
    }
  });

  // Download template for leave roster upload
  app.get("/api/leave-roster/template", async (req, res) => {
    try {
      const templateData = [
        ["NIK", "Jenis Cuti", "Tanggal Mulai", "Tanggal Selesai", "Total Hari"],
        ["C-015227", "Cuti Tahunan", "2025-08-25", "2025-08-27", "3"],
        ["C-030015", "Cuti Sakit", "2025-08-28", "2025-08-29", "2"],
        ["C-045123", "Cuti Melahirkan", "2025-09-01", "2025-11-01", "61"],
        ["", "", "", "", ""],
        ["Format tanggal: YYYY-MM-DD (contoh: 2025-08-25)", "", "", "", ""],
        ["Jenis cuti: Cuti Tahunan, Cuti Sakit, Cuti Melahirkan, dll", "", "", "", ""]
      ];

      const csvContent = templateData.map(row => row.join(',')).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="template-roster-cuti.csv"');
      res.send(csvContent);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ error: "Failed to generate template" });
    }
  });

  // Dashboard Evaluasi Cuti API endpoints
  app.get("/api/leave-analytics/overview", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      const leaveRequests = await storage.getAllLeaveRequests();
      const leaveBalances = await storage.getLeaveBalances();

      // Statistik umum
      const totalEmployees = employees.length;
      const totalLeaveRequests = leaveRequests.length;
      const pendingRequests = leaveRequests.filter(req => req.status === 'pending').length;
      const approvedRequests = leaveRequests.filter(req => req.status === 'approved').length;
      const totalLeaveDaysTaken = leaveBalances.reduce((sum, balance) => sum + balance.usedDays, 0);

      // Karyawan dengan cuti paling banyak
      const topLeaveEmployees = leaveBalances
        .sort((a, b) => b.usedDays - a.usedDays)
        .slice(0, 5)
        .map(balance => {
          const employee = employees.find(emp => emp.id === balance.employeeId);
          return {
            employeeId: balance.employeeId,
            employeeName: employee?.name || 'Unknown',
            usedDays: balance.usedDays,
            remainingDays: balance.remainingDays,
            percentage: Math.round((balance.usedDays / balance.totalDays) * 100)
          };
        });

      // Tren cuti per bulan (6 bulan terakhir)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const monthlyLeaveData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const monthRequests = leaveRequests.filter(req => {
          return req.startDate.startsWith(monthYear);
        });

        monthlyLeaveData.push({
          month: date.toLocaleDateString('id-ID', { month: 'short' }),
          requests: monthRequests.length,
          totalDays: monthRequests.reduce((sum, req) => {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          }, 0)
        });
      }

      // Distribusi jenis cuti
      const leaveTypeDistribution = leaveRequests.reduce((acc, req) => {
        acc[req.leaveType] = (acc[req.leaveType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        overview: {
          totalEmployees,
          totalLeaveRequests,
          pendingRequests,
          approvedRequests,
          totalLeaveDaysTaken,
          averageLeaveDays: totalEmployees > 0 ? Math.round(totalLeaveDaysTaken / totalEmployees) : 0
        },
        topLeaveEmployees,
        monthlyLeaveData,
        leaveTypeDistribution
      });
    } catch (error) {
      console.error("Error fetching leave analytics overview:", error);
      res.status(500).json({ message: "Failed to fetch leave analytics" });
    }
  });

  app.get("/api/leave-analytics/department", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      const leaveBalances = await storage.getLeaveBalances();

      // Grup by department
      const departmentStats = employees.reduce((acc, employee) => {
        const dept = employee.department || 'Unknown';
        if (!acc[dept]) {
          acc[dept] = {
            department: dept,
            totalEmployees: 0,
            totalLeaveDays: 0,
            averageLeaveDays: 0,
            employees: []
          };
        }

        const balance = leaveBalances.find(b => b.employeeId === employee.id);
        const usedDays = balance?.usedDays || 0;

        acc[dept].totalEmployees++;
        acc[dept].totalLeaveDays += usedDays;
        acc[dept].employees.push({
          nik: employee.id,
          name: employee.name,
          position: employee.position,
          usedDays,
          remainingDays: balance?.remainingDays || 0
        });

        return acc;
      }, {} as Record<string, any>);

      // Calculate averages
      Object.values(departmentStats).forEach((dept: any) => {
        dept.averageLeaveDays = dept.totalEmployees > 0
          ? Math.round(dept.totalLeaveDays / dept.totalEmployees)
          : 0;
      });

      res.json(Object.values(departmentStats));
    } catch (error) {
      console.error("Error fetching department analytics:", error);
      res.status(500).json({ message: "Failed to fetch department analytics" });
    }
  });



  // Object storage routes for file uploads
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error accessing object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Object storage not configured:", error);
      res.status(503).json({
        error: "Object storage not configured",
        message: "File upload is temporarily unavailable. Please contact administrator."
      });
    }
  });

  // Endpoint untuk normalize upload URL
  app.post("/api/objects/normalize", async (req, res) => {
    try {
      const { uploadURL } = req.body;
      if (!uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({ objectPath });
    } catch (error) {
      console.error("Error normalizing object path:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });



  // Leave Roster Monitoring routes
  app.get("/api/leave-roster-monitoring", async (req, res) => {
    try {
      const monitoring = await storage.getAllLeaveRosterMonitoring();
      res.json(monitoring);
    } catch (error) {
      console.error("Error fetching leave roster monitoring:", error);
      res.status(500).json({ message: "Failed to fetch leave roster monitoring" });
    }
  });

  app.get("/api/leave-roster-monitoring/:id", async (req, res) => {
    try {
      const monitoring = await storage.getLeaveRosterMonitoring(req.params.id);
      if (!monitoring) {
        return res.status(404).json({ message: "Monitoring data not found" });
      }
      res.json(monitoring);
    } catch (error) {
      console.error("Error fetching leave roster monitoring:", error);
      res.status(500).json({ message: "Failed to fetch leave roster monitoring" });
    }
  });

  app.post("/api/leave-roster-monitoring", async (req, res) => {
    try {
      const monitoring = await storage.createLeaveRosterMonitoring(req.body);
      res.status(201).json(monitoring);
    } catch (error) {
      console.error("Error creating leave roster monitoring:", error);
      res.status(500).json({ message: "Failed to create leave roster monitoring" });
    }
  });

  app.put("/api/leave-roster-monitoring/:id", async (req, res) => {
    try {
      const monitoring = await storage.updateLeaveRosterMonitoring(req.params.id, req.body);
      if (!monitoring) {
        return res.status(404).json({ message: "Monitoring data not found" });
      }
      res.json(monitoring);
    } catch (error) {
      console.error("Error updating leave roster monitoring:", error);
      res.status(500).json({ message: "Failed to update leave roster monitoring" });
    }
  });

  // Delete all route must come BEFORE the :id route to avoid conflict
  app.delete("/api/leave-roster-monitoring/delete-all", async (req, res) => {
    try {
      await storage.deleteAllLeaveRosterMonitoring();
      res.json({ message: "All leave roster monitoring data deleted successfully" });
    } catch (error) {
      console.error("Error deleting all leave roster monitoring data:", error);
      res.status(500).json({ message: "Failed to delete all leave roster monitoring data" });
    }
  });

  // Clear all leave roster monitoring data (must be before :id route)
  app.delete("/api/leave-roster-monitoring/clear-all", async (req, res) => {
    try {
      await storage.deleteAllLeaveRosterMonitoring();
      res.json({
        success: true,
        message: "Semua data roster monitoring berhasil dihapus"
      });
    } catch (error) {
      console.error("Error clearing leave roster monitoring data:", error);
      res.status(500).json({
        error: "Failed to clear data",
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.delete("/api/leave-roster-monitoring/:id", async (req, res) => {
    try {
      const success = await storage.deleteLeaveRosterMonitoring(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Monitoring data not found" });
      }
      res.json({ message: "Leave roster monitoring deleted successfully" });
    } catch (error) {
      console.error("Error deleting leave roster monitoring:", error);
      res.status(500).json({ message: "Failed to delete leave roster monitoring" });
    }
  });

  app.post("/api/leave-roster-monitoring/update-status", async (req, res) => {
    try {
      await storage.updateLeaveRosterStatus();
      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error("Error updating leave roster status:", error);
      res.status(500).json({ message: "Failed to update leave roster status" });
    }
  });

  // Excel upload endpoint for leave roster monitoring
  app.post("/api/leave-roster-monitoring/upload-excel", async (req, res) => {
    try {
      const multer = (await import('multer')).default;
      const XLSX = (await import('xlsx'));

      // Setup multer for memory storage
      const upload = multer({ storage: multer.memoryStorage() });

      // Handle file upload
      upload.single('file')(req as any, res, async (err: any) => {
        if (err) {
          console.error("Multer error:", err);
          return res.status(400).json({ error: "File upload error", details: err.message });
        }

        const file = (req as any).file;
        if (!file) {
          console.error("No file received in request");
          return res.status(400).json({ error: "No file uploaded" });
        }

        console.log("File received:", file.originalname, "Size:", file.size);

        try {
          const workbook = XLSX.read(file.buffer, { type: 'buffer' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          console.log("Excel data parsed:", data.length, "rows");

          // Skip header row
          const rows = data.slice(1) as any[][];

          let successCount = 0;
          const errors: string[] = [];

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            console.log(`Processing row ${i + 2}:`, row);
            console.log(`Row length: ${row.length}`);

            if (!row || row.length < 2) {
              console.log(`Row ${i + 2}: Skipping empty row`);
              continue;
            }

            // Skip rows with empty or invalid data
            const hasValidData = row.some(cell =>
              cell !== null &&
              cell !== undefined &&
              cell !== '' &&
              cell !== '#N/A' &&
              cell.toString().trim() !== ''
            );

            if (!hasValidData) {
              console.log(`Row ${i + 2}: Skipping row with no valid data`);
              continue;
            }

            // Format data sesuai Excel file: NIK, Nama, Nomor Lambung, Bulan, Tanggal Terakhir Cuti, Pilihan Cuti, OnSite, Investor Group
            // Handle various Excel column formats by checking length
            let nik, name, nomorLambung, monthOrBulan, lastLeaveDateSerial, leaveOption, onSiteData, investorGroupData;

            if (row.length >= 8) {
              [nik, name, nomorLambung, monthOrBulan, lastLeaveDateSerial, leaveOption, onSiteData, investorGroupData] = row;
            } else if (row.length >= 7) {
              [nik, name, nomorLambung, monthOrBulan, lastLeaveDateSerial, leaveOption, onSiteData] = row;
            } else if (row.length >= 6) {
              [nik, name, nomorLambung, monthOrBulan, lastLeaveDateSerial, leaveOption] = row;
            } else if (row.length >= 5) {
              [nik, name, nomorLambung, monthOrBulan, lastLeaveDateSerial] = row;
            } else if (row.length >= 4) {
              [nik, name, nomorLambung, monthOrBulan] = row;
            } else if (row.length >= 3) {
              [nik, name, nomorLambung] = row;
            } else {
              [nik, name] = row;
            }

            console.log(`Parsed values - NIK: ${nik}, Name: ${name}, NomorLambung: ${nomorLambung}, Month: ${monthOrBulan}, LastLeaveDate: ${lastLeaveDateSerial}, LeaveOption: ${leaveOption}, OnSite: ${onSiteData}, InvestorGroup: ${investorGroupData}`);

            try {

              // Validate required fields
              if (!nik || !name || nik.toString().trim() === '' || name.toString().trim() === '') {
                console.log(`Row ${i + 2}: Skipping row with empty NIK or Name - NIK: "${nik}", Name: "${name}"`);
                continue;
              }

              // Skip rows with #N/A values
              if (nik.toString().includes('#N/A') || name.toString().includes('#N/A')) {
                console.log(`Row ${i + 2}: Skipping row with #N/A values`);
                continue;
              }

              // Convert various month formats to YYYY-MM format
              const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
              let finalMonth = currentMonth; // Default to current month

              // Calculate monitoring days and next leave date
              let monitoringDays = 0;
              let nextLeaveDate = "";
              let finalLastLeaveDate = "";
              let finalStatus = "Aktif";
              let finalLeaveOption = "70";
              let finalOnSite = "";

              if (monthOrBulan) {
                const monthStr = monthOrBulan.toString().toLowerCase().trim();
                const currentYear = new Date().getFullYear();

                // Handle Excel serial date numbers (40000+)
                if (!isNaN(Number(monthStr)) && Number(monthStr) > 40000 && Number(monthStr) < 50000) {
                  // Convert Excel serial to date, then extract month using correct formula
                  const excelDate = Number(monthStr);
                  const excelEpoch = new Date(1900, 0, 1); // January 1, 1900
                  const daysSinceEpoch = excelDate - 1; // Excel day 1 = Jan 1, 1900
                  const jsDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
                  if (!isNaN(jsDate.getTime())) {
                    const year = jsDate.getFullYear();
                    const month = (jsDate.getMonth() + 1).toString().padStart(2, '0');
                    finalMonth = `${year}-${month}`;
                    console.log(`Row ${i + 2}: Converted Excel serial "${monthStr}" to month "${finalMonth}"`);
                  } else {
                    console.log(`Row ${i + 2}: Invalid Excel serial "${monthStr}", using current month`);
                    finalMonth = currentMonth;
                  }
                }
                // Handle date formats: dd/mm/yyyy, dd-mm-yyyy, mm/yyyy, etc.
                else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(monthStr)) {
                  // Format: dd/mm/yyyy or dd-mm-yyyy
                  const dateParts = monthStr.split(/[\/\-]/);
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]);
                  const year = parseInt(dateParts[2]);

                  if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
                    finalMonth = `${year}-${month.toString().padStart(2, '0')}`;
                    console.log(`Row ${i + 2}: Converted date "${monthStr}" to month "${finalMonth}"`);
                  } else {
                    console.log(`Row ${i + 2}: Invalid date "${monthStr}", using current month`);
                    finalMonth = currentMonth;
                  }
                }
                // Handle mm/yyyy or mm-yyyy format
                else if (/^\d{1,2}[\/\-]\d{4}$/.test(monthStr)) {
                  const dateParts = monthStr.split(/[\/\-]/);
                  const month = parseInt(dateParts[0]);
                  const year = parseInt(dateParts[1]);

                  if (month >= 1 && month <= 12 && year >= 2020 && year <= 2030) {
                    finalMonth = `${year}-${month.toString().padStart(2, '0')}`;
                    console.log(`Row ${i + 2}: Converted month/year "${monthStr}" to "${finalMonth}"`);
                  } else {
                    console.log(`Row ${i + 2}: Invalid month/year "${monthStr}", using current month`);
                    finalMonth = currentMonth;
                  }
                }
                // Convert Indonesian month names to YYYY-MM format
                else {
                  const monthMap: { [key: string]: string } = {
                    'januari': `${currentYear}-01`,
                    'january': `${currentYear}-01`,
                    'februari': `${currentYear}-02`,
                    'february': `${currentYear}-02`,
                    'maret': `${currentYear}-03`,
                    'march': `${currentYear}-03`,
                    'april': `${currentYear}-04`,
                    'mei': `${currentYear}-05`,
                    'may': `${currentYear}-05`,
                    'juni': `${currentYear}-06`,
                    'june': `${currentYear}-06`,
                    'juli': `${currentYear}-07`,
                    'july': `${currentYear}-07`,
                    'agustus': `${currentYear}-08`,
                    'august': `${currentYear}-08`,
                    'september': `${currentYear}-09`,
                    'oktober': `${currentYear}-10`,
                    'october': `${currentYear}-10`,
                    'november': `${currentYear}-11`,
                    'desember': `${currentYear}-12`,
                    'december': `${currentYear}-12`
                  };

                  if (monthMap[monthStr]) {
                    finalMonth = monthMap[monthStr];
                    console.log(`Row ${i + 2}: Converted month name "${monthStr}" to "${finalMonth}"`);
                  } else if (/^\d{4}-\d{2}$/.test(monthStr)) {
                    // Already in YYYY-MM format
                    finalMonth = monthStr;
                    console.log(`Row ${i + 2}: Month already in correct format "${finalMonth}"`);
                  } else {
                    console.log(`Row ${i + 2}: Format bulan tidak dikenali "${monthStr}", menggunakan bulan sekarang`);
                    finalMonth = currentMonth;
                  }
                }
              }

              // Use investor group from Excel, default to "Default Group" if not provided
              let investorGroup = "Default Group";
              if (investorGroupData &&
                investorGroupData.toString().trim() &&
                !investorGroupData.toString().includes('#N/A') &&
                investorGroupData.toString().trim() !== '') {
                investorGroup = investorGroupData.toString().trim();
              }

              // Validate leave option atau default ke 70
              if (leaveOption && (leaveOption.toString() === "70" || leaveOption.toString() === "35")) {
                finalLeaveOption = leaveOption.toString();
              } else if (leaveOption && leaveOption.toString().trim() !== "") {
                console.log(`Row ${i + 2}: Invalid leave option "${leaveOption}", using default 70`);
                // Don't add error, just use default
              }

              if (lastLeaveDateSerial) {
                console.log(`[${nik}] Processing lastLeaveDateSerial: ${lastLeaveDateSerial}, type: ${typeof lastLeaveDateSerial}`);
                try {
                  // Handle berbagai format tanggal
                  let lastDate = null;

                  // Cek apakah Excel serial number (harus > 40000 untuk tahun 2000+)
                  if (typeof lastLeaveDateSerial === 'number' && lastLeaveDateSerial > 40000) {
                    // Excel date serial number conversion yang lebih akurat
                    // Excel menghitung dari 1 Januari 1900, tapi ada bug leap year di 1900
                    // Formula yang benar: (serial - 25569) * 86400 * 1000 + Date(1970,0,1)
                    // Atau menggunakan epoch Excel yang tepat
                    const excelEpoch = new Date(1899, 11, 30); // 30 Desember 1899
                    const daysSinceEpoch = Math.floor(lastLeaveDateSerial);
                    lastDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
                    console.log(`[${nik}] Excel serial ${lastLeaveDateSerial} converted to ${lastDate.toISOString().split('T')[0]}`);
                  } else if (typeof lastLeaveDateSerial === 'number' && lastLeaveDateSerial > 1000) {
                    // Kemungkinan format lain atau tanggal yang lebih lama
                    console.log(`[${nik}] Warning: Excel serial ${lastLeaveDateSerial} seems old, trying conversion`);
                    const excelEpoch = new Date(1899, 11, 30);
                    const daysSinceEpoch = Math.floor(lastLeaveDateSerial);
                    lastDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
                    console.log(`[${nik}] Old Excel serial ${lastLeaveDateSerial} converted to ${lastDate.toISOString().split('T')[0]}`);
                  } else {
                    const dateStr = lastLeaveDateSerial.toString().trim();
                    console.log(`[${nik}] Parsing date string: "${dateStr}"`);

                    // Format 1: dd/mm/yyyy atau dd-mm-yyyy (prioritas utama untuk format Indonesia)
                    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr)) {
                      const parts = dateStr.split(/[\/\-]/);
                      const dayNum = parseInt(parts[0]);
                      const monthNum = parseInt(parts[1]);
                      const yearNum = parseInt(parts[2]);

                      console.log(`[${nik}] Parsing DD/MM/YYYY: day=${dayNum}, month=${monthNum}, year=${yearNum}`);

                      // Validate date values - expanded year range for 2025
                      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020 && yearNum <= 2030) {
                        lastDate = new Date(yearNum, monthNum - 1, dayNum);
                        console.log(`[${nik}] DD/MM/YYYY format "${dateStr}" converted to ${lastDate.toISOString().split('T')[0]}`);
                      } else {
                        console.log(`[${nik}] Invalid DD/MM/YYYY values: day=${dayNum}, month=${monthNum}, year=${yearNum}`);
                      }
                    }
                    // Format 2: yyyy/mm/dd atau yyyy-mm-dd
                    else if (/^\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}$/.test(dateStr)) {
                      const [year, month, day] = dateStr.split(/[\/\-]/);
                      const dayNum = parseInt(day);
                      const monthNum = parseInt(month);
                      const yearNum = parseInt(year);

                      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020 && yearNum <= 2030) {
                        lastDate = new Date(yearNum, monthNum - 1, dayNum);
                        console.log(`[${nik}] YYYY/MM/DD format "${dateStr}" converted to ${lastDate.toISOString().split('T')[0]}`);
                      }
                    }
                    // Format 3: Jika parsing DD/MM/YYYY gagal, coba MM/DD/YYYY (American format)
                    else if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateStr) && !lastDate) {
                      const parts = dateStr.split(/[\/\-]/);
                      // Deteksi American format jika part pertama > 12 (pasti month)
                      if (parseInt(parts[0]) > 12) {
                        console.log(`[${nik}] Detected American format (first part > 12)`);
                        // Ini pasti MM/DD/YYYY
                        const monthNum = parseInt(parts[0]);
                        const dayNum = parseInt(parts[1]);
                        const yearNum = parseInt(parts[2]);

                        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020 && yearNum <= 2030) {
                          lastDate = new Date(yearNum, monthNum - 1, dayNum);
                          console.log(`[${nik}] MM/DD/YYYY format "${dateStr}" converted to ${lastDate.toISOString().split('T')[0]}`);
                        }
                      } else if (parseInt(parts[1]) > 12) {
                        console.log(`[${nik}] Detected DD/MM/YYYY format (second part > 12)`);
                        // Ini pasti DD/MM/YYYY, tapi belum berhasil di atas, coba lagi
                        const dayNum = parseInt(parts[0]);
                        const monthNum = parseInt(parts[1]);
                        const yearNum = parseInt(parts[2]);

                        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 2020 && yearNum <= 2030) {
                          lastDate = new Date(yearNum, monthNum - 1, dayNum);
                          console.log(`[${nik}] DD/MM/YYYY format (retry) "${dateStr}" converted to ${lastDate.toISOString().split('T')[0]}`);
                        }
                      }
                    }
                    // Format 4: Tanggal text (15 Januari 2024, dll)
                    else {
                      // Try parsing as ISO date or natural language
                      const tempDate = new Date(dateStr);
                      if (!isNaN(tempDate.getTime()) && tempDate.getFullYear() >= 2020 && tempDate.getFullYear() <= 2030) {
                        lastDate = tempDate;
                        console.log(`[${nik}] Text format "${dateStr}" converted to ${lastDate.toISOString().split('T')[0]}`);
                      } else {
                        console.log(`[${nik}] Unable to parse date: "${dateStr}"`);
                      }
                    }
                  }

                  // Validasi final dan perhitungan
                  if (lastDate && !isNaN(lastDate.getTime())) {
                    finalLastLeaveDate = lastDate.toISOString().split('T')[0];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
                    lastDate.setHours(0, 0, 0, 0); // Reset to start of day

                    // Rumus baru: Terakhir Cuti - Today 
                    monitoringDays = Math.floor((lastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    const workDaysThreshold = finalLeaveOption === "70" ? 70 : 35;
                    const nextDate = new Date(lastDate);
                    nextDate.setDate(lastDate.getDate() + workDaysThreshold);
                    nextLeaveDate = nextDate.toISOString().split('T')[0];

                    // Status berdasarkan rumus baru: Terakhir Cuti - Today
                    console.log(`[${nik}] SUCCESS: Parsed date ${finalLastLeaveDate}, monitoringDays: ${monitoringDays} (${monitoringDays > 0 ? 'hari lagi' : monitoringDays < 0 ? 'sudah lewat' : 'hari ini'})`);

                    // Aturan status baru:
                    if (monitoringDays <= 10 && monitoringDays >= 0) {
                      finalStatus = "Menunggu Cuti";
                    } else if (monitoringDays > 10) {
                      finalStatus = "Aktif";
                    } else if (monitoringDays < 0) {
                      finalStatus = "Cuti Selesai";
                    }
                  } else {
                    // Tanggal tidak bisa diparsing
                    console.log(`[${nik}] ERROR: Failed to parse date "${lastLeaveDateSerial}"`);
                    // Set to current date as fallback instead of error
                    const today = new Date();
                    finalLastLeaveDate = today.toISOString().split('T')[0];
                    monitoringDays = 0;
                    console.log(`[${nik}] Using current date as fallback: ${finalLastLeaveDate}`);
                    errors.push(`Row ${i + 2}: Format tanggal tidak valid "${lastLeaveDateSerial}", menggunakan tanggal hari ini sebagai fallback`);
                  }
                } catch (dateError) {
                  console.error(`[${nik}] Date parsing error:`, dateError);
                  errors.push(`Row ${i + 2}: Error parsing tanggal "${lastLeaveDateSerial}": ${dateError instanceof Error ? dateError.message : String(dateError)}`);
                }
              }

              console.log("Creating monitoring entry for:", nik, name);
              console.log("Data to insert:", {
                nik: nik?.toString(),
                name: name?.toString(),
                nomorLambung: nomorLambung?.toString() || null,
                month: finalMonth,
                investorGroup,
                lastLeaveDate: finalLastLeaveDate || null,
                leaveOption: finalLeaveOption,
                monitoringDays,
                nextLeaveDate: nextLeaveDate || null,
                status: finalStatus,
                onSite: finalOnSite || null
              });

              // Create leave roster monitoring entry - convert Excel serial to date format if needed
              if (onSiteData) {
                const onSiteStr = onSiteData.toString().trim();
                // Check if it's a number (Excel serial date)
                if (!isNaN(Number(onSiteStr)) && Number(onSiteStr) > 40000) {
                  // Convert Excel serial to date format using correct formula
                  const excelEpoch = new Date(1900, 0, 1);
                  const daysSinceEpoch = Number(onSiteStr) - 1; // Fixed conversion
                  const parsedDate = new Date(excelEpoch.getTime() + (daysSinceEpoch * 24 * 60 * 60 * 1000));
                  finalOnSite = parsedDate.toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  });
                } else {
                  // Use as text (Ya/Tidak/etc)
                  finalOnSite = onSiteStr;
                }
              }
              await storage.createLeaveRosterMonitoring({
                nik: nik.toString(),
                name: name.toString(),
                nomorLambung: nomorLambung?.toString() || null,
                month: finalMonth,
                investorGroup: investorGroup,
                lastLeaveDate: finalLastLeaveDate || null,
                leaveOption: finalLeaveOption,
                monitoringDays,
                nextLeaveDate: nextLeaveDate || null,
                status: finalStatus,
                onSite: finalOnSite || null
              });

              successCount++;
              console.log(`Successfully created entry for ${nik} - ${name}`);

            } catch (error) {
              console.error(`❌ Error processing row ${i + 2}:`, error);
              console.error("📋 Row data:", row);
              console.error("🔍 Parsed data:", {
                nik,
                name,
                lastLeaveDateSerial,
                leaveOption,
                monthOrBulan,
                onSiteData
              });

              // Specific error handling
              if (error instanceof Error) {
                console.error("💥 Error message:", error.message);
                console.error("📚 Error stack:", error.stack);

                // Check if it's a database constraint error
                if (error.message.includes('unique') || error.message.includes('constraint')) {
                  console.error("🚨 Database constraint violation detected");
                  errors.push(`Row ${i + 2}: Data duplikat - ${nik} untuk bulan sudah ada`);
                } else if (error.message.includes('validation') || error.message.includes('required')) {
                  console.error("⚠️ Validation error detected");
                  errors.push(`Row ${i + 2}: Validation error - ${error.message}`);
                } else if (error.message.includes('null') || error.message.includes('NOT NULL')) {
                  console.error("🔍 NULL constraint violation detected");
                  errors.push(`Row ${i + 2}: Field yang wajib kosong - periksa NIK, Nama, atau data lainnya`);
                } else {
                  errors.push(`Row ${i + 2}: ${error.message}`);
                }
              } else {
                errors.push(`Row ${i + 2}: Unknown error`);
              }

              console.log(`❌ Failed to create entry for ${nik || 'unknown'} - ${name || 'unknown'}`);
            }
          }

          console.log(`Upload completed: ${successCount} success, ${errors.length} errors`);

          res.json({
            success: successCount,
            errors,
            message: `${successCount} data berhasil diupload${errors.length > 0 ? `, ${errors.length} error` : ''}`
          });

        } catch (error) {
          console.error("Error processing Excel file:", error);
          res.status(500).json({ error: "Failed to process Excel file", details: error instanceof Error ? error.message : 'Unknown error' });
        }
      });

    } catch (error) {
      console.error("Error in Excel upload:", error);
      res.status(500).json({ error: "Failed to upload Excel file", details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Meeting API routes
  app.get("/api/meetings", async (req, res) => {
    try {
      const meetings = await storage.getAllMeetings();
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings:", error);
      res.status(500).json({ error: "Failed to fetch meetings" });
    }
  });

  app.get("/api/meetings/date/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const meetings = await storage.getMeetingsByDate(date);
      res.json(meetings);
    } catch (error) {
      console.error("Error fetching meetings by date:", error);
      res.status(500).json({ error: "Failed to fetch meetings by date" });
    }
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const validatedData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(validatedData);
      res.json(meeting);
    } catch (error) {
      console.error("Error creating meeting:", error);
      res.status(500).json({ error: "Failed to create meeting" });
    }
  });

  app.get("/api/meetings/by-token/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const meeting = await storage.getMeetingByQrToken(token);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      console.error("Error fetching meeting by token:", error);
      res.status(500).json({ error: "Failed to fetch meeting" });
    }
  });

  app.get("/api/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      res.status(500).json({ error: "Failed to fetch meeting" });
    }
  });

  app.put("/api/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertMeetingSchema.parse(req.body);
      const meeting = await storage.updateMeeting(id, validatedData);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json(meeting);
    } catch (error) {
      console.error("Error updating meeting:", error);
      res.status(500).json({ error: "Failed to update meeting" });
    }
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteMeeting(id);
      if (!deleted) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      res.json({ message: "Meeting deleted successfully" });
    } catch (error) {
      console.error("Error deleting meeting:", error);
      res.status(500).json({ error: "Failed to delete meeting" });
    }
  });

  // 1.8. Upload photos for meeting (max 4) using database storage
  app.post("/api/meetings/:id/upload-photos", uploadMemory.array('photos', 4), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Upload files to database and get URLs
      const uploadPromises = files.map(file => dbStorage.uploadFile(file));
      const uploadResults = await Promise.all(uploadPromises);
      const newPhotoUrls = uploadResults.map(res => res.url);

      // Merge with existing photos (max 4 total)
      const existingPhotos = meeting.meetingPhotos || [];
      const allPhotos = [...existingPhotos, ...newPhotoUrls].slice(0, 4);

      // Update only meetingPhotos — don't spread full Meeting object to avoid overwriting with stale data
      const updatedMeeting = await storage.updateMeeting(id, { meetingPhotos: allPhotos });

      res.json({
        message: "Photos uploaded successfully",
        photos: allPhotos,
        meeting: updatedMeeting
      });
    } catch (error) {
      console.error("Error uploading meeting photos:", error);
      res.status(500).json({ error: "Failed to upload meeting photos" });
    }
  });

  // Delete a specific photo from meeting
  app.delete("/api/meetings/:id/photos/:photoIndex", async (req, res) => {
    try {
      const { id, photoIndex } = req.params;
      const index = parseInt(photoIndex);

      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const photos = meeting.meetingPhotos || [];
      if (index < 0 || index >= photos.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      // Delete the actual file from storage
      const photoPath = photos[index];
      if (photoPath.startsWith('/uploads/')) {
        // Legacy: filesystem-stored file
        const fullPath = path.join(process.cwd(), photoPath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      } else if (photoPath.startsWith('/api/uploads/')) {
        // Database-stored file: delete the uploadedFiles record
        const fileId = photoPath.replace('/api/uploads/', '');
        try { await dbStorage.deleteFile(fileId); } catch (_) { /* ignore if already gone */ }
      }

      // Remove from array
      const updatedPhotos = photos.filter((_, i) => i !== index);

      // Update only meetingPhotos
      const updatedMeeting = await storage.updateMeeting(id, { meetingPhotos: updatedPhotos });

      res.json({
        message: "Photo deleted successfully",
        photos: updatedPhotos,
        meeting: updatedMeeting
      });
    } catch (error) {
      console.error("Error deleting meeting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ── Materi PDF upload ──────────────────────────────────────────────────────
  const uploadPdf = multer({ storage: multer.memoryStorage(), limits: { fileSize: 30 * 1024 * 1024 } });

  app.post("/api/meetings/:id/upload-materi", uploadPdf.array('files', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

      const meeting = await storage.getMeeting(id);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const uploadResults = await Promise.all(files.map(f => dbStorage.uploadFile(f)));
      const newUrls = uploadResults.map(r => r.url);

      const existing = (meeting.materiFiles as string[] | null) || [];
      const allFiles = [...existing, ...newUrls];

      // Update DB directly to avoid InsertMeeting type constraint
      const { db } = await import("./db");
      const { meetings: meetingsTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      const [updatedMeeting] = await db.update(meetingsTable)
        .set({ materiFiles: allFiles, updatedAt: sql`now()` })
        .where(eqFn(meetingsTable.id, id))
        .returning();

      res.json({ message: "Materi uploaded", files: allFiles, meeting: updatedMeeting });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading materi:", msg);
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/meetings/:id/materi/:fileIndex", async (req, res) => {
    try {
      const { id, fileIndex } = req.params;
      const index = parseInt(fileIndex);

      const meeting = await storage.getMeeting(id);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const files: string[] = (meeting as any).materiFiles || [];
      if (index < 0 || index >= files.length) return res.status(400).json({ error: "Invalid index" });

      const filePath = files[index];
      if (filePath.startsWith('/api/uploads/')) {
        const fileId = filePath.replace('/api/uploads/', '');
        try { await dbStorage.deleteFile(fileId); } catch (_) { }
      }

      const updatedFiles = files.filter((_, i) => i !== index);
      const updatedMeeting = await storage.updateMeeting(id, { materiFiles: updatedFiles } as any);
      res.json({ message: "Materi deleted", files: updatedFiles, meeting: updatedMeeting });
    } catch (error) {
      console.error("Error deleting materi:", error);
      res.status(500).json({ error: "Failed to delete materi" });
    }
  });

  // ── MoM PDF upload ─────────────────────────────────────────────────────────
  app.post("/api/meetings/:id/upload-mom", uploadPdf.array('files', 5), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

      const meeting = await storage.getMeeting(id);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const uploadResults = await Promise.all(files.map(f => dbStorage.uploadFile(f)));
      const newUrls = uploadResults.map(r => r.url);

      const existing = (meeting as any).momFiles || [];
      const allFiles = [...existing, ...newUrls];

      // Update DB directly to avoid InsertMeeting type constraint
      const { db } = await import("./db");
      const { meetings: meetingsTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      const [updatedMeeting] = await db.update(meetingsTable)
        .set({ momFiles: allFiles, updatedAt: sql`now()` })
        .where(eqFn(meetingsTable.id, id))
        .returning();

      res.json({ message: "MoM uploaded", files: allFiles, meeting: updatedMeeting });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading MoM:", msg);
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/meetings/:id/mom/:fileIndex", async (req, res) => {
    try {
      const { id, fileIndex } = req.params;
      const index = parseInt(fileIndex);

      const meeting = await storage.getMeeting(id);
      if (!meeting) return res.status(404).json({ error: "Meeting not found" });

      const files: string[] = (meeting as any).momFiles || [];
      if (index < 0 || index >= files.length) return res.status(400).json({ error: "Invalid index" });

      const filePath = files[index];
      if (filePath.startsWith('/api/uploads/')) {
        const fileId = filePath.replace('/api/uploads/', '');
        try { await dbStorage.deleteFile(fileId); } catch (_) { }
      }

      const updatedFiles = files.filter((_, i) => i !== index);
      const updatedMeeting = await storage.updateMeeting(id, { momFiles: updatedFiles } as any);
      res.json({ message: "MoM deleted", files: updatedFiles, meeting: updatedMeeting });
    } catch (error) {
      console.error("Error deleting MoM:", error);
      res.status(500).json({ error: "Failed to delete MoM" });
    }
  });

  // Manual attendance entry for meetings - for investors and korlap
  app.post("/api/meetings/:id/manual-attendance", async (req, res) => {
    try {
      const { id } = req.params;

      // Validate request data with manual attendance schema
      const validatedData = insertManualAttendanceSchema.parse(req.body);

      // Check if meeting exists
      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get current time for attendance
      const now = new Date();
      const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // WITA (+8)
      const currentDate = indonesiaTime.toISOString().split('T')[0];
      const currentTime = `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')}:${indonesiaTime.getSeconds().toString().padStart(2, '0')}`;

      // Create manual attendance record
      const attendanceData = {
        ...validatedData,
        meetingId: id,
        scanDate: currentDate,
        scanTime: currentTime,
        attendanceType: "manual_entry" as const
      };

      const attendance = await storage.createMeetingAttendance(attendanceData);

      res.status(201).json({
        message: "Manual attendance recorded successfully",
        attendance,
        attendeeInfo: {
          name: validatedData.manualName,
          position: validatedData.manualPosition,
          department: validatedData.manualDepartment,
          type: "Manual Entry"
        }
      });
    } catch (error) {
      console.error("Error recording manual attendance:", error);
      if (error instanceof Error && error.message.includes('duplicate')) {
        res.status(400).json({ error: "Attendance already recorded for this meeting" });
      } else {
        res.status(500).json({ error: "Failed to record manual attendance" });
      }
    }
  });

  // Get unique investor groups from employee data
  app.get("/api/investor-groups", async (req, res) => {
    try {
      // Check cache first for performance
      let employees = getCachedAllEmployees();

      if (!employees) {
        console.log('🔄 Fetching all employees for investor groups...');
        employees = await storage.getAllEmployees();
        setCachedAllEmployees(employees);
      }

      // Extract unique investor groups, filter out null/undefined/empty values
      const investorGroups = [...new Set(
        employees
          .map(emp => emp.investorGroup)
          .filter(group => group && group.trim() !== '')
      )].sort();

      console.log(`📊 Found ${investorGroups.length} unique investor groups`);

      res.json({
        investorGroups,
        total: investorGroups.length
      });
    } catch (error) {
      console.error("Error fetching investor groups:", error);
      res.status(500).json({ error: "Failed to fetch investor groups" });
    }
  });

  // Meeting QR code validation and attendance recording
  app.post("/api/meetings/qr-scan", async (req, res) => {
    try {
      const { qrToken, employeeId } = req.body;

      if (!qrToken || !employeeId) {
        return res.status(400).json({ error: "QR token and employee ID are required" });
      }

      // Find meeting by QR token
      const meeting = await storage.getMeetingByQrToken(qrToken);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found or invalid QR code" });
      }

      // Check if employee exists - with detailed logging for debugging
      console.log(`Meeting QR Scan - Looking for employee ID: "${employeeId}" (type: ${typeof employeeId})`);

      let employee = await storage.getEmployee(employeeId);
      if (!employee) {
        // Try alternative lookup methods
        console.log(`Employee "${employeeId}" not found, trying alternative lookups...`);

        // Try searching by name or NIK
        const allEmployees = await storage.getAllEmployees();
        console.log(`Total employees in system: ${allEmployees.length}`);

        // Log first few employee IDs for comparison
        console.log('Sample employee IDs:', allEmployees.slice(0, 5).map(emp => `"${emp.id}"`));

        // Try to find by trimmed ID or exact match
        const foundEmployee = allEmployees.find(emp =>
          emp.id === employeeId ||
          emp.id === employeeId.trim() ||
          emp.id.toLowerCase() === employeeId.toLowerCase() ||
          emp.name.toLowerCase().includes(employeeId.toLowerCase())
        );

        if (foundEmployee) {
          console.log(`Found employee by alternative lookup: ${foundEmployee.id} - ${foundEmployee.name}`);
          // Use the found employee
          employee = foundEmployee;
        } else {
          console.log(`Employee "${employeeId}" not found in ${allEmployees.length} total employees`);
          return res.status(404).json({
            error: "Employee not found",
            debug: {
              searchedId: employeeId,
              idType: typeof employeeId,
              totalEmployees: allEmployees.length,
              sampleIds: allEmployees.slice(0, 3).map(emp => emp.id)
            }
          });
        }
      }

      console.log(`Meeting attendance - Found employee: ${employee.id} - ${employee.name}`);

      // Check if employee already attended this meeting TODAY
      const today = new Date().toISOString().split('T')[0];
      const existingAttendance = await storage.checkMeetingAttendance(meeting.id, employeeId);

      console.log(`Checking existing attendance for ${employee.name}:`, {
        exists: !!existingAttendance,
        scanDate: existingAttendance?.scanDate,
        scanTime: existingAttendance?.scanTime,
        today: today
      });

      if (existingAttendance && existingAttendance.scanDate === today) {
        // Allow re-attendance if more than 15 minutes has passed (proper meeting window)
        const now = new Date();
        // Convert to Indonesia time for proper comparison
        const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // WITA (+8)
        const currentTime = indonesiaTime.getHours() * 60 + indonesiaTime.getMinutes(); // minutes since midnight
        const [hours, minutes, seconds] = existingAttendance.scanTime.split(':').map(Number);
        const lastScanTime = hours * 60 + minutes;
        const timeDifference = currentTime - lastScanTime;

        console.log(`Time check for ${employee.name}:`, {
          currentTime: `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')} WITA`,
          lastScanTime: existingAttendance.scanTime,
          timeDifferenceMinutes: timeDifference
        });

        if (timeDifference < 15) {
          const waitMinutes = 15 - timeDifference;
          return res.status(400).json({
            error: "Already attended",
            message: `${employee.name} sudah melakukan scan QR untuk meeting ini pada ${existingAttendance.scanTime} WITA. Silakan tunggu ${waitMinutes} menit lagi untuk scan ulang.`,
            lastScanTime: `${existingAttendance.scanTime} WITA`,
            waitTime: `${waitMinutes} menit lagi`,
            currentTime: `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')} WITA`
          });
        } else {
          console.log(`Allowing re-attendance for ${employee.name} - more than 15 minutes has passed (${timeDifference} minutes)`);
          // Delete previous attendance record to allow new one
          try {
            const deleted = await storage.deleteMeetingAttendance(existingAttendance.id);
            console.log(`Previous attendance deletion result: ${deleted}`);
          } catch (error) {
            console.error(`Error deleting previous attendance:`, error);
          }
        }
      }

      // Record attendance with proper timezone handling
      const now = new Date();
      // Convert to Indonesia time (WIB/WITA) - UTC+7/+8
      const indonesiaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000)); // WITA (+8)
      const scanTime = indonesiaTime.toTimeString().split(' ')[0]; // HH:MM:SS
      const scanDate = indonesiaTime.toISOString().split('T')[0]; // YYYY-MM-DD
      const currentTime = `${indonesiaTime.getHours().toString().padStart(2, '0')}:${indonesiaTime.getMinutes().toString().padStart(2, '0')}`;

      console.log(`Meeting attendance recorded at ${currentTime} WITA for ${employee.name}`);

      const attendance = await storage.createMeetingAttendance({
        meetingId: meeting.id,
        employeeId,
        scanTime,
        scanDate,
        deviceInfo: req.headers['user-agent'] || 'Unknown device'
      });

      res.json({
        success: true,
        message: `✅ ${employee.name} berhasil absen untuk meeting: ${meeting.title} pada ${currentTime} WITA`,
        attendance,
        meeting,
        employee,
        scanTime: `${currentTime} WITA`,
        isReAttendance: !!existingAttendance
      });
    } catch (error) {
      console.error("Error recording meeting attendance:", error);
      res.status(500).json({ error: "Failed to record meeting attendance" });
    }
  });

  // Get meeting attendance
  app.get("/api/meetings/:id/attendance", async (req, res) => {
    try {
      const { id } = req.params;
      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      const attendance = await storage.getMeetingAttendance(id);
      console.log(`📋 Fetched ${attendance.length} attendance records for meeting ${id}`);

      const attendanceWithEmployees = await Promise.all(
        attendance.map(async (att) => {
          // Handle null employeeId for manual entries (investor/korlap)
          const employee = att.employeeId ? await storage.getEmployee(att.employeeId) : null;
          return {
            ...att,
            employee
          };
        })
      );

      console.log(`✅ Processed ${attendanceWithEmployees.length} attendance records with employee data`);

      res.json({
        meeting,
        attendance: attendanceWithEmployees,
        totalAttendees: attendance.length
      });
    } catch (error) {
      console.error("Error fetching meeting attendance:", error);
      res.status(500).json({ error: "Failed to fetch meeting attendance" });
    }
  });

  // Update semua QR Code ke format URL
  app.post("/api/qr/update-all", async (req, res) => {
    try {
      console.log('Starting QR code update process...');
      const employees = await storage.getAllEmployees();
      console.log(`Found ${employees.length} employees to update`);

      const baseUrl = process.env.PUBLIC_BASE_URL
        || (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : null)
        || `${req.protocol}://${req.get('host')}`;

      console.log(`Using base URL: ${baseUrl}`);

      let updatedCount = 0;
      const errors: string[] = [];

      // Process employees in batches to avoid memory issues
      const BATCH_SIZE = 10;
      for (let i = 0; i < employees.length; i += BATCH_SIZE) {
        const batch = employees.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(employees.length / BATCH_SIZE)}`);

        for (const employee of batch) {
          try {
            // Generate new QR URL format (URL-safe base64)
            const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';
            const tokenData = `${employee.id}${secretKey}Attend`;
            const qrToken = Buffer.from(tokenData).toString('base64').slice(0, 16)
              .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
            const qrUrl = `${baseUrl}/qr-redirect?data=${encodeURIComponent(JSON.stringify({ id: employee.id, token: qrToken }))}`;

            // Insert ke qr_tokens (auto-deactivate semua token lama untuk karyawan ini)
            await storage.createQrToken({
              employeeId: employee.id,
              token: qrToken,
              isActive: true,
            });

            // Update employee.qrCode dengan URL baru
            await storage.updateEmployee(employee.id, { qrCode: qrUrl });
            updatedCount++;
            console.log(`Updated QR for employee ${employee.id} - ${employee.name}`);
          } catch (error) {
            console.error(`Failed to update employee ${employee.id}:`, error);
            errors.push(`${employee.id}: ${error}`);
          }
        }
      }

      console.log(`Update complete. Updated: ${updatedCount}, Errors: ${errors.length}`);

      res.json({
        message: `Berhasil update ${updatedCount} QR Code ke format URL`,
        updatedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error('Update QR codes error:', error);
      res.status(500).json({
        message: "Failed to update QR codes",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Compact QR endpoint untuk mobile camera scanning
  app.get("/q/:token", async (req, res) => {
    try {
      const token = req.params.token;

      if (!token) {
        return res.status(400).send(`
          <html>
            <head>
              <title>QR Code Invalid</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>QR Code Invalid</h2>
                <p>Token QR code tidak valid</p>
              </div>
            </body>
          </html>
        `);
      }

      // Find employee by token using QR token table (more efficient)
      let employee = null;
      try {
        // Try to find the token in QR tokens table first
        const allEmployees = await storage.getAllEmployees();
        for (const emp of allEmployees) {
          try {
            const employeeTokens = await storage.getQrTokensByEmployee(emp.id);
            const matchingToken = employeeTokens.find(t => t.token === token && t.isActive);
            if (matchingToken) {
              employee = emp;
              break;
            }
          } catch {
            // Continue if getQrTokensByEmployee fails for this employee
            continue;
          }
        }

        // Fallback to QR code string matching for backward compatibility
        if (!employee) {
          employee = allEmployees.find(emp => {
            try {
              if (emp.qrCode) {
                // Check if qrCode contains this token (either in URL or JSON format)
                return emp.qrCode.includes(token);
              }
              return false;
            } catch {
              return false;
            }
          });
        }
      } catch (error) {
        console.error('Error finding employee by token:', error);
        return res.status(500).send(`
          <html>
            <head>
              <title>Server Error</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>Server Error</h2>
                <p>Error saat mencari karyawan</p>
              </div>
            </body>
          </html>
        `);
      }

      if (!employee) {
        return res.status(404).send(`
          <html>
            <head>
              <title>Employee Not Found</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>Employee Not Found</h2>
                <p>Token QR code tidak ditemukan</p>
              </div>
            </body>
          </html>
        `);
      }

      // Detect mobile and redirect appropriately
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      if (isMobile) {
        return res.redirect(`/mobile-driver?nik=${employee.id}`);
      } else {
        return res.redirect(`/driver-view?nik=${employee.id}`);
      }
    } catch (error) {
      console.error('Compact QR redirect error:', error);
      return res.status(500).send(`
        <html>
          <head>
            <title>Server Error</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
            <div style="text-align:center; padding:20px; font-family:Arial;">
              <h2>Server Error</h2>
              <p>Terjadi kesalahan sistem</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // QR Redirect endpoint untuk handle scan dari luar aplikasi
  app.get("/qr-redirect", async (req, res) => {
    try {
      const data = req.query.data as string;

      if (!data) {
        return res.status(400).send(`
          <html>
            <head>
              <title>QR Code Invalid</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>QR Code Invalid</h2>
                <p>Data QR code tidak valid</p>
              </div>
            </body>
          </html>
        `);
      }

      // Parse QR data
      let qrData;
      try {
        qrData = JSON.parse(decodeURIComponent(data));
      } catch (parseError) {
        // If JSON parsing fails, try to parse as URL for backward compatibility
        try {
          const url = new URL(decodeURIComponent(data));
          const token = url.searchParams.get('token');
          if (url.pathname.includes('/meeting-scanner') && token) {
            return res.redirect(`/meeting-scanner?token=${token}`);
          }
        } catch (urlError) {
          // Neither JSON nor URL, return error
          return res.status(400).send(`
            <html>
              <head>
                <title>QR Code Invalid</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body>
                <div style="text-align:center; padding:20px; font-family:Arial;">
                  <h2>QR Code Invalid</h2>
                  <p>Format QR code tidak dapat diparse</p>
                </div>
              </body>
            </html>
          `);
        }
      }

      // Check if this is a meeting QR code
      if (qrData.type === "meeting" && qrData.token) {
        // Redirect to meeting scanner with the meeting token
        return res.redirect(`/meeting-scanner?token=${qrData.token}`);
      }

      const { id: employeeId, token } = qrData;

      // Validate required fields for regular attendance QR codes
      if (!employeeId || !token) {
        return res.status(400).send(`
          <html>
            <head>
              <title>QR Code Invalid</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>QR Code Invalid</h2>
                <p>QR code tidak memiliki ID atau token yang valid</p>
              </div>
            </body>
          </html>
        `);
      }

      // Validate employee exists
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).send(`
          <html>
            <head>
              <title>Karyawan Tidak Ditemukan</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body>
              <div style="text-align:center; padding:20px; font-family:Arial;">
                <h2>Karyawan Tidak Ditemukan</h2>
                <p>Data karyawan dengan ID ${employeeId} tidak ditemukan</p>
              </div>
            </body>
          </html>
        `);
      }

      // Deteksi device
      const userAgent = req.headers['user-agent'] || '';
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

      if (isMobile) {
        // Redirect ke mobile driver view untuk scan dari handphone
        return res.redirect(`/mobile-driver?nik=${employeeId}`);
      } else {
        // Redirect ke desktop driver view untuk scan dari desktop  
        return res.redirect(`/driver-view`);
      }

    } catch (error) {
      console.error('QR Redirect error:', error);
      return res.status(500).send(`
        <html>
          <head>
            <title>Error</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body>
            <div style="text-align:center; padding:20px; font-family:Arial;">
              <h2>Terjadi Kesalahan</h2>
              <p>Gagal memproses QR code. Silakan coba lagi.</p>
            </div>
          </body>
        </html>
      `);
    }
  });

  // PDF Upload endpoint
  const storage_upload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'pdf');

        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'form-' + uniqueSuffix + '.pdf');
      }
    }),
    fileFilter: function (req, file, cb) {
      // Only allow PDF files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Hanya file PDF yang diperbolehkan'));
      }
    },
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    }
  });

  app.post('/api/upload-pdf', storage_upload.single('pdf'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Tidak ada file yang diupload' });
      }

      res.json({
        success: true,
        fileName: req.file.filename,
        filePath: req.file.path,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Error uploading PDF:', error);
      res.status(500).json({ error: 'Gagal upload PDF' });
    }
  });

  // File download endpoint
  app.get('/api/files/download/:filename', (req, res) => {
    try {
      const filename = req.params.filename;

      // Sanitize filename to prevent path traversal
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), 'uploads', 'pdf', sanitizedFilename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File tidak ditemukan' });
      }

      // Set appropriate headers for PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');

      // Add headers to allow iframe embedding and prevent Chrome blocking
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Content-Security-Policy', "frame-ancestors 'self'");
      res.setHeader('X-Content-Type-Options', 'nosniff');

      // Stream the file
      const fileStream = fs.createReadStream(filePath);

      fileStream.on('error', (error: any) => {
        console.error('Error streaming PDF file:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error membaca file PDF' });
        }
      });

      fileStream.pipe(res);
    } catch (error) {
      console.error('Error in PDF download endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // One-time endpoint to update existing SPARE employees
  app.post("/api/admin/update-spare-origin", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      let updateCount = 0;

      for (const employee of employees) {
        if (employee.nomorLambung === "SPARE" && !employee.isSpareOrigin) {
          await storage.updateEmployee(employee.id, { isSpareOrigin: true });
          updateCount++;
        }
      }

      res.json({
        success: true,
        message: `Updated ${updateCount} SPARE employees`,
        updatedCount: updateCount
      });
    } catch (error) {
      console.error("Failed to update SPARE employees:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update employees"
      });
    }
  });

  // Manual fix for SYAHRANI KAI
  app.post("/api/admin/fix-syahrani", async (req, res) => {
    try {
      await storage.updateEmployee("C-005079", { isSpareOrigin: true });
      // Clear cache to force fresh data
      clearCachedEmployee("C-005079");
      res.json({ success: true, message: "SYAHRANI KAI fixed" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fix" });
    }
  });

  // SIMPER Monitoring routes
  app.get("/api/simper-monitoring", async (req, res) => {
    try {
      const simperData = await storage.getAllSimperMonitoring();

      // Process and validate dates before sending to frontend
      const processedData = simperData.map(simper => {
        const validateAndFormatDate = (dateString: string | null) => {
          if (!dateString) return null;

          try {
            // Try to parse the date
            const date = new Date(dateString);

            // Check if it's a valid date
            if (isNaN(date.getTime())) {
              return null;
            }

            // Return in YYYY-MM-DD format
            return date.toISOString().split('T')[0];
          } catch {
            return null;
          }
        };

        return {
          ...simper,
          simperBibExpiredDate: validateAndFormatDate(simper.simperBibExpiredDate),
          simperTiaExpiredDate: validateAndFormatDate(simper.simperTiaExpiredDate)
        };
      });

      res.json(processedData);
    } catch (error) {
      console.error('Error fetching SIMPER data:', error);
      res.status(500).json({ message: "Failed to fetch SIMPER monitoring data" });
    }
  });

  // SIMPER Analytics endpoint - MUST come before :id route!
  app.get("/api/simper-monitoring/analytics", async (req, res) => {
    try {
      const allSimperData = await storage.getAllSimperMonitoring();

      if (allSimperData.length === 0) {
        return res.status(404).json({ message: "Data SIMPER tidak ditemukan" });
      }

      const today = new Date();

      // Calculate monitoring days and status for each SIMPER record
      const processedData = allSimperData.map(simper => {
        const processBIB = (expiredDate: string | null) => {
          if (!expiredDate) return { days: null, status: 'Tidak Ada Data' };

          const expired = new Date(expiredDate);
          const diffTime = expired.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays < 0) return { days: diffDays, status: 'Segera Perpanjang' };
          if (diffDays < 7) return { days: diffDays, status: 'Mendekati Perpanjangan' };
          if (diffDays < 30) return { days: diffDays, status: 'Menuju Perpanjangan' };
          return { days: diffDays, status: 'Aktif' };
        };

        const bibStatus = processBIB(simper.simperBibExpiredDate);
        const tiaStatus = processBIB(simper.simperTiaExpiredDate);

        return {
          ...simper,
          bibMonitoringDays: bibStatus.days,
          bibStatus: bibStatus.status,
          tiaMonitoringDays: tiaStatus.days,
          tiaStatus: tiaStatus.status
        };
      });

      // Calculate statistics
      const totalKaryawan = processedData.length;

      const bibStats = {
        segera: processedData.filter(s => s.bibStatus === 'Segera Perpanjang').length,
        mendekati: processedData.filter(s => s.bibStatus === 'Mendekati Perpanjangan').length,
        menuju: processedData.filter(s => s.bibStatus === 'Menuju Perpanjangan').length,
        aktif: processedData.filter(s => s.bibStatus === 'Aktif').length
      };

      const tiaStats = {
        segera: processedData.filter(s => s.tiaStatus === 'Segera Perpanjang').length,
        mendekati: processedData.filter(s => s.tiaStatus === 'Mendekati Perpanjangan').length,
        menuju: processedData.filter(s => s.tiaStatus === 'Menuju Perpanjangan').length,
        aktif: processedData.filter(s => s.tiaStatus === 'Aktif').length
      };

      // Get critical list (expired or expiring soon)
      const criticalList = processedData
        .filter(s =>
          (s.bibMonitoringDays !== null && s.bibMonitoringDays < 30) ||
          (s.tiaMonitoringDays !== null && s.tiaMonitoringDays < 30)
        )
        .sort((a, b) => {
          const aMinDays = Math.min(a.bibMonitoringDays || 999, a.tiaMonitoringDays || 999);
          const bMinDays = Math.min(b.bibMonitoringDays || 999, b.tiaMonitoringDays || 999);
          return aMinDays - bMinDays;
        })
        .slice(0, 10);

      res.json({
        totalKaryawan,
        bibStats,
        tiaStats,
        criticalList,
        processedData
      });
    } catch (error) {
      console.error('Error fetching SIMPER analytics:', error);
      res.status(500).json({ message: "Failed to fetch SIMPER analytics" });
    }
  });

  app.get("/api/simper-monitoring/:id", async (req, res) => {
    try {
      const simper = await storage.getSimperMonitoring(req.params.id);
      if (!simper) {
        return res.status(404).json({ message: "Data SIMPER tidak ditemukan" });
      }

      // Validate and format dates
      const validateAndFormatDate = (dateString: string | null) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().split('T')[0];
        } catch {
          return null;
        }
      };

      const processedSimper = {
        ...simper,
        simperBibExpiredDate: validateAndFormatDate(simper.simperBibExpiredDate),
        simperTiaExpiredDate: validateAndFormatDate(simper.simperTiaExpiredDate)
      };

      res.json(processedSimper);
    } catch (error) {
      console.error('Error fetching SIMPER:', error);
      res.status(500).json({ message: "Failed to fetch SIMPER data" });
    }
  });

  app.get("/api/simper-monitoring/nik/:nik", async (req, res) => {
    try {
      const simper = await storage.getSimperMonitoringByNik(req.params.nik);
      if (!simper) {
        return res.status(404).json({ message: "Data SIMPER tidak ditemukan untuk NIK tersebut" });
      }

      // Validate and format dates
      const validateAndFormatDate = (dateString: string | null) => {
        if (!dateString) return null;
        try {
          const date = new Date(dateString);
          if (isNaN(date.getTime())) return null;
          return date.toISOString().split('T')[0];
        } catch {
          return null;
        }
      };

      const processedSimper = {
        ...simper,
        simperBibExpiredDate: validateAndFormatDate(simper.simperBibExpiredDate),
        simperTiaExpiredDate: validateAndFormatDate(simper.simperTiaExpiredDate)
      };

      res.json(processedSimper);
    } catch (error) {
      console.error('Error fetching SIMPER by NIK:', error);
      res.status(500).json({ message: "Failed to fetch SIMPER data by NIK" });
    }
  });

  app.post("/api/simper-monitoring", async (req, res) => {
    try {
      const validatedData = insertSimperMonitoringSchema.parse(req.body);

      // Check if NIK already exists
      const existingSimper = await storage.getSimperMonitoringByNik(validatedData.nik);
      if (existingSimper) {
        return res.status(409).json({ message: "Data SIMPER untuk NIK ini sudah ada" });
      }

      const simper = await storage.createSimperMonitoring(validatedData);
      res.status(201).json(simper);
    } catch (error) {
      console.error('Error creating SIMPER:', error);
      res.status(400).json({ message: "Invalid SIMPER data" });
    }
  });

  app.put("/api/simper-monitoring/:id", async (req, res) => {
    try {
      const validatedData = insertSimperMonitoringSchema.partial().parse(req.body);
      const updatedSimper = await storage.updateSimperMonitoring(req.params.id, validatedData);

      if (!updatedSimper) {
        return res.status(404).json({ message: "Data SIMPER tidak ditemukan" });
      }

      res.json(updatedSimper);
    } catch (error) {
      console.error('Error updating SIMPER:', error);
      res.status(400).json({ message: "Invalid SIMPER data" });
    }
  });

  app.delete("/api/simper-monitoring/:id", async (req, res) => {
    try {
      const success = await storage.deleteSimperMonitoring(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Data SIMPER tidak ditemukan" });
      }
      res.json({ message: "Data SIMPER berhasil dihapus" });
    } catch (error) {
      console.error('Error deleting SIMPER:', error);
      res.status(500).json({ message: "Failed to delete SIMPER data" });
    }
  });

  app.delete("/api/simper-monitoring", async (req, res) => {
    try {
      await storage.deleteAllSimperMonitoring();
      res.json({ message: "Semua data SIMPER berhasil dihapus" });
    } catch (error) {
      console.error('Error deleting all SIMPER data:', error);
      res.status(500).json({ message: "Failed to delete all SIMPER data" });
    }
  });

  // Send SIMPER expired notification email manually (for testing)
  app.post("/api/simper-monitoring/send-notification", async (req, res) => {
    try {
      const { simperNotificationService } = await import('./services/simperNotificationService');
      const result = await simperNotificationService.checkAndNotifySimperExpired();

      if (result.sent) {
        res.json({
          success: true,
          message: `Email notifikasi berhasil dikirim dengan ${result.count} karyawan yang SIMPER-nya expired/akan expired`
        });
      } else if (result.count === 0) {
        res.json({
          success: true,
          message: "Tidak ada SIMPER yang expired atau akan expired dalam 30 hari"
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Gagal mengirim email. Pastikan kredensial Gmail sudah dikonfigurasi."
        });
      }
    } catch (error) {
      console.error('Error sending SIMPER notification:', error);
      res.status(500).json({ message: "Failed to send SIMPER notification" });
    }
  });

  // Helper function to convert Excel serial date to JavaScript Date
  const excelSerialDateToJSDate = (serial: any) => {
    if (!serial || serial === 'N/A' || serial === '' || serial === null || serial === undefined) {
      return null;
    }

    // Handle Date objects directly (Excel with cellDates: true might return Date objects)
    if (serial instanceof Date) {
      return serial.toISOString().split('T')[0];
    }

    // If it's already a string date, try to parse it
    if (typeof serial === 'string') {
      const dateStr = serial.trim();

      // PRIORITAS UTAMA: Format Indonesia dd-mm-yyyy
      if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // PRIORITAS KEDUA: Format Indonesia dd/mm/yyyy
      if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
        const [day, month, year] = dateStr.split('/');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // Format ISO yyyy-mm-dd (untuk compatibility)
      if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(dateStr)) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }

      // Fallback: general date parsing
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate.toISOString().split('T')[0];
      }
    }

    // If it's a number, treat it as Excel serial date
    if (typeof serial === 'number' && serial > 0) {
      // Excel serial date starts from January 1, 1900
      // Excel incorrectly treats 1900 as a leap year, so we need to adjust
      const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
      const jsDate = new Date(excelEpoch.getTime() + (serial * 24 * 60 * 60 * 1000));

      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().split('T')[0];
      }
    }

    return null;
  };

  // SIMPER Excel upload configuration
  const excelUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: function (req, file, cb) {
      // Only allow Excel files
      if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        file.mimetype === 'application/vnd.ms-excel') {
        cb(null, true);
      } else {
        cb(new Error('Hanya file Excel (.xlsx/.xls) yang diperbolehkan'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // SIMPER bulk upload Excel
  app.post("/api/simper-monitoring/upload-excel", excelUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File Excel tidak ditemukan" });
      }

      const XLSX = await import('xlsx');

      // Try reading with different options to handle various Excel formats
      console.log(`📄 Reading Excel file with size: ${req.file.buffer.length} bytes`);
      const workbook = XLSX.read(req.file.buffer, {
        type: 'buffer',
        cellDates: true,
        cellNF: false,
        cellText: false
      });

      console.log(`📊 Excel workbook contains ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Get range info
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      console.log(`📏 Worksheet range: ${range.s.r + 1} to ${range.e.r + 1} rows, ${range.s.c + 1} to ${range.e.c + 1} columns`);

      // Convert to JSON with both raw and formatted data
      const data = XLSX.utils.sheet_to_json(worksheet, {
        raw: false,
        dateNF: 'dd-mm-yyyy'
      });

      console.log(`📋 Raw Excel data (first row):`, data[0] || 'No data found');

      console.log(`🔄 Processing SIMPER Excel with ${data.length} rows`);
      console.log('📋 Excel columns found:', Object.keys(data[0] || {}));
      console.log('📅 Template Excel Format: dd-mm-yyyy (contoh: 15-12-2025)');

      const simperData = data.map((row: any, index: number) => {
        // Enhanced column mapping with more variations
        const employeeName = row['Nama Karyawan'] || row['Nama'] || row['nama'] || row['NAMA KARYAWAN'] || row['NAMA'] || '';
        const nik = row['NIK'] || row['nik'] || row['No. Identitas'] || row['No Identitas'] || '';

        // Multiple column name variations for SIMPER dates
        const bibDate = row['Tanggal SIMPER BIB Mati'] || row['SIMPER BIB'] || row['Tanggal BIB'] ||
          row['BIB Expired'] || row['BIB Mati'] || row['SIMPER BIB Expired'] ||
          row['simper_bib'] || row['bib_date'] || '';

        const tiaDate = row['Tanggal SIMPER TIA Mati'] || row['SIMPER TIA'] || row['Tanggal TIA'] ||
          row['TIA Expired'] || row['TIA Mati'] || row['SIMPER TIA Expired'] ||
          row['simper_tia'] || row['tia_date'] || '';

        const processedBibDate = excelSerialDateToJSDate(bibDate);
        const processedTiaDate = excelSerialDateToJSDate(tiaDate);

        return {
          employeeName: employeeName.trim(),
          nik: nik.trim(),
          simperBibExpiredDate: processedBibDate || undefined,
          simperTiaExpiredDate: processedTiaDate || undefined
        };
      });

      const result = await storage.bulkUploadSimperData(simperData);

      console.log(`✅ SIMPER upload completed: ${result.success} success, ${result.errors.length} errors`);
      if (result.errors.length > 0) {
        console.log('❌ Upload errors:', result.errors);
      }

      res.json({
        message: `Upload berhasil: ${result.success} data berhasil diproses`,
        success: result.success,
        errors: result.errors
      });

      // Clean up uploaded file
      if (req.file.path) {
        fs.unlinkSync(req.file.path);
      }
    } catch (error) {
      console.error('Error uploading SIMPER Excel:', error);
      res.status(500).json({ message: "Gagal mengupload file Excel SIMPER" });
    }
  });



  // ============================================
  // SIDAK FATIGUE ROUTES (PUBLIC ACCESS - NO AUTH)
  // ============================================

  // Create new Sidak Fatigue session
  app.post("/api/sidak-fatigue", async (req, res) => {
    try {
      const validatedData = insertSidakFatigueSessionSchema.parse(req.body);

      // Get logged-in user's NIK to track who created this SIDAK
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakFatigueSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Fatigue session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Fatigue" });
    }
  });

  // Get all Sidak Fatigue sessions (filtered by user role)
  app.get("/api/sidak-fatigue", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakFatigueSessions();

      // Filter by createdBy based on user role
      // ADMIN can see all, others only see their own
      const sessionUser = (req.session as any).user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      // Add computed totalSampel (actual count from records) and observers to each session
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakFatigueRecords(session.id),
            storage.getSidakFatigueObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Fatigue sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Fatigue" });
    }
  });

  // ── Upload scan recording per driver record (MUST be before /:id) ──────────
  app.post("/api/sidak-fatigue/records/:recordId/scan-recording", uploadPdf.single('file'), async (req, res) => {
    try {
      const { recordId } = req.params;
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const { url } = await dbStorage.uploadFile(file);

      const { db: dbClient } = await import("./db");
      const { sidakFatigueRecords: recTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      await dbClient.update(recTable)
        .set({ scanVideoUrl: url } as any)
        .where(eqFn(recTable.id, recordId));

      res.json({ url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading scan recording:", msg);
      res.status(500).json({ error: msg });
    }
  });

  // Rekaman PVT (kamera depan saat tes PVT)
  app.post("/api/sidak-fatigue/records/:recordId/pvt-recording", uploadPdf.single('file'), async (req, res) => {
    try {
      const { recordId } = req.params;
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const { url } = await dbStorage.uploadFile(file);

      const { db: dbClient } = await import("./db");
      const { sidakFatigueRecords: recTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      await dbClient.update(recTable)
        .set({ pvtVideoUrl: url } as any)
        .where(eqFn(recTable.id, recordId));

      res.json({ url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading PVT recording:", msg);
      res.status(500).json({ error: msg });
    }
  });

  // ── Get session scan recordings (MUST be before /:id) ───────────────────
  app.get("/api/sidak-fatigue/:sessionId/scan-recordings", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser || sessionUser.role !== 'ADMIN') {
        return res.status(403).json({ error: "Akses ditolak. Hanya ADMIN." });
      }
      const { sessionId } = req.params;
      const records = await storage.getSidakFatigueRecords(sessionId);
      const result = records.map(r => ({
        id: r.id,
        nama: r.nama,
        nik: r.nik,
        jabatan: r.jabatan,
        nomorLambung: r.nomorLambung,
        karyawanSiapBekerja: r.karyawanSiapBekerja,
        scanVideoUrl: (r as any).scanVideoUrl || null,
        pvtVideoUrl: (r as any).pvtVideoUrl || null,
        createdAt: r.createdAt,
      }));
      res.json(result);
    } catch (error) {
      console.error("Error fetching scan recordings:", error);
      res.status(500).json({ error: "Gagal mengambil data" });
    }
  });

  // ── List supervisor recordings (admin only) — MUST be before /:id ─────────
  app.get("/api/sidak-fatigue/supervisor-recordings", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      if (!sessionUser || sessionUser.role !== 'ADMIN') {
        return res.status(403).json({ error: "Akses ditolak. Hanya ADMIN." });
      }

      const { month } = req.query as { month?: string };

      let sessions = await storage.getAllSidakFatigueSessions();

      // Filter by month
      if (month) {
        sessions = sessions.filter(s => String(s.tanggal).startsWith(month));
      }

      const allEmployees = await storage.getAllEmployees();
      const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

      const result = sessions.map(s => {
        const emp = s.createdBy ? employeeMap.get(s.createdBy) : null;
        return {
          sessionId: s.id,
          tanggal: s.tanggal,
          shift: s.shift,
          lokasi: s.lokasi,
          area: s.area,
          createdBy: s.createdBy || "",
          supervisorName: emp?.name || s.createdBy || "Unknown",
          supervisorVideoUrl: (s as any).supervisorVideoUrl || null,
          hasRecording: !!(s as any).supervisorVideoUrl,
        };
      });

      result.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
      res.json(result);
    } catch (error) {
      console.error("Error fetching supervisor recordings:", error);
      res.status(500).json({ error: "Gagal mengambil data rekaman" });
    }
  });

  // Get single Sidak Fatigue session with records and observers
  app.get("/api/sidak-fatigue/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [session, records, observers] = await Promise.all([
        storage.getSidakFatigueSession(id),
        storage.getSidakFatigueRecords(id),
        storage.getSidakFatigueObservers(id)
      ]);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Fatigue tidak ditemukan" });
      }

      res.json({
        ...session,
        records,
        observers
      });
    } catch (error) {
      console.error("Error fetching Sidak Fatigue session:", error);
      res.status(500).json({ message: "Gagal mengambil detail sesi Sidak Fatigue" });
    }
  });

  // Add employee record to Sidak Fatigue session
  app.post("/api/sidak-fatigue/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakFatigueRecordSchema.parse({
        ...req.body,
        sessionId: id
      });

      const record = await storage.createSidakFatigueRecord(validatedData);

      // Update session sample count
      await storage.updateSidakFatigueSessionSampleCount(id);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_FATIGUE",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record,
        tindakLanjut: record.catatanIntervensi,
        moduleLabel: "Sidak Fatigue"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Fatigue record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      // Check for max limit error
      if (error.message?.includes('Maksimal 20 karyawan')) {
        return res.status(422).json({ message: error.message });
      }
      res.status(500).json({ message: "Gagal menambahkan data karyawan" });
    }
  });

  // ============================================
  // SIDAK FATIGUE PHOTO UPLOAD (Local Adapter)
  // ============================================

  // Step 1: Request upload URL (Database Storage)
  app.post("/api/sidak-fatigue/:id/request-upload-url", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: "Filename is required" });

      const session = await storage.getSidakFatigueSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(name) || '.jpg';
      const filename = `${timestamp}-${randomStr}${ext}`;

      const protocol = req.protocol;
      const host = req.get('host');
      const uploadURL = `${protocol}://${host}/api/sidak-fatigue/temp-upload/${filename}`;

      // Return upload URL - actual storage path will be determined after upload
      res.json({ uploadURL, objectPath: filename });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Step 2: Temp upload endpoint (Database Storage)
  app.put("/api/sidak-fatigue/temp-upload/:filename", async (req, res) => {
    try {
      const { filename } = req.params;

      // Collect the incoming data as a buffer
      const chunks: Buffer[] = [];

      req.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);

          // Create a mock multer file object
          const mockFile = {
            buffer: buffer,
            originalname: filename,
            mimetype: req.headers['content-type'] || 'image/jpeg',
          } as Express.Multer.File;

          // Upload to database
          const result = await dbStorage.uploadFile(mockFile);

          res.json({
            success: true,
            id: result.id,
            url: result.url
          });
        } catch (error) {
          console.error("Database upload error:", error);
          res.status(500).json({ error: "Failed to upload to database" });
        }
      });

      req.on('error', (err) => {
        console.error("Request error:", err);
        res.status(500).json({ error: "Request failed" });
      });
    } catch (error) {
      console.error("Temp upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Step 3: Confirm upload (Database Storage)
  app.post("/api/sidak-fatigue/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { url } = req.body; // Accept the 'url' from the temp-upload response

      const session = await storage.getSidakFatigueSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, url]; // Store the database URL

      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession.activityPhotos });
    } catch (error) {
      console.error("Error confirming upload:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  });

  // ============================================
  // SIDAK TINGKAH LAKU DRIVER (Behavior)
  // ============================================

  const sidakBehaviorPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed'));
      }
    }
  });

  app.post("/api/sidak-behavior/upload", sidakBehaviorPhotoUpload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }
      const { url: photoUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading behavior evidence photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/sidak-behavior", async (req, res) => {
    try {
      const validatedData = insertSidakBehaviorSessionSchema.parse(req.body);

      // Get logged-in user's NIK to track who created this SIDAK
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakBehaviorSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Behavior session:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Behavior: " + (error?.message || 'Unknown error') });
    }
  });

  app.get("/api/sidak-behavior", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakBehaviorSessions();

      const sessionUser = (req.session as any)?.user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      // Add computed totalSampel (actual count from records) and observers to each session
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakBehaviorRecords(session.id),
            storage.getSidakBehaviorObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            records,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Behavior sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data Sidak Behavior" });
    }
  });

  app.get("/api/sidak-behavior/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [session, records, observers] = await Promise.all([
        storage.getSidakBehaviorSession(id),
        storage.getSidakBehaviorRecords(id),
        storage.getSidakBehaviorObservers(id)
      ]);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Behavior tidak ditemukan" });
      }

      res.json({ ...session, records, observers });
    } catch (error) {
      console.error("Error fetching Sidak Behavior detail:", error);
      res.status(500).json({ message: "Gagal mengambil detail Sidak Behavior" });
    }
  });

  app.post("/api/sidak-behavior/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakBehaviorRecordSchema.parse(req.body);

      const record = await storage.createSidakBehaviorRecord({
        ...validatedData,
        sessionId: id
      });

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_BEHAVIOR",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.checklistResults,
        moduleLabel: "Sidak Behavior"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Behavior record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data behavior driver" });
    }
  });

  app.post("/api/sidak-behavior/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakBehaviorObserverSchema.parse(req.body);

      const observer = await storage.createSidakBehaviorObserver({
        ...validatedData,
        sessionId: id
      });
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Behavior observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // ============================================
  // SIDAK CHARGING STATION (Observasi Kepatuhan Driver di Area Charging Station)
  // ============================================

  const sidakChargingStationPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only images are allowed'));
      }
    }
  });

  app.post("/api/sidak-charging-station/upload", sidakChargingStationPhotoUpload.single("photo"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No photo uploaded" });
      }
      const { url: photoUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading charging station evidence photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/sidak-charging-station", async (req, res) => {
    try {
      const validatedData = insertSidakChargingStationSessionSchema.parse(req.body);

      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakChargingStationSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Charging Station session:", error);
      if (error?.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Charging Station: " + (error?.message || 'Unknown error') });
    }
  });

  app.get("/api/sidak-charging-station", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakChargingStationSessions();

      const sessionUser = (req.session as any)?.user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakChargingStationRecords(session.id),
            storage.getSidakChargingStationObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            records,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Charging Station sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data Sidak Charging Station" });
    }
  });

  app.get("/api/sidak-charging-station/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [session, records, observers] = await Promise.all([
        storage.getSidakChargingStationSession(id),
        storage.getSidakChargingStationRecords(id),
        storage.getSidakChargingStationObservers(id)
      ]);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Charging Station tidak ditemukan" });
      }

      res.json({ ...session, records, observers });
    } catch (error) {
      console.error("Error fetching Sidak Charging Station detail:", error);
      res.status(500).json({ message: "Gagal mengambil detail Sidak Charging Station" });
    }
  });

  app.post("/api/sidak-charging-station/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakChargingStationRecordSchema.parse(req.body);

      const record = await storage.createSidakChargingStationRecord({
        ...validatedData,
        sessionId: id
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Charging Station record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data driver" });
    }
  });

  app.post("/api/sidak-charging-station/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakChargingStationObserverSchema.parse(req.body);

      const observer = await storage.createSidakChargingStationObserver({
        ...validatedData,
        sessionId: id
      });
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Charging Station observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // ============================================
  // SIDAK OBSERVASI SOP KRITIS (Ringkasan Pengendalian dan SOP Kritikal)
  // ============================================

  const sidakSopKritisPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) cb(null, true);
      else cb(new Error('Only images are allowed'));
    }
  });

  app.post("/api/sidak-sop-kritis/upload", sidakSopKritisPhotoUpload.single("photo"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No photo uploaded" });
      const { url: photoUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading SOP Kritis evidence photo:", error);
      res.status(500).json({ error: "Failed to upload photo" });
    }
  });

  app.post("/api/sidak-sop-kritis", async (req, res) => {
    try {
      const validatedData = insertSidakSopKritisSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const session = await storage.createSopKritisSession({ ...validatedData, createdBy: sessionUser?.nik || null });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak SOP Kritis session:", error);
      if (error?.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi SOP Kritis: " + (error?.message || 'Unknown error') });
    }
  });

  app.get("/api/sidak-sop-kritis", async (req, res) => {
    try {
      let sessions = await storage.getAllSopKritisSessions();
      const sessionUser = (req.session as any)?.user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [pengendalian, langkah, observers] = await Promise.all([
            storage.getSopKritisPengendalian(session.id),
            storage.getSopKritisLangkah(session.id),
            storage.getSopKritisObservers(session.id),
          ]);
          return { ...session, totalSampel: langkah.length, pengendalian, langkah, observers };
        })
      );
      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak SOP Kritis sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data SOP Kritis" });
    }
  });

  app.get("/api/sidak-sop-kritis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [session, pengendalian, langkah, observers] = await Promise.all([
        storage.getSopKritisSession(id),
        storage.getSopKritisPengendalian(id),
        storage.getSopKritisLangkah(id),
        storage.getSopKritisObservers(id),
      ]);
      if (!session) return res.status(404).json({ message: "Sesi SOP Kritis tidak ditemukan" });
      res.json({ ...session, pengendalian, langkah, observers });
    } catch (error) {
      console.error("Error fetching Sidak SOP Kritis detail:", error);
      res.status(500).json({ message: "Gagal mengambil detail SOP Kritis" });
    }
  });

  app.post("/api/sidak-sop-kritis/:id/pengendalian", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakSopKritisPengendalianSchema.parse(req.body);
      const item = await storage.createSopKritisPengendalian({ ...validatedData, sessionId: id });
      res.json(item);
    } catch (error: any) {
      console.error("Error adding SOP Kritis pengendalian:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan pengendalian kritikal" });
    }
  });

  app.post("/api/sidak-sop-kritis/:id/langkah", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakSopKritisLangkahSchema.parse(req.body);
      const item = await storage.createSopKritisLangkah({ ...validatedData, sessionId: id });
      res.json(item);
    } catch (error: any) {
      console.error("Error adding SOP Kritis langkah:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan item/langkah kritikal" });
    }
  });

  app.post("/api/sidak-sop-kritis/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakSopKritisObserverSchema.parse(req.body);
      const observer = await storage.createSopKritisObserver({ ...validatedData, sessionId: id });
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding SOP Kritis observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan pemantau" });
    }
  });

  // Edit (update) sesi SOP Kritis: update header + replace-all child (pengendalian/langkah/observers)
  app.put("/api/sidak-sop-kritis/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await storage.getSopKritisSession(id);
      if (!existing) return res.status(404).json({ message: "Sesi SOP Kritis tidak ditemukan" });

      const { pengendalian = [], langkah = [], observers = [], ...sessionBody } = req.body || {};

      // Validasi & update field header (partial agar field non-header diabaikan)
      const validatedHeader = insertSidakSopKritisSessionSchema.partial().parse(sessionBody);
      await storage.updateSopKritisSession(id, { ...validatedHeader, updatedAt: new Date() } as any);

      // Replace-all child rows
      await Promise.all([
        storage.deleteSopKritisPengendalianBySession(id),
        storage.deleteSopKritisLangkahBySession(id),
        storage.deleteSopKritisObserversBySession(id),
      ]);
      for (const item of pengendalian) {
        const v = insertSidakSopKritisPengendalianSchema.parse(item);
        await storage.createSopKritisPengendalian({ ...v, sessionId: id });
      }
      for (const item of langkah) {
        const v = insertSidakSopKritisLangkahSchema.parse(item);
        await storage.createSopKritisLangkah({ ...v, sessionId: id });
      }
      for (const obs of observers) {
        const v = insertSidakSopKritisObserverSchema.parse(obs);
        await storage.createSopKritisObserver({ ...v, sessionId: id });
      }

      const [session, peng, lang, obs] = await Promise.all([
        storage.getSopKritisSession(id),
        storage.getSopKritisPengendalian(id),
        storage.getSopKritisLangkah(id),
        storage.getSopKritisObservers(id),
      ]);
      res.json({ ...session, pengendalian: peng, langkah: lang, observers: obs });
    } catch (error: any) {
      console.error("Error updating Sidak SOP Kritis:", error);
      if (error?.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal memperbarui SOP Kritis: " + (error?.message || 'Unknown error') });
    }
  });

  // Delete photo
  app.delete("/api/sidak-fatigue/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);

      const session = await storage.getSidakFatigueSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
        return res.status(404).json({ error: "Invalid photo index" });
      }

      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession.activityPhotos });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ── Supervisor recording upload ─────────────────────────────────────────
  app.post("/api/sidak-fatigue/:id/supervisor-recording", uploadPdf.single('file'), async (req, res) => {
    try {
      const { id } = req.params;
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: "No file uploaded" });

      const session = await storage.getSidakFatigueSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const { url } = await dbStorage.uploadFile(file);

      const { db: dbClient } = await import("./db");
      const { sidakFatigueSessions: sessTable } = await import("@shared/schema");
      const { eq: eqFn } = await import("drizzle-orm");
      await dbClient.update(sessTable)
        .set({ supervisorVideoUrl: url, updatedAt: sql`now()` })
        .where(eqFn(sessTable.id, id));

      res.json({ url });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading supervisor recording:", msg);
      res.status(500).json({ error: msg });
    }
  });

  // ============================================
  // SIDAK PHOTO UPLOAD - GENERIC ENDPOINT HELPER
  // ============================================

  /**
   * Generic function to create photo upload endpoints for any SIDAK type
   * Handles: request-upload-url, temp-upload, confirm-upload, and delete photo
   */
  function createSidakPhotoEndpoints(
    sidakType: string,
    getSession: (id: string) => Promise<any>,
    updateSession: (id: string, data: any) => Promise<any>
  ) {
    // Step 1: Request upload URL
    app.post(`/api/sidak-${sidakType}/:id/request-upload-url`, async (req, res) => {
      try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) return res.status(400).json({ error: "Filename is required" });

        const session = await getSession(id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const ext = path.extname(name) || '.jpg';
        const filename = `${timestamp}-${randomStr}${ext}`;

        const protocol = req.protocol;
        const host = req.get('host');
        const uploadURL = `${protocol}://${host}/api/sidak-${sidakType}/temp-upload/${filename}`;

        res.json({ uploadURL, objectPath: filename });
      } catch (error: any) {
        console.error(`[SIDAK ${sidakType}] Error generating upload URL:`, error);
        res.status(500).json({ error: "Failed to generate upload URL" });
      }
    });

    // Step 2: Temp upload (Database Storage)
    app.put(`/api/sidak-${sidakType}/temp-upload/:filename`, async (req, res) => {
      try {
        const { filename } = req.params;
        const chunks: Buffer[] = [];

        req.on('data', (chunk) => {
          chunks.push(Buffer.from(chunk));
        });

        req.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);
            const mockFile = {
              buffer: buffer,
              originalname: filename,
              mimetype: req.headers['content-type'] || 'image/jpeg',
            } as Express.Multer.File;

            const result = await dbStorage.uploadFile(mockFile);

            res.json({
              success: true,
              id: result.id,
              url: result.url
            });
          } catch (error) {
            console.error(`[SIDAK ${sidakType}] Database upload error:`, error);
            res.status(500).json({ error: "Failed to upload to database" });
          }
        });

        req.on('error', (err) => {
          console.error(`[SIDAK ${sidakType}] Request error:`, err);
          res.status(500).json({ error: "Request failed" });
        });
      } catch (error) {
        console.error(`[SIDAK ${sidakType}] Temp upload error:`, error);
        res.status(500).json({ error: "Upload failed" });
      }
    });

    // Step 3: Confirm upload
    app.post(`/api/sidak-${sidakType}/:id/confirm-upload`, async (req, res) => {
      try {
        const { id } = req.params;
        const { url } = req.body;

        const session = await getSession(id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        const existingPhotos = session.activityPhotos || [];
        const updatedPhotos = [...existingPhotos, url];

        const updatedSession = await updateSession(id, {
          activityPhotos: updatedPhotos
        });

        res.json({ photos: updatedSession.activityPhotos });
      } catch (error) {
        console.error(`[SIDAK ${sidakType}] Error confirming upload:`, error);
        res.status(500).json({ error: "Failed to confirm upload" });
      }
    });

    // Delete photo
    app.delete(`/api/sidak-${sidakType}/:id/photos/:index`, async (req, res) => {
      try {
        const { id, index } = req.params;
        const photoIndex = parseInt(index, 10);

        const session = await getSession(id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        const existingPhotos = session.activityPhotos || [];
        if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
          return res.status(404).json({ error: "Invalid photo index" });
        }

        const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

        const updatedSession = await updateSession(id, {
          activityPhotos: updatedPhotos
        });

        res.json({ photos: updatedSession.activityPhotos });
      } catch (error) {
        console.error(`[SIDAK ${sidakType}] Error deleting photo:`, error);
        res.status(500).json({ error: "Failed to delete photo" });
      }
    });
  }

  // Register photo upload endpoints for all SIDAK types
  createSidakPhotoEndpoints('seatbelt', (id) => storage.getSidakSeatbeltSession(id), (id, data) => storage.updateSidakSeatbeltSession(id, data));
  createSidakPhotoEndpoints('roster', (id) => storage.getSidakRosterSession(id), (id, data) => storage.updateSidakRosterSession(id, data));
  createSidakPhotoEndpoints('rambu', (id) => storage.getSidakRambuSession(id), (id, data) => storage.updateSidakRambuSession(id, data));
  createSidakPhotoEndpoints('jarak', (id) => storage.getSidakJarakSession(id), (id, data) => storage.updateSidakJarakSession(id, data));
  createSidakPhotoEndpoints('pencahayaan', (id) => storage.getSidakPencahayaanSession(id), (id, data) => storage.updateSidakPencahayaanSession(id, data));
  createSidakPhotoEndpoints('digital', (id) => storage.getSidakDigitalSession(id), (id, data) => storage.updateSidakDigitalSession(id, data));
  createSidakPhotoEndpoints('antrian', (id) => storage.getSidakAntrianSession(id), (id, data) => storage.updateSidakAntrianSession(id, data));
  createSidakPhotoEndpoints('workshop', (id) => storage.getSidakWorkshopSession(id), (id, data) => storage.updateSidakWorkshopSession(id, data));
  createSidakPhotoEndpoints('behavior', (id) => storage.getSidakBehaviorSession(id), (id, data) => storage.updateSidakBehaviorSession(id, data));
  createSidakPhotoEndpoints('charging-station', (id) => storage.getSidakChargingStationSession(id), (id, data) => storage.updateSidakChargingStationSession(id, data));
  createSidakPhotoEndpoints('sop-kritis', (id) => storage.getSopKritisSession(id), (id, data) => storage.updateSopKritisSession(id, data));



  // ============================================
  // SIDAK ROSTER ROUTES
  // ============================================

  // Create new Sidak Roster session
  app.post("/api/sidak-roster", async (req, res) => {
    try {
      const validatedData = insertSidakRosterSessionSchema.parse(req.body);

      // Get logged-in user's NIK to track who created this SIDAK
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakRosterSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Roster session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Roster" });
    }
  });

  // Get all Sidak Roster sessions
  app.get("/api/sidak-roster", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakRosterSessions();

      // Filter by createdBy based on user role
      const sessionUser = (req.session as any).user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakRosterRecords(session.id),
            storage.getSidakRosterObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Roster sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Roster" });
    }
  });

  // Get single Sidak Roster session
  app.get("/api/sidak-roster/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [session, records, observers] = await Promise.all([
        storage.getSidakRosterSession(id),
        storage.getSidakRosterRecords(id),
        storage.getSidakRosterObservers(id)
      ]);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Roster tidak ditemukan" });
      }

      res.json({
        ...session,
        records,
        observers
      });
    } catch (error) {
      console.error("Error fetching Sidak Roster session:", error);
      res.status(500).json({ message: "Gagal mengambil detail sesi Sidak Roster" });
    }
  });

  // Add record to Sidak Roster session
  app.post("/api/sidak-roster/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakRosterRecordSchema.parse({
        ...req.body,
        sessionId: id
      });

      const record = await storage.createSidakRosterRecord(validatedData);

      // Update session sample count
      await storage.updateSidakRosterSessionSampleCount(id);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_ROSTER",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record,
        tindakLanjut: record.keterangan || "",
        moduleLabel: "Sidak Roster"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Roster record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      if (error.message?.includes('Maksimal 15 karyawan')) {
        return res.status(422).json({ message: error.message });
      }
      res.status(500).json({ message: "Gagal menambahkan data karyawan. Detail: " + (error?.message || String(error)) });
    }
  });

  // Add observer to Sidak Roster session
  app.post("/api/sidak-roster/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakRosterObserverSchema.parse({
        ...req.body,
        sessionId: id
      });

      const observer = await storage.createSidakRosterObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Roster observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // ============================================
  // SIDAK ROSTER PHOTO UPLOAD (Local Adapter)
  // ============================================

  // Step 1: Request upload URL
  app.post("/api/sidak-roster/:id/request-upload-url", async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;

      if (!name) return res.status(400).json({ error: "Filename is required" });

      const session = await storage.getSidakRosterSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const ext = path.extname(name) || '.jpg';
      const filename = `${timestamp}-${randomStr}${ext}`;

      // Ensure directory exists
      const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-roster-photos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const protocol = req.protocol;
      const host = req.get('host');
      const uploadURL = `${protocol}://${host}/api/sidak-roster/temp-upload/${filename}`;
      const objectPath = `/uploads/sidak-roster-photos/${filename}`;

      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Step 2: Temp upload endpoint
  app.put("/api/sidak-roster/temp-upload/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-roster-photos');
      const filePath = path.join(uploadDir, filename);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(filePath);
      req.pipe(writeStream);

      writeStream.on('finish', () => {
        res.json({ success: true });
      });

      writeStream.on('error', (err) => {
        console.error("File write error:", err);
        res.status(500).json({ error: "Failed to write file" });
      });
    } catch (error) {
      console.error("Temp upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  // Step 3: Confirm upload
  app.post("/api/sidak-roster/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body;

      const session = await storage.getSidakRosterSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, objectPath];

      const updatedSession = await storage.updateSidakRosterSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession.activityPhotos });
    } catch (error) {
      console.error("Error confirming upload:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  });

  // Delete photo
  app.delete("/api/sidak-roster/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);

      const session = await storage.getSidakRosterSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
        return res.status(404).json({ error: "Invalid photo index" });
      }

      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakRosterSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession.activityPhotos });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });


  // Create new Sidak Seatbelt session
  app.post("/api/sidak-seatbelt", async (req, res) => {
    try {
      const validatedData = insertSidakSeatbeltSessionSchema.parse(req.body);

      // Get logged-in user's NIK to track who created this SIDAK
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakSeatbeltSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Seatbelt session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Seatbelt" });
    }
  });

  // ============================================
  // TNA Routes

  // --- Master Data Trainings ---


  // --- TNA Input/Process ---


  // --- TNA Dashboard Stats ---


  // ============================================
  // SIDAK SEATBELT PHOTO UPLOAD (Direct Upload)
  // ============================================

  // Configure Multer for Seatbelt
  const sidakSeatbeltPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Hanya file gambar yang diperbolehkan!'));
      }
      cb(null, true);
    }
  });

  // Upload photos endpoint
  app.post("/api/sidak-seatbelt/:id/upload-photos", sidakSeatbeltPhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Tidak ada foto yang diupload" });
      }

      const session = await storage.getSidakSeatbeltSession(id);
      if (!session) {
        return res.status(404).json({ error: "Sesi Sidak Seatbelt tidak ditemukan" });
      }

      const newPhotoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, ...newPhotoPaths];

      const updatedSession = await storage.updateSidakSeatbeltSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({
        message: "Foto berhasil diupload",
        photos: updatedPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error uploading Seatbelt photos:", error);
      res.status(500).json({ error: "Gagal mengupload foto" });
    }
  });

  // ============================================
  // LOCAL ADAPTER: Sidak Seatbelt Photo Upload
  // Simulates object storage for local development
  // ============================================

  // Step 1: Request upload URL (generates local temp URL)
  app.post("/api/sidak-seatbelt/:id/request-upload-url", async (req, res) => {
    try {
      console.log(`[Upload Debug] Requesting URL for session ${req.params.id}`);
      const { id } = req.params;
      const body = req.body || {};
      const { name, contentType } = body;

      console.log(`[Upload Debug] Body:`, JSON.stringify(body));

      if (!name) {
        console.error(`[Upload Debug] Missing name in body`);
        return res.status(400).json({ error: "Filename is required" });
      }

      console.log(`[Upload Debug] Looking up session...`);
      const session = await storage.getSidakSeatbeltSession(id);
      if (!session) {
        console.error(`[Upload Debug] Session not found: ${id}`);
        return res.status(404).json({ error: "Session not found" });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);

      // Safe extension extraction
      let ext = '.jpg';
      if (name && typeof name === 'string') {
        ext = path.extname(name) || '.jpg';
      }

      const filename = `${timestamp}-${randomStr}${ext}`;
      console.log(`[Upload Debug] Generated filename: ${filename}`);

      // Local "presigned URL" points to our temp upload endpoint
      const port = process.env.PORT || 5000;
      const uploadURL = `http://localhost:${port}/api/sidak-seatbelt/temp-upload/${filename}`;
      const objectPath = `/uploads/sidak-seatbelt-photos/${filename}`;

      console.log(`[Upload Debug] Success. URL: ${uploadURL}`);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, contentType }
      });
    } catch (error: any) {
      console.error("[Upload Debug] Error generating upload URL:", error);
      console.error(error.stack);
      res.status(500).json({ error: "Failed to generate upload URL: " + error.message });
    }
  });

  // Step 2: Temp upload endpoint (receives PUT with file binary)




  // Get all Sidak Seatbelt sessions
  app.get("/api/sidak-seatbelt", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakSeatbeltSessions();

      const sessionUser = (req.session as any).user;
      // Filter logic if needed, currently showing all for users? 
      // Replicate logic from Fatigue: if not admin, show only createdBy?
      // For now, let's allow viewing all as it might be public data within company.
      // But consistent with Fatigue:
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakSeatbeltRecords(session.id),
            storage.getSidakSeatbeltObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Seatbelt sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Seatbelt" });
    }
  });

  // ============================================
  // SIDAK KECEPATAN (Observasi Kecepatan Berkendara)
  // ============================================

  // Configure Multer for Kecepatan
  const sidakKecepatanPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Hanya file gambar yang diperbolehkan!'));
      }
      cb(null, true);
    }
  });

  // Upload photos endpoint
  app.post("/api/sidak-kecepatan/:id/upload-photos", sidakKecepatanPhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Tidak ada foto yang diupload" });
      }

      const session = await storage.getSidakKecepatanSession(id);
      if (!session) {
        return res.status(404).json({ error: "Sesi Sidak Kecepatan tidak ditemukan" });
      }

      const newPhotoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, ...newPhotoPaths];

      const updatedSession = await storage.updateSidakKecepatanSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ message: "Foto berhasil diupload", photos: updatedPhotos, session: updatedSession });
    } catch (error) {
      console.error("Error uploading Kecepatan photos:", error);
      res.status(500).json({ error: "Gagal mengupload foto" });
    }
  });

  // Get all Sidak Kecepatan sessions
  app.get("/api/sidak-kecepatan", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakKecepatanSessions();
      const sessionUser = (req.session as any).user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakKecepatanRecords(session.id),
            storage.getSidakKecepatanObservers(session.id)
          ]);
          return { ...session, totalSampel: records.length, observers };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Kecepatan sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Kecepatan" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-kecepatan/sessions", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakKecepatanSessions();
      const sessionUser = (req.session as any).user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakKecepatanRecords(session.id),
            storage.getSidakKecepatanObservers(session.id)
          ]);
          return { ...session, totalSampel: records.length, observers };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Kecepatan sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Kecepatan" });
    }
  });

  // Get single session details
  app.get("/api/sidak-kecepatan/:id", async (req, res) => {
    try {
      const session = await storage.getSidakKecepatanSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakKecepatanRecords(session.id);
      const observers = await storage.getSidakKecepatanObservers(session.id);

      res.json({ session, records, observers });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil detail sesi" });
    }
  });

  // Create new session
  app.post("/api/sidak-kecepatan", async (req, res) => {
    try {
      const validatedData = insertSidakKecepatanSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakKecepatanSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Kecepatan session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Add record
  app.post("/api/sidak-kecepatan/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakKecepatan] Adding record to session ${id}:`, req.body);

      // Get existing records to calculate ordinal
      const existingRecords = await storage.getSidakKecepatanRecords(id);
      const ordinal = existingRecords.length + 1;

      const payload = { ...req.body, sessionId: id, ordinal };
      console.log(`[SidakKecepatan] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakKecepatanRecordSchema.parse(payload);

      const record = await storage.createSidakKecepatanRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_KECEPATAN",
        referenceId: record.id,
        sessionId: req.params.id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Kecepatan"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data" });
    }
  });

  // Add observer
  app.post("/api/sidak-kecepatan/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakKecepatanObserverSchema.parse({ ...req.body, sessionId: id });

      const observer = await storage.createSidakKecepatanObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // PDF Generation
  app.get("/api/sidak-kecepatan/:id/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakKecepatanSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakKecepatanRecords(session.id);
      const observers = await storage.getSidakKecepatanObservers(session.id);

      const pdfBuffer = await storage.generateSidakKecepatanPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=SIDAK_KECEPATAN_${session.tanggal}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Gagal generate PDF" });
    }
  });

  // JPG Generation
  app.get("/api/sidak-kecepatan/:id/jpg", async (req, res) => {
    try {
      const session = await storage.getSidakKecepatanSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakKecepatanRecords(session.id);
      const observers = await storage.getSidakKecepatanObservers(session.id);

      const pdfBuffer = await storage.generateSidakKecepatanPDF({ session, records, observers });

      const { fromBuffer } = require('pdf2pic');
      const options = {
        density: 100,
        saveFilename: "sidak_kecepatan",
        savePath: "./temp",
        format: "jpg",
        width: 1190, // Landscape width for A4 roughly
        height: 842
      };

      const convert = fromBuffer(pdfBuffer, options);
      const pageToConvertAsImage = 1;
      const result = await convert(pageToConvertAsImage, { responseType: "base64" });

      const imgBuffer = Buffer.from(result.base64, 'base64');
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(imgBuffer);
    } catch (error) {
      console.error("Error generating JPG:", error);
      res.status(500).json({ message: "Gagal generate JPG" });
    }
  });

  // ============================================
  // SIDAK PENCAHAYAAN ROUTES
  // ============================================

  // Create new session
  app.post("/api/sidak-pencahayaan", async (req, res) => {
    try {
      const validatedData = insertSidakPencahayaanSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakPencahayaanSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Pencahayaan session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Get all sessions
  app.get("/api/sidak-pencahayaan", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakPencahayaanSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Pencahayaan sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-pencahayaan/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakPencahayaanSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Pencahayaan sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // Get single session
  app.get("/api/sidak-pencahayaan/:id", async (req, res) => {
    try {
      const session = await storage.getSidakPencahayaanSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakPencahayaanRecords(req.params.id);
      const observers = await storage.getSidakPencahayaanObservers(req.params.id);

      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  // Add record
  app.post("/api/sidak-pencahayaan/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakPencahayaan] Adding record to session ${id}:`, req.body);

      // Get existing records to calculate ordinal
      const existingRecords = await storage.getSidakPencahayaanRecords(id);
      const ordinal = existingRecords.length + 1;

      const payload = { ...req.body, sessionId: id, ordinal };
      console.log(`[SidakPencahayaan] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakPencahayaanRecordSchema.parse(payload);

      const record = await storage.createSidakPencahayaanRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_PENCAHAYAAN",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Pencahayaan"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Pencahayaan record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data" });
    }
  });

  // Add observer
  app.post("/api/sidak-pencahayaan/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakPencahayaanObserverSchema.parse({ ...req.body, sessionId: id });

      const observer = await storage.createSidakPencahayaanObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // PDF Generation
  app.get("/api/sidak-pencahayaan/:id/pdf", async (req, res) => {
    try {
      // NOTE: PDF generation handled on client side
      res.status(501).json({ message: "PDF generation handled on client side" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });

  // JPG Generation
  app.get("/api/sidak-pencahayaan/:id/jpg", async (req, res) => {
    try {
      // NOTE: JPG generation handled on client side
      res.status(501).json({ message: "JPG generation handled on client side" });
    } catch (error) {
      console.error("Error generating JPG:", error);
      res.status(500).json({ message: "Gagal generate JPG" });
    }
  });

  // ============================================
  // SIDAK WORKSHOP ROUTES
  // ============================================

  // Create new session
  app.post("/api/sidak-workshop", async (req, res) => {
    try {
      const validatedData = insertSidakWorkshopSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakWorkshopSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Workshop session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Get all sessions
  app.get("/api/sidak-workshop", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakWorkshopSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Workshop sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-workshop/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakWorkshopSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Workshop sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // Get single session with equipment and inspectors
  app.get("/api/sidak-workshop/:id", async (req, res) => {
    try {
      const session = await storage.getSidakWorkshopSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const equipment = await storage.getSidakWorkshopEquipment(req.params.id);
      const inspectors = await storage.getSidakWorkshopInspectors(req.params.id);

      res.json({ session, equipment, inspectors });
    } catch (error) {
      console.error("Error fetching Workshop session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  // Add equipment inspection record
  app.post("/api/sidak-workshop/:id/equipment", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakWorkshop] Adding equipment to session ${id}:`, req.body);

      // Get existing equipment to calculate ordinal
      const existingEquipment = await storage.getSidakWorkshopEquipment(id);
      const ordinal = existingEquipment.length + 1;

      const payload = { ...req.body, sessionId: id, ordinal };

      // Convert empty string dueDate to null for database
      if (payload.dueDate === "" || payload.dueDate === undefined) {
        payload.dueDate = null;
      }

      console.log(`[SidakWorkshop] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakWorkshopEquipmentSchema.parse(payload);

      const equipment = await storage.createSidakWorkshopEquipment(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_WORKSHOP",
        referenceId: equipment.id,
        sessionId: equipment.sessionId,
        inspectionResults: equipment.inspectionResults,
        tindakLanjut: equipment.tindakLanjutPerbaikan,
        dueDate: equipment.dueDate,
        moduleLabel: "Sidak Workshop"
      });

      res.json(equipment);
    } catch (error: any) {
      console.error("Error adding Workshop equipment:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data peralatan" });
    }
  });

  // Add inspector
  app.post("/api/sidak-workshop/:id/inspectors", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakWorkshopInspectorSchema.parse({ ...req.body, sessionId: id });

      const inspector = await storage.createSidakWorkshopInspector(validatedData);
      res.json(inspector);
    } catch (error: any) {
      console.error("Error adding Workshop inspector:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan inspector" });
    }
  });

  // PDF Generation (handled on client side)
  app.get("/api/sidak-workshop/:id/pdf", async (req, res) => {
    try {
      // NOTE: PDF generation handled on client side
      res.status(501).json({ message: "PDF generation handled on client side" });
    } catch (error) {
      console.error("Error generating Workshop PDF:", error);
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });

  // JPG Generation (handled on client side)
  app.get("/api/sidak-workshop/:id/jpg", async (req, res) => {
    try {
      // NOTE: JPG generation handled on client side
      res.status(501).json({ message: "JPG generation handled on client side" });
    } catch (error) {
      console.error("Error generating Workshop JPG:", error);
      res.status(500).json({ message: "Gagal generate JPG" });
    }
  });

  // ============================================
  // SIDAK LOTO ROUTES
  // ============================================

  // Create new session
  app.post("/api/sidak-loto", async (req, res) => {
    try {
      const validatedData = insertSidakLotoSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakLotoSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak LOTO session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Get all sessions
  app.get("/api/sidak-loto", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakLotoSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak LOTO sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-loto/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakLotoSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak LOTO sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // Get single session
  app.get("/api/sidak-loto/:id", async (req, res) => {
    try {
      const session = await storage.getSidakLotoSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakLotoRecords(req.params.id);
      const observers = await storage.getSidakLotoObservers(req.params.id);

      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  // Add record
  app.post("/api/sidak-loto/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakLOTO] Adding record to session ${id}:`, req.body);

      // Get existing records to calculate ordinal
      const existingRecords = await storage.getSidakLotoRecords(id);
      const ordinal = existingRecords.length + 1;

      const payload = { ...req.body, sessionId: id, ordinal };
      console.log(`[SidakLOTO] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakLotoRecordSchema.parse(payload);

      const record = await storage.createSidakLotoRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_LOTO",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak LOTO"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding LOTO record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data" });
    }
  });

  // Add observer
  app.post("/api/sidak-loto/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakLotoObserverSchema.parse({ ...req.body, sessionId: id });

      const observer = await storage.createSidakLotoObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // PDF Generation
  app.get("/api/sidak-loto/:id/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakLotoSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakLotoRecords(req.params.id);
      const observers = await storage.getSidakLotoObservers(req.params.id);

      const pdfBuffer = await storage.generateSidakLotoPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Sidak_LOTO_${session.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });

  // JPG Generation
  app.get("/api/sidak-loto/:id/jpg", async (req, res) => {
    try {
      const session = await storage.getSidakLotoSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakLotoRecords(session.id);
      const observers = await storage.getSidakLotoObservers(session.id);

      const pdfBuffer = await storage.generateSidakLotoPDF({ session, records, observers });

      const { fromBuffer } = require('pdf2pic');
      const options = {
        density: 100,
        saveFilename: "sidak_loto",
        savePath: "./temp",
        format: "jpg",
        width: 1190,
        height: 842
      };

      const convert = fromBuffer(pdfBuffer, options);
      const pageToConvertAsImage = 1;
      const result = await convert(pageToConvertAsImage, { responseType: "base64" });

      const imgBuffer = Buffer.from(result.base64, 'base64');
      res.setHeader('Content-Type', 'image/jpeg');
      res.send(imgBuffer);
    } catch (error) {
      console.error("Error generating JPG:", error);
      res.status(500).json({ message: "Gagal generate JPG" });
    }
  });

  // Photo Upload Routes - Base64 Storage
  app.post("/api/sidak-loto/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;

      if (!photos || !Array.isArray(photos)) {
        return res.status(400).json({ error: "Photos array is required" });
      }

      const session = await storage.getSidakLotoSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK LOTO session not found" });
      }

      const existingPhotos = session.activityPhotos || [];
      const totalPhotos = existingPhotos.length + photos.length;

      if (totalPhotos > 6) {
        return res.status(400).json({ error: "Maximum 6 photos allowed" });
      }

      const allPhotos = [...existingPhotos, ...photos];

      const updatedSession = await storage.updateSidakLotoSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        photos: updatedSession.activityPhotos,
        message: "Photos uploaded successfully"
      });
    } catch (error: any) {
      console.error("Error uploading photos for LOTO:", error);
      res.status(500).json({ error: error.message || "Failed to upload photos" });
    }
  });

  app.delete("/api/sidak-loto/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);

      const session = await storage.getSidakLotoSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK LOTO session not found" });
      }

      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
        return res.status(404).json({ error: "Invalid photo index" });
      }

      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakLotoSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({
        photos: updatedSession.activityPhotos,
        message: "Photo deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting photo from LOTO:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ============================================
  // SIDAK DIGITAL ROUTES
  // ============================================

  // Create new session
  app.post("/api/sidak-digital", async (req, res) => {
    try {
      const validatedData = insertSidakDigitalSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakDigitalSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Digital session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Get all sessions
  app.get("/api/sidak-digital", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakDigitalSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Digital sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-digital/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakDigitalSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Digital sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // Get single session
  app.get("/api/sidak-digital/:id", async (req, res) => {
    try {
      const session = await storage.getSidakDigitalSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const records = await storage.getSidakDigitalRecords(req.params.id);
      const observers = await storage.getSidakDigitalObservers(req.params.id);

      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  // Add record
  app.post("/api/sidak-digital/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakDigital] Adding record to session ${id}:`, req.body);

      // Get existing records to calculate ordinal
      const existingRecords = await storage.getSidakDigitalRecords(id);
      const ordinal = existingRecords.length + 1;

      const payload = { ...req.body, sessionId: id, ordinal };
      console.log(`[SidakDigital] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakDigitalRecordSchema.parse(payload);

      const record = await storage.createSidakDigitalRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_DIGITAL",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Digital"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Digital record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data" });
    }
  });

  // Add observer
  app.post("/api/sidak-digital/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakDigitalObserverSchema.parse({ ...req.body, sessionId: id });

      const observer = await storage.createSidakDigitalObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // PDF Generation
  app.get("/api/sidak-digital/:id/pdf", async (req, res) => {
    try {
      // NOTE: PDF generation handled on client side
      res.status(501).json({ message: "PDF generation handled on client side" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });

  // JPG Generation
  app.get("/api/sidak-digital/:id/jpg", async (req, res) => {
    try {
      // NOTE: JPG generation handled on client side
      res.status(501).json({ message: "JPG generation handled on client side" });
    } catch (error) {
      console.error("Error generating JPG:", error);
      res.status(500).json({ message: "Gagal generate JPG" });
    }
  });

  // ============================================
  // SIDAK WORKSHOP ROUTES
  // ============================================

  app.get("/api/sidak-workshop", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakWorkshopSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-workshop/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakWorkshopSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.post("/api/sidak-workshop", async (req, res) => {
    try {
      const validatedData = insertSidakWorkshopSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakWorkshopSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/si-asef/sessions/:id", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/si-asef/sessions/:id", async (req, res) => {
    try {
      // Allow delete without strict session check for now
      await storage.deleteChatSession(req.params.id);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting session:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/sidak-workshop/:id", async (req, res) => {
    try {
      const session = await storage.getSidakWorkshopSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakWorkshopRecords(req.params.id);
      const observers = await storage.getSidakWorkshopObservers(req.params.id);
      res.json({ session, records, observers });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-workshop/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakWorkshopRecordSchema.parse({ ...req.body, sessionId: id });
      const record = await storage.createSidakWorkshopEquipment(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_WORKSHOP",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Workshop"
      });

      res.json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data" });
    }
  });

  app.post("/api/sidak-workshop/:id/observers", async (req, res) => {
    try {
      const validatedData = insertSidakWorkshopObserverSchema.parse({ ...req.body, sessionId: req.params.id });
      const observer = await storage.createSidakWorkshopObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  app.get("/api/sidak-workshop/:id/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakWorkshopSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakWorkshopRecords(req.params.id);
      const observers = await storage.getSidakWorkshopObservers(req.params.id);
      const pdfBuffer = await storage.generateSidakWorkshopPDF({ session, records, observers });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Sidak_Workshop_${session.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });

  // ============================================
  // SIDAK STAND JACK ROUTES
  // ============================================

  // Create new session
  app.post("/api/sidak-stand-jack", async (req, res) => {
    try {
      const validatedData = insertSidakStandJackSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakStandJackSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Stand Jack session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  // Get all sessions
  app.get("/api/sidak-stand-jack", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakStandJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Stand Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-stand-jack/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakStandJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Stand Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  // Get single session with records and observers
  app.get("/api/sidak-stand-jack/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakStandJackSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const rawRecords = await storage.getSidakStandJackRecords(id);
      const observers = await storage.getSidakStandJackObservers(id);

      // Flatten inspectionResults for frontend compatibility
      const records = rawRecords.map(r => {
        const { inspectionResults, noRegisterPeralatan, tindakLanjutPerbaikan, ...rest } = r;
        return {
          ...rest,
          ...(inspectionResults as any),
          noRegister: noRegisterPeralatan,
          tindakLanjut: tindakLanjutPerbaikan
        };
      });

      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Stand Jack session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  // Add stand jack inspection record
  app.post("/api/sidak-stand-jack/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[SidakStandJack] Adding record to session ${id}:`, req.body);

      // Get existing records to calculate ordinal
      const existingRecords = await storage.getSidakStandJackRecords(id);
      const ordinal = existingRecords.length + 1;

      // Support both Workshop-style format (inspectionResults object) and legacy flat format
      let noRegisterPeralatan: string;
      let inspectionResults: any;
      let tindakLanjutPerbaikan: string;
      let dueDate: string | null;

      if (req.body.inspectionResults) {
        // New Workshop-style format
        noRegisterPeralatan = req.body.noRegisterPeralatan || '';
        inspectionResults = req.body.inspectionResults;
        tindakLanjutPerbaikan = req.body.tindakLanjutPerbaikan || '';
        dueDate = (req.body.dueDate && req.body.dueDate !== "") ? req.body.dueDate : null;
      } else {
        // Legacy flat format
        const { noRegister, tindakLanjut, dueDate: dd, keterangan, ordinal: _ord, sessionId: _sid, equipmentType: _et, ...items } = req.body;
        noRegisterPeralatan = noRegister || '';
        inspectionResults = { ...items, keterangan };
        tindakLanjutPerbaikan = tindakLanjut || '';
        dueDate = (dd && dd !== "") ? dd : null;
      }

      const payload = {
        sessionId: id,
        ordinal,
        noRegisterPeralatan,
        inspectionResults,
        tindakLanjutPerbaikan,
        dueDate
      };

      const validatedData = insertSidakStandJackRecordSchema.parse(payload);
      const record = await storage.createSidakStandJackRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_STAND_JACK",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Stand Jack"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Stand Jack record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  // Add observer/inspector
  app.post("/api/sidak-stand-jack/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const existingObservers = await storage.getSidakStandJackObservers(id);
      const ordinal = existingObservers.length + 1;

      const validatedData = insertSidakStandJackObserverSchema.parse({ ...req.body, sessionId: id, ordinal });

      const observer = await storage.createSidakStandJackObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Stand Jack observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  // Photo Upload Routes - Base64 Storage
  app.post("/api/sidak-stand-jack/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;

      if (!photos || !Array.isArray(photos)) {
        return res.status(400).json({ error: "Photos array is required" });
      }

      const session = await storage.getSidakStandJackSession(id);
      if (!session) {
        return res.status(404).json({ error: "Sesi Sidak Stand Jack tidak ditemukan" });
      }

      const existingPhotos = session.activityPhotos || [];
      const totalPhotos = existingPhotos.length + photos.length;

      if (totalPhotos > 6) {
        return res.status(400).json({ error: "Maksimal 6 foto diperbolehkan" });
      }

      const allPhotos = [...existingPhotos, ...photos];

      const updatedSession = await storage.updateSidakStandJackSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        photos: updatedSession?.activityPhotos || allPhotos,
        message: "Foto berhasil diupload"
      });
    } catch (error: any) {
      console.error("Error uploading photos for Stand Jack:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-stand-jack/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);

      const session = await storage.getSidakStandJackSession(id);
      if (!session) {
        return res.status(404).json({ error: "Sesi Sidak Stand Jack tidak ditemukan" });
      }

      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
        return res.status(404).json({ error: "Index foto tidak valid" });
      }

      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakStandJackSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({
        photos: updatedSession?.activityPhotos || updatedPhotos,
        message: "Foto berhasil dihapus"
      });
    } catch (error: any) {
      console.error("Error deleting photo for Stand Jack:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // PDF Generation (Placeholder)
  app.get("/api/sidak-stand-jack/:id/pdf", async (req, res) => {
    res.status(501).json({ message: "PDF generation handled on client side" });
  });

  // JPG Generation (Placeholder)
  app.get("/api/sidak-stand-jack/:id/jpg", async (req, res) => {
    res.status(501).json({ message: "JPG generation handled on client side" });
  });

  // ============================================
  // SIDAK HYDRAULIC JACK ROUTES
  // ============================================

  app.post("/api/sidak-hydraulic-jack", async (req, res) => {
    try {
      const validatedData = insertSidakHydraulicJackSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakHydraulicJackSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Hydraulic Jack session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-hydraulic-jack", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakHydraulicJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Hydraulic Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-hydraulic-jack/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakHydraulicJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Hydraulic Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-hydraulic-jack/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakHydraulicJackSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const rawRecords = await storage.getSidakHydraulicJackRecords(id);
      const observers = await storage.getSidakHydraulicJackObservers(id);
      const records = rawRecords.map(r => {
        const { inspectionResults, noRegisterPeralatan, tindakLanjutPerbaikan, ...rest } = r;
        return { ...rest, ...(inspectionResults as any), noRegister: noRegisterPeralatan, tindakLanjut: tindakLanjutPerbaikan, inspectionResults };
      });
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Hydraulic Jack session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-hydraulic-jack/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const existingRecords = await storage.getSidakHydraulicJackRecords(id);
      const ordinal = existingRecords.length + 1;
      let noRegisterPeralatan: string;
      let inspectionResults: any;
      let tindakLanjutPerbaikan: string;
      let dueDate: string | null;
      if (req.body.inspectionResults) {
        noRegisterPeralatan = req.body.noRegisterPeralatan || '';
        inspectionResults = req.body.inspectionResults;
        tindakLanjutPerbaikan = req.body.tindakLanjutPerbaikan || '';
        dueDate = (req.body.dueDate && req.body.dueDate !== "") ? req.body.dueDate : null;
      } else {
        const { noRegister, tindakLanjut, dueDate: dd, keterangan, ordinal: _ord, sessionId: _sid, equipmentType: _et, ...items } = req.body;
        noRegisterPeralatan = noRegister || '';
        inspectionResults = { ...items, keterangan };
        tindakLanjutPerbaikan = tindakLanjut || '';
        dueDate = (dd && dd !== "") ? dd : null;
      }
      const payload = { sessionId: id, ordinal, noRegisterPeralatan, inspectionResults, tindakLanjutPerbaikan, dueDate };
      const validatedData = insertSidakHydraulicJackRecordSchema.parse(payload);
      const record = await storage.createSidakHydraulicJackRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_HYDRAULIC_JACK",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Hydraulic Jack"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Hydraulic Jack record:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-hydraulic-jack/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const existingObservers = await storage.getSidakHydraulicJackObservers(id);
      const ordinal = existingObservers.length + 1;
      const validatedData = insertSidakHydraulicJackObserverSchema.parse({ ...req.body, sessionId: id, ordinal });
      const observer = await storage.createSidakHydraulicJackObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Hydraulic Jack observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-hydraulic-jack/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakHydraulicJackSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakHydraulicJackSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Hydraulic Jack:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-hydraulic-jack/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakHydraulicJackSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakHydraulicJackSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Hydraulic Jack:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // ============================================
  // SIDAK BOTTLE JACK ROUTES
  // ============================================

  app.post("/api/sidak-bottle-jack", async (req, res) => {
    try {
      const validatedData = insertSidakBottleJackSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakBottleJackSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Bottle Jack session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-bottle-jack", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakBottleJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Bottle Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-bottle-jack/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakBottleJackSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Bottle Jack sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-bottle-jack/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakBottleJackSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const rawRecords = await storage.getSidakBottleJackRecords(id);
      const observers = await storage.getSidakBottleJackObservers(id);
      const records = rawRecords.map(r => {
        const { inspectionResults, noRegisterPeralatan, tindakLanjutPerbaikan, ...rest } = r;
        return { ...rest, ...(inspectionResults as any), noRegister: noRegisterPeralatan, tindakLanjut: tindakLanjutPerbaikan, inspectionResults };
      });
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Bottle Jack session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-bottle-jack/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const existingRecords = await storage.getSidakBottleJackRecords(id);
      const ordinal = existingRecords.length + 1;
      let noRegisterPeralatan: string;
      let inspectionResults: any;
      let tindakLanjutPerbaikan: string;
      let dueDate: string | null;
      if (req.body.inspectionResults) {
        noRegisterPeralatan = req.body.noRegisterPeralatan || '';
        inspectionResults = req.body.inspectionResults;
        tindakLanjutPerbaikan = req.body.tindakLanjutPerbaikan || '';
        dueDate = (req.body.dueDate && req.body.dueDate !== "") ? req.body.dueDate : null;
      } else {
        const { noRegister, tindakLanjut, dueDate: dd, keterangan, ordinal: _ord, sessionId: _sid, equipmentType: _et, ...items } = req.body;
        noRegisterPeralatan = noRegister || '';
        inspectionResults = { ...items, keterangan };
        tindakLanjutPerbaikan = tindakLanjut || '';
        dueDate = (dd && dd !== "") ? dd : null;
      }
      const payload = { sessionId: id, ordinal, noRegisterPeralatan, inspectionResults, tindakLanjutPerbaikan, dueDate };
      const validatedData = insertSidakBottleJackRecordSchema.parse(payload);
      const record = await storage.createSidakBottleJackRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_BOTTLE_JACK",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Bottle Jack"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Bottle Jack record:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-bottle-jack/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const existingObservers = await storage.getSidakBottleJackObservers(id);
      const ordinal = existingObservers.length + 1;
      const validatedData = insertSidakBottleJackObserverSchema.parse({ ...req.body, sessionId: id, ordinal });
      const observer = await storage.createSidakBottleJackObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Bottle Jack observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-bottle-jack/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakBottleJackSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakBottleJackSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Bottle Jack:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-bottle-jack/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakBottleJackSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakBottleJackSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Bottle Jack:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // ============================================
  // PICA ROUTES
  // ============================================
  app.get("/api/pica", async (req, res) => {
    try {
      const records = await storage.getPicaRecords();
      res.json(records);
    } catch (error: any) {
      console.error("❌ GET /api/pica error:", error.message, error.stack);
      res.status(500).json({ message: "Failed to fetch PICA records", error: error.message });
    }
  });

  app.patch("/api/pica/:id", async (req, res) => {
    try {
      const updated = await storage.updatePicaRecord(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "PICA record not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update PICA record" });
    }
  });

  app.post("/api/pica/sync", async (req, res) => {
    try {
      const count = await PicaService.syncAllFindings();
      res.json({ message: "PICA synchronization completed", count });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync PICA findings" });
    }
  });

  app.delete("/api/pica", async (req, res) => {
    try {
      await storage.deleteAllPicaRecords();
      res.json({ message: "All PICA records deleted successfully" });
    } catch (error) {
      console.error("❌ DELETE /api/pica error:", error);
      res.status(500).json({ message: "Failed to delete all PICA records" });
    }
  });

  app.post("/api/pica/:id/upload-evidence", uploadMemory.single('evidence'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No evidence file provided" });
      }
      const recordId = req.params.id;
      const { url: fileUrl } = await dbStorage.uploadFile(req.file);
      const updated = await storage.updatePicaRecord(recordId, { verificationEvidence: fileUrl });
      if (!updated) return res.status(404).json({ message: "PICA record not found" });
      res.json(updated);
    } catch (error) {
      console.error("❌ POST /api/pica/:id/upload-evidence error:", error);
      res.status(500).json({ message: "Failed to upload evidence" });
    }
  });

  app.post("/api/sidak-impact", async (req, res) => {
    try {
      const validatedData = insertSidakImpactSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakImpactSession({ ...validatedData, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Impact session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-impact/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakImpactSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Impact sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-impact/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakImpactSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const rawRecords = await storage.getSidakImpactRecords(id);
      const observers = await storage.getSidakImpactObservers(id);
      const records = rawRecords.map(r => {
        const { inspectionResults, noRegisterPeralatan, tindakLanjutPerbaikan, ...rest } = r;
        return { ...rest, ...(inspectionResults as any), noRegister: noRegisterPeralatan, tindakLanjut: tindakLanjutPerbaikan, inspectionResults };
      });
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Impact session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-impact/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const existingRecords = await storage.getSidakImpactRecords(id);
      const ordinal = existingRecords.length + 1;
      let noRegisterPeralatan: string;
      let inspectionResults: any;
      let tindakLanjutPerbaikan: string;
      let dueDate: string | null;
      if (req.body.inspectionResults) {
        noRegisterPeralatan = req.body.noRegisterPeralatan || '';
        inspectionResults = req.body.inspectionResults;
        tindakLanjutPerbaikan = req.body.tindakLanjutPerbaikan || '';
        dueDate = (req.body.dueDate && req.body.dueDate !== "") ? req.body.dueDate : null;
      } else {
        const { noRegister, tindakLanjut, dueDate: dd, keterangan, ordinal: _ord, sessionId: _sid, ...items } = req.body;
        noRegisterPeralatan = noRegister || '';
        inspectionResults = { ...items, keterangan };
        tindakLanjutPerbaikan = tindakLanjut || '';
        dueDate = (dd && dd !== "") ? dd : null;
      }
      const payload = { sessionId: id, ordinal, noRegisterPeralatan, inspectionResults, tindakLanjutPerbaikan, dueDate };
      const validatedData = insertSidakImpactRecordSchema.parse(payload);
      const record = await storage.createSidakImpactRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_IMPACT",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Impact"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Impact record:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-impact/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const existingObservers = await storage.getSidakImpactObservers(id);
      const ordinal = existingObservers.length + 1;
      const validatedData = insertSidakImpactObserverSchema.parse({ ...req.body, sessionId: id, ordinal });
      const observer = await storage.createSidakImpactObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Impact observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-impact/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakImpactSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakImpactSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Impact:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-impact/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakImpactSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakImpactSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Impact:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // SIDAK APAR ROUTES
  app.post("/api/sidak-apar", async (req, res) => {
    try {
      const data = insertSidakAparSessionSchema.parse(req.body);
      const session = await storage.createSidakAparSession({
        ...data,
        createdBy: req.user?.username || null
      });
      res.json(session);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/sidak-apar/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakAparSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/sidak-apar/:id", async (req, res) => {
    try {
      const session = await storage.getSidakAparSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });

      const rawRecords = await storage.getSidakAparRecords(req.params.id);
      const observers = await storage.getSidakAparObservers(req.params.id);

      const records = rawRecords.map(r => {
        const { inspectionResults, noRegisterPeralatan, tindakLanjutPerbaikan, ...rest } = r;
        return {
          ...rest,
          ...(inspectionResults as any),
          noRegister: noRegisterPeralatan,
          tindakLanjut: tindakLanjutPerbaikan,
          inspectionResults
        };
      });

      res.json({ session, records, observers });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/sidak-apar/:id/records", async (req, res) => {
    try {
      const data = insertSidakAparRecordSchema.parse({
        ...req.body,
        sessionId: req.params.id
      });
      const record = await storage.createSidakAparRecord(data);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_APAR",
        referenceId: record.id,
        sessionId: req.params.id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak APAR"
      });

      res.json(record);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/sidak-apar/:id/observers", async (req, res) => {
    try {
      const data = insertSidakAparObserverSchema.parse({
        ...req.body,
        sessionId: req.params.id
      });
      const observer = await storage.createSidakAparObserver(data);
      res.json(observer);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/sidak-apar/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakAparSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakAparSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for APAR:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-apar/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakAparSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakAparSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for APAR:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // SIDAK FUEL STORAGE ROUTES
  app.post("/api/sidak-fuel-storage", async (req, res) => {
    try {
      const data = insertSidakFuelStorageSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakFuelStorageSession({ ...data, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Fuel Storage session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-fuel-storage/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakFuelStorageSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Fuel Storage sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-fuel-storage/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakFuelStorageSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const rawRecords = await storage.getSidakFuelStorageRecords(id);
      const observers = await storage.getSidakFuelStorageObservers(id);
      const records = rawRecords.map(r => {
        const { inspectionResults, tindakLanjutPerbaikan, ...rest } = r;
        return {
          ...rest,
          ...(inspectionResults as any),
          tindakLanjut: tindakLanjutPerbaikan,
          tindakLanjutPerbaikan: tindakLanjutPerbaikan,
          inspectionResults
        };
      });
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Fuel Storage session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-fuel-storage/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const existingRecords = await storage.getSidakFuelStorageRecords(id);
      const ordinal = existingRecords.length + 1;

      let storageName: string;
      let inspectionResults: any;
      let tindakLanjutPerbaikan: any;
      let dueDate: string | null;

      if (req.body.inspectionResults) {
        storageName = req.body.storageName || '';
        inspectionResults = req.body.inspectionResults;
        tindakLanjutPerbaikan = req.body.tindakLanjutPerbaikan || {};
        dueDate = (req.body.dueDate && req.body.dueDate !== "") ? req.body.dueDate : null;
      } else {
        const { storageName: sn, tindakLanjut, dueDate: dd, ...items } = req.body;
        storageName = sn || '';
        inspectionResults = items;
        tindakLanjutPerbaikan = tindakLanjut || {};
        dueDate = (dd && dd !== "") ? dd : null;
      }

      const payload = {
        sessionId: id,
        ordinal,
        storageName,
        inspectionResults,
        tindakLanjutPerbaikan,
        dueDate
      };

      const validatedData = insertSidakFuelStorageRecordSchema.parse(payload);
      const record = await storage.createSidakFuelStorageRecord(validatedData);
      res.json(record);
    } catch (error: any) {
      console.error("Error adding Fuel Storage record:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-fuel-storage/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const existingObservers = await storage.getSidakFuelStorageObservers(id);
      const ordinal = existingObservers.length + 1;
      const validatedData = insertSidakFuelStorageObserverSchema.parse({ ...req.body, sessionId: id, ordinal });
      const observer = await storage.createSidakFuelStorageObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Fuel Storage observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-fuel-storage/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakFuelStorageSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakFuelStorageSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Fuel Storage:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-fuel-storage/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakFuelStorageSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakFuelStorageSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Fuel Storage:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // SIDAK MESIN KOMPRESOR ROUTES
  app.post("/api/sidak-mesin-kompresor", async (req, res) => {
    try {
      const data = insertSidakMesinKompresorSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakMesinKompresorSession({ ...data, createdBy });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Mesin Kompresor session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-mesin-kompresor/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakMesinKompresorSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Mesin Kompresor sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-mesin-kompresor/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakMesinKompresorSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakMesinKompresorRecords(id);
      const observers = await storage.getSidakMesinKompresorObservers(id);
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Mesin Kompresor session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-mesin-kompresor/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const records = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      const currentRecords = await storage.getSidakMesinKompresorRecords(id);
      let ordinal = currentRecords.length + 1;

      for (const recordData of records) {
        const validatedData = insertSidakMesinKompresorRecordSchema.parse({
          ...recordData,
          sessionId: id,
          ordinal: ordinal++
        });
        const savedRecord = await storage.createSidakMesinKompresorRecord(validatedData);

        // Auto-PICA creation
        PicaService.checkAndCreatePica({
          moduleSource: "SIDAK_MESIN_KOMPRESOR",
          referenceId: savedRecord.id,
          sessionId: id,
          inspectionResults: savedRecord.inspectionResults,
          tindakLanjut: savedRecord.tindakLanjutPerbaikan,
          dueDate: savedRecord.dueDate,
          moduleLabel: "Sidak Mesin Kompresor"
        });

        results.push(savedRecord);
      }
      res.json(results);
    } catch (error: any) {
      console.error("Error adding Mesin Kompresor record:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-mesin-kompresor/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const observers = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      const currentObservers = await storage.getSidakMesinKompresorObservers(id);
      let ordinal = currentObservers.length + 1;

      for (const obsData of observers) {
        const validatedData = insertSidakMesinKompresorObserverSchema.parse({
          ...obsData,
          sessionId: id,
          ordinal: ordinal++
        });
        results.push(await storage.createSidakMesinKompresorObserver(validatedData));
      }
      res.json(results);
    } catch (error: any) {
      console.error("Error adding Mesin Kompresor observer:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-mesin-kompresor/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakMesinKompresorSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakMesinKompresorSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Mesin Kompresor:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-mesin-kompresor/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakMesinKompresorSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakMesinKompresorSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Mesin Kompresor:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });


  // ============================================================================
  // SIDAK GERINDA DUDUK
  // ============================================================================
  app.post("/api/sidak-gerinda-duduk", async (req, res) => {
    try {
      console.log("[GERINDA-DUDUK] Creating session with data:", JSON.stringify(req.body));
      const validatedData = insertSidakGerindaDudukSessionSchema.safeParse(req.body);

      if (!validatedData.success) {
        console.error("[GERINDA-DUDUK] Validation Error:", validatedData.error);
        return res.status(400).json({
          message: "Data tidak valid",
          errors: validatedData.error.errors
        });
      }

      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakGerindaDudukSession({
        ...validatedData.data,
        createdBy
      });

      console.log("[GERINDA-DUDUK] Session created successfully:", session.id);
      res.json(session);
    } catch (error: any) {
      console.error("[GERINDA-DUDUK] Unexpected Error:", error);
      res.status(500).json({
        message: "Gagal membuat sesi",
        error: error.message,
        detail: error.stack?.split('\n')[0]
      });
    }
  });

  app.get("/api/sidak-gerinda-duduk/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakGerindaDudukSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Gerinda Duduk sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data" });
    }
  });

  app.get("/api/sidak-gerinda-duduk/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakGerindaDudukSession(id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakGerindaDudukRecords(id);
      const observers = await storage.getSidakGerindaDudukObservers(id);
      res.json({ session, records, observers });
    } catch (error) {
      console.error("Error fetching Gerinda Duduk session details:", error);
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-gerinda-duduk/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const records = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      const currentRecords = await storage.getSidakGerindaDudukRecords(id);
      let ordinal = currentRecords.length + 1;

      for (const recordData of records) {
        const validatedData = insertSidakGerindaDudukRecordSchema.parse({
          ...recordData,
          sessionId: id,
          ordinal: ordinal++
        });
        results.push(await storage.createSidakGerindaDudukRecord(validatedData));
      }
      res.json(results);
    } catch (error: any) {
      console.error("Error creating Sidak Gerinda Duduk records:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menyimpan data pemeriksaan" });
    }
  });

  app.post("/api/sidak-gerinda-duduk/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const observers = Array.isArray(req.body) ? req.body : [req.body];
      const results = [];
      const currentObservers = await storage.getSidakGerindaDudukObservers(id);
      let ordinal = currentObservers.length + 1;

      for (const obsData of observers) {
        const validatedData = insertSidakGerindaDudukObserverSchema.parse({
          ...obsData,
          sessionId: id,
          ordinal: ordinal++
        });
        results.push(await storage.createSidakGerindaDudukObserver(validatedData));
      }
      res.json(results);
    } catch (error: any) {
      console.error("Error creating Sidak Gerinda Duduk observers:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer/inspektor" });
    }
  });

  app.post("/api/sidak-gerinda-duduk/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!photos || !Array.isArray(photos)) return res.status(400).json({ error: "Photos array is required" });
      const session = await storage.getSidakGerindaDudukSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length + photos.length > 6) return res.status(400).json({ error: "Maksimal 6 foto" });
      const allPhotos = [...existingPhotos, ...photos];
      const updatedSession = await storage.updateSidakGerindaDudukSession(id, { activityPhotos: allPhotos });
      res.json({ photos: updatedSession?.activityPhotos || allPhotos, message: "Foto berhasil diupload" });
    } catch (error: any) {
      console.error("Error uploading photos for Gerinda Duduk:", error);
      res.status(500).json({ error: error.message || "Gagal mengupload foto" });
    }
  });

  app.delete("/api/sidak-gerinda-duduk/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);
      const session = await storage.getSidakGerindaDudukSession(id);
      if (!session) return res.status(404).json({ error: "Sesi tidak ditemukan" });
      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) return res.status(404).json({ error: "Index foto tidak valid" });
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);
      const updatedSession = await storage.updateSidakGerindaDudukSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos, message: "Foto berhasil dihapus" });
    } catch (error: any) {
      console.error("Error deleting photo for Gerinda Duduk:", error);
      res.status(500).json({ error: error.message || "Gagal menghapus foto" });
    }
  });

  // ============================================================================
  // SIDAK MESIN LAS
  // ============================================================================
  app.post("/api/sidak-mesin-las", async (req, res) => {
    try {
      const data = insertSidakMesinLasSessionSchema.parse(req.body);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakMesinLasSession({
        ...data,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Mesin Las session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: "Data tidak valid",
          errors: error.errors,
          received: req.body
        });
      }
      res.status(500).json({ error: error.message || "Gagal membuat sesi" });
    }
  });

  app.get("/api/sidak-mesin-las/sessions", async (req, res) => {
    try {
      const sessions = await storage.getSidakMesinLasSessions();
      res.json(sessions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sidak-mesin-las/:id", async (req, res) => {
    try {
      const session = await storage.getSidakMesinLasSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const records = await storage.getSidakMesinLasRecords(req.params.id);
      const observers = await storage.getSidakMesinLasObservers(req.params.id);

      res.json({
        session,
        records,
        observers
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sidak-mesin-las/:id/records", async (req, res) => {
    try {
      const records = req.body;
      if (!Array.isArray(records)) return res.status(400).json({ error: "Data must be an array" });

      const results = [];
      for (const record of records) {
        if (record.dueDate === "") record.dueDate = null;
        const parsed = insertSidakMesinLasRecordSchema.parse({
          ...record,
          sessionId: req.params.id
        });
        const savedRecord = await storage.createSidakMesinLasRecord(parsed);

        // Auto-PICA creation
        PicaService.checkAndCreatePica({
          moduleSource: "SIDAK_MESIN_LAS",
          referenceId: savedRecord.id,
          sessionId: req.params.id,
          inspectionResults: savedRecord.inspectionResults,
          tindakLanjut: savedRecord.tindakLanjutPerbaikan,
          dueDate: savedRecord.dueDate,
          moduleLabel: "Sidak Mesin Las"
        });

        results.push(savedRecord);
      }
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/sidak-mesin-las/:id/observers", async (req, res) => {
    try {
      const observers = req.body;
      if (!Array.isArray(observers)) return res.status(400).json({ error: "Data must be an array" });

      const results = [];
      for (const observer of observers) {
        const parsed = insertSidakMesinLasObserverSchema.parse({
          ...observer,
          sessionId: req.params.id
        });
        results.push(await storage.createSidakMesinLasObserver(parsed));
      }
      res.json(results);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/sidak-mesin-las/sessions/:id", async (req, res) => {
    try {
      const success = await storage.deleteSidakMesinLasSession(req.params.id);
      res.json({ success });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sidak-mesin-las/:id/photos", async (req, res) => {
    try {
      const { id } = req.params;
      const { photos } = req.body;
      if (!Array.isArray(photos)) return res.status(400).json({ error: "Photos must be an array" });

      const session = await storage.getSidakMesinLasSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, ...photos];

      const updatedSession = await storage.updateSidakMesinLasSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sidak-mesin-las/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index);

      const session = await storage.getSidakMesinLasSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakMesinLasSession(id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || updatedPhotos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // MEETING TYPE MIGRATION
  app.post("/api/admin/migrate-meeting-type", async (req, res) => {
    try {
      await db.execute(sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS meeting_type VARCHAR DEFAULT 'internal'`);
      await db.execute(sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda TEXT`);
      await db.execute(sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS pemateri VARCHAR`);
      res.json({ success: true, message: "Meeting type columns added successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // MANUAL SIGNATURE MIGRATION
  app.post("/api/admin/migrate-manual-signature", async (req, res) => {
    try {
      await db.execute(sql`ALTER TABLE meeting_attendance ADD COLUMN IF NOT EXISTS manual_signature TEXT`);
      res.json({ success: true, message: "manual_signature column added successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // APAR MIGRATION
  app.post("/api/admin/migrate-sidak-apar", async (req, res) => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sidak_apar_sessions (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          tanggal text NOT NULL,
          nama_workshop text NOT NULL,
          lokasi text NOT NULL,
          shift varchar(50),
          waktu varchar(20),
          penanggung_jawab_area text,
          total_apar integer DEFAULT 0,
          activity_photos text[],
          created_by varchar,
          created_at timestamp DEFAULT now()
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sidak_apar_records (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id varchar NOT NULL REFERENCES sidak_apar_sessions(id) ON DELETE CASCADE,
          ordinal integer NOT NULL,
          no_register_peralatan varchar,
          inspection_results jsonb NOT NULL DEFAULT '{}',
          tindak_lanjut_perbaikan jsonb NOT NULL DEFAULT '{}',
          due_date date,
          created_at timestamp DEFAULT now()
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS sidak_apar_observers (
          id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
          session_id varchar NOT NULL REFERENCES sidak_apar_sessions(id) ON DELETE CASCADE,
          ordinal integer NOT NULL,
          nama text NOT NULL,
          perusahaan text,
          tanda_tangan text,
          created_at timestamp DEFAULT now()
        );
      `);

      res.json({ message: "Sidak APAR tables created successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SIDAK RECAP API
  // ============================================
  app.get("/api/sidak-recap", async (req, res) => {
    try {
      const fetchSession = async (name: string, p: Promise<any>) => {
        const tableStart = Date.now();
        try {
          const res = await p;
          console.log(`[SIDAK-RECAP] Fetch ${name} success: ${res.length} rows in ${Date.now() - tableStart}ms`);
          return res;
        } catch (e: any) {
          console.error(`[SIDAK-RECAP ERROR] ${name} failed after ${Date.now() - tableStart}ms:`, e.message);
          return [];
        }
      };

      console.log("[SIDAK-RECAP] Starting data fetch...");
      const start = Date.now();

      // Optimization: Get counts for all tables in a single query for stats
      // Optimization: Fetch all session data in parallel batches
      // Fetch session data in parallel batches of 4 to maximize speed while respecting pool limits
      const fetchAllInBatches = async () => {
        const batch1 = Promise.all([
          fetchSession('Fatigue', storage.getAllSidakFatigueSessions()),
          fetchSession('Roster', storage.getAllSidakRosterSessions()),
          fetchSession('Seatbelt', storage.getAllSidakSeatbeltSessions()),
          fetchSession('Rambu', storage.getAllSidakRambuSessions()),
        ]);
        const batch2 = Promise.all([
          fetchSession('Antrian', storage.getAllSidakAntrianSessions()),
          fetchSession('Jarak', storage.getAllSidakJarakSessions()),
          fetchSession('Kecepatan', storage.getAllSidakKecepatanSessions()),
          fetchSession('Pencahayaan', storage.getAllSidakPencahayaanSessions()),
        ]);
        const batch3 = Promise.all([
          fetchSession('LOTO', storage.getAllSidakLotoSessions()),
          fetchSession('Digital', storage.getAllSidakDigitalSessions()),
          fetchSession('Workshop', storage.getAllSidakWorkshopSessions()),
          fetchSession('Behavior', storage.getAllSidakBehaviorSessions()),
          fetchSession('StandJack', storage.getAllSidakStandJackSessions()),
          fetchSession('HydraulicJack', storage.getAllSidakHydraulicJackSessions()),
          fetchSession('BottleJack', storage.getAllSidakBottleJackSessions()),
          fetchSession('Impact', storage.getSidakImpactSessions()),
          fetchSession('Apar', storage.getSidakAparSessions()),
          fetchSession('MesinLas', storage.getSidakMesinLasSessions()),
          fetchSession('MesinKompresor', storage.getSidakMesinKompresorSessions()),
          fetchSession('GerindaDuduk', storage.getSidakGerindaDudukSessions()),
          fetchSession('FuelStorage', storage.getSidakFuelStorageSessions()),
          fetchSession('ChargingStation', storage.getAllSidakChargingStationSessions()),
          fetchSession('SopKritis', storage.getAllSopKritisSessions()),
        ]);

        const [results1, results2, results3] = await Promise.all([batch1, batch2, batch3]);
        return [...results1, ...results2, ...results3];
      };

      const [
        fatigueFull, rosterFull, seatbeltFull, rambuFull,
        antrianFull, jarakFull, kecepatanFull, pencahayaanFull,
        lotoFull, digitalFull, workshopFull, behaviorFull,
        standJackFull, hydraulicJackFull, bottleJackFull, impactFull,
        aparFull, mesinLasFull, mesinKompresorFull, gerindaDudukFull, fuelStorageFull, chargingStationFull, sopKritisFull
      ] = await fetchAllInBatches();

      // Omit large fields like activityPhotos for the recap list to save bandwidth and speed up JSON serialization
      const omitLargeFields = (sessions: any[]) => sessions.map(s => {
        const { activityPhotos, ...rest } = s;
        return rest;
      });

      const fatigue = omitLargeFields(fatigueFull);
      const roster = omitLargeFields(rosterFull);
      const seatbelt = omitLargeFields(seatbeltFull);
      const rambu = omitLargeFields(rambuFull);
      const antrian = omitLargeFields(antrianFull);
      const jarak = omitLargeFields(jarakFull);
      const kecepatan = omitLargeFields(kecepatanFull);
      const pencahayaan = omitLargeFields(pencahayaanFull);
      const loto = omitLargeFields(lotoFull);
      const digital = omitLargeFields(digitalFull);
      const workshop = omitLargeFields(workshopFull);
      const behavior = omitLargeFields(behaviorFull);
      const standJack = omitLargeFields(standJackFull);
      const hydraulicJack = omitLargeFields(hydraulicJackFull);
      const bottleJack = omitLargeFields(bottleJackFull);
      const impact = omitLargeFields(impactFull);
      const apar = omitLargeFields(aparFull);
      const mesinLas = omitLargeFields(mesinLasFull || []);
      const mesinKompresor = omitLargeFields(mesinKompresorFull || []);
      const gerindaDuduk = omitLargeFields(gerindaDudukFull || []);
      const fuelStorage = omitLargeFields(fuelStorageFull || []);
      const chargingStation = omitLargeFields(chargingStationFull || []);
      const sopKritis = omitLargeFields(sopKritisFull || []);

      const allSessionsCount = fatigue.length + roster.length + seatbelt.length + rambu.length +
        antrian.length + jarak.length + kecepatan.length + pencahayaan.length +
        loto.length + digital.length + workshop.length + behavior.length + standJack.length +
        hydraulicJack.length + bottleJack.length + impact.length + apar.length + mesinLas.length + mesinKompresor.length + gerindaDuduk.length + fuelStorage.length + chargingStation.length + sopKritis.length;

      // Extract all session IDs for targeted observer fetch
      const fatigueIds = fatigue.map(s => s.id).filter(id => !!id);
      const rosterIds = roster.map(s => s.id).filter(id => !!id);

      // Simplest and most robust: Fetch all observers. These tables are currently small enough (<1k rows).
      const fatigueObs = await fetchSession('FatigueObs', storage.db.select().from(sidakFatigueObservers));
      const rosterObs = await fetchSession('RosterObs', storage.db.select().from(sidakRosterObservers));

      const totalFetchTime = Date.now() - start;
      console.log(`[SIDAK-RECAP] Total data fetch completed in ${totalFetchTime}ms. Processing ${allSessionsCount} sessions.`);

      // Pre-index observers into a Map for O(1) lookup
      const fatigueObsMap = new Map<string, string[]>();
      fatigueObs.forEach((o: any) => {
        if (!fatigueObsMap.has(o.sessionId)) fatigueObsMap.set(o.sessionId, []);
        fatigueObsMap.get(o.sessionId)!.push(o.nama);
      });
      const rosterObsMap = new Map<string, string[]>();
      rosterObs.forEach((o: any) => {
        if (!rosterObsMap.has(o.sessionId)) rosterObsMap.set(o.sessionId, []);
        rosterObsMap.get(o.sessionId)!.push(o.nama);
      });

      const getObserverNames = (sessionId: string, type: string) => {
        let names: string[] = [];
        if (type === 'Fatigue') names = fatigueObsMap.get(sessionId) || [];
        else if (type === 'Roster') names = rosterObsMap.get(sessionId) || [];
        return names.join(', ');
      };

      const mapSession = (s: any, type: string) => {
        const tanggal = s.tanggal || s.date || s.tanggalPelaksanaan || "";
        const waktu = s.waktu || s.jam || s.jamPelaksanaan || "";
        const waktuStr = (s.waktuMulai && s.waktuSelesai) ? `${s.waktuMulai} - ${s.waktuSelesai}` : waktu;

        const obsNames = getObserverNames(s.id, type);

        return {
          id: s.id,
          type: type,
          tanggal: tanggal ? new Date(tanggal).toISOString() : new Date().toISOString(),
          waktu: waktuStr,
          shift: s.shift || "",
          lokasi: s.lokasi || "",
          departemen: s.departemen || s.subLokasi || "-",
          area: s.area || null,
          perusahaan: s.perusahaan || null,
          totalSampel: s.totalSampel || 0,
          observerCount: obsNames ? obsNames.split(',').length : 0,
          observers: obsNames,
          createdBy: s.createdBy || null,
          supervisorName: s.createdBy || s.namaSupervisor || s.supervisorName || s.picName || s.nama || "-",
          createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString()
        };
      };

      const allSessions = [
        ...fatigue.map((s: any) => mapSession(s, 'Fatigue')),
        ...roster.map((s: any) => mapSession(s, 'Roster')),
        ...seatbelt.map((s: any) => mapSession(s, 'Seatbelt')),
        ...rambu.map((s: any) => mapSession(s, 'Rambu')),
        ...antrian.map((s: any) => mapSession(s, 'Antrian')),
        ...jarak.map((s: any) => mapSession(s, 'Jarak')),
        ...kecepatan.map((s: any) => mapSession(s, 'Kecepatan')),
        ...pencahayaan.map((s: any) => mapSession(s, 'Pencahayaan')),
        ...loto.map((s: any) => mapSession(s, 'LOTO')),
        ...digital.map((s: any) => mapSession(s, 'Digital')),
        ...workshop.map((s: any) => mapSession(s, 'Workshop')),
        ...behavior.map((s: any) => mapSession(s, 'Behavior')),
        ...standJack.map((s: any) => mapSession(s, 'StandJack')),
        ...hydraulicJack.map((s: any) => mapSession(s, 'HydraulicJack')),
        ...bottleJack.map((s: any) => mapSession(s, 'BottleJack')),
        ...impact.map((s: any) => mapSession(s, 'Impact')),
        ...apar.map((s: any) => mapSession(s, 'Apar')),
        ...mesinLas.map((s: any) => mapSession(s, 'MesinLas')),
        ...mesinKompresor.map((s: any) => mapSession(s, 'MesinKompresor')),
        ...gerindaDuduk.map((s: any) => mapSession(s, 'GerindaDuduk')),
        ...fuelStorage.map((s: any) => mapSession(s, 'FuelStorage')),
        ...chargingStation.map((s: any) => mapSession(s, 'ChargingStation')),
        ...sopKritis.map((s: any) => mapSession(s, 'SopKritis'))
      ];

      // Optimization: Fetch only used employee names to avoid fetching thousands of unrelated records
      const usedNiks = Array.from(new Set(
        allSessions.map(s => s.createdBy).filter(nik => nik && (nik.startsWith('C-') || nik.startsWith('P-')))
      ));

      console.log(`[SIDAK-RECAP] Unique NIKs to resolve: ${usedNiks.length}`);
      let nikToNameMap = new Map<string, string>();

      if (usedNiks.length > 0) {
        // Use chunks for inArray if usedNiks is very large (Postgres limit is 65535, but smaller is safer)
        const chunkSize = 500;
        for (let i = 0; i < usedNiks.length; i += chunkSize) {
          const chunk = usedNiks.slice(i, i + chunkSize);
          const relevantEmployees = await storage.db.select({ id: employees.id, name: employees.name })
            .from(employees)
            .where(inArray(employees.id, chunk));

          relevantEmployees.forEach((e: any) => nikToNameMap.set(e.id, e.name));
        }
        console.log(`[SIDAK-RECAP] Resolved ${nikToNameMap.size} supervisor names`);
      }

      for (const session of allSessions) {
        let nik = session.createdBy;
        if (nik && (nik.startsWith('C-') || nik.startsWith('P-'))) {
          session.supervisorName = nikToNameMap.get(nik) || nik;
        }
      }

      // Calculate totalSampel from records count for sessions with totalSampel = 0
      const getRecordCount = async (session: any): Promise<number> => {
        try {
          switch (session.type) {
            case 'Fatigue':
              return (await storage.getSidakFatigueRecords(session.id)).length;
            case 'Roster':
              return (await storage.getSidakRosterRecords(session.id)).length;
            case 'Seatbelt':
              return (await storage.getSidakSeatbeltRecords(session.id)).length;
            case 'Rambu':
              return (await storage.getSidakRambuObservations(session.id)).length;
            case 'Antrian':
              return (await storage.getSidakAntrianRecords(session.id)).length;
            case 'Jarak':
              return (await storage.getSidakJarakRecords(session.id)).length;
            case 'Kecepatan':
              return (await storage.getSidakKecepatanRecords(session.id)).length;
            case 'Pencahayaan':
              return (await storage.getSidakPencahayaanRecords(session.id)).length;
            case 'LOTO':
              return (await storage.getSidakLotoRecords(session.id)).length;
            case 'Digital':
              return (await storage.getSidakDigitalRecords(session.id)).length;
            case 'Workshop':
              return (await storage.getSidakWorkshopEquipment(session.id)).length;
            case 'Behavior':
              return (await storage.getSidakBehaviorRecords(session.id)).length;
            case 'StandJack':
              return (await storage.getSidakStandJackRecords(session.id)).length;
            case 'HydraulicJack':
              return (await storage.getSidakHydraulicJackRecords(session.id)).length;
            case 'BottleJack':
              return (await storage.getSidakBottleJackRecords(session.id)).length;
            case 'Impact':
              return (await storage.getSidakImpactRecords(session.id)).length;
            case 'ChargingStation':
              return (await storage.getSidakChargingStationRecords(session.id)).length;
            case 'SopKritis':
              return (await storage.getSopKritisLangkah(session.id)).length;
            default:
              return 0;
          }
        } catch {
          return 0;
        }
      };

      // Removing the N+1 query loop to vastly improve performance.
      // If totalSampel is 0, it stays 0 in the recap to avoid hundreds of database queries.
      const sessionsWithZero = allSessions.filter(s => s.totalSampel === 0);
      console.log(`[SIDAK-RECAP] Sessions with totalSampel=0: ${sessionsWithZero.length}. Skipping N+1 count recalculation.`);

      // Pre-calculate timestamps for ultra-fast sorting
      const sessionsWithTime = allSessions.map(s => ({
        ...s,
        _time: new Date(s.tanggal).getTime()
      }));
      sessionsWithTime.sort((a, b) => b._time - a._time);

      const finalSessions = sessionsWithTime.map(({ _time, ...s }) => s);

      const stats = {
        totalSidak: finalSessions.length,
        totalFatigue: fatigue.length,
        totalRoster: roster.length,
        totalSeatbelt: seatbelt.length,
        totalRambu: rambu.length,
        totalAntrian: antrian.length,
        totalJarak: jarak.length,
        totalKecepatan: kecepatan.length,
        totalPencahayaan: pencahayaan.length,
        totalLoto: loto.length,
        totalDigital: digital.length,
        totalWorkshop: workshop.length,
        totalBehavior: behavior.length,
        totalStandJack: standJack.length,
        totalHydraulicJack: hydraulicJack.length,
        totalBottleJack: bottleJack.length,
        totalApar: apar.length,
        totalImpact: impact.length,
        totalMesinLas: mesinLas.length,
        totalMesinKompresor: mesinKompresor.length,
        totalGerindaDuduk: gerindaDuduk.length,
        totalFuelStorage: fuelStorage.length,
        totalKaryawanDiperiksa: finalSessions.reduce((acc, curr) => acc + (curr.totalSampel || 0), 0),
        supervisorStats: [] as any[]
      };

      const supervisorMap = new Map<string, any>();
      finalSessions.forEach(session => {
        const name = session.supervisorName;
        if (name && name !== '-' && name !== 'N/A') {
          if (!supervisorMap.has(name)) {
            supervisorMap.set(name, {
              name,
              fatigue: 0, roster: 0, seatbelt: 0, rambu: 0, antrian: 0,
              jarak: 0, kecepatan: 0, pencahayaan: 0, loto: 0, digital: 0, workshop: 0, behavior: 0,
              standjack: 0, hydraulicjack: 0, bottlejack: 0, apar: 0, impact: 0, mesinlas: 0,
              mesinkompresor: 0, gerindaduduk: 0, fuelstorage: 0,
              total: 0
            });
          }
          const sup = supervisorMap.get(name);
          sup.total++;
          const typeKey = session.type.toLowerCase();
          if (sup[typeKey] !== undefined) {
            sup[typeKey]++;
          }
        }
      });

      stats.supervisorStats = Array.from(supervisorMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 20);

      res.json({ sessions: finalSessions, stats });

    } catch (error: any) {
      console.error("Error fetching Sidak Recap:", error);
      res.status(500).json({
        message: "Gagal memuat data rekap SIDAK",
        error: String(error),
        stack: (error instanceof Error) ? error.stack : undefined
      });
    }
  });

  // GET /api/sidak/monthly-history?months=6 — riwayat N bulan terakhir (fetch sekali, grouping di sini)
  app.get("/api/sidak/monthly-history", async (req, res) => {
    try {
      const numMonths = Math.min(parseInt((req.query.months as string) || '6', 10), 12);
      const safe = async (p: Promise<any[]>) => { try { return await p; } catch { return []; } };

      const allSessions = await Promise.all([
        safe(storage.getAllSidakFatigueSessions()),
        safe(storage.getAllSidakRosterSessions()),
        safe(storage.getAllSidakSeatbeltSessions()),
        safe(storage.getAllSidakRambuSessions()),
        safe(storage.getAllSidakAntrianSessions()),
        safe(storage.getAllSidakApdSessions()),
        safe(storage.getAllSidakJarakSessions()),
        safe(storage.getAllSidakKecepatanSessions()),
        safe(storage.getAllSidakPencahayaanSessions()),
        safe(storage.getAllSidakLotoSessions()),
        safe(storage.getAllSidakDigitalSessions()),
        safe(storage.getAllSidakWorkshopSessions()),
        safe(storage.getAllSidakBehaviorSessions()),
        safe(storage.getSidakP3kHistory()),
        safe(storage.getAllSidakIntercomSessions()),
        safe(storage.getAllSidakStandJackSessions()),
        safe(storage.getAllSidakHydraulicJackSessions()),
        safe(storage.getAllSidakBottleJackSessions()),
        safe(storage.getSidakImpactSessions()),
        safe(storage.getSidakAparSessions()),
        safe(storage.getSidakMesinLasSessions()),
        safe(storage.getSidakMesinKompresorSessions()),
        safe(storage.getSidakGerindaDudukSessions()),
        safe(storage.getSidakFuelStorageSessions()),
      ]);
      const total = allSessions.length; // 24 types

      // endMonth: default ke bulan ini, bisa dioverride via query param
      const endMonthParam = req.query.endMonth as string | undefined;
      const endRef = endMonthParam ? new Date(endMonthParam + '-01') : new Date();
      const months: { key: string; label: string }[] = [];
      for (let i = numMonths - 1; i >= 0; i--) {
        const d = new Date(endRef.getFullYear(), endRef.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        months.push({ key, label });
      }

      const history = months.map(({ key, label }) => {
        const doneTypes = allSessions.filter(sessions =>
          sessions.some((s: any) => ((s.tanggal || s.date) ?? '').startsWith(key))
        ).length;
        return {
          month: key,
          label,
          done: doneTypes,
          notDone: total - doneTypes,
          total,
          percentage: Math.round((doneTypes / total) * 100),
        };
      });

      res.json({ history, totalTypes: total });
    } catch (error) {
      console.error("[SIDAK-MONTHLY-HISTORY]", error);
      res.status(500).json({ message: "Failed to fetch monthly history" });
    }
  });

  // POST /api/sidak/seed-months — insert 1 minimal session per sidak type per bulan
  app.post("/api/sidak/seed-months", async (req, res) => {
    try {
      const { months } = req.body as { months: string[] };
      if (!months?.length) return res.status(400).json({ message: "months array required" });

      let created = 0;
      for (const month of months) {
        const tanggal = `${month}-15`;
        const baseFields = { tanggal, waktu: "08:00", shift: "Shift 1", lokasi: "Pit Area" };

        await Promise.all([
          storage.createSidakFatigueSession({ ...baseFields, waktuMulai: "07:00", waktuSelesai: "09:00", area: "Area A", departemen: "HSE" }).then(() => created++).catch(() => {}),
          storage.createSidakRosterSession({ ...baseFields, perusahaan: "BIB", departemen: "HSE" }).then(() => created++).catch(() => {}),
          storage.createSidakSeatbeltSession({ ...baseFields }).then(() => created++).catch(() => {}),
          storage.createSidakRambuSession({ tanggal, shift: "Shift 1", waktuMulai: "07:00", waktuSelesai: "09:00", lokasi: "Pit Area" }).then(() => created++).catch(() => {}),
          storage.createSidakAntrianSession({ ...baseFields, perusahaan: "BIB", departemen: "HSE", createdBy: "SYSTEM" }).then(() => created++).catch(() => {}),
          storage.createSidakApdSession({ ...baseFields, perusahaan: "BIB", departemen: "HSE" }).then(() => created++).catch(() => {}),
          storage.createSidakJarakSession({ tanggal, jam: "08:00", shift: "Shift 1", lokasi: "Pit Area" }).then(() => created++).catch(() => {}),
          storage.createSidakKecepatanSession({ ...baseFields }).then(() => created++).catch(() => {}),
          storage.createSidakPencahayaanSession({ tanggalPemeriksaan: tanggal, namaPerusahaan: "BIB", jenisAlatMerk: "Lux Meter", lokasiPengukuran: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakLotoSession({ ...baseFields, lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakDigitalSession({ tanggal, lokasi: "Pit Area" }).then(() => created++).catch(() => {}),
          storage.createSidakWorkshopSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakBehaviorSession({ ...baseFields, metodeSidak: "Observasi" }).then(() => created++).catch(() => {}),
          storage.createSidakP3k({ tanggal, waktu: "08:00", lokasi: "Klinik", inspectorName: "HSE Officer" }, []).then(() => created++).catch(() => {}),
          storage.createSidakIntercomSession({ tanggal, shift: "Shift 1", waktu: "08:00", lokasi: "Pit Area" }).then(() => created++).catch(() => {}),
          storage.createSidakStandJackSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakHydraulicJackSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakBottleJackSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakImpactSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakAparSession({ tanggal, namaWorkshop: "Workshop Utama", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakMesinLasSession({ tanggal, namaObjekInspeksi: "Mesin Las 01", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakMesinKompresorSession({ tanggal, namaObjekInspeksi: "Kompresor 01", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakGerindaDudukSession({ tanggal, namaObjekInspeksi: "Gerinda 01", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
          storage.createSidakFuelStorageSession({ tanggal, namaWorkshop: "Fuel Storage", lokasi: "Workshop" }).then(() => created++).catch(() => {}),
        ]);
      }

      res.json({ created, months });
    } catch (error) {
      console.error("[SIDAK-SEED-MONTHS]", error);
      res.status(500).json({ message: "Failed to seed months" });
    }
  });

  // GET /api/sidak/monthly-check?month=YYYY-MM
  app.get("/api/sidak/monthly-check", async (req, res) => {
    try {
      const now = new Date();
      const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const month = (req.query.month as string) || defaultMonth;

      const safe = async (p: Promise<any[]>) => { try { return await p; } catch { return []; } };

      const [
        fatigue, roster, seatbelt, rambu, antrian, apd, jarak, kecepatan,
        pencahayaan, loto, digital, workshop, behavior, p3k, intercom,
        standJack, hydraulicJack, bottleJack, impact, apar,
        mesinLas, mesinKompresor, gerindaDuduk, fuelStorage, chargingStation, sopKritis
      ] = await Promise.all([
        safe(storage.getAllSidakFatigueSessions()),
        safe(storage.getAllSidakRosterSessions()),
        safe(storage.getAllSidakSeatbeltSessions()),
        safe(storage.getAllSidakRambuSessions()),
        safe(storage.getAllSidakAntrianSessions()),
        safe(storage.getAllSidakApdSessions()),
        safe(storage.getAllSidakJarakSessions()),
        safe(storage.getAllSidakKecepatanSessions()),
        safe(storage.getAllSidakPencahayaanSessions()),
        safe(storage.getAllSidakLotoSessions()),
        safe(storage.getAllSidakDigitalSessions()),
        safe(storage.getAllSidakWorkshopSessions()),
        safe(storage.getAllSidakBehaviorSessions()),
        safe(storage.getSidakP3kHistory()),
        safe(storage.getAllSidakIntercomSessions()),
        safe(storage.getAllSidakStandJackSessions()),
        safe(storage.getAllSidakHydraulicJackSessions()),
        safe(storage.getAllSidakBottleJackSessions()),
        safe(storage.getSidakImpactSessions()),
        safe(storage.getSidakAparSessions()),
        safe(storage.getSidakMesinLasSessions()),
        safe(storage.getSidakMesinKompresorSessions()),
        safe(storage.getSidakGerindaDudukSessions()),
        safe(storage.getSidakFuelStorageSessions()),
        safe(storage.getAllSidakChargingStationSessions()),
        safe(storage.getAllSopKritisSessions()),
      ]);

      const checkMonth = (sessions: any[]) => {
        const inMonth = sessions.filter(s => ((s.tanggal || s.date) ?? '').startsWith(month));
        const sorted = [...inMonth].sort((a, b) =>
          ((b.tanggal || b.date) ?? '') > ((a.tanggal || a.date) ?? '') ? 1 : -1
        );
        return { count: inMonth.length, lastDate: sorted[0]?.tanggal || sorted[0]?.date || null, done: inMonth.length > 0 };
      };

      const sidakTypes = [
        { type: 'Fatigue', label: 'Sidak Fatigue', ...checkMonth(fatigue) },
        { type: 'Roster', label: 'Sidak Roster', ...checkMonth(roster) },
        { type: 'Seatbelt', label: 'Sidak Seatbelt', ...checkMonth(seatbelt) },
        { type: 'Rambu', label: 'Sidak Rambu', ...checkMonth(rambu) },
        { type: 'Antrian', label: 'Sidak Antrian', ...checkMonth(antrian) },
        { type: 'APD', label: 'Sidak APD', ...checkMonth(apd) },
        { type: 'Jarak', label: 'Sidak Jarak', ...checkMonth(jarak) },
        { type: 'Kecepatan', label: 'Sidak Kecepatan', ...checkMonth(kecepatan) },
        { type: 'Pencahayaan', label: 'Sidak Pencahayaan', ...checkMonth(pencahayaan) },
        { type: 'LOTO', label: 'Sidak LOTO', ...checkMonth(loto) },
        { type: 'Digital', label: 'Sidak Digital', ...checkMonth(digital) },
        { type: 'Workshop', label: 'Sidak Workshop', ...checkMonth(workshop) },
        { type: 'Behavior', label: 'Sidak Tingkah Laku', ...checkMonth(behavior) },
        { type: 'P3K', label: 'Inspeksi P3K', ...checkMonth(p3k) },
        { type: 'Intercom', label: 'Sidak Intercom', ...checkMonth(intercom) },
        { type: 'StandJack', label: 'Sidak Stand Jack', ...checkMonth(standJack) },
        { type: 'HydraulicJack', label: 'Sidak Hydraulic Jack', ...checkMonth(hydraulicJack) },
        { type: 'BottleJack', label: 'Sidak Bottle Jack', ...checkMonth(bottleJack) },
        { type: 'Impact', label: 'Sidak Impact', ...checkMonth(impact) },
        { type: 'Apar', label: 'Inspeksi APAR', ...checkMonth(apar) },
        { type: 'MesinLas', label: 'Sidak Mesin Las', ...checkMonth(mesinLas) },
        { type: 'MesinKompresor', label: 'Sidak Mesin Kompresor', ...checkMonth(mesinKompresor) },
        { type: 'GerindaDuduk', label: 'Sidak Gerinda Duduk', ...checkMonth(gerindaDuduk) },
        { type: 'FuelStorage', label: 'Sidak Fuel Storage', ...checkMonth(fuelStorage) },
        { type: 'ChargingStation', label: 'Sidak Charging Station', ...checkMonth(chargingStation) },
        { type: 'SopKritis', label: 'Observasi SOP Kritis', ...checkMonth(sopKritis) },
      ];

      res.json({ month, sidakTypes });
    } catch (error) {
      console.error("[SIDAK-MONTHLY-CHECK]", error);
      res.status(500).json({ message: "Failed to check monthly status" });
    }
  });

  // GET /api/sidak/supervisors
  app.get("/api/sidak/supervisors", async (req, res) => {
    try {
      const allEmployees = await storage.getAllEmployees();
      const supervisorPositions = ['HSE Group Leader', 'Maintenance Group Leader', 'Production Group Leader'];
      const supervisors = allEmployees
        .filter(e => e.position && supervisorPositions.some(p => e.position!.toLowerCase().includes(p.toLowerCase())))
        .map(e => ({ id: e.id, name: e.name, position: e.position, department: e.department, phone: e.phone }));
      res.json(supervisors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supervisors" });
    }
  });

  // POST /api/sidak/send-inspection-reminder
  app.post("/api/sidak/send-inspection-reminder", async (req, res) => {
    try {
      const { month, supervisorIds, message } = req.body;
      if (!supervisorIds?.length || !message) {
        return res.status(400).json({ message: "supervisorIds and message are required" });
      }
      const allEmployees = await storage.getAllEmployees();
      const targets = allEmployees.filter(e => supervisorIds.includes(e.id));

      const results: { name: string; phone: string; status: string }[] = [];
      for (const emp of targets) {
        try {
          await sendWhatsAppMessage({
            phone: emp.phone,
            message,
            logContext: {
              module: "SIDAK_INSPECTION_REMINDER",
              referenceId: month,
              referenceName: emp.name,
              recipientType: "EMPLOYEE",
              messageType: "REMINDER",
            }
          });
          results.push({ name: emp.name, phone: emp.phone, status: 'sent' });
        } catch {
          results.push({ name: emp.name, phone: emp.phone, status: 'failed' });
        }
      }

      res.json({
        sent: results.filter(r => r.status === 'sent').length,
        failed: results.filter(r => r.status === 'failed').length,
        results,
      });
    } catch (error) {
      console.error("[SIDAK-SEND-REMINDER]", error);
      res.status(500).json({ message: "Failed to send reminders" });
    }
  });

  app.get("/api/sidak-recap/detail", async (req, res) => {
    try {
      const sessionId = req.query.sessionId as string;
      const type = req.query.type as string;

      if (!sessionId || !type) {
        return res.status(400).json({ message: "Session ID and Type are required" });
      }

      // Helper function to resolve NIK to employee name
      const resolveNikToName = async (nik: string | null | undefined): Promise<string> => {
        if (!nik) return '-';
        if (nik.startsWith('C-') || nik.startsWith('P-')) {
          const employee = await storage.getEmployee(nik);
          return employee?.name || nik;
        }
        return nik;
      };

      if (type === 'Fatigue') {
        const session = await storage.getSidakFatigueSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakFatigueRecords(sessionId as string);
        const observers = await storage.getSidakFatigueObservers(sessionId as string);

        // Debug logging for photos
        console.log('[SIDAK-RECAP] Fatigue session photos:', {
          sessionId,
          activityPhotos: session.activityPhotos,
          photosCount: session.activityPhotos?.length || 0
        });

        // Resolve supervisor NIK to name
        const supervisorName = await resolveNikToName(session.createdBy);

        return res.json({
          session: {
            ...session,
            type: 'Fatigue',
            waktu: `${session.waktuMulai} - ${session.waktuSelesai}`,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Roster') {
        const session = await storage.getSidakRosterSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakRosterRecords(sessionId as string);
        const observers = await storage.getSidakRosterObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Roster',
            tanggal: session.tanggal,
            waktu: session.waktu,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Seatbelt') {
        const session = await storage.getSidakSeatbeltSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakSeatbeltRecords(sessionId as string);
        const observers = await storage.getSidakSeatbeltObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Seatbelt',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Rambu') {
        const session = await storage.getSidakRambuSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakRambuObservations(sessionId as string);
        const observers = await storage.getSidakRambuObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Rambu',
            tanggal: session.tanggal,
            waktu: `${session.waktuMulai} - ${session.waktuSelesai}`,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }


      if (type === 'Antrian') {
        const session = await storage.getSidakAntrianSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakAntrianRecords(sessionId as string);
        const observers = await storage.getSidakAntrianObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Antrian',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: session.departemen,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Jarak') {
        const session = await storage.getSidakJarakSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakJarakRecords(sessionId as string);
        const observers = await storage.getSidakJarakObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Jarak',
            tanggal: session.tanggal,
            waktu: session.waktu,
            shift: session.shift,
            lokasi: session.lokasi,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Kecepatan') {
        const session = await storage.getSidakKecepatanSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakKecepatanRecords(sessionId as string);
        const observers = await storage.getSidakKecepatanObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Kecepatan',
            tanggal: session.tanggal,
            waktu: session.waktu,
            shift: session.shift,
            lokasi: session.lokasi,
            area: session.subLokasi,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Pencahayaan') {
        const session = await storage.getSidakPencahayaanSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakPencahayaanRecords(sessionId as string);
        const observers = await storage.getSidakPencahayaanObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Pencahayaan',
            tanggal: session.tanggal,
            waktu: session.waktu,
            shift: session.shift,
            lokasi: session.lokasi,
            departemen: session.departemen,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'LOTO') {
        const session = await storage.getSidakLotoSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakLotoRecords(sessionId as string);
        const observers = await storage.getSidakLotoObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'LOTO',
            tanggal: session.tanggal,
            waktu: session.waktu,
            shift: session.shift,
            lokasi: session.lokasi,
            departemen: session.departemen,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Digital') {
        const session = await storage.getSidakDigitalSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakDigitalRecords(sessionId as string);
        const observers = await storage.getSidakDigitalObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Digital',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }

      if (type === 'Workshop') {
        const session = await storage.getSidakWorkshopSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const equipment = await storage.getSidakWorkshopEquipment(sessionId as string);
        const inspectors = await storage.getSidakWorkshopInspectors(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Workshop',
            supervisorName,
            photos: session.activityPhotos,
            namaWorkshop: session.namaWorkshop,
            lokasi: session.lokasi,
            penanggungJawabArea: session.penanggungJawabArea,
            waktu: session.waktu || (session.createdAt ? new Date(session.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : "-")
          },
          records: equipment.map((e: any) => {
            // Map inspectionResults to simple booleans for the 3-column UI
            const results = e.inspectionResults || {};
            const itemValues = Object.values(results);
            const allOk = itemValues.length > 0 && itemValues.every(v => v === 'S');

            return {
              ...e,
              namaAlat: e.equipmentType === 'OTHER' ? (e.namaAlat || e.noRegisterPeralatan) : `${e.equipmentType} #${e.noRegisterPeralatan || '-'}`,
              kondisi: allOk || (results['1.3'] === 'S' || results['2.3'] === 'S' || results['3.1.3'] === 'S' || results['4.3'] === 'S' || results['5.1'] === 'S'),
              kebersihan: results['2.4'] === 'S' || results['1.3'] === 'S' || true, // Placeholder logic
              sertifikasi: results['1.2'] === 'S' || results['2.2'] === 'S' || results['3.1.2'] === 'S' || results['4.2'] === 'S' || results['5.2'] === 'S',
              keterangan: e.tindakLanjutPerbaikan || "-"
            };
          }),
          observers: inspectors
        });
      }

      if (type === 'Behavior') {
        const session = await storage.getSidakBehaviorSession(sessionId as string);
        if (!session) return res.status(404).json({ message: "Session not found" });
        const records = await storage.getSidakBehaviorRecords(sessionId as string);
        const observers = await storage.getSidakBehaviorObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Behavior',
            tanggal: session.tanggal,
            waktu: session.waktu,
            shift: session.shift,
            lokasi: session.lokasi,
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }


      if (type === 'StandJack') {
        const session = await storage.getSidakStandJackSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakStandJackRecords(sessionId as string);
        const observers = await storage.getSidakStandJackObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'StandJack',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'HydraulicJack') {
        const session = await storage.getSidakHydraulicJackSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakHydraulicJackRecords(sessionId as string);
        const observers = await storage.getSidakHydraulicJackObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'HydraulicJack',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'BottleJack') {
        const session = await storage.getSidakBottleJackSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakBottleJackRecords(sessionId as string);
        const observers = await storage.getSidakBottleJackObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'BottleJack',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'Impact') {
        const session = await storage.getSidakImpactSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakImpactRecords(sessionId as string);
        const observers = await storage.getSidakImpactObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Impact',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'Apar') {
        const session = await storage.getSidakAparSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakAparRecords(sessionId as string);
        const observers = await storage.getSidakAparObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Apar',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'MesinLas') {
        const session = await storage.getSidakMesinLasSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakMesinLasRecords(sessionId as string);
        const observers = await storage.getSidakMesinLasObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'MesinLas',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'MesinKompresor') {
        const session = await storage.getSidakMesinKompresorSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakMesinKompresorRecords(sessionId as string);
        const observers = await storage.getSidakMesinKompresorObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'MesinKompresor',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'GerindaDuduk') {
        const session = await storage.getSidakGerindaDudukSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakGerindaDudukRecords(sessionId as string);
        const observers = await storage.getSidakGerindaDudukObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'GerindaDuduk',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'FuelStorage') {
        const session = await storage.getSidakFuelStorageSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakFuelStorageRecords(sessionId as string);
        const observers = await storage.getSidakFuelStorageObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'FuelStorage',
            tanggal: session.tanggal,
            waktu: session.waktu,
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'ChargingStation') {
        const session = await storage.getSidakChargingStationSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const records = await storage.getSidakChargingStationRecords(sessionId as string);
        const observers = await storage.getSidakChargingStationObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'ChargingStation',
            tanggal: session.tanggal,
            waktu: (session.waktuMulai && session.waktuSelesai) ? `${session.waktuMulai} - ${session.waktuSelesai}` : '',
            departemen: '-',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
          observers
        });
      }
      if (type === 'SopKritis') {
        const session = await storage.getSopKritisSession(sessionId as string);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        const pengendalian = await storage.getSopKritisPengendalian(sessionId as string);
        const langkah = await storage.getSopKritisLangkah(sessionId as string);
        const observers = await storage.getSopKritisObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'SopKritis',
            tanggal: session.tanggal,
            waktu: '',
            departemen: session.departemen || '-',
            supervisorName,
            photos: session.activityPhotos
          },
          pengendalian,
          langkah,
          observers
        });
      }

      return res.status(400).json({ message: "Invalid Sidak Type" });

    } catch (error: any) {
      console.error("Error fetching Sidak detail:", error);
      res.status(500).json({ message: "Gagal mengambil detail Sidak" });
    }
  });

  // Get all Sidak Seatbelt sessions

  // Get single Sidak Seatbelt session
  app.get("/api/sidak-seatbelt/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const session = await storage.getSidakSeatbeltSession(id);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Seatbelt tidak ditemukan" });
      }

      const [records, observers] = await Promise.all([
        storage.getSidakSeatbeltRecords(id),
        storage.getSidakSeatbeltObservers(id)
      ]);

      res.json({
        ...session,
        records,
        observers
      });
    } catch (error) {
      console.error("Error fetching Sidak Seatbelt session:", error);
      res.status(500).json({ message: "Gagal mengambil detail sesi Sidak Seatbelt" });
    }
  });

  // Add Sidak Seatbelt record
  app.post("/api/sidak-seatbelt/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakSeatbeltRecordSchema.parse({
        ...req.body,
        sessionId: id
      });

      const record = await storage.createSidakSeatbeltRecord(validatedData);

      // Update session sample count
      await storage.updateSidakSeatbeltSessionSampleCount(id);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_SEATBELT",
        referenceId: record.id,
        sessionId: id,
        inspectionResults: record,
        moduleLabel: "Sidak Seatbelt"
      });

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Seatbelt record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan record Sidak Seatbelt" });
    }
  });

  // Add Sidak Seatbelt observer
  app.post("/api/sidak-seatbelt/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakSeatbeltObserverSchema.parse({
        ...req.body,
        sessionId: id
      });

      const observer = await storage.createSidakSeatbeltObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Seatbelt observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer Sidak Seatbelt" });
    }
  });

  // ============================================
  // ADAPTER: LOCAL "OBJECT STORAGE" FOR SEATBELT
  // This mimics the Object Storage flow but uses local disk for compatibility.
  // ============================================

  // 1. Request Upload URL (returns a local PUT endpoint)

  // 2. Local PUT Handler (receives the raw file stream)
  app.put("/api/sidak-seatbelt/temp-upload/:filename", (req, res) => {
    const { filename } = req.params;
    const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-seatbelt-photos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, filename);
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.status(200).json({ success: true });
    });

    writeStream.on('error', (err) => {
      console.error("Stream write error:", err);
      res.status(500).json({ error: "Failed to write file" });
    });
  });

  // 3. Confirm Upload (updates the DB)
  app.post("/api/sidak-seatbelt/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body; // This is the path we sent in step 1

      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const session = await storage.getSidakSeatbeltSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Seatbelt session not found" });
      }

      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length >= 6) {
        return res.status(400).json({ error: "Maximum 6 photos allowed" });
      }

      const allPhotos = [...existingPhotos, objectPath];

      const updatedSession = await storage.updateSidakSeatbeltSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photo uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error confirming photo upload:", error);
      res.status(500).json({ error: "Failed to confirm photo upload" });
    }
  });

  // Delete photo
  app.delete("/api/sidak-seatbelt/:id/photos/:index", async (req, res) => {
    try {
      const { id, index } = req.params;
      const photoIndex = parseInt(index, 10);

      const session = await storage.getSidakSeatbeltSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Seatbelt session not found" });
      }

      const existingPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= existingPhotos.length) {
        return res.status(404).json({ error: "Invalid photo index" });
      }

      // Remove photo from array
      const photoToDelete = existingPhotos[photoIndex];
      const updatedPhotos = existingPhotos.filter((_, idx) => idx !== photoIndex);

      const updatedSession = await storage.updateSidakSeatbeltSession(id, {
        activityPhotos: updatedPhotos
      });

      // Try delete from disk
      try {
        // remove leading / if present for path join? 
        // photoToDelete is e.g. /uploads/sidak-seatbelt-photos/xyz
        const relativePath = photoToDelete.startsWith('/') ? photoToDelete.substring(1) : photoToDelete;
        const filePath = path.join(process.cwd(), relativePath);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        console.warn("Delete file error:", e);
      }

      res.json({
        message: "Photo deleted",
        photos: updatedPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // ============================================
  // SIDAK ANTRIAN ROUTES
  // ============================================

  app.get("/api/sidak-antrian", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakAntrianSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Antrian sessions:", error);
      res.status(500).json({ message: "Gagal mengambil riwayat" });
    }
  });

  app.get("/api/sidak-antrian/:id", async (req, res) => {
    try {
      const session = await storage.getSidakAntrianSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakAntrianRecords(req.params.id);
      const observers = await storage.getSidakAntrianObservers(req.params.id);
      res.json({ session, records, observers });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-antrian", async (req, res) => {
    try {
      // Manual validation and fallback as requested
      const body = req.body;
      let rawTanggal = body.tanggal || body.tanggal_pelaksanaan || body.tanggalPelaksanaan;
      let rawWaktu = body.waktu || body.jam_pelaksanaan || body.jamPelaksanaan;

      if (!rawTanggal) {
        return res.status(422).json({
          message: "Tanggal pelaksanaan wajib diisi (YYYY-MM-DD)",
          received: body
        });
      }

      // Standardize Date (YYYY-MM-DD)
      if (rawTanggal.includes('/')) {
        const parts = rawTanggal.split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY -> YYYY-MM-DD
          rawTanggal = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Standardize Time (HH:MM)
      if (rawWaktu && rawWaktu.includes('.')) {
        rawWaktu = rawWaktu.replace('.', ':');
      }

      const payload = {
        ...body,
        tanggal: rawTanggal,
        waktu: rawWaktu || "00:00"
      };

      const validatedData = insertSidakAntrianSessionSchema.parse(payload);
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;
      const session = await storage.createSidakAntrianSession({ ...validatedData, createdBy });
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Antrian:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal membuat sesi", error: error.message });
    }
  });

  app.post("/api/sidak-antrian/:id/records", async (req, res) => {
    try {
      const validatedData = insertSidakAntrianRecordSchema.parse({ ...req.body, sessionId: req.params.id });
      const record = await storage.createSidakAntrianRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_ANTRIAN",
        referenceId: record.id,
        sessionId: req.params.id,
        inspectionResults: record,
        tindakLanjut: record.keterangan || "",
        moduleLabel: "Sidak Antrian"
      });

      res.status(201).json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan record" });
    }
  });

  app.post("/api/sidak-antrian/:id/observers", async (req, res) => {
    try {
      const validatedData = insertSidakAntrianObserverSchema.parse({ ...req.body, sessionId: req.params.id });
      const observer = await storage.createSidakAntrianObserver(validatedData);
      res.status(201).json(observer);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });


  // ============================================
  // SIDAK JARAK ROUTES
  // ============================================

  app.get("/api/sidak-jarak", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakJarakSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil riwayat" });
    }
  });

  // NOTE: /sessions route MUST be before /:id to avoid matching "sessions" as ID
  app.get("/api/sidak-jarak/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakJarakSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil riwayat" });
    }
  });

  app.get("/api/sidak-jarak/:id", async (req, res) => {
    try {
      const session = await storage.getSidakJarakSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakJarakRecords(req.params.id);
      const observers = await storage.getSidakJarakObservers(req.params.id);
      res.json({ session, records, observers });
    } catch (error) {
      res.status(500).json({ message: "Gagal mengambil detail" });
    }
  });

  app.post("/api/sidak-jarak", async (req, res) => {
    try {
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || "SYSTEM";
      const sessionData = { ...req.body, createdBy };
      const validatedData = insertSidakJarakSessionSchema.parse(sessionData);
      const session = await storage.createSidakJarakSession(validatedData);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Jarak session:", error);
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: error.message || "Gagal membuat sesi" });
    }
  });

  app.post("/api/sidak-jarak/:id/records", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const existingRecords = await storage.getSidakJarakRecords(sessionId);
      const ordinal = existingRecords.length + 1;

      const validatedData = insertSidakJarakRecordSchema.parse({ ...req.body, sessionId, ordinal });
      const record = await storage.createSidakJarakRecord(validatedData);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_JARAK_AMAN",
        referenceId: record.id,
        sessionId: req.params.id,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Jarak Aman"
      });

      res.status(201).json(record);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan record" });
    }
  });

  app.post("/api/sidak-jarak/:id/observers", async (req, res) => {
    try {
      const validatedData = insertSidakJarakObserverSchema.parse({ ...req.body, sessionId: req.params.id });
      const observer = await storage.createSidakJarakObserver(validatedData);
      res.status(201).json(observer);
    } catch (error: any) {
      if (error.name === 'ZodError') return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  app.get("/api/sidak-jarak/:id/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakJarakSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Sesi tidak ditemukan" });
      const records = await storage.getSidakJarakRecords(req.params.id);
      const observers = await storage.getSidakJarakObservers(req.params.id);
      const pdfBuffer = await storage.generateSidakJarakPDF({ session, records, observers });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Sidak_Jarak_${session.id}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ message: "Gagal membuat PDF" });
    }
  });


  // ============================================
  // SIDAK KECEPATAN ROUTES
  // ============================================






  // Sidak Fatigue Observers
  app.post("/api/sidak-fatigue/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakFatigueObserverSchema.parse({
        ...req.body,
        sessionId: id
      });

      const observer = await storage.createSidakFatigueObserver(validatedData);

      // Trigger sample count update
      await storage.updateSidakFatigueSessionSampleCount(id);

      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Fatigue observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // Update Sidak Fatigue Record (Intervention/Follow-up)
  app.patch("/api/sidak-fatigue/records/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validFields = [
        "catatanIntervensi", "buktiIntervensi",
        "konsumiObat", "masalahPribadi", "pemeriksaanRespon",
        "pemeriksaanKonsentrasi", "pemeriksaanKesehatan",
        "karyawanSiapBekerja", "fitUntukBekerja", "istirahatDanMonitor",
        "istirahatLebihdariSatuJam", "tidakBolehBekerja",
        "pvtMeanRT"
      ];

      const updateData: any = {};

      // Only allow updating specific fields
      for (const key of Object.keys(req.body)) {
        if (validFields.includes(key)) {
          updateData[key] = req.body[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Tidak ada data yang diupdate" });
      }

      const updatedRecord = await storage.updateSidakFatigueRecord(id, updateData);

      if (!updatedRecord) {
        return res.status(404).json({ message: "Record tidak ditemukan" });
      }

      res.json({
        ...updatedRecord,
        _debug_received_body: req.body,
        _debug_update_data: updateData
      });
    } catch (error) {
      console.error("Error updating fatigue record:", error);
      res.status(500).json({ message: "Gagal mengupdate data fatigue" });
    }
  });

  // Upload activity photos for Sidak Fatigue session (max 6 photos)
  const sidakFatiguePhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  });

  app.post("/api/sidak-fatigue/:id/upload-photos", sidakFatiguePhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }

      const session = await storage.getSidakFatigueSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Fatigue session not found" });
      }

      const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const existingPhotos = session.activityPhotos || [];
      const allPhotos = [...existingPhotos, ...photoPaths].slice(0, 6);

      // Update session with photos
      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photos uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error uploading SIDAK Fatigue photos:", error);
      // Clean up files on error
      if (req.files) {
        (req.files as Express.Multer.File[]).forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
      res.status(500).json({ error: "Failed to upload photos" });
    }
  });

  // Delete a specific photo from Sidak Fatigue session
  app.delete("/api/sidak-fatigue/:id/photos/:photoIndex", async (req, res) => {
    try {
      const { id, photoIndex } = req.params;
      const index = parseInt(photoIndex);

      const session = await storage.getSidakFatigueSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Fatigue session not found" });
      }

      const photos = session.activityPhotos || [];
      if (index < 0 || index >= photos.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      // Delete physical file - extract basename to build correct path
      const photoPath = photos[index];
      const fileName = path.basename(photoPath);
      const filePath = path.join(process.cwd(), 'uploads', 'sidak-fatigue', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from array
      const updatedPhotos = photos.filter((_, i) => i !== index);

      // Update session
      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({
        message: "Photo deleted successfully",
        photos: updatedPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error deleting SIDAK Fatigue photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Delete Sidak Fatigue session (cascades to records & observers)
  app.delete("/api/sidak-fatigue/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSidakFatigueSession(id);

      if (!deleted) {
        return res.status(404).json({ message: "Sesi Sidak Fatigue tidak ditemukan" });
      }

      res.json({ message: "Sesi Sidak Fatigue berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting Sidak Fatigue session:", error);
      res.status(500).json({ message: "Gagal menghapus sesi Sidak Fatigue" });
    }
  });

  // ============================================
  // OBJECT STORAGE PRESIGNED URL ROUTES FOR SIDAK PHOTOS
  // ============================================



  // Request presigned URL for SIDAK Fatigue photo upload
  app.post("/api/sidak-fatigue/:id/request-upload-url", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contentType } = req.body;

      // Verify session exists
      const session = await storage.getSidakFatigueSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Fatigue session not found" });
      }

      // Generate presigned URL for upload
      const uploadURL = await objectStorageServiceInstance.getObjectEntityUploadURL();
      const objectPath = objectStorageServiceInstance.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, contentType }
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Confirm photo upload and add to session
  app.post("/api/sidak-fatigue/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body;

      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const session = await storage.getSidakFatigueSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Fatigue session not found" });
      }

      // Set ACL policy for the uploaded object (public visibility)
      try {
        await objectStorageServiceInstance.trySetObjectEntityAclPolicy(objectPath, {
          owner: "system",
          visibility: "public"
        });
      } catch (aclError) {
        console.warn("Could not set ACL policy:", aclError);
      }

      // Add to session photos (max 6)
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length >= 6) {
        return res.status(400).json({ error: "Maximum 6 photos allowed" });
      }

      const allPhotos = [...existingPhotos, objectPath];

      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photo uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error confirming photo upload:", error);
      res.status(500).json({ error: "Failed to confirm photo upload" });
    }
  });

  // Request presigned URL for SIDAK Roster photo upload
  app.post("/api/sidak-roster/:id/request-upload-url", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contentType } = req.body;

      // Verify session exists
      const session = await storage.getSidakRosterSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Roster session not found" });
      }

      // Generate presigned URL for upload
      const uploadURL = await objectStorageServiceInstance.getObjectEntityUploadURL();
      const objectPath = objectStorageServiceInstance.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        metadata: { name, contentType }
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Confirm photo upload for SIDAK Roster
  app.post("/api/sidak-roster/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body;

      if (!objectPath) {
        return res.status(400).json({ error: "objectPath is required" });
      }

      const session = await storage.getSidakRosterSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Roster session not found" });
      }

      // Set ACL policy for the uploaded object (public visibility)
      try {
        await objectStorageServiceInstance.trySetObjectEntityAclPolicy(objectPath, {
          owner: "system",
          visibility: "public"
        });
      } catch (aclError) {
        console.warn("Could not set ACL policy:", aclError);
      }

      // Add to session photos (max 6)
      const existingPhotos = session.activityPhotos || [];
      if (existingPhotos.length >= 6) {
        return res.status(400).json({ error: "Maximum 6 photos allowed" });
      }

      const allPhotos = [...existingPhotos, objectPath];

      const updatedSession = await storage.updateSidakRosterSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photo uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error confirming photo upload:", error);
      res.status(500).json({ error: "Failed to confirm photo upload" });
    }
  });

  // ============================================
  // PRESIGNED URL ROUTES FOR OTHER SIDAK MODULES
  // ============================================

  // Generic presigned URL handler for SIDAK modules
  const sidakPresignedUrlModules = [
    { name: 'antrian', getSession: storage.getSidakAntrianSession.bind(storage), updateSession: storage.updateSidakAntrianSession.bind(storage) },
    { name: 'jarak', getSession: storage.getSidakJarakSession.bind(storage), updateSession: storage.updateSidakJarakSession.bind(storage) },
    { name: 'kecepatan', getSession: storage.getSidakKecepatanSession.bind(storage), updateSession: storage.updateSidakKecepatanSession.bind(storage) },
    { name: 'pencahayaan', getSession: storage.getSidakPencahayaanSession.bind(storage), updateSession: storage.updateSidakPencahayaanSession.bind(storage) },
    { name: 'loto', getSession: storage.getSidakLotoSession.bind(storage), updateSession: storage.updateSidakLotoSession.bind(storage) },
    { name: 'digital', getSession: storage.getSidakDigitalSession.bind(storage), updateSession: storage.updateSidakDigitalSession.bind(storage) },
    { name: 'workshop', getSession: storage.getSidakWorkshopSession.bind(storage), updateSession: storage.updateSidakWorkshopSession.bind(storage) },
    { name: 'seatbelt', getSession: storage.getSidakSeatbeltSession.bind(storage), updateSession: storage.updateSidakSeatbeltSession.bind(storage) },
    { name: 'rambu', getSession: storage.getSidakRambuSession.bind(storage), updateSession: storage.updateSidakRambuSession.bind(storage) },
  ];

  sidakPresignedUrlModules.forEach(({ name, getSession, updateSession }) => {
    // Request presigned URL for photo upload
    app.post(`/api/sidak-${name}/:id/request-upload-url`, async (req, res) => {
      try {
        const { id } = req.params;
        const { name: fileName, contentType } = req.body;

        const session = await getSession(id);
        if (!session) {
          return res.status(404).json({ error: `SIDAK ${name} session not found` });
        }

        const uploadURL = await objectStorageServiceInstance.getObjectEntityUploadURL();
        const objectPath = objectStorageServiceInstance.normalizeObjectEntityPath(uploadURL);

        res.json({
          uploadURL,
          objectPath,
          metadata: { name: fileName, contentType }
        });
      } catch (error) {
        console.error(`Error generating upload URL for ${name}:`, error);
        res.status(500).json({ error: "Failed to generate upload URL" });
      }
    });

    // Confirm photo upload and add to session
    app.post(`/api/sidak-${name}/:id/confirm-upload`, async (req, res) => {
      try {
        const { id } = req.params;
        const { objectPath } = req.body;

        if (!objectPath) {
          return res.status(400).json({ error: "objectPath is required" });
        }

        const session = await getSession(id);
        if (!session) {
          return res.status(404).json({ error: `SIDAK ${name} session not found` });
        }

        try {
          await objectStorageServiceInstance.trySetObjectEntityAclPolicy(objectPath, {
            owner: "system",
            visibility: "public"
          });
        } catch (aclError) {
          console.warn("Could not set ACL policy:", aclError);
        }

        const existingPhotos = session.activityPhotos || [];
        if (existingPhotos.length >= 6) {
          return res.status(400).json({ error: "Maximum 6 photos allowed" });
        }

        const allPhotos = [...existingPhotos, objectPath];
        const updatedSession = await updateSession(id, { activityPhotos: allPhotos });

        res.json({
          message: "Photo uploaded successfully",
          photos: allPhotos,
          session: updatedSession
        });
      } catch (error) {
        console.error(`Error confirming photo upload for ${name}:`, error);
        res.status(500).json({ error: "Failed to confirm photo upload" });
      }
    });

    // Delete photo from object storage
    app.delete(`/api/sidak-${name}/:id/photos/:index`, async (req, res) => {
      try {
        const session = await getSession(req.params.id);
        if (!session) return res.status(404).json({ error: "Session not found" });

        const photos = session.activityPhotos || [];
        const index = parseInt(req.params.index);
        if (index < 0 || index >= photos.length) {
          return res.status(400).json({ error: "Invalid photo index" });
        }

        const photoPath = photos[index];

        // Try to delete from object storage if it's an object storage path
        if (photoPath.startsWith('/objects/')) {
          try {
            await objectStorageServiceInstance.deleteObject(photoPath);
          } catch (deleteError) {
            console.warn(`Could not delete object ${photoPath}:`, deleteError);
          }
        }

        const updatedPhotos = photos.filter((_, i) => i !== index);
        const updatedSession = await updateSession(req.params.id, { activityPhotos: updatedPhotos });

        res.json({ photos: updatedSession?.activityPhotos || [] });
      } catch (error: any) {
        console.error(`Error deleting photo for ${name}:`, error);
        res.status(500).json({ error: "Failed to delete photo" });
      }
    });
  });

  // Serve objects from object storage
  app.get("/objects/*", async (req, res) => {
    try {
      const objectFile = await objectStorageServiceInstance.getObjectEntityFile(req.path);
      await objectStorageServiceInstance.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      console.error("Error serving object:", error);
      res.status(500).json({ error: "Failed to serve object" });
    }
  });

  // ============================================
  // SIDAK ROSTER ROUTES (PUBLIC ACCESS - NO AUTH)
  // ============================================

  // Lookup roster data for employee on specific date (for auto-fill in SIDAK Roster)
  app.get("/api/roster-lookup/:employeeId/:date", async (req, res) => {
    try {
      const { employeeId, date } = req.params;
      const { currentShift } = req.query; // Get current shift from query parameter

      // Get roster schedule for this employee on this date
      const rosterSchedule = await storage.getRosterByEmployeeAndDate(employeeId, date);

      if (!rosterSchedule) {
        // Employee not scheduled to work on this date
        return res.json({
          isScheduled: false,
          rosterSesuai: false,
          keterangan: "Tidak Terjadwal",
          nomorLambung: "",
          shift: "",
          shiftMismatch: false
        });
      }

      // Validate shift if currentShift parameter is provided
      if (currentShift) {
        const scheduledShift = rosterSchedule.shift || "";

        // Normalize shift strings for comparison (e.g., "SHIFT 1" vs "Shift 1")
        const normalizedScheduledShift = scheduledShift.toUpperCase().trim();
        const normalizedCurrentShift = currentShift.toString().toUpperCase().trim();

        if (normalizedScheduledShift !== normalizedCurrentShift) {
          // Shift mismatch - employee scheduled for different shift
          return res.json({
            isScheduled: true,
            shiftMismatch: true,
            scheduledShift: scheduledShift,
            currentShift: currentShift,
            message: `Driver terjadwal di ${scheduledShift} tetapi inspeksi dilakukan di ${currentShift}`,
            rosterSesuai: false,
            keterangan: "",
            nomorLambung: "",
            shift: scheduledShift
          });
        }
      }

      // Get "Hari Kerja Ke-X" from roster.hariKerja column
      const hariKerja = rosterSchedule.hariKerja || "1";

      res.json({
        isScheduled: true,
        rosterSesuai: true, // Employee is scheduled and shift matches
        keterangan: `Hari Kerja Ke-${hariKerja}`,
        nomorLambung: rosterSchedule.plannedNomorLambung || rosterSchedule.actualNomorLambung || "",
        shift: rosterSchedule.shift || "",
        shiftMismatch: false
      });

    } catch (error) {
      console.error("Error looking up roster:", error);
      res.status(500).json({ message: "Gagal mencari data roster" });
    }
  });

  // Create new Sidak Roster session
  app.post("/api/sidak-roster", async (req, res) => {
    try {
      const validatedData = insertSidakRosterSessionSchema.parse(req.body);

      // Get logged-in user's NIK to track who created this SIDAK
      const sessionUser = (req.session as any).user;
      const createdBy = sessionUser?.nik || null;

      const session = await storage.createSidakRosterSession({
        ...validatedData,
        createdBy
      });
      res.json(session);
    } catch (error: any) {
      console.error("Error creating Sidak Roster session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat sesi Sidak Roster" });
    }
  });

  // Get all Sidak Roster sessions (filtered by user role)
  app.get("/api/sidak-roster", async (req, res) => {
    try {
      let sessions = await storage.getAllSidakRosterSessions();

      // Filter by createdBy based on user role
      // ADMIN can see all, others only see their own
      const sessionUser = (req.session as any).user;
      if (sessionUser && sessionUser.role !== 'ADMIN') {
        sessions = sessions.filter(s => s.createdBy === sessionUser.nik);
      }

      // Add computed totalSampel (actual count from records) and observers to each session
      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakRosterRecords(session.id),
            storage.getSidakRosterObservers(session.id)
          ]);
          return {
            ...session,
            totalSampel: records.length,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Error fetching Sidak Roster sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi Sidak Roster" });
    }
  });

  // Get non-compliant (rosterSesuai = false) records for monitoring
  app.get("/api/sidak-roster-violations", async (req, res) => {
    try {
      const { month } = req.query as { month?: string };

      let sessions = await storage.getAllSidakRosterSessions();

      // Filter by month if provided (format: YYYY-MM)
      if (month) {
        sessions = sessions.filter(s => String(s.tanggal).startsWith(month));
      }

      if (sessions.length === 0) return res.json([]);

      const sessionIds = sessions.map(s => s.id);
      const allRecords = await storage.getSidakRosterRecordsBySessionIds(sessionIds);

      // Only non-compliant records
      const violations = allRecords.filter(r => r.rosterSesuai === false);

      // Join with session data
      const sessionMap = new Map(sessions.map(s => [s.id, s]));
      const result = violations.map(r => {
        const session = sessionMap.get(r.sessionId);
        return {
          id: r.id,
          sessionId: r.sessionId,
          nama: r.nama,
          nik: r.nik,
          nomorLambung: r.nomorLambung,
          keterangan: r.keterangan,
          tanggal: session?.tanggal || "",
          waktu: session?.waktu || "",
          shift: session?.shift || "",
          perusahaan: session?.perusahaan || "",
          lokasi: session?.lokasi || "",
          createdAt: r.createdAt,
        };
      });

      // Sort by tanggal desc
      result.sort((a, b) => b.tanggal.localeCompare(a.tanggal));

      res.json(result);
    } catch (error) {
      console.error("Error fetching roster violations:", error);
      res.status(500).json({ message: "Gagal mengambil data pelanggaran roster" });
    }
  });

  // Get single Sidak Roster session with records and observers
  app.get("/api/sidak-roster/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const [session, records, observers] = await Promise.all([
        storage.getSidakRosterSession(id),
        storage.getSidakRosterRecords(id),
        storage.getSidakRosterObservers(id)
      ]);

      if (!session) {
        return res.status(404).json({ message: "Sesi Sidak Roster tidak ditemukan" });
      }

      res.json({
        ...session,
        records,
        observers
      });
    } catch (error) {
      console.error("Error fetching Sidak Roster session:", error);
      res.status(500).json({ message: "Gagal mengambil detail sesi Sidak Roster" });
    }
  });

  // Add employee record to Sidak Roster session
  app.post("/api/sidak-roster/:id/records", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakRosterRecordSchema.parse({
        ...req.body,
        sessionId: id
      });

      const record = await storage.createSidakRosterRecord(validatedData);

      // Update session sample count
      await storage.updateSidakRosterSessionSampleCount(id);

      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Roster record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      // Check for max limit error
      if (error.message?.includes('Maksimal 15 karyawan')) {
        return res.status(422).json({ message: error.message });
      }
      res.status(500).json({ message: "Gagal menambahkan data karyawan. Details: " + (error?.message || String(error)) });
    }
  });

  // Add observer to Sidak Roster session
  app.post("/api/sidak-roster/:id/observers", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = insertSidakRosterObserverSchema.parse({
        ...req.body,
        sessionId: id
      });

      const observer = await storage.createSidakRosterObserver(validatedData);
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Roster observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // Upload activity photos for Sidak Roster session (max 6 photos)
  const sidakRosterPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  });

  app.post("/api/sidak-roster/:id/upload-photos", sidakRosterPhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }

      const session = await storage.getSidakRosterSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Roster session not found" });
      }

      const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const existingPhotos = session.activityPhotos || [];
      const allPhotos = [...existingPhotos, ...photoPaths].slice(0, 6);

      // Update session with photos
      const updatedSession = await storage.updateSidakRosterSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photos uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error uploading SIDAK Roster photos:", error);
      res.status(500).json({ error: "Failed to upload photos" });
    }
  });

  // Delete a specific photo from Sidak Roster session
  app.delete("/api/sidak-roster/:id/photos/:photoIndex", async (req, res) => {
    try {
      const { id, photoIndex } = req.params;
      const index = parseInt(photoIndex);

      const session = await storage.getSidakRosterSession(id);
      if (!session) {
        return res.status(404).json({ error: "SIDAK Roster session not found" });
      }

      const photos = session.activityPhotos || [];
      if (index < 0 || index >= photos.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      // Delete physical file - extract basename to build correct path
      const photoPath = photos[index];
      const fileName = path.basename(photoPath);
      const filePath = path.join(process.cwd(), 'uploads', 'sidak-roster', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Remove from array
      const updatedPhotos = photos.filter((_, i) => i !== index);

      // Update session
      const updatedSession = await storage.updateSidakRosterSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({
        message: "Photo deleted successfully",
        photos: updatedPhotos,
        session: updatedSession
      });
    } catch (error) {
      console.error("Error deleting SIDAK Roster photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  // Delete Sidak Roster session (cascades to records & observers)
  app.delete("/api/sidak-roster/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSidakRosterSession(id);

      if (!deleted) {
        return res.status(404).json({ message: "Sesi Sidak Roster tidak ditemukan" });
      }

      res.json({ message: "Sesi Sidak Roster berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting Sidak Roster session:", error);
      res.status(500).json({ message: "Gagal menghapus sesi Sidak Roster" });
    }
  });



  // ============================================
  // SIDAK KECEPATAN ROUTES
  // ============================================

  // Create new session

  // Get all sessions

  // Get session details

  // Add record
  app.post("/api/sidak-kecepatan/:sessionId/records", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`[SidakKecepatan] Adding record to session ${sessionId}:`, req.body);
      const existingRecords = await storage.getSidakKecepatanRecords(sessionId);
      const ordinal = existingRecords.length + 1;

      const payload = { ...req.body, sessionId, ordinal };
      console.log(`[SidakKecepatan] Validating payload for ordinal ${ordinal}:`, payload);

      const validatedData = insertSidakKecepatanRecordSchema.parse(payload);
      const record = await storage.createSidakKecepatanRecord(validatedData);
      console.log(`[SidakKecepatan] Record saved:`, record);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_KECEPATAN",
        referenceId: record.id,
        sessionId: sessionId,
        inspectionResults: record.inspectionResults,
        tindakLanjut: record.tindakLanjutPerbaikan,
        dueDate: record.dueDate,
        moduleLabel: "Sidak Kecepatan"
      });

      res.json(record);
    } catch (error: any) {
      console.error("[SidakKecepatan] Error adding record:", error);
      if (error.name === 'ZodError') {
        console.error("[SidakKecepatan] Zod Validation Errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Data record tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan record: " + error.message });
    }
  });

  // Add observer
  app.post("/api/sidak-kecepatan/:sessionId/observers", async (req, res) => {
    try {
      const { sessionId } = req.params;
      console.log(`[SidakKecepatan] Adding observer to session ${sessionId}:`, req.body);
      const existingObservers = await storage.getSidakKecepatanObservers(sessionId);
      const ordinal = existingObservers.length + 1;

      const payload = { ...req.body, sessionId, ordinal };
      const validatedData = insertSidakKecepatanObserverSchema.parse(payload);
      const observer = await storage.createSidakKecepatanObserver(validatedData);
      console.log(`[SidakKecepatan] Observer saved:`, observer);
      res.json(observer);
    } catch (error: any) {
      console.error("[SidakKecepatan] Error adding observer:", error);
      if (error.name === 'ZodError') {
        console.error("[SidakKecepatan] Zod Validation Errors:", JSON.stringify(error.errors, null, 2));
        return res.status(400).json({ message: "Data observer tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer: " + error.message });
    }
  });

  // Generate PDF

  // Request Upload URL for Activity Photos
  app.post("/api/sidak-kecepatan/:id/request-upload-url", async (req, res) => {
    try {
      const { id } = req.params;
      const { name, contentType } = req.body;
      const session = await storage.getSidakKecepatanSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const uploadURL = await objectStorageServiceInstance.getObjectEntityUploadURL();
      const objectPath = objectStorageServiceInstance.normalizeObjectEntityPath(uploadURL);
      res.json({ uploadURL, objectPath, metadata: { name, contentType } });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Confirm Upload
  app.post("/api/sidak-kecepatan/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body;
      if (!objectPath) return res.status(400).json({ error: "objectPath required" });

      const session = await storage.getSidakKecepatanSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      try {
        await objectStorageServiceInstance.trySetObjectEntityAclPolicy(objectPath, { owner: "system", visibility: "public" });
      } catch (e) { }

      const existing = session.activityPhotos || [];
      if (existing.length >= 6) return res.status(400).json({ error: "Max 6 photos" });
      const allPhotos = [...existing, objectPath];
      const updated = await storage.updateSidakKecepatanSession(id, { activityPhotos: allPhotos });
      res.json({ message: "Uploaded", photos: allPhotos, session: updated });
    } catch (e) {
      res.status(500).json({ error: "Failed to confirm upload" });
    }
  });

  // ==================== ANNOUNCEMENT SYSTEM API ====================

  // Get all announcements (admin)
  app.get("/api/announcements", async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman" });
    }
  });

  // Get active announcements (for drivers)
  app.get("/api/announcements/active", async (req, res) => {
    try {
      const announcements = await storage.getActiveAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching active announcements:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman aktif" });
    }
  });

  // Get active announcements with read status for a specific employee
  app.get("/api/announcements/active-with-status/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const announcements = await storage.getActiveAnnouncements();

      // Check read status for each announcement
      const announcementsWithStatus = await Promise.all(
        announcements.map(async (announcement) => {
          const isRead = await storage.hasReadAnnouncement(announcement.id, employeeId);
          return {
            ...announcement,
            isRead
          };
        })
      );

      res.json(announcementsWithStatus);
    } catch (error) {
      console.error("Error fetching active announcements with status:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman aktif" });
    }
  });

  // Get unread count for employee
  app.get("/api/announcements/unread-count/:employeeId", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const count = await storage.getUnreadAnnouncementsCount(employeeId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ message: "Gagal mengambil jumlah belum dibaca" });
    }
  });

  // Get single announcement
  app.get("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.getAnnouncement(id);

      if (!announcement) {
        return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
      }

      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Gagal mengambil pengumuman" });
    }
  });

  // Create announcement (admin only)
  app.post("/api/announcements", async (req, res) => {
    try {
      const validatedData = insertAnnouncementSchema.parse(req.body);
      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error: any) {
      console.error("Error creating announcement:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal membuat pengumuman" });
    }
  });

  // Update announcement (admin only)
  app.patch("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const announcement = await storage.updateAnnouncement(id, req.body);

      if (!announcement) {
        return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
      }

      res.json(announcement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.status(500).json({ message: "Gagal mengupdate pengumuman" });
    }
  });

  // Delete announcement (admin only)
  app.delete("/api/announcements/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteAnnouncement(id);

      if (!deleted) {
        return res.status(404).json({ message: "Pengumuman tidak ditemukan" });
      }

      res.json({ message: "Pengumuman berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Gagal menghapus pengumuman" });
    }
  });

  // Upload announcement image
  const announcementImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) { return cb(null, true); }
      cb(new Error('Only .png, .jpg, .jpeg and .gif format allowed!'));
    }
  });

  app.post("/api/announcements/upload-image", announcementImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diupload" });
      }
      const { url: imageUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: imageUrl, fileName: req.file.originalname });
    } catch (error) {
      console.error("Error uploading announcement image:", error);
      res.status(500).json({ message: "Gagal mengupload gambar" });
    }
  });

  // Get read statistics for an announcement
  app.get("/api/announcements/:id/reads", async (req, res) => {
    try {
      const { id } = req.params;
      const reads = await storage.getAnnouncementReads(id);
      res.json(reads);
    } catch (error) {
      console.error("Error fetching announcement reads:", error);
      res.status(500).json({ message: "Gagal mengambil data pembaca" });
    }
  });

  // Mark announcement as read
  app.post("/api/announcements/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const { employeeId, employeeName } = req.body;

      if (!employeeId || !employeeName) {
        return res.status(400).json({ message: "employeeId dan employeeName diperlukan" });
      }

      const read = await storage.markAnnouncementAsRead(id, employeeId, employeeName);
      res.json(read);
    } catch (error) {
      console.error("Error marking announcement as read:", error);
      res.status(500).json({ message: "Gagal mencatat pengumuman dibaca" });
    }
  });

  // Check if employee has read an announcement
  app.get("/api/announcements/:id/has-read/:employeeId", async (req, res) => {
    try {
      const { id, employeeId } = req.params;
      const hasRead = await storage.hasReadAnnouncement(id, employeeId);
      res.json({ hasRead });
    } catch (error) {
      console.error("Error checking read status:", error);
      res.status(500).json({ message: "Gagal memeriksa status baca" });
    }
  });

  // =====================================================
  // DOCUMENT MANAGEMENT ROUTES
  // =====================================================

  // Configure multer for PDF document uploads
  const documentUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') { cb(null, true); } else { cb(null, false); }
    },
    limits: { fileSize: 50 * 1024 * 1024 }
  });

  // Get all documents
  app.get("/api/documents", async (req, res) => {
    try {
      const docs = await storage.getAllDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Gagal mengambil data dokumen" });
    }
  });

  // ============================================
  // USIGN DIGITAL SIGNATURE ROUTES
  // ============================================

  // Upload USign Document
  app.post("/api/usign/upload", documentUpload.single('file'), async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      if (!req.file) return res.status(400).json({ message: "File PDF diperlukan" });
      const { title, subject, ccEmails } = req.body;

      let parsedCc: string[] = [];
      try { parsedCc = ccEmails ? JSON.parse(ccEmails) : []; } catch { parsedCc = []; }

      const doc = await storage.createUsignDocument({
        title,
        subject,
        ownerId: u.nik, // selalu dari session, abaikan body
        fileUrl: (await dbStorage.uploadFile(req.file)).url,
        status: "pending",
        ccEmails: parsedCc
      });

      console.log("📄 USign Document Created:", JSON.stringify(doc));
      res.status(201).json(doc);
    } catch (error) {
      console.error("USign upload error:", error);
      res.status(500).json({ message: "Gagal upload dokumen USign" });
    }
  });

  // Add Approval Steps
  app.post("/api/usign/documents/:id/steps", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      const steps = req.body; // Array of steps

      const ownerDoc = await storage.getUsignDocument(id);
      if (!ownerDoc) return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      if (ownerDoc.ownerId !== u.nik) return res.status(403).json({ message: "Bukan dokumen Anda" });
      // Anti self-approval: pemilik tidak boleh jadi approver
      if (steps.some((s: any) => s.approverId === ownerDoc.ownerId)) {
        return res.status(400).json({ message: "Pemilik dokumen tidak boleh menjadi approver (self-approval)." });
      }

      for (const step of steps) {
        await storage.addUsignApprovalStep({
          documentId: id,
          approverId: step.approverId,
          stepOrder: step.stepOrder,
          actionType: step.actionType, // signature, initial, stamp
          status: "pending",
          pageNumber: step.pageNumber || 1,
          posX: step.posX || 0,
          posY: step.posY || 0,
          width: step.width || 100,
          height: step.height || 50
        });
      }

      res.json({ message: "Approval steps added" });
    } catch (error) {
      console.error("USign steps error:", error);
      res.status(500).json({ message: "Gagal menambah tahapan persetujuan" });
    }
  });

  // Start Approval Flow
  app.post("/api/usign/documents/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const steps = await storage.getUsignApprovalSteps(id);
      if (steps.length === 0) return res.status(400).json({ message: "Belum ada approver" });

      const document = await storage.getUsignDocument(id);
      if (!document) return res.status(404).json({ message: "Dokumen tidak ditemukan" });

      // Find all steps for stepOrder 1
      const firstOrder = steps[0].stepOrder;
      const firstSteps = steps.filter(s => s.stepOrder === firstOrder);

      // Set ALL first steps to 'current'
      await Promise.all(firstSteps.map(s =>
        storage.updateUsignApprovalStepStatus(s.id, "current")
      ));

      // Notify first approver (only need to notify once)
      await usignNotificationService.notifyNextApprover(document, firstSteps[0]);

      res.json({ message: "Approval flow started" });
    } catch (error) {
      console.error("USign start error:", error);
      res.status(500).json({ message: "Gagal memulai proses persetujuan" });
    }
  });

  // Approve / Sign Document
  app.post("/api/usign/steps/:id/approve", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      const { signatureImageUrl, remarks } = req.body;

      const step = await storage.getUsignApprovalStepById(id);
      if (!step) return res.status(404).json({ message: "Tahapan tidak ditemukan" });
      if (step.approverId !== u.nik) return res.status(403).json({ message: "Anda bukan approver untuk tahapan ini" });
      if (step.status !== "current") return res.status(400).json({ message: "Bukan giliran Anda atau tahapan sudah diproses" });

      if (signatureImageUrl) {
        await storage.createUsignSignature({
          stepId: id,
          signatureImageUrl
        });
      }

      const updatedStep = await storage.updateUsignApprovalStepStatus(id, "completed", remarks);

      if (updatedStep) {
        const document = await storage.getUsignDocument(updatedStep.documentId);
        if (document) {
          const allSteps = await storage.getUsignApprovalSteps(document.id);
          const currentOrderSteps = allSteps.filter(s => s.stepOrder === updatedStep.stepOrder);
          const isCurrentOrderCompleted = currentOrderSteps.every(s => s.status === "completed");

          if (document.status === "completed" && isCurrentOrderCompleted) {
            // Document fully approved
            await usignNotificationService.notifyStatusUpdate(document, "approved", remarks);
          } else if (isCurrentOrderCompleted) {
            // Notify next approver ONLY when the entire order is finished
            const nextStep = allSteps.find(s => s.status === "current");
            if (nextStep) {
              await usignNotificationService.notifyNextApprover(document, nextStep);
            }
          }
        }
      }

      res.json(updatedStep);
    } catch (error) {
      console.error("USign approve error:", error);
      res.status(500).json({ message: "Gagal menyetujui dokumen" });
    }
  });

  // Reject Document
  app.post("/api/usign/steps/:id/reject", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      const { remarks } = req.body;

      const step = await storage.getUsignApprovalStepById(id);
      if (!step) return res.status(404).json({ message: "Tahapan tidak ditemukan" });
      if (step.approverId !== u.nik) return res.status(403).json({ message: "Anda bukan approver untuk tahapan ini" });
      if (step.status !== "current") return res.status(400).json({ message: "Bukan giliran Anda atau tahapan sudah diproses" });

      const updatedStep = await storage.updateUsignApprovalStepStatus(id, "rejected", remarks);

      if (updatedStep) {
        const document = await storage.getUsignDocument(updatedStep.documentId);
        if (document) {
          await usignNotificationService.notifyStatusUpdate(document, "rejected", remarks);
        }
      }

      res.json(updatedStep);
    } catch (error) {
      console.error("USign reject error:", error);
      res.status(500).json({ message: "Gagal menolak dokumen" });
    }
  });

  // Void Document (by owner)
  app.post("/api/usign/documents/:id/void", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      const { reason } = req.body;

      const target = await storage.getUsignDocument(id);
      if (!target) return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      if (target.ownerId !== u.nik) return res.status(403).json({ message: "Hanya pemilik yang dapat membatalkan dokumen" });

      const doc = await storage.voidUsignDocument(id, reason);

      if (doc) {
        await usignNotificationService.notifyStatusUpdate(doc, "void", reason);
      }

      res.json(doc);
    } catch (error) {
      console.error("USign void error:", error);
      res.status(500).json({ message: "Gagal membatalkan dokumen" });
    }
  });

  // Get My Documents (Owned)
  app.get("/api/usign/my-requests", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const docs = await storage.getUsignDocumentsByOwner(u.nik); // dari session, abaikan query
      res.json(docs);
    } catch (error) {
      console.error("USign my-requests error:", error);
      res.status(500).json({ message: "Gagal mengambil dokumen saya" });
    }
  });

  // Get My Approvals (Pending/Signed)
  app.get("/api/usign/my-approvals", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const approvals = await storage.getUsignApprovalsByUser(u.nik);
      res.json(approvals);
    } catch (error) {
      console.error("USign my-approvals error:", error);
      res.status(500).json({ message: "Gagal mengambil daftar persetujuan" });
    }
  });

  // USign Stats
  app.get("/api/usign/stats", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const myApprovals = await storage.getUsignApprovalsByUser(u.nik);
      const pendingCount = myApprovals.filter(a => a.status === "current").length;

      const myRequests = await storage.getUsignDocumentsByOwner(u.nik);
      const approvedCount = myRequests.filter(d => d.status === "completed").length;

      // Rata-rata waktu approval (jam) dari step yang sudah direspon
      const responded = myApprovals.filter((a: any) => a.respondedAt && a.createdAt);
      const avgResponseTime = responded.length > 0
        ? Math.round((responded.reduce((sum: number, a: any) =>
            sum + (new Date(a.respondedAt).getTime() - new Date(a.createdAt).getTime()), 0)
            / responded.length / 3600000) * 10) / 10
        : 0;

      res.json({
        pendingCount,
        approvedCount,
        avgResponseTime
      });
    } catch (error) {
      console.error("USign stats error:", error);
      res.status(500).json({ message: "Gagal mengambil statistik USign" });
    }
  });

  // Get active documents only
  app.get("/api/usign/documents/active", async (req, res) => {
    try {
      const docs = await storage.getActiveDocuments();
      res.json(docs);
    } catch (error) {
      console.error("USign active docs error:", error);
      res.status(500).json({ message: "Gagal mengambil dokumen aktif" });
    }
  });

  // Get Document by ID
  app.get("/api/usign/documents/:id", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      const doc = await storage.getUsignDocument(id);
      if (!doc) return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      const dSteps = await storage.getUsignApprovalSteps(id);
      const canView = doc.ownerId === u.nik || dSteps.some((s: any) => s.approverId === u.nik);
      if (!canView) return res.status(403).json({ message: "Tidak punya akses ke dokumen ini" });
      res.json(doc);
    } catch (error) {
      console.error("USign get document error:", error);
      res.status(500).json({ message: "Gagal mengambil detail dokumen" });
    }
  });

  // Get Approval Steps by Document ID
  app.get("/api/usign/documents/:id/steps", async (req, res) => {
    try {
      const { id } = req.params;
      const steps = await storage.getUsignApprovalSteps(id);
      res.json(steps);
    } catch (error) {
      console.error("USign get steps error:", error);
      res.status(500).json({ message: "Gagal mengambil tahapan persetujuan" });
    }
  });

  // Download Signed USign Document
  app.get("/api/usign/documents/:id/download", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { id } = req.params;
      console.log(`[USign Download] Triggered for ID: ${id}`);
      const document = await storage.getUsignDocument(id);
      if (!document) return res.status(404).json({ message: "Dokumen tidak ditemukan" });

      const steps = await storage.getUsignApprovalSteps(id);
      const canView = document.ownerId === u.nik || steps.some((s: any) => s.approverId === u.nik);
      if (!canView) return res.status(403).json({ message: "Tidak punya akses ke dokumen ini" });

      const signatureData: any[] = [];

      for (const step of steps) {
        if (step.status === "completed") {
          const signatures = await storage.getUsignSignatures(step.id);
          if (signatures.length > 0) {
            signatureData.push({
              signatureImageUrl: signatures[0].signatureImageUrl,
              pageNumber: step.pageNumber,
              posX: step.posX,
              posY: step.posY,
              width: step.width,
              height: step.height
            });
          }
        }
      }

      const { usignPdfService } = await import('./services/usign-pdf-service');
      // File asli tersimpan di DB (fileUrl = /api/uploads/<id>), bukan filesystem
      const fileId = (document.fileUrl || "").split('/').pop() || "";
      const original = fileId ? await dbStorage.getFile(fileId) : null;
      if (!original) {
        return res.status(404).json({ message: "File asli tidak ditemukan" });
      }

      console.log(`[USign Download] Starting PDF merge for ${signatureData.length} signatures`);
      const mergedPdfBytes = await usignPdfService.mergeSignaturesToPdf(original.data, signatureData);
      console.log(`[USign Download] Merge finished. Bytes: ${mergedPdfBytes?.length}`);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', mergedPdfBytes.length);
      res.setHeader('Content-Disposition', `attachment; filename="signed_${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`);
      res.status(200).send(Buffer.from(mergedPdfBytes));
    } catch (error) {
      console.error("USign download error:", error);
      res.status(500).json({ message: "Gagal mengunduh dokumen" });
    }
  });

  // Get documents by category
  app.get("/api/documents/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const docs = await storage.getDocumentsByCategory(decodeURIComponent(category));
      res.json(docs);
    } catch (error) {
      console.error("Error fetching documents by category:", error);
      res.status(500).json({ message: "Gagal mengambil data dokumen per kategori" });
    }
  });

  // Get single document
  app.get("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await storage.getDocument(id);
      if (!doc) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Gagal mengambil data dokumen" });
    }
  });

  // Upload and create document (Admin only)
  app.post("/api/documents", documentUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "File PDF diperlukan" });
      }

      const { title, category, uploadedBy, uploadedByName } = req.body;

      if (!title || !category || !uploadedBy || !uploadedByName) {
        // Delete uploaded file if validation fails
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "Title, category, uploadedBy, dan uploadedByName diperlukan" });
      }

      const doc = await storage.createDocument({
        title,
        category,
        fileName: req.file.originalname,
        filePath: `/uploads/documents/${req.file.filename}`,
        fileSize: req.file.size,
        uploadedBy,
        uploadedByName,
        isActive: true
      });

      res.status(201).json(doc);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Gagal membuat dokumen" });
    }
  });

  // Update document metadata
  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const doc = await storage.updateDocument(id, updateData);
      if (!doc) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }
      res.json(doc);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Gagal memperbarui dokumen" });
    }
  });

  // Delete document (Admin only)
  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Get document first to delete the file
      const doc = await storage.getDocument(id);
      if (doc && doc.filePath) {
        const fullPath = path.join(process.cwd(), doc.filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      const deleted = await storage.deleteDocument(id);
      if (!deleted) {
        return res.status(404).json({ message: "Dokumen tidak ditemukan" });
      }
      res.json({ message: "Dokumen berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Gagal menghapus dokumen" });
    }
  });

  // Serve uploaded documents
  app.use('/uploads/documents', express.static(path.join(process.cwd(), 'uploads', 'documents')));
  app.use('/uploads/news', express.static(path.join(process.cwd(), 'uploads', 'news')));

  // ================== NEWS API ==================

  // Upload news image
  const newsImageUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) { return cb(null, true); }
      cb(new Error('Only .png, .jpg, .jpeg and .gif format allowed!'));
    }
  });

  app.post("/api/news/upload-image", newsImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diupload" });
      }
      const { url: imageUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: imageUrl, fileName: req.file.originalname });
    } catch (error) {
      console.error("Error uploading news image:", error);
      res.status(500).json({ message: "Gagal mengupload gambar" });
    }
  });

  // Get all news (for admin)
  app.get("/api/news", async (req, res) => {
    try {
      const allNews = await storage.getAllNews();
      res.json(allNews);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Gagal mengambil berita" });
    }
  });

  // Get active news (for all users)
  app.get("/api/news/active", async (req, res) => {
    try {
      const activeNews = await storage.getActiveNews();
      res.json(activeNews);
    } catch (error) {
      console.error("Error fetching active news:", error);
      res.status(500).json({ message: "Gagal mengambil berita aktif" });
    }
  });

  // Get single news
  // Generic File Upload (for Certificates, etc.)
  const certificateUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
      if (allowedTypes.test(path.extname(file.originalname).toLowerCase())) { return cb(null, true); }
      cb(new Error('Only PDF, Word, and Images are allowed!'));
    }
  });

  app.post("/api/upload", certificateUpload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      // Reject empty / suspiciously tiny payloads (e.g. selfie capture sebelum
      // video stream ready). 100 bytes adalah ambang aman untuk image apapun.
      if (!req.file.buffer || req.file.buffer.length < 100) {
        return res.status(400).json({ message: "File kosong atau terlalu kecil (kemungkinan capture gagal)" });
      }
      const { url: fileUrl } = await dbStorage.uploadFile(req.file);
      res.json({ url: fileUrl, fileName: req.file.originalname });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const newsItem = await storage.getNews(id);
      if (!newsItem) {
        return res.status(404).json({ message: "Berita tidak ditemukan" });
      }
      res.json(newsItem);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Gagal mengambil berita" });
    }
  });

  // Create news (Admin only)
  app.post("/api/news", async (req, res) => {
    try {
      const validatedData = insertNewsSchema.parse(req.body);
      const newsItem = await storage.createNews(validatedData);

      // Send push notification for important news
      if (validatedData.isImportant) {
        try {
          const subscriptions = await storage.getActivePushSubscriptions();
          const pushService = new PushNotificationService();

          for (const sub of subscriptions) {
            try {
              await pushService.sendNotification(
                {
                  endpoint: sub.endpoint,
                  keys: { p256dh: sub.p256dh, auth: sub.auth }
                },
                {
                  title: "Berita Penting",
                  body: validatedData.title,
                  icon: "/icons/icon-192x192.png",
                  badge: "/icons/icon-72x72.png",
                  data: { url: "/workspace/news-feed", newsId: newsItem.id }
                }
              );
            } catch (pushError) {
              console.error("Error sending push to subscription:", sub.id, pushError);
            }
          }
        } catch (pushError) {
          console.error("Error sending news push notifications:", pushError);
        }
      }

      res.status(201).json(newsItem);
    } catch (error) {
      console.error("Error creating news:", error);
      res.status(500).json({ message: "Gagal membuat berita" });
    }
  });

  // Update news (Admin only)
  app.patch("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const newsItem = await storage.updateNews(id, updateData);
      if (!newsItem) {
        return res.status(404).json({ message: "Berita tidak ditemukan" });
      }
      res.json(newsItem);
    } catch (error) {
      console.error("Error updating news:", error);
      res.status(500).json({ message: "Gagal memperbarui berita" });
    }
  });

  // Delete news (Admin only)
  app.delete("/api/news/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteNews(id);
      if (!deleted) {
        return res.status(404).json({ message: "Berita tidak ditemukan" });
      }
      res.json({ message: "Berita berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting news:", error);
      res.status(500).json({ message: "Gagal menghapus berita" });
    }
  });

  // ================== PUSH SUBSCRIPTION API ==================

  // Get VAPID public key
  app.get("/api/push/vapid-public-key", async (req, res) => {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY;
      if (!publicKey) {
        return res.status(500).json({ message: "VAPID public key not configured" });
      }
      res.json({ publicKey });
    } catch (error) {
      console.error("Error getting VAPID public key:", error);
      res.status(500).json({ message: "Gagal mengambil VAPID public key" });
    }
  });

  // Subscribe to push notifications
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { employeeId, subscription } = req.body;

      if (!employeeId || !subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Data subscription tidak lengkap" });
      }

      // Check if subscription already exists
      const existingSubscriptions = await storage.getPushSubscriptionsByEmployee(employeeId);
      const existingSub = existingSubscriptions.find(s => s.endpoint === subscription.endpoint);

      if (existingSub) {
        // Update existing subscription
        const updated = await storage.updatePushSubscription(existingSub.id, {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          isActive: true
        });
        return res.json({ message: "Subscription updated", subscription: updated });
      }

      // Create new subscription
      const newSubscription = await storage.createPushSubscription({
        employeeId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        isActive: true
      });

      res.status(201).json({ message: "Subscribed successfully", subscription: newSubscription });
    } catch (error) {
      console.error("Error subscribing to push:", error);
      res.status(500).json({ message: "Gagal subscribe push notification" });
    }
  });

  // Unsubscribe from push notifications
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint diperlukan" });
      }

      const deleted = await storage.deletePushSubscriptionByEndpoint(endpoint);
      if (!deleted) {
        return res.status(404).json({ message: "Subscription tidak ditemukan" });
      }

      res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error unsubscribing from push:", error);
      res.status(500).json({ message: "Gagal unsubscribe push notification" });
    }
  });

  // Test push notification (Admin only)
  app.post("/api/push/test", async (req, res) => {
    try {
      const { employeeId, title, body } = req.body;

      if (!employeeId) {
        return res.status(400).json({ message: "Employee ID diperlukan" });
      }

      const subscriptions = await storage.getPushSubscriptionsByEmployee(employeeId);
      if (subscriptions.length === 0) {
        return res.status(404).json({ message: "Tidak ada subscription untuk employee ini" });
      }

      const pushService = new PushNotificationService();
      let successCount = 0;
      let failCount = 0;

      for (const sub of subscriptions) {
        try {
          await pushService.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            {
              title: title || "Test Notification",
              body: body || "Ini adalah test push notification",
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              data: { url: "/" }
            }
          );
          successCount++;
        } catch (pushError) {
          console.error("Error sending test push:", pushError);
          failCount++;
        }
      }

      res.json({
        message: `Push notification sent`,
        success: successCount,
        failed: failCount
      });
    } catch (error) {
      console.error("Error sending test push:", error);
      res.status(500).json({ message: "Gagal mengirim test push notification" });
    }
  });

  // Send push to all subscribed users (Admin only)
  app.post("/api/push/broadcast", async (req, res) => {
    try {
      const { title, body, url } = req.body;

      if (!title || !body) {
        return res.status(400).json({ message: "Title dan body diperlukan" });
      }

      const subscriptions = await storage.getActivePushSubscriptions();
      if (subscriptions.length === 0) {
        return res.status(404).json({ message: "Tidak ada subscriber aktif" });
      }

      const pushService = new PushNotificationService();
      let successCount = 0;
      let failCount = 0;

      for (const sub of subscriptions) {
        try {
          await pushService.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth }
            },
            {
              title,
              body,
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
              data: { url: url || "/" }
            }
          );
          successCount++;
        } catch (pushError) {
          console.error("Error sending broadcast push:", pushError);
          failCount++;

          // Deactivate failed subscriptions
          if (sub.id) {
            try {
              await storage.updatePushSubscription(sub.id, { isActive: false });
            } catch (updateError) {
              console.error("Error deactivating subscription:", updateError);
            }
          }
        }
      }

      res.json({
        message: `Broadcast sent to ${subscriptions.length} subscribers`,
        success: successCount,
        failed: failCount
      });
    } catch (error) {
      console.error("Error broadcasting push:", error);
      res.status(500).json({ message: "Gagal mengirim broadcast push notification" });
    }
  });

  // ============================================
  // WHATSAPP WEBHOOK (Safety Patrol Integration)
  // ============================================

  // Import Gemini parser dynamically
  const { parseReportWithGemini, analyzeReportContent, parseMCUWithGemini, isLikelyPatrolReport, isValidParsedReport } = await import("./gemini-parser");


  // ==========================================
  // SICK LEAVE API
  // ==========================================

  app.get("/api/hse/sick-leaves", async (req, res) => {
    try {
      const result = await storage.getSickLeaves();
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sick leaves" });
    }
  });

  app.delete("/api/hse/sick-leaves/:id", async (req, res) => {
    try {
      const success = await storage.deleteSickLeave(req.params.id);
      if (success) {
        res.json({ message: "Deleted successfully" });
      } else {
        res.status(404).json({ message: "Not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to delete" });
    }
  });

  app.get("/api/hse/sick-leaves/stats", async (req, res) => {
    try {
      const leaves = await storage.getSickLeaves();
      const stats = {
        total: leaves.length,
        pending: leaves.filter(l => l.status === "Pending").length,
        approved: leaves.filter(l => l.status === "Approved").length,
        rejected: leaves.filter(l => l.status === "Rejected").length,
        thisMonth: leaves.filter(l => {
          const d = new Date(l.date);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length
      };
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Seed endpoint for inserting dummy sick leave data
  app.post("/api/hse/sick-leaves/seed", async (req, res) => {
    try {
      const { name, nik, position, employeeId, date, reason, status, attachmentUrl, attachmentType, aiConfidence, originalMessage, aiAnalysis } = req.body;
      if (!name || !date) {
        return res.status(400).json({ message: "name and date are required" });
      }
      const result = await storage.createSickLeave({
        name,
        nik: nik || null,
        position: position || null,
        employeeId: employeeId || null,
        date,
        reason: reason || null,
        status: status || "Pending",
        attachmentUrl: attachmentUrl || null,
        attachmentType: attachmentType || null,
        aiConfidence: aiConfidence || null,
        originalMessage: originalMessage || null,
        aiAnalysis: aiAnalysis || null,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("Seed sick leave error:", error);
      res.status(500).json({ message: "Failed to seed sick leave" });
    }
  });

  // WhatsApp Webhook from notif.my.id
  // Webhook Telegram (produksi) — terima update lalu proses async (reuse pemroses bot)
  app.post("/api/webhook/telegram", (req, res) => {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (secret && req.header("x-telegram-bot-api-secret-token") !== secret) {
      return res.sendStatus(401);
    }
    // Balas cepat agar Telegram tidak timeout; proses di belakang.
    res.sendStatus(200);
    const update = req.body;
    import("./services/telegram-bot")
      .then((m) => m.processTelegramUpdate(update))
      .catch((e) => console.error("[TelegramWebhook] process error:", e?.message || e));
  });

  app.post("/api/webhook/whatsapp", async (req, res) => {
    try {
      console.log("📱 WhatsApp webhook received:", JSON.stringify(req.body, null, 2));

      const payload = req.body;

      // Extract message data from notif.my.id format
      // notif.my.id uses: type="conversation", mtype="text" for text messages
      // For images: mtype="image", urlmedia contains the image URL
      const senderPhone = payload.from || payload.sender || payload.phone || "";
      const senderName = payload.pushName || payload.name || payload.senderName || "";
      const messageType = payload.mtype || payload.type || payload.messageType || "text";
      const messageContent = payload.body || payload.message || payload.text || payload.content || payload.caption || "";
      const messageId = payload.id || payload.messageId || "";

      // Extract media URL from various possible fields (notif.my.id format)
      // Can be direct URL or nested in image/media object
      let mediaUrl = "";
      if (payload.urlmedia) mediaUrl = payload.urlmedia;
      else if (payload.mediaUrl) mediaUrl = payload.mediaUrl;
      else if (payload.media) mediaUrl = typeof payload.media === 'string' ? payload.media : payload.media?.url || "";
      else if (payload.imageUrl) mediaUrl = payload.imageUrl;
      else if (payload.image?.url) mediaUrl = payload.image.url;
      else if (payload.file?.url) mediaUrl = payload.file.url;
      else if (payload.document?.url) mediaUrl = payload.document.url;

      console.log("📷 Media URL extracted:", mediaUrl || "(none)");

      // [Safety Patrol Fix] Download media to database storage to prevent expiry
      if (mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('https'))) {
        try {
          console.log(`[SafetyPatrol] Downloading media from: ${mediaUrl}`);

          // Download media with headers to improve success rate
          const response = await fetch(mediaUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SafetyPatrol/1.0)',
              'Accept': 'image/*,*/*;q=0.8',
            },
            signal: AbortSignal.timeout(15000),
          });
          if (response.ok) {
            const buffer = Buffer.from(await response.arrayBuffer());

            // Extract filename and MIME type
            const ext = path.extname(new URL(mediaUrl).pathname) || '.jpg';
            const filename = `sp-${Date.now()}-${Math.round(Math.random() * 1000)}${ext}`;
            const mimeType = response.headers.get('content-type') || 'image/jpeg';

            // Create mock multer file object
            const mockFile = {
              buffer: buffer,
              originalname: filename,
              mimetype: mimeType,
            } as Express.Multer.File;

            // Upload to database
            const result = await dbStorage.uploadFile(mockFile);

            // Update variable to point to database URL
            mediaUrl = result.url;
            console.log(`[SafetyPatrol] Media saved to database: ${mediaUrl}`);
          } else {
            console.warn(`[SafetyPatrol] Failed to download media: ${response.status} ${response.statusText}`);
          }
        } catch (error) {
          console.error("[SafetyPatrol] Error downloading/storing media:", error);
          // Keep original URL as fallback
        }
      }

      console.log("📝 Parsed message - type:", messageType, "content length:", messageContent?.length);

      // Extract WhatsApp message timestamp (unixTimestamp from notif.my.id)
      const unixTimestamp = payload.unixTimestamp;
      const messageTimestamp = unixTimestamp ? new Date(unixTimestamp * 1000) : null;
      console.log("⏱️ Message timestamp:", messageTimestamp?.toISOString() || "(not available)");

      // Store raw message
      const rawMessage = await storage.createSafetyPatrolRawMessage({
        messageId,
        senderPhone,
        senderName,
        messageType,
        content: messageContent,
        mediaUrl: mediaUrl || null,
        rawPayload: payload,
        messageTimestamp,
        processed: false,
        reportId: null
      });

      // Process messages with AI (text, conversation, or image with caption)
      const isTextMessage = messageType === "text" || messageType === "conversation";
      const isImageWithCaption = (messageType === "image" || messageType === "imageMessage") && messageContent && messageContent.length > 10;
      const isImageOnly = (messageType === "image" || messageType === "imageMessage") && mediaUrl && (!messageContent || messageContent.length <= 10);
      const shouldProcessWithAI = (isTextMessage || isImageWithCaption) && messageContent && messageContent.length > 10;

      // Handle image-only messages — buat laporan foto sederhana
      if (isImageOnly && mediaUrl) {
        console.log("🖼️ Image-only message detected, creating Laporan Foto report...");
        try {
          const today = new Date().toISOString().split('T')[0];
          const reportDate = messageTimestamp
            ? messageTimestamp.toISOString().split('T')[0]
            : today;

          const { getBulanIndonesia, getWeekOfMonth } = await (async () => {
            const d = new Date(reportDate);
            const bulanNames = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
            return { getBulanIndonesia: () => bulanNames[d.getMonth()], getWeekOfMonth: () => Math.min(5, Math.floor((d.getDate() - 1) / 7) + 1) };
          })();

          const imgReport = await storage.createSafetyPatrolReport({
            tanggal: reportDate,
            bulan: getBulanIndonesia(),
            week: getWeekOfMonth(),
            waktuPelaksanaan: null,
            jenisLaporan: "Laporan Foto",
            kegiatan: "Laporan Foto",
            shift: null,
            lokasi: null,
            namaPelaksana: senderName || null,
            pemateri: [],
            temuan: null,
            buktiKegiatan: [mediaUrl],
            rawMessage: `(image-only dari ${senderName || senderPhone})`,
            parsedData: null,
            photos: null,
            senderPhone,
            senderName,
            status: "processed",
            aiAnalysis: null
          });

          await storage.markRawMessageProcessed(rawMessage.id, imgReport.id);
          console.log("✅ Laporan Foto created:", imgReport.id);
        } catch (err) {
          console.error("[SafetyPatrol] Error creating Laporan Foto:", err);
        }

        res.status(200).json({ status: "ok", message: "Image report created" });
        return;
      }

      if (shouldProcessWithAI) {
        // Detect Sick Leave Intent
        const isSickLeave = messageContent?.toUpperCase().includes("IJIN SAKIT")
          || messageContent?.toUpperCase().includes("IZIN SAKIT")
          || (messageContent?.toUpperCase().includes("SAKIT") && messageContent?.toUpperCase().includes("DEMAM"))
          || (messageContent?.toUpperCase().includes("SAKIT") && messageContent?.toUpperCase().includes("DOKTER"));

        if (isSickLeave) {
          console.log("🏥 Sick Leave detected in webhook");
          try {
            const sickData = await parseSickLeaveWithGemini(messageContent);
            if (sickData && sickData.confidence > 50) {
              // Try to match employee
              const allEmployees = await storage.getAllEmployees();
              const matchedEmployee = allEmployees.find(e => e.name.toLowerCase().includes(sickData.nama.toLowerCase()));

              const created = await storage.createSickLeave({
                name: sickData.nama,
                employeeId: matchedEmployee ? matchedEmployee.id : null,
                date: sickData.tanggal,
                reason: sickData.alasan,
                status: "Pending",
                attachmentUrl: mediaUrl || null,
                attachmentType: mediaUrl ? (mediaUrl.toLowerCase().endsWith('pdf') ? 'application/pdf' : 'image/jpeg') : null,
                aiConfidence: sickData.confidence,
                originalMessage: messageContent,
                aiAnalysis: sickData as any
              });
              console.log(`✅ Sick Leave created for ${sickData.nama}`);
              res.status(200).json({ status: "ok", message: "Sick Leave processed", data: created });
              return;
            }
          } catch (e) {
            console.error("Error processing Sick Leave:", e);
            // Don't error out, let it fall through or return success with error message
            res.status(200).json({ status: "ok", message: "Sick Leave processing failed but received" });
            return;
          }
        }

        // Detect MCU Intent
        const isMCU = messageContent?.toUpperCase().includes("MCU")
          || messageContent?.toUpperCase().includes("MEDICAL")
          || messageContent?.toUpperCase().includes("HASIL KESEHATAN");

        if (isMCU) {
          console.log("🏥 MCU Report detected in webhook");
          try {
            const mcuData = await parseMCUWithGemini(messageContent, mediaUrl);
            if (mcuData) {
              await storage.createMcuRecord({
                employeeId: null, // AI doesn't extract NIK/ID reliably yet
                no: 0,
                nama: mcuData.nama,
                perusahaan: mcuData.perusahaan,
                posisi: mcuData.posisi,
                klinik: mcuData.klinik,
                tanggalBaru: mcuData.tanggalBaru,
                tanggalBerkala: mcuData.tanggalBerkala,
                tanggalAkhir: mcuData.tanggalAkhir,
                kesimpulanBerkala: mcuData.kesimpulanBerkala,
                kesimpulanAkhir: mcuData.kesimpulanAkhir,
                hasilKesimpulan: mcuData.hasilKesimpulan as any,
                verifikasiSaran: mcuData.verifikasiSaran,
                followUp: mcuData.followUp,
                fileUrl: mediaUrl || ""
              });
              console.log(`✅ MCU Record created for ${mcuData.nama}`);
              res.status(200).json({ status: "ok", message: "MCU processed", data: mcuData });
              return;
            }
          } catch (e) {
            console.error("Error processing MCU in webhook:", e);
            // Fallthrough to standard processing if MCU parsing fails? 
            // No, best to stop here to avoid creating junk Safety Record.
            res.status(200).json({ status: "error", message: "Failed to process MCU" });
            return;
          }
        }

        // Filter: hanya proses jika pesan terdeteksi sebagai laporan patrol
        if (!isLikelyPatrolReport(messageContent)) {
          console.log("💬 Pesan biasa (bukan laporan patrol), dilewati:", messageContent.substring(0, 80));
          res.status(200).json({ status: "ok", message: "Bukan laporan patrol, dilewati" });
          return;
        }

        console.log("🤖 Processing message with AI - type:", messageType, "hasMedia:", !!mediaUrl);
        try {
          // Parse with Gemini AI
          const parsed = await parseReportWithGemini(messageContent);

          // Validate: jika hasil parsing terlalu kosong, ini bukan laporan patrol
          if (!isValidParsedReport(parsed)) {
            console.log("⚠️ Parsed result tidak cukup meaningful, pesan dilewati:", messageContent.substring(0, 80));
            res.status(200).json({ status: "ok", message: "Pesan tidak teridentifikasi sebagai laporan patrol yang valid" });
            return;
          }

          const aiAnalysis = await analyzeReportContent(messageContent);

          // Create report with all extracted fields
          const report = await storage.createSafetyPatrolReport({
            tanggal: parsed.tanggal,
            bulan: parsed.bulan || null,
            week: parsed.week || null,
            waktuPelaksanaan: parsed.waktuPelaksanaan || null,
            jenisLaporan: parsed.jenisLaporan,
            kegiatan: parsed.kegiatan || null,
            shift: parsed.shift || null,
            lokasi: parsed.lokasi || null,
            namaPelaksana: parsed.namaPelaksana || null,
            pemateri: parsed.pemateri,
            temuan: parsed.temuan || null,
            buktiKegiatan: mediaUrl ? [mediaUrl] : null,
            rawMessage: messageContent,
            parsedData: parsed,
            photos: null,
            senderPhone,
            senderName,
            status: "processed",
            aiAnalysis
          });

          // Create attendance records
          if (parsed.attendance && parsed.attendance.length > 0) {
            const attendanceRecords = parsed.attendance.map((att: any) => ({
              reportId: report.id,
              unitCode: att.unitCode,
              shift: att.shift,
              status: att.status,
              keterangan: att.keterangan || null
            }));
            await storage.createManySafetyPatrolAttendance(attendanceRecords);
          }

          // Mark raw message as processed
          await storage.markRawMessageProcessed(rawMessage.id, report.id);

          // Aggregate photos from messages sent within ±10 seconds of this message's WhatsApp timestamp
          // Uses WhatsApp timestamp (not database timestamp) to properly match photos sent together
          const msgTimestamp = rawMessage.messageTimestamp || rawMessage.createdAt;
          console.log("🔍 Looking for additional photos from same sender (±120s of WhatsApp timestamp)...");
          const recentMediaMessages = await storage.getRecentUnprocessedMediaBySender(senderPhone, msgTimestamp, 120);
          const additionalPhotos: string[] = [];

          for (const msg of recentMediaMessages) {
            if (msg.id !== rawMessage.id && msg.mediaUrl) {
              additionalPhotos.push(msg.mediaUrl);
              await storage.markRawMessageProcessed(msg.id, report.id);
              console.log("📎 Found additional photo:", msg.mediaUrl);
            }
          }

          // Update report with additional photos if found
          if (additionalPhotos.length > 0) {
            const existingPhotos = report.buktiKegiatan || [];
            await storage.updateSafetyPatrolReport(report.id, {
              buktiKegiatan: [...existingPhotos, ...additionalPhotos]
            });
            console.log(`✅ Added ${additionalPhotos.length} additional photos to report`);
          }

          console.log("✅ Report created:", report.id);
        } catch (parseError) {
          console.error("Error parsing message with AI:", parseError);
          // Still store the message, just mark as failed
          await storage.updateSafetyPatrolReport(rawMessage.id, { status: "failed" } as any);
        }
      }

      res.status(200).json({ status: "ok", message: "Webhook received" });
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.status(200).json({ status: "ok", message: "Webhook received with errors" });
    }
  });

  // Get all Safety Patrol reports
  app.get("/api/safety-patrol/reports", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let reports;
      if (startDate && endDate) {
        reports = await storage.getSafetyPatrolReportsByDateRange(
          startDate as string,
          endDate as string
        );
      } else {
        reports = await storage.getAllSafetyPatrolReports();
      }

      // Get attendance for each report
      const reportsWithAttendance = await Promise.all(
        reports.map(async (report) => {
          const attendance = await storage.getSafetyPatrolAttendanceByReport(report.id);
          return { ...report, attendance };
        })
      );

      res.json(reportsWithAttendance);
    } catch (error) {
      console.error("Error fetching safety patrol reports:", error);
      res.status(500).json({ message: "Gagal mengambil data laporan Safety Patrol" });
    }
  });

  // Get single Safety Patrol report
  app.get("/api/safety-patrol/reports/:id", async (req, res) => {
    try {
      const report = await storage.getSafetyPatrolReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Laporan tidak ditemukan" });
      }

      const attendance = await storage.getSafetyPatrolAttendanceByReport(report.id);
      res.json({ ...report, attendance });
    } catch (error) {
      console.error("Error fetching safety patrol report:", error);
      res.status(500).json({ message: "Gagal mengambil data laporan" });
    }
  });

  // Delete Safety Patrol report
  app.delete("/api/safety-patrol/reports/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSafetyPatrolReport(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Laporan tidak ditemukan" });
      }
      res.json({ message: "Laporan berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting safety patrol report:", error);
      res.status(500).json({ message: "Gagal menghapus laporan" });
    }
  });

  // Re-parse Safety Patrol report with AI
  app.post("/api/safety-patrol/reports/:id/reparse", async (req, res) => {
    try {
      const report = await storage.getSafetyPatrolReport(req.params.id);
      if (!report) {
        return res.status(404).json({ message: "Laporan tidak ditemukan" });
      }

      if (!report.rawMessage) {
        return res.status(400).json({ message: "Tidak ada pesan asli untuk diproses ulang" });
      }

      console.log("🔄 Re-parsing report:", req.params.id);

      // Re-parse with AI
      const parsed = await parseReportWithGemini(report.rawMessage);
      const aiAnalysis = await analyzeReportContent(report.rawMessage);

      // Update report with new parsed data
      const updatedReport = await storage.updateSafetyPatrolReport(req.params.id, {
        tanggal: parsed.tanggal,
        bulan: parsed.bulan || null,
        week: parsed.week || null,
        waktuPelaksanaan: parsed.waktuPelaksanaan || null,
        jenisLaporan: parsed.jenisLaporan,
        kegiatan: parsed.kegiatan || null,
        shift: parsed.shift || null,
        lokasi: parsed.lokasi || null,
        namaPelaksana: parsed.namaPelaksana || null,
        pemateri: parsed.pemateri,
        temuan: parsed.temuan || null,
        parsedData: parsed,
        aiAnalysis
      });

      // Update attendance if available
      if (parsed.attendance && parsed.attendance.length > 0) {
        // Delete old attendance
        await storage.deleteSafetyPatrolAttendanceByReport(req.params.id);

        // Create new attendance
        const attendanceRecords = parsed.attendance.map((att: any) => ({
          reportId: req.params.id,
          unitCode: att.unitCode,
          shift: att.shift,
          status: att.status,
          keterangan: att.keterangan || null
        }));
        await storage.createManySafetyPatrolAttendance(attendanceRecords);
      }

      console.log("✅ Re-parse completed for report:", req.params.id);

      const attendance = await storage.getSafetyPatrolAttendanceByReport(req.params.id);
      res.json({ ...updatedReport, attendance, message: "Berhasil memproses ulang laporan" });
    } catch (error) {
      console.error("Error re-parsing safety patrol report:", error);
      res.status(500).json({ message: "Gagal memproses ulang laporan" });
    }
  });

  // Batch re-parse reports with missing fields
  app.post("/api/safety-patrol/batch-reparse", async (req, res) => {
    try {
      const limit = Math.min(500, parseInt((req.query.limit as string) || "50"));
      const reports = await storage.getAllSafetyPatrolReports();
      const missing = reports.filter((r: any) =>
        r.rawMessage && (!r.waktuPelaksanaan || !r.lokasi || !r.shift)
      ).slice(0, limit);

      const totalMissing = reports.filter((r: any) =>
        r.rawMessage && (!r.waktuPelaksanaan || !r.lokasi || !r.shift)
      ).length;

      if (missing.length === 0) {
        return res.json({ message: "Tidak ada laporan yang perlu di-parse ulang", processed: 0, remaining: 0 });
      }

      console.log(`[batch-reparse] Starting: ${missing.length} laporan akan diproses (total kosong: ${totalMissing})`);

      let processed = 0;
      let failed = 0;
      for (const report of missing) {
        try {
          const parsed = await parseReportWithGemini(report.rawMessage!);
          await storage.updateSafetyPatrolReport(report.id, {
            waktuPelaksanaan: parsed.waktuPelaksanaan || null,
            shift: parsed.shift || null,
            lokasi: parsed.lokasi || null,
            namaPelaksana: parsed.namaPelaksana || null,
            kegiatan: parsed.kegiatan || null,
            temuan: parsed.temuan || null,
            tanggal: parsed.tanggal,
            bulan: parsed.bulan || null,
            week: parsed.week || null,
            jenisLaporan: parsed.jenisLaporan,
            parsedData: parsed,
          });
          processed++;
        } catch (err) {
          console.error(`[batch-reparse] Gagal report ${report.id}:`, err);
          failed++;
        }
      }

      const remaining = totalMissing - processed;
      console.log(`[batch-reparse] Selesai: ${processed} berhasil, ${failed} gagal, ${remaining} tersisa`);
      res.json({ message: `Selesai: ${processed} berhasil, ${failed} gagal${remaining > 0 ? `, ${remaining} masih tersisa` : ''}`, processed, failed, remaining });
    } catch (error) {
      console.error("Batch reparse error:", error);
      res.status(500).json({ message: "Gagal menjalankan batch re-parse" });
    }
  });

  // Hapus laporan "sampah" — laporan dengan semua field utama kosong (kemungkinan bukan laporan patrol)
  app.post("/api/safety-patrol/cleanup-junk", async (req, res) => {
    try {
      const reports = await storage.getAllSafetyPatrolReports();
      const junk = reports.filter((r: any) => {
        const keyFields = [r.kegiatan, r.lokasi, r.shift, r.waktuPelaksanaan, r.namaPelaksana, r.temuan];
        const filledCount = keyFields.filter((f: any) => f && String(f).trim().length > 0).length;
        return filledCount < 2;
      });

      let deleted = 0;
      for (const r of junk) {
        await storage.deleteSafetyPatrolReport(r.id);
        deleted++;
      }

      console.log(`[cleanup-junk] Menghapus ${deleted} laporan sampah dari ${reports.length} total`);
      res.json({ message: `${deleted} laporan tidak valid dihapus`, deleted, total: reports.length });
    } catch (error) {
      console.error("Cleanup junk error:", error);
      res.status(500).json({ message: "Gagal membersihkan laporan sampah" });
    }
  });

  // Get Safety Patrol statistics
  app.get("/api/safety-patrol/stats", async (req, res) => {
    try {
      const reports = await storage.getAllSafetyPatrolReports();

      // Calculate stats
      const totalReports = reports.length;
      const reportsByType: Record<string, number> = {};
      const reportsByDate: Record<string, number> = {};

      for (const report of reports) {
        // By type
        reportsByType[report.jenisLaporan] = (reportsByType[report.jenisLaporan] || 0) + 1;

        // By date
        reportsByDate[report.tanggal] = (reportsByDate[report.tanggal] || 0) + 1;
      }

      res.json({
        totalReports,
        reportsByType,
        reportsByDate,
        recentReports: reports.slice(0, 10)
      });
    } catch (error) {
      console.error("Error fetching safety patrol stats:", error);
      res.status(500).json({ message: "Gagal mengambil statistik" });
    }
  });

  // KPI per pelaksana
  // Petakan kegiatan (teks bebas) -> kegiatan kanonik sesuai jadwal mingguan OHS Hauling.
  // Urut spesifik -> umum; "jalan" terakhir (paling umum).
  const canonicalSafetyActivity = (raw: string | null | undefined): string | null => {
    const s = (raw || "").toLowerCase();
    if (!s) return null;
    if (s.includes("charging")) return "Monitoring Area Charging Station";
    if (s.includes("roster")) return "Sidak kesesuaian roster";
    if (s.includes("lajur")) return "Observasi kepatuhan Lajur";
    if (s.includes("workshop")) return "Inspeksi Workshop";
    if (s.includes("rom")) return "Inspeksi ROM";
    if (s.includes("fatigue") || s.includes("kelelahan")) return "Fatigue check";
    if (s.includes("wake")) return "Wake up call";
    if (s.includes("kecepatan")) return "Sidak kecepatan";
    if (s.includes("rambu")) return "Observasi rambu";
    if (s.includes("kelengkapan")) return "Sidak kelengkapan";
    if (s.includes("jarak")) return "Jarak aman beriringan";
    if (s.includes("asses") || s.includes("assess")) return "Assesment (Conditional)";
    if (s.includes("jalan")) return "Inspeksi Jalan";
    return null;
  };

  // Acuan jadwal mingguan OHS Hauling (target per shift/minggu per orang)
  const SP_WEEKLY_PLAN: { name: string; s1: number; s2: number }[] = [
    { name: "Jarak aman beriringan", s1: 7, s2: 0 },
    { name: "Sidak kecepatan", s1: 7, s2: 0 },
    { name: "Observasi rambu", s1: 7, s2: 0 },
    { name: "Sidak kelengkapan", s1: 4, s2: 0 },
    { name: "Fatigue check", s1: 7, s2: 7 },
    { name: "Wake up call", s1: 7, s2: 7 },
    { name: "Inspeksi Jalan", s1: 7, s2: 7 },
    { name: "Inspeksi ROM", s1: 2, s2: 0 },
    { name: "Inspeksi Workshop", s1: 2, s2: 0 },
    { name: "Observasi kepatuhan Lajur", s1: 6, s2: 0 },
    { name: "Assesment (Conditional)", s1: 1, s2: 0 },
    { name: "Sidak kesesuaian roster", s1: 4, s2: 0 },
    { name: "Monitoring Area Charging Station", s1: 2, s2: 0 },
  ];

  // Minggu ISO-8601 dari sebuah tanggal -> { year, week }
  const isoWeek = (d: Date): { year: number; week: number } => {
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Senin=0
    date.setUTCDate(date.getUTCDate() - dayNum + 3); // Kamis minggu ini
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
    firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);
    const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
    return { year: date.getUTCFullYear(), week };
  };

  // Daftar minggu ISO unik dalam rentang [start, end]
  const weeksInRangeList = (startStr: string, endStr: string): { year: number; week: number }[] => {
    const out: { year: number; week: number }[] = [];
    const seen = new Set<string>();
    const start = new Date(startStr + "T00:00:00Z");
    const end = new Date(endStr + "T00:00:00Z");
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
      const w = isoWeek(new Date(t));
      const key = `${w.year}-${w.week}`;
      if (!seen.has(key)) { seen.add(key); out.push(w); }
    }
    return out;
  };

  // GET plan kehadiran per tahun
  app.get("/api/safety-patrol/attendance-plan", async (req, res) => {
    try {
      const year = parseInt((req.query.year as string) || "0", 10) || new Date().getFullYear();
      const rows = await storage.getAttendancePlan(year);
      res.json({ year, plan: rows });
    } catch (error) {
      console.error("Error fetching attendance plan:", error);
      res.status(500).json({ message: "Gagal mengambil plan kehadiran" });
    }
  });

  // POST bulk upsert plan kehadiran
  app.post("/api/safety-patrol/attendance-plan", async (req, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const clean = rows
        .filter((r: any) => r?.officerName && r?.year && r?.week)
        .map((r: any) => ({
          officerName: String(r.officerName),
          nik: r.nik ? String(r.nik) : null,
          year: Number(r.year),
          week: Number(r.week),
          shift1: r.shift1 === "NA" ? "NA" : "MASUK",
          shift2: r.shift2 === "NA" ? "NA" : "MASUK",
        }));
      await storage.upsertAttendancePlan(clean as any);
      res.json({ ok: true, count: clean.length });
    } catch (error) {
      console.error("Error saving attendance plan:", error);
      res.status(500).json({ message: "Gagal menyimpan plan kehadiran" });
    }
  });

  // ===== SIMANTIK / Zero Harm — import iSafe/FMS =====
  app.get("/api/zero-harm/summary", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const counts = await storage.zhCounts();
      res.json({ counts, total: Object.values(counts).reduce((a: number, b: number) => a + b, 0) });
    } catch (error) {
      console.error("ZeroHarm summary error:", error);
      res.status(500).json({ message: "Gagal mengambil ringkasan" });
    }
  });

  app.get("/api/zero-harm/analytics", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const data = await storage.zhAnalytics();
      res.json(data);
    } catch (error: any) {
      console.error("ZeroHarm analytics error:", error?.message || error);
      res.status(500).json({ message: "Gagal mengambil analitik" });
    }
  });

  app.post("/api/zero-harm/import", excelUpload.single("file"), async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      if (!req.file) return res.status(400).json({ message: "File Excel diperlukan" });
      const { parseZeroHarmWorkbook } = await import("./services/zero-harm-import");
      const { rows, counts, sheetsFound } = parseZeroHarmWorkbook(req.file.buffer);
      const saved: Record<string, number> = {};
      for (const sheet of ["hazard", "inspeksi", "observasi", "opk", "attendance", "fms"]) {
        saved[sheet] = await storage.zhUpsert(sheet, (rows as any)[sheet]);
      }
      // data mentah berubah → hitung ulang Workbook (background) agar Pencapaian ikut ter-update
      try { recomputeWorkbook(); } catch (e: any) { console.error("[zh] auto-recompute setelah import gagal:", e?.message || e); }
      res.json({ ok: true, parsed: counts, saved, sheetsFound });
    } catch (error: any) {
      console.error("ZeroHarm import error:", error?.message || error);
      res.status(500).json({ message: error?.message || "Gagal import data" });
    }
  });

  // ---- Zero Harm — Workbook editable (Univer) ----
  // Upload khusus workbook: file master bisa ~30MB → limit 60MB.
  const workbookUpload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.mimetype === "application/vnd.ms-excel") cb(null, true);
      else cb(new Error("Hanya file Excel (.xlsx/.xls) yang diperbolehkan"));
    },
    limits: { fileSize: 60 * 1024 * 1024 },
  });
  // ---- helpers workbook (split raw/program + merge + lock) ----
  const ZH_RAW_SHEETS = new Set(["Validasi", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"]);
  const isRawSheet = (s: any) => ZH_RAW_SHEETS.has(String(s?.name || "").trim());
  function splitWorkbook(data: any) {
    const program: any = { id: data.id, name: data.name, sheetOrder: [], sheets: {}, styles: data.styles || {} };
    const raw: any = { sheetOrder: [], sheets: {} };
    for (const id of data.sheetOrder || []) {
      const sh = data.sheets?.[id];
      if (!sh) continue;
      if (isRawSheet(sh)) { raw.sheetOrder.push(id); raw.sheets[id] = sh; }
      else { program.sheetOrder.push(id); program.sheets[id] = sh; }
    }
    return { program, raw };
  }
  function mergeWorkbook(program: any, raw: any) {
    if (!program) return null;
    if (!raw) return program;
    return {
      id: program.id, name: program.name,
      sheetOrder: [...(program.sheetOrder || []), ...(raw.sheetOrder || [])],
      sheets: { ...(program.sheets || {}), ...(raw.sheets || {}) },
      styles: program.styles || {},
    };
  }
  const LOCK_KEY = "zh_workbook_lock";
  const LOCK_TTL = 60000; // 60 dtk
  async function readLock() {
    try { const v = await storage.getSystemSetting(LOCK_KEY); if (!v) return null; const o = JSON.parse(v); return o?.at && (Date.now() - new Date(o.at).getTime() < LOCK_TTL) ? o : null; } catch { return null; }
  }

  // recompute workbook RINGAN (HF dari template+raw) di latar belakang; hasil → row 'computed'
  let zhComputing = false;
  async function recomputeWorkbook() {
    if (zhComputing) return;
    zhComputing = true;
    await storage.setSystemSetting("zh_workbook_computing", "1").catch(() => {});
    setTimeout(async () => {
      try {
        const [act] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "active")).limit(1);
        if (!act) return;
        const [rawRow] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "raw")).limit(1);
        const [comp] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "computed")).limit(1);
        // gabung edit manual user (dari 'computed') ke template: sel TANPA formula di template diisi nilai dari computed
        const template: any = JSON.parse(JSON.stringify(act.data));
        if (comp?.data) {
          const cd: any = comp.data;
          for (const id of template.sheetOrder || []) {
            const ts = template.sheets[id]; const cs = cd.sheets?.[id]; if (!ts || !cs) continue;
            for (const r of Object.keys(cs.cellData || {})) {
              for (const c of Object.keys(cs.cellData[r] || {})) {
                const tcell = ts.cellData?.[r]?.[c];
                if (tcell && tcell.f) continue; // jangan timpa sel berformula
                const v = cs.cellData[r][c]?.v;
                if (v == null) continue;
                if (!ts.cellData[r]) ts.cellData[r] = {};
                ts.cellData[r][c] = { ...(ts.cellData[r][c] || {}), v };
              }
            }
          }
        }
        // injeksi Plan Kehadiran (hari/NA) ke sheet OPK + tulis formula Pencapaian per pengawas×minggu.
        // SETELAH merge edit-manual (agar menang atas nilai stale), SEBELUM compute.
        try {
          const { loadAttendanceByProgram, injectAttendance } = await import("./lib/zh-attendance-inject");
          const year = new Date().getFullYear();
          const att = await loadAttendanceByProgram(year);
          const n = injectAttendance(template, att);
          console.log(`[zh-hf] injeksi kehadiran ${year}: ${n} sel`);
        } catch (e: any) { console.error("[zh-hf] injeksi kehadiran gagal:", e?.message || e); }

        // sumber data mentah: utamakan tabel zh_* (live, hasil Import) via zh_raw_meta;
        // fallback ke blob 'raw' lama bila zh_raw_meta belum ada.
        let rawForHf: any = (rawRow?.data as any) || null;
        try {
          const { extractRawMeta, buildRawWorkbookFromDb } = await import("./lib/zh-raw-grid");
          let metaStr = await storage.getSystemSetting("zh_raw_meta");
          // backfill: bila meta belum ada tapi blob raw ada → buat dari blob (aktivasi tanpa upload ulang)
          if (!metaStr && rawRow?.data) {
            try {
              const meta = extractRawMeta(rawRow.data as any);
              metaStr = JSON.stringify(meta);
              await storage.setSystemSetting("zh_raw_meta", metaStr);
              console.log("[zh-hf] zh_raw_meta dibuat dari blob raw (backfill)");
            } catch { /* noop */ }
          }
          if (metaStr) {
            const fromDb = await buildRawWorkbookFromDb(JSON.parse(metaStr));
            if (fromDb && fromDb.sheetOrder.length) {
              rawForHf = fromDb;
              console.log("[zh-hf] raw dari tabel zh_* (Import) →", fromDb.sheetOrder.join(","));
            }
          }
        } catch (e: any) { console.error("[zh-hf] build raw dari DB gagal, pakai blob:", e?.message || e); }
        const { computeLightWorkbook } = await import("./lib/zh-hf");
        const light = computeLightWorkbook(template, rawForHf);
        await db.insert(zhWorkbook).values({ id: "computed", name: "computed", data: light, updatedAt: new Date() })
          .onConflictDoUpdate({ target: zhWorkbook.id, set: { data: light, updatedAt: new Date() } });
        console.log("[zh-hf] recompute selesai → computed disimpan");
      } catch (e: any) {
        console.error("[zh-hf] recompute gagal:", e?.message || e);
      } finally {
        zhComputing = false;
        await storage.setSystemSetting("zh_workbook_computing", "0").catch(() => {});
      }
    }, 50);
  }

  app.post("/api/zero-harm/workbook/upload", workbookUpload.single("file"), async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      if (!req.file) return res.status(400).json({ message: "File Excel diperlukan" });
      const { xlsxToUniver } = await import("./lib/univer-xlsx");
      const data = await xlsxToUniver(req.file.buffer);
      const { program, raw } = splitWorkbook(data);
      // program (kecil, sering diedit) + raw (besar, statis) disimpan terpisah
      await db.insert(zhWorkbook).values({ id: "active", name: data.name, data: program, updatedAt: new Date() })
        .onConflictDoUpdate({ target: zhWorkbook.id, set: { data: program, name: data.name, updatedAt: new Date() } });
      await db.insert(zhWorkbook).values({ id: "raw", name: "raw", data: raw, updatedAt: new Date() })
        .onConflictDoUpdate({ target: zhWorkbook.id, set: { data: raw, updatedAt: new Date() } });
      // simpan peta kolom mentah (urutan header + grid Validasi) → recompute bisa pakai data Import (tabel zh_*)
      try {
        const { extractRawMeta } = await import("./lib/zh-raw-grid");
        const rawMeta = extractRawMeta(raw);
        await storage.setSystemSetting("zh_raw_meta", JSON.stringify(rawMeta));
      } catch (e: any) { console.error("[zh] simpan zh_raw_meta gagal:", e?.message || e); }
      // hapus computed lama; hitung ulang (latar belakang) → workbook ringan dgn nilai terhitung
      await db.delete(zhWorkbook).where(eq(zhWorkbook.id, "computed"));
      recomputeWorkbook();
      res.json({ ok: true, sheets: data.sheetOrder.length, computing: true });
    } catch (error: any) {
      console.error("ZH workbook upload error:", error?.message || error);
      res.status(500).json({ message: error?.message || "Gagal mengonversi workbook" });
    }
  });

  app.get("/api/zero-harm/workbook", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      // baca minimal: hanya cek keberadaan active (tanpa data 5.7MB)
      const [act] = await db.select({ name: zhWorkbook.name }).from(zhWorkbook).where(eq(zhWorkbook.id, "active")).limit(1);
      if (!act) return res.json({ data: null });
      const lock = await readLock();
      const lockInfo = lock ? { nik: lock.nik, name: lock.name, mine: lock.nik === u.nik } : null;
      // ambil HANYA computed.data (ringan ~2.9MB) — yang dikirim ke browser.
      // Link DB lokal (Mac↔Railway) kadang putus saat baca row besar → retry dgn koneksi fresh.
      let comp: any = null;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= 4; attempt++) {
        try {
          const rows = await db.select({ data: zhWorkbook.data, updatedAt: zhWorkbook.updatedAt }).from(zhWorkbook).where(eq(zhWorkbook.id, "computed")).limit(1);
          comp = rows[0] || null;
          lastErr = null;
          break;
        } catch (e: any) {
          lastErr = e;
          console.error(`ZH workbook computed read gagal (attempt ${attempt}):`, e?.message || e);
          if (attempt < 4) await new Promise((r) => setTimeout(r, 1500));
        }
      }
      if (lastErr) throw lastErr;
      if (!comp) {
        return res.json({ data: null, computing: true, lock: lockInfo });
      }
      res.json({ data: comp.data, name: act.name, updatedAt: comp.updatedAt, lock: lockInfo, computing: zhComputing });
    } catch (error: any) {
      console.error("ZH workbook get error:", error?.message || error);
      res.status(500).json({ message: "Gagal memuat workbook" });
    }
  });

  app.delete("/api/zero-harm/workbook", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      await db.delete(zhWorkbook);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("ZH workbook delete error:", error?.message || error);
      res.status(500).json({ message: "Gagal menghapus workbook" });
    }
  });

  app.post("/api/zero-harm/workbook/save", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      // tolak bila lock dipegang user lain (anti saling-timpa)
      const lock = await readLock();
      if (lock && lock.nik !== u.nik) return res.status(409).json({ message: `Sedang diedit oleh ${lock.name}` });
      let data = req.body?.data;
      if (!data || !data.sheetOrder) return res.status(400).json({ message: "data IWorkbookData diperlukan" });
      // simpan tampilan/edit ke 'computed' (ringan, cepat); template 'active' tak diubah → recompute pakai edit ini
      const { program } = splitWorkbook(data);
      // pengaman: jangan timpa computed isi dgn workbook kosong (mis. init default 1 sheet)
      if (!program.sheetOrder || program.sheetOrder.length < 5) return res.json({ ok: true, skipped: true });
      await db.insert(zhWorkbook).values({ id: "computed", name: program.name || "Zero Harm 2.0", data: program, updatedAt: new Date() })
        .onConflictDoUpdate({ target: zhWorkbook.id, set: { data: program, updatedAt: new Date() } });
      res.json({ ok: true });
    } catch (error: any) {
      console.error("ZH workbook save error:", error?.message || error);
      res.status(500).json({ message: "Gagal menyimpan workbook" });
    }
  });

  // ---- Kunci edit (kolaborasi aman) ----
  app.get("/api/zero-harm/workbook/lock", async (req, res) => {
    const u = (req.session as any).user; if (!u) return res.sendStatus(401);
    const lock = await readLock();
    res.json({ lock: lock ? { nik: lock.nik, name: lock.name, mine: lock.nik === u.nik } : null });
  });
  app.post("/api/zero-harm/workbook/lock", async (req, res) => {
    const u = (req.session as any).user; if (!u) return res.sendStatus(401);
    const lock = await readLock();
    if (lock && lock.nik !== u.nik) return res.status(409).json({ ok: false, lock: { nik: lock.nik, name: lock.name, mine: false } });
    await storage.setSystemSetting(LOCK_KEY, JSON.stringify({ nik: u.nik, name: u.name, at: new Date().toISOString() }));
    res.json({ ok: true, lock: { nik: u.nik, name: u.name, mine: true } });
  });
  app.post("/api/zero-harm/workbook/lock/release", async (req, res) => {
    const u = (req.session as any).user; if (!u) return res.sendStatus(401);
    const lock = await readLock();
    if (!lock || lock.nik === u.nik) await storage.setSystemSetting(LOCK_KEY, "");
    res.json({ ok: true });
  });

  // Hitung ulang rumus dari data terbaru (tombol / setelah Import)
  app.post("/api/zero-harm/workbook/recompute", async (req, res) => {
    const u = (req.session as any).user; if (!u) return res.sendStatus(401);
    recomputeWorkbook();
    res.json({ ok: true, computing: true });
  });
  app.get("/api/zero-harm/workbook/status", async (req, res) => {
    const u = (req.session as any).user; if (!u) return res.sendStatus(401);
    const flag = await storage.getSystemSetting("zh_workbook_computing");
    res.json({ computing: zhComputing || flag === "1" });
  });

  app.get("/api/zero-harm/workbook/export", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const [act] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "active")).limit(1);
      if (!act) return res.status(404).json({ message: "Workbook belum ada" });
      const [rawRow] = await db.select().from(zhWorkbook).where(eq(zhWorkbook.id, "raw")).limit(1);
      const merged = mergeWorkbook(act.data, rawRow?.data);
      const { univerToXlsx } = await import("./lib/univer-xlsx");
      const buf = univerToXlsx(merged as any);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="Zero-Harm-2.0.xlsx"`);
      res.send(buf);
    } catch (error: any) {
      console.error("ZH workbook export error:", error?.message || error);
      res.status(500).json({ message: "Gagal export" });
    }
  });

  // ---- Zero Harm — Program Monitoring (master, semua program) ----
  app.get("/api/zero-harm/programs/summary", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const year = Number(req.query.year) || 2026;
      const { getZhProgramsSummary, ZH_PILLARS } = await import("./lib/zh-programs");
      const programs = await getZhProgramsSummary(year);
      res.json({ year, pillars: ZH_PILLARS, programs });
    } catch (error: any) {
      console.error("ZH programs summary error:", error?.message || error);
      res.status(500).json({ message: "Gagal mengambil ringkasan program" });
    }
  });

  // ---- Zero Harm KPI program Kehadiran (Fase 2A) ----
  app.get("/api/zero-harm/attendance/kpi", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const program = String(req.query.program || "3.1.1");
      const year = Number(req.query.year) || 2026;
      const { getZhAttendanceKpi, ZH_ATT_PROGRAMS } = await import("./lib/zh-attendance");
      const data = await getZhAttendanceKpi(program, year);
      if (!data) return res.status(404).json({ message: "Program tidak ditemukan" });
      res.json({ ...data, allPrograms: ZH_ATT_PROGRAMS.map((p) => ({ code: p.code, name: p.name, pillar: p.pillar })) });
    } catch (error: any) {
      console.error("ZH attendance kpi error:", error?.message || error);
      res.status(500).json({ message: "Gagal menghitung KPI kehadiran" });
    }
  });

  // ---- Zero Harm KPI Program Sidak (Fase 1) ----
  app.get("/api/zero-harm/sidak/programs", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { ZH_SIDAK_PROGRAMS } = await import("./lib/zh-sidak");
      res.json({ programs: ZH_SIDAK_PROGRAMS });
    } catch (error: any) {
      console.error("ZH sidak programs error:", error?.message || error);
      res.status(500).json({ message: "Gagal mengambil daftar program" });
    }
  });

  app.get("/api/zero-harm/sidak/kpi", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const program = String(req.query.program || "3.5");
      const year = Number(req.query.year) || 2026;
      const { getZhSidakKpi } = await import("./lib/zh-sidak");
      const data = await getZhSidakKpi(program, year);
      if (!data) return res.status(404).json({ message: "Program tidak ditemukan" });
      res.json(data);
    } catch (error: any) {
      console.error("ZH sidak kpi error:", error?.message || error);
      res.status(500).json({ message: "Gagal menghitung KPI" });
    }
  });

  app.post("/api/zero-harm/sidak/attendance", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { programCode, year, entries } = req.body as {
        programCode: string; year: number;
        entries: Array<{ nik: string; week: number; days: number | null }>;
      };
      if (!programCode || !year || !Array.isArray(entries)) {
        return res.status(400).json({ message: "programCode, year, entries wajib" });
      }
      const n = await storage.upsertZhProgramAttendance(programCode, year, entries);
      res.json({ ok: true, upserted: n });
    } catch (error: any) {
      console.error("ZH sidak attendance error:", error?.message || error);
      res.status(500).json({ message: "Gagal menyimpan hari kerja" });
    }
  });

  // ---- Plan Kehadiran terpadu: satu grid pengawas×minggu → semua program OPK ----
  // GET: daftar pengawas (distinct, hanya yg ada di program Sidak) + days teragregasi per minggu.
  app.get("/api/zero-harm/plan-kehadiran", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const year = Number(req.query.year) || new Date().getFullYear();
      const { ZH_SIDAK_PROGRAMS } = await import("./lib/zh-sidak");
      const codes = ZH_SIDAK_PROGRAMS.map((p: any) => p.code);
      // pengawas distinct di program Sidak + daftar programnya
      const offs: any = await db.execute(sql`
        SELECT nik, MAX(nama) nama, MAX(dept) dept, MIN(ord) ord,
               array_agg(DISTINCT program_code) programs
        FROM zh_program_officer WHERE program_code = ANY(${codes})
        GROUP BY nik ORDER BY MIN(ord), MAX(nama)`);
      // days teragregasi per (nik, week) — MAX mengabaikan null; semua null → null (NA)
      const att: any = await db.execute(sql`
        SELECT nik, week, MAX(days) days FROM zh_program_attendance
        WHERE year = ${year} AND program_code = ANY(${codes})
        GROUP BY nik, week`);
      const daysByNik: Record<string, Record<number, number | null>> = {};
      for (const a of (att.rows || [])) {
        (daysByNik[a.nik] ||= {})[Number(a.week)] = a.days == null ? null : Number(a.days);
      }
      const officers = (offs.rows || []).map((o: any) => ({
        nik: o.nik, nama: o.nama, dept: o.dept,
        programs: o.programs, days: daysByNik[o.nik] || {},
      }));
      res.json({ year, officers });
    } catch (error: any) {
      console.error("ZH plan-kehadiran get error:", error?.message || error);
      res.status(500).json({ message: "Gagal memuat plan kehadiran" });
    }
  });

  // POST: simpan grid terpadu → tulis days ke SEMUA program Sidak tiap pengawas → recompute Workbook.
  app.post("/api/zero-harm/plan-kehadiran", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const { year, entries } = req.body as { year: number; entries: Array<{ nik: string; week: number; days: number | null }> };
      if (!year || !Array.isArray(entries)) return res.status(400).json({ message: "year, entries wajib" });
      const { ZH_SIDAK_PROGRAMS } = await import("./lib/zh-sidak");
      const codes = new Set(ZH_SIDAK_PROGRAMS.map((p: any) => p.code));
      // program (Sidak) per pengawas
      const offRows: any = await db.execute(sql`SELECT nik, program_code FROM zh_program_officer`);
      const progsByNik = new Map<string, string[]>();
      for (const r of (offRows.rows || [])) {
        if (!codes.has(r.program_code)) continue;
        if (!progsByNik.has(r.nik)) progsByNik.set(r.nik, []);
        progsByNik.get(r.nik)!.push(r.program_code);
      }
      // kelompokkan entri per program
      const perProgram = new Map<string, Array<{ nik: string; week: number; days: number | null }>>();
      for (const e of entries) {
        if (!e.nik || !e.week) continue;
        const progs = progsByNik.get(e.nik) || [];
        for (const code of progs) {
          if (!perProgram.has(code)) perProgram.set(code, []);
          perProgram.get(code)!.push({ nik: e.nik, week: Number(e.week), days: e.days == null ? null : Number(e.days) });
        }
      }
      let total = 0;
      for (const [code, ents] of perProgram) total += await storage.upsertZhProgramAttendance(code, year, ents);
      // Workbook ikut terhitung ulang dari kehadiran baru
      try { recomputeWorkbook(); } catch (e: any) { console.error("[zh] recompute setelah plan-kehadiran gagal:", e?.message || e); }
      res.json({ ok: true, upserted: total, programs: perProgram.size, computing: true });
    } catch (error: any) {
      console.error("ZH plan-kehadiran post error:", error?.message || error);
      res.status(500).json({ message: "Gagal menyimpan plan kehadiran" });
    }
  });

  app.get("/api/safety-patrol/kpi", async (req, res) => {
    try {
      const { startDate, endDate, pelaksana } = req.query;
      let reports = startDate && endDate
        ? await storage.getSafetyPatrolReportsByDateRange(startDate as string, endDate as string)
        : await storage.getAllSafetyPatrolReports();

      // Filter hanya laporan yang ter-parse (punya kegiatan atau namaPelaksana)
      reports = reports.filter(r => r.namaPelaksana || r.kegiatan);

      // Normalize name matching: case-insensitive partial match
      const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
      const targetNames: string[] = pelaksana
        ? (pelaksana as string).split(",").map(n => n.trim())
        : [];

      // Group reports by pelaksana
      const byPerson: Record<string, typeof reports> = {};
      for (const r of reports) {
        if (!r.namaPelaksana) continue;
        const names = r.namaPelaksana.split(/[,;\/]/).map(n => n.trim()).filter(Boolean);
        for (const name of names) {
          if (targetNames.length > 0) {
            const matched = targetNames.find(t => normName(name).includes(normName(t)) || normName(t).includes(normName(name)));
            if (!matched) continue;
            const key = matched;
            if (!byPerson[key]) byPerson[key] = [];
            byPerson[key].push(r);
          } else {
            if (!byPerson[name]) byPerson[name] = [];
            byPerson[name].push(r);
          }
        }
      }

      // Plan kehadiran -> sesuaikan target per minggu (NA = tidak dihitung)
      const weeksList = startDate && endDate ? weeksInRangeList(startDate as string, endDate as string) : [];
      const planYear = startDate ? new Date((startDate as string) + "T00:00:00Z").getUTCFullYear() : new Date().getFullYear();
      let attRows: any[] = [];
      try { attRows = await storage.getAttendancePlan(planYear); } catch { attRows = []; }
      // att[officerName][week] = { shift1, shift2 }
      const att: Record<string, Record<number, { shift1: string; shift2: string }>> = {};
      for (const a of attRows) {
        if (!att[a.officerName]) att[a.officerName] = {};
        att[a.officerName][a.week] = { shift1: a.shift1, shift2: a.shift2 };
      }
      const presentShift = (name: string, week: number, shiftKey: "shift1" | "shift2"): boolean => {
        const rec = att[name]?.[week];
        if (!rec) return true; // default Masuk
        return rec[shiftKey] !== "NA";
      };
      // Hitung plan per orang per kegiatan (hormati kehadiran). Fallback: jumlah minggu = max(weeksList,1)
      const computePlan = (name: string): { byActivity: Record<string, { s1: number; s2: number }>; presentWeeks: { s1: number; s2: number } } => {
        const planByActivity: Record<string, { s1: number; s2: number }> = {};
        let presS1 = 0, presS2 = 0;
        const weeks = weeksList.length ? weeksList : [{ year: planYear, week: -1 }];
        for (const wk of weeks) {
          const inS1 = wk.week === -1 ? true : presentShift(name, wk.week, "shift1");
          const inS2 = wk.week === -1 ? true : presentShift(name, wk.week, "shift2");
          if (inS1) presS1++;
          if (inS2) presS2++;
          for (const act of SP_WEEKLY_PLAN) {
            if (!planByActivity[act.name]) planByActivity[act.name] = { s1: 0, s2: 0 };
            if (inS1) planByActivity[act.name].s1 += act.s1;
            if (inS2) planByActivity[act.name].s2 += act.s2;
          }
        }
        return { byActivity: planByActivity, presentWeeks: { s1: presS1, s2: presS2 } };
      };

      // Build KPI per person
      const kpiData = Object.entries(byPerson).map(([name, reps]) => {
        const activityMap: Record<string, number> = {};
        const shiftMap: Record<string, number> = {};
        const weeklyMap: Record<string, number> = {};
        // Aktual per kegiatan kanonik per shift (untuk tabel KPI vs jadwal mingguan)
        const byActivity: Record<string, { s1: number; s2: number }> = {};
        let temuanCount = 0;
        let shift1 = 0, shift2 = 0;

        for (const r of reps) {
          const activity = r.kegiatan || r.jenisLaporan || "Lainnya";
          activityMap[activity] = (activityMap[activity] || 0) + 1;
          if (r.shift) shiftMap[r.shift] = (shiftMap[r.shift] || 0) + 1;
          if (r.temuan && r.temuan.trim()) temuanCount++;
          const isShift2 = r.shift?.toLowerCase().includes("2");
          if (r.shift?.toLowerCase().includes("1")) shift1++;
          else if (isShift2) shift2++;
          const weekKey = r.tanggal ? `${r.bulan || ""} W${r.week || ""}` : "Unknown";
          weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
          // Pemetaan kanonik (gabung kegiatan + jenisLaporan agar lebih akurat)
          const canon = canonicalSafetyActivity(`${r.kegiatan || ""} ${r.jenisLaporan || ""}`);
          if (canon) {
            if (!byActivity[canon]) byActivity[canon] = { s1: 0, s2: 0 };
            if (isShift2) byActivity[canon].s2++; else byActivity[canon].s1++;
          }
        }

        const activities = Object.entries(activityMap)
          .sort((a, b) => b[1] - a[1])
          .map(([kegiatan, count]) => ({ kegiatan, count }));

        const weekly = Object.entries(weeklyMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([week, count]) => ({ week, count }));

        const plan = computePlan(name);

        return {
          name,
          total: reps.length,
          temuanCount,
          shift1,
          shift2,
          activities,
          byActivity,
          planByActivity: plan.byActivity,
          presentWeeks: plan.presentWeeks,
          weekly,
        };
      });

      // Sort by total descending
      kpiData.sort((a, b) => b.total - a.total);

      res.json({ kpi: kpiData, totalReports: reports.length });
    } catch (error) {
      console.error("Error fetching KPI:", error);
      res.status(500).json({ message: "Gagal mengambil data KPI" });
    }
  });



  // ============================================
  // SIDAK RAMBU (Observasi Kepatuhan Rambu)
  // ============================================

  // Create Sidak Rambu session
  app.post("/api/sidak-rambu", async (req, res) => {
    try {
      const { tanggal, shift, waktuMulai, waktuSelesai, lokasi, totalSampel } = req.body;

      const sessionData = {
        tanggal,
        shift,
        waktuMulai,
        waktuSelesai,
        lokasi,
        totalSampel: parseInt(totalSampel) || 0
      };

      const session = await storage.createSidakRambuSession(sessionData);
      res.status(201).json(session);
    } catch (error: any) {
      const errorLog = `[${new Date().toISOString()}] Error creating Sidak Rambu session: ${error.message}\nStack: ${error.stack}\nInput: ${JSON.stringify(req.body)}\n\n`;
      try { fs.appendFileSync('server_error_log.txt', errorLog); } catch (e) { console.error("Failed to write log", e); }
      console.error("Error creating Sidak Rambu session:", error);
      res.status(500).json({ message: error.message || "Gagal membuat sesi" });
    }
  });

  // Get all Sidak Rambu sessions
  app.get("/api/sidak-rambu", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakRambuSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching Sidak Rambu sessions:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi" });
    }
  });

  // Get single Sidak Rambu session with details
  app.get("/api/sidak-rambu/:id", async (req, res) => {
    try {
      const session = await storage.getSidakRambuSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Sesi tidak ditemukan" });
      }

      const observations = await storage.getSidakRambuObservations(req.params.id);
      const observers = await storage.getSidakRambuObservers(req.params.id);

      res.json({
        ...session,
        observations,
        observers
      });
    } catch (error) {
      console.error("Error fetching Sidak Rambu session:", error);
      res.status(500).json({ message: "Gagal mengambil data sesi" });
    }
  });

  // Add observation to Sidak Rambu session
  app.post("/api/sidak-rambu/:id/observations", async (req, res) => {
    try {
      const sessionId = req.params.id;
      // count existing observations to determine ordinal
      const existing = await storage.getSidakRambuObservations(sessionId);
      const ordinal = existing.length + 1;

      const observationData = {
        sessionId,
        ordinal,
        nama: req.body.nama,
        noKendaraan: req.body.noKendaraan,
        perusahaan: req.body.perusahaan,
        rambuStop: req.body.rambuStop ?? true,
        rambuGiveWay: req.body.rambuGiveWay ?? true,
        rambuKecepatanMax: req.body.rambuKecepatanMax ?? true,
        rambuLaranganMasuk: req.body.rambuLaranganMasuk ?? true,
        rambuLaranganParkir: req.body.rambuLaranganParkir ?? true,
        rambuWajibHelm: req.body.rambuWajibHelm ?? true,
        rambuLaranganUTurn: req.body.rambuLaranganUTurn ?? true,
        keterangan: req.body.keterangan || ""
      };

      const observation = await storage.createSidakRambuObservation(observationData);

      // Update total sampel
      await storage.updateSidakRambuSessionSampleCount(sessionId);

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_RAMBU",
        referenceId: observation.id,
        sessionId: sessionId,
        inspectionResults: observation,
        moduleLabel: "Sidak Rambu"
      });

      res.status(201).json(observation);
    } catch (error: any) {
      console.error("Error adding Sidak Rambu observation:", error);
      res.status(500).json({ message: error.message || "Gagal menambahkan observasi" });
    }
  });

  // Add observer to Sidak Rambu session
  app.post("/api/sidak-rambu/:id/observers", async (req, res) => {
    try {
      const sessionId = req.params.id;

      const existing = await storage.getSidakRambuObservers(sessionId);
      const ordinal = existing.length + 1;

      const observerData = {
        sessionId,
        ordinal,
        nama: req.body.nama,
        perusahaan: (req.body as any).perusahaan,
        signatureDataUrl: req.body.signatureDataUrl
      };

      const observer = await storage.createSidakRambuObserver(observerData);
      res.status(201).json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Rambu observer:", error);
      res.status(500).json({ message: error.message || "Gagal menambahkan observer" });
    }
  });

  // Generate PDF for Sidak Rambu session
  app.get("/api/sidak-rambu/:id/pdf", async (req, res) => {
    try {
      const sessionId = req.params.id;

      const session = await storage.getSidakRambuSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Sesi tidak ditemukan" });
      }

      const observations = await storage.getSidakRambuObservations(sessionId);
      const observers = await storage.getSidakRambuObservers(sessionId);

      const pdfBuffer = await storage.generateSidakRambuPDF({
        session,
        observations,
        observers
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Sidak_Rambu_${session.tanggal}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Sidak Rambu PDF:", error);
      res.status(500).json({ message: error.message || "Gagal generate PDF" });
    }
  });

  // ============================================================================
  // Sidak Antrian (Queue Inspection) ROUTES
  // ============================================================================

  // Create new Sidak Antrian session

  // DEBUG ROUTE
  app.post("/api/sidak-antrian-debug", async (req, res) => {
    console.log("DEBUG ROUTE HIT");
    try {
      const sessionData = { ...req.body, createdBy: "SYSTEM" };
      console.log("DEBUG DATA:", JSON.stringify(sessionData));
      const session = insertSidakAntrianSessionSchema.parse(sessionData);
      // Force inject:
      if (!(session as any).created_by) (session as any).createdBy = "SYSTEM";

      console.log("DEBUG SESSION PARSED:", JSON.stringify(session));
      const result = await storage.createSidakAntrianSession(session);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("DEBUG ERROR:", error);
      res.status(400).json({ message: error.message });
    }
  });

  // Get all Sidak Antrian sessions
  app.get("/api/sidak-antrian/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakAntrianSessions();
      res.json(sessions);
    } catch (error: any) {
      console.error("Error fetching Sidak Antrian sessions:", error);
      res.status(500).json({ message: error.message || "Gagal mengambil data sesi" });
    }
  });

  // Get Sidak Antrian session detail

  // Add record to Sidak Antrian session

  // Add observer to Sidak Antrian session

  // ============================================================================
  // SIDAK JARAK AMAN (Safe Distance Observation) ROUTES
  // ============================================================================

  // Create new Sidak Jarak session

  // Get all Sidak Jarak sessions

  // Get Sidak Jarak session detail

  // Add record to Sidak Jarak session

  // Add observer to Sidak Jarak session

  // Generate PDF for Sidak Jarak session

  // ============================================================================
  // SIDAK KECEPATAN (Speed Observation) ROUTES
  // ============================================================================






  // ============================================================================
  // SIDAK PENCAHAYAAN (Lighting Inspection) ROUTES
  // ============================================================================






  // ============================================================================
  // SIDAK LOTO (Lock Out Tag Out) ROUTES
  // ============================================================================






  // ============================================================================
  // SIDAK DIGITAL (Digital Supervisor Inspection) ROUTES
  // ============================================================================






  // ============================================================================
  // SIDAK WORKSHOP (Workshop Equipment Checklist) ROUTES
  // ============================================================================






  // NOTE: Sidak Roster routes are already defined earlier in the file (around line 7270-7517)
  // Duplicate routes removed to prevent conflicts

  // ============================================================================
  // SIDAK JARAK ROUTES
  // ============================================================================






  // ============================================================================
  // SIDAK ANTRIAN (Queue Observation) ROUTES  
  // ============================================================================

  // Create new Sidak Antrian session

  // Get all Sidak Antrian sessions

  // Get Sidak Antrian session detail

  // Add record to Sidak Antrian session

  // Add observer to Sidak Antrian session

  // Generate PDF for Sidak Antrian session
  app.get("/api/sidak-antrian/:id/pdf", async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getSidakAntrianSession(sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const records = await storage.getSidakAntrianRecords(sessionId);
      const observers = await storage.getSidakAntrianObservers(sessionId);

      const pdfBuffer = await storage.generateSidakAntrianPDF({
        session,
        records,
        observers
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Sidak_Antrian_${session.tanggalPelaksanaan}.pdf`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Sidak Antrian PDF:", error);
      res.status(500).json({ message: error.message || "Gagal generate PDF" });
    }
  });

  // ============================================
  // PHOTO UPLOAD CONFIGURATIONS FOR ALL SIDAK FORMS
  // ============================================

  // Multer configurations for each form
  const createPhotoUpload = (_formName: string) => multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) { return cb(null, true); }
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  });

  const antrianUpload = createPhotoUpload('antrian');
  const jarakUpload = createPhotoUpload('jarak');
  const kecepatanUpload = createPhotoUpload('kecepatan');
  const pencahayaanUpload = createPhotoUpload('pencahayaan');
  const lotoUpload = createPhotoUpload('loto');
  const digitalUpload = createPhotoUpload('digital');
  const workshopUpload = createPhotoUpload('workshop');

  // Upload photos - Antrian
  app.post("/api/sidak-antrian/:id/upload-photos", antrianUpload.array('photos', 6), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }
      const session = await storage.getSidakAntrianSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });
      const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const allPhotos = [...(session.activityPhotos || []), ...photoPaths].slice(0, 6);
      const updatedSession = await storage.updateSidakAntrianSession(req.params.id, { activityPhotos: allPhotos });
      res.json({ message: "Photos uploaded", photos: allPhotos, session: updatedSession });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to upload photos", details: error.message });
    }
  });

  app.delete("/api/sidak-antrian/:id/photos/:index", async (req, res) => {
    try {
      const session = await storage.getSidakAntrianSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const photos = session.activityPhotos || [];
      const index = parseInt(req.params.index);
      if (index < 0 || index >= photos.length) return res.status(400).json({ message: "Invalid index" });
      const photoPath = photos[index];
      const filePath = path.join(process.cwd(), photoPath.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const updatedPhotos = photos.filter((_, i) => i !== index);
      const updatedSession = await storage.updateSidakAntrianSession(req.params.id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedSession?.activityPhotos || [] });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete photo", error: error.message });
    }
  });

  // Upload photos - Jarak
  app.post("/api/sidak-jarak/:id/upload-photos", jarakUpload.array('photos', 6), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No photos" });
      const session = await storage.getSidakJarakSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Not found" });
      const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const allPhotos = [...(session.activityPhotos || []), ...photoPaths].slice(0, 6);
      await storage.updateSidakJarakSession(req.params.id, { activityPhotos: allPhotos });
      res.json({ photos: allPhotos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sidak-jarak/:id/photos/:index", async (req, res) => {
    try {
      const session = await storage.getSidakJarakSession(req.params.id);
      if (!session) return res.status(404).json({ message: "Not found" });
      const photos = session.activityPhotos || [];
      const index = parseInt(req.params.index);
      if (index < 0 || index >= photos.length) return res.status(400).json({ message: "Invalid" });
      const filePath = path.join(process.cwd(), photos[index].replace(/^\//, ''));
      fs.existsSync(filePath) && fs.unlinkSync(filePath);
      const updatedPhotos = photos.filter((_, i) => i !== index);
      await storage.updateSidakJarakSession(req.params.id, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedPhotos });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Photo routes for Kecepatan, Pencahayaan, LOTO, Digital, Workshop (compact version)
  const photoRoutes = [
    { name: 'kecepatan', upload: kecepatanUpload, get: storage.getSidakKecepatanSession.bind(storage), update: storage.updateSidakKecepatanSession.bind(storage) },
    { name: 'pencahayaan', upload: pencahayaanUpload, get: storage.getSidakPencahayaanSession.bind(storage), update: storage.updateSidakPencahayaanSession.bind(storage) },
    { name: 'loto', upload: lotoUpload, get: storage.getSidakLotoSession.bind(storage), update: storage.updateSidakLotoSession.bind(storage) },
    { name: 'digital', upload: digitalUpload, get: storage.getSidakDigitalSession.bind(storage), update: storage.updateSidakDigitalSession.bind(storage) },
    { name: 'workshop', upload: workshopUpload, get: storage.getSidakWorkshopSession.bind(storage), update: storage.updateSidakWorkshopSession.bind(storage) }
  ];

  photoRoutes.forEach(({ name, upload, get, update }) => {
    app.post(`/api/sidak-${name}/:id/upload-photos`, upload.array('photos', 6), async (req, res) => {
      try {
        const files = req.files as Express.Multer.File[];
        if (!files?.length) return res.status(400).json({ error: "No photos" });
        const session = await get(req.params.id);
        if (!session) return res.status(404).json({ error: "Not found" });
        const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
        const allPhotos = [...(session.activityPhotos || []), ...photoPaths].slice(0, 6);
        await update(req.params.id, { activityPhotos: allPhotos });
        res.json({ photos: allPhotos });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  // Configure Multer for Sidak Rambu
  const sidakRambuPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) { return cb(null, true); }
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  });

  // Upload activity photos for Sidak Rambu session (max 6 photos)
  app.post("/api/sidak-rambu/:id/upload-photos", sidakRambuPhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }

      const session = await storage.getSidakRambuSession(id);
      if (!session) return res.status(404).json({ error: "Sidak Rambu session not found" });

      const photoPaths = await Promise.all(files.map(f => dbStorage.uploadFile(f).then(r => r.url)));
      const existingPhotos = session.activityPhotos || [];
      const allPhotos = [...existingPhotos, ...photoPaths].slice(0, 6);

      const updatedSession = await storage.updateSidakRambuSession(id, { activityPhotos: allPhotos });

      res.json({ message: "Photos uploaded successfully", photos: allPhotos, session: updatedSession });
    } catch (error: any) {
      console.error("Error uploading Sidak Rambu photos:", error);
      res.status(500).json({ error: "Failed to upload photos", details: error.message });
    }
  });


  // Delete photo from Sidak Rambu session
  app.delete("/api/sidak-rambu/:id/photos/:index", async (req, res) => {
    try {
      const index = parseInt(req.params.index);
      const session = await storage.getSidakRambuSession(req.params.id);

      if (!session) {
        return res.status(404).json({ message: "Sesi tidak ditemukan" });
      }

      const currentPhotos = session.activityPhotos || [];
      if (index < 0 || index >= currentPhotos.length) {
        return res.status(400).json({ message: "Index foto tidak valid" });
      }

      // Delete physical file
      const photoPath = currentPhotos[index];
      const fileName = path.basename(photoPath);
      const filePath = path.join(process.cwd(), 'uploads', 'sidak-rambu', fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      const updatedPhotos = currentPhotos.filter((_, i) => i !== index);

      const updatedSession = await storage.updateSidakRambuSession(req.params.id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession?.activityPhotos || [] });
    } catch (error: any) {
      console.error("Error deleting photo:", error);
      res.status(500).json({ message: "Gagal menghapus foto", error: error.message });
    }
  });

  /*
  // Start of OLD ROUTES (Removed)
  // Request upload URL for Sidak Rambu photo (TEMPORARILY DISABLED due to library mismatch)
  // ...
  */

  // ============================================
  // SAFETY PATROL TEMPLATES (Knowledge Base)
  // ============================================

  // Get all templates
  app.get("/api/safety-patrol/templates", async (req, res) => {
    try {
      const templates = await storage.getAllSafetyPatrolTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching safety patrol templates:", error);
      res.status(500).json({ message: "Gagal mengambil data templates" });
    }
  });

  // Get active templates only
  app.get("/api/safety-patrol/templates/active", async (req, res) => {
    try {
      const templates = await storage.getActiveSafetyPatrolTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active templates:", error);
      res.status(500).json({ message: "Gagal mengambil data templates aktif" });
    }
  });

  // Get single template
  app.get("/api/safety-patrol/templates/:id", async (req, res) => {
    try {
      const template = await storage.getSafetyPatrolTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ message: "Template tidak ditemukan" });
      }
      res.json(template);
    } catch (error) {
      console.error("Error fetching template:", error);
      res.status(500).json({ message: "Gagal mengambil data template" });
    }
  });

  // Create template
  app.post("/api/safety-patrol/templates", async (req, res) => {
    try {
      const template = await storage.createSafetyPatrolTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Gagal membuat template" });
    }
  });

  // Update template
  app.patch("/api/safety-patrol/templates/:id", async (req, res) => {
    try {
      console.log("Updating template:", req.params.id, "with data:", JSON.stringify(req.body, null, 2));
      const template = await storage.updateSafetyPatrolTemplate(req.params.id, req.body);
      if (!template) {
        return res.status(404).json({ message: "Template tidak ditemukan" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("Error updating template:", error?.message || error);
      res.status(500).json({ message: error?.message || "Gagal mengupdate template" });
    }
  });

  // Delete template
  app.delete("/api/safety-patrol/templates/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteSafetyPatrolTemplate(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Template tidak ditemukan" });
      }
      res.json({ message: "Template berhasil dihapus" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Gagal menghapus template" });
    }
  });

  // ============================================
  // SIDAK PDF DOWNLOAD ROUTES
  // ============================================

  // Download PDF - Sidak Antrian
  app.get("/api/sidak-antrian/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakAntrianSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakAntrianRecords(req.params.sessionId);
      const observers = await storage.getSidakAntrianObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakAntrianPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Antrian_${session.tanggalPelaksanaan}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Antrian PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak Jarak
  app.get("/api/sidak-jarak/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakJarakSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakJarakRecords(req.params.sessionId);
      const observers = await storage.getSidakJarakObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakJarakPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Jarak_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Jarak PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak Kecepatan
  app.get("/api/sidak-kecepatan/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakKecepatanSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakKecepatanRecords(req.params.sessionId);
      const observers = await storage.getSidakKecepatanObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakKecepatanPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Kecepatan_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Kecepatan PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak Pencahayaan
  app.get("/api/sidak-pencahayaan/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakPencahayaanSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakPencahayaanRecords(req.params.sessionId);
      const observers = await storage.getSidakPencahayaanObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakPencahayaanPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Pencahayaan_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Pencahayaan PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak LOTO
  app.get("/api/sidak-loto/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakLotoSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakLotoRecords(req.params.sessionId);
      const observers = await storage.getSidakLotoObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakLotoPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_LOTO_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating LOTO PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak Digital
  app.get("/api/sidak-digital/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakDigitalSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakDigitalRecords(req.params.sessionId);
      const observers = await storage.getSidakDigitalObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakDigitalPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Digital_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Digital PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });

  // Download PDF - Sidak Workshop
  app.get("/api/sidak-workshop/:sessionId/pdf", async (req, res) => {
    try {
      const session = await storage.getSidakWorkshopSession(req.params.sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      const records = await storage.getSidakWorkshopRecords(req.params.sessionId);
      const observers = await storage.getSidakWorkshopObservers(req.params.sessionId);

      const pdfBuffer = await storage.generateSidakWorkshopPDF({ session, records, observers });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Sidak_Workshop_${session.tanggal}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating Workshop PDF:", error);
      res.status(500).json({ error: "Failed to generate PDF", details: error.message });
    }
  });


  // Delete TNA Entry

  // ============================================
  // COMPETENCY MONITORING ROUTES
  // ============================================

  // Trigger Daily Monitoring Log Generation (Manual or Scheduled)
  // Trigger Daily Monitoring Log Generation (Manual or Scheduled)
  app.post("/api/hse/tna/entries/simple", async (req, res) => {
    try {
      console.log("DEBUG: POST /api/hse/tna/entries/simple called");
      console.log("DEBUG: Payload:", JSON.stringify(req.body, null, 2));

      const { employeeId, trainingId, certificateNumber, issuer, issueDate, expiryDate, evidenceFile } = req.body;
      // Default to current year string e.g. "2026"
      const period = new Date().getFullYear().toString();

      console.log(`DEBUG: Getting summary for Employee ${employeeId}, Period ${period}`);
      // 1. Get or Create Summary
      const summary = await storage.createOrGetTnaSummary(employeeId, period);
      console.log("DEBUG: Summary ID:", summary.id);

      // 2. Check if entry exists for this training in this summary
      const existingEntries = await storage.getTnaEntries(summary.id);
      // NOTE: trainingId is a string/UUID, do NOT use parseInt
      const existingEntry = existingEntries.find(e => e.trainingId === trainingId);
      console.log("DEBUG: Existing Entry Found:", !!existingEntry);

      let entry;
      // Define common update data
      const updateData = {
        certificateNumber,
        issuer,
        evidenceFile, // Add evidence file URL
        issueDate: issueDate ? format(new Date(issueDate), 'yyyy-MM-dd') : null,
        expiryDate: expiryDate ? format(new Date(expiryDate), 'yyyy-MM-dd') : null,
        actualStatus: 'C', // Auto-set to Complied since we are adding a cert
        actualDate: format(new Date(), 'yyyy-MM-dd')
      };

      if (existingEntry) {
        console.log("DEBUG: Updating existing entry", existingEntry.id);
        // Update existing
        entry = await storage.updateTnaEntry(existingEntry.id, updateData);
      } else {
        console.log("DEBUG: Creating new entry");
        // Create new
        entry = await storage.createTnaEntry({
          tnaSummaryId: summary.id,
          trainingId: trainingId,
          planStatus: 'M', // Default Mandatory
          ...updateData
        });
      }

      console.log("DEBUG: Entry saved successfully:", entry.id);
      res.json(entry);
    } catch (error: any) {
      console.error("Error creating simple TNA entry DETAILS:", error);
      console.error("Stack:", error.stack);
      res.status(500).json({ error: error.message, details: error.toString() });
    }
  });

  app.post("/api/hse/tna/monitoring/run", async (req, res) => {
    try {
      console.log("Running Daily Competency Monitoring...");
      const today = new Date();
      const todayStr = format(today, "yyyy-MM-dd");

      // Get all raw entries with certificate details
      const allEntries = await storage.getAllRawTnaEntries();

      // Filter entries relevant for monitoring (have expiry date)
      const validEntries = allEntries.filter(e => e.expiryDate && e.id);

      let processedCount = 0;
      let insertedCount = 0;

      for (const entry of validEntries) {
        if (!entry.expiryDate) continue;

        const expiry = parseISO(entry.expiryDate);
        if (!isValid(expiry)) continue;

        const diff = differenceInDays(expiry, today);
        let status = "Aktif";

        if (diff < 0) {
          status = "Expired";
        } else if (diff <= 30) {
          status = "Akan Habis";
        }

        await storage.createCompetencyMonitoringLog({
          tnaEntryId: entry.id,
          logDate: todayStr,
          status: status,
          expiryDaysRemaining: diff
        });

        processedCount++;
        insertedCount++;
      }

      res.json({
        message: "Monitoring completed",
        processed: processedCount,
        inserted: insertedCount,
        date: todayStr
      });
    } catch (error: any) {
      console.error("Error running competency monitoring:", error);
      res.status(500).json({ message: "Failed to run monitoring", error: error.message });
    }
  });

  // Get Monitoring Logs for a specific Entry
  app.get("/api/hse/tna/monitoring/logs/:entryId", async (req, res) => {
    try {
      const logs = await storage.getCompetencyMonitoringLogs(req.params.entryId);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch logs", error: error.message });
    }
  });


  // ============================================
  // NEW MONITORING KOMPETENSI ROUTES
  // ============================================

  app.get("/api/monitoring-kompetensi", async (req, res) => {
    try {
      const data = await storage.getKompetensiMonitoring();
      res.json(data);
    } catch (error) {
      console.error("Error fetching monitoring kompetensi:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/monitoring-kompetensi", async (req, res) => {
    try {
      const parsed = insertKompetensiMonitoringSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }
      const data = await storage.createKompetensiMonitoring(parsed.data);
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating monitoring kompetensi:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/monitoring-kompetensi/:id", async (req, res) => {
    try {
      const parsed = insertKompetensiMonitoringSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }
      const data = await storage.updateKompetensiMonitoring(req.params.id, parsed.data);
      if (!data) return res.status(404).json({ error: "Not found" });
      res.json(data);
    } catch (error) {
      console.error("Error updating monitoring kompetensi:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/monitoring-kompetensi/:id", async (req, res) => {
    try {
      console.log(`[DELETE] Request for ID: ${req.params.id}`);
      const success = await storage.deleteKompetensiMonitoring(req.params.id);
      console.log(`[DELETE] Result for ID ${req.params.id}: ${success}`);

      if (!success) {
        return res.status(404).json({ error: `Not found. ID: ${req.params.id}` });
      }
      res.json({ success: true, message: "Deleted successfully" });
    } catch (error) {
      console.error("Error deleting monitoring kompetensi:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/kompetensi/files/:filename", async (req, res) => {
    const filename = req.params.filename;
    // Basic sanitization
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Invalid filename');
    }

    const filePath = path.join(process.cwd(), 'uploads', 'kompetensi', filename);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // Open in browser
      res.sendFile(filePath);
    } else {
      res.status(404).send('File not found');
    }
  });

  // ============================================
  // DOCUMENT MASTERLIST ROUTES (HSE K3)
  // ============================================

  // Get all documents in masterlist
  app.get("/api/document-masterlist", async (req, res) => {
    try {
      const data = await storage.getDocumentMasterlist();
      res.json(data);
    } catch (error) {
      console.error("Error fetching document masterlist:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get single document with versions
  app.get("/api/document-masterlist/:id", async (req, res) => {
    try {
      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      const versions = await storage.getDocumentVersions(req.params.id);
      res.json({ document, versions });
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create new document in masterlist
  app.post("/api/document-masterlist", async (req, res) => {
    const logPath = path.join(process.cwd(), 'server_debug.log');
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] CREATE-DOC Attempt: ${JSON.stringify(req.body)}\n`);
      console.log("[CREATE-DOC] Request body:", JSON.stringify(req.body, null, 2));
      const data = await storage.createDocumentMasterlist(req.body);
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] CREATE-DOC Success\n`);
      console.log("[CREATE-DOC] Document created successfully");
      res.status(201).json(data);
    } catch (error: any) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] CREATE-DOC Error: ${error.message}\nStack: ${error.stack}\n`);
      console.error("[CREATE-DOC] Error creating document:", error.message);
      console.dir(error, { depth: null });
      if (error?.message?.includes('unique')) {
        return res.status(400).json({ error: "Kode dokumen sudah ada" });
      }
      // Return actual error message for debugging
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Update document metadata
  // Enforcement: transisi ke PUBLISHED hanya boleh setelah approval APPROVED/SIGNED.
  app.patch("/api/document-masterlist/:id", async (req, res) => {
    try {
      const targetStatus = req.body?.lifecycleStatus as string | undefined;
      const restrictedStatuses = new Set(["PUBLISHED", "SIGNED"]);
      if (targetStatus && restrictedStatuses.has(targetStatus)) {
        const existing = await storage.getDocumentById(req.params.id);
        if (!existing) return res.status(404).json({ error: "Not found" });
        // Allow if currently APPROVED, SIGNED, or PUBLISHED (idempotent transitions)
        const okFromStatuses = new Set(["APPROVED", "ESIGN_PENDING", "SIGNED", "PUBLISHED"]);
        if (!okFromStatuses.has(existing.lifecycleStatus)) {
          return res.status(403).json({
            error: "Mandatory approval — dokumen harus di-approve dulu sebelum bisa di-PUBLISH.",
            currentStatus: existing.lifecycleStatus,
          });
        }
      }
      const data = await storage.updateDocumentMasterlist(req.params.id, req.body);
      if (!data) return res.status(404).json({ error: "Not found" });
      res.json(data);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete document (and all versions)
  app.delete("/api/document-masterlist/:id", async (req, res) => {
    try {
      const success = await storage.deleteDocumentMasterlist(req.params.id);
      if (!success) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // APPROVAL WORKFLOW ROUTES (Phase 2)
  // ============================================

  // Submit document for approval (Review -> Approval)
  app.post("/api/document-masterlist/:id/submit", async (req, res) => {
    try {
      const { versionId, userId, userName } = req.body;

      if (!versionId || !userId) {
        return res.status(400).json({ error: "VersionId and UserId required" });
      }

      // 1. Create Approval Workflow
      const result = await storage.submitDocumentForApproval(req.params.id, versionId, userId, userName);

      // 2. Trigger Mystic AI Notification (Sect Head)
      // In a real scenario, we would fetch the actual Sect Head's phone number.
      // For now, we use a placeholder or admin number for demo.
      try {
        await whatsappService.sendAdminNotification(
          `🤖 *MYSTIC AI - APPROVAL ALERT*\n\n` +
          `Mohon review dokumen:\n` +
          `Doc ID: ${req.params.id}\n` +
          `Initiated by: ${userName}\n\n` +
          `Status: Waiting for Sect Head Review`
        );
      } catch (waError) {
        console.error("WhatsApp Error:", waError);
      }

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error submitting document:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Get approval history for a document
  app.get("/api/document-masterlist/:id/approvals", async (req, res) => {
    try {
      const approvals = await storage.getDocumentApprovals(req.params.id);
      res.json(approvals);
    } catch (error) {
      console.error("Error getting approvals:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve/Reject a step
  app.post("/api/document-masterlist/:id/approve", async (req, res) => {
    try {
      const { approvalId, stepNumber, userId, userName, decision, notes } = req.body;

      const result = await storage.approveDocumentStep(approvalId, stepNumber, userId, userName, decision, notes);

      // Trigger Mystic AI Notification for Next Step
      if (result.status === "NEXT_STEP" || result.status === "APPROVED") {
        try {
          const nextMsg = result.status === "APPROVED"
            ? `✅ *DOCUMENT APPROVED*\n\nDokumen ${req.params.id} telah disahkan oleh PJO. Siap untuk didistribusikan.`
            : `🔄 *MYSTIC AI - REVIEW COMPLETED*\n\nSect Head telah menyetujui. Giliran PJO untuk pengesahan.\nDoc ID: ${req.params.id}`;

          await whatsappService.sendAdminNotification(nextMsg);
        } catch (e) { console.error("WA Error", e); }
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error processing approval:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Distribute Document (WhatsApp Blast)
  app.post("/api/document-masterlist/:id/distribute", async (req, res) => {
    try {
      const { distributionList, message } = req.body; // List of employee IDs or phones

      // In a real app, we loop through distributionList and send WA to each.
      // For demo/prototype, we send 1 admin notification summarizing the blast.

      await whatsappService.sendAdminNotification(
        `📢 *MYSTIC AI - DOCUMENT DISTRIBUTION*\n\n` +
        `Dokumen ${req.params.id} telah didistribusikan kepada seluruh karyawan.\n` +
        `Pesan: "${message || 'Silakan cek aplikasi OneTalent untuk dokumen terbaru.'}"`
      );

      // Simulating update distribution log in DB (omitted for brevity, can be added to storage if needed)

      res.json({ success: true, message: "Distribution started via Mystic AI" });
    } catch (error) {
      console.error("Distribution error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Unified Approval Inbox (Documents + Change Requests)
  app.get("/api/approval-inbox", async (req, res) => {
    try {
      const userId = req.query.userId as string;

      // 1. Get Pending Document Approvals
      const inbox = await storage.getPendingApprovals(userId);

      // 2. Get pending change requests
      const changeRequestsInfo = await storage.getPendingChangeRequests();

      // Normalize and combine
      const unifiedInbox = [
        ...inbox.map(item => ({
          ...item,
          type: "APPROVAL",
          sender_name: item.initiatedByName,
          received_at: item.initiatedAt
        })),
        ...changeRequestsInfo.map(cr => ({
          ...cr,
          type: "CHANGE_REQUEST",
          title: cr.documentTitle,
          document_code: cr.documentCode,
          step_name: "Change Request Review",
          sender_name: cr.requestedByName,
          received_at: cr.requestedAt,
          requestId: cr.id // Change Request ID
        }))
      ];

      // Sort by received/requested date desc
      unifiedInbox.sort((a: any, b: any) => {
        const dateA = new Date(a.received_at || a.requestedAt).getTime();
        const dateB = new Date(b.received_at || b.requestedAt).getTime();
        return dateB - dateA;
      });

      res.json(unifiedInbox);
    } catch (error) {
      console.error("Error fetching approval inbox:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // SMKP CLAUSES (master data + mapping)
  // ============================================
  app.get("/api/smkp-clauses", async (_req, res) => {
    try {
      const rows = await db.select().from(smkpClauses)
        .where(eq(smkpClauses.isActive, true))
        .orderBy(asc(smkpClauses.sortOrder), asc(smkpClauses.clauseNo));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching smkp clauses:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/smkp-clauses", async (req, res) => {
    try {
      const parsed = insertSmkpClauseSchema.parse(req.body);
      const [row] = await db.insert(smkpClauses).values(parsed).returning();
      res.status(201).json(row);
    } catch (error: any) {
      console.error("Error creating smkp clause:", error);
      if (error?.message?.includes("unique")) {
        return res.status(400).json({ error: "Nomor klausul sudah ada" });
      }
      res.status(400).json({ error: error.message || "Bad request" });
    }
  });

  // Mapping: each clause + dokumen yang terkait + status mapping
  app.get("/api/smkp-mapping", async (_req, res) => {
    try {
      const clauses = await db.select().from(smkpClauses)
        .where(eq(smkpClauses.isActive, true))
        .orderBy(asc(smkpClauses.sortOrder), asc(smkpClauses.clauseNo));
      const docs = await db.select({
        id: documentMasterlist.id,
        documentCode: documentMasterlist.documentCode,
        title: documentMasterlist.title,
        category: documentMasterlist.category,
        department: documentMasterlist.department,
        lifecycleStatus: documentMasterlist.lifecycleStatus,
        smkpClause: documentMasterlist.smkpClause,
      }).from(documentMasterlist);

      const mapping = clauses.map((c) => {
        const related = docs.filter((d) => d.smkpClause === c.clauseNo);
        const hasPublished = related.some((d) => d.lifecycleStatus === "PUBLISHED" || d.lifecycleStatus === "SIGNED");
        const hasInProgress = related.some((d) => ["DRAFT", "IN_REVIEW", "APPROVED", "ESIGN_PENDING"].includes(d.lifecycleStatus));
        let status: "COVERED" | "PARTIAL" | "GAP" = "GAP";
        if (hasPublished) status = "COVERED";
        else if (hasInProgress) status = "PARTIAL";
        return { ...c, documents: related, status };
      });

      const summary = {
        covered: mapping.filter((m) => m.status === "COVERED").length,
        partial: mapping.filter((m) => m.status === "PARTIAL").length,
        gap: mapping.filter((m) => m.status === "GAP").length,
        total: mapping.length,
      };

      res.json({ mapping, summary });
    } catch (error) {
      console.error("Error fetching smkp mapping:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // CHECKLIST TEMPLATES (master rekaman wajib)
  // ============================================
  app.get("/api/checklist-templates", async (_req, res) => {
    try {
      const rows = await db.select().from(checklistTemplates)
        .where(eq(checklistTemplates.isActive, true))
        .orderBy(asc(checklistTemplates.sortOrder), asc(checklistTemplates.itemName));
      res.json(rows);
    } catch (error) {
      console.error("Error fetching checklist templates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/checklist-templates", async (req, res) => {
    try {
      const parsed = insertChecklistTemplateSchema.parse(req.body);
      const [row] = await db.insert(checklistTemplates).values(parsed).returning();
      res.status(201).json(row);
    } catch (error: any) {
      console.error("Error creating checklist template:", error);
      res.status(400).json({ error: error.message || "Bad request" });
    }
  });

  app.patch("/api/checklist-templates/:id", async (req, res) => {
    try {
      const [row] = await db.update(checklistTemplates)
        .set({ ...req.body, updatedAt: new Date() })
        .where(eq(checklistTemplates.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (error) {
      console.error("Error updating checklist template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/checklist-templates/:id", async (req, res) => {
    try {
      await db.update(checklistTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(checklistTemplates.id, req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting checklist template:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // MONTHLY CHECKLIST (auto-generate on-read)
  // ============================================
  app.get("/api/monthly-checklist", async (req, res) => {
    try {
      const year = parseInt(req.query.year as string, 10);
      const month = parseInt(req.query.month as string, 10);
      if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ error: "year & month required (month 1-12)" });
      }

      const templates = await db.select().from(checklistTemplates)
        .where(eq(checklistTemplates.isActive, true))
        .orderBy(asc(checklistTemplates.sortOrder), asc(checklistTemplates.itemName));

      const existing = await db.select().from(monthlyChecklists)
        .where(and(eq(monthlyChecklists.year, year), eq(monthlyChecklists.month, month)));

      const existingByTemplate = new Map(existing.map((e) => [e.templateId, e]));

      // Auto-generate missing rows for active templates
      const toInsert = templates
        .filter((t) => !existingByTemplate.has(t.id))
        .map((t) => ({
          year,
          month,
          templateId: t.id,
          itemName: t.itemName,
          category: t.category ?? null,
        }));

      let inserted: any[] = [];
      if (toInsert.length > 0) {
        inserted = await db.insert(monthlyChecklists).values(toInsert).returning();
      }

      const all = [...existing, ...inserted];
      // Filter only rows whose template still active
      const activeIds = new Set(templates.map((t) => t.id));
      const filtered = all.filter((r) => activeIds.has(r.templateId));
      const completed = filtered.filter((r) => r.isCompleted).length;

      res.json({
        items: filtered,
        summary: {
          total: filtered.length,
          completed,
          pending: filtered.length - completed,
          progressPercent: filtered.length === 0 ? 0 : Math.round((completed / filtered.length) * 100),
        },
      });
    } catch (error) {
      console.error("Error fetching monthly checklist:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/monthly-checklist/:id", async (req, res) => {
    try {
      const body = req.body ?? {};
      const patch: any = {};
      if (typeof body.isCompleted === "boolean") {
        patch.isCompleted = body.isCompleted;
        patch.completedAt = body.isCompleted ? new Date() : null;
        if (body.completedBy) patch.completedBy = body.completedBy;
      }
      if (body.fileUrl !== undefined) patch.fileUrl = body.fileUrl;
      if (body.fileName !== undefined) patch.fileName = body.fileName;
      if (body.notes !== undefined) patch.notes = body.notes;
      if (body.picId !== undefined) patch.picId = body.picId;
      const [row] = await db.update(monthlyChecklists)
        .set(patch)
        .where(eq(monthlyChecklists.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (error) {
      console.error("Error updating monthly checklist:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Cheap count for sidebar badge (polled every 60s)
  app.get("/api/approval-inbox/count", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.json({ count: 0 });
      const [pendingApprovals, pendingChangeRequests] = await Promise.all([
        storage.getPendingApprovals(userId),
        storage.getPendingChangeRequests(),
      ]);
      res.json({ count: pendingApprovals.length + pendingChangeRequests.length });
    } catch (error) {
      console.error("Error fetching approval inbox count:", error);
      res.status(500).json({ count: 0 });
    }
  });


  // Approve or Reject
  app.post("/api/approvals/:assigneeId/decide", async (req, res) => {
    try {
      const { decision, comments } = req.body;

      if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
        return res.status(400).json({ error: "Invalid decision" });
      }

      const result = await storage.processApprovalDecision(req.params.assigneeId, {
        decision,
        comments,
      });

      res.json(result);
    } catch (error) {
      console.error("Error processing approval:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all approvals for a document

  // ============================================
  // DISTRIBUTION ROUTES (Phase 3)
  // ============================================

  // Distribute document to recipients

  // Get documents distributed to current user
  app.get("/api/my-documents", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const docs = await storage.getMyDocuments(userId);
      res.json(docs);
    } catch (error) {
      console.error("Error fetching my documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Acknowledge document receipt
  app.post("/api/distributions/:id/acknowledge", async (req, res) => {
    try {
      const result = await storage.acknowledgeDocument(req.params.id, {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json(result);
    } catch (error) {
      console.error("Error acknowledging document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get distribution status for a document
  app.get("/api/document-masterlist/:id/distributions", async (req, res) => {
    try {
      const distributions = await storage.getDocumentDistributions(req.params.id);
      res.json(distributions);
    } catch (error) {
      console.error("Error fetching distributions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Publish document (move from APPROVED to PUBLISHED)
  app.post("/api/document-masterlist/:id/publish", async (req, res) => {
    try {
      const result = await storage.publishDocument(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error publishing document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // EXTERNAL DOCUMENT REGISTER (Phase 5)
  // ============================================

  // Get all external documents
  app.get("/api/external-documents", async (req, res) => {
    try {
      const data = await storage.getExternalDocuments();
      res.json(data);
    } catch (error) {
      console.error("Error fetching external documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create external document
  app.post("/api/external-documents", async (req, res) => {
    try {
      const data = await storage.createExternalDocument(req.body);
      res.status(201).json(data);
    } catch (error) {
      console.error("Error creating external document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update external document
  app.patch("/api/external-documents/:id", async (req, res) => {
    try {
      const data = await storage.updateExternalDocument(req.params.id, req.body);
      res.json(data);
    } catch (error) {
      console.error("Error updating external document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete external document
  app.delete("/api/external-documents/:id", async (req, res) => {
    try {
      await storage.deleteExternalDocument(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting external document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // RECORD CONTROL & RETENTION
  // ============================================

  // Get documents flagged for retention (Stub for now)
  app.get("/api/documents/retention-candidates", async (req, res) => {
    try {
      // In a real scenario, we would calculate this based on publish_date + retention_period
      // For now, return empty array to fix 404
      res.json([]);
    } catch (error) {
      console.error("Error fetching retention candidates:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get disposal records
  app.get("/api/disposal-records", async (req, res) => {
    try {
      const records = await storage.getDisposalRecords();
      res.json(records);
    } catch (error) {
      console.error("Error fetching disposal records:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Create disposal record
  app.post("/api/disposal-records", async (req, res) => {
    try {
      const record = await storage.createDisposalRecord(req.body);
      res.status(201).json(record);
    } catch (error) {
      console.error("Error creating disposal record:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // ESIGN ROUTES (Phase 5)
  // ============================================

  // Create eSign request
  app.post("/api/document-masterlist/:id/esign", async (req, res) => {
    try {
      const result = await storage.createEsignRequest(req.params.id, req.body);
      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating esign request:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Get eSign status for a document
  app.get("/api/document-masterlist/:id/esign", async (req, res) => {
    try {
      const data = await storage.getEsignRequests(req.params.id);
      res.json(data);
    } catch (error) {
      console.error("Error fetching esign requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // uSign webhook callback (for status updates)
  app.post("/api/webhooks/usign", async (req, res) => {
    try {
      const { requestId, status, signedFileUrl, failedReason } = req.body;

      if (!requestId || !status) {
        return res.status(400).json({ error: "Missing requestId or status" });
      }

      const result = await storage.updateEsignStatus(requestId, {
        status,
        signedFileUrl,
        failedReason,
      });

      res.json({ success: true, result });
    } catch (error) {
      console.error("Error processing uSign webhook:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Retry failed eSign request
  app.post("/api/esign/:id/retry", async (req, res) => {
    try {
      const result = await storage.retryEsignRequest(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error retrying esign request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // DOCUMENT VERSION ROUTES
  // ============================================

  // GET List Versions - Safe endpoint as requested
  app.get("/api/document-masterlist/:id/versions", async (req, res) => {
    try {
      const documentId = req.params.id;
      if (!documentId) {
        return res.status(400).json({ error: "Invalid document ID" });
      }

      const currentDoc = await storage.getDocumentById(documentId);
      if (!currentDoc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Safe access to versions, returning empty array if undefined
      // @ts-ignore
      const versions = currentDoc.versions || [];

      res.status(200).json({
        document_id: documentId,
        versions: versions
      });
    } catch (error) {
      console.error("Error fetching document versions:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Save version from rich content (TipTap) — no file upload
  app.post("/api/document-masterlist/:id/versions/from-content", async (req, res) => {
    try {
      const documentId = req.params.id;
      const { contentHtml, contentJson, changesNote, fileName } = req.body ?? {};
      const userId = (req as any).user?.id || req.body?.userId;
      const userName = (req as any).user?.username || req.body?.userName || "Unknown";

      if (!contentHtml) return res.status(400).json({ error: "contentHtml required" });

      const doc = await storage.getDocumentById(documentId);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      // Determine next revision number for current version
      const existing = await db.select().from(documentVersions)
        .where(eq(documentVersions.documentId, documentId));
      const sameVersion = existing.filter((v: any) => v.versionNumber === doc.currentVersion);
      const nextRev = sameVersion.length > 0
        ? Math.max(...sameVersion.map((v: any) => v.revisionNumber ?? 0)) + 1
        : 0;

      const [newVersion] = await db.insert(documentVersions).values({
        documentId,
        versionNumber: doc.currentVersion,
        revisionNumber: nextRev,
        fileName: fileName || `${doc.documentCode}-v${doc.currentVersion}.${nextRev}.html`,
        filePath: "(rich-content)",
        mimeType: "text/html",
        status: "DRAFT",
        contentHtml,
        contentJson: contentJson ?? null,
        changesNote: changesNote ?? null,
        uploadedBy: userId || "system",
        uploadedByName: userName,
      }).returning();

      await db.update(documentMasterlist)
        .set({ currentRevision: nextRev, updatedAt: new Date() })
        .where(eq(documentMasterlist.id, documentId));

      res.status(201).json(newVersion);
    } catch (error: any) {
      console.error("Error saving rich content version:", error);
      res.status(500).json({ error: error?.message || "Internal server error" });
    }
  });

  // Get latest rich content for document (for editor load)
  app.get("/api/document-masterlist/:id/content", async (req, res) => {
    try {
      const documentId = req.params.id;
      const rows = await db.select().from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.createdAt))
        .limit(1);
      const latest = rows[0];
      res.json({
        contentHtml: latest?.contentHtml ?? null,
        contentJson: latest?.contentJson ?? null,
        versionNumber: latest?.versionNumber ?? 0,
        revisionNumber: latest?.revisionNumber ?? 0,
      });
    } catch (error) {
      console.error("Error fetching document content:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/document-masterlist/:id/versions", (req, res, next) => {
    uploadMemory.single('document')(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        console.error("[UPLOAD] Multer error:", err);
        return res.status(400).json({ error: `Upload error: ${err.message}` });
      } else if (err) {
        console.error("[UPLOAD] Unknown upload error:", err);
        return res.status(500).json({ error: `Upload failed: ${err.message}` });
      }
      // Everything went fine
      next();
    });
  }, async (req, res) => {
    const logPath = path.join(process.cwd(), 'server_debug.log');
    try {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD Version Attempt for ${req.params.id}\n`);
      console.log(`[UPLOAD] Starting upload for ID: ${req.params.id}`);
      const documentId = req.params.id;
      if (!documentId) {
        console.error("[UPLOAD] Invalid document ID");
        return res.status(400).json({ error: "Invalid document ID" });
      }

      if (!req.file) {
        console.error("[UPLOAD] No file received");
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD Error: No file\n`);
        return res.status(400).json({ error: "No file uploaded" });
      }
      console.log(`[UPLOAD] File received: ${req.file.originalname} (${req.file.size} bytes)`);
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD File Info: ${req.file.originalname}\n`);

      const { uploadedBy, uploadedByName } = req.body;
      const { url: fileUrl } = await dbStorage.uploadFile(req.file);

      // Get current document to determine next version
      console.log("[UPLOAD] Fetching current document...");
      const currentDoc = await storage.getDocumentById(documentId);
      if (!currentDoc) {
        console.error("[UPLOAD] Document not found in DB");
        fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD Error: Doc not found ${documentId}\n`);
        return res.status(404).json({ error: "Document not found" });
      }
      console.log(`[UPLOAD] Current document found: ${currentDoc.documentCode} v${currentDoc.current_version}`);

      // Calculate next version (simple revision increment for now)
      const currentVersion = currentDoc.current_version || 1;
      const currentRevision = currentDoc.current_revision || 0;
      const nextRevision = currentRevision + 1;

      console.log(`[UPLOAD] Creating new version v${currentVersion}.${nextRevision}`);

      const newVersionPayload = {
        documentId: documentId,
        versionNumber: currentVersion,
        revisionNumber: nextRevision,
        filePath: fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: uploadedBy || "SYSTEM",
        uploadedByName: uploadedByName || "System",
        changesNote: `Upload versi baru v${currentVersion}.${nextRevision}`,
        createdAt: new Date()
      };

      const newVersion = await storage.addDocumentVersion(newVersionPayload);
      console.log("[UPLOAD] Version created successfully");
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD Success\n`);

      res.status(201).json({
        ok: true,
        version: newVersion
      });
    } catch (error: any) {
      fs.appendFileSync(logPath, `[${new Date().toISOString()}] UPLOAD Error: ${error.message}\nStack: ${error.stack}\n`);
      console.error("[UPLOAD] Error uploading document version:");
      console.dir(error, { depth: null });
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // CHANGE REQUEST ROUTES
  // ============================================

  // Create Change Request
  app.post("/api/document-masterlist/:id/change-request", async (req, res) => {
    try {
      const data = {
        ...req.body,
        documentId: req.params.id,
      };
      const result = await storage.createChangeRequest(data);
      res.json(result);
    } catch (error) {
      console.error("Error creating change request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get Change Requests for a Document
  app.get("/api/document-masterlist/:id/change-requests", async (req, res) => {
    try {
      const result = await storage.getChangeRequests(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Error fetching change requests:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Update Change Request Status
  app.patch("/api/change-requests/:id/status", async (req, res) => {
    try {
      const result = await storage.updateChangeRequestStatus(req.params.id, req.body);
      res.json(result);
    } catch (error) {
      console.error("Error updating change request:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // RECORD CONTROL ROUTES
  // ============================================

  // Get Disposal Records

  // Create Disposal Record

  // ============================================
  // FMS FATIGUE ALERTS
  // ============================================

  app.get("/api/fms/fatigue/summary", async (req, res) => {
    try {
      const { week, month, shift, supervisor } = req.query;

      // Build conditions
      const conditions = [];
      if (week && week !== 'all') conditions.push(eq(fmsFatigueAlerts.week, parseInt(week as string)));
      if (month && month !== 'all') conditions.push(eq(fmsFatigueAlerts.month, month as string));
      if (shift && shift !== 'all') conditions.push(ilike(fmsFatigueAlerts.shift, `%${shift as string}%`));
      if (supervisor && supervisor !== 'all') conditions.push(ilike(fmsFatigueAlerts.validatedBy, `%${supervisor as string}%`));

      const alerts = await db.select().from(fmsFatigueAlerts)
        .where(
          and(...conditions)
        );

      // Aggregations
      const total = alerts.length;
      let fast = 0, slow = 0; // fast < 300s (5min)
      const hourlyCounts = Array(24).fill(0);
      const supervisorStats: Record<string, { fast: number, slow5: number, slow10: number, slow15: number }> = {};
      const statusCounts: Record<string, number> = {};
      const dailyTrendMap: Record<string, { date: string, fast: number, slow5: number, slow10: number, slow15: number }> = {};

      alerts.forEach(a => {
        // Status Counts
        const status = a.validationStatus || "Unknown";
        statusCounts[status] = (statusCounts[status] || 0) + 1;

        // SLA Buckets
        const sla = a.slaSeconds || 0;

        if (sla > 0) {
          if (sla <= 300) { fast++; }
          else slow++;
        }

        // Supervisor Stats
        const supName = a.validatedBy || "Unknown";
        if (!supervisorStats[supName]) supervisorStats[supName] = { fast: 0, slow5: 0, slow10: 0, slow15: 0 };

        if (sla > 0) {
          if (sla <= 300) supervisorStats[supName].fast++;
          else if (sla <= 600) supervisorStats[supName].slow5++; // 5-10m
          else if (sla <= 900) supervisorStats[supName].slow10++; // 10-15m
          else supervisorStats[supName].slow15++; // >15m
        }

        // Hourly Trend
        if (a.alertTime) {
          const hour = parseInt(a.alertTime.split(':')[0]);
          if (!isNaN(hour) && hour >= 0 && hour < 24) {
            hourlyCounts[hour]++;
          }
        }

        // Daily Trend (by Date)
        if (a.alertDate) {
          const dateKey = typeof a.alertDate === 'string' ? a.alertDate : new Date(a.alertDate).toISOString().split('T')[0];
          if (!dailyTrendMap[dateKey]) {
            dailyTrendMap[dateKey] = { date: dateKey, fast: 0, slow5: 0, slow10: 0, slow15: 0 };
          }

          if (sla > 0) {
            if (sla <= 300) dailyTrendMap[dateKey].fast++;
            else if (sla <= 600) dailyTrendMap[dateKey].slow5++;
            else if (sla <= 900) dailyTrendMap[dateKey].slow10++;
            else dailyTrendMap[dateKey].slow15++;
          }
        }
      });

      // Convert dailyTrendMap to array and sort
      const dailyTrend = Object.values(dailyTrendMap).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      res.json({
        kpi: {
          total,
          fast,
          slow,
          pctSlow: total > 0 ? ((slow / total) * 100).toFixed(1) : 0
        },
        hourlyTrend: hourlyCounts,
        dailyTrend,
        supervisorLeaderboard: supervisorStats,
        statusDistribution: statusCounts,
        // Send a small sample for table preview
        sample: alerts.slice(0, 50)
      });

    } catch (error) {
      console.error("Error fetching FMS fatigue summary:", error);
      res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // FMS Violation Validation KPI Dashboard — Data from fms_violations
  app.get("/api/fms/violation-validation/summary", async (req, res) => {
    try {
      const { week, month, shift, supervisor, validationStatus, period = 'day', startDate, endDate } = req.query;

      // Build conditions — only fatigue-type violations from fms_violations
      const conditions: any[] = [
        sql`${fmsViolations.violationType} IN ('Mata Tertutup', 'Mengantuk', 'Kelelahan')`
      ];
      if (startDate && endDate) {
        conditions.push(sql`${fmsViolations.violationTimestamp} >= ${(startDate as string) + ' 00:00:00'}::timestamp`);
        conditions.push(sql`${fmsViolations.violationTimestamp} <= ${(endDate as string) + ' 23:59:59'}::timestamp`);
      } else {
        if (week && week !== 'all') conditions.push(eq(fmsViolations.week, parseInt(week as string)));
        if (month && month !== 'all') conditions.push(eq(fmsViolations.month, month as string));
      }
      if (shift && shift !== 'all') conditions.push(ilike(fmsViolations.shift, `%${shift as string}%`));
      if (supervisor && supervisor !== 'all') conditions.push(ilike(fmsViolations.validatedBy, `%${supervisor as string}%`));
      if (validationStatus && validationStatus !== 'all') conditions.push(eq(fmsViolations.validationStatus, validationStatus as string));

      const violations = await db.select().from(fmsViolations)
        .where(and(...conditions));

      // Aggregations
      const total = violations.length;
      let fast = 0, slow = 0;
      const hourlyCounts = Array(24).fill(0);

      // Supervisor cards
      const supervisorCards: Record<string, { fast: number, slow5: number, slow10: number, slow15: number }> = {};

      // Breakdown charts by period
      const breakdownMap: Record<string, { label: string, fast: number, slow5: number, slow10: number, slow15: number }> = {};

      violations.forEach(a => {
        const sla = a.slaSeconds || 0;

        // Global KPI
        if (sla > 0) {
          if (sla <= 300) fast++;
          else slow++;
        }

        // Hourly Trend (use violationTime)
        if (a.violationTime) {
          const hour = parseInt(String(a.violationTime).split(':')[0]);
          if (!isNaN(hour) && hour >= 0 && hour < 24) hourlyCounts[hour]++;
        }

        // Supervisor Cards
        const supName = a.validatedBy || "Unknown";
        if (!supervisorCards[supName]) supervisorCards[supName] = { fast: 0, slow5: 0, slow10: 0, slow15: 0 };
        if (sla > 0) {
          if (sla <= 300) supervisorCards[supName].fast++;
          else if (sla <= 600) supervisorCards[supName].slow5++;
          else if (sla <= 900) supervisorCards[supName].slow10++;
          else supervisorCards[supName].slow15++;
        }

        // Breakdown by period
        let periodKey = '';
        let periodLabel = '';
        if (period === 'week') {
          periodKey = `W${a.week || 0}`;
          periodLabel = `Week ${a.week || 0}`;
        } else if (period === 'month') {
          periodKey = a.month || 'Unknown';
          periodLabel = a.month || 'Unknown';
        } else {
          // day — use violationDate
          const dateStr = a.violationDate ? String(a.violationDate) : '';
          periodKey = dateStr;
          periodLabel = dateStr;
        }

        if (periodKey) {
          if (!breakdownMap[periodKey]) breakdownMap[periodKey] = { label: periodLabel, fast: 0, slow5: 0, slow10: 0, slow15: 0 };
          if (sla > 0) {
            if (sla <= 300) breakdownMap[periodKey].fast++;
            else if (sla <= 600) breakdownMap[periodKey].slow5++;
            else if (sla <= 900) breakdownMap[periodKey].slow10++;
            else breakdownMap[periodKey].slow15++;
          }
        }
      });

      // Sort breakdown by key
      const breakdownArray = Object.entries(breakdownMap)
        .sort(([a], [b]) => {
          if ((period as string) === 'week') {
            return parseInt(a.replace('W', '')) - parseInt(b.replace('W', ''));
          }
          return a.localeCompare(b);
        })
        .map(([_, val]) => val);

      // Extract unique supervisors for filter dropdown
      const allSupervisors = Object.keys(supervisorCards).filter(s => s !== 'Unknown').sort();

      res.json({
        kpi: {
          total,
          fast,
          slow,
          pctSlow: total > 0 ? ((slow / total) * 100).toFixed(1) : 0
        },
        hourlyTrend: hourlyCounts,
        supervisorCards,
        breakdownCharts: breakdownArray,
        availableSupervisors: allSupervisors,
        availableWeeks: [...new Set(violations.map(a => a.week).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)),
        availableMonths: [...new Set(violations.map(a => a.month).filter(Boolean))].sort()
      });

    } catch (error) {
      console.error("Error fetching FMS violation validation summary:", error);
      res.status(500).json({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // FMS Fatigue Ingest Route
  app.post("/api/fms/fatigue/ingest", upload.single('file'), async (req, res) => {
    try {
      // Log request
      console.log(`Ingest request received.`);

      let inputPath: string | null = null;
      if (req.file) {
        inputPath = req.file.path;
        console.log(`File uploaded to: ${inputPath}`);
      } else if (req.body.url) {
        try {
          // Basic validation
          new URL(req.body.url);
          inputPath = req.body.url;
          console.log(`URL received: ${inputPath}`);
        } catch (e) {
          return res.status(400).json({ error: "Invalid URL provided" });
        }
      } else {
        return res.status(400).json({ error: "No file uploaded or URL provided" });
      }

      // Execute Python script
      const scriptPath = path.join(process.cwd(), 'scripts', 'ingest_fatigue.py');
      const pythonPath = "C:\\Users\\SDM UTAMA\\AppData\\Local\\Programs\\Python\\Python313\\python.exe";

      console.log(`Executing Python script...`);

      exec(`"${pythonPath}" "${scriptPath}" "${inputPath}"`, async (error, stdout, stderr) => {
        // Clean up file
        try {
          if (req.file && inputPath && fs.existsSync(inputPath)) {
            await fs.promises.unlink(inputPath);
          }
        } catch (cleanupError) {
          console.error(`Cleanup error: ${cleanupError}`);
        }

        if (error) {
          console.error(`Exec Error: ${error.message}`);
          console.error(`Stderr: ${stderr}`);
          return res.status(500).json({ error: "Failed to process file", details: stderr || error.message });
        }

        console.log(`Success. Stdout: ${stdout}`);
        res.json({ message: "Ingestion successful", output: stdout });
      });

    } catch (error: any) {
      console.error("Ingestion error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get Retention Candidates

  // ============================================
  // SI ASEF ROUTES
  // ============================================

  // Upload Document (Admin Only)
  app.post("/api/si-asef/upload", uploadMemory.single("file"), async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;

      // Admin Check
      // Fix: Role.ADMIN is "ADMIN", not "admin"
      if (user.role !== Role.ADMIN && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized: Admins only" });
      }

      const file = req.file;
      const folder = req.body.folder || 'Umum';

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const doc = await processAndSaveDocument(req.file, folder, user ? (user.id || user.nik) : 'System');
      res.json(doc);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message });
    }
  });

  // Upload Google Sheet (URL)
  app.post("/api/si-asef/upload-sheet", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;

      const { url, folder } = req.body;
      if (!url) return res.status(400).json({ message: "URL is required" });

      const doc = await processAndSaveGoogleSheet(url, folder, user ? (user.id || user.nik) : 'System');
      res.json(doc);
    } catch (error: any) {
      console.error("Sheet Upload Error:", error);
      res.status(500).json({ message: error.message || "Failed to process Google Sheet" });
    }
  });

  // Get Documents
  app.get("/api/si-asef/documents", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const docs = await db.select().from(siAsefDocuments).orderBy(desc(siAsefDocuments.createdAt));
      res.json(docs);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Delete Document (Admin Only)
  app.delete("/api/si-asef/documents/:id", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;
      if (user.role !== Role.ADMIN && user.role !== 'super_admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      await deleteDocument(req.params.id);
      res.json({ message: "Document deleted" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  });

  // Sync Leave Monitoring with Roster
  app.post("/api/leave-roster-monitoring/sync", async (req, res) => {
    try {
      await storage.syncLeaveMonitoringWithRoster();
      res.json({ message: "Sync successful" });
    } catch (error: any) {
      console.error("Error syncing roster:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Analyze Leave Data with Mystic AI
  app.post("/api/leave-roster-monitoring/analyze", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API Key not configured" });
      }

      const monitoringData = await storage.getAllLeaveRosterMonitoring();

      // Summarize data for AI
      const upcoming = monitoringData.filter(d => d.status === 'Akan Cuti').map(d => `${d.name} (${d.nextLeaveDate})`);
      const current = monitoringData.filter(d => d.status === 'Sedang Cuti').map(d => d.name);

      const prompt = `
        Analyze this leave monitoring data for a mining company roster:
        
        Total Monitored: ${monitoringData.length}
        Currently on Leave: ${current.length} (${current.join(', ')})
        Upcoming Leave (Next 7 Days): ${upcoming.length} (${upcoming.join(', ')})
        
        Provide a brief, professional executive summary (in Indonesian). 
        Highlight potential shortages if many people are leaving.
        Keep it under 3 sentences.
      `;

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });

      res.json({ analysis: completion.choices[0].message.content });

    } catch (error: any) {
      console.error("Error analyzing leave data:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Chat Endpoint
  app.post("/api/si-asef/chat", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const { message, sessionId } = req.body;
      const user = (req.session as any).user;
      const userId = String(user.id || user.nik || user.username);

      let currentSessionId = sessionId;

      // 1. Create session if not exists
      if (!currentSessionId) {
        const [newSession] = await db.insert(siAsefChatSessions).values({
          title: message.substring(0, 50) + "...",
          userId: userId,
        }).returning();
        currentSessionId = newSession.id;
      }

      // 2. Save User Message
      await db.insert(siAsefChatMessages).values({
        sessionId: currentSessionId,
        role: "user",
        content: message,
      });

      console.log(`[Chat] Msg: "${message.substring(0, 20)}..." Session: ${currentSessionId}`);

      // 3. Define Tools
      const tools = [
        {
          type: "function",
          function: {
            name: "create_activity",
            description: "Schedule a new activity or event on the user's calendar.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "The title of the activity (e.g., 'Meeting with HSE')" },
                date: { type: "string", description: "Date in YYYY-MM-DD format (e.g., '2025-10-25')" },
                time: { type: "string", description: "Time in HH:mm format (24h) (e.g., '14:00')" },
                description: { type: "string", description: "Optional details about the activity" },
                participants: { type: "string", description: "Comma-separated names of other people to notify (e.g., 'Budi Santoso, Siti')" },
                recurrence_type: { type: "string", enum: ["daily", "weekly", "monthly"], description: "Frequency of the activity (optional)" },
                recurrence_count: { type: "integer", description: "Number of times to repeat (default 1 if recurrence_type set, max 12)" },
                reminder_minutes: { type: "integer", description: "Minutes before event to send reminder (default 15)" }
              },
              required: ["title", "date", "time"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_activities",
            description: "Get user's scheduled activities for a specific date or date range.",
            parameters: {
              type: "object",
              properties: {
                date: { type: "string", description: "Date to check in YYYY-MM-DD format" }
              },
              required: ["date"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_upcoming_leave",
            description: "Get list of employees who are about to go on leave or are currently on leave from the roster monitoring system.",
            parameters: {
              type: "object",
              properties: {}
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_roster_schedule",
            description: "Get roster schedule for a specific employee or date.",
            parameters: {
              type: "object",
              properties: {
                employeeName: { type: "string", description: "Name of the employee (partial match allowed)" },
                date: { type: "string", description: "Date YYYY-MM-DD" },
                nik: { type: "string", description: "NIK of the employee" }
              }
            }
          }
        }
      ];

      // 4. RAG Retrieval (Keep existing logic for regulations/general knowledge)
      // Only do RAG if it looks like a question, OR just always do it as context?
      // For now, let's keep it but maybe we can optimize to skip if it's clearly a command?
      // Let's keep it simple and always fetch RAG context for now, the model can ignore it.
      const t1 = Date.now();
      const embedding = await generateEmbedding(message);

      const allChunks = await db.select({
        id: siAsefChunks.id,
        content: siAsefChunks.content,
        embedding: siAsefChunks.embedding,
      }).from(siAsefChunks);

      const relevantChunks = await searchSimilarChunks(embedding, allChunks as any);
      const { prompt: ragPrompt, sources } = buildRAGPrompt(message, relevantChunks);

      // 5. Call OpenAI with Tools
      if (!process.env.OPENAI_API_KEY) {
        return res.json({
          reply: "Maaf, API Key OpenAI tidak ditemukan. Hubungi admin.",
          sessionId: currentSessionId
        });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const messages: any[] = [
        {
          role: "system",
          content: `You are 'Mystic AI', a smart assistant for OneTalent. 
              Current time: ${format(new Date(), "yyyy-MM-dd HH:mm")}.
              You can help users with regulations (using provided context) AND manage their calendar.
              If the user asks to schedule something, use the create_activity tool.
              If they ask about their schedule, use get_activities.
              Always be helpful and polite. Layout responses simply.`
        },
        { role: "user", content: ragPrompt } // The RAG prompt contains the user question + context
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
        tools: tools as any,
        tool_choice: "auto",
      });

      let reply = completion.choices[0].message.content;
      const toolCalls = completion.choices[0].message.tool_calls;

      // 6. Handle Tool Calls
      if (toolCalls) {
        // Append the assistant's message with tool calls to history
        messages.push(completion.choices[0].message);

        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);
          let functionResponse;

          console.log(`[Destiny AI] Calling tool: ${functionName}`, functionArgs);

          if (functionName === "create_activity") {
            try {
              const startTime = new Date(`${functionArgs.date}T${functionArgs.time}:00`);
              const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default

              console.log(`[Destiny AI] Creating activity for UserId: ${userId} | Title: ${functionArgs.title} | Start: ${startTime} | Participants: ${functionArgs.participants}`);

              const count = functionArgs.recurrence_type ? (functionArgs.recurrence_count || 1) : 1;
              // Cap at 12 to prevent abuse/errors
              const actualCount = Math.min(Math.max(count, 1), 12);
              const createdIds: string[] = [];

              for (let i = 0; i < actualCount; i++) {
                let currentStart = new Date(startTime);

                if (i > 0) {
                  if (functionArgs.recurrence_type === 'daily') currentStart = addDays(currentStart, i);
                  if (functionArgs.recurrence_type === 'weekly') currentStart = addWeeks(currentStart, i);
                  if (functionArgs.recurrence_type === 'monthly') currentStart = addMonths(currentStart, i);
                }

                const currentEnd = new Date(currentStart.getTime() + 60 * 60 * 1000); // 1 hour default

                const newItem = await storage.createActivityEvent({
                  userId: userId,
                  title: functionArgs.title,
                  description: functionArgs.description || "",
                  startTime: currentStart,
                  endTime: currentEnd,
                  isAllDay: false,
                  reminderMinutes: functionArgs.reminder_minutes || 15,
                  participants: functionArgs.participants || "",
                  isCompleted: false
                });
                createdIds.push(newItem.id);
              }

              functionResponse = JSON.stringify({ success: true, message: `Created ${createdIds.length} activities starting from ${format(startTime, "yyyy-MM-dd HH:mm")}`, ids: createdIds });
            } catch (e: any) {
              functionResponse = JSON.stringify({ success: false, error: e.message });
            }
          } else if (functionName === "get_activities") {
            try {
              // Logic to filter by date (using in-memory filtering for now as storage.getActivityEvents returns all)
              // TODO: Add date filtering to storage if performance becomes issue
              const allEvents = await storage.getActivityEvents(userId);
              const targetDate = functionArgs.date;
              const filtered = allEvents.filter(e => format(new Date(e.startTime), "yyyy-MM-dd") === targetDate);

              if (filtered.length === 0) {
                functionResponse = JSON.stringify({ activities: [], message: "No activities found for this date." });
              } else {
                functionResponse = JSON.stringify({
                  activities: filtered.map(e => ({
                    title: e.title,
                    time: format(new Date(e.startTime), "HH:mm"),
                    description: e.description
                  }))
                });
              }
            } catch (e: any) {
              functionResponse = JSON.stringify({ success: false, error: e.message });
            }
          } else if (functionName === "get_upcoming_leave") {
            try {
              const data = await storage.getAllLeaveRosterMonitoring();
              const upcoming = data.filter(d => d.status === 'Akan Cuti' || d.status === 'Sedang Cuti').map(d => ({
                name: d.name,
                status: d.status,
                date: d.status === 'Akan Cuti' ? d.nextLeaveDate : 'Now'
              }));
              functionResponse = JSON.stringify({ upcoming_leave: upcoming });
            } catch (e: any) {
              functionResponse = JSON.stringify({ success: false, error: e.message });
            }
          } else if (functionName === "get_roster_schedule") {
            try {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              let schedules = [];
              if (functionArgs.date) {
                schedules = await storage.getRosterByDate(functionArgs.date);
              } else if (functionArgs.nik) {
                schedules = await storage.getRosterByEmployee(functionArgs.nik);
              } else if (functionArgs.employeeName) {
                const allEmployees = await storage.getAllEmployees();
                const target = allEmployees.find(e => e.name.toLowerCase().includes(functionArgs.employeeName.toLowerCase()));
                if (target) {
                  schedules = await storage.getRosterByEmployee(target.id);
                } else {
                  functionResponse = JSON.stringify({ message: "Employee not found" });
                }
              }

              if (!functionResponse) {
                const limit = 10;
                const result = schedules.slice(0, limit).map(s => ({
                  name: s.employeeName || s.employeeId,
                  date: s.date,
                  shift: s.shift,
                  status: s.status
                }));
                functionResponse = JSON.stringify({ schedules: result, count: schedules.length, note: schedules.length > limit ? "Result truncated" : "" });
              }
            } catch (e: any) {
              functionResponse = JSON.stringify({ success: false, error: e.message });
            }
          }

          messages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: functionResponse,
          });
        }

        // 7. Get final response after tool execution
        const secondResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messages,
        });

        reply = secondResponse.choices[0].message.content;
      }

      // 8. Save Assistant Response
      await db.insert(siAsefChatMessages).values({
        sessionId: currentSessionId,
        role: "model",
        content: reply || "No response generated.",
        sources: sources,
      });

      res.json({
        sessionId: currentSessionId,
        message: reply,
        sources: toolCalls ? [] : sources // Don't show sources if tool was used (usually) or keep them? Let's hide if tool used to avoid clutter.
      });

    } catch (error: any) {
      console.error("Si Asef Chat Error (Full Trace):", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Delete Session

  // Get Chat History (List Sessions)
  app.get("/api/si-asef/sessions", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;
      const sessions = await db.select()
        .from(siAsefChatSessions)
        .where(eq(siAsefChatSessions.userId, user.id || user.nik)) // Filter by user
        .orderBy(desc(siAsefChatSessions.createdAt));
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "Error" });
    }
  });

  // Get Messages in Session


  // ============================================
  // ACTIVITY CALENDAR ROUTES (Mystic AI)
  // ============================================

  app.get("/api/activities", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;
      const userId = String(user.id || user.nik || user.username);
      // Ensure we have a valid ID. In this system 'id' or 'nik' is used as primary identifier.

      console.log(`[GET /api/activities] Fetching for UserId: ${userId}`);
      const activities = await storage.getActivityEvents(userId);
      console.log(`[GET /api/activities] Found ${activities.length} events.`);
      if (activities.length > 0) console.log(`[GET /api/activities] First event: ${JSON.stringify(activities[0])}`);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activities:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/activities", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);
      const user = (req.session as any).user;

      const parsed = insertActivityEventSchema.safeParse({
        ...req.body,
        userId: user.id || user.nik || user.username
      });

      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error });
      }

      const activity = await storage.createActivityEvent(parsed.data);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/activities/:id", async (req, res) => {
    try {
      if (!(req.session as any).user) return res.sendStatus(401);

      console.log(`[DELETE /api/activities/${req.params.id}] Deleting activity...`);

      // Ideally check ownership here, but for now simple delete
      const success = await storage.deleteActivityEvent(req.params.id);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Activity not found" });
      }
    } catch (error) {
      console.error("Error deleting activity:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // FMS VIOLATIONS ROUTES (Violation FMS)
  // ============================================

  // 1. Get Analytics Dashboard Data
  // Decode exp dari JWT FAMOUS (tanpa verifikasi signature) untuk info kedaluwarsa.
  const famousTokenExp = (tok: string): number | null => {
    try { const p = JSON.parse(Buffer.from(tok.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()); return p.exp ? p.exp * 1000 : null; } catch { return null; }
  };

  // Status token FMS (kedaluwarsa, dll)
  app.get("/api/fms/token-status", async (_req, res) => {
    try {
      const { getStoredToken } = await import("./services/fms-scraper");
      const tok = await getStoredToken();
      if (!tok) return res.json({ hasToken: false });
      const exp = famousTokenExp(tok);
      res.json({ hasToken: true, exp, expired: exp ? Date.now() > exp : null, expiresInHours: exp ? Math.round((exp - Date.now()) / 36e5) : null });
    } catch (e: any) { res.status(500).json({ error: e?.message }); }
  });

  // Update token FMS (tempel token baru dari browser FAMOUS). Disimpan di DB.
  app.post("/api/fms/token", async (req, res) => {
    try {
      const token = String(req.body?.token || "").trim().replace(/^"|"$/g, "");
      if (!token || token.split(".").length !== 3) return res.status(400).json({ ok: false, error: "Token tidak valid (harus JWT)" });
      const exp = famousTokenExp(token);
      if (exp && Date.now() > exp) return res.status(400).json({ ok: false, error: "Token sudah kedaluwarsa" });
      await storage.setSystemSetting("famous_token", token, "Token akses FAMOUS untuk auto-pull FMS");
      res.json({ ok: true, exp, expiresInHours: exp ? Math.round((exp - Date.now()) / 36e5) : null });
    } catch (e: any) { res.status(500).json({ ok: false, error: e?.message }); }
  });

  // Manual trigger FMS auto-pull dari FAMOUS (read-only). Untuk uji.
  app.post("/api/fms/scrape-now", async (req, res) => {
    try {
      const hoursBack = Number((req.query.hoursBack ?? req.body?.hoursBack) || 3);
      const { runFmsScrape } = await import("./services/fms-scraper");
      const result = await runFmsScrape({ hoursBack });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("Error FMS scrape-now:", error?.message || error);
      res.status(500).json({ ok: false, error: error?.message || "scrape failed" });
    }
  });

  // Backfill AMAN data historis: tarik HANYA Level-2 + Overspeed yang hilang dari Excel.
  app.post("/api/fms/backfill", async (req, res) => {
    try {
      const { startDate, endDate, startTime, endTime } = req.body || {};
      if (!startDate || !endDate) {
        return res.status(400).json({ ok: false, error: "startDate & endDate wajib (YYYY-MM-DD)" });
      }
      const from = new Date(`${startDate}T${startTime || "00:00"}:00`);
      const to = new Date(`${endDate}T${endTime || "23:59"}:59`);
      if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
        return res.status(400).json({ ok: false, error: "Rentang tanggal tidak valid" });
      }
      const days = (to.getTime() - from.getTime()) / 86400000;
      if (days > 62) {
        return res.status(400).json({ ok: false, error: "Rentang terlalu lebar (maks ~60 hari per backfill)" });
      }
      const { runFmsBackfillGap } = await import("./services/fms-scraper");
      const result = await runFmsBackfillGap({ from, to });
      res.json({ ok: true, ...result });
    } catch (error: any) {
      console.error("Error FMS backfill:", error?.message || error);
      res.status(500).json({ ok: false, error: error?.message || "backfill failed" });
    }
  });

  // ===== Notifikasi (lonceng header) =====
  app.get("/api/notifications", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const isHse = Array.isArray(u.permissions) ? u.permissions.includes("MANAGE_SIDAK") : (u.role && u.role !== "BASIC");
      let items = await storage.getNotificationsForUser({ nik: u.nik, isHse: !!isHse }, 50);
      // sembunyikan yg sudah di-"Hapus Semua" (cleared_at) & yg di-dismiss per item
      const clearedStr = await storage.getSystemSetting(`notif_cleared_at_${u.nik}`);
      const clearedAt = clearedStr ? new Date(clearedStr).getTime() : 0;
      const dismissedStr = await storage.getSystemSetting(`notif_dismissed_${u.nik}`);
      let dismissed: string[] = [];
      try { dismissed = dismissedStr ? JSON.parse(dismissedStr) : []; } catch { dismissed = []; }
      const dismissedSet = new Set(dismissed);
      items = items.filter((n) => !dismissedSet.has(n.id) && !(clearedAt && n.createdAt && new Date(n.createdAt).getTime() <= clearedAt));
      const lastSeenStr = await storage.getSystemSetting(`notif_last_seen_${u.nik}`);
      const lastSeen = lastSeenStr ? new Date(lastSeenStr).getTime() : 0;
      const unreadCount = items.filter((n) => n.createdAt && new Date(n.createdAt).getTime() > lastSeen).length;
      res.json({ items, unreadCount });
    } catch (error: any) {
      console.error("Error get notifications:", error?.message || error);
      res.status(500).json({ items: [], unreadCount: 0 });
    }
  });

  app.post("/api/notifications/seen", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      await storage.setSystemSetting(`notif_last_seen_${u.nik}`, new Date().toISOString(), "Notifikasi terakhir dilihat per user");
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error mark notifications seen:", error?.message || error);
      res.status(500).json({ ok: false });
    }
  });

  // Hapus semua (per user): sembunyikan semua notif <= sekarang
  app.post("/api/notifications/clear", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      await storage.setSystemSetting(`notif_cleared_at_${u.nik}`, new Date().toISOString(), "Notifikasi dibersihkan per user");
      await storage.setSystemSetting(`notif_dismissed_${u.nik}`, "[]");
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error clear notifications:", error?.message || error);
      res.status(500).json({ ok: false });
    }
  });

  // Dismiss satu notif (per user)
  app.post("/api/notifications/:id/dismiss", async (req, res) => {
    try {
      const u = (req.session as any).user;
      if (!u) return res.sendStatus(401);
      const key = `notif_dismissed_${u.nik}`;
      const cur = await storage.getSystemSetting(key);
      let arr: string[] = [];
      try { arr = cur ? JSON.parse(cur) : []; } catch { arr = []; }
      if (!arr.includes(req.params.id)) arr.push(req.params.id);
      if (arr.length > 500) arr = arr.slice(-500);
      await storage.setSystemSetting(key, JSON.stringify(arr));
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Error dismiss notification:", error?.message || error);
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/fms/analytics", async (req, res) => {
    try {
      const { startDate, endDate, startTime, endTime, violationType, category, shift, validationStatus, week, month } = req.query;

      const stats = await storage.getFmsAnalytics(
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined,
        {
          startTime: typeof startTime === 'string' ? startTime : undefined,
          endTime: typeof endTime === 'string' ? endTime : undefined,
          violationType: typeof violationType === 'string' ? violationType : undefined,
          category: typeof category === 'string' ? category : undefined,
          shift: typeof shift === 'string' ? shift : undefined,
          validationStatus: typeof validationStatus === 'string' ? validationStatus : undefined,
          week: typeof week === 'string' ? week : undefined,
          month: typeof month === 'string' ? month : undefined,
        }
      );

      res.json(stats);
    } catch (error) {
      console.error("Error fetching FMS analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // 1.2. Get Investor Group Evaluation
  app.get("/api/fms/investor-evaluation", async (req, res) => {
    try {
      const { startDate, endDate, violationType, company } = req.query;

      const evalData = await storage.getFmsInvestorEvaluation({
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
        violationType: typeof violationType === 'string' ? violationType : undefined,
        company: typeof company === 'string' ? company : undefined,
      });

      res.json(evalData);
    } catch (error) {
      console.error("Error fetching FMS investor evaluation:", error);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      res.status(500).json({ error: "Failed to fetch evaluation", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // 1.3. Get Unit-Mitra Map
  app.get("/api/fms/unit-mitra-map", async (_req, res) => {
    try {
      const map = await storage.getFmsUnitMitraMap();
      res.json(map);
    } catch (error) {
      console.error("Error fetching unit-mitra map:", error);
      res.status(500).json({ error: "Failed to fetch map" });
    }
  });

  // 1.5. Get Detailed Violations
  app.get("/api/fms/violations", async (req, res) => {
    try {
      const { vehicleNo, driverNik, driverName, violationType, month, week, validationStatus, startDate, endDate } = req.query;

      const violations = await storage.getFmsViolations({
        vehicleNo: typeof vehicleNo === 'string' ? vehicleNo : undefined,
        driverNik: typeof driverNik === 'string' ? driverNik : undefined,
        driverName: typeof driverName === 'string' ? driverName : undefined,
        violationType: typeof violationType === 'string' ? violationType : undefined,
        month: typeof month === 'string' ? month : undefined,
        week: typeof week === 'string' ? week : undefined,
        validationStatus: typeof validationStatus === 'string' ? validationStatus : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      });

      res.json(violations);
    } catch (error) {
      console.error("Error fetching FMS violations:", error);
      res.status(500).json({ error: "Failed to fetch violations" });
    }
  });

  // 1.6. Update Driver Override (with optional evidence upload)
  app.patch("/api/fms/violations/:id/driver", uploadMemory.single('evidence'), async (req, res) => {
    try {
      const { id } = req.params;
      const { manualDriverName, manualDriverNik } = req.body;

      let evidenceUrl: string | null = null;
      if (req.file) {
        const uploadResult = await dbStorage.uploadFile(req.file);
        evidenceUrl = uploadResult.url;
      }

      const updated = await storage.updateFmsViolationDriver(id, {
        manualDriverName: manualDriverName ?? null,
        manualDriverNik: manualDriverNik ?? null,
        evidenceUrl: evidenceUrl
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating FMS violation driver:", error);
      res.status(500).json({ error: "Failed to update driver override" });
    }
  });

  // 1.6b. Get violations by driver name
  app.get("/api/fms/driver-violations", async (req, res) => {
    try {
      const { driverName } = req.query;
      if (!driverName) {
        return res.status(400).json({ error: "driverName query parameter is required" });
      }
      console.log(`[driver-violations] Searching for driverName: "${driverName}"`);

      const results = await db
        .select()
        .from(fmsViolations)
        .where(
          and(
            ilike(fmsViolations.manualDriverName, String(driverName).trim()),
            eq(fmsViolations.validationStatus, 'Valid'),
            sql`${fmsViolations.violationType} IN ('Mata Tertutup', 'Mengantuk', 'Kelelahan')`
          )
        )
        .orderBy(sql`${fmsViolations.violationDate} DESC, ${fmsViolations.violationTime} DESC`);

      console.log(`[driver-violations] Found ${results.length} violations for "${driverName}"`);
      res.json(results);
    } catch (error) {
      console.error("Error fetching driver violations:", error);
      res.status(500).json({ error: "Failed to fetch driver violations" });
    }
  });

  // 1.6c. Driver Level History — per-week breakdown explaining level classification
  app.get("/api/fms/driver-level-history", async (req, res) => {
    try {
      const { driverName } = req.query;
      if (!driverName) return res.status(400).json({ error: "driverName required" });

      function maxConsecDays(dates: string[]): number {
        const unique = [...new Set(dates)].sort();
        if (unique.length === 0) return 0;
        let max = 1, cur = 1;
        for (let i = 1; i < unique.length; i++) {
          const diff = Math.round((new Date(unique[i]).getTime() - new Date(unique[i - 1]).getTime()) / 86400000);
          cur = diff === 1 ? cur + 1 : 1;
          max = Math.max(max, cur);
        }
        return max;
      }

      function calcWeekLevel(count: number, consecutive: number, lastLvl: 1 | 2 | 3 | null): 1 | 2 | 3 | null {
        if (consecutive >= 3) return 3; // 3 hari berturut-turut → langsung Level 3
        if (count >= 4 || (lastLvl === 1 && count >= 1)) return 2;
        if (count >= 3 || consecutive >= 2) return 1;
        return null;
      }

      const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

      const histStart = new Date();
      histStart.setDate(histStart.getDate() - 56);

      const violations = await storage.getFmsViolations({
        driverName: driverName as string,
        violationType: 'Mata Tertutup,Mengantuk,Kelelahan',
        validationStatus: 'Valid',
        startDate: histStart.toISOString().slice(0, 10),
        endDate: new Date().toISOString().slice(0, 10),
      });

      // Group violations by Sun–Sat week key
      const byWeek = new Map<string, string[]>(); // weekKey → violation dates[]
      for (const v of violations) {
        if (!v.violationDate) continue;
        const d = new Date(v.violationDate);
        const wk = getWeek(d, { weekStartsOn: 0 });
        const yr = d.getFullYear();
        const weekKey = `${yr}-W${String(wk).padStart(2, '0')}`;
        if (!byWeek.has(weekKey)) byWeek.set(weekKey, []);
        byWeek.get(weekKey)!.push(v.violationDate);
      }

      // Generate ALL 8 calendar week keys in order (including empty weeks)
      // This ensures cascade resets correctly across week gaps
      const allWeekKeys: string[] = [];
      const seenKeys = new Set<string>();
      const now = new Date();
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i * 7);
        const wk = getWeek(d, { weekStartsOn: 0 });
        const yr = d.getFullYear();
        const key = `${yr}-W${String(wk).padStart(2, '0')}`;
        if (!seenKeys.has(key)) { seenKeys.add(key); allWeekKeys.push(key); }
      }

      // Compute level for every week (cascade resets to null in weeks with 0 alerts)
      const allLevels: (1 | 2 | 3 | null)[] = [];
      let prevLevel: 1 | 2 | 3 | null = null;
      for (const weekKey of allWeekKeys) {
        const dates = byWeek.get(weekKey) || [];
        const level = calcWeekLevel(dates.length, maxConsecDays(dates), prevLevel);
        allLevels.push(level);
        prevLevel = level; // resets to null when no violations, stopping cascade gap
      }

      // Build weekHistory for display (only weeks WITH violations)
      const weekHistory: any[] = [];
      for (let i = 0; i < allWeekKeys.length; i++) {
        const weekKey = allWeekKeys[i];
        const dates = byWeek.get(weekKey);
        if (!dates || dates.length === 0) continue;

        const level = allLevels[i];
        const prevLvl = i > 0 ? allLevels[i - 1] : null;
        const count = dates.length;
        const consecutive = maxConsecDays(dates);

        let levelTrigger: string | null = null;
        if (level === 3) {
          levelTrigger = `${consecutive} hari berturut-turut dalam 1 minggu (≥3)`;
        } else if (level === 2) {
          if (count >= 4) levelTrigger = `${count} alert dalam 1 minggu (≥4)`;
          else if (prevLvl === 1) levelTrigger = `Minggu sebelumnya Level 1, ada ${count} alert baru`;
        } else if (level === 1) {
          if (count >= 3) levelTrigger = `${count} alert dalam minggu ini (≥3)`;
          else levelTrigger = `${consecutive} hari berturut-turut (≥2)`;
        }

        const wkNum = parseInt(weekKey.split('-W')[1]);
        const sun = startOfWeek(new Date(dates[0]), { weekStartsOn: 0 });
        const sat = endOfWeek(new Date(dates[0]), { weekStartsOn: 0 });
        const s = sun, e = sat;
        const weekLabel = `Week ${wkNum} (${s.getDate()} ${SHORT_MONTHS[s.getMonth()]} – ${e.getDate()} ${SHORT_MONTHS[e.getMonth()]})`;

        weekHistory.push({
          weekKey, weekNumber: wkNum, weekLabel,
          startDate: format(sun, 'yyyy-MM-dd'), endDate: format(sat, 'yyyy-MM-dd'),
          alertCount: count, consecutiveDays: consecutive,
          alertDates: [...new Set(dates)].sort(),
          level, levelTrigger,
        });
      }

      // Compute current streak: consecutive non-null weeks ENDING at the most recent week
      // (iterating allLevels from end)
      let currentStreak = 0;
      for (let i = allLevels.length - 1; i >= 0; i--) {
        if (allLevels[i] !== null) currentStreak++;
        else break;
      }

      // Determine final level:
      // Level 4 = 4+ consecutive weeks with alerts
      // Level 3 = 3 consecutive weeks with alerts
      // Level 2/1 = current week's computed level
      let currentLevel: 1 | 2 | 3 | 4 | null;
      let levelReason: string;
      const mostRecentLevel = [...allLevels].reverse().find(l => l !== null) ?? null;

      if (currentStreak >= 4) {
        currentLevel = 4;
        levelReason = `Driver mencapai alert selama ${currentStreak} minggu berturut-turut — pola kronis`;
      } else if (currentStreak >= 3) {
        currentLevel = 3;
        const streakWeeks = weekHistory.slice(-currentStreak).map((w: any) => w.weekLabel).join(', ');
        levelReason = `Alert berturut-turut ${currentStreak} minggu: ${streakWeeks}`;
      } else if (mostRecentLevel === 3) {
        currentLevel = 3;
        levelReason = (weekHistory.findLast((w: any) => w.level === 3) as any)?.levelTrigger || '';
      } else if (mostRecentLevel === 2) {
        currentLevel = 2;
        levelReason = (weekHistory.findLast((w: any) => w.level === 2) as any)?.levelTrigger || '';
      } else if (mostRecentLevel === 1) {
        currentLevel = 1;
        levelReason = (weekHistory.findLast((w: any) => w.level === 1) as any)?.levelTrigger || '';
      } else {
        currentLevel = null;
        levelReason = 'Tidak ada alert signifikan dalam 8 minggu terakhir';
      }

      // Overlay manual week levels from DB (admin overrides auto-computed per-week level)
      const manualWeekLevels = await storage.getDriverWeekLevels(driverName as string);
      for (const w of weekHistory) {
        if (manualWeekLevels.has(w.weekKey)) {
          w.level = manualWeekLevels.get(w.weekKey) ?? null;
        }
      }

      res.json({ currentLevel, levelReason, weekHistory });
    } catch (err) {
      console.error("[driver-level-history]", err);
      res.status(500).json({ error: "Failed to fetch level history" });
    }
  });

  // Manual per-week level assignment for a driver
  app.put("/api/fms/driver-week-level", async (req, res) => {
    try {
      const { driverName, weekKey, level } = req.body;
      if (!driverName || !weekKey) return res.status(400).json({ error: "driverName and weekKey required" });
      if (level !== null && level !== undefined && ![1, 2, 3, 4].includes(Number(level))) {
        return res.status(400).json({ error: "level must be 1-4 or null" });
      }
      await storage.setDriverWeekLevel(driverName, weekKey, level != null ? Number(level) : null);
      res.json({ ok: true });
    } catch (err) {
      console.error("[driver-week-level]", err);
      res.status(500).json({ error: "Failed to save week level" });
    }
  });

  // Driver investigation files
  app.get("/api/fms/driver-investigation", async (req, res) => {
    try {
      const { driverName } = req.query;
      if (!driverName) return res.status(400).json({ error: "driverName required" });
      const data = await storage.getDriverInvestigation(driverName as string);
      res.json(data);
    } catch (err) {
      console.error("[driver-investigation GET]", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  const investigationPhotoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) return cb(new Error('Only images allowed'));
      cb(null, true);
    },
  });

  const investigationReportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype !== 'application/pdf') return cb(new Error('Only PDF allowed'));
      cb(null, true);
    },
  });

  app.post("/api/fms/driver-investigation/upload-photo", investigationPhotoUpload.single('photo'), async (req, res) => {
    try {
      const { driverName } = req.body;
      if (!driverName || !req.file) return res.status(400).json({ error: "driverName and photo required" });
      const result = await dbStorage.uploadFile(req.file);
      await storage.addDriverInvestigationPhoto(driverName, result.url);
      res.json({ url: result.url });
    } catch (err) {
      console.error("[upload-photo]", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/fms/driver-investigation/upload-report", investigationReportUpload.single('report'), async (req, res) => {
    try {
      const { driverName, fileName } = req.body;
      if (!driverName || !req.file) return res.status(400).json({ error: "driverName and report required" });
      const result = await dbStorage.uploadFile(req.file);
      const originalName = fileName || req.file.originalname || 'Laporan.pdf';
      await storage.addDriverInvestigationReport(driverName, `${result.url}|${originalName}`);
      res.json({ url: result.url, originalName });
    } catch (err) {
      console.error("[upload-report]", err);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.delete("/api/fms/driver-investigation/photo", async (req, res) => {
    try {
      const { driverName, url } = req.body;
      if (!driverName || !url) return res.status(400).json({ error: "driverName and url required" });
      await storage.removeDriverInvestigationPhoto(driverName, url);
      // Delete file from database storage if it's a DB-stored file
      if (url.startsWith('/api/uploads/')) {
        const fileId = url.replace('/api/uploads/', '');
        try { await dbStorage.deleteFile(fileId); } catch (_) {}
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[delete-photo]", err);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  app.delete("/api/fms/driver-investigation/report", async (req, res) => {
    try {
      const { driverName, url } = req.body; // url = the file path part (before '|')
      if (!driverName || !url) return res.status(400).json({ error: "driverName and url required" });
      await storage.removeDriverInvestigationReport(driverName, url);
      // Delete file from database storage if it's a DB-stored file
      if (url.startsWith('/api/uploads/')) {
        const fileId = url.replace('/api/uploads/', '');
        try { await dbStorage.deleteFile(fileId); } catch (_) {}
      }
      res.json({ ok: true });
    } catch (err) {
      console.error("[delete-report]", err);
      res.status(500).json({ error: "Delete failed" });
    }
  });

  // Manual driver level assignment
  app.put("/api/fms/driver-level-manual", async (req, res) => {
    try {
      const { driverName, level } = req.body;
      if (!driverName || typeof driverName !== 'string') {
        return res.status(400).json({ error: "driverName required" });
      }
      if (level !== null && level !== undefined && ![1, 2, 3, 4].includes(Number(level))) {
        return res.status(400).json({ error: "level must be 1, 2, 3, 4, or null" });
      }
      await storage.setFmsDriverLevel(driverName, level != null ? Number(level) : null);
      res.json({ ok: true });
    } catch (err) {
      console.error("[driver-level-manual]", err);
      res.status(500).json({ error: "Failed to save driver level" });
    }
  });

  app.get("/api/fms/driver-evaluations", async (req, res) => {
    try {
      const { month, week, violationType, startDate, endDate } = req.query;

      // Get all violations that have manual driver name
      const violations = await storage.getFmsViolations({
        violationType: typeof violationType === 'string' ? violationType : 'Mata Tertutup,Mengantuk,Kelelahan',
        month: typeof month === 'string' ? month : undefined,
        week: typeof week === 'string' ? week : undefined,
        startDate: typeof startDate === 'string' ? startDate : undefined,
        endDate: typeof endDate === 'string' ? endDate : undefined,
      });

      // Filter only records with manual driver name and Valid status
      const driverViolations = violations.filter(v =>
        v.manualDriverName &&
        v.manualDriverName.trim() !== '' &&
        v.validationStatus === 'Valid'
      );

      // Aggregate per driver
      const driverStats = new Map<string, any>();
      for (const v of driverViolations) {
        const key = v.manualDriverName!.trim().toUpperCase();
        if (!driverStats.has(key)) {
          driverStats.set(key, {
            driverName: v.manualDriverName!.trim(),
            driverNik: v.manualDriverNik || '-',
            vehicleNos: new Set<string>(),
            totalAlert: 0,
            mataTertutup: 0,
            mengantuk: 0,
            kelelahan: 0,
          });
        }
        const stat = driverStats.get(key)!;
        stat.vehicleNos.add(v.vehicleNo);
        stat.totalAlert++;
        if (v.violationType === 'Mata Tertutup') stat.mataTertutup++;
        else if (v.violationType === 'Mengantuk') stat.mengantuk++;
        else if (v.violationType === 'Kelelahan') stat.kelelahan++;
      }

      // Get sidak fatigue session counts per employee
      const sidakCounts = new Map<string, number>();
      try {
        const sidakSessions = await db.select({
          employeeName: sql<string>`UPPER(TRIM(sfr.nama))`,
          count: sql<number>`COUNT(DISTINCT sfs.id)`,
        })
          .from(sql`sidak_fatigue_sessions sfs`)
          .leftJoin(sql`sidak_fatigue_records sfr`, sql`sfr.session_id = sfs.id`)
          .groupBy(sql`UPPER(TRIM(sfr.nama))`);

        for (const s of sidakSessions) {
          if (s.employeeName) sidakCounts.set(s.employeeName, Number(s.count));
        }
      } catch (e) {
        console.error("[driver-evaluations] Sidak fatigue lookup skipped error:", e);
      }

      // Get PVT data per employee
      const pvtData = new Map<string, { avgRT: number | null; totalTests: number; status: string }>();
      try {
        const pvtResults = await db.select({
          employeeName: sql<string>`UPPER(TRIM(e.name))`,
          avgRT: sql<number>`AVG(sfr.pvt_mean_rt)`,
          totalTests: sql<number>`COUNT(sfr.id)`,
        })
          .from(sql`sidak_fatigue_records sfr`)
          .leftJoin(sql`employees e`, sql`e.id = sfr.employee_id`)
          .where(sql`sfr.pvt_mean_rt IS NOT NULL`)
          .groupBy(sql`UPPER(TRIM(e.name))`);

        for (const p of pvtResults) {
          if (p.employeeName) {
            const avg = Math.round(Number(p.avgRT));
            pvtData.set(p.employeeName, {
              avgRT: avg,
              totalTests: Number(p.totalTests),
              status: avg <= 350 ? 'Sangat Baik' : avg <= 500 ? 'Cukup' : 'Lambat',
            });
          }
        }
      } catch (e) {
        console.log("[driver-evaluations] PVT lookup skipped:", (e as Error).message);
      }

      // Fetch manually-assigned driver levels from DB
      const manualLevels = await storage.getAllFmsDriverLevels();

      // Combine data
      const result = Array.from(driverStats.values())
        .map((stat, index) => {
          const nameKey = stat.driverName.toUpperCase();
          const sidak = sidakCounts.get(nameKey) || 0;
          const pvt = pvtData.get(nameKey) || { avgRT: null, totalTests: 0, status: 'Belum Ada Data' };
          return {
            rank: index + 1,
            driverName: stat.driverName,
            driverNik: stat.driverNik,
            vehicleNos: Array.from(stat.vehicleNos).join(', '),
            totalAlert: stat.totalAlert,
            mataTertutup: stat.mataTertutup,
            mengantuk: stat.mengantuk,
            kelelahan: stat.kelelahan,
            sidakCount: sidak,
            pvtAvgRT: pvt.avgRT,
            pvtTotalTests: pvt.totalTests,
            pvtStatus: pvt.status,
            level: (manualLevels.get(nameKey) ?? null) as 1 | 2 | 3 | 4 | null,
          };
        })
        .sort((a, b) => b.totalAlert - a.totalAlert)
        .map((d, i) => ({ ...d, rank: i + 1 }));

      res.json({ drivers: result, total: result.length });
    } catch (error) {
      console.error("Error fetching driver evaluations:", error);
      res.status(500).json({ error: "Failed to fetch driver evaluations" });
    }
  });

  // 2. Upload Excel (Bulk Insert)
  app.post("/api/fms/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      // Dynamic import to avoid crash if missing
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(sheet);

      console.log(`[FMS Upload] Processing ${rawData.length} rows...`);

      console.log("[FMS Upload] Raw Row 0:", rawData[0]);

      const violations = rawData.map((row: any, index: number) => {
        // Safe mapping - find keys regardless of case/whitespace
        const getValue = (possibleKeys: string[]) => {
          const keys = Object.keys(row);
          for (const pk of possibleKeys) {
            const foundKey = keys.find(k => k.trim().toLowerCase() === pk.toLowerCase());
            if (foundKey && row[foundKey] !== undefined) return row[foundKey];
          }
          return undefined;
        };

        // Date Handling
        let vDate = getValue(['Date', 'Tanggal', 'violation_date']);
        if (typeof vDate === 'number') {
          vDate = new Date((vDate - (25567 + 2)) * 86400 * 1000).toISOString().split('T')[0];
        } else if (vDate instanceof Date) {
          vDate = vDate.toISOString().split('T')[0];
        }

        // Time Handling
        let vTime = getValue(['Time', 'Waktu', 'violation_time']) || "00:00:00";
        if (typeof vTime === 'number') {
          const totalSeconds = Math.floor(vTime * 86400);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          vTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        const vStatusRaw = String(getValue(['validation_status', 'validate', 'validation_validated', 'Validation', 'Status Validasi', 'Status', 'is_valid', 'validated', 'v', 'validasi']) || "Tidak Valid").trim();
        // Normalize to 'Valid' or 'Tidak Valid'
        const isTrue = (val: string) => {
          const v = val.toLowerCase().trim();
          // Specific business rules for AEBS/FMS
          if (v.includes('not emergency')) return false;
          if (v.includes('emergency')) return true;

          // Negative indicators (Indonesian & English)
          if (v.includes('tidak') || v.includes('bukan') || v.includes('invalid') || v.includes('false') || v === '0' || v === 'n' || v === 'no') return false;
          // Positive indicators
          if (v.includes('valid') || v === 'true' || v === '1' || v === 'y' || v === 'yes' || v === 'ok' || v === 'v') return true;
          return false;
        };
        const vStatus = isTrue(vStatusRaw) ? 'Valid' : 'Tidak Valid';

        if (index === 0) {
          console.log(`[FMS Upload] Row 0 Raw Data Keys: ${Object.keys(row).join(', ')}`);
          console.log(`[FMS Upload] Row 0 Mapping: Date=${vDate}, Time=${vTime}, RawStatus="${vStatusRaw}", NormalizedStatus=${vStatus}`);
        }

        return {
          violationDate: String(vDate || new Date().toISOString().split('T')[0]),
          violationTime: String(vTime),
          violationTimestamp: new Date(`${String(vDate).split('T')[0]}T${String(vTime)}`),

          vehicleNo: String(getValue(['Vehicle No', 'Vehicle No Company', 'No Lambung', 'vehicle_no']) || "-"),
          company: String(getValue(['Company', 'Perusahaan', 'company']) || "-"),
          violationType: String(getValue(['Violation', 'Jenis Pelanggaran', 'violation_type']) || "Unknown"),
          location: String(getValue(['Location', 'Lokasi', 'location']) || ""),
          coordinate: String(getValue(['Coordinate Level', 'Coordinate', 'coordinate']) || ""),

          shift: String(getValue(['Shift', 'shift']) || ""),
          dateOpr: getValue(['Date Opr', 'date_opr']) ? new Date(getValue(['Date Opr', 'date_opr'])).toISOString().split('T')[0] : null,
          week: Number(getValue(['Week', 'Minggu', 'week']) || 0),
          month: String(getValue(['Month', 'Bulan', 'month']) || ""),
          level: getValue(['Level', 'level']) ? Number(getValue(['Level', 'level'])) : null,
          category: categorizeViolation(String(getValue(['Violation', 'Jenis Pelanggaran', 'violation_type']) || "Unknown")),

          validationStatus: vStatus,

          // Validation tracking
          validatedBy: getValue(['Validated By', 'validated_by', 'Pengawas', 'Supervisor', 'Validator']) ? String(getValue(['Validated By', 'validated_by', 'Pengawas', 'Supervisor', 'Validator'])) : null,
          validatedAt: (() => {
            const rawVal = getValue(['Validated At', 'validated_at', 'Waktu Validasi', 'Validation Time']);
            if (!rawVal) return null;
            if (rawVal instanceof Date) return rawVal;
            if (typeof rawVal === 'number') {
              // Excel date serial number
              return new Date((rawVal - (25567 + 2)) * 86400 * 1000);
            }
            const parsed = new Date(rawVal);
            return isNaN(parsed.getTime()) ? null : parsed;
          })(),
          slaSeconds: (() => {
            const rawVal = getValue(['Validated At', 'validated_at', 'Waktu Validasi', 'Validation Time']);
            if (!rawVal || !vDate || !vTime) return null;
            let validatedDate: Date;
            if (rawVal instanceof Date) validatedDate = rawVal;
            else if (typeof rawVal === 'number') validatedDate = new Date((rawVal - (25567 + 2)) * 86400 * 1000);
            else validatedDate = new Date(rawVal);
            if (isNaN(validatedDate.getTime())) return null;
            const violationDate = new Date(`${String(vDate).split('T')[0]}T${String(vTime)}`);
            return Math.round((validatedDate.getTime() - violationDate.getTime()) / 1000);
          })(),
        };
      });

      console.log(`[FMS Upload] Inserting/Updating ${violations.length} violations...`);
      const result = await storage.batchInsertFmsViolations(violations);


      // Cleanup
      fs.unlinkSync(req.file.path);

      res.json({
        message: "Upload successful",
        processed: rawData.length,
        inserted: result.count
      });

    } catch (error: any) {
      console.error("Error processing FMS upload:", error);
      try {
        fs.appendFileSync('server_error.log', `[${new Date().toISOString()}] FMS Upload Error: ${error.message}\nStack: ${error.stack}\n\n`);
      } catch (e) { console.error("Log error", e); }
      res.status(500).json({ error: "Failed to process Excel file: " + error.message });
    }
  });

  // 3. Upload Excel Data Evaluasi Driver Name
  app.post("/api/fms/upload-driver-excel", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      let processedCount = 0;
      let updateCount = 0;

      const { db } = await import('./db');
      const { fmsViolations } = await import('@shared/schema');
      const { and, ilike, gte, lte } = await import('drizzle-orm');

      // Process all sheets
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(sheet);

        if (rawData.length === 0) continue;

        // Log headers for debugging
        const sampleRow = rawData[0] as object;
        const headers = Object.keys(sampleRow);
        console.log(`[FMS Driver Upload] Sheet: ${sheetName}, Headers:`, headers);

        for (const row of rawData as any[]) {
          let truck = "";
          let driverName = "";
          let rawDate: any = null;

          // Flexible header matching
          for (const key of Object.keys(row)) {
            const k = key.toLowerCase();
            if (k.includes('truck') || k.includes('lambung') || k.includes('unit')) {
              truck = String(row[key] || "").trim();
            } else if (k.includes('driver') || k.includes('karyawan') || k.includes('nama')) {
              driverName = String(row[key] || "").trim();
            } else if (k.includes('netto') || k.includes('waktu') || k.includes('datetime') || k.includes('date time')) {
              rawDate = row[key];
            }
          }

          if (!truck || !driverName || !rawDate) continue;
          processedCount++;

          let dateObj: Date;
          if (typeof rawDate === 'number') {
            // Excel serial date (e.g. 46083.5 -> 2026-03-01 12:00)
            dateObj = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
          } else {
            const dateTimeStr = String(rawDate).trim();
            if (!dateTimeStr) continue;
            // Clean common delimeters "06.03" -> "06:03"
            const cleanDateTimeStr = dateTimeStr.replace(/(\d{2})\.(\d{2})$/, "$1:$2").replace(/\s+/g, ' ');
            dateObj = new Date(cleanDateTimeStr);
          }

          if (isNaN(dateObj.getTime())) {
            console.log(`[FMS Driver Upload] Invalid date in sheet ${sheetName}: ${JSON.stringify(rawDate)}`);
            continue;
          }

          // Shift window: -14 hours to +14 hours
          const shiftStart = new Date(dateObj.getTime() - 14 * 60 * 60 * 1000);
          const shiftEnd = new Date(dateObj.getTime() + 14 * 60 * 60 * 1000);

          try {
            const result = await db.update(fmsViolations)
              .set({
                manualDriverName: driverName,
                uploadedAt: new Date()
              })
              .where(
                and(
                  ilike(fmsViolations.vehicleNo, `%${truck}%`),
                  gte(fmsViolations.violationTimestamp, shiftStart),
                  lte(fmsViolations.violationTimestamp, shiftEnd)
                )
              )
              .returning({ id: fmsViolations.id });

            if (result.length > 0) {
              console.log(`[FMS Driver Upload] Match: ${truck} -> ${driverName} (${result.length} recs, date: ${dateObj.toISOString()})`);
            }
            updateCount += result.length;
          } catch (updateErr) {
            console.error(`[FMS Driver Upload] Error updating ${truck} on ${sheetName}:`, updateErr);
          }
        }
      }

      // Cleanup
      const fs = await import('fs');
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) { }

      res.json({
        message: "Upload driver excel successful",
        processedRows: processedCount,
        updatedRecords: updateCount
      });
    } catch (error: any) {
      console.error("Error processing driver FMS upload:", error);
      res.status(500).json({ error: "Failed to process Driver Excel file: " + error.message });
    }
  });

  // ==========================================
  // INDUCTION ROUTES
  // ==========================================

  // Materials
  app.get("/api/induction/materials", async (req, res) => {
    const materials = await storage.getInductionMaterials();
    res.json(materials);
  });

  app.get("/api/induction/materials/:id", async (req, res) => {
    const material = await storage.getInductionMaterial(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json(material);
  });

  app.post("/api/induction/materials", uploadMemory.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const { url: fileUrl } = await dbStorage.uploadFile(req.file);

      const material = await storage.createInductionMaterial({
        ...req.body,
        fileName: req.file.originalname,
        fileUrl: fileUrl,
        fileType: req.file.mimetype === "application/pdf" ? "pdf" : "pptx",
        uploadedBy: (req.user as any)?.id // Handle auth context
      });

      res.status(201).json(material);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/induction/materials/:id", async (req, res) => {
    await storage.deleteInductionMaterial(req.params.id);
    res.json({ success: true });
  });

  // Questions
  app.get("/api/induction/questions", async (req, res) => {
    const materialId = req.query.materialId as string;
    const questions = await storage.getInductionQuestions(materialId);
    res.json(questions);
  });

  app.post("/api/induction/questions", async (req, res) => {
    const question = await storage.createInductionQuestion(req.body);
    res.status(201).json(question);
  });

  app.delete("/api/induction/questions/:id", async (req, res) => {
    await storage.deleteInductionQuestion(req.params.id);
    res.json({ success: true });
  });

  // AI Generation
  app.post("/api/induction/questions/generate-from-material", async (req, res) => {
    try {
      const { materialId } = req.body;
      if (!materialId) return res.status(400).json({ error: "Material ID is required" });

      const material = await storage.getInductionMaterial(materialId);
      if (!material) return res.status(404).json({ error: "Material not found" });

      if (!material.fileUrl || !material.fileType) {
        return res.status(400).json({ error: "Material has no file associated" });
      }

      // Resolve file path (assuming local upload)
      // Remove '/uploads/' from usage if it's there
      const filename = material.fileUrl.split('/').pop();
      if (!filename) return res.status(400).json({ error: "Invalid file path" });

      const filePath = path.join(process.cwd(), 'uploads', filename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found on server" });
      }

      console.log(`Generating questions for material: ${material.title} (${filePath})`);

      const generatedQuestions = await inductionAiService.generateQuestionsFromMaterial(filePath, material.fileType);

      // Save questions to database
      const savedQuestions = [];
      for (const [index, q] of generatedQuestions.entries()) {
        const saved = await storage.createInductionQuestion({
          materialId: material.id,
          questionText: q.questionText,
          options: q.options.map(o => o.text), // Array of strings
          correctAnswerIndex: q.correctAnswerIndex, // Index 0-3
          order: index + 1,
          isActive: true
        });
        savedQuestions.push(saved);
      }

      res.json({ success: true, count: savedQuestions.length, questions: savedQuestions });
    } catch (error: any) {
      console.error("Generate Questions Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Schedules
  app.get("/api/induction/schedules", async (req, res) => {
    const date = req.query.date as string;
    const schedules = await storage.getInductionSchedules(date);
    res.json(schedules);
  });

  app.post("/api/induction/schedules", async (req, res) => {
    const schedule = await storage.createInductionSchedule(req.body);
    res.status(201).json(schedule);
  });

  // Manual trigger H-1 detection - Generate induction schedules for drivers returning from leave
  app.post("/api/induction/generate-schedules", async (req, res) => {
    console.log('🎓 Manual trigger: Generating induction schedules...');
    try {
      // Get tomorrow's date (the day driver will start working)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get today's date
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Query roster for tomorrow and today using raw SQL through db
      const { db } = await import('./db');
      const { rosterSchedules, employees } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');

      const tomorrowRoster = await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, tomorrowStr));
      const todayRoster = await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, todayStr));
      const todayRosterMap = new Map(todayRoster.map(r => [r.employeeId, r]));

      let generatedCount = 0;
      const generatedSchedules = [];

      for (const entry of tomorrowRoster) {
        // Skip if driver is on leave tomorrow
        if (entry.shift === 'CUTI') continue;

        // Check if driver is on leave today (meaning tomorrow is their first day back)
        const todayEntry = todayRosterMap.get(entry.employeeId);
        const wasOnLeaveToday = todayEntry?.shift === 'CUTI';

        if (wasOnLeaveToday) {
          // Check if employee already has a pending induction schedule
          const existingSchedule = await storage.getPendingInductionSchedule(entry.employeeId);

          if (!existingSchedule) {
            // Create new induction schedule for tomorrow
            const newSchedule = await storage.createInductionSchedule({
              employeeId: entry.employeeId,
              scheduledDate: tomorrowStr,
              reason: 'Pasca Cuti',
              status: 'pending'
            });
            generatedSchedules.push(newSchedule);
            generatedCount++;
          }
        }
      }

      console.log(`🎓 Manual trigger complete: ${generatedCount} new schedules`);
      res.json({
        success: true,
        count: generatedCount,
        schedules: generatedSchedules,
        message: `Berhasil generate ${generatedCount} jadwal induksi baru`
      });
    } catch (error: any) {
      console.error('❌ Error in manual schedule generation:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Sinkron Roster H-1: Deteksi driver yang besok masuk kerja setelah cuti & buat jadwal + kirim WA
  app.post("/api/induction/sync-roster", async (req, res) => {
    const { sendReminder = false } = req.body;
    try {
      const { db } = await import('./db');
      const { rosterSchedules } = await import('@shared/schema');
      const { eq, sql: sqlExpr } = await import('drizzle-orm');

      const LEAVE_SHIFTS = ['CUTI'];
      const WORK_SHIFTS = ['SHIFT 1', 'SHIFT 2'];

      // Besok = H+1 dari hari ini
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Cek 7 hari ke belakang untuk deteksi cuti konsekutif
      const checkDays: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i + 1);
        checkDays.push(d.toISOString().split('T')[0]);
      }
      // checkDays[0] = hari ini, checkDays[6] = 7 hari lalu

      // Ambil roster besok (driver yang akan kerja)
      const tomorrowRoster = await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, tomorrowStr));
      const workingTomorrow = tomorrowRoster.filter((r: any) => WORK_SHIFTS.includes(r.shift));

      // Ambil roster 7 hari ke belakang
      const pastRosterMap = new Map<string, Map<string, string>>(); // employeeId -> date -> shift
      for (const day of checkDays) {
        const dayRoster = await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, day));
        for (const r of dayRoster) {
          if (!pastRosterMap.has(r.employeeId)) pastRosterMap.set(r.employeeId, new Map());
          pastRosterMap.get(r.employeeId)!.set(day, r.shift);
        }
      }

      const drivers: any[] = [];
      let generatedCount = 0;
      let sentCount = 0;
      let failedCount = 0;

      for (const entry of workingTomorrow) {
        // Cek apakah driver ini sedang dalam cuti konsekutif (minimal hari ini cuti)
        const empDays = pastRosterMap.get(entry.employeeId);
        const todayShift = empDays?.get(checkDays[0]) || '';
        if (!LEAVE_SHIFTS.includes(todayShift)) continue; // Hari ini harus CUTI

        // Hitung berapa hari konsekutif cuti
        let consecutiveLeaveDays = 0;
        for (const day of checkDays) {
          const shift = empDays?.get(day) || '';
          if (LEAVE_SHIFTS.includes(shift)) consecutiveLeaveDays++;
          else break;
        }

        // Cek existing schedule
        const existingSchedule = await storage.getPendingInductionSchedule(entry.employeeId);

        let scheduleId: string | null = null;
        if (!existingSchedule) {
          const newSchedule = await storage.createInductionSchedule({
            employeeId: entry.employeeId,
            scheduledDate: tomorrowStr,
            reason: 'Pasca Cuti',
            status: 'pending'
          });
          generatedCount++;
          scheduleId = newSchedule.id;
          drivers.push({ employeeId: entry.employeeId, scheduledDate: tomorrowStr, consecutiveLeaveDays, scheduleId, action: 'created' });
        } else {
          scheduleId = existingSchedule.id;
          drivers.push({ employeeId: entry.employeeId, scheduledDate: tomorrowStr, consecutiveLeaveDays, scheduleId, action: 'existing' });
        }

        // Kirim WA jika diminta
        if (sendReminder && scheduleId) {
          try {
            const schedule = await storage.getInductionSchedule(scheduleId);
            if (schedule?.employee?.phone) {
              const message = `Yth. ${schedule.employee.name},\n\nHarap segera merapat ke kantor untuk melakukan *Refresh Induksi* dan *Pengambilan SIMPER* pada:\n📅 Tanggal: *${new Date(schedule.scheduledDate).toLocaleDateString("id-ID")}*\n🕒 Pukul: *14:00 WITA*\n\nKehadiran Anda wajib tepat waktu.\n\nTerima kasih,\nHSE Team`;
              const result = await sendWhatsAppMessage({
                phone: schedule.employee.phone,
                message,
                logContext: { module: 'INDUCTION', referenceId: scheduleId, referenceName: schedule.employee.name, recipientType: 'EMPLOYEE', messageType: 'REMINDER' }
              });
              if (result.success) {
                await storage.updateInductionSchedule(scheduleId, { notifiedAt: new Date(), notifiedVia: 'whatsapp' });
                sentCount++;
              } else {
                failedCount++;
              }
            }
          } catch {
            failedCount++;
          }
        }
      }

      res.json({
        success: true,
        generated: generatedCount,
        sent: sentCount,
        failed: failedCount,
        drivers,
        message: `Sinkron selesai: ${generatedCount} jadwal baru${sendReminder ? `, ${sentCount} WA terkirim, ${failedCount} gagal` : ''}`
      });
    } catch (error: any) {
      console.error('❌ Error sync-roster:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Kirim WA ke semua jadwal pending (batch)
  app.post("/api/induction/send-all-pending", async (req, res) => {
    try {
      const schedules = await storage.getInductionSchedules();
      const pending = schedules.filter((s: any) => !s.notifiedAt);
      let sent = 0, failed = 0, skipped = 0;

      for (const schedule of pending) {
        if (!schedule.employee?.phone) { skipped++; continue; }
        try {
          const message = `Yth. ${schedule.employee.name},\n\nHarap segera merapat ke kantor untuk melakukan *Refresh Induksi* dan *Pengambilan SIMPER* pada:\n📅 Tanggal: *${new Date(schedule.scheduledDate).toLocaleDateString("id-ID")}*\n🕒 Pukul: *14:00 WITA*\n\nKehadiran Anda wajib tepat waktu.\n\nTerima kasih,\nHSE Team`;
          const result = await sendWhatsAppMessage({
            phone: schedule.employee.phone,
            message,
            logContext: { module: 'INDUCTION', referenceId: schedule.id, referenceName: schedule.employee.name, recipientType: 'EMPLOYEE', messageType: 'REMINDER' }
          });
          if (result.success) {
            await storage.updateInductionSchedule(schedule.id, { notifiedAt: new Date(), notifiedVia: 'whatsapp' });
            sent++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      res.json({ success: true, sent, failed, skipped, message: `${sent} WA terkirim, ${failed} gagal, ${skipped} tidak ada nomor` });
    } catch (error: any) {
      console.error('❌ Error send-all-pending:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // WhatsApp Reminder
  app.post("/api/induction/send-reminder", async (req, res) => {
    try {
      const { scheduleId } = req.body;
      const schedule = await storage.getInductionSchedule(scheduleId);
      if (!schedule) return res.status(404).json({ error: "Schedule not found" });

      const phone = schedule.employee.phone;
      if (!phone) return res.status(400).json({ error: "Employee has no phone number" });

      const message = `Yth. ${schedule.employee.name},\n\nHarap segera merapat ke kantor untuk melakukan *Refresh Induksi* dan *Pengambilan SIMPER* pada:\n📅 Tanggal: *${new Date(schedule.scheduledDate).toLocaleDateString("id-ID")}*\n🕒 Pukul: *14:00 WITA*\n\nKehadiran Anda wajib tepat waktu.\n\nTerima kasih,\nHSE Team`;

      const result = await sendWhatsAppMessage({
        phone,
        message,
        logContext: {
          module: 'INDUCTION',
          referenceId: scheduleId,
          referenceName: schedule.employee.name,
          recipientType: 'EMPLOYEE',
          messageType: 'REMINDER'
        }
      });

      if (result.success) {
        await storage.updateInductionSchedule(scheduleId, {
          notifiedAt: new Date(),
          notifiedVia: 'whatsapp'
        });
        res.json({ success: true, result });
      } else {
        res.status(500).json({ error: "Failed to send WhatsApp", details: result });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/induction/my-schedule", async (req, res) => {
    // Needs authentication context
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const schedule = await storage.getPendingInductionSchedule((req.user as any).id); // Assuming user.id is employee/user id
    res.json(schedule);
  });

  app.post("/api/induction/answers", async (req, res) => {
    try {
      const answer = await storage.createInductionAnswer(req.body);
      res.status(201).json(answer);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Submit Quiz - Process answers and calculate score
  app.post("/api/induction/submit-quiz", async (req, res) => {
    try {
      const { scheduleId, answers } = req.body;
      if (!scheduleId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: "scheduleId and answers array are required" });
      }

      // Fetch all questions to validate answers
      const questions = await storage.getInductionQuestions();
      const questionMap = new Map(questions.map(q => [q.id, q]));

      let correctCount = 0;
      const processedAnswers = [];

      for (const ans of answers) {
        const question = questionMap.get(ans.questionId);
        if (!question) continue;

        const isCorrect = question.correctAnswerIndex === ans.selectedAnswerIndex;
        if (isCorrect) correctCount++;

        // Save each answer
        const savedAnswer = await storage.createInductionAnswer({
          scheduleId,
          questionId: ans.questionId,
          selectedAnswerIndex: ans.selectedAnswerIndex,
          isCorrect
        });
        processedAnswers.push(savedAnswer);
      }

      const total = questions.length;
      const score = correctCount;
      const passed = (correctCount / total) >= 0.7; // 70% passing score

      // Update schedule status
      await storage.updateInductionSchedule(scheduleId, {
        status: passed ? "completed" : "failed",
        completedAt: new Date(),
        score
      });

      res.json({
        success: true,
        score,
        total,
        passed,
        percentage: Math.round((correctCount / total) * 100)
      });
    } catch (e: any) {
      console.error("Submit Quiz Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // SIDAK WORKSHOP ROUTES
  // ============================================

  // Get all sessions
  app.get("/api/sidak-workshop/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakWorkshopSessions();
      res.json(sessions);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get single session with equipment and inspectors
  app.get("/api/sidak-workshop/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSidakWorkshopSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const equipment = await storage.getSidakWorkshopEquipment(req.params.id);
      const inspectors = await storage.getSidakWorkshopInspectors(req.params.id);

      res.json({ session, equipment, inspectors });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create new session
  app.post("/api/sidak-workshop/sessions", async (req, res) => {
    try {
      const parsed = insertSidakWorkshopSessionSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error });

      const session = await storage.createSidakWorkshopSession(parsed.data);
      res.status(201).json(session);
    } catch (e: any) {
      console.error("Create SIDAK Workshop Session Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Update session
  app.put("/api/sidak-workshop/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSidakWorkshopSession(req.params.id, req.body);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Delete session
  app.delete("/api/sidak-workshop/sessions/:id", async (req, res) => {
    try {
      await storage.deleteSidakWorkshopSession(req.params.id);
      res.sendStatus(204);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Add equipment to session
  app.post("/api/sidak-workshop/sessions/:sessionId/equipment", async (req, res) => {
    try {
      const equipment = await storage.createSidakWorkshopEquipment({
        ...req.body,
        sessionId: req.params.sessionId
      });

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_WORKSHOP",
        referenceId: equipment.id,
        sessionId: req.params.sessionId,
        inspectionResults: equipment.inspectionResults,
        tindakLanjut: equipment.tindakLanjutPerbaikan,
        dueDate: equipment.dueDate,
        moduleLabel: "Sidak Workshop"
      });

      res.status(201).json(equipment);
    } catch (e: any) {
      console.error("Create SIDAK Workshop Equipment Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Add inspector to session
  app.post("/api/sidak-workshop/sessions/:sessionId/inspectors", async (req, res) => {
    try {
      const inspector = await storage.createSidakWorkshopInspector({
        ...req.body,
        sessionId: req.params.sessionId
      });
      res.status(201).json(inspector);
    } catch (e: any) {
      console.error("Create SIDAK Workshop Inspector Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================
  // SIDAK INTERCOM PENGAWAS FMS ENDPOINTS
  // ============================================

  // Get all intercom sessions
  app.get("/api/sidak-intercom/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllSidakIntercomSessions();

      const sessionsWithDetails = await Promise.all(
        sessions.map(async (session) => {
          const [records, observers] = await Promise.all([
            storage.getSidakIntercomRecords(session.id),
            storage.getSidakIntercomObservers(session.id)
          ]);
          return {
            ...session,
            records,
            observers
          };
        })
      );

      res.json(sessionsWithDetails);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get single session with records and observers
  app.get("/api/sidak-intercom/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getSidakIntercomSession(req.params.id);
      if (!session) return res.status(404).json({ error: "Intercom session not found" });

      const [records, observers] = await Promise.all([
        storage.getSidakIntercomRecords(session.id),
        storage.getSidakIntercomObservers(session.id)
      ]);

      res.json({ ...session, records, observers });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Create new session
  app.post("/api/sidak-intercom/sessions", async (req, res) => {
    try {
      const session = await storage.createSidakIntercomSession(req.body);
      res.status(201).json(session);
    } catch (e: any) {
      console.error("Create SIDAK Intercom Session Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Update session
  app.put("/api/sidak-intercom/sessions/:id", async (req, res) => {
    try {
      const session = await storage.updateSidakIntercomSession(req.params.id, req.body);
      if (!session) return res.status(404).json({ error: "Session not found" });
      res.json(session);
    } catch (e: any) {
      console.error("Update SIDAK Intercom Session Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Add record to session
  app.post("/api/sidak-intercom/sessions/:sessionId/records", async (req, res) => {
    try {
      const record = await storage.createSidakIntercomRecord({
        ...req.body,
        sessionId: req.params.sessionId
      });

      // Auto-PICA creation
      PicaService.checkAndCreatePica({
        moduleSource: "SIDAK_INTERCOM",
        referenceId: record.id,
        sessionId: req.params.sessionId,
        inspectionResults: record.checklistResults,
        moduleLabel: "Sidak Intercom"
      });

      res.status(201).json(record);
    } catch (e: any) {
      console.error("Create SIDAK Intercom Record Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Add observer to session
  app.post("/api/sidak-intercom/sessions/:sessionId/observers", async (req, res) => {
    try {
      const observer = await storage.createSidakIntercomObserver({
        ...req.body,
        sessionId: req.params.sessionId
      });
      res.status(201).json(observer);
    } catch (e: any) {
      console.error("Create SIDAK Intercom Observer Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Add photos to session
  app.post("/api/sidak-intercom/sessions/:sessionId/photos", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const { photos } = req.body;
      if (!Array.isArray(photos)) {
        return res.status(400).json({ error: "photos must be an array" });
      }

      const session = await storage.getSidakIntercomSession(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const currentPhotos = session.activityPhotos || [];
      const updatedPhotos = [...currentPhotos, ...photos].slice(0, 6); // Max 6

      await storage.updateSidakIntercomSession(sessionId, { activityPhotos: updatedPhotos });
      res.json({ photos: updatedPhotos });
    } catch (e: any) {
      console.error("Upload SIDAK Intercom photos error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Delete photo from session
  app.delete("/api/sidak-intercom/sessions/:sessionId/photos/:photoIndex", async (req, res) => {
    try {
      const sessionId = req.params.sessionId;
      const photoIndex = parseInt(req.params.photoIndex);

      const session = await storage.getSidakIntercomSession(sessionId);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const currentPhotos = session.activityPhotos || [];
      if (photoIndex < 0 || photoIndex >= currentPhotos.length) {
        return res.status(400).json({ error: "Invalid photo index" });
      }

      currentPhotos.splice(photoIndex, 1);
      await storage.updateSidakIntercomSession(sessionId, { activityPhotos: currentPhotos });
      res.json({ photos: currentPhotos });
    } catch (e: any) {
      console.error("Delete SIDAK Intercom photo error:", e);
      res.status(500).json({ error: e.message });
    }
  });


  // ============================================
  // MCU ENDPOINTS
  // ============================================

  app.get("/api/hse/mcu", async (req, res) => {
    try {
      const records = await storage.getMcuRecords();
      res.json(records);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/hse/mcu/stats", async (req, res) => {
    try {
      const stats = await storage.getMcuStatistics();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/hse/mcu/:id", async (req, res) => {
    try {
      const record = await storage.getMcuRecord(req.params.id);
      if (!record) return res.status(404).json({ error: "MCU record not found" });
      res.json(record);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/hse/mcu", async (req, res) => {
    try {
      const record = await storage.createMcuRecord(req.body);
      res.status(201).json(record);
    } catch (e: any) {
      console.error("Create MCU Erorr:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.put("/api/hse/mcu/:id", async (req, res) => {
    try {
      const record = await storage.updateMcuRecord(req.params.id, req.body);
      if (!record) return res.status(404).json({ error: "MCU record not found" });
      res.json(record);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/hse/mcu/:id", async (req, res) => {
    try {
      const success = await storage.deleteMcuRecord(req.params.id);
      if (!success) return res.status(404).json({ error: "MCU record not found" });
      res.sendStatus(204);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============================================================================
  // GOOGLE SHEETS API ROUTES
  // ============================================================================

  app.get("/api/google-sheets/metadata/:spreadsheetId", async (req, res) => {
    try {
      const { spreadsheetId } = req.params;
      const metadata = await getSpreadsheetMetadata(spreadsheetId);
      res.json(metadata);
    } catch (error: any) {
      console.error("Error fetching spreadsheet metadata:", error);
      res.status(500).json({ error: error.message || "Failed to fetch metadata" });
    }
  });

  app.get("/api/google-sheets/sheets/:spreadsheetId", async (req, res) => {
    try {
      const { spreadsheetId } = req.params;
      const sheets = await listSpreadsheetSheets(spreadsheetId);
      res.json({ sheets });
    } catch (error: any) {
      console.error("Error listing sheets:", error);
      res.status(500).json({ error: error.message || "Failed to list sheets" });
    }
  });

  app.get("/api/google-sheets/data/:spreadsheetId/:sheetName", async (req, res) => {
    try {
      const { spreadsheetId, sheetName } = req.params;
      const { range } = req.query;
      const data = await fetchSheetData(spreadsheetId, decodeURIComponent(sheetName), range as string | undefined);

      const visualizationSuggestions = generateVisualizationSuggestions(data.columns);

      res.json({
        ...data,
        visualizationSuggestions
      });
    } catch (error: any) {
      console.error("Error fetching sheet data:", error);
      res.status(500).json({ error: error.message || "Failed to fetch data" });
    }
  });

  app.post("/api/google-sheets/analyze", async (req, res) => {
    try {
      const { spreadsheetId, sheetName, range } = req.body;

      if (!spreadsheetId || !sheetName) {
        return res.status(400).json({ error: "spreadsheetId and sheetName are required" });
      }

      const data = await fetchSheetData(spreadsheetId, sheetName, range);
      const visualizations = generateVisualizationSuggestions(data.columns);

      res.json({
        columns: data.columns,
        rowCount: data.totalRows,
        visualizations,
        preview: data.rows.slice(0, 10)
      });
    } catch (error: any) {
      console.error("Error analyzing sheet:", error);
      res.status(500).json({ error: error.message || "Failed to analyze sheet" });
    }
  });


  // ============================================
  // EVALUASI DRIVER DASHBOARD
  // ============================================

  app.get("/api/evaluasi-driver", async (req, res) => {
    try {
      const { month, status, startDate, endDate } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: "Month (YYYY-MM) is required" });
      }

      console.log(`[API] Fetching Evaluasi Driver for ${month}, status: ${status}`);

      // 1. Fetch employees and sessions in parallel for speed
      const [allEmployees, allSessions] = await Promise.all([
        storage.getAllEmployees(),
        storage.getAllSidakFatigueSessions()
      ]);
      const activeEmployees = allEmployees.filter(e => e.status === 'active');

      // 2. Filter sessions by week range (if provided) or month
      const monthSessions = allSessions.filter(s => {
        if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
          return s.tanggal >= startDate && s.tanggal <= endDate;
        }
        return s.tanggal.startsWith(month);
      });
      const sessionIds = monthSessions.map(s => s.id);

      // 3. Get all records for these sessions
      const records = sessionIds.length > 0
        ? await storage.getSidakFatigueRecordsBySessionIds(sessionIds)
        : [];

      // 4. Aggregate data
      const driverStats = new Map<string, number>();

      records.forEach(record => {
        // Prefer employeeId
        let empKey = record.employeeId;

        // Fallback to NIK matching if employeeId is missing
        if (!empKey && record.nik) {
          const emp = activeEmployees.find(e => e.id === record.nik);
          if (emp) empKey = emp.id;
        }

        if (empKey) {
          driverStats.set(empKey, (driverStats.get(empKey) || 0) + 1);
        }
      });

      // 5. Build response list
      // Count summaries first (based on ALL active employees)
      const allDriverStats = activeEmployees.map(emp => {
        const totalSidak = driverStats.get(emp.id) || 0;
        return {
          id: emp.id,
          nama: emp.name,
          nik: emp.id,
          totalSidak,
          status: totalSidak > 0 ? "Sudah SIDAK" : "Belum SIDAK"
        };
      });

      const totalDrivers = activeEmployees.length;
      const totalSudahSidak = allDriverStats.filter(d => d.totalSidak > 0).length;
      const totalBelumSidak = totalDrivers - totalSudahSidak;
      const totalSidakKeseluruhan = records.length;

      const summary = {
        totalDrivers,
        sudahSidak: totalSudahSidak,
        belumSidak: totalBelumSidak,
        totalSidakKeseluruhan
      };

      // 6. Filter returned drivers list based on query param
      let filteredDrivers = allDriverStats;
      if (status === 'sudah') {
        filteredDrivers = allDriverStats.filter(d => d.totalSidak > 0);
      } else if (status === 'belum') {
        filteredDrivers = allDriverStats.filter(d => d.totalSidak === 0);
      }

      // Sorting: Highest SIDAK count first
      filteredDrivers.sort((a, b) => b.totalSidak - a.totalSidak);

      res.json({
        summary,
        drivers: filteredDrivers,
        month
      });

    } catch (e: any) {
      console.error("Evaluasi Driver API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Get checks detail for a specific driver in a specific month
  app.get("/api/evaluasi-driver/:employeeId/details", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: "Month (YYYY-MM) is required" });
      }

      console.log(`[API] Fetching Driver Details for ${employeeId} in ${month}`);

      // 1. Get employee data
      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      // 2. Get all fatigue sessions for the month
      const allSessions = await storage.getAllSidakFatigueSessions();
      const monthSessions = allSessions.filter(s => s.tanggal.startsWith(month));
      const sessionIds = monthSessions.map(s => s.id);

      if (sessionIds.length === 0) {
        return res.json({ employee, records: [] });
      }

      // 3. Get all records for these sessions
      const allRecords = await storage.getSidakFatigueRecordsBySessionIds(sessionIds);

      // 4. Filter for this specific employee
      // Match by employeeId OR nik
      const employeeRecords = allRecords.filter(r =>
        r.employeeId === employeeId || r.nik === employee.nik || r.nik === employeeId
      );

      // 5. Enrich with session info (Date, Location, etc)
      const enrichedRecords = employeeRecords.map(record => {
        const session = monthSessions.find(s => s.id === record.sessionId);
        return {
          ...record,
          tanggal: session?.tanggal || "-",
          waktu: session?.waktu || "-",
          lokasi: session?.lokasi || "-",
          shift: session?.shift || "-",
          evaluator: session?.createdBy || "System"
        };
      });

      // Sort by date desc
      enrichedRecords.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      res.json({
        employee,
        records: enrichedRecords
      });

    } catch (e: any) {
      console.error("Driver Details API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/evaluasi-pvt", async (req, res) => {
    try {
      const { month, status, pvtStatus, startDate, endDate } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: "Month (YYYY-MM) is required" });
      }

      console.log(`[API] Fetching Evaluasi PVT for ${month}, status: ${status}, pvtStatus: ${pvtStatus}`);

      // 1. Get all active employees
      const allEmployees = await storage.getAllEmployees();
      const activeEmployees = allEmployees.filter(e => e.status === 'active');

      // 2. Get all fatigue sessions filtered by week range or month
      const allSessions = await storage.getAllSidakFatigueSessions();
      const monthSessions = allSessions.filter(s => {
        const d = String(s.tanggal).slice(0, 10);
        if (startDate && endDate && typeof startDate === 'string' && typeof endDate === 'string') {
          return d >= startDate && d <= endDate;
        }
        return d.startsWith(month);
      });
      const sessionIds = monthSessions.map(s => s.id);

      // 3. Get all records for these sessions
      let records: any[] = [];
      if (sessionIds.length > 0) {
        records = await storage.getSidakFatigueRecordsBySessionIds(sessionIds);
      }

      // Filter only records that have PVT data
      const pvtRecords = records.filter(r => r.pvtMeanRT !== null && r.pvtMeanRT !== undefined);

      // 4. Aggregate data
      const driverPvtStats = new Map<string, { totalRT: number, count: number, latestRT: number }>();

      pvtRecords.forEach(record => {
        let empKey = record.employeeId;
        if (!empKey && record.nik) {
          const emp = activeEmployees.find(e => e.id === record.nik);
          if (emp) empKey = emp.id;
        }

        if (empKey) {
          const current = driverPvtStats.get(empKey) || { totalRT: 0, count: 0, latestRT: 0 };
          current.totalRT += record.pvtMeanRT!;
          current.count += 1;
          current.latestRT = record.pvtMeanRT!;
          driverPvtStats.set(empKey, current);
        }
      });

      // 5. Build response list
      const allDriverStats = activeEmployees.map(emp => {
        const stats = driverPvtStats.get(emp.id);
        const avgRT = stats ? Math.round(stats.totalRT / stats.count) : null;
        const totalTests = stats ? stats.count : 0;

        let pvtStatus = "Normal";
        if (avgRT) {
          if (avgRT <= 350) pvtStatus = "Sangat Baik";
          else if (avgRT <= 500) pvtStatus = "Cukup";
          else pvtStatus = "Lambat";
        } else {
          pvtStatus = "Belum Ada Data";
        }

        return {
          id: emp.id,
          nama: emp.name,
          nik: emp.id,
          avgRT,
          lastRT: stats?.latestRT || null,
          totalTests,
          status: pvtStatus
        };
      });

      const totalDrivers = activeEmployees.length;
      const totalTested = allDriverStats.filter(d => d.totalTests > 0).length;
      const avgSystemRT = pvtRecords.length > 0
        ? Math.round(pvtRecords.reduce((acc, r) => acc + (r.pvtMeanRT || 0), 0) / pvtRecords.length)
        : 0;

      const summary = {
        totalDrivers,
        totalTested,
        totalUntested: totalDrivers - totalTested,
        avgSystemRT,
        totalTests: pvtRecords.length
      };

      // 6. Filter returned drivers list
      let filteredDrivers = allDriverStats;
      if (status === 'tested') {
        filteredDrivers = allDriverStats.filter(d => d.totalTests > 0);
      } else if (status === 'untested') {
        filteredDrivers = allDriverStats.filter(d => d.totalTests === 0);
      }

      if (pvtStatus && pvtStatus !== 'semua') {
        filteredDrivers = filteredDrivers.filter(d => d.status === pvtStatus);
      }

      // Sorting: Lowest average RT first (best performers)
      filteredDrivers.sort((a, b) => {
        if (a.avgRT === null) return 1;
        if (b.avgRT === null) return -1;
        return a.avgRT - b.avgRT;
      });

      res.json({
        summary,
        drivers: filteredDrivers,
        month
      });

    } catch (e: any) {
      console.error("Evaluasi PVT API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/evaluasi-pvt/:employeeId/details", async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { month } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: "Month (YYYY-MM) is required" });
      }

      const employee = await storage.getEmployee(employeeId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const allSessions = await storage.getAllSidakFatigueSessions();
      const monthSessions = allSessions.filter(s => s.tanggal.startsWith(month));
      const sessionIds = monthSessions.map(s => s.id);

      if (sessionIds.length === 0) {
        return res.json({ employee, records: [] });
      }

      const allRecords = await storage.getSidakFatigueRecordsBySessionIds(sessionIds);
      const employeeRecords = allRecords.filter(r =>
        (r.employeeId === employeeId || r.nik === employee.nik || r.nik === employeeId) &&
        r.pvtMeanRT !== null && r.pvtMeanRT !== undefined
      );

      const enrichedRecords = employeeRecords.map(record => {
        const session = monthSessions.find(s => s.id === record.sessionId);
        return {
          ...record,
          tanggal: session?.tanggal || "-",
          waktu: session?.waktu || "-",
          lokasi: session?.lokasi || "-",
          shift: session?.shift || "-",
          evaluator: session?.createdBy || "System"
        };
      });

      enrichedRecords.sort((a, b) => {
        const dateA = new Date(a.tanggal + "T" + (a.waktu || "00:00")).getTime();
        const dateB = new Date(b.tanggal + "T" + (b.waktu || "00:00")).getTime();
        return dateB - dateA;
      });

      res.json({
        employee,
        records: enrichedRecords
      });

    } catch (e: any) {
      console.error("PVT Details API Error:", e);
      res.status(500).json({ error: e.message });
    }
  });


  // WhatsApp Settings Routes
  app.get("/api/settings/whatsapp", async (req, res) => {
    try {
      const apiKey = await storage.getSystemSetting('WHATSAPP_API_KEY');
      const adminPhone = await storage.getSystemSetting('WHATSAPP_ADMIN_PHONE');
      // Mask API key for security
      const maskedKey = apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : '';

      res.json({
        apiKey: maskedKey,
        isConfigured: !!apiKey,
        adminPhone: adminPhone || ''
      });
    } catch (error) {
      console.error("Error fetching WhatsApp settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/whatsapp", async (req, res) => {
    try {
      const { apiKey, adminPhone } = req.body;

      // Only update if value is provided (and not just the masked version)
      if (apiKey && !apiKey.includes('...')) {
        await storage.setSystemSetting('WHATSAPP_API_KEY', apiKey, 'WhatsApp API Key for Notifyme.id');
      }

      if (adminPhone) {
        await storage.setSystemSetting('WHATSAPP_ADMIN_PHONE', adminPhone, 'WhatsApp Admin Phone Number');
      }

      res.json({ message: "Settings saved successfully" });
    } catch (error) {
      console.error("Error saving WhatsApp settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // ==================================================
  // WHATSAPP BLAST ENHANCED ENDPOINTS
  // ==================================================

  // Get all employees for blast selection
  app.get("/api/whatsapp/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      // Filter employees with phone numbers
      const employeesWithPhone = employees.filter(e => e.phone && e.phone.trim() !== '');
      res.json(employeesWithPhone.map(e => ({
        id: e.id,
        name: e.name,
        department: e.department,
        position: e.position,
        phone: e.phone,
        status: e.status
      })));
    } catch (error) {
      console.error("Error fetching employees for blast:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Debug endpoint to check blast configuration
  app.post("/api/whatsapp/blast-debug", async (req, res) => {
    try {
      const { selectedEmployeeIds } = req.body;
      const allEmployees = await storage.getAllEmployees();
      const employeesWithPhone = allEmployees.filter(e => e.phone && e.phone.trim() !== '');

      let recipients: any[] = [];
      if (selectedEmployeeIds?.length > 0) {
        recipients = employeesWithPhone.filter(e => selectedEmployeeIds.includes(e.id));
      }

      const apiKey = await storage.getSystemSetting('WHATSAPP_API_KEY');

      return res.json({
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        recipients: recipients.map(r => ({
          name: r.name,
          phone: r.phone,
          normalizedPhone: whatsappService.normalizePhoneNumber(r.phone)
        })),
        totalEmployees: allEmployees.length,
        employeesWithPhone: employeesWithPhone.length,
        selectedCount: recipients.length
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Send WhatsApp blast (to all or selected employees)
  app.post("/api/whatsapp/blast", async (req, res) => {
    try {
      const { subject, message, type, mediaUrls, recipientType, selectedEmployeeIds, customRecipients } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get recipients based on type
      let recipients: any[] = [];

      if (recipientType === 'excel') {
        // Use only Excel imports
        if (customRecipients && Array.isArray(customRecipients) && customRecipients.length > 0) {
          recipients = customRecipients
            .filter((r: any) => r.phone && r.phone.trim() !== '')
            .map((r: any) => ({
              id: null, // No ID for imported contacts
              name: r.name,
              phone: r.phone,
              department: r.department || null,
            }));
        }
      } else {
        // Use database employees only (all or selected)
        const allEmployees = await storage.getAllEmployees();
        const employeesWithPhone = allEmployees.filter(e => e.phone && e.phone.trim() !== '');

        if (recipientType === 'selected' && selectedEmployeeIds?.length > 0) {
          recipients = employeesWithPhone.filter(e => selectedEmployeeIds.includes(e.id));
        } else {
          // recipientType === 'all' - use all database employees
          recipients = employeesWithPhone;
        }
      }

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No recipients with phone number found" });
      }

      // Create blast record
      const blast = await storage.createWhatsappBlast({
        subject: subject || `Blast ${new Date().toLocaleDateString('id-ID')}`,
        message,
        blastType: type || 'text',
        mediaUrls: mediaUrls || [],
        totalRecipients: recipients.length,
      });

      // Create recipient records
      await storage.createWhatsappBlastRecipients(blast.id, recipients.map(r => ({
        employeeId: r.id,
        employeeName: r.name,
        phone: r.phone,
      })));

      // 5. Submit to WhatsApp Service (Synchronous to provide immediate feedback to UI)
      // We await this so the frontend gets the 'sent' and 'failed' counts it expects.
      console.log(`[Blast] Starting sync blast ${blast.id} to ${recipients.length} recipients`);
      console.log(`[Blast] Phone numbers:`, recipients.map(r => r.phone));
      console.log(`[Blast] Type: ${type || 'text'}, MediaUrls:`, mediaUrls);

      let result;
      try {
        result = await whatsappService.blastWhatsApp({
          phones: recipients.map(r => r.phone),
          message,
          type: type || 'text',
          mediaUrls: mediaUrls
        });
        console.log(`[Blast] Result:`, JSON.stringify(result, null, 2));
      } catch (blastError) {
        console.error(`[Blast] Error during blast execution:`, blastError);
        // Update blast status as failed
        await storage.updateWhatsappBlast(blast.id, {
          sentCount: 0,
          failedCount: recipients.length,
          status: 'completed',
          completedAt: new Date(),
        });
        throw new Error(`Blast execution failed: ${blastError instanceof Error ? blastError.message : String(blastError)}`);
      }

      // Update Header Status
      await storage.updateWhatsappBlast(blast.id, {
        sentCount: result.sent,
        failedCount: result.failed,
        status: 'completed',
        completedAt: new Date(),
      });

      // Invalidate evaluation cache after blast completes
      evaluationCache = null;

      console.log(`[Blast] Completed. Sent: ${result.sent}, Failed: ${result.failed}`);

      res.json({
        success: true,
        blastId: blast.id,
        totalRecipients: recipients.length,
        sent: result.sent,
        failed: result.failed,
        failedNumbers: result.failedNumbers ? result.failedNumbers.slice(0, 10) : [],
      });

    } catch (error) {
      console.error("Error sending WhatsApp blast:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      res.status(500).json({
        message: "Failed to send blast",
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      });
    }
  });

  // Get blast history
  app.get("/api/whatsapp/blasts", async (req, res) => {
    try {
      const blasts = await storage.getWhatsappBlasts(50);
      res.json(blasts);
    } catch (error) {
      console.error("Error fetching blast history:", error);
      res.status(500).json({ message: "Failed to fetch blast history" });
    }
  });

  // Get blast detail with recipients
  app.get("/api/whatsapp/blasts/:id", async (req, res) => {
    try {
      const result = await storage.getWhatsappBlastWithRecipients(req.params.id);
      if (!result) {
        return res.status(404).json({ message: "Blast not found" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error fetching blast detail:", error);
      res.status(500).json({ message: "Failed to fetch blast detail" });
    }
  });

  // Template CRUD
  app.get("/api/whatsapp/templates", async (req, res) => {
    try {
      const templates = await storage.getWhatsappTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching templates:", error);
      res.status(500).json({ message: "Failed to fetch templates" });
    }
  });

  app.post("/api/whatsapp/templates", async (req, res) => {
    try {
      const { name, message, blastType, mediaUrls } = req.body;
      if (!name || !message) {
        return res.status(400).json({ message: "Name and message are required" });
      }
      const template = await storage.createWhatsappTemplate({
        name,
        message,
        blastType: blastType || 'text',
        mediaUrls: mediaUrls || [],
      });
      res.json(template);
    } catch (error) {
      console.error("Error creating template:", error);
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.delete("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      await storage.deleteWhatsappTemplate(req.params.id);
      res.json({ message: "Template deleted" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  // Simple cache for evaluation stats (5 minutes TTL)
  let evaluationCache: { data: any; timestamp: number } | null = null;
  const EVALUATION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Get evaluation statistics (with caching)
  app.get("/api/whatsapp/evaluation", async (req, res) => {
    try {
      const now = Date.now();

      // Return cached data if still valid
      if (evaluationCache && (now - evaluationCache.timestamp) < EVALUATION_CACHE_TTL) {
        return res.json(evaluationCache.data);
      }

      // Fetch fresh data
      const stats = await storage.getWhatsappEvaluationStats();

      // Update cache
      evaluationCache = { data: stats, timestamp: now };

      res.json(stats);
    } catch (error) {
      console.error("Error getting evaluation stats:", error);
      res.status(500).json({ message: "Failed to get evaluation statistics" });
    }
  });

  // Test send to single number
  app.post("/api/whatsapp/test-send", async (req, res) => {
    try {
      const { phone, message, type, imageUrl, videoUrl } = req.body;

      if (!phone || !message) {
        return res.status(400).json({ message: "Phone and message are required" });
      }

      let result;

      if (type === 'image' && imageUrl) {
        result = await whatsappService.sendWhatsAppImage({ phone, message, imageUrl });
      } else if (type === 'video' && videoUrl) {
        result = await whatsappService.sendWhatsAppVideo({ phone, message, videoUrl });
      } else {
        result = await whatsappService.sendWhatsAppMessage({
          phone,
          message,
          logContext: {
            module: 'TEST',
            recipientType: 'ADMIN',
            triggeredBy: 'ADMIN_TEST',
            messageType: 'TEST_MESSAGE'
          }
        });
      }

      if (result.success) {
        res.json({ success: true, message: "Test message sent successfully", details: result });
      } else {
        res.status(400).json({ success: false, message: result.error || "Failed to send test message", details: result });
      }
    } catch (error: any) {
      console.error("Error sending test message:", error);
      res.status(500).json({ message: "Failed to send test message", error: error.message });
    }
  });



  // ============================================
  // SIMPER EV MONITORING ROUTES
  // ============================================

  // Public Search Route (No Auth)
  app.get("/api/simper-ev/public", async (req, res) => {
    try {
      const { query } = req.query;
      // If no query, return empty to prevent dumping all data for privacy unless explicitly asked
      // But user demand is "muncul semua data yang ada di gambar" implies dashboard view. 
      // User said: "pemilik unit membuka link itu dapat mencari tahu dengan memasukan nama dan nik"
      // So search is primary.
      if (!query || String(query).trim().length === 0) {
        // Retrieve all data if no search? Maybe pagination? 
        // For mobile friendliness, maybe just return empty or recent.
        // Let's return all for "dashboard" feel if empty, or enforce search.
        // "dapat mencari tahu dengan memasukan nama dan nik" -> Search based.
        const results = await storage.getAllSimperEvMonitoring();
        return res.json(results);
      }

      const results = await storage.searchSimperEvMonitoring(String(query));
      res.json(results);
    } catch (error) {
      console.error("Error searching Simper EV:", error);
      res.status(500).json({ message: "Search failed" });
    }
  });

  // Admin: Get All Data (Paginated)
  app.get("/api/simper-ev/all", async (req, res) => {
    try {
      console.log("[API] GET /api/simper-ev/all called");

      const page = parseInt(req.query.page as string);
      const limit = parseInt(req.query.limit as string);
      const search = req.query.search as string;

      if (!isNaN(page) && !isNaN(limit)) {
        console.log(`[API] Fetching paginated Simper EV: page ${page}, limit ${limit}, search "${search || ''}"`);
        const result = await storage.getSimperEvMonitoringPaginated(page, limit, search);
        res.json(result); // Returns { data: [], total: number }
      } else {
        // Fallback for backward compatibility
        console.log("[API] Fetching ALL Simper EV records (Legacy Mode)");
        const results = await storage.getAllSimperEvMonitoring();
        console.log(`[API] Got ${results.length} Simper EV records`);
        res.json(results);
      }
    } catch (error) {
      console.error("[API] Error fetching Simper EV data:", error);
      res.status(500).json({ message: "Failed to fetch data" });
    }
  });



  // Admin: Upload CSV
  app.post("/api/simper-ev/upload", upload.single('csvFile'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      console.log(`[Simper EV] Processing CSV upload: ${req.file.originalname}`);

      const csvContent = fs.readFileSync(req.file.path, 'utf8');

      Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Replace all data for snapshot
            await storage.deleteAllSimperEvMonitoring();

            const batchId = new Date().toISOString();
            let count = 0;

            for (const row of results.data as any[]) {
              if (!row['Nama']) continue; // Skip empty rows

              await storage.createSimperEvMonitoring({
                unit: row['Unit'],
                no: row['No'] ? parseInt(row['No']) : 0,
                nama: row['Nama'],
                nikSimper: row['NIK Simper'],
                asalMitra: row['Asal Mitra'],
                simper: row['Simper'],
                simperOrientasi: row['Simper Orientasi'],
                simperPermanen: row['Simper Permanen'],
                unitSkillUp: row['UNIT YG DI SKILL UP'],
                masaBerlakuSertifikatOs: row['Masa Berlaku Sertifikat OS'],
                merkUnit: row['Merk Unit'] || row['Merek Unit'] || "",
                typeUnit: row['Type Unit'] || row['Tipe Unit'] || "",
                statusPengajuan: row['Status Pengajuan'],
                importBatchId: batchId,
                updatedOf: new Date().toISOString()
              });
              count++;
            }

            console.log(`[Simper EV] Imported ${count} records`);
            fs.unlinkSync(req.file.path);

            res.json({ success: true, count, message: `Successfully imported ${count} records` });
          } catch (err) {
            console.error("Error processing CSV records:", err);
            // Verify if file exists before trying to unlink
            if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
            res.status(500).json({ message: "Failed to process CSV records" });
          }
        },
        error: (err: any) => {
          console.error("CSV Parse Error:", err);
          if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
          res.status(500).json({ message: "Failed to parse CSV file" });
        }
      });

    } catch (error) {
      console.error("Error uploading Simper EV CSV:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Get Simper EV Settings (CSV URL)
  app.get("/api/simper-ev/settings", async (req, res) => {
    try {
      const setting = await storage.getSystemSetting("simper_ev_csv_url");
      res.json({ url: setting ? setting.value : "" });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Sync Simper EV from URL
  app.post("/api/simper-ev/sync", async (req, res) => {
    try {
      let { url } = req.body;

      // Save URL if provided
      if (url) {
        await storage.setSystemSetting("simper_ev_csv_url", url, "URL Source for Simper EV Monitoring CSV");
      } else {
        // Try to get from settings
        const setting = await storage.getSystemSetting("simper_ev_csv_url");
        url = setting ? setting.value : null;
      }

      if (!url) {
        return res.status(400).json({ error: "URL CSV tidak ditemukan. Mohon simpan URL terlebih dahulu." });
      }

      console.log(`[SimperEV] Syncing from URL: ${url}`);

      // Fetch CSV
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Gagal mengunduh CSV: ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();

      // Parse
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
      });

      if (parsed.errors.length > 0) {
        console.warn("[SimperEV] CSV Parse Warnings:", parsed.errors);
      }

      const rows = parsed.data as any[];
      if (!rows || rows.length === 0) {
        return res.status(400).json({ error: "Data CSV kosong atau format tidak valid" });
      }

      // Clear old data
      await storage.deleteAllSimperEvMonitoring();

      const batchId = new Date().toISOString();
      let successCount = 0;
      let errorCount = 0;

      for (const row of rows) {
        try {
          // Normalize keys (case insensitive search)
          const getVal = (key: string) => {
            const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
            return foundKey ? row[foundKey] : "";
          };

          const rawData: InsertSimperEvMonitoring = {
            unit: getVal('unit') || "",
            no: getVal('no') ? String(getVal('no')) : "",
            nama: getVal('nama') || "Unknown",
            nikSimper: getVal('nik simper') || getVal('nik') || "",
            asalMitra: getVal('asal mitra') || "",
            simper: getVal('simper') || "",
            simperOrientasi: getVal('simper orientasi ev') || getVal('simper orientasi') || getVal('orientasi') || "",
            simperPermanen: getVal('simper permanen ev') || getVal('simper permanen') || getVal('permanen') || "",
            unitSkillUp: getVal('unit yg di skill up') || getVal('unit skill up') || "",
            masaBerlakuSertifikatOs: getVal('masa berlaku sertifikat os') || "",
            merkUnit: getVal('merk unit') || getVal('merek unit') || "",
            typeUnit: getVal('type unit') || getVal('tipe unit') || "",
            statusPengajuan: getVal('status pengajuan') || getVal('status') || "Pending",
            importBatchId: batchId,
          };

          await storage.createSimperEvMonitoring(rawData);
          successCount++;
        } catch (err) {
          console.error("Error inserting row:", err);
          errorCount++;
        }
      }

      res.json({ success: true, count: successCount, errors: errorCount, message: "Sinkronisasi berhasil" });

    } catch (error) {
      console.error("[SimperEV] Sync Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Manual CRUD Routes for Simper EV
  app.post("/api/simper-ev", async (req, res) => {
    try {
      const data = insertSimperEvMonitoringSchema.parse(req.body);
      const result = await storage.createSimperEvMonitoring(data);
      res.status(201).json(result);
    } catch (error) {
      console.error("[SimperEV] Create Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/simper-ev/:id", async (req, res) => {
    try {
      const data = insertSimperEvMonitoringSchema.partial().parse(req.body);
      const result = await storage.updateSimperEvMonitoring(req.params.id, data);
      if (!result) return res.status(404).json({ error: "Record not found" });
      res.json(result);
    } catch (error) {
      console.error("[SimperEV] Update Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/simper-ev/:id", async (req, res) => {
    try {
      const success = await storage.deleteSimperEvMonitoring(req.params.id);
      if (!success) return res.status(404).json({ error: "Record not found" });
      res.sendStatus(204);
    } catch (error) {
      console.error("[SimperEV] Delete Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // History Routes
  app.get("/api/simper-ev/:nikSimper/history", async (req, res) => {
    try {
      const history = await storage.getSimperEvHistory(req.params.nikSimper);
      res.json(history);
    } catch (error) {
      console.error("[SimperEV] Get History Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/simper-ev/:nikSimper/history", async (req, res) => {
    try {
      const data = insertSimperEvHistorySchema.parse({
        ...req.body,
        nikSimper: req.params.nikSimper
      });
      console.log(`[SimperEV] Creating history for NIK: ${req.params.nikSimper}. Level: ${req.body.workflowLevel}`);

      const result = await storage.createSimperEvHistory(data);

      // Auto-update status statusPengajuan in main monitoring table
      if (data.workflowLevel) {
        console.log(`[SimperEV] Updating status for ${req.params.nikSimper} to "${data.workflowLevel}"`);
        await storage.updateSimperEvMonitoringStatusByNik(req.params.nikSimper, data.workflowLevel);
        console.log(`[SimperEV] Status update completed`);
      } else {
        console.log(`[SimperEV] Skipping status update - no workflow level provided`);
      }

      // ---------------------------------------------------------
      // Enhanced WhatsApp Notification with Logging
      // ---------------------------------------------------------
      try {
        const simperRecords = await storage.searchSimperEvMonitoring(req.params.nikSimper);
        const simper = simperRecords.length > 0 ? simperRecords[0] : null;

        if (simper && simper.asalMitra) {
          const mitraPhone = await storage.getMitraPhoneByName(simper.asalMitra);

          if (mitraPhone) {
            console.log(`[SimperEV] Preparing WA notification for Mitra: ${simper.asalMitra}`);

            // Format enhanced message
            const message = formatSimperEvNotification({
              employeeName: simper.nama || "Unknown",
              nikSimper: simper.nikSimper || req.params.nikSimper,
              mitraName: simper.asalMitra,
              status: data.workflowLevel || data.status || "Updated",
              approver: data.approver,
              message: data.message,
              workflowType: data.workflowType,
              isRevision: false
            });

            // Create notification log (PENDING)
            const notifLog = await storage.createWhatsappNotificationLog({
              module: "SIMPER_EV",
              referenceId: req.params.nikSimper,
              referenceName: simper.nama || "Unknown",
              recipientPhone: mitraPhone,
              recipientName: simper.asalMitra,
              recipientType: "MITRA",
              messageContent: message,
              messageType: "APPROVAL_STATUS_UPDATE",
              status: "PENDING",
              triggeredBy: (req as any).user?.nik || "SYSTEM"
            });

            // Send WhatsApp message
            const sendResult = await sendWhatsAppMessage({
              phone: mitraPhone,
              message: message
            });

            // Update log with result
            await storage.updateWhatsappNotificationLogStatus(
              notifLog.id,
              sendResult.success ? "SENT" : "FAILED",
              sendResult.error,
              sendResult.response
            );

            if (sendResult.success) {
              console.log(`[SimperEV] ✅ WA notification sent to ${simper.asalMitra}`);
            } else {
              console.error(`[SimperEV] ❌ WA notification failed: ${sendResult.error}`);
            }
          } else {
            console.log(`[SimperEV] ⚠️ No phone found for Mitra: ${simper.asalMitra}`);
          }
        }
      } catch (waError) {
        console.error("[SimperEV] Failed to send WhatsApp notification:", waError);
        // We don't fail the request if notification fails
      }

      res.json(result);
    } catch (error) {
      console.error("[SimperEV] Create History Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/simper-ev/history/:id", async (req, res) => {
    try {
      const updated = await storage.updateSimperEvHistory(req.params.id, req.body);
      if (!updated) return res.status(404).json({ error: "History not found" });

      // Enhanced WhatsApp Notification with Logging (Revision)
      try {
        const simperRecords = await storage.searchSimperEvMonitoring(updated.nikSimper);
        const simper = simperRecords.length > 0 ? simperRecords[0] : null;

        if (simper && simper.asalMitra) {
          const mitraPhone = await storage.getMitraPhoneByName(simper.asalMitra);

          if (mitraPhone) {
            console.log(`[SimperEV] Preparing WA revision notification for Mitra: ${simper.asalMitra}`);

            // Format enhanced message with revision flag
            const message = formatSimperEvNotification({
              employeeName: simper.nama || "Unknown",
              nikSimper: updated.nikSimper,
              mitraName: simper.asalMitra,
              status: updated.workflowLevel || updated.status || "Updated",
              approver: updated.approver,
              message: updated.message,
              workflowType: updated.workflowType,
              isRevision: true,
              previousStatus: simper.statusPengajuan // Show previous status
            });

            // Create notification log (PENDING)
            const notifLog = await storage.createWhatsappNotificationLog({
              module: "SIMPER_EV",
              referenceId: updated.nikSimper,
              referenceName: simper.nama || "Unknown",
              recipientPhone: mitraPhone,
              recipientName: simper.asalMitra,
              recipientType: "MITRA",
              messageContent: message,
              messageType: "APPROVAL_STATUS_REVISION",
              status: "PENDING",
              triggeredBy: (req as any).user?.nik || "SYSTEM"
            });

            // Send WhatsApp message
            const sendResult = await sendWhatsAppMessage({
              phone: mitraPhone,
              message: message
            });

            // Update log with result
            await storage.updateWhatsappNotificationLogStatus(
              notifLog.id,
              sendResult.success ? "SENT" : "FAILED",
              sendResult.error,
              sendResult.response
            );

            if (sendResult.success) {
              console.log(`[SimperEV] ✅ WA revision notification sent to ${simper.asalMitra}`);
            } else {
              console.error(`[SimperEV] ❌ WA revision notification failed: ${sendResult.error}`);
            }
          }
        }
      } catch (waError) {
        console.error("[SimperEV] Failed to send WA on update:", waError);
      }

      res.json(updated);
    } catch (error) {
      console.error("[SimperEV] Update History Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/simper-ev/history/:id", async (req, res) => {
    try {
      console.log(`[SimperEV-DEBUG] DELETE Request for ID: ${req.params.id}`);
      const success = await storage.deleteSimperEvHistory(req.params.id);
      if (!success) {
        console.warn(`[SimperEV] DELETE History ID ${req.params.id} not found, but returning 204 for idempotency`);
      }
      res.sendStatus(204);
    } catch (error) {
      console.error("[SimperEV] Delete History Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================
  // Simper EV: WhatsApp Notification Logs API
  // ==========================================

  // Get all notification logs for Simper EV module
  app.get("/api/simper-ev/notification-logs", async (req, res) => {
    try {
      const logs = await storage.getWhatsappNotificationLogs("SIMPER_EV", 200);
      res.json(logs);
    } catch (error) {
      console.error("[SimperEV] Get Notification Logs Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get notification logs for specific NIK
  app.get("/api/simper-ev/:nikSimper/notification-logs", async (req, res) => {
    try {
      const logs = await storage.getWhatsappNotificationLogsByReference(req.params.nikSimper);
      res.json(logs);
    } catch (error) {
      console.error("[SimperEV] Get NIK Notification Logs Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Manual resend notification for specific history record
  app.post("/api/simper-ev/history/:historyId/resend-notification", async (req, res) => {
    try {
      const { historyId } = req.params;

      console.log(`[SimperEV] Manual notification resend requested for history: ${historyId}`);

      // 1. Fetch the history record
      const historyRecord = await storage.getSimperEvHistoryById(historyId);
      if (!historyRecord) {
        return res.status(404).json({
          success: false,
          error: "History record not found"
        });
      }

      // 2. Fetch the SIMPER monitoring record
      const simperRecords = await storage.searchSimperEvMonitoring(historyRecord.nikSimper);
      const simper = simperRecords.length > 0 ? simperRecords[0] : null;

      if (!simper) {
        return res.status(404).json({
          success: false,
          error: "Employee SIMPER record not found"
        });
      }

      if (!simper.asalMitra) {
        return res.status(400).json({
          success: false,
          error: "Mitra information not available"
        });
      }

      // 3. Get Mitra phone number
      const mitraPhone = await storage.getMitraPhoneByName(simper.asalMitra);
      if (!mitraPhone) {
        return res.status(400).json({
          success: false,
          error: `No phone number configured for Mitra: ${simper.asalMitra}`
        });
      }

      // 4. Format the notification message (reuse existing function)
      const message = formatSimperEvNotification({
        employeeName: simper.nama || "Unknown",
        nikSimper: simper.nikSimper || historyRecord.nikSimper,
        mitraName: simper.asalMitra,
        status: historyRecord.workflowLevel || historyRecord.status || "Updated",
        approver: historyRecord.approver,
        message: historyRecord.message,
        workflowType: historyRecord.workflowType,
        isRevision: false
      });

      console.log(`[SimperEV] Sending manual notification to ${simper.asalMitra} (${mitraPhone})`);

      // 5. Send WhatsApp message (this will create log automatically)
      const sendResult = await sendWhatsAppMessage({
        phone: mitraPhone,
        message: message,
        logContext: {
          module: "SIMPER_EV",
          referenceId: historyRecord.nikSimper,
          referenceName: simper.nama || "Unknown",
          recipientType: "MITRA",
          messageType: "MANUAL_RESEND",
          triggeredBy: (req as any).user?.nik || "ADMIN_MANUAL"
        }
      });

      // 6. Return response
      if (sendResult.success) {
        console.log(`[SimperEV] ✅ Manual notification sent successfully`);
        return res.json({
          success: true,
          message: "Notification sent successfully",
          details: {
            recipientPhone: mitraPhone,
            recipientName: simper.asalMitra,
            status: "SENT"
          }
        });
      } else {
        console.error(`[SimperEV] ❌ Manual notification failed: ${sendResult.error}`);
        return res.status(500).json({
          success: false,
          error: sendResult.error || "Failed to send notification",
          details: {
            recipientPhone: mitraPhone,
            recipientName: simper.asalMitra,
            status: "FAILED"
          }
        });
      }

    } catch (error) {
      console.error("[SimperEV] Manual Notification Error:", error);
      return res.status(500).json({
        success: false,
        error: (error as Error).message
      });
    }
  });

  // Check WhatsApp API configuration status
  app.get("/api/simper-ev/whatsapp-config-status", async (req, res) => {
    try {
      const apiKey = await storage.getSystemSetting("WHATSAPP_API_KEY");
      const adminPhone = await storage.getSystemSetting("WHATSAPP_ADMIN_PHONE");

      const envApiKey = process.env.NOTIFYME_API_KEY;
      const envAdminPhone = process.env.NOTIFYME_ADMIN_PHONE;

      res.json({
        configured: !!(apiKey || envApiKey),
        apiKeySource: apiKey ? "DATABASE" : envApiKey ? "ENVIRONMENT" : "NOT_CONFIGURED",
        adminPhoneSource: adminPhone ? "DATABASE" : envAdminPhone ? "ENVIRONMENT" : "DEFAULT",
        adminPhone: adminPhone || envAdminPhone || "6285126408588"
      });
    } catch (error) {
      console.error("[SimperEV] Check WhatsApp Config Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // SIMPER MITRA ENDPOINTS
  app.get("/api/simper-mitra", async (req, res) => {
    try {
      const mitras = await storage.getSimperMitras();
      res.json(mitras);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/simper-mitra", async (req, res) => {
    try {
      const { name, phoneNumber } = req.body;
      if (!name) return res.status(400).json({ error: "Nama mitra wajib diisi" });
      const mitra = await storage.createSimperMitra({ name, phoneNumber });
      res.json(mitra);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put("/api/simper-mitra/:id", async (req, res) => {
    try {
      const { name, phoneNumber } = req.body;
      if (!name) return res.status(400).json({ error: "Nama mitra wajib diisi" });
      const mitra = await storage.updateSimperMitra(req.params.id, { name, phoneNumber });
      if (!mitra) return res.status(404).json({ error: "Mitra tidak ditemukan" });
      res.json(mitra);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/simper-mitra/:id", async (req, res) => {
    try {
      const success = await storage.deleteSimperMitra(req.params.id);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/simper-mitra/notify", async (req, res) => {
    try {
      const { phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Nomor HP dan pesan wajib diisi" });
      }

      const result = await whatsappService.sendWhatsAppMessage({
        phone,
        message
      });

      if (result.success) {
        res.json({ success: true, result });
      } else {
        res.status(500).json({ error: "Gagal kirim WhatsApp", details: result });
      }
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });



  // Get all Simper Perpanjangan (with pagination, search, and filters)
  app.get("/api/simper-perpanjangan", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const status = (req.query.status as string) || "all";
      const jenis = (req.query.jenis as string) || "all";

      console.log(`[SimperPerpanjangan] GET all - page: ${page}, limit: ${limit}, search: "${search}", status: "${status}", jenis: "${jenis}"`);

      const result = await storage.getSimperPerpanjanganPaginated(page, limit, search, status, jenis);
      res.json(result);
    } catch (error) {
      console.error("[SimperPerpanjangan] Get Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get single Simper Perpanjangan by ID
  app.get("/api/simper-perpanjangan/:id", async (req, res) => {
    try {
      const record = await storage.getSimperPerpanjanganById(req.params.id);
      if (!record) {
        return res.status(404).json({ error: "Record not found" });
      }
      res.json(record);
    } catch (error) {
      console.error("[SimperPerpanjangan] Get By ID Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Create Simper Perpanjangan
  app.post("/api/simper-perpanjangan", async (req, res) => {
    try {
      try {
        fs.appendFileSync('wa_diagnostic.log', `[${new Date().toISOString()}] POST /api/simper-perpanjangan called\n`);
      } catch (e) { }
      console.log("[SimperPerpanjangan] Creating new record:", req.body);
      const result = await storage.createSimperPerpanjangan(req.body);

      // Create initial history entry
      await storage.createSimperPerpanjanganHistory({
        simperPerpanjanganId: result.id,
        statusSebelum: null,
        statusSesudah: result.statusPerpanjangan || "Belum Diproses",
        tahapan: result.tahapanWorkflow || "Pengajuan Admin",
        approver: (req as any).user?.nama || "Admin",
        approverNik: (req as any).user?.nik || "SYSTEM",
        catatan: "Data perpanjangan SIMPER baru dibuat"
      });

      // WhatsApp Notification for New Entry
      try {
        try {
          fs.appendFileSync('wa_diagnostic.log', `[${new Date().toISOString()}] Triggering notification (POST) for record: ${result.id}\n`);
        } catch (e) { }
        console.log(`[SimperPerpanjangan] Triggering notification for new record: ${result.id}`);
        let mitraPhone = await storage.getMitraPhoneByName(result.perusahaan || "");

        // Fallback to phone in record if mitra lookup fails
        if (!mitraPhone && result.noHp) {
          console.log(`[SimperPerpanjangan] Mitra phone not found for "${result.perusahaan}", using record noHp: ${result.noHp}`);
          mitraPhone = result.noHp;
        }

        if (mitraPhone) {
          console.log(`[SimperPerpanjangan] Sending notification to: ${mitraPhone}`);
          const message = formatSimperPerpanjanganNotification({
            employeeName: result.nama,
            nik: result.nik,
            mitraName: result.perusahaan || "Unknown",
            status: result.statusPerpanjangan || "Belum Diproses",
            approver: "Admin",
            catatan: "Pengajuan perpanjangan SIMPER baru dibuat",
            isCreation: true
          });

          const sendResult = await sendWhatsAppMessage({
            phone: mitraPhone,
            message: message,
            logContext: {
              module: "SIMPER_PERPANJANGAN",
              referenceId: result.id,
              referenceName: result.nama,
              recipientType: "MITRA",
              messageType: "NEW_SUBMISSION"
            }
          });
          console.log(`[SimperPerpanjangan] Notification result:`, sendResult);

          // Debug: Also notify admin if requested/hinted
          const adminPhone = process.env.NOTIFYME_ADMIN_PHONE;
          if (adminPhone) {
            await sendWhatsAppMessage({
              phone: adminPhone,
              message: `[ADMIN DEBUG] New SIMPER Perpanjangan: ${result.nama} (${result.perusahaan})`,
              logContext: { module: "ADMIN_DEBUG", messageType: "DEBUG" }
            });
          }
        } else {
          console.log(`[SimperPerpanjangan] No phone number found for notification.`);
        }
      } catch (waError) {
        console.error("[SimperPerpanjangan] Notification error (POST):", waError);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("[SimperPerpanjangan] Create Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Update Simper Perpanjangan
  app.put("/api/simper-perpanjangan/:id", async (req, res) => {
    try {
      const { id } = req.params;
      try {
        fs.appendFileSync('wa_diagnostic.log', `[${new Date().toISOString()}] PUT /api/simper-perpanjangan/${id} called\n`);
      } catch (e) { }
      console.log(`[SimperPerpanjangan] Updating record ${id}:`, req.body);

      // Get old record for history
      const oldRecord = await storage.getSimperPerpanjanganById(id);
      if (!oldRecord) {
        return res.status(404).json({ error: "Record not found" });
      }

      const result = await storage.updateSimperPerpanjangan(id, req.body);

      // Create history entry if status changed
      if (oldRecord.statusPerpanjangan !== req.body.statusPerpanjangan) {
        await storage.createSimperPerpanjanganHistory({
          simperPerpanjanganId: id,
          statusSebelum: oldRecord.statusPerpanjangan,
          statusSesudah: req.body.statusPerpanjangan,
          tahapan: req.body.tahapanWorkflow || oldRecord.tahapanWorkflow,
          approver: (req as any).user?.nama || "Admin",
          approverNik: (req as any).user?.nik || "SYSTEM",
          catatan: req.body.catatan || `Status diubah dari ${oldRecord.statusPerpanjangan} ke ${req.body.statusPerpanjangan}`
        });
      }

      // WhatsApp Notification for Status/Workflow Update
      try {
        try {
          fs.appendFileSync('wa_diagnostic.log', `[${new Date().toISOString()}] Triggering notification (PUT) for record: ${id}\n`);
        } catch (e) { }
        console.log(`[SimperPerpanjangan] Triggering notification for update: ${id}`);
        let mitraPhone = await storage.getMitraPhoneByName(result.perusahaan || "");

        // Fallback to phone in record if mitra lookup fails
        if (!mitraPhone && result.noHp) {
          console.log(`[SimperPerpanjangan] Mitra phone not found for "${result.perusahaan}", using record noHp: ${result.noHp}`);
          mitraPhone = result.noHp;
        }

        if (mitraPhone) {
          console.log(`[SimperPerpanjangan] Sending notification to: ${mitraPhone}`);
          const message = formatSimperPerpanjanganNotification({
            employeeName: result.nama,
            nik: result.nik,
            mitraName: result.perusahaan || "Unknown",
            status: result.statusPerpanjangan || "Updated",
            tahapan: result.tahapanWorkflow || undefined,
            approver: (req as any).user?.nama || "Admin",
            catatan: req.body.catatan,
            previousStatus: oldRecord.statusPerpanjangan || undefined,
            isCreation: false
          });

          const sendResult = await sendWhatsAppMessage({
            phone: mitraPhone,
            message: message,
            logContext: {
              module: "SIMPER_PERPANJANGAN",
              referenceId: id,
              referenceName: result.nama,
              recipientType: "MITRA",
              messageType: "STATUS_UPDATE"
            }
          });
          console.log(`[SimperPerpanjangan] Notification result:`, sendResult);

          // Debug: Also notify admin if requested/hinted
          const adminPhone = process.env.NOTIFYME_ADMIN_PHONE;
          if (adminPhone) {
            await sendWhatsAppMessage({
              phone: adminPhone,
              message: `[ADMIN DEBUG] Update SIMPER Perpanjangan: ${result.nama} -> ${result.statusPerpanjangan}`,
              logContext: { module: "ADMIN_DEBUG", messageType: "DEBUG" }
            });
          }
        } else {
          console.log(`[SimperPerpanjangan] No phone number found for notification.`);
        }
      } catch (waError) {
        console.error("[SimperPerpanjangan] Notification error (PUT):", waError);
      }

      res.json(result);
    } catch (error) {
      console.error("[SimperPerpanjangan] Update Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Delete Simper Perpanjangan
  app.delete("/api/simper-perpanjangan/:id", async (req, res) => {
    try {
      console.log(`[SimperPerpanjangan] Deleting record ${req.params.id}`);
      const success = await storage.deleteSimperPerpanjangan(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Record not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("[SimperPerpanjangan] Delete Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Get History for Simper Perpanjangan
  app.get("/api/simper-perpanjangan/:id/history", async (req, res) => {
    try {
      const history = await storage.getSimperPerpanjanganHistory(req.params.id);
      res.json(history);
    } catch (error) {
      console.error("[SimperPerpanjangan] Get History Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Create History for Simper Perpanjangan
  app.post("/api/simper-perpanjangan/:id/history", async (req, res) => {
    try {
      const result = await storage.createSimperPerpanjanganHistory({
        ...req.body,
        simperPerpanjanganId: req.params.id,
      });
      res.status(201).json(result);
    } catch (error) {
      console.error("[SimperPerpanjangan] Create History Error:", error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  // Bulk delete Simper Perpanjangan
  app.delete("/api/simper-perpanjangan", async (req, res) => {
    try {
      const { ids } = req.body;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "IDs are required" });
      }

      console.log(`[SimperPerpanjangan] Bulk deleting ${ids.length} records`);
      let deletedCount = 0;
      for (const id of ids) {
        const success = await storage.deleteSimperPerpanjangan(id);
        if (success) deletedCount++;
      }

      res.json({ success: true, deletedCount });
    } catch (error) {
      console.error("[SimperPerpanjangan] Bulk Delete Error:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  });



  const httpServer = createServer(app);

  // ============================================
  // PUBLIC INDUCTION ATTENDANCE
  // ============================================
  app.post("/api/induction-attendance/submit", async (req, res) => {
    try {
      const parsed = insertPublicInductionAttendanceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error });
      }

      // Safety-net: kalau frontend (atau client lama) mengirim base64 data URL
      // untuk fotoSelfie/tandaTangan, otomatis convert ke uploaded_files dan
      // simpan URL — supaya semua record konsisten pakai /api/uploads/{id}.
      const data: any = { ...parsed.data };
      const ts = Date.now();
      for (const field of ["fotoSelfie", "tandaTangan"] as const) {
        const val = data[field];
        if (typeof val === "string" && val.startsWith("data:")) {
          const url = await uploadDataUrlToStorage(val, `${field}-${data.nik}-${ts}`);
          if (url) data[field] = url;
        }
      }

      const result = await storage.createPublicInductionAttendance(data);
      res.json({ message: "Absensi berhasil dicatat", data: result });
    } catch (error: any) {
      console.error("Error submitting induction attendance:", error);
      res.status(500).json({ error: error.message || "Gagal mencatat absensi" });
    }
  });

  // Helper: decode base64 data URL & save via dbStorage → return /api/uploads/{id} URL
  async function uploadDataUrlToStorage(dataUrl: string, baseName: string): Promise<string | null> {
    try {
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) return null;
      const mimeType = m[1];
      const buffer = Buffer.from(m[2], "base64");
      const ext = mimeType.split("/")[1]?.split("+")[0] || "bin";
      const fakeFile = {
        buffer,
        originalname: `${baseName}.${ext}`,
        mimetype: mimeType,
        size: buffer.length,
      } as Express.Multer.File;
      const { url } = await dbStorage.uploadFile(fakeFile);
      return url;
    } catch (err) {
      console.error("[uploadDataUrlToStorage] failed:", err);
      return null;
    }
  }

  app.get("/api/induction-attendance/all", async (req, res) => {
    try {
      // Permission check could be added here if needed, but for now we assume it's for HR admin
      const { year, search } = req.query;
      const results = await storage.getAllPublicInductionAttendance(
        year as string,
        search as string
      );
      res.json(results);
    } catch (error: any) {
      console.error("Error fetching induction attendance:", error);
      res.status(500).json({ error: error.message || "Gagal mengambil data absensi" });
    }
  });

  // Sinkron nomor telepon karyawan dari data absensi induksi
  app.post("/api/induction-attendance/sync-phones", async (req, res) => {
    try {
      const { db } = await import('./db');
      const { publicInductionAttendance: inductionTable, employees: employeesTable } = await import('@shared/schema');
      const { eq, isNotNull, ne } = await import('drizzle-orm');

      // Ambil semua absensi induksi yang ada nomorTelepon
      const attendances = await db.select().from(inductionTable)
        .where(isNotNull(inductionTable.nomorTelepon));

      // Buat map nik -> nomor telepon (ambil yang terbaru per NIK)
      const phoneMap = new Map<string, string>();
      for (const att of attendances) {
        if (att.nik && att.nomorTelepon && att.nomorTelepon.trim().length >= 8) {
          phoneMap.set(att.nik, att.nomorTelepon.trim());
        }
      }

      let updated = 0;
      let skipped = 0;
      const updatedList: { nik: string; name: string; phone: string }[] = [];

      for (const [nik, phone] of phoneMap.entries()) {
        // Cari employee berdasarkan NIK (id)
        const [emp] = await db.select().from(employeesTable).where(eq(employeesTable.id, nik));
        if (!emp) { skipped++; continue; }

        // Update hanya jika phone kosong atau berbeda
        if (!emp.phone || emp.phone.trim() !== phone) {
          await storage.updateEmployee(nik, { phone } as any);
          updatedList.push({ nik, name: emp.name, phone });
          updated++;
        } else {
          skipped++;
        }
      }

      console.log(`[sync-phones] Updated ${updated} employees from induction attendance`);
      res.json({
        success: true,
        updated,
        skipped,
        list: updatedList,
        message: `${updated} nomor telepon karyawan diperbarui dari data absensi induksi`
      });
    } catch (error: any) {
      console.error('Error sync-phones:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // SIDAK P3K ROUTES
  // ============================================

  app.post("/api/sidak-p3k", async (req, res) => {
    try {
      const { session, items } = req.body;
      const result = await storage.createSidakP3k(session, items);

      // Auto-PICA creation for P3K items
      // We map the items to a format checkAndCreatePica can understand (findingId -> status)
      const picaInspectionResults: Record<string, string> = {};
      items.forEach((item: any) => {
        if (item.isAvailable === false) {
          picaInspectionResults[item.itemName] = "TS";
        }
      });

      if (Object.keys(picaInspectionResults).length > 0) {
        PicaService.checkAndCreatePica({
          moduleSource: "SIDAK_P3K",
          referenceId: result.id,
          sessionId: result.id,
          inspectionResults: picaInspectionResults,
          moduleLabel: "Sidak P3K"
        });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Error creating Sidak P3K:", error);
      res.status(500).json({ error: error.message || "Failed to create Sidak P3K" });
    }
  });

  app.get("/api/sidak-p3k", async (req, res) => {
    try {
      const results = await storage.getSidakP3kHistory();
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sidak-p3k/:id", async (req, res) => {
    try {
      const result = await storage.getSidakP3kSession(req.params.id);
      if (!result) return res.status(404).json({ error: "Session not found" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/sidak-p3k/:id", async (req, res) => {
    try {
      const result = await storage.updateSidakP3kSession(req.params.id, req.body);
      if (!result) return res.status(404).json({ error: "Session not found" });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // ============================================
  // SIDAK P3K API
  // ============================================

  // P3K Photo Upload
  app.post("/api/sidak-p3k/upload", uploadMemory.single("photo"), async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      const { url: photoUrl } = await dbStorage.uploadFile(file);

      res.json({ url: photoUrl });
    } catch (error) {
      console.error("Error uploading P3K photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // ============================================
  // SPIP - PERALATAN ROUTES
  // ============================================

  app.get("/api/spip/peralatan", async (req, res) => {
    try {
      const { search, jenis_unit, merk, status_unit, status_bib, page = "1", limit = "15" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = db.select().from(spipPeralatan).$dynamic();
      let conditions = [];

      if (search) {
        conditions.push(
          sql`(${spipPeralatan.noLambung} ILIKE ${'%' + search + '%'} OR 
                ${spipPeralatan.merk} ILIKE ${'%' + search + '%'} OR
                ${spipPeralatan.owner} ILIKE ${'%' + search + '%'})`
        );
      }
      if (jenis_unit) conditions.push(eq(spipPeralatan.jenisUnit, jenis_unit as string));
      if (merk) conditions.push(eq(spipPeralatan.merk, merk as string));
      if (status_unit) conditions.push(eq(spipPeralatan.statusUnit, status_unit as string));
      if (status_bib) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nearLimit = addMonths(new Date(today), 2);

        // Helper logic for NULL safety
        const isExpBib = and(isNotNull(spipPeralatan.expiredBib), lt(spipPeralatan.expiredBib, today));
        const isExpTia = and(isNotNull(spipPeralatan.expiredTia), lt(spipPeralatan.expiredTia, today));
        const unitIsExpired = or(isExpBib, isExpTia);

        const isNearBib = and(isNotNull(spipPeralatan.expiredBib), lt(spipPeralatan.expiredBib, nearLimit));
        const isNearTia = and(isNotNull(spipPeralatan.expiredTia), lt(spipPeralatan.expiredTia, nearLimit));
        const unitIsNear = or(isNearBib, isNearTia);

        if (status_bib === 'EXPIRED') {
          conditions.push(unitIsExpired);
        } else if (status_bib === 'NEAR EXPIRED') {
          // NEAR if NOT expired AND (bib_is_near OR tia_is_near)
          conditions.push(and(not(unitIsExpired), unitIsNear));
        } else if (status_bib === 'ACTIVE') {
          // ACTIVE if NOT expired AND NOT near AND has_at_least_one_date
          conditions.push(and(
            not(unitIsExpired),
            not(unitIsNear),
            or(isNotNull(spipPeralatan.expiredBib), isNotNull(spipPeralatan.expiredTia))
          ));
        } else if (status_bib !== 'all') {
          conditions.push(or(eq(spipPeralatan.statusBib, status_bib as string), eq(spipPeralatan.statusTia, status_bib as string)));
        }
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(spipPeralatan).where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(totalResult[0]?.count || 0);

      const items = await baseQuery
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(spipPeralatan.createdAt));

      res.json({
        data: items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      console.error("Error fetching SPIP Peralatan:", error);
      res.status(500).json({ error: "Gagal mengambil data peralatan" });
    }
  });

  app.get("/api/spip/peralatan/export", async (req, res) => {
    try {
      // Provide xlsx export
      const items = await db.select().from(spipPeralatan).orderBy(desc(spipPeralatan.createdAt));

      // format to match template
      const formatted = items.map(item => ({
        "NO LAMBUNG": item.noLambung,
        "JENIS UNIT": item.jenisUnit,
        "MERK": item.merk,
        "TYPE": item.type,
        "NO POLISI": item.noPolisi || "",
        "NO RANGKA": item.noRangka || "",
        "NO MESIN": item.noMesin || "",
        "TAHUN PEMBUATAN": item.tahunPembuatan || "",
        "VOLUME Vessel M3": item.volumeVessel || "",
        "TARE (Kosongan)": item.tare || "",
        "AEBS": item.aebs || "",
        "TGL. PENGAJUAN": item.tglPengajuanBib ? new Date(item.tglPengajuanBib).toISOString().split('T')[0] : "",
        "EXPIRED STIKER (BIB)": item.expiredBib ? new Date(item.expiredBib).toISOString().split('T')[0] : "",
        "STATUS STICKER (BIB)": item.statusBib || "",
        "TGL. EXPIRED (TIA)": item.expiredTia ? new Date(item.expiredTia).toISOString().split('T')[0] : "",
        "STATUS STICKER (TIA)": item.statusTia || "",
        "NO TMA": item.noTma || "",
        "STATUS STICKER (TMA)": item.statusTma || "",
        "STATUS UNIT": item.statusUnit,
        "OWNER": item.owner || "",
        "NAMA / PIC": item.namaPic || "",
        "NIK KTP": item.nikKtp || "",
        "Kepemilikan STNK/Faktur": item.kepemilikan || "",
        "NO. KONTAK": item.noKontak || "",
        "KOMISIONER": item.komisioner || "",
        "KETERANGAN": item.keterangan || ""
      }));

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PERALATAN");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Data_Peralatan.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting SPIP Peralatan:", error);
      res.status(500).json({ error: "Gagal me-export data peralatan" });
    }
  });

  app.post("/api/spip/peralatan/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });


      let imported = 0;
      let skipped = 0;
      let errors: string[] = [];

      // Convert excel serial dates or dd-mm-yyyy / dd/mm/yyyy strings
      const parseDate = (val: any): Date | null => {
        if (!val) return null;
        if (val === "" || val === "-") return null;
        if (typeof val === 'number') {
          const date = new Date(Math.round((val - 25569) * 86400 * 1000));
          return isNaN(date.getTime()) ? null : date;
        }
        const str = val.toString().trim();
        const ddmmyyyy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        if (ddmmyyyy) {
          const [, day, month, year] = ddmmyyyy;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        const yyyymmdd = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
        if (yyyymmdd) {
          const [, year, month, day] = yyyymmdd;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        const date = new Date(str);
        return isNaN(date.getTime()) ? null : date;
      };

      // Parse all rows first (fast, no DB calls)
      const parsedRows: any[] = [];
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        try {
          const noLambung = row["NO LAMBUNG"];
          if (!noLambung) { skipped++; continue; }
          parsedRows.push({
            jenisSpip: "PERALATAN",
            jenisUnit: row["JENIS UNIT"]?.toString() || "DT - KONVENSIONAL",
            merk: row["MERK"]?.toString() || "Unknown",
            type: row["TYPE"]?.toString() || "-",
            noLambung: noLambung.toString(),
            noPolisi: row["NO POLISI"]?.toString() || null,
            noRangka: row["NO RANGKA"]?.toString() || null,
            noMesin: row["NO MESIN"]?.toString() || null,
            tahunPembuatan: parseInt(row["TAHUN PEMBUATAN"]) || null,
            gandar: parseInt(row["Gandar"]) || 4,
            volumeVessel: parseFloat(row["VOLUME Vessel M3"]) || null,
            tare: parseFloat(row["TARE (Kosongan)"]) || null,
            aebs: row["AEBS"]?.toString() || null,
            tglPengajuanBib: parseDate(row["TGL. PENGAJUAN"]),
            expiredBib: parseDate(row["EXPIRED STIKER (BIB)"] || row["EXPIRED STIKER"]),
            statusBib: row["STATUS STICKER (BIB)"]?.toString() || row["STATUS STICKER"]?.toString() || null,
            expiredTia: parseDate(row["TGL. EXPIRED (TIA)"] || row["TGL. EXPIRED"]),
            statusTia: row["STATUS STICKER (TIA)"]?.toString() || null,
            noTma: row["NO TMA"]?.toString() || null,
            statusTma: row["STATUS STICKER (TMA)"]?.toString() || null,
            statusUnit: row["STATUS UNIT"]?.toString() || "ACTIVE",
            owner: row["OWNER"]?.toString() || null,
            namaPic: row["NAMA / PIC"]?.toString() || null,
            nikKtp: row["NIK KTP"]?.toString() || null,
            kepemilikan: row["Kepemilikan STNK/Faktur"]?.toString() || null,
            noKontak: row["NO. KONTAK"]?.toString() || null,
            komisioner: row["KOMISIONER"]?.toString() || null,
            keterangan: row["KETERANGAN"]?.toString() || null,
          });
        } catch (err: any) {
          skipped++;
          errors.push(`Row ${i + 2}: ${err.message}`);
        }
      }

      // Batch upsert — 50 rows at a time for speed
      const BATCH_SIZE = 50;
      for (let b = 0; b < parsedRows.length; b += BATCH_SIZE) {
        const batch = parsedRows.slice(b, b + BATCH_SIZE);
        try {
          await db.insert(spipPeralatan).values(batch)
            .onConflictDoUpdate({
              target: spipPeralatan.noLambung,
              set: {
                jenisSpip: sql`excluded.jenis_spip`,
                jenisUnit: sql`excluded.jenis_unit`,
                merk: sql`excluded.merk`,
                type: sql`excluded.type`,
                noPolisi: sql`excluded.no_polisi`,
                noRangka: sql`excluded.no_rangka`,
                noMesin: sql`excluded.no_mesin`,
                tahunPembuatan: sql`excluded.tahun_pembuatan`,
                gandar: sql`excluded.gandar`,
                volumeVessel: sql`excluded.volume_vessel`,
                tare: sql`excluded.tare`,
                aebs: sql`excluded.aebs`,
                tglPengajuanBib: sql`excluded.tgl_pengajuan_bib`,
                expiredBib: sql`excluded.expired_bib`,
                statusBib: sql`excluded.status_bib`,
                expiredTia: sql`excluded.expired_tia`,
                statusTia: sql`excluded.status_tia`,
                noTma: sql`excluded.no_tma`,
                statusTma: sql`excluded.status_tma`,
                statusUnit: sql`excluded.status_unit`,
                owner: sql`excluded.owner`,
                namaPic: sql`excluded.nama_pic`,
                nikKtp: sql`excluded.nik_ktp`,
                kepemilikan: sql`excluded.kepemilikan`,
                noKontak: sql`excluded.no_kontak`,
                komisioner: sql`excluded.komisioner`,
                keterangan: sql`excluded.keterangan`,
                updatedAt: sql`now()`,
              }
            });
          imported += batch.length;
        } catch (err: any) {
          console.error("Batch import error:", err);
          skipped += batch.length;
          errors.push(`Batch ${Math.floor(b / BATCH_SIZE) + 1}: ${err.message}`);
        }
      }

      // Cleanup uploaded file
      fs.unlink(req.file.path, () => { });

      res.json({ success: true, imported, skipped, errors });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Gagal memproses file: " + error.message });
    }
  });

  app.post("/api/spip/peralatan", async (req, res) => {
    try {
      const data = insertSpipPeralatanSchema.parse(req.body);

      const existing = await db.select().from(spipPeralatan).where(eq(spipPeralatan.noLambung, data.noLambung)).limit(1);
      if (existing.length > 0) {
        return res.status(400).json({ error: "No Lambung sudah terdaftar" });
      }

      const newUnit = await db.insert(spipPeralatan).values(data).returning();
      res.status(201).json(newUnit[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  });

  app.get("/api/spip/peralatan/:id", async (req, res, next) => {
    // Pass sub-resource paths (e.g. /workshop) to their own routes
    if (req.params.id === "workshop") return next();
    try {
      const { id } = req.params;
      const unit = await db.select().from(spipPeralatan).where(eq(spipPeralatan.id, id)).limit(1);
      if (unit.length === 0) return res.status(404).json({ error: "Unit tidak ditemukan" });
      res.json(unit[0]);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/spip/peralatan/:id", async (req, res, next) => {
    if (req.params.id === "workshop") return next();
    try {
      const { id } = req.params;
      // Validasi + koersi tanggal (string -> Date) via schema, agar Drizzle timestamp tidak error
      const data = insertSpipPeralatanSchema.partial().parse(req.body);

      const updated = await db.update(spipPeralatan).set({
        ...data,
        updatedAt: new Date(),
      }).where(eq(spipPeralatan.id, id)).returning();

      if (updated.length === 0) return res.status(404).json({ error: "Unit tidak ditemukan" });
      res.json(updated[0]);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  });

  app.delete("/api/spip/peralatan/:id", async (req, res, next) => {
    if (req.params.id === "workshop") return next();
    try {
      const { id } = req.params;
      const deleted = await db.delete(spipPeralatan).where(eq(spipPeralatan.id, id)).returning();
      if (deleted.length === 0) return res.status(404).json({ error: "Unit tidak ditemukan" });
      res.json({ message: "Berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // SPIP PRASARANA
  // ============================================

  app.get("/api/spip/prasarana", async (req, res) => {
    try {
      const { search, area_lokasi, status_sertifikat, status_perawatan, page = "1", limit = "15" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = db.select().from(spipPrasarana).$dynamic();
      let conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(spipPrasarana.noLambung, `%${search}%`),
            ilike(spipPrasarana.jenisUnit, `%${search}%`),
            ilike(spipPrasarana.areaLokasi, `%${search}%`)
          )
        );
      }

      if (area_lokasi) conditions.push(eq(spipPrasarana.areaLokasi, area_lokasi as string));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (status_sertifikat) {
        if (status_sertifikat === 'EXPIRED') {
          conditions.push(and(isNotNull(spipPrasarana.expSertifikat), lt(spipPrasarana.expSertifikat, today)));
        } else if (status_sertifikat === 'AKTIF') {
          conditions.push(and(isNotNull(spipPrasarana.expSertifikat), gte(spipPrasarana.expSertifikat, today)));
        } else if (status_sertifikat === 'BELUM ADA') {
          conditions.push(isNull(spipPrasarana.noSertifikat));
        }
      }

      if (status_perawatan) {
        if (status_perawatan === 'OVERDUE') {
          conditions.push(or(eq(spipPrasarana.statusPerawatanS1, 'OVERDUE'), eq(spipPrasarana.statusPerawatanS2, 'OVERDUE')));
        } else if (status_perawatan === 'PENDING') {
          conditions.push(or(eq(spipPrasarana.statusPerawatanS1, 'PENDING'), eq(spipPrasarana.statusPerawatanS2, 'PENDING')));
        }
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(spipPrasarana).where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(totalResult[0]?.count || 0);

      const items = await baseQuery
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(spipPrasarana.createdAt));

      res.json({
        data: items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      console.error("Error fetching SPIP Prasarana:", error);
      res.status(500).json({ error: "Gagal mengambil data prasarana" });
    }
  });

  app.get("/api/spip/prasarana/export", async (req, res) => {
    try {
      const items = await db.select().from(spipPrasarana).orderBy(desc(spipPrasarana.createdAt));

      const formatted = items.map((item, idx) => ({
        "No": item.no || (idx + 1),
        "Jenis Unit": item.jenisUnit,
        "Koordinat": item.koordinat || "",
        "Lambung": item.noLambung,
        "Kapasitas": item.kapasitas || "",
        "Area/Lokasi": item.areaLokasi || "",
        "Tahun": item.tahunPembuatan || "",
        "Komisioner": item.komisioner || "",
        "No. Sertifikat": item.noSertifikat || "",
        "Tanggal Sertifikat": item.tglSertifikat ? format(new Date(item.tglSertifikat), "yyyy-MM-dd") : "",
        "EXP": item.expSertifikat ? format(new Date(item.expSertifikat), "yyyy-MM-dd") : "",
        "Semester 1": item.jadwalPerawatanS1 ? format(new Date(item.jadwalPerawatanS1), "yyyy-MM-dd") : "",
        "Status S1": item.statusPerawatanS1 || "",
        "Semester 2": item.jadwalPerawatanS2 ? format(new Date(item.jadwalPerawatanS2), "yyyy-MM-dd") : "",
        "Status S2": item.statusPerawatanS2 || "",
        "Keterangan": item.keterangan || ""
      }));

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "PRASARANA");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Data_Prasarana.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting SPIP Prasarana:", error);
      res.status(500).json({ error: "Gagal me-export data prasarana" });
    }
  });

  app.post("/api/spip/prasarana/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Data starting from Row 7 (index 6). Header is at Row 6 (index 5).
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      const dataRows = rawData.slice(6); // Row 7 onwards
      const headerRow = rawData[5]; // Row 6

      const getColIndex = (name: string) => headerRow.findIndex((h: string) => h && h.trim().toUpperCase() === name.toUpperCase());

      const indices = {
        no: getColIndex("NO"),
        jenisUnit: getColIndex("Jenis Unit"),
        koordinat: getColIndex("Koordinat"),
        lambung: getColIndex("LAMBUNG"),
        kapasitas: getColIndex("KAPASITAS"),
        areaLokasi: getColIndex("AREA/LOKASI"),
        tahun: getColIndex("TAHUN PEMBUATAN"),
        komisioner: getColIndex("KOMISIONER"),
        noSertifikat: getColIndex("No. SERTIFIKAT"),
        tglSertifikat: getColIndex("TANGGAL SERTIFIKAT"),
        exp: getColIndex("EXP"),
        s1: getColIndex("Semester 1"),
        s2: getColIndex("Semester 2"),
        keterangan: getColIndex("KETERANGAN")
      };

      const parseDate = (val: any): Date | null => {
        if (!val || val === "" || val === "-") return null;
        if (typeof val === 'number') {
          return new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const parseCoord = (coord: string) => {
        if (!coord) return { lat: null, lng: null };
        // Example: "3,72°S,115,64°E"
        try {
          const parts = coord.split(',').map(p => p.trim());
          let lat = null, lng = null;

          for (const part of parts) {
            if (part.includes('S') || part.includes('N')) {
              let val = parseFloat(part.replace(/[^0-9,.]/g, '').replace(',', '.'));
              if (part.includes('S')) val = -val;
              lat = val;
            } else if (part.includes('E') || part.includes('W')) {
              let val = parseFloat(part.replace(/[^0-9,.]/g, '').replace(',', '.'));
              if (part.includes('W')) val = -val;
              lng = val;
            }
          }
          return { lat, lng };
        } catch (e) {
          return { lat: null, lng: null };
        }
      };

      const parsedRows = [];
      let skipped = 0;
      let errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const noLambung = row[indices.lambung]?.toString().trim();
        if (!noLambung) { skipped++; continue; }

        const { lat, lng } = parseCoord(row[indices.koordinat]);

        parsedRows.push({
          no: parseInt(row[indices.no]) || null,
          jenisUnit: row[indices.jenisUnit]?.toString() || "Unknown",
          koordinat: row[indices.koordinat]?.toString() || null,
          koordinatLat: lat,
          koordinatLng: lng,
          noLambung: noLambung,
          kapasitas: row[indices.kapasitas]?.toString() || null,
          areaLokasi: row[indices.areaLokasi]?.toString() || null,
          tahunPembuatan: parseInt(row[indices.tahun]) || null,
          komisioner: row[indices.komisioner]?.toString() || null,
          noSertifikat: row[indices.noSertifikat]?.toString() || null,
          tglSertifikat: parseDate(row[indices.tglSertifikat]),
          expSertifikat: parseDate(row[indices.exp]),
          jadwalPerawatanS1: parseDate(row[indices.s1]),
          jadwalPerawatanS2: parseDate(row[indices.s2]),
          keterangan: row[indices.keterangan]?.toString() || null,
          jenisSpip: "PRASARANA",
          statusUnit: "AKTIF"
        });
      }

      for (const row of parsedRows) {
        await db.insert(spipPrasarana).values(row).onConflictDoUpdate({
          target: spipPrasarana.noLambung,
          set: { ...row, updatedAt: new Date() }
        });
      }

      fs.unlink(req.file.path, () => { });
      res.json({ success: true, imported: parsedRows.length, skipped, errors });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Gagal memproses file: " + error.message });
    }
  });

  app.post("/api/spip/prasarana", async (req, res) => {
    try {
      const data = insertSpipPrasaranaSchema.parse(req.body);
      const existing = await db.select().from(spipPrasarana).where(eq(spipPrasarana.noLambung, data.noLambung)).limit(1);
      if (existing.length > 0) return res.status(400).json({ error: "No Lambung sudah terdaftar" });
      const [newEntry] = await db.insert(spipPrasarana).values(data).returning();
      res.status(201).json(newEntry);
    } catch (error: any) {
      console.error("Error creating SPIP Prasarana:", error);
      res.status(400).json({ error: error.message || "Gagal menyimpan data" });
    }
  });

  app.get("/api/spip/prasarana/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [entry] = await db.select().from(spipPrasarana).where(eq(spipPrasarana.id, id)).limit(1);
      if (!entry) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/spip/prasarana/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertSpipPrasaranaSchema.partial().parse(req.body);
      const [updated] = await db.update(spipPrasarana).set({ ...data, updatedAt: new Date() }).where(eq(spipPrasarana.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating SPIP Prasarana:", error);
      res.status(400).json({ error: error.message || "Gagal memperbarui data" });
    }
  });

  app.delete("/api/spip/prasarana/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(spipPrasarana).where(eq(spipPrasarana.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json({ message: "Berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // SPIP INSTALASI
  // ============================================

  app.get("/api/spip/instalasi", async (req, res) => {
    try {
      const { search, kategori, area_lokasi, status_sertifikat, page = "1", limit = "15" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = db.select().from(spipInstalasi).$dynamic();
      let conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(spipInstalasi.jenisUnit, `%${search}%`),
            ilike(spipInstalasi.nomorRegister, `%${search}%`),
            ilike(spipInstalasi.areaLokasi, `%${search}%`)
          )
        );
      }

      if (kategori && kategori !== 'all') conditions.push(eq(spipInstalasi.kategori, kategori as string));
      if (area_lokasi && area_lokasi !== 'all') conditions.push(eq(spipInstalasi.areaLokasi, area_lokasi as string));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (status_sertifikat) {
        if (status_sertifikat === 'EXPIRED') {
          conditions.push(and(isNotNull(spipInstalasi.expSertifikat), lt(spipInstalasi.expSertifikat, today)));
        } else if (status_sertifikat === 'AKTIF') {
          conditions.push(and(isNotNull(spipInstalasi.expSertifikat), gte(spipInstalasi.expSertifikat, today)));
        } else if (status_sertifikat === 'BELUM ADA') {
          conditions.push(isNull(spipInstalasi.noSertifikat));
        }
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(spipInstalasi).where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(totalResult[0]?.count || 0);

      const items = await baseQuery
        .limit(limitNum)
        .offset(offset)
        .orderBy(desc(spipInstalasi.createdAt));

      res.json({
        data: items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      console.error("Error fetching SPIP Instalasi:", error);
      res.status(500).json({ error: "Gagal mengambil data instalasi" });
    }
  });

  app.get("/api/spip/instalasi/export", async (req, res) => {
    try {
      const items = await db.select().from(spipInstalasi).orderBy(desc(spipInstalasi.createdAt));

      const formatted = items.map((item, idx) => ({
        "NO": item.no || (idx + 1),
        "JENIS SPIP": item.jenisSpip,
        "Jenis Unit": item.jenisUnit,
        "MERK": item.merk || "",
        "TYPE": item.type || "",
        "Nomor Register": item.nomorRegister || "",
        "KAPASITAS": item.kapasitas || "",
        "AREA/LOKASI": item.areaLokasi || "",
        "TAHUN PEMBUATAN": item.tahunPembuatan || "",
        "KOMISIONER": item.komisioner || "",
        "No. SERTIFIKAT": item.noSertifikat || "",
        "TANGGAL SERTIFIKAT": item.tglSertifikat ? format(new Date(item.tglSertifikat), "yyyy-MM-dd") : "",
        "EXP": item.expSertifikat ? format(new Date(item.expSertifikat), "yyyy-MM-dd") : "",
        "KETERANGAN": item.keterangan || ""
      }));

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const ws = XLSX.utils.json_to_sheet(formatted);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "INSTALASI");
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=Data_Instalasi.xlsx');
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting SPIP Instalasi:", error);
      res.status(500).json({ error: "Gagal me-export data instalasi" });
    }
  });

  app.post("/api/spip/instalasi/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Data starting from Row 7 (index 6). Header is at Row 6 (index 5).
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (rawData.length < 6) {
        return res.status(400).json({ error: "File Excel tidak sesuai format (kurang baris header)" });
      }

      const dataRows = rawData.slice(6); // Row 7 onwards
      const headerRow = rawData[5]; // Row 6

      const getColIndex = (name: string) => headerRow.findIndex((h: string) => h && h.trim().toUpperCase() === name.toUpperCase());

      const indices = {
        no: getColIndex("NO"),
        jenisSpip: getColIndex("JENIS SPIP"),
        jenisUnit: getColIndex("Jenis Unit"),
        merk: getColIndex("MERK"),
        type: getColIndex("TYPE"),
        nomorRegister: getColIndex("Nomor Register") === -1 ? getColIndex("NO. LAMBUNG") : getColIndex("Nomor Register"),
        kapasitas: getColIndex("KAPASITAS"),
        areaLokasi: getColIndex("AREA/LOKASI"),
        tahun: getColIndex("TAHUN PEMBUATAN"),
        komisioner: getColIndex("KOMISIONER"),
        noSertifikat: getColIndex("No. SERTIFIKAT"),
        tglSertifikat: getColIndex("TANGGAL SERTIFIKAT"),
        exp: getColIndex("EXP"),
        keterangan: getColIndex("KETERANGAN")
      };

      const parseDate = (val: any): Date | null => {
        if (!val || val === "" || val === "-") return null;
        if (typeof val === 'number') {
          return new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const detectKategori = (jenisUnit: string): string => {
        if (!jenisUnit) return "Instalasi Lainnya";
        const upperCaseUnit = jenisUnit.toUpperCase();
        if (upperCaseUnit.includes("LISTRIK")) return "Instalasi Listrik";
        if (upperCaseUnit.includes("AIR")) return "Instalasi Air";
        if (upperCaseUnit.includes("TANKI SOLAR") || upperCaseUnit.includes("FUEL TANK")) return "Tanki Solar";
        if (upperCaseUnit.includes("RADIO")) return "Radio";
        if (upperCaseUnit.includes("KEBAKARAN")) return "Proteksi Kebakaran";
        return "Instalasi Lainnya";
      };

      const parsedRows = [];
      let skipped = 0;
      let errors = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const jenisUnit = row[indices.jenisUnit]?.toString().trim();
        if (!jenisUnit) { skipped++; continue; }

        let nomorRegister = row[indices.nomorRegister]?.toString().trim();
        if (!nomorRegister) {
          nomorRegister = `INST-${Date.now()}-${i}`;
        }

        parsedRows.push({
          no: parseInt(row[indices.no]) || null,
          jenisSpip: "INSTALASI",
          jenisUnit: jenisUnit,
          kategori: detectKategori(jenisUnit),
          merk: row[indices.merk]?.toString() || null,
          type: row[indices.type]?.toString() || null,
          nomorRegister: nomorRegister,
          kapasitas: row[indices.kapasitas]?.toString() || null,
          areaLokasi: row[indices.areaLokasi]?.toString() || null,
          tahunPembuatan: parseInt(row[indices.tahun]) || null,
          komisioner: row[indices.komisioner]?.toString() || null,
          noSertifikat: row[indices.noSertifikat]?.toString() || null,
          tglSertifikat: parseDate(row[indices.tglSertifikat]),
          expSertifikat: parseDate(row[indices.exp]),
          keterangan: row[indices.keterangan]?.toString() || null,
          statusUnit: "AKTIF"
        });
      }

      for (const row of parsedRows) {
        // Upsert based on nomorRegister or create if doesn't exist
        // Since we don't have a strict unique constraint on nomorRegister in all cases,
        // we'll check if it exists first or just insert.
        // The user suggested "auto ID if null", let's assume we want to avoid duplicates if nomorRegister is provided.
        await db.insert(spipInstalasi).values(row).onConflictDoUpdate({
          target: spipInstalasi.id, // This won't work for upsert by nomorRegister unless we add a unique index
          set: { ...row, updatedAt: new Date() }
        }).catch(async (err) => {
          // Fallback insert if conflict on id (which shouldn't happen with random uuid)
          // If we wanted to upsert by nomorRegister, we should have made it unique or added a unique index.
          // For now, let's just insert
          await db.insert(spipInstalasi).values(row);
        });
      }

      fs.unlink(req.file.path, () => { });
      res.json({ success: true, imported: parsedRows.length, skipped, errors });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Gagal memproses file: " + error.message });
    }
  });

  app.post("/api/spip/instalasi", async (req, res) => {
    try {
      const data = insertSpipInstalasiSchema.parse(req.body);
      const [newEntry] = await db.insert(spipInstalasi).values(data).returning();
      res.status(201).json(newEntry);
    } catch (error: any) {
      console.error("Error creating SPIP Instalasi:", error);
      res.status(400).json({ error: error.message || "Gagal menyimpan data" });
    }
  });

  app.get("/api/spip/instalasi/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [entry] = await db.select().from(spipInstalasi).where(eq(spipInstalasi.id, id)).limit(1);
      if (!entry) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(entry);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/spip/instalasi/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertSpipInstalasiSchema.partial().parse(req.body);
      const [updated] = await db.update(spipInstalasi).set({ ...data, updatedAt: new Date() }).where(eq(spipInstalasi.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating SPIP Instalasi:", error);
      res.status(400).json({ error: error.message || "Gagal memperbarui data" });
    }
  });

  app.delete("/api/spip/instalasi/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [deleted] = await db.delete(spipInstalasi).where(eq(spipInstalasi.id, id)).returning();
      if (!deleted) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json({ message: "Berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============================================
  // SPIP PERALATAN WORKSHOP (ALAT BENGKEL)
  // ============================================

  app.get("/api/spip/peralatan/workshop", async (req, res) => {
    try {
      const { search, jenis_unit, area_lokasi, status, page = "1", limit = "1000" } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let baseQuery = db.select().from(spipPeralatanWorkshop).$dynamic();
      let conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(spipPeralatanWorkshop.noLambung, `%${search}%`),
            ilike(spipPeralatanWorkshop.jenisUnit, `%${search}%`),
            ilike(spipPeralatanWorkshop.areaLokasi, `%${search}%`)
          )
        );
      }

      if (jenis_unit && jenis_unit !== 'all') conditions.push(eq(spipPeralatanWorkshop.jenisUnit, jenis_unit as string));
      if (area_lokasi && area_lokasi !== 'all') conditions.push(eq(spipPeralatanWorkshop.areaLokasi, area_lokasi as string));

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (status) {
        if (status === 'EXPIRED') {
          conditions.push(or(
            isNull(spipPeralatanWorkshop.expSertifikat),
            lt(spipPeralatanWorkshop.expSertifikat, today)
          ));
        } else if (status === 'AKTIF') {
          conditions.push(and(
            isNotNull(spipPeralatanWorkshop.expSertifikat),
            gte(spipPeralatanWorkshop.expSertifikat, today)
          ));
        }
      }

      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions));
      }

      const items = await baseQuery
        .limit(limitNum)
        .offset(offset)
        .orderBy(asc(spipPeralatanWorkshop.jenisUnit), asc(spipPeralatanWorkshop.noLambung));

      const totalResult = await db.select({ count: sql<number>`count(*)` }).from(spipPeralatanWorkshop).where(conditions.length > 0 ? and(...conditions) : undefined);
      const total = Number(totalResult[0]?.count || 0);

      res.json({
        data: items,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum)
      });
    } catch (error) {
      console.error("Error fetching SPIP Workshop Tools:", error);
      res.status(500).json({ error: "Gagal mengambil data peralatan workshop" });
    }
  });

  app.post("/api/spip/peralatan/workshop/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const xlsxModule = await import("xlsx");
      const XLSX = xlsxModule.default || xlsxModule;
      const workbook = XLSX.readFile(req.file.path);
      const sheetName = workbook.SheetNames.find(n => n.includes("PERALATAN 2")) || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (rawData.length < 7) {
        return res.status(400).json({ error: "Format Excel tidak sesuai (data minimal mulai baris 7)" });
      }

      const dataRows = rawData.slice(6); // Row 7 onwards
      const headerRow = rawData[5]; // Row 6 (Header mapping)

      const getColIndex = (name: string) => headerRow.findIndex((h: string) => h && h.trim().toUpperCase() === name.toUpperCase());

      const indices = {
        no: getColIndex("NO"),
        jenisUnit: getColIndex("Jenis Unit"),
        noLambung: getColIndex("No Lambung"),
        kapasitas: getColIndex("Kapasitas"),
        areaLokasi: getColIndex("Area/Lokasi"),
        komisioner: getColIndex("Komisioner"),
        noSertifikat: getColIndex("No. Sertifikat"),
        tglSertifikat: getColIndex("Tgl Sertifikat"),
        exp: getColIndex("EXP"),
        keterangan: getColIndex("Keterangan")
      };

      const parseDate = (val: any): Date | null => {
        if (!val || val === "" || val === "-" || val === "EXPIRED") return null;
        if (typeof val === 'number') {
          return new Date(Math.round((val - 25569) * 86400 * 1000));
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
      };

      const parseKapasitas = (val: string) => {
        if (!val) return { nilai: null, satuan: null };
        const match = val.toString().match(/^(\d+[\.\,]?\d*)\s*(.*)$/);
        if (match) {
          return {
            nilai: parseFloat(match[1].replace(',', '.')),
            satuan: match[2].trim()
          };
        }
        return { nilai: null, satuan: val.toString() };
      };

      const parsedRows = [];
      let skipped = 0;

      for (const row of dataRows) {
        const noLambung = row[indices.noLambung]?.toString().trim();
        if (!noLambung || noLambung === "No Lambung") { skipped++; continue; }

        const cap = parseKapasitas(row[indices.kapasitas]);

        parsedRows.push({
          no: parseInt(row[indices.no]) || null,
          jenisUnit: row[indices.jenisUnit]?.toString() || "Unknown",
          noLambung: noLambung,
          kapasitas: row[indices.kapasitas]?.toString() || null,
          nilaiKapasitas: cap.nilai,
          satuanKapasitas: cap.satuan,
          areaLokasi: row[indices.areaLokasi]?.toString() || null,
          komisioner: row[indices.komisioner]?.toString() || null,
          noSertifikat: row[indices.noSertifikat]?.toString() || null,
          tglSertifikat: parseDate(row[indices.tglSertifikat]),
          expSertifikat: parseDate(row[indices.exp]),
          keterangan: row[indices.keterangan]?.toString() || null,
          jenisSpip: "PERALATAN",
          subKategori: "BERGERAK",
          statusUnit: "AKTIF"
        });
      }

      for (const row of parsedRows) {
        await db.insert(spipPeralatanWorkshop).values(row).onConflictDoUpdate({
          target: spipPeralatanWorkshop.noLambung,
          set: { ...row, updatedAt: new Date() }
        });
      }

      fs.unlink(req.file.path, () => { });
      res.json({ success: true, imported: parsedRows.length, skipped });
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ error: "Gagal memproses file: " + error.message });
    }
  });

  app.get("/api/spip/peralatan/workshop/export", async (req, res) => {
    try {
      const items = await db.select().from(spipPeralatanWorkshop).orderBy(asc(spipPeralatanWorkshop.jenisUnit), asc(spipPeralatanWorkshop.noLambung));

      const ExcelJS = await import("exceljs");
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("PERALATAN 2");

      // Setup Headers (Basic for now to match the user's reference)
      worksheet.columns = [
        { header: 'No', key: 'no', width: 5 },
        { header: 'Jenis Unit', key: 'jenisUnit', width: 25 },
        { header: 'No Lambung', key: 'noLambung', width: 20 },
        { header: 'Kapasitas', key: 'kapasitas', width: 15 },
        { header: 'Area/Lokasi', key: 'areaLokasi', width: 25 },
        { header: 'Komisioner', key: 'komisioner', width: 15 },
        { header: 'No. Sertifikat', key: 'noSertifikat', width: 20 },
        { header: 'Tgl Sertifikat', key: 'tglSertifikat', width: 15 },
        { header: 'EXP', key: 'expSertifikat', width: 15 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Keterangan', key: 'keterangan', width: 30 }
      ];

      items.forEach((item, idx) => {
        const row = worksheet.addRow({
          no: item.no || (idx + 1),
          jenisUnit: item.jenisUnit,
          noLambung: item.noLambung,
          kapasitas: item.kapasitas,
          areaLokasi: item.areaLokasi,
          komisioner: item.komisioner,
          noSertifikat: item.noSertifikat,
          tglSertifikat: item.tglSertifikat ? format(new Date(item.tglSertifikat), "dd MMM yyyy") : "-",
          expSertifikat: item.expSertifikat ? format(new Date(item.expSertifikat), "dd MMM yyyy") : "-",
          status: "", // To be calculated or colored
          keterangan: item.keterangan || ""
        });

        const isExpired = !item.expSertifikat || new Date(item.expSertifikat) <= new Date();
        const statusCell = row.getCell('status');

        if (isExpired) {
          statusCell.value = "EXPIRED";
          statusCell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFF0000' } // Red
          };
          statusCell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
        } else {
          // Calculate countdown
          const remaining = new Date(item.expSertifikat!).getTime() - new Date().getTime();
          const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
          const months = Math.floor(days / 30);
          const years = Math.floor(months / 12);
          statusCell.value = `${years} Thn, ${months % 12} Bln, ${days % 30} Hari`;
          statusCell.font = { color: { argb: 'FF008000' }, bold: true }; // Green
        }
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=SPIP_Peralatan_Workshop.xlsx');
      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("Error exporting SPIP Workshop:", error);
      res.status(500).json({ error: "Gagal me-export data" });
    }
  });

  app.post("/api/spip/peralatan/workshop", async (req, res) => {
    try {
      const data = insertSpipPeralatanWorkshopSchema.parse(req.body);
      const [newUnit] = await db.insert(spipPeralatanWorkshop).values(data).returning();
      res.status(201).json(newUnit);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  });

  app.get("/api/spip/peralatan/workshop/:id", async (req, res) => {
    try {
      const [unit] = await db.select().from(spipPeralatanWorkshop).where(eq(spipPeralatanWorkshop.id, req.params.id)).limit(1);
      if (!unit) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(unit);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/spip/peralatan/workshop/:id", async (req, res) => {
    try {
      const data = insertSpipPeralatanWorkshopSchema.partial().parse(req.body);
      const [updated] = await db.update(spipPeralatanWorkshop).set({
        ...data,
        updatedAt: new Date()
      }).where(eq(spipPeralatanWorkshop.id, req.params.id)).returning();
      if (!updated) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  });

  app.delete("/api/spip/peralatan/workshop/:id", async (req, res) => {
    try {
      const [deleted] = await db.delete(spipPeralatanWorkshop).where(eq(spipPeralatanWorkshop.id, req.params.id)).returning();
      if (!deleted) return res.status(404).json({ error: "Data tidak ditemukan" });
      res.json({ message: "Berhasil dihapus" });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return httpServer;
}



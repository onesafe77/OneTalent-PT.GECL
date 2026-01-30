// @ts-nocheck
import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import OpenAI from "openai";
import { differenceInDays, parseISO, isValid, format, addDays, addWeeks, addMonths } from "date-fns";
import { exec } from "child_process";

// Configure Multer
const upload = multer({ dest: 'uploads/' });

import { storage } from "./storage";
import { fetchSheetData, listSpreadsheetSheets, getSpreadsheetMetadata, generateVisualizationSuggestions } from "./google-sheets-service";
import { ObjectStorageService, ObjectNotFoundError } from "./replit_integrations/object_storage";
import { setupAuth } from "./replitAuth";
import {
  insertEmployeeSchema,
  insertAttendanceSchema,
  insertRosterSchema,
  insertLeaveRequestSchema,
  insertQrTokenSchema,
  insertMeetingSchema,
  insertMeetingAttendanceSchema,
  insertManualAttendanceSchema,
  insertSimperMonitoringSchema,
  insertSidakFatigueSessionSchema,
  insertSidakFatigueRecordSchema,
  insertSidakFatigueObserverSchema,
  insertSidakRosterSessionSchema,
  insertSidakRosterRecordSchema,
  insertSidakRosterObserverSchema,
  insertSidakSeatbeltSessionSchema,
  insertSidakSeatbeltRecordSchema,
  insertSidakSeatbeltObserverSchema,
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

  // TNA Schemas
  insertTrainingSchema,
  insertTnaSummarySchema,
  insertTnaEntrySchema,
  trainings,
  tnaEntries,
  insertKompetensiMonitoringSchema,
  siAsefDocuments, siAsefChunks, siAsefChatSessions, siAsefChatMessages,
  insertSiAsefChatSessionSchema, insertSiAsefChatMessageSchema,
  fmsFatigueAlerts,
  insertActivityEventSchema,
  // Induction Schemas
  insertInductionMaterialSchema,
  insertInductionQuestionSchema,
  insertInductionScheduleSchema,
  insertInductionAnswerSchema,
  inductionMaterials,
  inductionSchedules,
} from "@shared/schema";
import { eq, ilike, and, desc, sql } from "drizzle-orm";
import { processAndSaveDocument, deleteDocument, processAndSaveGoogleSheet } from "./services/document-service";
import * as whatsappService from "./services/whatsapp-service";
import { buildRAGPrompt, searchSimilarChunks, generateEmbedding } from "./services/rag-service";
import { eq, desc, asc } from "drizzle-orm";
import { db } from "./db";
import { PushNotificationService } from "./push-notification";
import { createUserWithRole, Role, Permission, ROLE_PERMISSIONS, getRoleFromPosition } from "@shared/rbac";
import { sendWhatsAppMessage } from "./services/whatsapp-service";
import { inductionAiService } from "./services/induction-ai-service";

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

export async function registerRoutes(app: Express): Promise<Server> {
  console.log('Resource: server/routes.ts LOADED - Verifying photo upload fix');

  app.get('/api/probe', (req, res) => {
    console.log('[PROBE] PING RECEIVED');
    res.json({ status: 'alive' });
  });

  // Initialize auth/session middleware
  await setupAuth(app);

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
  app.post("/api/employees/:id/photo", upload.single('photo'), async (req, res) => {
    console.log(`[ROUTE MATCH] POST /api/employees/${req.params.id}/photo`);
    try {
      const { id } = req.params;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No photo uploaded" });
      }

      // Verify file was actually saved to disk
      const savedFilePath = path.join(uploadsDir, file.filename);
      const fileExists = fs.existsSync(savedFilePath);
      console.log('DEBUG: Photo uploaded!', {
        originalName: file.originalname,
        filename: file.filename,
        path: file.path,
        savedFilePath,
        fileExists,
        uploadsDir
      });

      if (!fileExists) {
        console.error('CRITICAL: File was not saved to disk!', { savedFilePath });
        return res.status(500).json({ message: "File upload failed - file not saved" });
      }

      // Store relative path for URL access
      const photoUrl = `/uploads/${file.filename}`;
      await storage.updateEmployee(id, { photoUrl });
      res.json({ photoUrl });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Serve uploaded files statically with absolute path
  app.use('/uploads', express.static(uploadsDir));



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
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API Key not configured" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Analisa data pelanggaran overspeed ini dan berikan 3-4 insight penting dalam Bahasa Indonesia yang singkat, padat, dan actionable untuk manajemen.
      Data: ${JSON.stringify(stats)}
      
      Format output: JSON array of strings. Contoh: ["Insight 1...", "Insight 2..."]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OpenAI API Key not configured" });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Analisa data pelanggaran Safe Distance (Jarak Aman) ini dan berikan 3-4 insight penting dalam Bahasa Indonesia yang singkat, padat, dan actionable untuk manajemen.
      Data: ${JSON.stringify(stats)}
      
      Format output: JSON array of strings. Contoh: ["Insight 1...", "Insight 2..."]`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
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
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      if (!process.env.OPENAI_API_KEY) {
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

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
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

      // Get auth user from database
      let authUser;
      try {
        console.log("🔐 Attempting database lookup for NIK:", nik);
        console.log("🔐 DATABASE_URL exists:", !!process.env.DATABASE_URL);
        authUser = await storage.getAuthUserByNik(nik);
        console.log("🔐 Auth user lookup result:", authUser ? "found" : "not found");
      } catch (dbError: any) {
        console.error("🔐 Database error looking up auth user:", dbError?.message || dbError);
        console.error("🔐 Full error:", JSON.stringify(dbError, Object.getOwnPropertyNames(dbError)));
        return res.status(500).json({
          message: "Gagal mengakses database: " + (dbError?.message || "Unknown error"),
          errorType: dbError?.name || "Unknown"
        });
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

      // Create user with role and permissions based on position
      const userWithRole = createUserWithRole(employee.id, employee.name, employee.position || null);

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
      // Ensure user has role and permissions (for existing sessions)
      if (!user.role || !user.permissions) {
        const userWithRole = createUserWithRole(user.nik, user.name, user.position || null);
        (req.session as any).user = userWithRole;
        res.json({ authenticated: true, user: userWithRole });
      } else {
        res.json({ authenticated: true, user });
      }
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
      // Handle pagination if requested
      const page = req.query.page ? parseInt(req.query.page as string) : undefined;
      const perPage = req.query.per_page ? parseInt(req.query.per_page as string) : 20;
      const search = req.query.search as string;

      if (page) {
        // Use database pagination when page is specified
        const result = await storage.getEmployeesPaginated(page, perPage, search);
        return res.json(result);
      }

      // Check cache first for massive performance improvement (Full List)
      let employees = getCachedAllEmployees();

      if (!employees) {
        console.log('🔄 Fetching all employees from database...');
        employees = await storage.getAllEmployees();
        setCachedAllEmployees(employees);
      }

      res.json(employees);
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
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

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

      res.status(400).json({ message: "Data karyawan tidak valid" });
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
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Delete all employees
  app.delete("/api/employees", async (req, res) => {
    try {
      const deleted = await storage.deleteAllEmployees();
      if (deleted) {
        res.json({ message: "Semua data karyawan berhasil dihapus" });
      } else {
        res.status(500).json({ message: "Gagal menghapus data karyawan" });
      }
    } catch (error) {
      console.error("Error deleting all employees:", error);
      res.status(500).json({ message: "Failed to delete all employees" });
    }
  });

  // Bulk upload employees
  app.post("/api/employees/bulk", async (req, res) => {
    try {
      const { employees: employeeData } = req.body;

      if (!Array.isArray(employeeData)) {
        return res.status(400).json({ message: "Invalid employee data format" });
      }

      const results = [];
      const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';

      for (const emp of employeeData) {
        try {
          // Validate each employee data
          const validatedEmployee = insertEmployeeSchema.parse(emp);

          // Generate QR Code token for each employee
          const tokenData = `${validatedEmployee.id || ''}${secretKey}Attend`;
          const qrToken = Buffer.from(tokenData).toString('base64').slice(0, 16);
          const qrData = JSON.stringify({ id: validatedEmployee.id, token: qrToken });

          // Add QR Code to employee data (as JSON for consistency)  
          const employeeWithQR = {
            ...validatedEmployee,
            qrCode: qrData
          };

          const employee = await storage.createEmployee(employeeWithQR);

          // Also create QR token record
          await storage.createQrToken({
            employeeId: employee.id,
            token: qrToken,
            isActive: true
          });

          results.push(employee);
        } catch (validationError) {
          console.error("Validation error for employee:", emp, validationError);
          // Skip invalid entries but continue processing
        }
      }

      // Clear employee caches since we've added new data
      clearAllCaches();

      res.json({
        message: `Successfully uploaded ${results.length} employees with QR codes`,
        employees: results
      });
    } catch (error) {
      console.error("Error bulk uploading employees:", error);
      res.status(500).json({ message: "Failed to upload employees" });
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

      console.log(`Creating ${validatedRosters.length} schedules...`);

      // Create schedules in larger batches without individual logging
      const createdSchedules = [];
      for (let i = 0; i < validatedRosters.length; i += batchSize) {
        const batch = validatedRosters.slice(i, i + batchSize);

        // Process batch without individual logging
        const batchPromises = batch.map(async (rosterData) => {
          try {
            return await storage.createRosterSchedule(rosterData);
          } catch (error) {
            return null; // Skip duplicates
          }
        });

        const batchResults = await Promise.all(batchPromises);
        createdSchedules.push(...batchResults.filter(result => result !== null));

        // Minimal progress logging
        if ((i + batchSize) % 2000 === 0 || i + batchSize >= validatedRosters.length) {
          console.log(`Created ${createdSchedules.length} schedules so far`);
        }
      }

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
      const allRosters = await storage.getRosterByDateRange(startDate, endDate);
      const rostersToDelete = allRosters.filter((r: any) => r.employeeId === employeeId);

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
        message: `Berhasil update ${createdSchedules.length} jadwal untuk ${employee.name} di ${monthName} ${year}`,
        employee: {
          id: employee.id,
          name: employee.name
        },
        month: month,
        deleted: rostersToDelete.length,
        created: createdSchedules.length,
        rosters: createdSchedules
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
      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

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

      if (!month) {
        return res.status(400).json({ message: "Month parameter is required (format: YYYY-MM)" });
      }

      // Get all employees and SIDAK Fatigue sessions
      const [allEmployees, allSessions] = await Promise.all([
        storage.getAllEmployees(),
        storage.getAllSidakFatigueSessions()
      ]);

      // Filter to get DRIVERS ONLY (position = "driver")
      const driversOnly = allEmployees.filter(emp =>
        emp.position?.toLowerCase() === "driver"
      );

      // Filter sessions by month
      const monthSessions = allSessions.filter(session => session.tanggal.startsWith(month));

      // Get all records for filtered sessions using batched storage method (avoids connection limit)
      const sessionIds = monthSessions.map(s => s.id);
      const allRecords = await storage.getSidakFatigueRecordsBySessionIds(sessionIds);

      // Count SIDAK per employee (by NIK)
      const sidakCountByNik = allRecords.reduce((acc, record) => {
        acc[record.nik] = (acc[record.nik] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Build evaluation data for DRIVERS ONLY (BEFORE status filtering)
      const allEvaluationData = driversOnly.map(employee => ({
        id: employee.id,
        nama: employee.name,
        nik: employee.id, // Using ID as NIK
        totalSidak: sidakCountByNik[employee.id] || 0,
        status: (sidakCountByNik[employee.id] || 0) > 0 ? "Sudah SIDAK" : "Belum SIDAK"
      }));

      // Calculate summary stats from DRIVERS ONLY (UNFILTERED by status)
      const totalDrivers = driversOnly.length;
      const sudahSidak = allEvaluationData.filter(emp => emp.totalSidak > 0).length;
      const belumSidak = totalDrivers - sudahSidak;
      const totalSidakKeseluruhan = allRecords.length;

      // Apply status filter AFTER computing summary
      let filteredEvaluationData = allEvaluationData;
      if (status === "sudah") {
        filteredEvaluationData = allEvaluationData.filter(emp => emp.totalSidak > 0);
      } else if (status === "belum") {
        filteredEvaluationData = allEvaluationData.filter(emp => emp.totalSidak === 0);
      }

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

  // Upload photos for meeting (max 4)
  const meetingPhotoUpload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'meetings');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'meeting-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
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

  app.post("/api/meetings/:id/upload-photos", meetingPhotoUpload.array('photos', 4), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const meeting = await storage.getMeeting(id);
      if (!meeting) {
        // Clean up uploaded files
        files.forEach(file => fs.unlinkSync(file.path));
        return res.status(404).json({ error: "Meeting not found" });
      }

      // Get relative paths for storage
      const photoPaths = files.map(file => `/uploads/meetings/${path.basename(file.path)}`);

      // Merge with existing photos (max 4 total)
      const existingPhotos = meeting.meetingPhotos || [];
      const allPhotos = [...existingPhotos, ...photoPaths].slice(0, 4);

      // Update meeting with photos
      const updatedMeeting = await storage.updateMeeting(id, {
        ...meeting,
        meetingPhotos: allPhotos
      });

      res.json({
        message: "Photos uploaded successfully",
        photos: allPhotos,
        meeting: updatedMeeting
      });
    } catch (error) {
      console.error("Error uploading meeting photos:", error);
      // Clean up files on error
      if (req.files) {
        (req.files as Express.Multer.File[]).forEach(file => {
          if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });
      }
      res.status(500).json({ error: "Failed to upload photos" });
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

      // Delete physical file
      const photoPath = photos[index];
      const fullPath = path.join(process.cwd(), photoPath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      // Remove from array
      const updatedPhotos = photos.filter((_, i) => i !== index);

      // Update meeting
      const updatedMeeting = await storage.updateMeeting(id, {
        ...meeting,
        meetingPhotos: updatedPhotos
      });

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

      const baseUrl = process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

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
            // Generate new QR URL format
            const secretKey = process.env.QR_SECRET_KEY || 'AttendanceQR2024';
            const tokenData = `${employee.id}${secretKey}Attend`;
            const qrToken = Buffer.from(tokenData).toString('base64').slice(0, 16);
            const qrUrl = `${baseUrl}/qr-redirect?data=${encodeURIComponent(JSON.stringify({ id: employee.id, token: qrToken }))}`;

            // Update employee with new QR URL
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
        return res.redirect(`/workspace/meeting-scanner?token=${qrData.token}`);
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

  // Step 1: Request upload URL
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

      // Ensure directory exists
      const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-fatigue-photos');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const protocol = req.protocol;
      const host = req.get('host');
      const uploadURL = `${protocol}://${host}/api/sidak-fatigue/temp-upload/${filename}`;
      const objectPath = `/uploads/sidak-fatigue-photos/${filename}`;

      res.json({ uploadURL, objectPath });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Step 2: Temp upload endpoint
  app.put("/api/sidak-fatigue/temp-upload/:filename", async (req, res) => {
    try {
      const { filename } = req.params;
      const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-fatigue-photos');
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
  app.post("/api/sidak-fatigue/:id/confirm-upload", async (req, res) => {
    try {
      const { id } = req.params;
      const { objectPath } = req.body;

      const session = await storage.getSidakFatigueSession(id);
      if (!session) return res.status(404).json({ error: "Session not found" });

      const existingPhotos = session.activityPhotos || [];
      const updatedPhotos = [...existingPhotos, objectPath];

      const updatedSession = await storage.updateSidakFatigueSession(id, {
        activityPhotos: updatedPhotos
      });

      res.json({ photos: updatedSession.activityPhotos });
    } catch (error) {
      console.error("Error confirming upload:", error);
      res.status(500).json({ error: "Failed to confirm upload" });
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
      res.json(record);
    } catch (error: any) {
      console.error("Error adding Sidak Roster record:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      if (error.message?.includes('Maksimal 15 karyawan')) {
        return res.status(422).json({ message: error.message });
      }
      res.status(500).json({ message: "Gagal menambahkan data karyawan" });
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-seatbelt-photos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        // Cleanup uploaded files if session missing
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "Sesi Sidak Seatbelt tidak ditemukan" });
      }

      const newPhotoPaths = files.map(file => `/uploads/sidak-seatbelt-photos/${path.basename(file.path)}`);

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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-kecepatan-photos');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "Sesi Sidak Kecepatan tidak ditemukan" });
      }

      const newPhotoPaths = files.map(file => `/uploads/sidak-kecepatan-photos/${path.basename(file.path)}`);
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
      const validatedData = insertSidakWorkshopRecordSchema.parse({ ...req.body, sessionId: req.params.id });
      const record = await storage.createSidakWorkshopRecord(validatedData);
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
  // SIDAK RECAP API
  // ============================================
  app.get("/api/sidak-recap", async (req, res) => {
    try {
      const fetch = (name: string, p: Promise<any>) => p.catch(e => {
        console.error(`FAILED: ${name}`, e);
        // Return empty array to avoid crashing the whole page if one fails
        return [];
      });

      const [
        fatigue, roster, seatbelt, rambu,
        antrian, jarak, kecepatan,
        pencahayaan, loto, digital, workshop
      ] = await Promise.all([
        fetch('Fatigue', storage.getAllSidakFatigueSessions()),
        fetch('Roster', storage.getAllSidakRosterSessions()),
        fetch('Seatbelt', storage.getAllSidakSeatbeltSessions()),
        fetch('Rambu', storage.getAllSidakRambuSessions()),
        fetch('Antrian', storage.getAllSidakAntrianSessions()),
        fetch('Jarak', storage.getAllSidakJarakSessions()),
        fetch('Kecepatan', storage.getAllSidakKecepatanSessions()),
        fetch('Pencahayaan', storage.getAllSidakPencahayaanSessions()),
        fetch('LOTO', storage.getAllSidakLotoSessions()),
        fetch('Digital', storage.getAllSidakDigitalSessions()),
        fetch('Workshop', storage.getAllSidakWorkshopSessions())
      ]);

      const mapSession = (s: any, type: string) => {
        const tanggal = s.tanggal || s.date || s.tanggalPelaksanaan || "";
        const waktu = s.waktu || s.jam || s.jamPelaksanaan || "";
        const waktuStr = (s.waktuMulai && s.waktuSelesai) ? `${s.waktuMulai} - ${s.waktuSelesai}` : waktu;

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
          observerCount: 0,
          observers: "",
          createdBy: s.createdBy || null,
          supervisorName: s.createdBy || s.supervisorName || s.picName || s.nama || "-",
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
        ...workshop.map((s: any) => mapSession(s, 'Workshop'))
      ];

      // Resolve supervisor NIKs to names
      const nikCache = new Map<string, string>();
      for (const session of allSessions) {
        const nik = session.createdBy;
        if (nik && (nik.startsWith('C-') || nik.startsWith('P-'))) {
          if (!nikCache.has(nik)) {
            const employee = await storage.getEmployee(nik);
            nikCache.set(nik, employee?.name || nik);
          }
          session.supervisorName = nikCache.get(nik) || nik;
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
              return (await storage.getSidakWorkshopRecords(session.id)).length;
            default:
              return 0;
          }
        } catch {
          return 0;
        }
      };

      // Process in batches of 10 for better performance
      const sessionsWithZero = allSessions.filter(s => s.totalSampel === 0);
      console.log(`[SIDAK-RECAP] Sessions with totalSampel=0: ${sessionsWithZero.length}`);

      const batchSize = 10;
      for (let i = 0; i < sessionsWithZero.length; i += batchSize) {
        const batch = sessionsWithZero.slice(i, i + batchSize);
        const counts = await Promise.all(batch.map(s => getRecordCount(s)));
        batch.forEach((s, idx) => {
          console.log(`[SIDAK-RECAP] Session ${s.id} (${s.type}): records count = ${counts[idx]}`);
          s.totalSampel = counts[idx];
        });
      }

      allSessions.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

      const stats = {
        totalSidak: allSessions.length,
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
        totalKaryawanDiperiksa: allSessions.reduce((acc, curr) => acc + (curr.totalSampel || 0), 0),
        supervisorStats: [] as any[]
      };

      const supervisorMap = new Map<string, any>();
      allSessions.forEach(session => {
        const name = session.supervisorName;
        if (name && name !== '-' && name !== 'N/A') {
          if (!supervisorMap.has(name)) {
            supervisorMap.set(name, {
              name,
              fatigue: 0, roster: 0, seatbelt: 0, rambu: 0, antrian: 0,
              jarak: 0, kecepatan: 0, pencahayaan: 0, loto: 0, digital: 0, workshop: 0,
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

      res.json({ sessions: allSessions, stats });

    } catch (error: any) {
      console.error("Error fetching Sidak Recap:", error);
      res.status(500).json({
        message: "Gagal memuat data rekap SIDAK",
        error: String(error),
        stack: (error instanceof Error) ? error.stack : undefined
      });
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
        const records = await storage.getSidakWorkshopRecords(sessionId as string);
        const observers = await storage.getSidakWorkshopObservers(sessionId as string);

        const supervisorName = await resolveNikToName(session.createdBy);
        return res.json({
          session: {
            ...session,
            type: 'Workshop',
            supervisorName,
            photos: session.activityPhotos
          },
          records,
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
      res.json(observer);
    } catch (error: any) {
      console.error("Error adding Sidak Fatigue observer:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Data tidak valid", errors: error.errors });
      }
      res.status(500).json({ message: "Gagal menambahkan observer" });
    }
  });

  // Upload activity photos for Sidak Fatigue session (max 6 photos)
  const sidakFatiguePhotoUpload = multer({
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-fatigue');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
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
        // Clean up uploaded files
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "SIDAK Fatigue session not found" });
      }

      // Get relative paths for storage
      const photoPaths = files.map(file => `/uploads/sidak-fatigue/${path.basename(file.path)}`);

      // Merge with existing photos (max 6 total)
      const existingPhotos = session.activityPhotos || [];
      const combinedPhotos = [...existingPhotos, ...photoPaths];
      const allPhotos = combinedPhotos.slice(0, 6);

      // Delete excess files that exceed the 6-photo limit
      const excessPhotos = combinedPhotos.slice(6);
      excessPhotos.forEach(photoPath => {
        const fileName = path.basename(photoPath);
        const filePath = path.join(process.cwd(), 'uploads', 'sidak-fatigue', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

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
      res.status(500).json({ message: "Gagal menambahkan data karyawan" });
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-roster');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit per file
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
        // Clean up uploaded files
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "SIDAK Roster session not found" });
      }

      // Get relative paths for storage
      const photoPaths = files.map(file => `/uploads/sidak-roster/${path.basename(file.path)}`);

      // Merge with existing photos (max 6 total)
      const existingPhotos = session.activityPhotos || [];
      const combinedPhotos = [...existingPhotos, ...photoPaths];
      const allPhotos = combinedPhotos.slice(0, 6);

      // Delete excess files that exceed the 6-photo limit
      const excessPhotos = combinedPhotos.slice(6);
      excessPhotos.forEach(photoPath => {
        const fileName = path.basename(photoPath);
        const filePath = path.join(process.cwd(), 'uploads', 'sidak-roster', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'announcements');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'announcement-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only .png, .jpg, .jpeg and .gif format allowed!'));
    }
  });

  app.post("/api/announcements/upload-image", announcementImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diupload" });
      }

      const imageUrl = `/uploads/announcements/${path.basename(req.file.path)}`;
      res.json({ url: imageUrl, fileName: path.basename(req.file.path) });
    } catch (error) {
      console.error("Error uploading announcement image:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'doc-' + uniqueSuffix + ext);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
    limits: {
      fileSize: 50 * 1024 * 1024 // Max 50MB
    }
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

  // Get active documents only
  app.get("/api/documents/active", async (req, res) => {
    try {
      const docs = await storage.getActiveDocuments();
      res.json(docs);
    } catch (error) {
      console.error("Error fetching active documents:", error);
      res.status(500).json({ message: "Gagal mengambil data dokumen aktif" });
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'news');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'news-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
      cb(new Error('Only .png, .jpg, .jpeg and .gif format allowed!'));
    }
  });

  app.post("/api/news/upload-image", newsImageUpload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Tidak ada file yang diupload" });
      }

      const imageUrl = `/uploads/news/${path.basename(req.file.path)}`;
      res.json({ url: imageUrl, fileName: path.basename(req.file.path) });
    } catch (error) {
      console.error("Error uploading news image:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        // Keep original extension, add unique prefix
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
      // Allow common document types
      const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf' || file.mimetype.includes('word');

      if (extname) { // Rely mainly on extension as mimetype can vary
        return cb(null, true);
      }
      cb(new Error('Only PDF, Word, and Images are allowed!'));
    }
  });

  app.post("/api/upload", certificateUpload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const fileUrl = `/uploads/documents/${path.basename(req.file.path)}`;
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
  const { parseReportWithGemini, analyzeReportContent, parseMCUWithGemini } = await import("./gemini-parser");

  // WhatsApp Webhook from notif.my.id
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

      // Handle image-only messages
      // Primary: Will be aggregated by WhatsApp timestamp when main message creates report
      // No fallback - let the aggregation logic handle it to avoid wrong-report attachment
      if (isImageOnly && mediaUrl) {
        console.log("🖼️ Image-only message detected, stored as raw message (will be aggregated by WhatsApp timestamp)");
        // Photo will be picked up by aggregation when main message creates report
        // If no main message arrives, photo remains in raw_messages for manual review
      }

      if (shouldProcessWithAI) {
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

        console.log("🤖 Processing message with AI - type:", messageType, "hasMedia:", !!mediaUrl);
        try {
          // Parse with Gemini AI
          const parsed = await parseReportWithGemini(messageContent);
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
          console.log("🔍 Looking for additional photos from same sender (±10s of WhatsApp timestamp)...");
          const recentMediaMessages = await storage.getRecentUnprocessedMediaBySender(senderPhone, msgTimestamp, 10);
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
  const createPhotoUpload = (formName: string) => multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(process.cwd(), 'uploads', `sidak-${formName}`);
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (mimetype && extname) {
        return cb(null, true);
      }
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
      if (!session) {
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "Session not found" });
      }
      const photoPaths = files.map(file => `/uploads/sidak-antrian/${path.basename(file.path)}`);
      const existingPhotos = session.activityPhotos || [];
      const allPhotos = [...existingPhotos, ...photoPaths].slice(0, 6);
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
      if (!session) {
        files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
        return res.status(404).json({ error: "Not found" });
      }
      const photoPaths = files.map(f => `/uploads/sidak-jarak/${path.basename(f.path)}`);
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
        if (!session) {
          files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
          return res.status(404).json({ error: "Not found" });
        }
        const photoPaths = files.map(f => `/uploads/sidak-${name}/${path.basename(f.path)}`);
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
    storage: multer.diskStorage({
      destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'sidak-rambu');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
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

  // Upload activity photos for Sidak Rambu session (max 6 photos)
  app.post("/api/sidak-rambu/:id/upload-photos", sidakRambuPhotoUpload.array('photos', 6), async (req, res) => {
    try {
      const { id } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No photos provided" });
      }

      const session = await storage.getSidakRambuSession(id);
      if (!session) {
        // Clean up uploaded files
        files.forEach(file => { if (fs.existsSync(file.path)) fs.unlinkSync(file.path); });
        return res.status(404).json({ error: "Sidak Rambu session not found" });
      }

      // Get relative paths for storage
      const photoPaths = files.map(file => `/uploads/sidak-rambu/${path.basename(file.path)}`);

      // Merge with existing photos (max 6 total)
      const existingPhotos = session.activityPhotos || [];
      const combinedPhotos = [...existingPhotos, ...photoPaths];
      const allPhotos = combinedPhotos.slice(0, 6);

      // Delete excess files that exceed the 6-photo limit
      const excessPhotos = combinedPhotos.slice(6);
      excessPhotos.forEach(photoPath => {
        const fileName = path.basename(photoPath);
        const filePath = path.join(process.cwd(), 'uploads', 'sidak-rambu', fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      // Update session with photos
      const updatedSession = await storage.updateSidakRambuSession(id, {
        activityPhotos: allPhotos
      });

      res.json({
        message: "Photos uploaded successfully",
        photos: allPhotos,
        session: updatedSession
      });
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
  app.patch("/api/document-masterlist/:id", async (req, res) => {
    try {
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

  app.post("/api/document-masterlist/:id/versions", (req, res, next) => {
    upload.single('document')(req, res, (err) => {
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
      const fileUrl = `/uploads/${req.file.filename}`;

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
  app.get("/api/fms/analytics", async (req, res) => {
    try {
      const { startDate, endDate, startTime, endTime, violationType, shift, validationStatus, week } = req.query;

      const stats = await storage.getFmsAnalytics(
        typeof startDate === 'string' ? startDate : undefined,
        typeof endDate === 'string' ? endDate : undefined,
        {
          startTime: typeof startTime === 'string' ? startTime : undefined,
          endTime: typeof endTime === 'string' ? endTime : undefined,
          violationType: typeof violationType === 'string' ? violationType : undefined,
          shift: typeof shift === 'string' ? shift : undefined,
          validationStatus: typeof validationStatus === 'string' ? validationStatus : undefined,
          week: typeof week === 'string' ? week : undefined,
        }
      );

      res.json(stats);
    } catch (error) {
      console.error("Error fetching FMS analytics:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
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

        const vStatusRaw = String(getValue(['validation_status', 'validate', 'validation_validated', 'Validation', 'Status Validasi', 'Status']) || "Tidak Valid").trim();
        // Normalize to 'Valid' or 'Tidak Valid'
        const vStatus = (vStatusRaw.toLowerCase() === 'valid' || vStatusRaw.toLowerCase() === 'true') ? 'Valid' : 'Tidak Valid';

        if (index === 0) console.log(`[FMS Upload] Row 0 Mapping: Date=${vDate}, Time=${vTime}, Status=${vStatus}`);

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

          validationStatus: vStatus,
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

  app.post("/api/induction/materials", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });

      const fileUrl = `/uploads/${req.file.filename}`; // Assuming local upload for now

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

  // WhatsApp Reminder
  app.post("/api/induction/send-reminder", async (req, res) => {
    try {
      const { scheduleId } = req.body;
      const schedule = await storage.getInductionSchedule(scheduleId);
      if (!schedule) return res.status(404).json({ error: "Schedule not found" });

      const phone = schedule.employee.phone;
      if (!phone) return res.status(400).json({ error: "Employee has no phone number" });

      const message = `Yth. ${schedule.employee.name},\n\nAnda dijadwalkan untuk *Induksi K3* pada tanggal *${new Date(schedule.scheduledDate).toLocaleDateString("id-ID")}*.\n\nSilakan buka aplikasi OneTalent dan selesaikan quiz induksi.\n\nTerima kasih,\nHSE Team`;

      const result = await sendWhatsAppMessage({ phone, message });

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
      const { month, status } = req.query;

      if (!month || typeof month !== 'string') {
        return res.status(400).json({ error: "Month (YYYY-MM) is required" });
      }

      console.log(`[API] Fetching Evaluasi Driver for ${month}, status: ${status}`);

      // 1. Get all active employees
      const allEmployees = await storage.getAllEmployees();
      const activeEmployees = allEmployees.filter(e => e.status === 'active');

      // 2. Get all fatigue sessions for the month
      const allSessions = await storage.getAllSidakFatigueSessions();
      const monthSessions = allSessions.filter(s => s.tanggal.startsWith(month));
      const sessionIds = monthSessions.map(s => s.id);

      // 3. Get all records for these sessions
      let records: SidakFatigueRecord[] = [];
      if (sessionIds.length > 0) {
        records = await storage.getSidakFatigueRecordsBySessionIds(sessionIds);
      }

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

  const httpServer = createServer(app);

  return httpServer;
}


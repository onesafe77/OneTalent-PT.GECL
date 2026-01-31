import './polyfill';
import 'dotenv/config';

import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import Papa from "papaparse";
import { InsertSimperEvMonitoring } from "@shared/schema";

const app = express();

// EMERGENCY DEBUG ROUTE - DELETE TNA
app.post("/api/hse/tna/delete-entry", async (req, res) => {
  try {
    console.log("EMERGENCY ROUTE HIT:", req.body);
    if (!req.body.id) return res.status(400).json({ error: "No ID" });
    await storage.deleteTnaEntry(req.body.id);
    res.json({ success: true, method: "emergency" });
  } catch (e: any) {
    console.error("EMERGENCY ROUTE ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

console.log(`SERVER RESTARTING... UPDATED ROUTES LOADING... [${new Date().toISOString()}]`);


// Enable compression for better performance
app.use(compression({
  level: 6, // Compression level (1-9, 6 is default)
  threshold: 1024, // Only compress if response is larger than this
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));
// Increase body size limit to handle large Excel uploads (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  console.log(`[INCOMING REQUEST] ${req.method} ${req.originalUrl}`);
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

// !!! HOTFIX: Define routes directly here to bypass potential routes.ts issues !!!
app.get('/api/direct-probe', (req, res) => {
  res.json({ working: true, source: 'index.ts' });
});

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const storageConfig = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    console.log('DEBUG (Index): Multer filename', file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const uploadDirect = multer({ storage: storageConfig });
app.use('/uploads', express.static('uploads'));

app.get("/api/simper-ev/settings", async (req, res) => {
  try {
    // Assuming getSystemSetting returns the value string or object.
    // If linter says 'value does not exist on type string', then it returns string.
    const setting = await storage.getSystemSetting("simper_ev_csv_url");
    // Safety check: if it's an object (runtime), use .value, else use it directly
    const url = (typeof setting === 'object' && setting !== null && 'value' in setting)
      ? (setting as any).value
      : setting;
    res.json({ url: url || "" });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/simper-ev/sync", async (req, res) => {
  try {
    let { url } = req.body;
    if (url) {
      await storage.setSystemSetting("simper_ev_csv_url", url, "URL Source for Simper EV Monitoring CSV");
    } else {
      const setting = await storage.getSystemSetting("simper_ev_csv_url");
      const storedUrl = (typeof setting === 'object' && setting !== null && 'value' in setting)
        ? (setting as any).value
        : setting;
      url = storedUrl || null;
    }

    if (!url) return res.status(400).json({ error: "URL CSV tidak ditemukan." });

    console.log(`[SimperEV-Hotfix] Syncing from URL: ${url}`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Gagal mengunduh CSV: ${response.status}`);
    const csvText = await response.text();

    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
    const rows = parsed.data as any[];

    if (!rows || rows.length === 0) return res.status(400).json({ error: "Data CSV kosong" });

    await storage.deleteAllSimperEvMonitoring();
    const batchId = new Date().toISOString();
    let successCount = 0;

    for (const row of rows) {
      const getVal = (key: string) => {
        const foundKey = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey ? row[foundKey] : "";
      };

      const rawNo = getVal('no');
      const noVal = rawNo ? parseInt(String(rawNo)) : 0;

      const rawData: InsertSimperEvMonitoring = {
        unit: getVal('unit') || "",
        no: isNaN(noVal) ? 0 : noVal,
        nama: getVal('nama') || "Unknown",
        nikSimper: getVal('nik simper') || getVal('nik') || "",
        asalMitra: getVal('asal mitra') || "",
        simper: getVal('simper') || "",
        simperOrientasi: getVal('simper orientasi ev') || getVal('simper orientasi') || getVal('orientasi') || "",
        simperPermanen: getVal('simper permanen ev') || getVal('simper permanen') || getVal('permanen') || "",
        unitSkillUp: getVal('unit yg di skill up') || getVal('unit skill up') || "",
        masaBerlakuSertifikatOs: getVal('masa berlaku sertifikat os') || "",
        statusPengajuan: getVal('status pengajuan') || getVal('status') || "Pending",
        importBatchId: batchId,
      };
      await storage.createSimperEvMonitoring(rawData);
      successCount++;
    }
    res.json({ success: true, count: successCount, message: "Sinkronisasi berhasil (Hotfix)" });
  } catch (error) {
    console.error("[SimperEV-Hotfix] Sync Error:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post("/api/employees/:id/photo", uploadDirect.single('photo'), async (req, res) => {
  console.log(`[HOTFIX ROUTE] POST photo for ${req.params.id}`);
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No photo" });

    const photoUrl = `/uploads/${file.filename}`;
    await storage.updateEmployee(id, { photoUrl });
    console.log("Photo updated via HOTFIX:", photoUrl);
    res.json({ photoUrl });
  } catch (error) {
    console.error("Hotfix Upload Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// Upload OS Certificate PDF
app.post("/api/employees/:id/os-certificate", uploadDirect.single('certificate'), async (req, res) => {
  console.log(`[HOTFIX ROUTE] POST OS certificate for ${req.params.id}`);
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const sertifikatOsUrl = `/uploads/${file.filename}`;
    await storage.updateEmployee(id, { sertifikatOsUrl } as any);
    console.log("OS Certificate updated:", sertifikatOsUrl);
    res.json({ sertifikatOsUrl });
  } catch (error) {
    console.error("OS Certificate Upload Error:", error);
    res.status(500).json({ error: String(error) });
  }
});

// WhatsApp Send Reminder API
import { sendWhatsAppMessage, generateSimperReminderMessage, sendAdminNotification, blastWhatsApp } from './services/whatsapp-service';

// ============================================
// WHATSAPP BLAST ROUTES
// ============================================

// Blast WhatsApp - Text Only
app.post("/api/whatsapp/blast/text", async (req, res) => {
  console.log(`[WhatsApp Blast] POST /api/whatsapp/blast/text`);
  try {
    const { subject, message } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    // Get all active employees with valid phone numbers
    const allEmployees = await storage.getAllEmployees();
    const validPhones = allEmployees
      .filter(emp => emp.status === 'active' && emp.phone && emp.phone.trim() !== '')
      .map(emp => emp.phone);

    console.log(`[WhatsApp Blast] Found ${validPhones.length} valid phones out of ${allEmployees.length} employees`);

    if (validPhones.length === 0) {
      return res.status(400).json({ success: false, message: "No valid phone numbers found" });
    }

    const result = await blastWhatsApp({
      phones: validPhones,
      message,
      type: 'text'
    });

    res.json({
      success: true,
      subject,
      ...result
    });
  } catch (error) {
    console.error("[WhatsApp Blast] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// Blast WhatsApp - With Images (multiple)
app.post("/api/whatsapp/blast/image", async (req, res) => {
  console.log(`[WhatsApp Blast] POST /api/whatsapp/blast/image`);
  try {
    const { subject, message, imageUrls } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ success: false, message: "At least one image URL is required" });
    }

    // Get all active employees with valid phone numbers
    const allEmployees = await storage.getAllEmployees();
    const validPhones = allEmployees
      .filter(emp => emp.status === 'active' && emp.phone && emp.phone.trim() !== '')
      .map(emp => emp.phone);

    console.log(`[WhatsApp Blast] Found ${validPhones.length} valid phones, sending ${imageUrls.length} images each`);

    if (validPhones.length === 0) {
      return res.status(400).json({ success: false, message: "No valid phone numbers found" });
    }

    const result = await blastWhatsApp({
      phones: validPhones,
      message,
      type: 'image',
      mediaUrls: imageUrls
    });

    res.json({
      success: true,
      subject,
      imagesCount: imageUrls.length,
      ...result
    });
  } catch (error) {
    console.error("[WhatsApp Blast] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// Blast WhatsApp - With Video
app.post("/api/whatsapp/blast/video", async (req, res) => {
  console.log(`[WhatsApp Blast] POST /api/whatsapp/blast/video`);
  try {
    const { subject, message, videoUrl } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    if (!videoUrl) {
      return res.status(400).json({ success: false, message: "Video URL is required" });
    }

    // Get all active employees with valid phone numbers
    const allEmployees = await storage.getAllEmployees();
    const validPhones = allEmployees
      .filter(emp => emp.status === 'active' && emp.phone && emp.phone.trim() !== '')
      .map(emp => emp.phone);

    console.log(`[WhatsApp Blast] Found ${validPhones.length} valid phones for video blast`);

    if (validPhones.length === 0) {
      return res.status(400).json({ success: false, message: "No valid phone numbers found" });
    }

    const result = await blastWhatsApp({
      phones: validPhones,
      message,
      type: 'video',
      mediaUrls: [videoUrl]
    });

    res.json({
      success: true,
      subject,
      ...result
    });
  } catch (error) {
    console.error("[WhatsApp Blast] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// Test Send - Single number for testing before blast
app.post("/api/whatsapp/test-send", async (req, res) => {
  console.log(`[WhatsApp Test] POST /api/whatsapp/test-send`);
  try {
    const { phone, message, type, imageUrl, videoUrl } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }
    if (!message) {
      return res.status(400).json({ success: false, message: "Message is required" });
    }

    let result;
    const { sendWhatsAppMessage, sendWhatsAppImage, sendWhatsAppVideo } = await import('./services/whatsapp-service');

    if (type === 'image' && imageUrl) {
      result = await sendWhatsAppImage({ phone, message, imageUrl });
    } else if (type === 'video' && videoUrl) {
      result = await sendWhatsAppVideo({ phone, message, videoUrl });
    } else {
      result = await sendWhatsAppMessage({ phone, message });
    }

    if (result.success) {
      console.log(`[WhatsApp Test] Successfully sent to ${phone}`);
      res.json({ success: true, message: "Test message sent successfully", response: result.response });
    } else {
      console.error(`[WhatsApp Test] Failed: ${result.error}`);
      res.status(500).json({ success: false, message: result.error || "Send failed" });
    }
  } catch (error) {
    console.error("[WhatsApp Test] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

app.post("/api/whatsapp/send-reminder", async (req, res) => {
  console.log(`[WhatsApp API] POST /api/whatsapp/send-reminder`);
  try {
    const { phone, name, docType, daysLeft, expiredDate, customMessage } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required" });
    }

    if (!name || !docType) {
      return res.status(400).json({ success: false, message: "Name and docType are required" });
    }

    // Use custom message if provided, otherwise generate default
    let message: string;
    if (customMessage) {
      // Replace placeholders in custom message
      message = customMessage
        .replace(/{nama}/g, name)
        .replace(/{docType}/g, docType)
        .replace(/{daysLeft}/g, String(daysLeft ?? 0))
        .replace(/{expiredDate}/g, expiredDate || "N/A");
    } else {
      message = generateSimperReminderMessage({
        name,
        docType,
        daysLeft: daysLeft ?? 0,
        expiredDate: expiredDate || "N/A"
      });
    }

    // Send WhatsApp
    const result = await sendWhatsAppMessage({ phone, message });

    if (result.success) {
      console.log(`[WhatsApp API] Successfully sent to ${phone}`);
      res.json({ success: true, message: "WhatsApp sent successfully" });
    } else {
      console.error(`[WhatsApp API] Failed: ${result.error}`);
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    console.error("[WhatsApp API] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// GET /api/employees with pagination
app.get("/api/employees", async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const perPage = parseInt(req.query.per_page as string) || 20;
    const search = req.query.search as string || "";

    console.log(`[DEBUG] GET /api/employees page=${page} perPage=${perPage} search="${search}"`);
    const result = await storage.getEmployeesPaginated(page, perPage, search);
    console.log(`[DEBUG] Result: ${result.data.length} items, total=${result.total}`);

    res.json({
      data: result.data,
      total: result.total,
      totalPages: result.totalPages,
      page,
      perPage
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: String(error) });
  }
});

// GET /api/employees/:id
app.get("/api/employees/:id", async (req, res) => {
  try {
    const employee = await storage.getEmployee(req.params.id);
    if (!employee) return res.status(404).json({ error: "Employee not found" });
    res.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: String(error) });
  }
});

// PUT /api/employees/:id with resign validation
app.put("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validation: if resign, tanggal_resign required
    if (updateData.statusKaryawan === "Resign" && !updateData.tanggalResign) {
      return res.status(400).json({ error: "Tanggal resign wajib diisi jika status Resign" });
    }

    const updated = await storage.updateEmployee(id, updateData);
    if (!updated) return res.status(404).json({ error: "Employee not found" });
    res.json(updated);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: String(error) });
  }
});


(async () => {
  const server = await registerRoutes(app);

  // Initialize cron jobs for leave monitoring
  const { initializeCronJobs } = await import('./cronJobs');
  initializeCronJobs();

  // Start Activity Reminder Scheduler
  const { startReminderScheduler } = await import("./services/reminder-scheduler");
  startReminderScheduler();

  // Serve static files from uploads folder (for meeting photos, P5M photos, etc.)
  // Use absolute path to ensure reliability in production
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  // Explicitly serve public folder (for standalone HTML dashboards)
  app.use(express.static('public'));

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Global error handler:", err);

    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  console.log('DEBUG: process.env.PORT is:', process.env.PORT);
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
  }, () => {
    log(`serving on port ${port}`);
  });
})();

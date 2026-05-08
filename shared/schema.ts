import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, unique, jsonb, index, uniqueIndex, real, date, time, uuid, numeric, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Authentication table for employee login
export const authUsers = pgTable("auth_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nik: varchar("nik").notNull().unique().references(() => employees.id),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_auth_users_nik").on(table.nik),
]);

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  position: text("position"),
  nomorLambung: text("nomor_lambung"),
  isSpareOrigin: boolean("is_spare_origin").default(false),
  department: text("department"),
  investorGroup: text("investor_group"),
  phone: text("phone").notNull(),
  qrCode: text("qr_code"), // DO NOT TOUCH - QR Code data
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").default(sql`now()`),

  // New columns - After NIK
  isafeNumber: varchar("isafe_number", { length: 50 }),
  idItws: varchar("id_itws", { length: 50 }),

  // Identitas
  tempatLahir: varchar("tempat_lahir", { length: 100 }),
  dob: date("dob"),
  ktpNo: varchar("ktp_no", { length: 32 }),

  // Kepegawaian
  doh: date("doh"),
  statusKaryawan: varchar("status_karyawan", { length: 30 }),

  // Resign
  tanggalResign: date("tanggal_resign"),
  catatanResign: text("catatan_resign"),

  // SIM & SIMPER
  typeSim: varchar("type_sim", { length: 10 }),
  simNo: varchar("sim_no", { length: 50 }),
  expiredSimpol: date("expired_simpol"),
  expiredSimperBib: date("expired_simper_bib"),
  statusSimperBib: varchar("status_simper_bib", { length: 20 }),
  expiredSimperTia: date("expired_simper_tia"),
  statusSimperTia: varchar("status_simper_tia", { length: 20 }),

  // Alamat
  address: text("address"),
  provinsi: varchar("provinsi", { length: 80 }),
  kotaKab: varchar("kota_kab", { length: 120 }),
  addressGroup: varchar("address_group", { length: 80 }),
  domisiliKaryawan: varchar("domisili_karyawan", { length: 120 }),

  // OS Training
  tglIkutPelatihanOs: date("tgl_ikut_pelatihan_os"),
  merekUnitDigunakanOs: varchar("merek_unit_digunakan_os", { length: 80 }),
  tglRefreshmentOs: date("tgl_refreshment_os"),
  refreshmentOs: varchar("refreshment_os", { length: 30 }),
  keteranganOs: text("keterangan_os"),
  sertifikatOsUrl: text("sertifikat_os_url"),

  // BPJS
  bpjsKesehatan: varchar("bpjs_kesehatan", { length: 50 }),
}, (table) => [
  index("IDX_employees_name").on(table.name),
  index("IDX_employees_status").on(table.status),
  index("IDX_employees_department").on(table.department),
]);

export const employeeFamilyMembers = pgTable("employee_family_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  hubungan: varchar("hubungan", { length: 40 }).notNull(),
  nama: varchar("nama", { length: 200 }).notNull(),
  jenisKelamin: varchar("jenis_kelamin", { length: 20 }),
  tempatLahir: varchar("tempat_lahir", { length: 120 }),
  tanggalLahir: text("tanggal_lahir"),
  kontakDarurat: varchar("kontak_darurat", { length: 30 }),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => [
  index("IDX_family_employee").on(table.employeeId),
]);

export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  date: text("date").notNull(),
  time: text("time").notNull(),
  jamTidur: text("jam_tidur"), // Jam tidur karyawan
  fitToWork: text("fit_to_work"), // Status fit to work
  status: text("status").notNull().default("present"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => [
  index("IDX_attendance_date").on(table.date),
  index("IDX_attendance_employee").on(table.employeeId),
  index("IDX_attendance_employee_date").on(table.employeeId, table.date),
  index("IDX_attendance_status").on(table.status),
]);

export const rosterSchedules = pgTable("roster_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  date: text("date").notNull(),
  shift: text("shift").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  jamTidur: text("jam_tidur"), // Jam tidur dalam angka (contoh: "6", "5")
  fitToWork: text("fit_to_work").notNull().default("Fit To Work"), // Status fit to work
  hariKerja: text("hari_kerja"), // Hari kerja dari Excel upload (contoh: "Senin", "Selasa")
  plannedNomorLambung: text("planned_nomor_lambung"), // Nomor lambung yang dijadwalkan
  actualNomorLambung: text("actual_nomor_lambung"), // Nomor lambung yang benar-benar dipakai (bisa diedit hari itu)
  status: text("status").notNull().default("scheduled"),
}, (table) => [
  index("IDX_roster_date").on(table.date),
  index("IDX_roster_employee").on(table.employeeId),
  index("IDX_roster_employee_date").on(table.employeeId, table.date),
  index("IDX_roster_shift").on(table.shift),
  index("IDX_roster_status").on(table.status),
]);

export const leaveRequests = pgTable("leave_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  leaveType: text("leave_type").notNull(),
  reason: text("reason"),
  attachmentPath: text("attachment_path"), // Path to uploaded PDF file
  actionAttachmentPath: text("action_attachment_path"), // Path to HR action PDF file
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Table untuk tracking saldo cuti karyawan
export const leaveBalances = pgTable("leave_balances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  year: integer("year").notNull(),
  totalDays: integer("total_days").notNull().default(0), // Total hari cuti yang berhak
  usedDays: integer("used_days").notNull().default(0), // Hari cuti yang sudah digunakan
  remainingDays: integer("remaining_days").notNull().default(0), // Sisa hari cuti
  workingDaysCompleted: integer("working_days_completed").notNull().default(0), // Hari kerja yang sudah diselesaikan
  lastWorkDate: text("last_work_date"), // Tanggal kerja terakhir
  lastLeaveDate: text("last_leave_date"), // Tanggal cuti terakhir
  nextLeaveEligible: text("next_leave_eligible"), // Tanggal kapan boleh cuti lagi
  status: text("status").notNull().default("active"), // active, expired
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// Table untuk roster monitoring cuti karyawan
export const leaveRosterMonitoring = pgTable("leave_roster_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nik: varchar("nik").notNull(),
  name: text("name").notNull(),
  nomorLambung: text("nomor_lambung"),
  month: varchar("month").notNull(), // Format: "YYYY-MM" e.g. "2024-08"
  investorGroup: text("investor_group").notNull(),
  lastLeaveDate: text("last_leave_date"), // Tanggal terakhir cuti
  leaveOption: text("leave_option").notNull(), // "70" atau "35" hari kerja
  monitoringDays: integer("monitoring_days").notNull().default(0), // Jumlah hari sejak terakhir cuti
  nextLeaveDate: text("next_leave_date"), // Tanggal cuti berikutnya (otomatis hitung)
  onSite: text("on_site"), // OnSite status: "Ya", "Tidak", atau kosong
  status: text("status").notNull().default("Aktif"), // Aktif, Menunggu Cuti, Sedang Cuti, Selesai Cuti
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  // Unique constraint untuk NIK + Month (bisa ada duplikat NIK untuk bulan berbeda)
  nikMonthUnique: unique().on(table.nik, table.month),
}));

// Table untuk history cuti karyawan  
export const leaveHistory = pgTable("leave_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  leaveRequestId: varchar("leave_request_id").references(() => leaveRequests.id),
  leaveType: text("leave_type").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  balanceBeforeLeave: integer("balance_before_leave").notNull(),
  balanceAfterLeave: integer("balance_after_leave").notNull(),
  status: text("status").notNull(), // taken, cancelled, pending
  remarks: text("remarks"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const qrTokens = pgTable("qr_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  token: text("token").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const leaveReminders = pgTable("leave_reminders", {
  id: varchar("id").primaryKey(),
  leaveRequestId: varchar("leave_request_id").notNull().references(() => leaveRequests.id),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  reminderType: text("reminder_type").notNull(), // '7_days', '3_days', '1_day'
  sentAt: timestamp("sent_at").notNull(),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").default(sql`now()`),
});



// Insert schemas
export const insertEmployeeSchema = createInsertSchema(employees).omit({
  createdAt: true,
}).extend({
  // Preprocess all nullable/optional fields to convert empty strings to null
  // This prevents validation errors when the frontend sends "" for empty date/numeric fields
  position: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  department: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  investorGroup: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  dob: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  doh: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  tanggalResign: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  expiredSimpol: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  expiredSimperBib: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  expiredSimperTia: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  tglIkutPelatihanOs: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  tglRefreshmentOs: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  catatanResign: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  typeSim: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  simNo: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  address: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  provinsi: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  kotaKab: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  addressGroup: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  domisiliKaryawan: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  merekUnitDigunakanOs: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  keteranganOs: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  bpjsKesehatan: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
});

export const insertAttendanceSchema = createInsertSchema(attendanceRecords).omit({
  id: true,
  createdAt: true,
});

export const insertEmployeeFamilyMemberSchema = createInsertSchema(employeeFamilyMembers).omit({
  id: true,
  createdAt: true,
}).extend({
  jenisKelamin: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  tempatLahir: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  tanggalLahir: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
  kontakDarurat: z.preprocess((val) => val === "" ? null : val, z.string().nullable().optional()),
});

export const insertRosterSchema = createInsertSchema(rosterSchedules).omit({
  id: true,
});

export const insertLeaveRequestSchema = createInsertSchema(leaveRequests).omit({
  id: true,
  createdAt: true,
});

export const insertQrTokenSchema = createInsertSchema(qrTokens).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveReminderSchema = createInsertSchema(leaveReminders).omit({
  createdAt: true,
});

export const insertLeaveBalanceSchema = createInsertSchema(leaveBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeaveHistorySchema = createInsertSchema(leaveHistory).omit({
  id: true,
  createdAt: true,
});

export const insertLeaveRosterMonitoringSchema = createInsertSchema(leaveRosterMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type EmployeeFamilyMember = typeof employeeFamilyMembers.$inferSelect;
export type InsertEmployeeFamilyMember = z.infer<typeof insertEmployeeFamilyMemberSchema>;
export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceSchema>;
export type RosterSchedule = typeof rosterSchedules.$inferSelect;
export type InsertRosterSchedule = z.infer<typeof insertRosterSchema>;
export type LeaveRequest = typeof leaveRequests.$inferSelect;
export type InsertLeaveRequest = z.infer<typeof insertLeaveRequestSchema>;
export type QrToken = typeof qrTokens.$inferSelect;
export type InsertQrToken = z.infer<typeof insertQrTokenSchema>;
export type LeaveReminder = typeof leaveReminders.$inferSelect;
export type InsertLeaveReminder = z.infer<typeof insertLeaveReminderSchema>;
export type LeaveBalance = typeof leaveBalances.$inferSelect;
export type InsertLeaveBalance = z.infer<typeof insertLeaveBalanceSchema>;
export type LeaveHistory = typeof leaveHistory.$inferSelect;
export type InsertLeaveHistory = z.infer<typeof insertLeaveHistorySchema>;
export type LeaveRosterMonitoring = typeof leaveRosterMonitoring.$inferSelect;
export type InsertLeaveRosterMonitoring = z.infer<typeof insertLeaveRosterMonitoringSchema>;


// Meeting attendance system
export const meetings = pgTable("meetings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  description: text("description"),
  date: varchar("date").notNull(), // YYYY-MM-DD format
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  location: varchar("location").notNull(),
  organizer: varchar("organizer").notNull(),
  status: varchar("status").notNull().default("scheduled"), // scheduled, ongoing, completed, cancelled
  qrToken: varchar("qr_token").unique(), // Unique token for QR code
  meetingPhotos: text("meeting_photos").array(), // Array of photo paths (max 4)
  materiFiles: text("materi_files").array(),     // Array of materi PDF file URLs
  momFiles: text("mom_files").array(),           // Array of MoM PDF file URLs
  meetingType: varchar("meeting_type").default("internal"), // "internal" | "bib"
  agenda: text("agenda"), // Agenda meeting (for BIB Daftar Hadir)
  pemateri: varchar("pemateri"), // Pemateri / speaker
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const meetingAttendance = pgTable("meeting_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  meetingId: varchar("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id, { onDelete: "cascade" }), // Made nullable for manual entries
  scanTime: varchar("scan_time").notNull(), // HH:MM:SS format  
  scanDate: varchar("scan_date").notNull(), // YYYY-MM-DD format
  deviceInfo: varchar("device_info"), // Browser/device information
  attendanceType: varchar("attendance_type").notNull().default("qr_scan"), // "qr_scan" | "manual_entry"

  // Manual entry fields for investor group
  manualName: varchar("manual_name"), // Nama karyawan for manual entry
  manualNik: varchar("manual_nik"), // NIK for manual entry (optional)
  manualPosition: varchar("manual_position"), // "Investor" | "Korlap" | free-text for BIB
  manualDepartment: varchar("manual_department"), // Selected from investorGroup
  manualSignature: text("manual_signature"), // Base64 PNG signature for BIB meetings

  createdAt: timestamp("created_at").defaultNow(),
});

// SIMPER Employee Monitoring System
export const simperMonitoring = pgTable("simper_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeName: text("employee_name").notNull(),
  nik: varchar("nik").notNull().unique(),
  simperBibExpiredDate: text("simper_bib_expired_date"), // Format: YYYY-MM-DD
  simperTiaExpiredDate: text("simper_tia_expired_date"), // Format: YYYY-MM-DD  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingAttendanceSchema = createInsertSchema(meetingAttendance).omit({
  id: true,
  createdAt: true,
});

// Schema for manual attendance entry (investor group)
export const insertManualAttendanceSchema = insertMeetingAttendanceSchema.extend({
  attendanceType: z.literal("manual_entry"),
  manualName: z.string().min(1, "Nama karyawan required"),
  manualNik: z.string().optional(), // NIK optional for manual entry
  manualPosition: z.string().min(1, "Position required"),
  manualDepartment: z.string().min(1, "Department required"),
  manualSignature: z.string().optional(), // Base64 PNG signature (for BIB meetings)
}).omit({
  employeeId: true, // Not needed for manual entry
  meetingId: true, // Added by backend from route params
});

export const insertSimperMonitoringSchema = createInsertSchema(simperMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type MeetingAttendance = typeof meetingAttendance.$inferSelect;
export type InsertMeetingAttendance = z.infer<typeof insertMeetingAttendanceSchema>;
export type InsertManualAttendance = z.infer<typeof insertManualAttendanceSchema>;
export type SimperMonitoring = typeof simperMonitoring.$inferSelect;
export type InsertSimperMonitoring = z.infer<typeof insertSimperMonitoringSchema>;

// SIMPER EV Monitoring System (New)
export const simperEvMonitoring = pgTable("simper_ev_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  unit: text("unit"),
  no: integer("no"),
  nama: text("nama").notNull(),
  nikSimper: text("nik_simper"),
  asalMitra: text("asal_mitra"),
  simper: text("simper"), // G4, G3, etc.
  simperOrientasi: text("simper_orientasi"), // Sudah/Belum
  simperPermanen: text("simper_permanen"), // Sudah/Belum
  unitSkillUp: text("unit_skill_up"),
  masaBerlakuSertifikatOs: text("masa_berlaku_sertifikat_os"),
  merkUnit: text("merk_unit"),
  typeUnit: text("type_unit"), // EV or Solar
  statusPengajuan: text("status_pengajuan"),
  importBatchId: text("import_batch_id"), // To track uploads
  updatedOf: text("updated_of"), // Timestamp string from CSV or upload time
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SIMPER Mitra Dropdown Options
export const simperMitra = pgTable("simper_mitra", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  phoneNumber: text("phone_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSimperMitraSchema = createInsertSchema(simperMitra).omit({
  id: true,
  createdAt: true,
});

export type SimperMitra = typeof simperMitra.$inferSelect;
export type InsertSimperMitra = z.infer<typeof insertSimperMitraSchema>;

export const insertSimperEvMonitoringSchema = createInsertSchema(simperEvMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SimperEvMonitoring = typeof simperEvMonitoring.$inferSelect;
export type InsertSimperEvMonitoring = z.infer<typeof insertSimperEvMonitoringSchema>;

// Authentication types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;


// ============================================
// SIDAK FATIGUE (Pengecekan Kelelahan)
// ============================================

export const sidakFatigueSessions = pgTable("sidak_fatigue_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  waktu: text("waktu").notNull(), // Unified field
  shift: text("shift").notNull(), // "Shift 1" or "Shift 2"
  waktuMulai: text("waktu_mulai").notNull(), // Format: HH:MM
  waktuSelesai: text("waktu_selesai").notNull(), // Format: HH:MM
  lokasi: text("lokasi").notNull(),
  area: text("area").notNull(),
  departemen: text("departemen").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0), // Auto calculated from records
  createdBy: varchar("created_by"), // NIK of supervisor who created the SIDAK
  activityPhotos: text("activity_photos").array(), // Array of photo paths for activity documentation
  supervisorVideoUrl: text("supervisor_video_url"), // Short video recorded when session is created
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_fatigue_sessions_created_by").on(table.createdBy),
]);

export const sidakFatigueRecords = pgTable("sidak_fatigue_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakFatigueSessions.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id), // Optional, nullable for flexibility
  ordinal: integer("ordinal").notNull(), // Sequence 1..10, enforces max limit via unique constraint
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  jabatan: text("jabatan").notNull(),
  nomorLambung: text("nomor_lambung"),

  // Data pengecekan
  jamTidur: integer("jam_tidur").notNull(), // Jam tidur sebelum bekerja (angka)
  konsumiObat: boolean("konsumsi_obat").notNull().default(false), // true = Ya/âœ“, false = Tidak/âœ—
  masalahPribadi: boolean("masalah_pribadi").notNull().default(false), // true = Ya/âœ“, false = Tidak/âœ—

  // Pemeriksaan (true = Ya/âœ“, false = Tidak/âœ—)
  pemeriksaanRespon: boolean("pemeriksaan_respon").notNull().default(true),
  pemeriksaanKonsentrasi: boolean("pemeriksaan_konsentrasi").notNull().default(true),
  pemeriksaanKesehatan: boolean("pemeriksaan_kesehatan").notNull().default(true),

  // Rekomendasi (true = Ya/âœ“, false = Tidak/âœ—)
  karyawanSiapBekerja: boolean("karyawan_siap_bekerja").notNull().default(true),
  fitUntukBekerja: boolean("fit_untuk_bekerja").notNull().default(true),
  istirahatDanMonitor: boolean("istirahat_dan_monitor").notNull().default(false),
  istirahatLebihdariSatuJam: boolean("istirahat_lebih_dari_satu_jam").notNull().default(false),
  tidakBolehBekerja: boolean("tidak_boleh_bekerja").notNull().default(false),

  // Tanda tangan karyawan
  employeeSignature: text("employee_signature"), // Base64 encoded signature image

  // Tindak Lanjut & Bukti (Intervensi)
  catatanIntervensi: text("catatan_intervensi"),
  buktiIntervensi: text("bukti_intervensi"), // URL foto bukti

  // PVT Data
  pvtMeanRT: integer("pvt_mean_rt"), // Rata-rata waktu reaksi dalam ms

  // Scan recording — short video captured when this driver was scanned during SIDAK
  scanVideoUrl: text("scan_video_url"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_fatigue_records_session").on(table.sessionId),
  index("IDX_fatigue_records_employee").on(table.employeeId),
  uniqueIndex("sidak_fatigue_session_ordinal_unique").on(table.sessionId, table.ordinal),
]);

export const sidakFatigueObservers = pgTable("sidak_fatigue_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakFatigueSessions.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  perusahaan: text("perusahaan").notNull(),
  jabatan: text("jabatan").notNull(),
  signatureDataUrl: text("signature_data_url").notNull(), // Base64 encoded signature image
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_fatigue_observers_session").on(table.sessionId),
]);


// ============================================
// SIDAK ROSTER (Kesesuaian Gilir Kerja)
// ============================================

export const sidakRosterSessions = pgTable("sidak_roster_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  waktu: text("waktu").notNull(), // Format: HH:MM
  shift: text("shift").notNull(), // "Shift 1" or "Shift 2"
  perusahaan: text("perusahaan").notNull(),
  departemen: text("departemen").notNull(),
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0), // Auto calculated from records
  activityPhotos: text("activity_photos").array(), // Array of photo URLs for activity documentation
  createdBy: varchar("created_by"), // NIK of supervisor who created the SIDAK
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_roster_sessions_created_by").on(table.createdBy),
]);

export const sidakRosterRecords = pgTable("sidak_roster_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakRosterSessions.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id), // Optional, nullable for flexibility
  ordinal: integer("ordinal").notNull(), // Sequence 1..15, enforces max limit via unique constraint
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  nomorLambung: text("nomor_lambung"),

  // Kesesuaian roster
  rosterSesuai: boolean("roster_sesuai").notNull(), // true = Ya/âœ“, false = Tidak/âœ—
  keterangan: text("keterangan"), // Optional notes

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_roster_records_session").on(table.sessionId),
  index("IDX_roster_records_employee").on(table.employeeId),
  uniqueIndex("sidak_roster_session_ordinal_unique").on(table.sessionId, table.ordinal),
]);

export const sidakRosterObservers = pgTable("sidak_roster_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakRosterSessions.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  perusahaan: text("perusahaan").notNull(),
  jabatan: text("jabatan").notNull(),
  signatureDataUrl: text("signature_data_url").notNull(), // Base64 encoded signature image
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_roster_observers_session").on(table.sessionId),
]);


// ============================================
// SIDAK SEAT BELT (Pengecekan Sabuk Pengaman)
// ============================================

export const sidakSeatbeltSessions = pgTable("sidak_seatbelt_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  waktu: text("waktu").notNull(), // Format: HH:MM
  shift: text("shift").notNull(), // "Shift 1" or "Shift 2"
  shiftType: text("shift_type").notNull().default("Shift 1"), // Duplicate for safety, matching other tables if needed or just use shift
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0), // Auto calculated
  activityPhotos: text("activity_photos").array(), // Array of photo URLs
  createdBy: varchar("created_by"), // NIK of supervisor
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_seatbelt_sessions_created_by").on(table.createdBy),
]);

export const sidakSeatbeltRecords = pgTable("sidak_seatbelt_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakSeatbeltSessions.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id), // Optional/Nullable as input can be manual
  ordinal: integer("ordinal").notNull(), // Sequence 1..N

  // Identitas
  nama: text("nama").notNull(),
  nik: text("nik"), // Bisa kosong jika tidak ada di database? Sebaiknya required tapi manual input.
  nomorLambung: text("nomor_lambung"),
  perusahaan: text("perusahaan").notNull(),

  // Checklist Pengecekan 
  // (True = Ceklis/Berfungsi/Ya, False = X/Rusak/Tidak)
  seatbeltDriverCondition: boolean("seatbelt_driver_condition").notNull(), // Apakah sabuk pengemudi berfungsi?
  seatbeltPassengerCondition: boolean("seatbelt_passenger_condition").notNull(), // Apakah sabuk penumpang berfungsi?
  seatbeltDriverUsage: boolean("seatbelt_driver_usage").notNull(), // Apakah pengemudi pakai benar?
  seatbeltPassengerUsage: boolean("seatbelt_passenger_usage").notNull(), // Apakah penumpang pakai benar?

  keterangan: text("keterangan"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_seatbelt_records_session").on(table.sessionId),
  uniqueIndex("sidak_seatbelt_session_ordinal_unique").on(table.sessionId, table.ordinal),
]);

export const sidakSeatbeltObservers = pgTable("sidak_seatbelt_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakSeatbeltSessions.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  perusahaan: text("perusahaan").notNull(),
  jabatan: text("jabatan").notNull(),
  signatureDataUrl: text("signature_data_url").notNull(), // Base64 signature
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_seatbelt_observers_session").on(table.sessionId),
]);


// ============================================
// INSERT SCHEMAS & TYPES - SIDAK FATIGUE
// ============================================

export const insertSidakFatigueSessionSchema = createInsertSchema(sidakFatigueSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalSampel: true, // Auto calculated
});

export const insertSidakFatigueRecordSchema = createInsertSchema(sidakFatigueRecords).omit({
  id: true,
  ordinal: true, // Auto-generated sequence
  createdAt: true,
});

export const insertSidakFatigueObserverSchema = createInsertSchema(sidakFatigueObservers).omit({
  id: true,
  createdAt: true,
});

export type SidakFatigueSession = typeof sidakFatigueSessions.$inferSelect;
export type InsertSidakFatigueSession = z.infer<typeof insertSidakFatigueSessionSchema>;
export type SidakFatigueRecord = typeof sidakFatigueRecords.$inferSelect;
export type InsertSidakFatigueRecord = z.infer<typeof insertSidakFatigueRecordSchema>;
export type SidakFatigueObserver = typeof sidakFatigueObservers.$inferSelect;
export type InsertSidakFatigueObserver = z.infer<typeof insertSidakFatigueObserverSchema>;


// ============================================
// INSERT SCHEMAS & TYPES - SIDAK ROSTER
// ============================================

export const insertSidakRosterSessionSchema = createInsertSchema(sidakRosterSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true, // Auto calculated
});

export const insertSidakRosterRecordSchema = createInsertSchema(sidakRosterRecords).omit({
  id: true,
  ordinal: true, // Auto-generated sequence
  createdAt: true,
});

export const insertSidakRosterObserverSchema = createInsertSchema(sidakRosterObservers).omit({
  id: true,
  createdAt: true,
});

export type SidakRosterSession = typeof sidakRosterSessions.$inferSelect;
export type InsertSidakRosterSession = z.infer<typeof insertSidakRosterSessionSchema>;
export type SidakRosterRecord = typeof sidakRosterRecords.$inferSelect;
export type InsertSidakRosterRecord = z.infer<typeof insertSidakRosterRecordSchema>;
export type SidakRosterObserver = typeof sidakRosterObservers.$inferSelect;
export type InsertSidakRosterObserver = z.infer<typeof insertSidakRosterObserverSchema>;


// ============================================
// INSERT SCHEMAS & TYPES - SIDAK SEAT BELT
// ============================================

export const insertSidakSeatbeltSessionSchema = createInsertSchema(sidakSeatbeltSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true,
});

export const insertSidakSeatbeltRecordSchema = createInsertSchema(sidakSeatbeltRecords).omit({
  id: true,
  ordinal: true,
  createdAt: true,
});

export const insertSidakSeatbeltObserverSchema = createInsertSchema(sidakSeatbeltObservers).omit({
  id: true,
  createdAt: true,
});

export type SidakSeatbeltSession = typeof sidakSeatbeltSessions.$inferSelect;
export type InsertSidakSeatbeltSession = z.infer<typeof insertSidakSeatbeltSessionSchema

>;
export type SidakSeatbeltRecord = typeof sidakSeatbeltRecords.$inferSelect;
export type InsertSidakSeatbeltRecord = z.infer<typeof insertSidakSeatbeltRecordSchema>;
export type SidakSeatbeltObserver = typeof sidakSeatbeltObservers.$inferSelect;
export type InsertSidakSeatbeltObserver = z.infer<typeof insertSidakSeatbeltObserverSchema>;




// ============================================
// SIDAK KECEPATAN (Observasi Kecepatan Unit)
// ============================================






// ============================================
// AUTHENTICATION - AUTH USERS
// ============================================

export const insertAuthUserSchema = createInsertSchema(authUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;

// Login validation schema
export const loginSchema = z.object({
  nik: z.string().min(1, "NIK is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Password reset validation schema
export const resetPasswordSchema = z.object({
  oldPassword: z.string().min(1, "Old password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;


// ============================================
// ANNOUNCEMENTS (Pengumuman untuk Driver)
// ============================================

export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrls: text("image_urls").array(), // Array URL gambar lampiran (multiple images)
  createdBy: varchar("created_by").notNull(), // NIK admin yang membuat
  createdByName: text("created_by_name").notNull(), // Nama admin yang membuat
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_announcements_created_at").on(table.createdAt),
  index("IDX_announcements_is_active").on(table.isActive),
]);

export const announcementReads = pgTable("announcement_reads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  announcementId: varchar("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  employeeName: text("employee_name").notNull(), // Nama driver yang membaca
  readAt: timestamp("read_at").defaultNow(),
}, (table) => [
  index("IDX_announcement_reads_announcement").on(table.announcementId),
  index("IDX_announcement_reads_employee").on(table.employeeId),
  uniqueIndex("announcement_reads_unique").on(table.announcementId, table.employeeId),
]);

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export const insertAnnouncementReadSchema = createInsertSchema(announcementReads).omit({
  id: true,
  readAt: true,
});

export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type AnnouncementRead = typeof announcementReads.$inferSelect;
export type InsertAnnouncementRead = z.infer<typeof insertAnnouncementReadSchema>;

// ============================================
// DOCUMENT MANAGEMENT TABLES
// Dokumen perusahaan: Kebijakan KPLH, Prosedur, SPDK, Zero Harm, Critical Control Card, Golden Rule
// ============================================



export const documentCategories = [
  "Kebijakan KPLH",
  "Prosedur - Dept HSE",
  "Prosedur - Dept Opr",
  "Prosedur - Dept Plant",
  "SPDK",
  "Zero Harm",
  "Critical Control Card",
  "Golden Rule",
] as const;

export type DocumentCategory = typeof documentCategories[number];

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  category: text("category").notNull(), // One of documentCategories
  fileName: text("file_name").notNull(), // Original file name
  filePath: text("file_path").notNull(), // Path to stored PDF file
  fileSize: integer("file_size"), // File size in bytes
  uploadedBy: varchar("uploaded_by").notNull(), // NIK admin who uploaded
  uploadedByName: text("uploaded_by_name").notNull(), // Name of admin who uploaded
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_documents_category").on(table.category),
  index("IDX_documents_created_at").on(table.createdAt),
  index("IDX_documents_is_active").on(table.isActive),
]);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

// ============================================
// NEWS (Berita untuk semua karyawan)
// ============================================

export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"), // URL gambar berita (legacy, untuk backward compatibility)
  imageUrls: text("image_urls").array(), // Array URL gambar (multiple images)
  isImportant: boolean("is_important").notNull().default(false), // Berita penting
  createdBy: varchar("created_by").notNull(), // NIK admin yang membuat
  createdByName: text("created_by_name").notNull(), // Nama admin yang membuat
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_news_created_at").on(table.createdAt),
  index("IDX_news_is_active").on(table.isActive),
  index("IDX_news_is_important").on(table.isImportant),
]);

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type News = typeof news.$inferSelect;
export type InsertNews = z.infer<typeof insertNewsSchema>;

// ============================================
// PUSH NOTIFICATIONS
// ============================================

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(), // Public key
  auth: text("auth").notNull(), // Auth secret
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_push_subscriptions_employee").on(table.employeeId),
  index("IDX_push_subscriptions_is_active").on(table.isActive),
  uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
]);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;


// ============================================
// TRAINING NEED ANALYSIS (TNA)
// ============================================

// Master Data Trainings
export const trainings = pgTable("trainings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code"), // Optional code, e.g. "TR-001"
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // e.g., "K3 Umum", "Safety", "Technical"
  isMandatory: boolean("is_mandatory").notNull().default(false), // If true, auto-added to everyone (MVP logic)
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_trainings_name").on(table.name),
  index("IDX_trainings_category").on(table.category),
]);

// TNA Summary (Header per Employee per Period)
export const tnaSummaries = pgTable("tna_summaries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  period: text("period").notNull(), // Format: "YYYY-MM"
  status: text("status").notNull().default("Draft"), // "Draft", "Submitted", "Locked"
  createdBy: varchar("created_by").notNull(), // NIK
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  uniqueIndex("tna_summary_employee_period").on(table.employeeId, table.period),
  index("IDX_tna_summary_period").on(table.period),
]);

// TNA Entries (Matrix Rows)
export const tnaEntries = pgTable("tna_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tnaSummaryId: varchar("tna_summary_id").notNull().references(() => tnaSummaries.id, { onDelete: "cascade" }),
  trainingId: varchar("training_id").notNull().references(() => trainings.id),

  // PLAN
  planStatus: text("plan_status").notNull(), // "M" (Mandatory), "D" (Development)

  // ACTUAL
  actualStatus: text("actual_status"), // "C" (Complied), "NC" (Not Complied), or null (Not Reported)
  actualDate: text("actual_date"), // Format: YYYY-MM-DD
  trainerProvider: text("trainer_provider"), // Optional
  evidenceFile: text("evidence_file"), // Path to file
  notes: text("notes"), // Reason if NC, or general notes

  // CERTIFICATION FIELDS (Added for Competency Monitoring)
  certificateNumber: text("certificate_number"),
  issuer: text("issuer"), // Lembaga Penerbit
  issueDate: text("issue_date"), // YYYY-MM-DD
  expiryDate: text("expiry_date"), // YYYY-MM-DD

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_tna_entries_summary").on(table.tnaSummaryId),
  uniqueIndex("tna_entry_summary_training").on(table.tnaSummaryId, table.trainingId),
  index("IDX_tna_entries_expiry").on(table.expiryDate), // Index for monitoring
]);

// Competency Monitoring Logs (Daily Snapshots)
export const competencyMonitoringLogs = pgTable("competency_monitoring_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tnaEntryId: varchar("tna_entry_id").notNull().references(() => tnaEntries.id, { onDelete: "cascade" }),
  logDate: text("log_date").notNull(), // YYYY-MM-DD (Date of monitoring)
  status: text("status").notNull(), // "Aktif", "Akan Habis", "Expired"
  expiryDaysRemaining: integer("expiry_days_remaining"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_comp_mon_log_date").on(table.logDate),
  index("IDX_comp_mon_log_status").on(table.status),
  uniqueIndex("comp_mon_log_entry_date").on(table.tnaEntryId, table.logDate), // One log per entry per day
]);

// Schemas
export const insertTrainingSchema = createInsertSchema(trainings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTnaSummarySchema = createInsertSchema(tnaSummaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTnaEntrySchema = createInsertSchema(tnaEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompetencyMonitoringLogSchema = createInsertSchema(competencyMonitoringLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type Training = typeof trainings.$inferSelect;
export type InsertTraining = z.infer<typeof insertTrainingSchema>;
export type TnaSummary = typeof tnaSummaries.$inferSelect;
export type InsertTnaSummary = z.infer<typeof insertTnaSummarySchema>;
export type TnaEntry = typeof tnaEntries.$inferSelect;
export type InsertTnaEntry = z.infer<typeof insertTnaEntrySchema>;
export type CompetencyMonitoringLog = typeof competencyMonitoringLogs.$inferSelect;
export type InsertCompetencyMonitoringLog = z.infer<typeof insertCompetencyMonitoringLogSchema>;


// Relations
export const tnaSummariesRelations = relations(tnaSummaries, ({ one, many }) => ({
  employee: one(employees, {
    fields: [tnaSummaries.employeeId],
    references: [employees.id],
  }),
  entries: many(tnaEntries),
}));

export const tnaEntriesRelations = relations(tnaEntries, ({ one }) => ({
  summary: one(tnaSummaries, {
    fields: [tnaEntries.tnaSummaryId],
    references: [tnaSummaries.id],
  }),
  training: one(trainings, {
    fields: [tnaEntries.trainingId],
    references: [trainings.id],
  }),
}));

// ============================================
// SAFETY PATROL REPORTS (WhatsApp Integration)
// ============================================

export const safetyPatrolReports = pgTable("safety_patrol_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  bulan: text("bulan"), // Nama bulan (Januari, Februari, dst) - auto calculated
  week: integer("week"), // Minggu ke-berapa dalam bulan - auto calculated
  waktuPelaksanaan: text("waktu_pelaksanaan"), // Jam pelaksanaan (e.g., "08:00 - 09:00")
  jenisLaporan: text("jenis_laporan").notNull(), // "Daily Briefing", "Temuan", "Pelanggaran", etc.
  kegiatan: text("kegiatan"), // Jenis kegiatan dari template (Wake Up Call, Sidak Roster, dll)
  shift: text("shift"), // "Shift 1", "Shift 2"
  lokasi: text("lokasi"),

  // Pemateri/Pelapor
  pemateri: text("pemateri").array(), // Array of presenter names
  namaPelaksana: text("nama_pelaksana"), // Nama pelaksana kegiatan

  // Temuan dan bukti
  temuan: text("temuan"), // Hasil temuan/observasi
  buktiKegiatan: text("bukti_kegiatan").array(), // Array of photo URLs as evidence

  // Raw message content
  rawMessage: text("raw_message").notNull(),

  // Parsed data (JSON)
  parsedData: jsonb("parsed_data"), // AI-parsed structured data

  // Photos
  photos: text("photos").array(), // Array of photo URLs

  // WhatsApp sender info
  senderPhone: text("sender_phone").notNull(),
  senderName: text("sender_name"),

  // Processing status
  status: text("status").notNull().default("pending"), // "pending", "processed", "failed"
  aiAnalysis: text("ai_analysis"), // AI summary/analysis

  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
}, (table) => [
  index("IDX_safety_patrol_tanggal").on(table.tanggal),
  index("IDX_safety_patrol_jenis").on(table.jenisLaporan),
  index("IDX_safety_patrol_status").on(table.status),
  index("IDX_safety_patrol_sender").on(table.senderPhone),
  index("IDX_safety_patrol_kegiatan").on(table.kegiatan),
  index("IDX_safety_patrol_bulan").on(table.bulan),
]);

export const safetyPatrolAttendance = pgTable("safety_patrol_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reportId: varchar("report_id").notNull().references(() => safetyPatrolReports.id, { onDelete: "cascade" }),
  unitCode: text("unit_code").notNull(), // "RBT", "BMT", "AEK", etc.
  shift: text("shift").notNull(), // "Shift 1", "Shift 2"
  status: text("status").notNull(), // "Hadir", "Tidak Hadir", "-"
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_sp_attendance_report").on(table.reportId),
  index("IDX_sp_attendance_unit").on(table.unitCode),
]);

export const safetyPatrolRawMessages = pgTable("safety_patrol_raw_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: text("message_id"), // WhatsApp message ID
  senderPhone: text("sender_phone").notNull(),
  senderName: text("sender_name"),
  messageType: text("message_type").notNull(), // "text", "image", "document"
  content: text("content"), // Text content
  mediaUrl: text("media_url"), // Media URL if any
  rawPayload: jsonb("raw_payload"), // Full webhook payload
  messageTimestamp: timestamp("message_timestamp"), // WhatsApp message timestamp (from unixTimestamp)
  processed: boolean("processed").notNull().default(false),
  reportId: varchar("report_id").references(() => safetyPatrolReports.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_sp_raw_sender").on(table.senderPhone),
  index("IDX_sp_raw_processed").on(table.processed),
  index("IDX_sp_raw_msg_timestamp").on(table.messageTimestamp),
]);

// ============================================
// SAFETY PATROL TEMPLATES (Knowledge Base)
// ============================================

export const safetyPatrolTemplates = pgTable("safety_patrol_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Nama template (e.g., "Daily Briefing", "Sidak Roster")
  category: text("category").notNull(), // Kategori laporan
  description: text("description"), // Deskripsi template
  exampleMessage: text("example_message").notNull(), // Contoh format pesan WhatsApp
  expectedFields: jsonb("expected_fields"), // JSON: field apa saja yang di-extract
  matchingKeywords: text("matching_keywords").array(), // Keywords untuk matching
  promptContext: text("prompt_context"), // Konteks tambahan untuk prompt Gemini
  isDefault: boolean("is_default").notNull().default(false), // Template bawaan sistem
  isActive: boolean("is_active").notNull().default(true), // Aktif/nonaktif
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_sp_templates_category").on(table.category),
  index("IDX_sp_templates_active").on(table.isActive),
]);

export const insertSafetyPatrolTemplateSchema = createInsertSchema(safetyPatrolTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SafetyPatrolTemplate = typeof safetyPatrolTemplates.$inferSelect;
export type InsertSafetyPatrolTemplate = z.infer<typeof insertSafetyPatrolTemplateSchema>;

export const insertSafetyPatrolReportSchema = createInsertSchema(safetyPatrolReports).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export const insertSafetyPatrolAttendanceSchema = createInsertSchema(safetyPatrolAttendance).omit({
  id: true,
  createdAt: true,
});

export const insertSafetyPatrolRawMessageSchema = createInsertSchema(safetyPatrolRawMessages).omit({
  id: true,
  createdAt: true,
});

export type SafetyPatrolReport = typeof safetyPatrolReports.$inferSelect;
export type InsertSafetyPatrolReport = z.infer<typeof insertSafetyPatrolReportSchema>;
export type SafetyPatrolAttendance = typeof safetyPatrolAttendance.$inferSelect;
export type InsertSafetyPatrolAttendance = z.infer<typeof insertSafetyPatrolAttendanceSchema>;
export type SafetyPatrolRawMessage = typeof safetyPatrolRawMessages.$inferSelect;
export type InsertSafetyPatrolRawMessage = z.infer<typeof insertSafetyPatrolRawMessageSchema>;

// ============================================
// SIDAK RAMBU (Observasi Kepatuhan Rambu)
// ============================================

export const sidakRambuSessions = pgTable("sidak_rambu_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  shift: varchar("shift").notNull(),
  waktuMulai: varchar("waktu_mulai").notNull(),
  waktuSelesai: varchar("waktu_selesai").notNull(),
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0),
  activityPhotos: text("activity_photos").array(), // Array of photo URLs
  createdBy: varchar("created_by"), // NIK of supervisor who created the SIDAK
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_rambu_sessions_created_by").on(table.createdBy),
]);

export const sidakRambuObservations = pgTable("sidak_rambu_observations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakRambuSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  noKendaraan: varchar("no_kendaraan").notNull(),
  perusahaan: text("perusahaan").notNull(),
  rambuStop: boolean("rambu_stop").notNull().default(true),
  rambuGiveWay: boolean("rambu_give_way").notNull().default(true),
  rambuKecepatanMax: boolean("rambu_kecepatan_max").notNull().default(true),
  rambuLaranganMasuk: boolean("rambu_larangan_masuk").notNull().default(true),
  rambuLaranganParkir: boolean("rambu_larangan_parkir").notNull().default(true),
  rambuWajibHelm: boolean("rambu_wajib_helm").notNull().default(true),
  rambuLaranganUTurn: boolean("rambu_larangan_uturn").notNull().default(true),
  keterangan: text("keterangan").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sidakRambuObservers = pgTable("sidak_rambu_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakRambuSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan").notNull(),
  signatureDataUrl: text("signature_data_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSidakRambuSessionSchema = createInsertSchema(sidakRambuSessions).omit({
  id: true,
  createdAt: true,
});

export const insertSidakRambuObservationSchema = createInsertSchema(sidakRambuObservations).omit({
  id: true,
  createdAt: true,
});

export const insertSidakRambuObserverSchema = createInsertSchema(sidakRambuObservers).omit({
  id: true,
  createdAt: true,
});

export type SidakRambuSession = typeof sidakRambuSessions.$inferSelect;
export type InsertSidakRambuSession = z.infer<typeof insertSidakRambuSessionSchema>;
export type SidakRambuObservation = typeof sidakRambuObservations.$inferSelect;
export type InsertSidakRambuObservation = z.infer<typeof insertSidakRambuObservationSchema>;
export type SidakRambuObserver = typeof sidakRambuObservers.$inferSelect;
export type InsertSidakRambuObserver = z.infer<typeof insertSidakRambuObserverSchema>;

// ============================================================================
// SIDAK ANTRIAN (Queue Observation)
// ============================================================================

export const sidakAntrianSessions = pgTable("sidak_antrian_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(), // Standardized to match Rambu/Seatbelt
  waktu: varchar("waktu").notNull(),     // Standardized to match Rambu/Seatbelt
  shift: varchar("shift").notNull(), // "Shift 1" or "Shift 2"
  perusahaan: text("perusahaan").notNull(),
  departemen: text("departemen").notNull(),
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0), // Auto calculated from records
  activityPhotos: text("activity_photos").array(), // Array of photo URLs
  createdBy: varchar("created_by").notNull(), // NIK of supervisor who created the SIDAK
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_antrian_sessions_created_by").on(table.createdBy),
]);

export const sidakAntrianRecords = pgTable("sidak_antrian_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakAntrianSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(), // Row number
  namaNik: text("nama_nik").notNull(), // Combined "Nama - NIK" (e.g., "Gede - C-024050")
  noLambung: varchar("no_lambung"), // Vehicle number (e.g., "RB7-4020")
  handbrakeAktif: boolean("handbrake_aktif").notNull(), // Ya/Tidak
  jarakUnitAman: boolean("jarak_unit_aman").notNull(), // Ya/Tidak
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_antrian_records_session").on(table.sessionId),
]);

export const sidakAntrianObservers = pgTable("sidak_antrian_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakAntrianSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(), // Observer number (1-4)
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"), // Added to fix property access in storage.ts
  jabatan: text("jabatan"), // Job title
  tandaTangan: text("tanda_tangan"), // Signature image URL
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_antrian_observers_session").on(table.sessionId),
]);

// Insert schemas
export const insertSidakAntrianSessionSchema = createInsertSchema(sidakAntrianSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true, // Auto calculated
  createdBy: true, // Handled by backend
});

export const insertSidakAntrianRecordSchema = createInsertSchema(sidakAntrianRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSidakAntrianObserverSchema = createInsertSchema(sidakAntrianObservers).omit({
  id: true,
  createdAt: true,
});

// Types
export type SidakAntrianSession = typeof sidakAntrianSessions.$inferSelect;
export type InsertSidakAntrianSession = z.infer<typeof insertSidakAntrianSessionSchema>;
export type SidakAntrianRecord = typeof sidakAntrianRecords.$inferSelect;
export type InsertSidakAntrianRecord = z.infer<typeof insertSidakAntrianRecordSchema>;
export type SidakAntrianObserver = typeof sidakAntrianObservers.$inferSelect;
export type InsertSidakAntrianObserver = z.infer<typeof insertSidakAntrianObserverSchema>;

// ============================================================================
// SIDAK APD (Alat Pelindung Diri)
// ============================================================================

export const sidakApdSessions = pgTable("sidak_apd_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  waktu: varchar("waktu").notNull(),
  shift: varchar("shift").notNull(),
  perusahaan: text("perusahaan").notNull(),
  departemen: text("departemen").notNull(),
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_apd_sessions_created_by").on(table.createdBy),
]);

export const sidakApdRecords = pgTable("sidak_apd_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakApdSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),

  // Data Personel
  nama: text("nama").notNull(),
  nik: text("nik"),
  jabatan: text("jabatan"),
  perusahaan: text("perusahaan"),
  areaKerja: text("area_kerja"), // Specific area/unit where person is found

  // Checklist APD (True = Lengkap/Pakai, False = Tidak Lengkap/Tidak Pakai)
  helm: boolean("helm").notNull().default(false),
  rompi: boolean("rompi").notNull().default(false),
  sepatu: boolean("sepatu").notNull().default(false),
  kacamata: boolean("kacamata").notNull().default(false),
  sarungTangan: boolean("sarung_tangan").notNull().default(false),
  earplug: boolean("earplug").notNull().default(false),
  masker: boolean("masker").notNull().default(false),

  // Kepatuhan (Compliance)
  apdLengkap: boolean("apd_lengkap").notNull().default(false), // Auto or manual check if all required are present

  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_apd_records_session").on(table.sessionId),
]);

export const sidakApdObservers = pgTable("sidak_apd_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakApdSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  jabatan: text("jabatan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_apd_observers_session").on(table.sessionId),
]);

// Insert schemas
export const insertSidakApdSessionSchema = createInsertSchema(sidakApdSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true,
});

export const insertSidakApdRecordSchema = createInsertSchema(sidakApdRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSidakApdObserverSchema = createInsertSchema(sidakApdObservers).omit({
  id: true,
  createdAt: true,
});

// Types
export type SidakApdSession = typeof sidakApdSessions.$inferSelect;
export type InsertSidakApdSession = z.infer<typeof insertSidakApdSessionSchema>;
export type SidakApdRecord = typeof sidakApdRecords.$inferSelect;
export type InsertSidakApdRecord = z.infer<typeof insertSidakApdRecordSchema>;
export type SidakApdObserver = typeof sidakApdObservers.$inferSelect;
export type InsertSidakApdObserver = z.infer<typeof insertSidakApdObserverSchema>;


// ============================================================================
// SIDAK JARAK AMAN (Safe Distance Observation)
// ============================================================================

export const sidakJarakSessions = pgTable("sidak_jarak_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  jam: varchar("jam").notNull(), // Database column name is 'jam'
  shift: varchar("shift").notNull(),
  lokasi: text("lokasi").notNull(),
  totalSampel: integer("total_sampel").notNull().default(0),
  persenKepatuhan: integer("persen_kepatuhan").notNull().default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  waktu: varchar("waktu"), // Legacy column, now optional
}, (table) => [
  index("IDX_jarak_sessions_created_by").on(table.createdBy),
]);

export const sidakJarakRecords = pgTable("sidak_jarak_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakJarakSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noKendaraan: varchar("no_kendaraan").notNull(),
  tipeUnit: varchar("tipe_unit").notNull(),
  lokasiMuatan: text("lokasi_muatan"),
  lokasiKosongan: text("lokasi_kosongan"),
  nomorLambungUnit: varchar("nomor_lambung_unit"), // Unit yang berdekatan
  jarakAktualKedua: text("jarak_aktual_kedua"), // Jarak aman (m)
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_jarak_records_session").on(table.sessionId),
]);

export const sidakJarakObservers = pgTable("sidak_jarak_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakJarakSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_jarak_observers_session").on(table.sessionId),
]);

// Insert schemas
export const insertSidakJarakSessionSchema = createInsertSchema(sidakJarakSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true,
  persenKepatuhan: true,
});

export const insertSidakJarakRecordSchema = createInsertSchema(sidakJarakRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSidakJarakObserverSchema = createInsertSchema(sidakJarakObservers).omit({
  id: true,
  createdAt: true,
});

// Types
export type SidakJarakSession = typeof sidakJarakSessions.$inferSelect;
export type InsertSidakJarakSession = z.infer<typeof insertSidakJarakSessionSchema>;
export type SidakJarakRecord = typeof sidakJarakRecords.$inferSelect;
export type InsertSidakJarakRecord = z.infer<typeof insertSidakJarakRecordSchema>;
export type SidakJarakObserver = typeof sidakJarakObservers.$inferSelect;
export type InsertSidakJarakObserver = z.infer<typeof insertSidakJarakObserverSchema>;

// ============================================================================
// SIDAK KECEPATAN (Observasi Kecepatan Berkendara)
// ============================================================================

export const sidakKecepatanSessions = pgTable("sidak_kecepatan_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  shift: varchar("shift").notNull(),
  waktu: varchar("waktu").notNull(),
  lokasi: text("lokasi").notNull(),
  subLokasi: text("sub_lokasi"),
  batasKecepatanKph: integer("batas_kecepatan_kph").default(0),
  totalSampel: integer("total_sampel").notNull().default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_kecepatan_sessions_created_by").on(table.createdBy),
]);

export const sidakKecepatanRecords = pgTable("sidak_kecepatan_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakKecepatanSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noKendaraan: varchar("no_kendaraan").notNull(),
  tipeUnit: varchar("tipe_unit").notNull(),
  arahMuatan: boolean("arah_muatan").default(false),
  arahKosongan: boolean("arah_kosongan").default(false),
  kecepatanMph: text("kecepatan_mph"),
  kecepatanKph: text("kecepatan_kph"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_kecepatan_records_session").on(table.sessionId),
]);

export const sidakKecepatanObservers = pgTable("sidak_kecepatan_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakKecepatanSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  nik: text("nik"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_kecepatan_observers_session").on(table.sessionId),
]);

// Insert schemas
export const insertSidakKecepatanSessionSchema = createInsertSchema(sidakKecepatanSessions).omit({
  id: true,
  createdAt: true,
  totalSampel: true,
});

export const insertSidakKecepatanRecordSchema = createInsertSchema(sidakKecepatanRecords).omit({
  id: true,
  createdAt: true,
});

export const insertSidakKecepatanObserverSchema = createInsertSchema(sidakKecepatanObservers).omit({
  id: true,
  createdAt: true,
});

// Types
export type SidakKecepatanSession = typeof sidakKecepatanSessions.$inferSelect;
export type InsertSidakKecepatanSession = z.infer<typeof insertSidakKecepatanSessionSchema>;
export type SidakKecepatanRecord = typeof sidakKecepatanRecords.$inferSelect;
export type InsertSidakKecepatanRecord = z.infer<typeof insertSidakKecepatanRecordSchema>;
export type SidakKecepatanObserver = typeof sidakKecepatanObservers.$inferSelect;
export type InsertSidakKecepatanObserver = z.infer<typeof insertSidakKecepatanObserverSchema>;

// ============================================================================
// SIDAK LOTO (Inspeksi Kepatuhan LOTO)
// ============================================================================

export const sidakLotoSessions = pgTable("sidak_loto_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  shift: varchar("shift").notNull(),
  waktu: varchar("waktu").notNull(),
  lokasi: text("lokasi").notNull(),
  departemen: text("departemen"),
  totalSampel: integer("total_sampel").notNull().default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_loto_sessions_created_by").on(table.createdBy)]);

export const sidakLotoRecords = pgTable("sidak_loto_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakLotoSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),

  // Old fields (kept for backward compatibility) - DEPRECATED
  namaKaryawan: text("nama_karyawan"),
  jenisPekerjaan: text("jenis_pekerjaan"),
  lokasiIsolasi: text("lokasi_isolasi"),
  nomorGembok: varchar("nomor_gembok"),
  jamPasang: varchar("jam_pasang"),
  namaNik: text("nama_nik"), // Old combined field - DEPRECATED
  noLambung: text("no_lambung"), // Old field - DEPRECATED
  tipeUnit: text("tipe_unit"), // Old field - DEPRECATED
  lockApplied: boolean("lock_applied"), // Old field - DEPRECATED
  tagApplied: boolean("tag_applied"), // Old field - DEPRECATED
  hazardIdentified: boolean("hazard_identified"), // Old field - DEPRECATED

  // NEW FIELDS matching official PDF template (BIB – HSE – ES – F – 3.02 – 83)
  nama: text("nama"), // Worker name (separate field)
  nik: text("nik"), // Worker ID (separate field)
  perusahaan: text("perusahaan"), // Company name

  // 5 specific compliance questions from PDF
  q1_gembokTagTerpasang: boolean("q1_gembok_tag_terpasang").default(false), // Q1: Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki?
  q2_dangerTagSesuai: boolean("q2_danger_tag_sesuai").default(false), // Q2: Apakah danger tag sesuai dan memadai?
  q3_gembokSesuai: boolean("q3_gembok_sesuai").default(false), // Q3: Apakah gembok sesuai dan memadai?
  q4_kunciUnik: boolean("q4_kunci_unik").default(false), // Q4: Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?
  q5_haspBenar: boolean("q5_hasp_benar").default(false), // Q5: Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?

  keterangan: text("keterangan"), // Remarks/Notes
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_loto_records_session").on(table.sessionId)]);

export const sidakLotoObservers = pgTable("sidak_loto_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakLotoSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  nik: varchar("nik"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_loto_observers_session").on(table.sessionId)]);

export const insertSidakLotoSessionSchema = createInsertSchema(sidakLotoSessions).omit({ id: true, createdAt: true, totalSampel: true });
export const insertSidakLotoRecordSchema = createInsertSchema(sidakLotoRecords).omit({ id: true, createdAt: true });
export const insertSidakLotoObserverSchema = createInsertSchema(sidakLotoObservers).omit({ id: true, createdAt: true });

export type SidakLotoSession = typeof sidakLotoSessions.$inferSelect;
export type InsertSidakLotoSession = z.infer<typeof insertSidakLotoSessionSchema>;
export type SidakLotoRecord = typeof sidakLotoRecords.$inferSelect;
export type InsertSidakLotoRecord = z.infer<typeof insertSidakLotoRecordSchema>;
export type SidakLotoObserver = typeof sidakLotoObservers.$inferSelect;
export type InsertSidakLotoObserver = z.infer<typeof insertSidakLotoObserverSchema>;

// ============================================================================
// SIDAK DIGITAL (Inspeksi Pengawas Digital)
// ============================================================================

export const sidakDigitalSessions = pgTable("sidak_digital_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: date("tanggal").notNull(), // Date field from PDF
  waktu: varchar("waktu"), // "Waktu sampai" from PDF
  lokasi: text("lokasi").notNull(), // Location
  shift: varchar("shift"), // Shift info (combined with date in PDF)
  departemen: text("departemen"), // Department (optional)
  totalSampel: integer("total_sampel").default(0), // Auto-calculated sample count
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_digital_sessions_created_by").on(table.createdBy)]);

export const sidakDigitalRecords = pgTable("sidak_digital_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakDigitalSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),

  // Worker/Supervisor identification (from PDF)
  nama: text("nama").notNull(),
  nik: text("nik"),
  perusahaan: text("perusahaan"),

  // 7 compliance questions from PDF (BIB – HSE – ES – F – 3.02 – 88)
  q1_lokasiKerja: boolean("q1_lokasi_kerja").default(false), // Apakah pengawas berada di lokasi kerja sesuai tugasnya dan aktif mengawasi?
  q2_sapHazard: boolean("q2_sap_hazard").default(false), // Apakah pengawas telah mengerjakan SAP pelaporan hazard?
  q3_sapInspeksi: boolean("q3_sap_inspeksi").default(false), // Apakah pengawas telah mengerjakan SAP pelaporan inspeksi?
  q4_sapObservasi: boolean("q4_sap_observasi").default(false), // Apakah pengawas telah mengerjakan SAP pelaporan observasi?
  q5_validasiFamous: boolean("q5_validasi_famous").default(false), // Apakah pengawas telah melakukan validasi pada semua temuan yang ada pada Famous?
  q6_identifikasiBahaya: boolean("q6_identifikasi_bahaya").default(false), // Apakah pengawas mampu mengidentifikasi potensi bahaya dan segera mengambil tindakan korektif?
  q7_prosedurKeselamatan: boolean("q7_prosedur_keselamatan").default(false), // Apakah pengawas memastikan pekerja mengikuti prosedur keselamatan dan aturan kerja?

  keterangan: text("keterangan"), // Remarks
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_digital_records_session").on(table.sessionId)]);

export const sidakDigitalObservers = pgTable("sidak_digital_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakDigitalSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  nik: varchar("nik"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_digital_observers_session").on(table.sessionId)]);

export const insertSidakDigitalSessionSchema = createInsertSchema(sidakDigitalSessions).omit({ id: true, createdAt: true, totalSampel: true });
export const insertSidakDigitalRecordSchema = createInsertSchema(sidakDigitalRecords).omit({ id: true, createdAt: true });
export const insertSidakDigitalObserverSchema = createInsertSchema(sidakDigitalObservers).omit({ id: true, createdAt: true });

export type SidakDigitalSession = typeof sidakDigitalSessions.$inferSelect;
export type InsertSidakDigitalSession = z.infer<typeof insertSidakDigitalSessionSchema>;
export type SidakDigitalRecord = typeof sidakDigitalRecords.$inferSelect;
export type InsertSidakDigitalRecord = z.infer<typeof insertSidakDigitalRecordSchema>;
export type SidakDigitalObserver = typeof sidakDigitalObservers.$inferSelect;
export type InsertSidakDigitalObserver = z.infer<typeof insertSidakDigitalObserverSchema>;

// ============================================================================
// SIDAK PENCAHAYAAN (Lighting Inspection)
// ============================================================================

export const sidakPencahayaanSessions = pgTable("sidak_pencahayaan_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  namaPerusahaan: text("nama_perusahaan").notNull(), // Company name
  jenisAlatMerk: text("jenis_alat_merk").notNull(), // Equipment type & brand
  departemen: text("departemen"), // Department
  noSeriAlat: varchar("no_seri_alat"), // Equipment serial number
  lokasiPengukuran: text("lokasi_pengukuran").notNull(), // Measurement location
  tanggalPemeriksaan: date("tanggal_pemeriksaan").notNull(), // Inspection date
  penanggungjawabArea: text("penanggungjawab_area"), // Area supervisor
  waktuPemeriksaan: varchar("waktu_pemeriksaan"), // Inspection time
  totalSampel: integer("total_sampel").default(0), // Auto-calculated sample count
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_pencahayaan_sessions_created_by").on(table.createdBy)]);

export const sidakPencahayaanRecords = pgTable("sidak_pencahayaan_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakPencahayaanSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),

  // Measurement fields (from PDF)
  titikPengambilan: text("titik_pengambilan").notNull(), // Measurement point
  sumberPenerangan: text("sumber_penerangan"), // Light source
  jenisPengukuran: text("jenis_pengukuran"), // Measurement type
  intensitasPencahayaan: numeric("intensitas_pencahayaan"), // Lux value (numeric)
  jarakSumberCahaya: text("jarak_sumber_cahaya"), // Distance from light source
  secaraVisual: varchar("secara_visual"), // Visual assessment: "sangat gelap", "gelap", "cukup", "terang", "sangat terang"
  keterangan: text("keterangan"), // Remarks (explanation of visual assessment)

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_pencahayaan_records_session").on(table.sessionId)]);

export const sidakPencahayaanObservers = pgTable("sidak_pencahayaan_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakPencahayaanSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  nik: text("nik"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_pencahayaan_observers_session").on(table.sessionId)]);

export const insertSidakPencahayaanSessionSchema = createInsertSchema(sidakPencahayaanSessions).omit({ id: true, createdAt: true, totalSampel: true });
export const insertSidakPencahayaanRecordSchema = createInsertSchema(sidakPencahayaanRecords).omit({ id: true, createdAt: true });
export const insertSidakPencahayaanObserverSchema = createInsertSchema(sidakPencahayaanObservers).omit({ id: true, createdAt: true });

export type SidakPencahayaanSession = typeof sidakPencahayaanSessions.$inferSelect;
export type InsertSidakPencahayaanSession = z.infer<typeof insertSidakPencahayaanSessionSchema>;
export type SidakPencahayaanRecord = typeof sidakPencahayaanRecords.$inferSelect;
export type InsertSidakPencahayaanRecord = z.infer<typeof insertSidakPencahayaanRecordSchema>;
export type SidakPencahayaanObserver = typeof sidakPencahayaanObservers.$inferSelect;
export type InsertSidakPencahayaanObserver = z.infer<typeof insertSidakPencahayaanObserverSchema>;

// ============================================================================
// SIDAK WORKSHOP (Checklist Inspeksi Peralatan Workshop)
// BIB – HSE – ES – F – 3.02 – 87
// ============================================================================

export const sidakWorkshopSessions = pgTable("sidak_workshop_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: date("tanggal").notNull(), // Inspection date
  namaWorkshop: text("nama_workshop").notNull(), // Workshop name
  lokasi: text("lokasi").notNull(), // Location
  penanggungJawabArea: text("penanggung_jawab_area"), // Area supervisor
  totalEquipment: integer("total_equipment").default(0), // Auto-calculated equipment count
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_workshop_sessions_created_by").on(table.createdBy)]);

// Equipment inspection records - stores inspection results as JSON
// 10 equipment types: APAR, COMPRESSOR, IMPACT, HYDRAULIC_JACK, GERINDA, HAMMER, ENGINE_WELDING, CUTTING_TORCH, KERANGKENG, GREASE_GUN
export const sidakWorkshopEquipment = pgTable("sidak_workshop_equipment", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakWorkshopSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  equipmentType: varchar("equipment_type").notNull(), // APAR, COMPRESSOR, IMPACT, etc.
  noRegisterPeralatan: varchar("no_register_peralatan"), // Equipment registration number
  inspectionResults: jsonb("inspection_results").notNull().default({}), // JSON object with inspection item results
  tindakLanjutPerbaikan: text("tindak_lanjut_perbaikan"), // Corrective action
  dueDate: date("due_date"), // Due date for corrective action
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_workshop_equipment_session").on(table.sessionId)]);

// Inspectors (different from observers - this form uses "Inspektor")
export const sidakWorkshopInspectors = pgTable("sidak_workshop_inspectors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakWorkshopSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_workshop_inspectors_session").on(table.sessionId)]);

export const insertSidakWorkshopSessionSchema = createInsertSchema(sidakWorkshopSessions).omit({ id: true, createdAt: true, totalEquipment: true });
export const insertSidakWorkshopEquipmentSchema = createInsertSchema(sidakWorkshopEquipment).omit({ id: true, createdAt: true });
export const insertSidakWorkshopInspectorSchema = createInsertSchema(sidakWorkshopInspectors).omit({ id: true, createdAt: true });

export type SidakWorkshopSession = typeof sidakWorkshopSessions.$inferSelect;
export type InsertSidakWorkshopSession = z.infer<typeof insertSidakWorkshopSessionSchema>;
export type SidakWorkshopEquipment = typeof sidakWorkshopEquipment.$inferSelect;
export type InsertSidakWorkshopEquipment = z.infer<typeof insertSidakWorkshopEquipmentSchema>;
export type SidakWorkshopInspector = typeof sidakWorkshopInspectors.$inferSelect;
export type InsertSidakWorkshopInspector = z.infer<typeof insertSidakWorkshopInspectorSchema>;

// ============================================================================
// SIDAK STAND JACK (Checklist Inspeksi Stand Jack)
// PT. GECL – F - HSE - 002 - R0 
// ============================================================================

export const sidakStandJackSessions = pgTable("sidak_stand_jack_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Inspection date
  namaWorkshop: text("nama_workshop").notNull(), // Workshop name
  lokasi: text("lokasi").notNull(), // Location
  shift: varchar("shift", { length: 50 }), // Day Shift/Night Shift
  waktu: varchar("waktu", { length: 20 }), // Time of inspection
  penanggungJawabArea: text("penanggung_jawab_area"), // Area supervisor
  totalStandJack: integer("total_stand_jack").default(0), // Auto-calculated equipment count
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_stand_jack_sessions_created_by").on(table.createdBy)]);

export const sidakStandJackRecords = pgTable("sidak_stand_jack_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakStandJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterPeralatan: varchar("no_register_peralatan"), // Equipment registration number
  inspectionResults: jsonb("inspection_results").notNull().default({}), // JSON object with inspection item results
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}), // Corrective action
  dueDate: date("due_date"), // Due date for corrective action
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_stand_jack_records_session").on(table.sessionId)]);

export const sidakStandJackObservers = pgTable("sidak_stand_jack_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakStandJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_stand_jack_observers_session").on(table.sessionId)]);

export const insertSidakStandJackSessionSchema = createInsertSchema(sidakStandJackSessions).omit({ id: true, createdAt: true, totalStandJack: true });
export const insertSidakStandJackRecordSchema = createInsertSchema(sidakStandJackRecords).omit({ id: true, createdAt: true });
export const insertSidakStandJackObserverSchema = createInsertSchema(sidakStandJackObservers).omit({ id: true, createdAt: true });

export type SidakStandJackSession = typeof sidakStandJackSessions.$inferSelect;
export type InsertSidakStandJackSession = z.infer<typeof insertSidakStandJackSessionSchema>;
export type SidakStandJackRecord = typeof sidakStandJackRecords.$inferSelect;
export type InsertSidakStandJackRecord = z.infer<typeof insertSidakStandJackRecordSchema>;
export type SidakStandJackObserver = typeof sidakStandJackObservers.$inferSelect;
export type InsertSidakStandJackObserver = z.infer<typeof insertSidakStandJackObserverSchema>;

// ============================================================================
// SIDAK HYDRAULIC JACK (Checklist Inspeksi Hydraulic Jack)
// BIB – HSE – ES – F – 3.02 – 87
// ============================================================================

export const sidakHydraulicJackSessions = pgTable("sidak_hydraulic_jack_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaWorkshop: text("nama_workshop").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawabArea: text("penanggung_jawab_area"),
  totalHydraulicJack: integer("total_hydraulic_jack").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_hydraulic_jack_sessions_created_by").on(table.createdBy)]);

export const sidakHydraulicJackRecords = pgTable("sidak_hydraulic_jack_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakHydraulicJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterPeralatan: varchar("no_register_peralatan"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_hydraulic_jack_records_session").on(table.sessionId)]);

export const sidakHydraulicJackObservers = pgTable("sidak_hydraulic_jack_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakHydraulicJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_hydraulic_jack_observers_session").on(table.sessionId)]);

export const insertSidakHydraulicJackSessionSchema = createInsertSchema(sidakHydraulicJackSessions).omit({ id: true, createdAt: true, totalHydraulicJack: true });
export const insertSidakHydraulicJackRecordSchema = createInsertSchema(sidakHydraulicJackRecords).omit({ id: true, createdAt: true });
export const insertSidakHydraulicJackObserverSchema = createInsertSchema(sidakHydraulicJackObservers).omit({ id: true, createdAt: true });

export type SidakHydraulicJackSession = typeof sidakHydraulicJackSessions.$inferSelect;
export type InsertSidakHydraulicJackSession = z.infer<typeof insertSidakHydraulicJackSessionSchema>;
export type SidakHydraulicJackRecord = typeof sidakHydraulicJackRecords.$inferSelect;
export type InsertSidakHydraulicJackRecord = z.infer<typeof insertSidakHydraulicJackRecordSchema>;
export type SidakHydraulicJackObserver = typeof sidakHydraulicJackObservers.$inferSelect;
export type InsertSidakHydraulicJackObserver = z.infer<typeof insertSidakHydraulicJackObserverSchema>;

// ============================================================================
// BIB — HSE — ES — F — 3.02 — 87
// INSPEKSI IMPACT
// ============================================================================

export const sidakImpactSessions = pgTable("sidak_impact_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaWorkshop: text("nama_workshop").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawabArea: text("penanggung_jawab_area"),
  totalImpact: integer("total_impact").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_impact_sessions_created_by").on(table.createdBy)]);

export const sidakImpactRecords = pgTable("sidak_impact_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakImpactSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterPeralatan: varchar("no_register_peralatan"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_impact_records_session").on(table.sessionId)]);

export const sidakImpactObservers = pgTable("sidak_impact_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakImpactSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_impact_observers_session").on(table.sessionId)]);

export const insertSidakImpactSessionSchema = createInsertSchema(sidakImpactSessions).omit({ id: true, createdAt: true, totalImpact: true });
export const insertSidakImpactRecordSchema = createInsertSchema(sidakImpactRecords).omit({ id: true, createdAt: true });
export const insertSidakImpactObserverSchema = createInsertSchema(sidakImpactObservers).omit({ id: true, createdAt: true });

export type SidakImpactSession = typeof sidakImpactSessions.$inferSelect;
export type InsertSidakImpactSession = z.infer<typeof insertSidakImpactSessionSchema>;
export type SidakImpactRecord = typeof sidakImpactRecords.$inferSelect;
export type InsertSidakImpactRecord = z.infer<typeof insertSidakImpactRecordSchema>;
export type SidakImpactObserver = typeof sidakImpactObservers.$inferSelect;
export type InsertSidakImpactObserver = z.infer<typeof insertSidakImpactObserverSchema>;

// ============================================================================
// SIDAK FUEL STORAGE
// ============================================================================

export const sidakFuelStorageSessions = pgTable("sidak_fuel_storage_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaWorkshop: text("nama_workshop").notNull(),
  lokasi: text("lokasi").notNull(),
  subLokasi: text("sub_lokasi"),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawabArea: text("penanggung_jawab_area"),
  totalItems: integer("total_items").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_fuel_storage_sessions_created_by").on(table.createdBy)]);

export const sidakFuelStorageRecords = pgTable("sidak_fuel_storage_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakFuelStorageSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  storageName: text("storage_name"), // e.g., "Main Storage", "Secondary Storage"
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_fuel_storage_records_session").on(table.sessionId)]);

export const sidakFuelStorageObservers = pgTable("sidak_fuel_storage_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakFuelStorageSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  jabatan: text("jabatan"),
  departemen: text("departemen"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_fuel_storage_observers_session").on(table.sessionId)]);

export const insertSidakFuelStorageSessionSchema = createInsertSchema(sidakFuelStorageSessions).omit({ id: true, createdAt: true, totalItems: true });
export const insertSidakFuelStorageRecordSchema = createInsertSchema(sidakFuelStorageRecords).omit({ id: true, createdAt: true });
export const insertSidakFuelStorageObserverSchema = createInsertSchema(sidakFuelStorageObservers).omit({ id: true, createdAt: true });

export type SidakFuelStorageSession = typeof sidakFuelStorageSessions.$inferSelect;
export type InsertSidakFuelStorageSession = z.infer<typeof insertSidakFuelStorageSessionSchema>;
export type SidakFuelStorageRecord = typeof sidakFuelStorageRecords.$inferSelect;
export type InsertSidakFuelStorageRecord = z.infer<typeof insertSidakFuelStorageRecordSchema>;
export type SidakFuelStorageObserver = typeof sidakFuelStorageObservers.$inferSelect;
export type InsertSidakFuelStorageObserver = z.infer<typeof insertSidakFuelStorageObserverSchema>;

// ============================================================================
// BIB — HSE — ES — F — 3.02 — 88
// BOTTLE JACK
// ============================================================================

export const sidakBottleJackSessions = pgTable("sidak_bottle_jack_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaWorkshop: text("nama_workshop").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawabArea: text("penanggung_jawab_area"),
  totalBottleJack: integer("total_bottle_jack").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_bottle_jack_sessions_created_by").on(table.createdBy)]);

export const sidakBottleJackRecords = pgTable("sidak_bottle_jack_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakBottleJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterPeralatan: varchar("no_register_peralatan"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_bottle_jack_records_session").on(table.sessionId)]);

export const sidakBottleJackObservers = pgTable("sidak_bottle_jack_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakBottleJackSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_bottle_jack_observers_session").on(table.sessionId)]);

export const insertSidakBottleJackSessionSchema = createInsertSchema(sidakBottleJackSessions).omit({ id: true, createdAt: true, totalBottleJack: true });
export const insertSidakBottleJackRecordSchema = createInsertSchema(sidakBottleJackRecords).omit({ id: true, createdAt: true });
export const insertSidakBottleJackObserverSchema = createInsertSchema(sidakBottleJackObservers).omit({ id: true, createdAt: true });

export type SidakBottleJackSession = typeof sidakBottleJackSessions.$inferSelect;
export type InsertSidakBottleJackSession = z.infer<typeof insertSidakBottleJackSessionSchema>;
export type SidakBottleJackRecord = typeof sidakBottleJackRecords.$inferSelect;
export type InsertSidakBottleJackRecord = z.infer<typeof insertSidakBottleJackRecordSchema>;
export type SidakBottleJackObserver = typeof sidakBottleJackObservers.$inferSelect;
export type InsertSidakBottleJackObserver = z.infer<typeof insertSidakBottleJackObserverSchema>;

// ============================================================================
// BIB — HSE — ES — F — 3.02 — 87
// INSPEKSI APAR
// ============================================================================

export const sidakAparSessions = pgTable("sidak_apar_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaWorkshop: text("nama_workshop").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawabArea: text("penanggung_jawab_area"),
  totalApar: integer("total_apar").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_apar_sessions_created_by").on(table.createdBy)]);

export const sidakAparRecords = pgTable("sidak_apar_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakAparSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterPeralatan: varchar("no_register_peralatan"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_apar_records_session").on(table.sessionId)]);

export const sidakAparObservers = pgTable("sidak_apar_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakAparSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_apar_observers_session").on(table.sessionId)]);

export const insertSidakAparSessionSchema = createInsertSchema(sidakAparSessions).omit({ id: true, createdAt: true, totalApar: true });
export const insertSidakAparRecordSchema = createInsertSchema(sidakAparRecords).omit({ id: true, createdAt: true });
export const insertSidakAparObserverSchema = createInsertSchema(sidakAparObservers).omit({ id: true, createdAt: true });

export type SidakAparSession = typeof sidakAparSessions.$inferSelect;
export type InsertSidakAparSession = z.infer<typeof insertSidakAparSessionSchema>;
export type SidakAparRecord = typeof sidakAparRecords.$inferSelect;
export type InsertSidakAparRecord = z.infer<typeof insertSidakAparRecordSchema>;
export type SidakAparObserver = typeof sidakAparObservers.$inferSelect;
export type InsertSidakAparObserver = z.infer<typeof insertSidakAparObserverSchema>;

// ============================================================================
// SIDAK INTERCOM PENGAWAS FMS
// PT.GECL – HSE – F – SIDAK – 01
// ============================================================================

export const sidakIntercomSessions = pgTable("sidak_intercom_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: varchar("tanggal").notNull(),
  shift: varchar("shift").notNull(),
  waktu: varchar("waktu").notNull(),
  lokasi: text("lokasi").notNull(),
  personilHse: text("personil_hse"), // Personil HSE yang melakukan sidak
  pengawasFms: text("pengawas_fms"), // Pengawas FMS yang dievaluasi
  pemantau: text("pemantau"), // Observer / Pemantau
  totalSampel: integer("total_sampel").notNull().default(0),
  totalSesuai: integer("total_sesuai").default(0), // Total poin sesuai (rekap)
  persenKepatuhan: integer("persen_kepatuhan").default(0), // % kepatuhan
  catatanTemuan: text("catatan_temuan"), // Catatan Temuan (footer)
  tindakanKorektif: text("tindakan_korektif"), // Tindakan Korektif (footer)
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_intercom_sessions_created_by").on(table.createdBy)]);

export const sidakIntercomRecords = pgTable("sidak_intercom_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakIntercomSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),

  // Identifikasi record (Operator & Unit)
  nama: text("nama").notNull(), // will be Operator Name
  nik: text("nik"),
  nomorLambung: text("nomor_lambung"), // changed from perusahaan

  waktuTemuan: varchar("waktu_temuan"), // Format "HH:mm"
  waktuIntervensi: varchar("waktu_intervensi"), // Format "HH:mm"

  // 5 pertanyaan kesesuaian berdasarkan spesifikasi baru
  q1_slaRespons: boolean("q1_sla_respons").default(false),
  q2_identifikasi: boolean("q2_identifikasi").default(false),
  q3_kualitasKomunikasi: boolean("q3_kualitas_komunikasi").default(false),
  q4_instruksiK3: boolean("q4_instruksi_k3").default(false),
  q5_verifikasiTindakan: boolean("q5_verifikasi_tindakan").default(false),

  waktuResponsMenit: numeric("waktu_respons_menit"), // Waktu respons dalam menit (opsional/tetap dipertahankan)
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_intercom_records_session").on(table.sessionId)]);

export const sidakIntercomObservers = pgTable("sidak_intercom_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakIntercomSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  nik: varchar("nik"),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_intercom_observers_session").on(table.sessionId)]);

export const insertSidakIntercomSessionSchema = createInsertSchema(sidakIntercomSessions).omit({ id: true, createdAt: true, totalSampel: true, totalSesuai: true, persenKepatuhan: true });
export const insertSidakIntercomRecordSchema = createInsertSchema(sidakIntercomRecords).omit({ id: true, createdAt: true });
export const insertSidakIntercomObserverSchema = createInsertSchema(sidakIntercomObservers).omit({ id: true, createdAt: true });

export type SidakIntercomSession = typeof sidakIntercomSessions.$inferSelect;
export type InsertSidakIntercomSession = z.infer<typeof insertSidakIntercomSessionSchema>;
export type SidakIntercomRecord = typeof sidakIntercomRecords.$inferSelect;
export type InsertSidakIntercomRecord = z.infer<typeof insertSidakIntercomRecordSchema>;
export type SidakIntercomObserver = typeof sidakIntercomObservers.$inferSelect;
export type InsertSidakIntercomObserver = z.infer<typeof insertSidakIntercomObserverSchema>;

// ============================================
// MONITORING KOMPETENSI & SERTIFIKASI
// ============================================

export const kompetensiMonitoring = pgTable("kompetensi_sertifikat_monitoring", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id),
  // De-normalized fields for easier querying/export even if employee deleted
  employeeName: text("employee_name"),
  department: text("department"),
  position: text("position"),

  trainingName: text("nama_kompetensi").notNull(),
  trainingCategory: text("kategori").notNull(),

  certificateNumber: text("no_sertifikat"),
  issuer: text("lembaga"),

  issueDate: text("tgl_terbit").notNull(), // YYYY-MM-DD
  validityYears: integer("masa_berlaku_tahun").notNull(), // 1-7
  expiryDate: text("tgl_expired").notNull(), // Calculated, YYYY-MM-DD

  monitoringStatus: text("monitoring_harian_status").default("Aktif"), // Aktif, Warning, Expired

  // NEW FIELDS
  appointmentNumber: text("no_surat_penunjukan"),
  evidencePdfPath: text("bukti_penunjukan_pdf"), // Path to file

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by"), // NIK
}, (table) => [
  index("IDX_kompetensi_expiry").on(table.expiryDate),
  index("IDX_kompetensi_employee").on(table.employeeId),
]);

export const insertKompetensiMonitoringSchema = createInsertSchema(kompetensiMonitoring).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KompetensiMonitoring = typeof kompetensiMonitoring.$inferSelect;
export type InsertKompetensiMonitoring = z.infer<typeof insertKompetensiMonitoringSchema>;

// ============================================
// DOCUMENT CONTROL SYSTEM (HSE K3)
// Full-featured document management with versioning, approval workflows, and distribution
// ============================================

// Document lifecycle statuses
export const documentLifecycleStatuses = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "ESIGN_PENDING",
  "SIGNED",
  "PUBLISHED",
  "ARCHIVED",
  "OBSOLETE"
] as const;
export type DocumentLifecycleStatus = typeof documentLifecycleStatuses[number];

// Document control types
export const documentControlTypes = ["CONTROLLED", "UNCONTROLLED"] as const;
export type DocumentControlType = typeof documentControlTypes[number];

// Document Masterlist - Core document metadata
export const documentMasterlist = pgTable("document_masterlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentCode: varchar("document_code").notNull().unique(), // e.g., "HSE-SOP-001"
  title: text("title").notNull(),
  category: text("category").notNull(), // One of documentCategories
  department: text("department").notNull(),

  // Current version info (denormalized for quick access)
  currentVersion: integer("current_version").notNull().default(1),
  currentRevision: integer("current_revision").notNull().default(0),

  // Ownership
  ownerId: varchar("owner_id").notNull().references(() => employees.id),
  ownerName: text("owner_name").notNull(),

  // Status
  lifecycleStatus: text("lifecycle_status").notNull().default("DRAFT"),
  controlType: text("control_type").notNull().default("CONTROLLED"),

  // Dates
  effectiveDate: text("effective_date"), // YYYY-MM-DD
  nextReviewDate: text("next_review_date"), // YYYY-MM-DD
  expiryDate: text("expiry_date"), // YYYY-MM-DD (if applicable)

  // Approval config
  signRequired: boolean("sign_required").notNull().default(true),

  // Metadata
  description: text("description"),
  keywords: text("keywords").array(),

  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_doc_masterlist_code").on(table.documentCode),
  index("IDX_doc_masterlist_category").on(table.category),
  index("IDX_doc_masterlist_department").on(table.department),
  index("IDX_doc_masterlist_status").on(table.lifecycleStatus),
  index("IDX_doc_masterlist_owner").on(table.ownerId),
]);

// Document Versions - Revision history
export const documentVersions = pgTable("document_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id, { onDelete: "cascade" }),

  versionNumber: integer("version_number").notNull(),
  revisionNumber: integer("revision_number").notNull().default(0),

  // File info
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: text("mime_type").default("application/pdf"),

  // Signed file (if applicable)
  signedFilePath: text("signed_file_path"),
  signedAt: timestamp("signed_at"),

  // Version status
  status: text("status").notNull().default("DRAFT"), // DRAFT, PENDING_APPROVAL, APPROVED, SIGNED, ACTIVE, SUPERSEDED

  // Change tracking
  changesNote: text("changes_note"),

  uploadedBy: varchar("uploaded_by").notNull(),
  uploadedByName: text("uploaded_by_name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_versions_document").on(table.documentId),
  index("IDX_doc_versions_status").on(table.status),
]);

// Approval Workflow Definition
export const documentApprovals = pgTable("document_approvals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id, { onDelete: "cascade" }),
  versionId: varchar("version_id").notNull().references(() => documentVersions.id, { onDelete: "cascade" }),

  // Workflow config
  workflowName: text("workflow_name"),
  totalSteps: integer("total_steps").notNull().default(1),
  currentStep: integer("current_step").notNull().default(1),

  // Overall status
  status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, APPROVED, REJECTED, CANCELLED

  initiatedBy: varchar("initiated_by").notNull(),
  initiatedByName: text("initiated_by_name").notNull(),
  initiatedAt: timestamp("initiated_at").defaultNow(),
  completedAt: timestamp("completed_at"),

  // Result
  finalDecision: text("final_decision"), // APPROVED, REJECTED
  finalNotes: text("final_notes"),
}, (table) => [
  index("IDX_doc_approvals_document").on(table.documentId),
  index("IDX_doc_approvals_status").on(table.status),
]);

// Approval Steps
export const documentApprovalSteps = pgTable("document_approval_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  approvalId: varchar("approval_id").notNull().references(() => documentApprovals.id, { onDelete: "cascade" }),

  stepNumber: integer("step_number").notNull(),
  stepName: text("step_name"),

  // Mode: SERIAL (one by one) or PARALLEL (all at once)
  mode: text("mode").notNull().default("SERIAL"),

  // Quorum: minimum approvals needed (for parallel mode)
  quorumRequired: integer("quorum_required").notNull().default(1),
  quorumAchieved: integer("quorum_achieved").notNull().default(0),

  status: text("status").notNull().default("PENDING"), // PENDING, IN_PROGRESS, COMPLETED, SKIPPED

  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_doc_approval_steps_approval").on(table.approvalId),
]);

// Step Assignees (who needs to approve)
export const documentStepAssignees = pgTable("document_step_assignees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stepId: varchar("step_id").notNull().references(() => documentApprovalSteps.id, { onDelete: "cascade" }),

  // Assignee (from employees)
  assigneeId: varchar("assignee_id").notNull().references(() => employees.id),
  assigneeName: text("assignee_name").notNull(),
  assigneePosition: text("assignee_position"),

  // Action taken
  decision: text("decision"), // APPROVED, REJECTED, null = pending
  comments: text("comments"),
  decidedAt: timestamp("decided_at"),

  // Notification tracking
  notifiedAt: timestamp("notified_at"),
  deadline: timestamp("deadline"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_step_assignees_step").on(table.stepId),
  index("IDX_doc_step_assignees_assignee").on(table.assigneeId),
]);

// Document Distributions (Read & Understood)
export const documentDistributions = pgTable("document_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id, { onDelete: "cascade" }),
  versionId: varchar("version_id").notNull().references(() => documentVersions.id),

  // Recipient
  recipientId: varchar("recipient_id").notNull().references(() => employees.id),
  recipientName: text("recipient_name").notNull(),
  recipientDepartment: text("recipient_department"),

  // Distribution config
  isMandatory: boolean("is_mandatory").notNull().default(true),
  deadline: text("deadline"), // YYYY-MM-DD

  // Read status
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  acknowledgedAt: timestamp("acknowledged_at"), // "I understand" clicked

  // Tracking
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  distributedBy: varchar("distributed_by").notNull(),
  distributedAt: timestamp("distributed_at").defaultNow(),
}, (table) => [
  index("IDX_doc_distributions_document").on(table.documentId),
  index("IDX_doc_distributions_recipient").on(table.recipientId),
  index("IDX_doc_distributions_is_read").on(table.isRead),
]);

// Document Export Logs (Uncontrolled Copy tracking)
export const documentExportLogs = pgTable("document_export_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id),
  versionId: varchar("version_id").notNull().references(() => documentVersions.id),

  action: text("action").notNull(), // DOWNLOAD, PRINT, VIEW

  exportedBy: varchar("exported_by").notNull().references(() => employees.id),
  exportedByName: text("exported_by_name").notNull(),

  watermarkText: text("watermark_text"), // The watermark applied

  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_export_logs_document").on(table.documentId),
  index("IDX_doc_export_logs_exported_by").on(table.exportedBy),
]);

// Document Audit Trail
export const documentAuditLogs = pgTable("document_audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id),

  action: text("action").notNull(), // CREATED, UPDATED, VERSION_UPLOADED, SUBMITTED, APPROVED, REJECTED, SIGNED, PUBLISHED, DISTRIBUTED, ARCHIVED
  details: jsonb("details"), // Additional action details

  performedBy: varchar("performed_by").notNull(),
  performedByName: text("performed_by_name").notNull(),

  ipAddress: text("ip_address"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_doc_audit_logs_document").on(table.documentId),
  index("IDX_doc_audit_logs_created_at").on(table.createdAt),
]);

// eSign Requests (uSign Integration)
export const esignRequests = pgTable("esign_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id, { onDelete: "cascade" }),
  versionId: varchar("version_id").notNull().references(() => documentVersions.id),
  approvalId: varchar("approval_id").references(() => documentApprovals.id),

  // uSign integration
  provider: text("provider").notNull().default("uSign"), // uSign, DocuSign, etc.
  externalRequestId: text("external_request_id"), // ID from uSign
  status: text("status").notNull().default("PENDING"), // PENDING, PROCESSING, SIGNED, FAILED, CANCELLED

  // Signer info
  signerId: varchar("signer_id").notNull().references(() => employees.id),
  signerName: text("signer_name").notNull(),
  signerPosition: text("signer_position"),

  // Tracking
  requestedAt: timestamp("requested_at").defaultNow(),
  signedAt: timestamp("signed_at"),
  signedFilePath: text("signed_file_path"),
  failedReason: text("failed_reason"),

  // Audit
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),

  createdBy: varchar("created_by").notNull(),
}, (table) => [
  index("IDX_esign_requests_document").on(table.documentId),
  index("IDX_esign_requests_status").on(table.status),
  index("IDX_esign_requests_signer").on(table.signerId),
]);

// External Document Register
export const externalDocuments = pgTable("external_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Document info
  documentCode: varchar("document_code").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull(), // e.g., "ISO", "Government", "Client"
  issuedBy: text("issued_by"),

  // Version
  versionNumber: text("version_number"),
  issueDate: text("issue_date"), // YYYY-MM-DD
  nextReviewDate: text("next_review_date"), // YYYY-MM-DD

  // File/Link
  fileType: text("file_type").notNull().default("LINK"), // LINK, FILE
  fileUrl: text("file_url"), // URL or file path
  fileName: text("file_name"),

  // Status
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, OBSOLETE, SUPERSEDED

  // Distribution
  distributionRequired: boolean("distribution_required").notNull().default(false),

  // Owner
  ownerId: varchar("owner_id").references(() => employees.id),
  ownerName: text("owner_name"),
  department: text("department"),

  notes: text("notes"),

  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_external_docs_code").on(table.documentCode),
  index("IDX_external_docs_source").on(table.source),
  index("IDX_external_docs_status").on(table.status),
]);

// Change Requests (for revising published documents)
export const changeRequests = pgTable("change_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => documentMasterlist.id, { onDelete: "cascade" }),

  // Request info
  requestType: text("request_type").notNull().default("REVISION"), // REVISION, CORRECTION, UPDATE
  priority: text("priority").notNull().default("NORMAL"), // LOW, NORMAL, HIGH, URGENT

  // Reason for change
  reason: text("reason").notNull(),
  description: text("description"),

  // Requested changes
  proposedChanges: text("proposed_changes"),
  affectedSections: text("affected_sections"),

  // Status
  status: text("status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED

  // Workflow
  reviewedBy: varchar("reviewed_by").references(() => employees.id),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  reviewComments: text("review_comments"),

  // Completion
  completedAt: timestamp("completed_at"),
  newVersionId: varchar("new_version_id").references(() => documentVersions.id),

  // Tracking
  requestedBy: varchar("requested_by").notNull().references(() => employees.id),
  requestedByName: text("requested_by_name").notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
}, (table) => [
  index("IDX_change_requests_document").on(table.documentId),
  index("IDX_change_requests_status").on(table.status),
  index("IDX_change_requests_requested_by").on(table.requestedBy),
]);

// Disposal Records
export const documentDisposalRecords = pgTable("document_disposal_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentCode: text("document_code"),
  documentTitle: text("document_title"),

  disposedBy: varchar("disposed_by").references(() => employees.id),
  disposedByName: text("disposed_by_name"),
  disposedAt: timestamp("disposed_at").defaultNow(),

  method: text("method").notNull().default("ELECTRONIC_DELETION"),
  reason: text("reason"),
  notes: text("notes"),
});

// ============================================
// INSERT SCHEMAS & TYPES - DOCUMENT CONTROL
// ============================================

export const insertDocumentMasterlistSchema = createInsertSchema(documentMasterlist).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentApprovalSchema = createInsertSchema(documentApprovals).omit({
  id: true,
  initiatedAt: true,
  completedAt: true,
});

export const insertDocumentApprovalStepSchema = createInsertSchema(documentApprovalSteps).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDocumentStepAssigneeSchema = createInsertSchema(documentStepAssignees).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentDistributionSchema = createInsertSchema(documentDistributions).omit({
  id: true,
  distributedAt: true,
});

export const insertDocumentExportLogSchema = createInsertSchema(documentExportLogs).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentAuditLogSchema = createInsertSchema(documentAuditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertChangeRequestSchema = createInsertSchema(changeRequests).omit({
  id: true,
  requestedAt: true,
  completedAt: true,
});

export const insertDocumentDisposalRecordSchema = createInsertSchema(documentDisposalRecords).omit({
  id: true,
  disposedAt: true,
});

// Types
export type DocumentMasterlist = typeof documentMasterlist.$inferSelect;
export type InsertDocumentMasterlist = z.infer<typeof insertDocumentMasterlistSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;

export type DocumentApproval = typeof documentApprovals.$inferSelect;
export type InsertDocumentApproval = z.infer<typeof insertDocumentApprovalSchema>;

export type DocumentApprovalStep = typeof documentApprovalSteps.$inferSelect;
export type InsertDocumentApprovalStep = z.infer<typeof insertDocumentApprovalStepSchema>;

export type DocumentStepAssignee = typeof documentStepAssignees.$inferSelect;
export type InsertDocumentStepAssignee = z.infer<typeof insertDocumentStepAssigneeSchema>;

export type DocumentDistribution = typeof documentDistributions.$inferSelect;
export type InsertDocumentDistribution = z.infer<typeof insertDocumentDistributionSchema>;

export type DocumentExportLog = typeof documentExportLogs.$inferSelect;
export type InsertDocumentExportLog = z.infer<typeof insertDocumentExportLogSchema>;

export type DocumentAuditLog = typeof documentAuditLogs.$inferSelect;
export type InsertDocumentAuditLog = z.infer<typeof insertDocumentAuditLogSchema>;

export type ChangeRequest = typeof changeRequests.$inferSelect;
export type InsertChangeRequest = z.infer<typeof insertChangeRequestSchema>;

export type DocumentDisposalRecord = typeof documentDisposalRecords.$inferSelect;
export type InsertDocumentDisposalRecord = z.infer<typeof insertDocumentDisposalRecordSchema>;

// ============================================
// SI ASEF CHATBOT (Knowledge Base & Chat)
// ============================================

export const siAsefDocuments = pgTable("si_asef_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: text("file_size"),
  folder: text("folder").default('Umum'),
  totalPages: integer("total_pages").default(1),
  totalChunks: integer("total_chunks").default(0),
  isActive: boolean("is_active").default(true),
  uploadedBy: varchar("uploaded_by"), // Optional NIK
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_asef_docs_folder").on(table.folder),
]);

export const siAsefChunks = pgTable("si_asef_chunks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => siAsefDocuments.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
  pageNumber: integer("page_number").default(1),
  startPosition: integer("start_position").default(0),
  endPosition: integer("end_position").default(0),
  embedding: jsonb("embedding"), // Store as JSON array for in-memory processing
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_asef_chunks_doc").on(table.documentId),
]);

export const siAsefChatSessions = pgTable("si_asef_chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  userId: varchar("user_id"), // Optional: Link to authUsers if needed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const siAsefChatMessages = pgTable("si_asef_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => siAsefChatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'model'
  content: text("content").notNull(),
  sources: jsonb("sources"), // JSON array of source references
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_asef_messages_session").on(table.sessionId),
  index("IDX_asef_messages_created").on(table.createdAt),
]);

// Insert Schemas
export const insertSiAsefDocumentSchema = createInsertSchema(siAsefDocuments).omit({ id: true, createdAt: true });
export const insertSiAsefChunkSchema = createInsertSchema(siAsefChunks).omit({ id: true, createdAt: true });
export const insertSiAsefChatSessionSchema = createInsertSchema(siAsefChatSessions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSiAsefChatMessageSchema = createInsertSchema(siAsefChatMessages).omit({ id: true, createdAt: true });

// Types
export type SiAsefDocument = typeof siAsefDocuments.$inferSelect;
export type InsertSiAsefDocument = z.infer<typeof insertSiAsefDocumentSchema>;
export type SiAsefChunk = typeof siAsefChunks.$inferSelect;
export type InsertSiAsefChunk = z.infer<typeof insertSiAsefChunkSchema>;
export type SiAsefChatSession = typeof siAsefChatSessions.$inferSelect;
export type InsertSiAsefChatSession = z.infer<typeof insertSiAsefChatSessionSchema>;
export type SiAsefChatMessage = typeof siAsefChatMessages.$inferSelect;
export type InsertSiAsefChatMessage = z.infer<typeof insertSiAsefChatMessageSchema>;
// ============================================
// FMS FATIGUE ALERTS (Fleet Management System Monitoring)
// For high-volume automated ingestion from Excel/API
// ============================================

export const fmsFatigueAlerts = pgTable("fms_fatigue_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Alert Metadata from FMS
  alertDate: text("alert_date").notNull(), // YYYY-MM-DD
  alertTime: text("alert_time").notNull(), // HH:mm:ss
  vehicleNo: text("vehicle_no").notNull(),
  company: text("company"), // e.g., GECL
  violation: text("violation"), // e.g., Mata Tertutup, Mengantuk
  location: text("location"),

  // Timeframe Info
  oprDate: text("opr_date"), // YYYY-MM-DD
  shift: text("shift"), // Shift 1 / Shift 2
  week: integer("week"),
  month: text("month"), // e.g., Januari

  // Coordinates
  coordinate: text("coordinate"),
  level: integer("level"),

  // Validation Tracking
  validationStatus: text("validation_status").default("Belum Validasi"), // Valid / Tidak Valid
  validatedBy: text("validated_by"), // Supervisor Name from Roster
  validatedAt: timestamp("validated_at"),

  // Speed/Performance
  slaSeconds: integer("sla_seconds"), // Difference between validatedAt and alert datetime

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_fms_fatigue_date").on(table.alertDate),
  index("IDX_fms_fatigue_vehicle").on(table.vehicleNo),
  index("IDX_fms_fatigue_week").on(table.week),
  index("IDX_fms_fatigue_sla").on(table.slaSeconds),
]);

export const insertFmsFatigueAlertSchema = createInsertSchema(fmsFatigueAlerts).omit({ id: true, createdAt: true, updatedAt: true });
export type FmsFatigueAlert = typeof fmsFatigueAlerts.$inferSelect;
export type InsertFmsFatigueAlert = z.infer<typeof insertFmsFatigueAlertSchema>;

// ============================================
// ACTIVITY CALENDAR (Mystic AI)
// ============================================

export const activityEvents = pgTable("activity_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  isAllDay: boolean("is_all_day").default(false),
  reminderMinutes: integer("reminder_minutes").default(15),
  reminderSent: boolean("reminder_sent").default(false),
  participants: text("participants"), // Comma separated names or numbers
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEvents).omit({
  id: true,
  createdAt: true,
});

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;


// ==========================================
// FMS VIOLATION DATA WAREHOUSE (Analyst Dashboard)
// ==========================================
export const fmsViolations = pgTable("fms_violations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  violationDate: date("violation_date").notNull(),
  violationTime: time("violation_time").notNull(),
  violationTimestamp: timestamp("violation_timestamp").notNull(), // Combined for sorting: date + time

  vehicleNo: varchar("vehicle_no", { length: 50 }).notNull(),
  company: varchar("company", { length: 50 }),

  violationType: varchar("violation_type", { length: 100 }).notNull(),
  location: varchar("location", { length: 150 }),
  coordinate: varchar("coordinate", { length: 50 }),

  shift: varchar("shift", { length: 20 }), // 'Shift 1' or 'Shift 2'
  dateOpr: date("date_opr"), // Operational Date
  week: integer("week"),
  month: varchar("month", { length: 20 }),
  level: real("level"), // e.g., Speed value or severity

  validationStatus: varchar("validation_status", { length: 50 }).default('Tidak Valid'), // 'Valid', 'Tidak Valid'

  // Validation Tracking (for KPI Pengawas)
  validatedBy: varchar("validated_by", { length: 150 }), // Supervisor who validated
  validatedAt: timestamp("validated_at"), // When validation happened
  slaSeconds: integer("sla_seconds"), // Seconds between violation and validation

  // Manual overrides for driver identification
  manualDriverName: varchar("manual_driver_name", { length: 150 }),
  manualDriverNik: varchar("manual_driver_nik", { length: 50 }),
  evidenceUrl: text("evidence_url"),

  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => {
  return {
    // Unique constraint for "Smart Upsert" (Prevent duplicates based on event uniqueness)
    uniqueEvent: uniqueIndex("idx_unique_fms_event").on(
      table.violationDate,
      table.violationTime,
      table.vehicleNo,
      table.violationType
    ),
    // Performance indexes for Dashboard
    idxDate: index("idx_fms_date").on(table.violationDate),
    idxShift: index("idx_fms_shift").on(table.shift),
    idxStatus: index("idx_fms_status").on(table.validationStatus),
    idxViolation: index("idx_fms_violation").on(table.violationType),
  };
});

export const insertFmsViolationSchema = createInsertSchema(fmsViolations);
export type InsertFmsViolation = z.infer<typeof insertFmsViolationSchema>;
export type FmsViolation = typeof fmsViolations.$inferSelect;

// Manual driver level assignments (admin sets Level 1-4 per driver)
export const fmsDriverLevels = pgTable("fms_driver_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverName: varchar("driver_name", { length: 150 }).notNull().unique(),
  level: integer("level"), // 1, 2, 3, 4 or null
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 150 }),
});
export type FmsDriverLevel = typeof fmsDriverLevels.$inferSelect;

// Manual level per week per driver (admin sets Level 1-4 per week entry)
export const fmsDriverWeekLevels = pgTable("fms_driver_week_levels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverName: varchar("driver_name", { length: 150 }).notNull(),
  weekKey: varchar("week_key", { length: 20 }).notNull(), // e.g. "2026-W16"
  level: integer("level"), // 1, 2, 3, 4 or null
  updatedAt: timestamp("updated_at").defaultNow(),
}, (t) => ({
  uniq: uniqueIndex("idx_driver_week_level_uniq").on(t.driverName, t.weekKey),
}));
export type FmsDriverWeekLevel = typeof fmsDriverWeekLevels.$inferSelect;

// Investigation files per driver (foto investigasi + laporan PDF)
export const fmsDriverInvestigations = pgTable("fms_driver_investigations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverName: varchar("driver_name", { length: 150 }).notNull().unique(),
  photoUrls: text("photo_urls").array().default([]),  // Array of image paths
  reportUrls: text("report_urls").array().default([]), // Array of PDF paths
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type FmsDriverInvestigation = typeof fmsDriverInvestigations.$inferSelect;

// ============================================
// WHATSAPP BLAST HISTORY & TRACKING
// ============================================

export const whatsappBlasts = pgTable("whatsapp_blasts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  subject: text("subject"), // Internal tracking title
  message: text("message").notNull(),
  blastType: varchar("blast_type", { length: 20 }).notNull(), // 'text' | 'image' | 'video'
  mediaUrls: text("media_urls").array(), // Array of image/video URLs
  totalRecipients: integer("total_recipients").notNull().default(0),
  sentCount: integer("sent_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  createdBy: varchar("created_by"), // NIK of sender
  createdByName: text("created_by_name"), // Name of sender
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
}, (table) => [
  index("IDX_whatsapp_blasts_created_at").on(table.createdAt),
  index("IDX_whatsapp_blasts_status").on(table.status),
]);

export const whatsappBlastRecipients = pgTable("whatsapp_blast_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  blastId: varchar("blast_id").notNull().references(() => whatsappBlasts.id, { onDelete: "cascade" }),
  employeeId: varchar("employee_id").references(() => employees.id),
  employeeName: text("employee_name").notNull(),
  phone: text("phone").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, sent, failed
  error: text("error"), // Error message if failed
  sentAt: timestamp("sent_at"),
}, (table) => [
  index("IDX_blast_recipients_blast").on(table.blastId),
  index("IDX_blast_recipients_status").on(table.status),
  index("IDX_blast_recipients_employee").on(table.employeeId),
]);

export const insertWhatsappBlastSchema = createInsertSchema(whatsappBlasts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertWhatsappBlastRecipientSchema = createInsertSchema(whatsappBlastRecipients).omit({
  id: true,
  sentAt: true,
});

export type WhatsappBlast = typeof whatsappBlasts.$inferSelect;
export type InsertWhatsappBlast = z.infer<typeof insertWhatsappBlastSchema>;
export type WhatsappBlastRecipient = typeof whatsappBlastRecipients.$inferSelect;
export type InsertWhatsappBlastRecipient = z.infer<typeof insertWhatsappBlastRecipientSchema>;

// ============================================
// WHATSAPP MESSAGE TEMPLATES
// ============================================

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  message: text("message").notNull(),
  blastType: varchar("blast_type", { length: 20 }).notNull().default("text"), // text, image, video
  mediaUrls: text("media_urls").array(),
  createdBy: varchar("created_by"),
  createdByName: text("created_by_name"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_whatsapp_templates_active").on(table.isActive),
]);

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;

// ============================================
// INDUCTION (INDUKSI K3) TABLES
// ============================================

// Induction Materials - stores uploaded PPT/PDF materials
export const inductionMaterials = pgTable("induction_materials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: varchar("file_type", { length: 10 }).notNull(), // 'pdf' | 'pptx'
  isActive: boolean("is_active").default(true),
  uploadedBy: varchar("uploaded_by").references(() => employees.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_induction_materials_active").on(table.isActive),
]);

// Induction Questions - stores quiz questions
export const inductionQuestions = pgTable("induction_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  materialId: varchar("material_id").references(() => inductionMaterials.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").notNull(), // Array of { label: 'A', text: '...' }
  correctAnswerIndex: integer("correct_answer_index").notNull(), // 0-3 for A-D
  order: integer("order").notNull().default(1),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_induction_questions_material").on(table.materialId),
  index("IDX_induction_questions_active").on(table.isActive),
]);

// Induction Schedules - auto-generated schedules for drivers returning from leave
export const inductionSchedules = pgTable("induction_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  scheduledDate: date("scheduled_date").notNull(), // H-1 before returning to work
  reason: text("reason").notNull(), // e.g., "Pasca Cuti", "New Employee"
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, completed, expired, failed
  score: integer("score"), // Quiz score (0-100)
  passingScore: integer("passing_score").default(70), // Minimum score to pass
  completedAt: timestamp("completed_at"),
  notifiedAt: timestamp("notified_at"), // WhatsApp reminder sent
  notifiedVia: varchar("notified_via", { length: 20 }), // 'whatsapp'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_induction_schedules_employee").on(table.employeeId),
  index("IDX_induction_schedules_date").on(table.scheduledDate),
  index("IDX_induction_schedules_status").on(table.status),
]);

// Induction Answers - records driver's quiz answers
export const inductionAnswers = pgTable("induction_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull().references(() => inductionSchedules.id, { onDelete: "cascade" }),
  questionId: varchar("question_id").notNull().references(() => inductionQuestions.id),
  selectedAnswerIndex: integer("selected_answer_index").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  answeredAt: timestamp("answered_at").defaultNow(),
}, (table) => [
  index("IDX_induction_answers_schedule").on(table.scheduleId),
  index("IDX_induction_answers_question").on(table.questionId),
]);

// Relations
export const inductionMaterialsRelations = relations(inductionMaterials, ({ many }) => ({
  questions: many(inductionQuestions),
}));

export const inductionQuestionsRelations = relations(inductionQuestions, ({ one }) => ({
  material: one(inductionMaterials, {
    fields: [inductionQuestions.materialId],
    references: [inductionMaterials.id],
  }),
}));

export const inductionSchedulesRelations = relations(inductionSchedules, ({ one, many }) => ({
  employee: one(employees, {
    fields: [inductionSchedules.employeeId],
    references: [employees.id],
  }),
  answers: many(inductionAnswers),
}));

export const inductionAnswersRelations = relations(inductionAnswers, ({ one }) => ({
  schedule: one(inductionSchedules, {
    fields: [inductionAnswers.scheduleId],
    references: [inductionSchedules.id],
  }),
  question: one(inductionQuestions, {
    fields: [inductionAnswers.questionId],
    references: [inductionQuestions.id],
  }),
}));

// Insert Schemas
export const insertInductionMaterialSchema = createInsertSchema(inductionMaterials).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInductionQuestionSchema = createInsertSchema(inductionQuestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInductionScheduleSchema = createInsertSchema(inductionSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInductionAnswerSchema = createInsertSchema(inductionAnswers).omit({
  id: true,
  answeredAt: true,
});

// Types
export type InductionMaterial = typeof inductionMaterials.$inferSelect;
export type InsertInductionMaterial = z.infer<typeof insertInductionMaterialSchema>;
export type InductionQuestion = typeof inductionQuestions.$inferSelect;
export type InsertInductionQuestion = z.infer<typeof insertInductionQuestionSchema>;
export type InductionSchedule = typeof inductionSchedules.$inferSelect;
export type InsertInductionSchedule = z.infer<typeof insertInductionScheduleSchema>;
export type InductionAnswer = typeof inductionAnswers.$inferSelect;
export type InsertInductionAnswer = z.infer<typeof insertInductionAnswerSchema>;

// ============================================
// SYSTEM SETTINGS (Key-Value Configuration)
// ============================================

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_system_settings_key").on(table.key),
]);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// ============================================
// MCU (Medical Check Up) RECORDS
// ============================================

export const mcuRecords = pgTable("mcu_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id),
  no: integer("no"), // Nomor urut manual jika migrasi excel
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  posisi: text("posisi"),
  klinik: text("klinik"),

  // Tanggal MCU
  tanggalBaru: date("tanggal_baru"),
  tanggalBerkala: date("tanggal_berkala"), // Berkala/Perpanjang
  tanggalAkhir: date("tanggal_akhir"), // Tanggal MCU Akhir

  // Kesimpulan MCU
  kesimpulanBerkala: text("kesimpulan_berkala"),
  kesimpulanAkhir: text("kesimpulan_akhir"),

  hasilKesimpulan: text("hasil_kesimpulan"), // FIT, UNFIT, dst
  verifikasiSaran: text("verifikasi_saran"),
  followUp: text("follow_up"),
  fileUrl: text("file_url"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_mcu_records_employee").on(table.employeeId),
  index("IDX_mcu_records_hasil").on(table.hasilKesimpulan),
]);

export const insertMcuRecordSchema = createInsertSchema(mcuRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type McuRecord = typeof mcuRecords.$inferSelect;
export type InsertMcuRecord = z.infer<typeof insertMcuRecordSchema>;

export const simperEvHistory = pgTable("simper_ev_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nikSimper: text("nik_simper").notNull(), // Foreign Key logical (linked to simper_ev_monitoring.nikSimper)
  approver: text("approver"),
  status: text("status"),
  workflowLevel: text("workflow_level"),
  workflowType: text("workflow_type"),
  message: text("message"),
  approvedAt: timestamp("approved_at").defaultNow(),
}, (table) => [
  index("IDX_simper_ev_history_nik").on(table.nikSimper),
]);

export const insertSimperEvHistorySchema = createInsertSchema(simperEvHistory).omit({
  id: true,
  approvedAt: true
});

export type SimperEvHistory = typeof simperEvHistory.$inferSelect;
export type InsertSimperEvHistory = z.infer<typeof insertSimperEvHistorySchema>;

// ====================
// WhatsApp Notification Logs
// ====================
export const whatsappNotificationLogs = pgTable("whatsapp_notification_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Notification Context
  module: text("module").notNull(), // "SIMPER_EV", "INDUCTION", etc.
  referenceId: text("reference_id"), // ID of related record (nikSimper, inductionId, etc.)
  referenceName: text("reference_name"), // Name of person/entity

  // Recipient Info
  recipientPhone: text("recipient_phone").notNull(),
  recipientName: text("recipient_name"),
  recipientType: text("recipient_type").notNull(), // "MITRA", "EMPLOYEE", "ADMIN"

  // Message Details
  messageContent: text("message_content").notNull(),
  messageType: text("message_type").notNull(), // "STATUS_UPDATE", "REMINDER", "APPROVAL", etc.

  // Delivery Status
  status: text("status").notNull().default("PENDING"), // "PENDING", "SENT", "FAILED"
  sentAt: timestamp("sent_at"),
  errorMessage: text("error_message"),
  apiResponse: jsonb("api_response"), // Store full API response for debugging

  // Metadata
  triggeredBy: text("triggered_by"), // NIK of admin who triggered, or "SYSTEM"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_wa_notif_log_module").on(table.module),
  index("IDX_wa_notif_log_reference").on(table.referenceId),
  index("IDX_wa_notif_log_phone").on(table.recipientPhone),
  index("IDX_wa_notif_log_created").on(table.createdAt),
]);

export const insertWhatsappNotificationLogSchema = createInsertSchema(whatsappNotificationLogs).omit({
  id: true,
  createdAt: true,
});

export type WhatsappNotificationLog = typeof whatsappNotificationLogs.$inferSelect;
export type InsertWhatsappNotificationLog = z.infer<typeof insertWhatsappNotificationLogSchema>;

// ============================================
// SICK LEAVES (Ijin Sakit via WhatsApp)
// ============================================

export const sickLeaves = pgTable("sick_leaves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").references(() => employees.id), // Nullable if name match fails
  name: text("name").notNull(),
  nik: text("nik"),
  position: text("position"),
  date: text("date").notNull(), // Format: YYYY-MM-DD
  reason: text("reason"),
  status: text("status").notNull().default("Pending"), // Pending, Approved, Rejected

  // Attachments
  attachmentUrl: text("attachment_url"), // URL/Path to file
  attachmentType: text("attachment_type"), // image/jpeg, application/pdf

  // AI Parsing Metadata
  aiConfidence: integer("ai_confidence"),
  originalMessage: text("original_message"),
  aiAnalysis: jsonb("ai_analysis"), // Full debug output from AI

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_sick_leaves_date").on(table.date),
  index("IDX_sick_leaves_employee").on(table.employeeId),
  index("IDX_sick_leaves_status").on(table.status),
  index("IDX_sick_leaves_nik").on(table.nik),
]);

export const insertSickLeaveSchema = createInsertSchema(sickLeaves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SickLeave = typeof sickLeaves.$inferSelect;
export type InsertSickLeave = z.infer<typeof insertSickLeaveSchema>;
// ============================================
// UPLOADED FILES STORAGE
// ============================================

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  data: text("data").notNull(), // Base64 encoded file data
  mimeType: varchar("mime_type").notNull(),
  filename: varchar("filename").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  createdAt: true,
});

export type UploadedFile = typeof uploadedFiles.$inferSelect;
export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;

// ============================================
// MONITORING PERPANJANGAN SIMPER
// Fitur monitoring perpanjangan SIMPER untuk karyawan
// Mirip dengan Pengajuan SIMPER EV tetapi tanpa URL CSV
// ============================================

export const simperPerpanjangan = pgTable("simper_perpanjangan", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),

  // Data Karyawan
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  nomorLambung: text("nomor_lambung"),
  jabatan: text("jabatan"),
  departemen: text("departemen"),
  perusahaan: text("perusahaan"),
  noHp: text("no_hp"),

  // Data SIMPER
  jenisSimper: text("jenis_simper").notNull(), // "BIB", "TIA", "BOTH"

  // Tanggal expired SIMPER
  expiredSimperBib: text("expired_simper_bib"), // Format: YYYY-MM-DD
  expiredSimperTia: text("expired_simper_tia"), // Format: YYYY-MM-DD

  // Status Perpanjangan
  statusPerpanjangan: text("status_perpanjangan").notNull().default("Belum Diproses"),
  // Status: "Belum Diproses", "Dalam Proses", "Menunggu Approval", "Approved", "Rejected", "Selesai"

  // Tahapan Workflow
  tahapanWorkflow: text("tahapan_workflow"),
  // Contoh: "Pengajuan Admin", "Verifikasi HSE", "Approval Manager", "Selesai"

  // Catatan
  catatan: text("catatan"),

  // Dokumen pendukung
  dokumenUrl: text("dokumen_url"), // URL/path to supporting documents

  // Tracking
  diajukanOleh: text("diajukan_oleh"), // NIK admin yang mengajukan
  diajukanPada: timestamp("diajukan_pada"),

  // Public Tracking Token
  trackingToken: varchar("tracking_token").unique(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_simper_perpanjangan_nik").on(table.nik),
  index("IDX_simper_perpanjangan_status").on(table.statusPerpanjangan),
  index("IDX_simper_perpanjangan_jenis").on(table.jenisSimper),
  index("IDX_simper_perpanjangan_token").on(table.trackingToken),
]);

// History perpanjangan SIMPER
export const simperPerpanjanganHistory = pgTable("simper_perpanjangan_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  simperPerpanjanganId: varchar("simper_perpanjangan_id").notNull().references(() => simperPerpanjangan.id, { onDelete: "cascade" }),

  // Status change
  statusSebelum: text("status_sebelum"),
  statusSesudah: text("status_sesudah").notNull(),

  // Approver info
  approver: text("approver"),
  approverNik: text("approver_nik"),

  // Tahapan
  tahapan: text("tahapan"),

  // Catatan
  catatan: text("catatan"),

  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_simper_perp_history_perpanjangan").on(table.simperPerpanjanganId),
]);

export const insertSimperPerpanjanganSchema = createInsertSchema(simperPerpanjangan).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSimperPerpanjanganHistorySchema = createInsertSchema(simperPerpanjanganHistory).omit({
  id: true,
  createdAt: true,
});

export const publicInductionAttendance = pgTable("public_induction_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nik: varchar("nik", { length: 50 }).notNull(),
  namaKaryawan: varchar("nama_karyawan", { length: 255 }).notNull(),
  jabatan: varchar("jabatan", { length: 100 }).notNull(),
  nomorTelepon: varchar("nomor_telepon", { length: 20 }),
  pemateri: varchar("pemateri", { length: 255 }).notNull(),
  tandaTangan: text("tanda_tangan").notNull(), // Base64 data URL
  fotoSelfie: text("foto_selfie"), // URL ke /api/uploads/{id} (foto kamera depan saat induksi)
  tanggalRefreshInduksi: varchar("tanggal_refresh_induksi", { length: 20 }).notNull(), // YYYY-MM-DD
  waktu: varchar("waktu", { length: 20 }), // HH:mm:ss
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPublicInductionAttendanceSchema = createInsertSchema(publicInductionAttendance).omit({
  id: true,
  createdAt: true,
});

export type PublicInductionAttendance = typeof publicInductionAttendance.$inferSelect;
export type InsertPublicInductionAttendance = z.infer<typeof insertPublicInductionAttendanceSchema>;

export type SimperPerpanjangan = typeof simperPerpanjangan.$inferSelect;
export type InsertSimperPerpanjangan = z.infer<typeof insertSimperPerpanjanganSchema>;
export type SimperPerpanjanganHistory = typeof simperPerpanjanganHistory.$inferSelect;
export type InsertSimperPerpanjanganHistory = z.infer<typeof insertSimperPerpanjanganHistorySchema>;

// ============================================
// SIDAK P3K (Inspeksi Kotak P3K)
// ============================================

export const sidakP3kSessions = pgTable("sidak_p3k_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  waktu: text("waktu").notNull(), // Format: HH:MM
  lokasi: text("lokasi").notNull(),
  inspectorName: text("inspector_name").notNull(),
  inspectorSignature: text("inspector_signature"), // Base64
  areaResponsibleName: text("area_responsible_name"),
  areaResponsibleSignature: text("area_responsible_signature"), // Base64
  activityPhotos: text("activity_photos").array(), // Array of photo URLs
  notes: text("notes"), // Catatan tambahan
  createdAt: timestamp("created_at").defaultNow(),
});

export const sidakP3kItems = pgTable("sidak_p3k_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakP3kSessions.id, { onDelete: "cascade" }),
  itemName: text("item_name").notNull(),
  minQty: integer("min_qty").notNull().default(0),
  isAvailable: boolean("is_available").notNull().default(false),
  notes: text("notes"),
  ordinal: integer("ordinal").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_p3k_items_session").on(table.sessionId),
]);

export const insertSidakP3kSessionSchema = createInsertSchema(sidakP3kSessions).omit({
  id: true,
  createdAt: true,
});

export const insertSidakP3kItemSchema = createInsertSchema(sidakP3kItems).omit({
  id: true,
  createdAt: true,
});

export type SidakP3kSession = typeof sidakP3kSessions.$inferSelect;
export type InsertSidakP3kSession = z.infer<typeof insertSidakP3kSessionSchema>;
export type SidakP3kItem = typeof sidakP3kItems.$inferSelect;
export type InsertSidakP3kItem = z.infer<typeof insertSidakP3kItemSchema>;

// ============================================
// SIDAK TINGKAH LAKU DRIVER (Driver Behavior)
// ============================================

export const sidakBehaviorSessions = pgTable("sidak_behavior_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(), // Format: YYYY-MM-DD
  waktu: text("waktu").notNull(),
  shift: text("shift").notNull(), // "Shift 1" or "Shift 2"
  lokasi: text("lokasi").notNull(),
  metodeSidak: text("metode_sidak").notNull(), // "Acak", "Alarm FMS", ">4 Jam Kerja", "Permintaan Pengawas"
  totalSampel: integer("total_sampel").notNull().default(0),
  createdBy: varchar("created_by"), // NIK of supervisor
  activityPhotos: text("activity_photos").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_behavior_sessions_created_by").on(table.createdBy),
]);

export const sidakBehaviorRecords = pgTable("sidak_behavior_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakBehaviorSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  namaDriver: text("nama_driver").notNull(),
  nomorLambung: text("nomor_lambung").notNull(),

  // Behavior Parameters
  mataTertutup: boolean("mata_tertutup").notNull().default(false),
  seringMengedip: boolean("sering_mengedip").notNull().default(false),
  menguapBerulang: boolean("menguap_berulang").notNull().default(false),
  kepalaMengangguk: boolean("kepala_mengangguk").notNull().default(false),
  posturMembungkuk: boolean("postur_membungkuk").notNull().default(false),
  keluarJalur: boolean("keluar_jalur").notNull().default(false),
  reaksiRadioLambat: boolean("reaksi_radio_lambat").notNull().default(false),
  tidakMeresponRadio: boolean("tidak_merespon_radio").notNull().default(false),
  alarmFatigueFmsAktif: boolean("alarm_fatigue_fms_aktif").notNull().default(false),
  mengemudiTidakStabil: boolean("mengemudi_tidak_stabil").notNull().default(false),

  // Actions
  edukasiTwoWay: boolean("edukasi_two_way").notNull().default(false),
  monitoringUlang: boolean("monitoring_ulang").notNull().default(false),
  instruksiBerhenti: boolean("instruksi_berhenti").notNull().default(false),
  stretchingMinum: boolean("stretching_minum").notNull().default(false),
  parkirAman: boolean("parkir_aman").notNull().default(false),
  gantiDriver: boolean("ganti_driver").notNull().default(false),
  mandatoryRest: boolean("mandatory_rest").notNull().default(false),
  koordinasiPengawas: boolean("koordinasi_pengawas").notNull().default(false),

  driverSignature: text("driver_signature"), // Base64 signature
  evidenceUrl: text("evidence_url"), // Path to the uploaded evidence photo
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_behavior_records_session").on(table.sessionId),
  uniqueIndex("sidak_behavior_session_ordinal_unique").on(table.sessionId, table.ordinal),
]);

export const sidakBehaviorObservers = pgTable("sidak_behavior_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakBehaviorSessions.id, { onDelete: "cascade" }),
  nama: text("nama").notNull(),
  nik: text("nik").notNull(),
  perusahaan: text("perusahaan").notNull(),
  jabatan: text("jabatan").notNull(),
  signatureDataUrl: text("signature_data_url").notNull(), // Base64 signature
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_behavior_observers_session").on(table.sessionId),
]);

export const insertSidakBehaviorSessionSchema = createInsertSchema(sidakBehaviorSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalSampel: true
});
export const insertSidakBehaviorRecordSchema = createInsertSchema(sidakBehaviorRecords).omit({
  id: true,
  createdAt: true,
  ordinal: true,
  sessionId: true
});
export const insertSidakBehaviorObserverSchema = createInsertSchema(sidakBehaviorObservers).omit({
  id: true,
  createdAt: true,
  sessionId: true
});

export type SidakBehaviorSession = typeof sidakBehaviorSessions.$inferSelect;
export type InsertSidakBehaviorSession = z.infer<typeof insertSidakBehaviorSessionSchema>;
export type SidakBehaviorRecord = typeof sidakBehaviorRecords.$inferSelect;
export type InsertSidakBehaviorRecord = z.infer<typeof insertSidakBehaviorRecordSchema>;
export type SidakBehaviorObserver = typeof sidakBehaviorObservers.$inferSelect;
export type InsertSidakBehaviorObserver = z.infer<typeof insertSidakBehaviorObserverSchema>;

// ============================================
// USIGN DIGITAL SIGNATURE SYSTEM
// ============================================

export const usignDocumentStatuses = ["pending", "in_progress", "completed", "rejected", "void"] as const;
export type UsignDocumentStatus = typeof usignDocumentStatuses[number];

export const usignActionTypes = ["signature", "initial", "stamp"] as const;
export type UsignActionType = typeof usignActionTypes[number];

export const usignStepStatuses = ["pending", "current", "completed", "rejected"] as const;
export type UsignStepStatus = typeof usignStepStatuses[number];

export const usignDocuments = pgTable("usign_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  subject: text("subject"),
  fileUrl: text("file_url").notNull(),
  ownerId: varchar("owner_id").notNull().references(() => employees.id),
  status: text("status").notNull().default("pending"),
  ccEmails: text("cc_emails").array(), // List of NIKs or emails to cc
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_usign_doc_owner").on(table.ownerId),
  index("IDX_usign_doc_status").on(table.status),
]);

export const usignApprovalSteps = pgTable("usign_approval_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => usignDocuments.id, { onDelete: "cascade" }),
  approverId: varchar("approver_id").notNull().references(() => employees.id),
  stepOrder: integer("step_order").notNull(),
  actionType: text("action_type").notNull().default("signature"), // signature, initial, stamp
  status: text("status").notNull().default("pending"), // pending, current, completed, rejected

  // Coordinate for signature placement
  pageNumber: integer("page_number").notNull().default(1),
  posX: real("pos_x").notNull().default(0),
  posY: real("pos_y").notNull().default(0),
  width: real("width").notNull().default(100),
  height: real("height").notNull().default(50),

  remarks: text("remarks"),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_usign_step_doc").on(table.documentId),
  index("IDX_usign_step_approver").on(table.approverId),
]);

export const usignSignatures = pgTable("usign_signatures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stepId: varchar("step_id").notNull().references(() => usignApprovalSteps.id, { onDelete: "cascade" }),
  signatureImageUrl: text("signature_image_url").notNull(),
  signedAt: timestamp("signed_at").defaultNow(),
});

export const usignNotifications = pgTable("usign_notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull().references(() => usignDocuments.id, { onDelete: "cascade" }),
  recipientId: varchar("recipient_id").notNull().references(() => employees.id),
  type: text("type").notNull(), // email, whatsapp
  status: text("status").notNull().default("sent"),
  sentAt: timestamp("sent_at").defaultNow(),
});

// Zod Schemas
export const insertUsignDocumentSchema = createInsertSchema(usignDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUsignApprovalStepSchema = createInsertSchema(usignApprovalSteps).omit({ id: true, createdAt: true, respondedAt: true });
export const insertUsignSignatureSchema = createInsertSchema(usignSignatures).omit({ id: true, signedAt: true });
export const insertUsignNotificationSchema = createInsertSchema(usignNotifications).omit({ id: true, sentAt: true });

// Types
export type UsignDocument = typeof usignDocuments.$inferSelect;
export type InsertUsignDocument = z.infer<typeof insertUsignDocumentSchema>;
export type UsignApprovalStep = typeof usignApprovalSteps.$inferSelect;
export type InsertUsignApprovalStep = z.infer<typeof insertUsignApprovalStepSchema>;
export type UsignSignature = typeof usignSignatures.$inferSelect;
export type InsertUsignSignature = z.infer<typeof insertUsignSignatureSchema>;
export type UsignNotification = typeof usignNotifications.$inferSelect;
export type InsertUsignNotification = z.infer<typeof insertUsignNotificationSchema>;

// ============================================================================
// SIDAK MESIN LAS
// ============================================================================

export const sidakMesinLasSessions = pgTable("sidak_mesin_las_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaObjekInspeksi: text("nama_objek_inspeksi").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawab: text("penanggung_jawab"),
  totalMesinLas: integer("total_mesin_las").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_las_sessions_created_by").on(table.createdBy)]);

export const sidakMesinLasRecords = pgTable("sidak_mesin_las_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakMesinLasSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  noRegisterMesinLas: varchar("no_register_mesin_las"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_las_records_session").on(table.sessionId)]);

export const sidakMesinLasObservers = pgTable("sidak_mesin_las_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakMesinLasSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_las_observers_session").on(table.sessionId)]);

export const insertSidakMesinLasSessionSchema = createInsertSchema(sidakMesinLasSessions).omit({ id: true, createdAt: true, totalMesinLas: true });
export const insertSidakMesinLasRecordSchema = createInsertSchema(sidakMesinLasRecords).omit({ id: true, createdAt: true });
export const insertSidakMesinLasObserverSchema = createInsertSchema(sidakMesinLasObservers).omit({ id: true, createdAt: true });

export type SidakMesinLasSession = typeof sidakMesinLasSessions.$inferSelect;
export type InsertSidakMesinLasSession = z.infer<typeof insertSidakMesinLasSessionSchema>;
export type SidakMesinLasRecord = typeof sidakMesinLasRecords.$inferSelect;
export type InsertSidakMesinLasRecord = z.infer<typeof insertSidakMesinLasRecordSchema>;
export type SidakMesinLasObserver = typeof sidakMesinLasObservers.$inferSelect;
export type InsertSidakMesinLasObserver = z.infer<typeof insertSidakMesinLasObserverSchema>;

// ============================================================================
// SIDAK MESIN KOMPRESOR
// ============================================================================

export const sidakMesinKompresorSessions = pgTable("sidak_mesin_kompresor_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaObjekInspeksi: text("nama_objek_inspeksi").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawab: text("penanggung_jawab"),
  totalItems: integer("total_items").default(0),
  activityPhotos: text("activity_photos").array(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_kompresor_sessions_created_by").on(table.createdBy)]);

export const sidakMesinKompresorRecords = pgTable("sidak_mesin_kompresor_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakMesinKompresorSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  namaObjek: text("nama_objek"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_kompresor_records_session").on(table.sessionId)]);

export const sidakMesinKompresorObservers = pgTable("sidak_mesin_kompresor_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakMesinKompresorSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_mesin_kompresor_observers_session").on(table.sessionId)]);

export const insertSidakMesinKompresorSessionSchema = createInsertSchema(sidakMesinKompresorSessions).omit({ id: true, createdAt: true, totalItems: true });
export const insertSidakMesinKompresorRecordSchema = createInsertSchema(sidakMesinKompresorRecords).omit({ id: true, createdAt: true });
export const insertSidakMesinKompresorObserverSchema = createInsertSchema(sidakMesinKompresorObservers).omit({ id: true, createdAt: true });

export type SidakMesinKompresorSession = typeof sidakMesinKompresorSessions.$inferSelect;
export type InsertSidakMesinKompresorSession = z.infer<typeof insertSidakMesinKompresorSessionSchema>;
export type SidakMesinKompresorRecord = typeof sidakMesinKompresorRecords.$inferSelect;
export type InsertSidakMesinKompresorRecord = z.infer<typeof insertSidakMesinKompresorRecordSchema>;
export type SidakMesinKompresorObserver = typeof sidakMesinKompresorObservers.$inferSelect;
export type InsertSidakMesinKompresorObserver = z.infer<typeof insertSidakMesinKompresorObserverSchema>;

// ============================================
// SPIP PERALATAN
// ============================================

export const spipPeralatan = pgTable("spip_peralatan", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  no: integer("no"),
  jenisSpip: text("jenis_spip").notNull().default("PERALATAN"),
  jenisUnit: text("jenis_unit").notNull(),
  merk: text("merk").notNull(),
  type: text("type").notNull(),
  noLambung: text("no_lambung").notNull().unique(),
  noPolisi: text("no_polisi"),
  noRangka: text("no_rangka"),
  noMesin: text("no_mesin"),
  tahunPembuatan: integer("tahun_pembuatan"),
  gandar: integer("gandar").default(4),
  volumeVessel: real("volume_vessel"),
  tare: real("tare"),
  aebs: text("aebs"),

  tglPengajuanBib: timestamp("tgl_pengajuan_bib"),
  expiredBib: timestamp("expired_bib"),
  statusBib: text("status_bib"),

  expiredTia: timestamp("expired_tia"),
  statusTia: text("status_tia"),

  noTma: text("no_tma"),
  statusTma: text("status_tma"),

  statusUnit: text("status_unit").notNull().default("ACTIVE"),
  owner: text("owner"),
  namaPic: text("nama_pic"),
  nikKtp: text("nik_ktp"),
  kepemilikan: text("kepemilikan"),
  noKontak: text("no_kontak"),
  komisioner: text("komisioner"),
  keterangan: text("keterangan"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpipPeralatanSchema = createInsertSchema(spipPeralatan).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SpipPeralatan = typeof spipPeralatan.$inferSelect;
export type InsertSpipPeralatan = z.infer<typeof insertSpipPeralatanSchema>;

export const spipPrasarana = pgTable("spip_prasarana", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  no: integer("no"),
  jenisSpip: text("jenis_spip").notNull().default("PRASARANA"),

  // Identitas Fasilitas
  jenisUnit: text("jenis_unit").notNull(),
  koordinat: text("koordinat"),
  koordinatLat: real("koordinat_lat"),
  koordinatLng: real("koordinat_lng"),
  merk: text("merk"),
  type: text("type"),
  noLambung: text("no_lambung").notNull().unique(),
  kapasitas: text("kapasitas"),
  areaLokasi: text("area_lokasi"),
  tahunPembuatan: integer("tahun_pembuatan"),
  komisioner: text("komisioner"),

  // Sertifikasi & Pengujian
  noSertifikat: text("no_sertifikat"),
  tglSertifikat: timestamp("tgl_sertifikat"),
  expSertifikat: timestamp("exp_sertifikat"),
  statusSertifikat: text("status_sertifikat"),

  // Jadwal Perawatan
  jadwalPerawatanS1: timestamp("jadwal_perawatan_s1"),
  statusPerawatanS1: text("status_perawatan_s1"),
  jadwalPerawatanS2: timestamp("jadwal_perawatan_s2"),
  statusPerawatanS2: text("status_perawatan_s2"),

  keterangan: text("keterangan"),
  statusUnit: text("status_unit").notNull().default("AKTIF"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpipPrasaranaSchema = createInsertSchema(spipPrasarana, {
  tglSertifikat: z.coerce.date().nullable().optional(),
  expSertifikat: z.coerce.date().nullable().optional(),
  jadwalPerawatanS1: z.coerce.date().nullable().optional(),
  jadwalPerawatanS2: z.coerce.date().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SpipPrasarana = typeof spipPrasarana.$inferSelect;
export type InsertSpipPrasarana = z.infer<typeof insertSpipPrasaranaSchema>;

export const spipInstalasi = pgTable("spip_instalasi", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  no: integer("no"),
  jenisSpip: text("jenis_spip").notNull().default("INSTALASI"),

  // Identitas Instalasi
  jenisUnit: text("jenis_unit").notNull(),
  kategori: text("kategori"),
  merk: text("merk"),
  type: text("type"),
  nomorRegister: text("nomor_register"),
  kapasitas: text("kapasitas"),
  satuanKapasitas: text("satuan_kapasitas"),
  areaLokasi: text("area_lokasi"),
  tahunPembuatan: integer("tahun_pembuatan"),
  komisioner: text("komisioner"),

  // Sertifikasi & Pengujian
  noSertifikat: text("no_sertifikat"),
  tglSertifikat: timestamp("tgl_sertifikat"),
  expSertifikat: timestamp("exp_sertifikat"),
  statusSertifikat: text("status_sertifikat"),

  keterangan: text("keterangan"),
  statusUnit: text("status_unit").notNull().default("AKTIF"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpipInstalasiSchema = createInsertSchema(spipInstalasi, {
  tglSertifikat: z.coerce.date().nullable().optional(),
  expSertifikat: z.coerce.date().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SpipInstalasi = typeof spipInstalasi.$inferSelect;
export type InsertSpipInstalasi = z.infer<typeof insertSpipInstalasiSchema>;


// ============================================================================
// SPIP PERALATAN WORKSHOP
// ============================================================================

export const spipPeralatanWorkshop = pgTable("spip_peralatan_workshop", {
  id: uuid("id").primaryKey().defaultRandom(),
  no: integer("no"),
  jenisSpip: text("jenis_spip").notNull().default("PERALATAN"),
  subKategori: text("sub_kategori").notNull().default("BERGERAK"),

  // Identitas Alat
  jenisUnit: text("jenis_unit").notNull(),
  merk: text("merk"),
  type: text("type"),
  noLambung: text("no_lambung").notNull().unique(),

  kapasitas: text("kapasitas"),
  nilaiKapasitas: doublePrecision("nilai_kapasitas"),
  satuanKapasitas: text("satuan_kapasitas"),

  areaLokasi: text("area_lokasi"),
  tahunPembuatan: integer("tahun_pembuatan"),
  komisioner: text("komisioner"),

  // Sertifikasi
  noSertifikat: text("no_sertifikat"),
  tglSertifikat: timestamp("tgl_sertifikat"),
  expSertifikat: timestamp("exp_sertifikat"),
  statusExpiredStiker: text("status_expired_stiker"),

  keterangan: text("keterangan"),
  statusUnit: text("status_unit").notNull().default("AKTIF"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSpipPeralatanWorkshopSchema = createInsertSchema(spipPeralatanWorkshop, {
  tglSertifikat: z.coerce.date().nullable().optional(),
  expSertifikat: z.coerce.date().nullable().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SpipPeralatanWorkshop = typeof spipPeralatanWorkshop.$inferSelect;
export type InsertSpipPeralatanWorkshop = z.infer<typeof insertSpipPeralatanWorkshopSchema>;

// ============================================================================
// SIDAK GERINDA DUDUK
// ============================================================================

export const sidakGerindaDudukSessions = pgTable("sidak_gerinda_duduk_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tanggal: text("tanggal").notNull(),
  namaObjekInspeksi: text("nama_objek_inspeksi").notNull(),
  lokasi: text("lokasi").notNull(),
  shift: varchar("shift", { length: 50 }),
  waktu: varchar("waktu", { length: 20 }),
  penanggungJawab: text("penanggung_jawab"),
  totalItems: integer("total_items").default(0),
  activityPhotos: text("activity_photos").array(),
  status: text("status").notNull().default("open"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_gerinda_duduk_sessions_created_by").on(table.createdBy)]);

export const sidakGerindaDudukRecords = pgTable("sidak_gerinda_duduk_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakGerindaDudukSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  namaObjek: text("nama_objek"),
  inspectionResults: jsonb("inspection_results").notNull().default({}),
  tindakLanjutPerbaikan: jsonb("tindak_lanjut_perbaikan").notNull().default({}),
  dueDate: date("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_gerinda_duduk_records_session").on(table.sessionId)]);

export const sidakGerindaDudukObservers = pgTable("sidak_gerinda_duduk_observers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sidakGerindaDudukSessions.id, { onDelete: "cascade" }),
  ordinal: integer("ordinal").notNull(),
  nama: text("nama").notNull(),
  perusahaan: text("perusahaan"),
  tandaTangan: text("tanda_tangan"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [index("IDX_gerinda_duduk_observers_session").on(table.sessionId)]);

export const insertSidakGerindaDudukSessionSchema = createInsertSchema(sidakGerindaDudukSessions).omit({ id: true, createdAt: true, totalItems: true, status: true });
export const insertSidakGerindaDudukRecordSchema = createInsertSchema(sidakGerindaDudukRecords).omit({ id: true, createdAt: true });
export const insertSidakGerindaDudukObserverSchema = createInsertSchema(sidakGerindaDudukObservers).omit({ id: true, createdAt: true });

export type SidakGerindaDudukSession = typeof sidakGerindaDudukSessions.$inferSelect;
export type InsertSidakGerindaDudukSession = z.infer<typeof insertSidakGerindaDudukSessionSchema>;
export type SidakGerindaDudukRecord = typeof sidakGerindaDudukRecords.$inferSelect;
export type InsertSidakGerindaDudukRecord = z.infer<typeof insertSidakGerindaDudukRecordSchema>;
export type SidakGerindaDudukObserver = typeof sidakGerindaDudukObservers.$inferSelect;
export type InsertSidakGerindaDudukObserver = z.infer<typeof insertSidakGerindaDudukObserverSchema>;

// ============================================
// PICA (Problem Identification & Corrective Action)
// ============================================

export const picaRecords = pgTable("pica_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moduleSource: text("module_source").notNull(), // e.g. "SIDAK_FATIGUE", "SIDAK_ROSTER", etc.
  referenceId: varchar("reference_id").notNull(), // Record ID from source table
  sessionId: varchar("session_id").notNull(), // Session ID from source table
  findingId: text("finding_id").notNull(), // Item ID from checklist (e.g. "1.1")
  findingDescription: text("finding_description").notNull(),
  correctiveAction: text("corrective_action"),
  pic: text("pic"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("OPEN"), // OPEN, IN_PROGRESS, CLOSED
  priority: text("priority").default("MEDIUM"), // LOW, MEDIUM, HIGH
  category: text("category"), // e.g., "K3", "Environment", "Technical"
  notes: text("notes"),
  completionDate: date("completion_date"),
  verificationEvidence: text("verification_evidence"), // URL to photo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_pica_status").on(table.status),
  index("IDX_pica_module").on(table.moduleSource),
  index("IDX_pica_reference").on(table.referenceId),
]);

export const insertPicaRecordSchema = createInsertSchema(picaRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PicaRecord = typeof picaRecords.$inferSelect;
export type InsertPicaRecord = z.infer<typeof insertPicaRecordSchema>;

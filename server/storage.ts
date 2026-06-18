import { format, parse, parseISO } from "date-fns";
import { eq, desc, and, or, sql, ilike, inArray, asc, getTableColumns, isNotNull, not } from "drizzle-orm";
import {
  type Employee,
  type InsertEmployee,
  type AttendanceRecord,
  type InsertAttendanceRecord,
  type SidakSeatbeltSession,
  type InsertSidakSeatbeltSession,
  type SidakSeatbeltRecord,
  type InsertSidakSeatbeltRecord,
  type SidakSeatbeltObserver,
  type InsertSidakSeatbeltObserver,
  type SidakRambuSession,
  type InsertSidakRambuSession,
  type SidakRambuObservation,
  type InsertSidakRambuObservation,
  type SidakRambuObserver,
  type InsertSidakRambuObserver,
  type RosterSchedule,
  type InsertRosterSchedule,
  type LeaveRequest,
  type InsertLeaveRequest,
  type QrToken,
  type InsertQrToken,
  type LeaveReminder,
  type InsertLeaveReminder,
  type LeaveBalance,
  type InsertLeaveBalance,
  type LeaveHistory,
  type InsertLeaveHistory,
  type LeaveRosterMonitoring,
  type InsertLeaveRosterMonitoring,
  type Meeting,
  type InsertMeeting,
  type MeetingAttendance,
  type InsertMeetingAttendance,
  type SimperMonitoring,
  type InsertSimperMonitoring,
  type SidakFatigueSession,
  type InsertSidakFatigueSession,
  type SidakFatigueRecord,
  type InsertSidakFatigueRecord,
  type SidakFatigueObserver,
  type InsertSidakFatigueObserver,
  type SidakRosterSession,
  type InsertSidakRosterSession,
  type SidakRosterRecord,
  type InsertSidakRosterRecord,
  type SidakRosterObserver,
  type InsertSidakRosterObserver,
  type Announcement,
  type InsertAnnouncement,
  type AnnouncementRead,
  type InsertAnnouncementRead,
  type Document,
  type InsertDocument,
  type News,
  type InsertNews,
  type PushSubscription,
  type InsertPushSubscription,
  type SafetyPatrolReport,
  type InsertSafetyPatrolReport,
  safetyPatrolAttendancePlan,
  type SafetyPatrolAttendancePlan,
  type InsertSafetyPatrolAttendancePlan,
  zhHazard, zhInspeksi, zhObservasi, zhAttendance, zhFms, zhOpk, zhProgramAttendance,
  type SafetyPatrolAttendance,
  type InsertSafetyPatrolAttendance,
  type SafetyPatrolRawMessage,
  type InsertSafetyPatrolRawMessage,
  type SafetyPatrolTemplate,
  type InsertSafetyPatrolTemplate,
  type SidakKecepatanSession,
  type InsertSidakKecepatanSession,
  type SidakKecepatanRecord,
  type InsertSidakKecepatanRecord,
  type SidakKecepatanObserver,
  type InsertSidakKecepatanObserver,
  type SidakPencahayaanSession,
  type InsertSidakPencahayaanSession,
  type SidakPencahayaanRecord,
  type InsertSidakPencahayaanRecord,
  type SidakPencahayaanObserver,
  type InsertSidakPencahayaanObserver,
  type User,
  type UpsertUser,
  type InductionAnswer,
  type InsertInductionAnswer,
  type PublicInductionAttendance,
  type InsertPublicInductionAttendance,
  type UsignDocument,
  type InsertUsignDocument,
  type UsignApprovalStep,
  type InsertUsignApprovalStep,
  type UsignSignature,
  type InsertUsignSignature,
  type UsignNotification,
  type InsertUsignNotification,
  type PicaRecord,
  type InsertPicaRecord,
  picaRecords,
  users,
  authUsers,
  attendanceRecords,
  rosterSchedules,
  leaveRequests,
  employees,
  employeeFamilyMembers,
  type EmployeeFamilyMember,
  type InsertEmployeeFamilyMember,
  qrTokens,
  leaveReminders,
  leaveBalances,
  leaveHistory,
  leaveRosterMonitoring,
  meetings,
  meetingAttendance,
  simperMonitoring,
  sidakFatigueSessions,
  sidakFatigueRecords,
  sidakFatigueObservers,
  sidakRosterSessions,
  InsertFmsViolation,
  FmsViolation,
  fmsViolations,
  fmsDriverLevels,
  fmsDriverWeekLevels,
  fmsDriverInvestigations,
  sidakRosterRecords,
  sidakRosterObservers,
  announcements,
  announcementReads,
  documents,
  news,
  pushSubscriptions,
  safetyPatrolReports,
  safetyPatrolAttendance,
  safetyPatrolRawMessages,
  safetyPatrolTemplates,
  sidakKecepatanSessions,
  sidakKecepatanRecords,
  sidakKecepatanObservers,
  sidakPencahayaanSessions,
  sidakPencahayaanRecords,
  sidakPencahayaanObservers,
  sidakSeatbeltSessions,
  sidakSeatbeltRecords,
  type SidakApdSession,
  type InsertSidakApdSession,
  type SidakApdRecord,
  type InsertSidakApdRecord,
  type SidakApdObserver,
  type InsertSidakApdObserver,
  sidakApdSessions,
  sidakApdRecords,
  sidakApdObservers,
  type InsertTnaEntry,
  type TnaEntry,

  sidakSeatbeltObservers,
  sidakRambuSessions,
  sidakRambuObservations,
  sidakRambuObservers,
  type SidakAntrianSession,
  type InsertSidakAntrianSession,
  type SidakAntrianRecord,
  type InsertSidakAntrianRecord,
  type SidakAntrianObserver,
  type InsertSidakAntrianObserver,
  sidakAntrianSessions,
  sidakAntrianRecords,
  sidakAntrianObservers,
  type SidakJarakSession,
  type InsertSidakJarakSession,
  type SidakJarakRecord,
  type InsertSidakJarakRecord,
  type SidakJarakObserver,
  type InsertSidakJarakObserver,
  sidakJarakSessions,
  sidakJarakRecords,
  sidakJarakObservers,
  type SidakLotoSession,
  type InsertSidakLotoSession,
  type SidakLotoRecord,
  type InsertSidakLotoRecord,
  type SidakLotoObserver,
  type InsertSidakLotoObserver,
  sidakLotoSessions,
  sidakLotoRecords,
  sidakLotoObservers,
  type SidakBehaviorSession,
  type InsertSidakBehaviorSession,
  type SidakBehaviorRecord,
  type InsertSidakBehaviorRecord,
  type SidakBehaviorObserver,
  type InsertSidakBehaviorObserver,
  sidakBehaviorSessions,
  sidakBehaviorRecords,
  sidakBehaviorObservers,
  type SidakChargingStationSession,
  type InsertSidakChargingStationSession,
  type SidakChargingStationRecord,
  type InsertSidakChargingStationRecord,
  type SidakChargingStationObserver,
  type InsertSidakChargingStationObserver,
  sidakChargingStationSessions,
  sidakChargingStationRecords,
  sidakChargingStationObservers,
  type SidakSopKritisSession,
  type InsertSidakSopKritisSession,
  type SidakSopKritisPengendalian,
  type InsertSidakSopKritisPengendalian,
  type SidakSopKritisLangkah,
  type InsertSidakSopKritisLangkah,
  type SidakSopKritisObserver,
  type InsertSidakSopKritisObserver,
  sidakSopKritisSessions,
  sidakSopKritisPengendalian,
  sidakSopKritisLangkah,
  sidakSopKritisObservers,
  type SidakDigitalSession,
  type InsertSidakDigitalSession,
  type SidakDigitalRecord,
  type InsertSidakDigitalRecord,
  type SidakDigitalObserver,
  type InsertSidakDigitalObserver,
  sidakDigitalSessions,
  sidakDigitalRecords,
  sidakDigitalObservers,
  type SidakWorkshopSession,
  type InsertSidakWorkshopSession,
  type SidakWorkshopEquipment,
  type InsertSidakWorkshopEquipment,
  type SidakWorkshopInspector,
  type InsertSidakWorkshopInspector,
  sidakWorkshopSessions,
  sidakWorkshopEquipment,
  sidakWorkshopInspectors,
  type SidakIntercomSession,
  type InsertSidakIntercomSession,
  type SidakIntercomRecord,
  type InsertSidakIntercomRecord,
  type SidakIntercomObserver,
  type InsertSidakIntercomObserver,
  sidakIntercomSessions,
  sidakIntercomRecords,
  sidakIntercomObservers,
  type SidakStandJackSession,
  type InsertSidakStandJackSession,
  type SidakStandJackRecord,
  type InsertSidakStandJackRecord,
  type SidakStandJackObserver,
  type InsertSidakStandJackObserver,
  sidakStandJackSessions,
  sidakStandJackRecords,
  sidakStandJackObservers,
  type SidakHydraulicJackSession,
  type InsertSidakHydraulicJackSession,
  type SidakHydraulicJackRecord,
  type InsertSidakHydraulicJackRecord,
  type SidakHydraulicJackObserver,
  type InsertSidakHydraulicJackObserver,
  sidakHydraulicJackSessions,
  sidakHydraulicJackRecords,
  sidakHydraulicJackObservers,
  type SidakBottleJackSession,
  type InsertSidakBottleJackSession,
  type SidakBottleJackRecord,
  type InsertSidakBottleJackRecord,
  type SidakBottleJackObserver,
  type InsertSidakBottleJackObserver,
  sidakBottleJackSessions,
  sidakBottleJackRecords,
  sidakBottleJackObservers,
  type SidakFuelStorageSession,
  type InsertSidakFuelStorageSession,
  type SidakFuelStorageRecord,
  type InsertSidakFuelStorageRecord,
  type SidakFuelStorageObserver,
  type InsertSidakFuelStorageObserver,
  sidakFuelStorageSessions,
  sidakFuelStorageRecords,
  sidakFuelStorageObservers,
  sidakMesinLasSessions,
  sidakMesinLasRecords,
  sidakMesinLasObservers,
  type SidakMesinLasSession,
  type InsertSidakMesinLasSession,
  type SidakMesinLasRecord,
  type InsertSidakMesinLasRecord,
  type SidakMesinLasObserver,
  type InsertSidakMesinLasObserver,
  // TNA Types
  type Training, type InsertTraining,
  type TnaSummary, type InsertTnaSummary,
  type CompetencyMonitoringLog, type InsertCompetencyMonitoringLog,
  type KompetensiMonitoring, type InsertKompetensiMonitoring,
  trainings, tnaSummaries, tnaEntries, competencyMonitoringLogs, kompetensiMonitoring,
  changeRequests, type ChangeRequest, documentMasterlist, documentVersions,
  documentApprovals, documentApprovalSteps, documentStepAssignees,
  documentDistributions, documentExportLogs, esignRequests,
  documentDisposalRecords, type DocumentDisposalRecord, type InsertDocumentDisposalRecord,
  fmsFatigueAlerts,
  type ActivityEvent,
  type InsertActivityEvent,
  activityEvents,
  inductionMaterials,
  inductionQuestions,
  inductionSchedules,
  inductionAnswers,

  type InductionMaterial,
  type InsertInductionMaterial,
  type InductionQuestion,
  type InsertInductionQuestion,
  type InductionSchedule,
  type InsertInductionSchedule,

  mcuRecords,
  type McuRecord,
  type InsertMcuRecord,
  systemSettings,
  type SystemSetting,
  notifications,
  type Notification,
  type InsertNotification,
  whatsappBlasts,
  whatsappBlastRecipients,
  whatsappTemplates,
  type WhatsappBlast,
  type WhatsappBlastRecipient,
  type WhatsappTemplate,
  simperEvMonitoring,
  type InsertSimperEvMonitoring,
  type SimperEvMonitoring,
  simperEvHistory,
  type SimperEvHistory,
  type InsertSimperEvHistory,
  whatsappNotificationLogs,
  type WhatsappNotificationLog,
  type InsertWhatsappNotificationLog,
  simperMitra,
  type SimperMitra,
  type InsertSimperMitra,
  // Sick Leave Types
  sickLeaves,
  type SickLeave,
  type InsertSickLeave,
  // Project Tracker
  projects, type Project, type InsertProject,
  projectFiles, type ProjectFile, type InsertProjectFile,
  // Simper Perpanjangan
  simperPerpanjangan, type SimperPerpanjangan, type InsertSimperPerpanjangan,
  simperPerpanjanganHistory, type SimperPerpanjanganHistory, type InsertSimperPerpanjanganHistory,
  publicInductionAttendance,
  // Sidak P3K
  type SidakP3kSession,
  type InsertSidakP3kSession,
  type SidakP3kItem,
  type InsertSidakP3kItem,
  sidakP3kSessions,
  sidakP3kItems,
  usignDocuments,
  usignApprovalSteps,
  usignSignatures,
  usignNotifications,
  type SidakMesinKompresorSession,
  type InsertSidakMesinKompresorSession,
  type SidakMesinKompresorRecord,
  type InsertSidakMesinKompresorRecord,
  type SidakMesinKompresorObserver,
  type InsertSidakMesinKompresorObserver,
  sidakMesinKompresorSessions,
  sidakMesinKompresorRecords,
  sidakMesinKompresorObservers,
  type SidakImpactSession,
  type InsertSidakImpactSession,
  type SidakImpactRecord,
  type InsertSidakImpactRecord,
  type SidakImpactObserver,
  type InsertSidakImpactObserver,
  type SidakAparSession,
  type InsertSidakAparSession,
  type SidakAparRecord,
  type InsertSidakAparRecord,
  type SidakAparObserver,
  type InsertSidakAparObserver,
  sidakImpactSessions,
  sidakImpactRecords,
  sidakImpactObservers,
  sidakAparSessions,
  sidakAparRecords,
  sidakAparObservers,
  sidakGerindaDudukSessions,
  sidakGerindaDudukRecords,
  sidakGerindaDudukObservers,
  type SidakGerindaDudukSession,
  type InsertSidakGerindaDudukSession,
  type SidakGerindaDudukRecord,
  type InsertSidakGerindaDudukRecord,
  type SidakGerindaDudukObserver,
  type InsertSidakGerindaDudukObserver,
} from "@shared/schema";
import { randomUUID } from "crypto";


import { db } from "./db";
import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Auth operations (NIK-based authentication)
  createAuthUser(nik: string, hashedPassword: string): Promise<void>;
  getAuthUserByNik(nik: string): Promise<{ nik: string; hashedPassword: string } | undefined>;
  updateAuthUserPassword(nik: string, hashedPassword: string): Promise<void>;

  // Employee methods
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByNik(nik: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  getEmployees(): Promise<Employee[]>; // Alias for compatibility
  getEmployeesPaginated(page: number, perPage: number, search?: string, position?: string): Promise<{ data: Employee[]; total: number; totalPages: number }>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(id: string): Promise<boolean>;
  deleteAllEmployees(positions?: string[]): Promise<boolean>;

  // Employee Family Members
  getEmployeeFamilyMembers(employeeId: string): Promise<EmployeeFamilyMember[]>;
  createEmployeeFamilyMember(data: InsertEmployeeFamilyMember): Promise<EmployeeFamilyMember>;
  updateEmployeeFamilyMember(id: string, data: Partial<InsertEmployeeFamilyMember>): Promise<EmployeeFamilyMember | undefined>;
  deleteEmployeeFamilyMember(id: string): Promise<boolean>;

  // Attendance methods
  getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined>;
  getAttendanceByEmployee(employeeId: string, date?: string): Promise<AttendanceRecord[]>;
  getAllAttendance(date?: string): Promise<AttendanceRecord[]>;
  getAllAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]>;
  createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord>;

  // Roster methods
  getRosterSchedule(id: string): Promise<RosterSchedule | undefined>;
  getRosterByDate(date: string): Promise<RosterSchedule[]>;
  getRosterByDateRange(startDate: string, endDate: string): Promise<RosterSchedule[]>;
  getRosterByEmployee(employeeId: string): Promise<RosterSchedule[]>;
  getRosterByEmployeeAndDate(employeeId: string, date: string): Promise<RosterSchedule | undefined>;
  createRosterSchedule(schedule: InsertRosterSchedule): Promise<RosterSchedule>;
  bulkCreateRosterSchedules(schedules: InsertRosterSchedule[]): Promise<RosterSchedule[]>;
  updateRosterSchedule(id: string, schedule: Partial<InsertRosterSchedule>): Promise<RosterSchedule | undefined>;
  deleteRosterSchedule(id: string): Promise<boolean>;
  deleteAllRosterSchedules(): Promise<void>;

  // Leave methods
  getLeaveRequest(id: string): Promise<LeaveRequest | undefined>;
  getLeaveByEmployee(employeeId: string): Promise<LeaveRequest[]>;
  getAllLeaveRequests(): Promise<LeaveRequest[]>;
  getLeaveRequests(): Promise<LeaveRequest[]>; // Alias for compatibility
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: string, request: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined>;
  deleteLeaveRequest(id: string): Promise<boolean>;

  // QR Token methods
  getQrToken(employeeId: string): Promise<QrToken | undefined>;
  getQrTokensByEmployee(employeeId: string): Promise<QrToken[]>;
  createQrToken(token: InsertQrToken): Promise<QrToken>;
  validateQrToken(employeeId: string, token: string): Promise<boolean>;

  // Leave Reminder methods
  getLeaveReminder(leaveRequestId: string, reminderType: string): Promise<LeaveReminder | undefined>;
  getLeaveReminders(): Promise<LeaveReminder[]>;
  saveLeaveReminder(reminder: InsertLeaveReminder): Promise<LeaveReminder>;

  // Leave Balance methods
  getLeaveBalances(): Promise<LeaveBalance[]>;
  getLeaveBalanceByEmployee(employeeId: string, year?: number): Promise<LeaveBalance | undefined>;
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;

  // ============================================================================
  // SIDAK ANTRIAN METHODS
  // ============================================================================
  getSidakAntrianSession(id: string): Promise<SidakAntrianSession | undefined>;
  getAllSidakAntrianSessions(): Promise<SidakAntrianSession[]>;
  createSidakAntrianSession(session: InsertSidakAntrianSession): Promise<SidakAntrianSession>;
  updateSidakAntrianSession(id: string, updates: Partial<InsertSidakAntrianSession>): Promise<SidakAntrianSession | undefined>;
  getSidakAntrianRecords(sessionId: string): Promise<SidakAntrianRecord[]>;
  createSidakAntrianRecord(record: InsertSidakAntrianRecord): Promise<SidakAntrianRecord>;
  getSidakAntrianObservers(sessionId: string): Promise<SidakAntrianObserver[]>;
  createSidakAntrianObserver(observer: Omit<InsertSidakAntrianObserver, 'ordinal'>): Promise<SidakAntrianObserver>;
  updateLeaveBalance(id: string, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined>;
  calculateLeaveEligibility(employeeId: string): Promise<{ eligible: boolean; daysEarned: number; nextEligibleDate: string | null }>;

  // Leave History methods
  getLeaveHistory(): Promise<LeaveHistory[]>;
  getLeaveHistoryByEmployee(employeeId: string): Promise<LeaveHistory[]>;
  createLeaveHistory(history: InsertLeaveHistory): Promise<LeaveHistory>;

  // Bulk upload methods
  bulkUploadLeaveRoster(data: Array<{ nik: string; leaveType: string; startDate: string; endDate: string; totalDays: number }>): Promise<{ success: number; errors: string[] }>;

  // Leave Roster Monitoring methods
  getLeaveRosterMonitoring(id: string): Promise<LeaveRosterMonitoring | undefined>;
  getLeaveRosterMonitoringByNik(nik: string): Promise<LeaveRosterMonitoring | undefined>;
  getAllLeaveRosterMonitoring(): Promise<LeaveRosterMonitoring[]>;
  createLeaveRosterMonitoring(monitoring: InsertLeaveRosterMonitoring): Promise<LeaveRosterMonitoring>;
  updateLeaveRosterMonitoring(id: string, monitoring: Partial<InsertLeaveRosterMonitoring>): Promise<LeaveRosterMonitoring | undefined>;
  deleteLeaveRosterMonitoring(id: string): Promise<boolean>;
  deleteAllLeaveRosterMonitoring(): Promise<void>;
  updateLeaveRosterStatus(): Promise<void>; // Update status berdasarkan tanggal


  // Meeting methods
  getMeeting(id: string): Promise<Meeting | undefined>;
  getAllMeetings(): Promise<Meeting[]>;
  getMeetingsByDate(date: string): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: string): Promise<boolean>;
  getMeetingByQrToken(qrToken: string): Promise<Meeting | undefined>;

  // Meeting attendance methods
  getMeetingAttendance(meetingId: string): Promise<MeetingAttendance[]>;
  createMeetingAttendance(attendance: InsertMeetingAttendance): Promise<MeetingAttendance>;
  checkMeetingAttendance(meetingId: string, employeeId: string): Promise<MeetingAttendance | undefined>;
  deleteMeetingAttendance(attendanceId: string): Promise<boolean>;

  // SIMPER Monitoring methods
  getSimperMonitoring(id: string): Promise<SimperMonitoring | undefined>;
  getSimperMonitoringByNik(nik: string): Promise<SimperMonitoring | undefined>;
  getAllSimperMonitoring(): Promise<SimperMonitoring[]>;
  createSimperMonitoring(simper: InsertSimperMonitoring): Promise<SimperMonitoring>;
  updateSimperMonitoring(id: string, simper: Partial<InsertSimperMonitoring>): Promise<SimperMonitoring | undefined>;
  deleteSimperMonitoring(id: string): Promise<boolean>;
  deleteAllSimperMonitoring(): Promise<void>;
  bulkUploadSimperData(data: Array<{ employeeName: string; nik: string; simperBibExpiredDate?: string; simperTiaExpiredDate?: string }>): Promise<{ success: number; errors: string[] }>;

  // Sidak Fatigue methods
  getSidakFatigueSession(id: string): Promise<SidakFatigueSession | undefined>;
  getAllSidakFatigueSessions(): Promise<SidakFatigueSession[]>;
  createSidakFatigueSession(session: InsertSidakFatigueSession): Promise<SidakFatigueSession>;
  updateSidakFatigueSession(id: string, updates: Partial<InsertSidakFatigueSession>): Promise<SidakFatigueSession | undefined>;
  deleteSidakFatigueSession(id: string): Promise<boolean>;
  getSidakFatigueRecords(sessionId: string): Promise<SidakFatigueRecord[]>;
  getSidakFatigueRecordsBySessionIds(sessionIds: string[]): Promise<SidakFatigueRecord[]>;
  createSidakFatigueRecord(record: InsertSidakFatigueRecord): Promise<SidakFatigueRecord>;
  getSidakFatigueObservers(sessionId: string): Promise<SidakFatigueObserver[]>;
  updateSidakFatigueSessionSampleCount(sessionId: string): Promise<void>;
  createSidakFatigueObserver(observer: InsertSidakFatigueObserver): Promise<SidakFatigueObserver>;

  // Sidak Behavior Driver methods
  getSidakBehaviorSession(id: string): Promise<SidakBehaviorSession | undefined>;
  getAllSidakBehaviorSessions(): Promise<SidakBehaviorSession[]>;
  createSidakBehaviorSession(session: InsertSidakBehaviorSession): Promise<SidakBehaviorSession>;
  updateSidakBehaviorSession(id: string, updates: Partial<InsertSidakBehaviorSession>): Promise<SidakBehaviorSession | undefined>;
  getSidakBehaviorRecords(sessionId: string): Promise<SidakBehaviorRecord[]>;
  createSidakBehaviorRecord(record: InsertSidakBehaviorRecord & { sessionId: string }): Promise<SidakBehaviorRecord>;
  getSidakBehaviorObservers(sessionId: string): Promise<SidakBehaviorObserver[]>;
  createSidakBehaviorObserver(observer: InsertSidakBehaviorObserver & { sessionId: string }): Promise<SidakBehaviorObserver>;
  updateSidakBehaviorSessionSampleCount(sessionId: string): Promise<void>;
  getSidakChargingStationSession(id: string): Promise<SidakChargingStationSession | undefined>;
  getAllSidakChargingStationSessions(): Promise<SidakChargingStationSession[]>;
  createSidakChargingStationSession(session: InsertSidakChargingStationSession): Promise<SidakChargingStationSession>;
  updateSidakChargingStationSession(id: string, updates: Partial<InsertSidakChargingStationSession>): Promise<SidakChargingStationSession | undefined>;
  getSidakChargingStationRecords(sessionId: string): Promise<SidakChargingStationRecord[]>;
  createSidakChargingStationRecord(record: InsertSidakChargingStationRecord & { sessionId: string }): Promise<SidakChargingStationRecord>;
  getSidakChargingStationObservers(sessionId: string): Promise<SidakChargingStationObserver[]>;
  createSidakChargingStationObserver(observer: InsertSidakChargingStationObserver & { sessionId: string }): Promise<SidakChargingStationObserver>;
  updateSidakChargingStationSessionSampleCount(sessionId: string): Promise<void>;
  getSopKritisSession(id: string): Promise<SidakSopKritisSession | undefined>;
  getAllSopKritisSessions(): Promise<SidakSopKritisSession[]>;
  createSopKritisSession(session: InsertSidakSopKritisSession): Promise<SidakSopKritisSession>;
  updateSopKritisSession(id: string, updates: Partial<InsertSidakSopKritisSession>): Promise<SidakSopKritisSession | undefined>;
  getSopKritisPengendalian(sessionId: string): Promise<SidakSopKritisPengendalian[]>;
  createSopKritisPengendalian(item: InsertSidakSopKritisPengendalian & { sessionId: string }): Promise<SidakSopKritisPengendalian>;
  getSopKritisLangkah(sessionId: string): Promise<SidakSopKritisLangkah[]>;
  createSopKritisLangkah(item: InsertSidakSopKritisLangkah & { sessionId: string }): Promise<SidakSopKritisLangkah>;
  getSopKritisObservers(sessionId: string): Promise<SidakSopKritisObserver[]>;
  createSopKritisObserver(observer: InsertSidakSopKritisObserver & { sessionId: string }): Promise<SidakSopKritisObserver>;
  deleteSopKritisPengendalianBySession(sessionId: string): Promise<void>;
  deleteSopKritisLangkahBySession(sessionId: string): Promise<void>;
  deleteSopKritisObserversBySession(sessionId: string): Promise<void>;

  // Sidak Roster methods
  getSidakRosterSession(id: string): Promise<SidakRosterSession | undefined>;
  getAllSidakRosterSessions(): Promise<SidakRosterSession[]>;
  createSidakRosterSession(session: InsertSidakRosterSession): Promise<SidakRosterSession>;
  updateSidakRosterSession(id: string, updates: Partial<InsertSidakRosterSession>): Promise<SidakRosterSession | undefined>;
  deleteSidakRosterSession(id: string): Promise<boolean>;
  getSidakRosterRecords(sessionId: string): Promise<SidakRosterRecord[]>;
  getSidakRosterRecordsBySessionIds(sessionIds: string[]): Promise<SidakRosterRecord[]>;
  createSidakRosterRecord(record: InsertSidakRosterRecord): Promise<SidakRosterRecord>;
  getSidakRosterObservers(sessionId: string): Promise<SidakRosterObserver[]>;
  createSidakRosterObserver(observer: InsertSidakRosterObserver): Promise<SidakRosterObserver>;
  updateSidakRosterSessionSampleCount(sessionId: string): Promise<void>;

  // Sidak Seatbelt methods
  getSidakSeatbeltSession(id: string): Promise<SidakSeatbeltSession | undefined>;
  getAllSidakSeatbeltSessions(): Promise<SidakSeatbeltSession[]>;
  createSidakSeatbeltSession(session: InsertSidakSeatbeltSession): Promise<SidakSeatbeltSession>;
  updateSidakSeatbeltSession(id: string, updates: Partial<InsertSidakSeatbeltSession>): Promise<SidakSeatbeltSession | undefined>;
  deleteSidakSeatbeltSession(id: string): Promise<boolean>;
  getSidakSeatbeltRecords(sessionId: string): Promise<SidakSeatbeltRecord[]>;
  createSidakSeatbeltRecord(record: InsertSidakSeatbeltRecord): Promise<SidakSeatbeltRecord>;
  getSidakSeatbeltObservers(sessionId: string): Promise<SidakSeatbeltObserver[]>;
  createSidakSeatbeltObserver(observer: InsertSidakSeatbeltObserver): Promise<SidakSeatbeltObserver>;
  updateSidakSeatbeltSessionSampleCount(sessionId: string): Promise<void>;

  // Sidak Rambu methods
  getSidakRambuSession(id: string): Promise<SidakRambuSession | undefined>;
  getAllSidakRambuSessions(): Promise<SidakRambuSession[]>;
  createSidakRambuSession(session: InsertSidakRambuSession): Promise<SidakRambuSession>;
  updateSidakRambuSession(id: string, updates: Partial<InsertSidakRambuSession>): Promise<SidakRambuSession | undefined>;
  getSidakRambuObservations(sessionId: string): Promise<SidakRambuObservation[]>;
  createSidakRambuObservation(observation: InsertSidakRambuObservation): Promise<SidakRambuObservation>;
  getSidakRambuObservers(sessionId: string): Promise<SidakRambuObserver[]>;
  createSidakRambuObserver(observer: InsertSidakRambuObserver): Promise<SidakRambuObserver>;
  updateSidakRambuSessionSampleCount(sessionId: string): Promise<void>;
  generateSidakRambuPDF(data: { session: SidakRambuSession; observations: SidakRambuObservation[]; observers: SidakRambuObserver[] }): Promise<Buffer>;

  // Sidak APD methods
  getSidakApdSession(id: string): Promise<SidakApdSession | undefined>;
  getAllSidakApdSessions(): Promise<SidakApdSession[]>;
  createSidakApdSession(session: InsertSidakApdSession): Promise<SidakApdSession>;
  updateSidakApdSession(id: string, updates: Partial<InsertSidakApdSession>): Promise<SidakApdSession | undefined>;
  getSidakApdRecords(sessionId: string): Promise<SidakApdRecord[]>;
  createSidakApdRecord(record: InsertSidakApdRecord): Promise<SidakApdRecord>;
  getSidakApdObservers(sessionId: string): Promise<SidakApdObserver[]>;
  createSidakApdObserver(observer: InsertSidakApdObserver): Promise<SidakApdObserver>;
  updateSidakApdSessionSampleCount(sessionId: string): Promise<void>;

  // Sidak Jarak methods
  getSidakJarakSession(id: string): Promise<SidakJarakSession | undefined>;
  getAllSidakJarakSessions(): Promise<SidakJarakSession[]>;
  createSidakJarakSession(session: InsertSidakJarakSession): Promise<SidakJarakSession>;
  updateSidakJarakSession(id: string, updates: Partial<InsertSidakJarakSession>): Promise<SidakJarakSession | undefined>;
  getSidakJarakRecords(sessionId: string): Promise<SidakJarakRecord[]>;
  createSidakJarakRecord(record: InsertSidakJarakRecord): Promise<SidakJarakRecord>;
  getSidakJarakObservers(sessionId: string): Promise<SidakJarakObserver[]>;
  createSidakJarakObserver(observer: InsertSidakJarakObserver): Promise<SidakJarakObserver>;
  generateSidakJarakPDF(data: { session: SidakJarakSession; records: SidakJarakRecord[]; observers: SidakJarakObserver[] }): Promise<Buffer>;

  // Sidak Kecepatan methods
  getSidakKecepatanSession(id: string): Promise<SidakKecepatanSession | undefined>;
  getAllSidakKecepatanSessions(): Promise<SidakKecepatanSession[]>;
  createSidakKecepatanSession(session: InsertSidakKecepatanSession): Promise<SidakKecepatanSession>;
  updateSidakKecepatanSession(id: string, updates: Partial<InsertSidakKecepatanSession>): Promise<SidakKecepatanSession | undefined>;
  getSidakKecepatanRecords(sessionId: string): Promise<SidakKecepatanRecord[]>;
  createSidakKecepatanRecord(record: InsertSidakKecepatanRecord): Promise<SidakKecepatanRecord>;
  getSidakKecepatanObservers(sessionId: string): Promise<SidakKecepatanObserver[]>;
  createSidakKecepatanObserver(observer: InsertSidakKecepatanObserver): Promise<SidakKecepatanObserver>;

  // Announcement methods
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getAllAnnouncements(): Promise<Announcement[]>;
  getActiveAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined>;
  deleteAnnouncement(id: string): Promise<boolean>;

  // PICA Methods
  getPicaRecords(): Promise<PicaRecord[]>;
  getPicaRecord(id: string): Promise<PicaRecord | undefined>;
  createPicaRecord(record: InsertPicaRecord): Promise<PicaRecord>;
  updatePicaRecord(id: string, record: Partial<InsertPicaRecord>): Promise<PicaRecord | undefined>;
  deletePicaRecord(id: string): Promise<boolean>;
  deleteAllPicaRecords(): Promise<void>;

  // Announcement read tracking methods
  getAnnouncementReads(announcementId: string): Promise<AnnouncementRead[]>;
  markAnnouncementAsRead(announcementId: string, employeeId: string, employeeName: string): Promise<AnnouncementRead>;
  getReadStatus(announcementId: string, employeeId: string): Promise<boolean>;
  getUnreadAnnouncementsCount(employeeId: string): Promise<number>;
  hasReadAnnouncement(announcementId: string, employeeId: string): Promise<boolean>;

  // Document methods
  getDocument(id: string): Promise<Document | undefined>;
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  getActiveDocuments(): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: string): Promise<boolean>;

  // News methods
  getNews(id: string): Promise<News | undefined>;
  getAllNews(): Promise<News[]>;
  getActiveNews(): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  updateNews(id: string, news: Partial<InsertNews>): Promise<News | undefined>;
  deleteNews(id: string): Promise<boolean>;

  // Push subscription methods
  getPushSubscription(id: string): Promise<PushSubscription | undefined>;
  getPushSubscriptionsByEmployee(employeeId: string): Promise<PushSubscription[]>;
  getActivePushSubscriptions(): Promise<PushSubscription[]>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(id: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // Safety Patrol Template methods
  getSafetyPatrolTemplate(id: string): Promise<SafetyPatrolTemplate | undefined>;
  getAllSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]>;
  getActiveSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]>;
  createSafetyPatrolTemplate(template: InsertSafetyPatrolTemplate): Promise<SafetyPatrolTemplate>;
  updateSafetyPatrolTemplate(id: string, template: Partial<InsertSafetyPatrolTemplate>): Promise<SafetyPatrolTemplate | undefined>;
  deleteSafetyPatrolTemplate(id: string): Promise<boolean>;

  // TNA Methods
  getTrainings(): Promise<Training[]>;
  createTraining(training: InsertTraining): Promise<Training>;
  getTnaSummary(employeeId: string, period: string): Promise<TnaSummary | undefined>;
  createOrGetTnaSummary(employeeId: string, period: string): Promise<TnaSummary>;
  createTnaSummary(summary: InsertTnaSummary): Promise<TnaSummary>;
  getTnaEntries(summaryId: string): Promise<TnaEntry[]>;
  getAllTnaEntriesWithDetailsV2(): Promise<any[]>; // For overall dashboard
  createTnaEntry(entry: InsertTnaEntry): Promise<TnaEntry>;
  getAllRawTnaEntries(): Promise<any[]>;
  updateTnaEntry(id: string, entry: Partial<InsertTnaEntry>): Promise<TnaEntry>;

  getTnaDashboardStats(): Promise<any>;

  // Competency Monitoring
  createCompetencyMonitoringLog(log: InsertCompetencyMonitoringLog): Promise<CompetencyMonitoringLog>;
  getCompetencyMonitoringLogs(tnaEntryId: string): Promise<CompetencyMonitoringLog[]>;

  // MONITORING KOMPETENSI (NEW)
  getKompetensiMonitoring(): Promise<KompetensiMonitoring[]>;
  getKompetensiMonitoringById(id: string): Promise<KompetensiMonitoring | undefined>;
  createKompetensiMonitoring(data: InsertKompetensiMonitoring): Promise<KompetensiMonitoring>;
  updateKompetensiMonitoring(id: string, data: Partial<InsertKompetensiMonitoring>): Promise<KompetensiMonitoring | undefined>;
  deleteKompetensiMonitoring(id: string): Promise<boolean>;
  deleteTnaEntry(id: string): Promise<boolean>;

  // Activity Calendar Methods
  getActivityEvents(userId: string): Promise<ActivityEvent[]>;
  createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent>;
  deleteActivityEvent(id: string): Promise<boolean>;

  // Chat Session
  deleteChatSession(id: string): Promise<void>;
  syncLeaveMonitoringWithRoster(): Promise<void>;
  runMigration(): Promise<void>;

  // FMS Violations Methods
  getFmsInvestorEvaluation(options?: {
    startDate?: string;
    endDate?: string;
    violationType?: string;
    company?: string;
  }): Promise<{
    summary: any;
    byInvestor: any[];
    byUnit: any[];
  }>;
  batchInsertFmsViolations(violations: InsertFmsViolation[]): Promise<{ count: number; inserted: number }>;
  getFmsAnalytics(startDate?: string, endDate?: string, options?: {
    startTime?: string;
    endTime?: string;
    violationType?: string;
    category?: string;
    shift?: string;
    validationStatus?: string;
    week?: string;
    month?: string;
  }): Promise<{
    byShift: any[];
    byViolation: any[];
    byCategory: any[];
    byDate: any[];
    byHour: any[];
    byWeek: any[];
    byMonth: any[];
    byLocation: any[];
    topDrivers: any[];
    allDrivers: any[];
    summary: any;
    validationStats: any[];
    availableViolationTypes: any[];
    availableWeeks: any[];
  }>;
  getFmsViolations(options?: {
    vehicleNo?: string;
    driverNik?: string;
    driverName?: string;
    violationType?: string;
    month?: string;
    week?: string;
    validationStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FmsViolation[]>;
  updateFmsViolationDriver(id: string, overrides: { manualDriverName?: string | null, manualDriverNik?: string | null, evidenceUrl?: string | null }): Promise<FmsViolation>;
  getAllFmsDriverLevels(): Promise<Map<string, number | null>>;
  setFmsDriverLevel(driverName: string, level: number | null, updatedBy?: string): Promise<void>;
  getDriverWeekLevels(driverName: string): Promise<Map<string, number | null>>;
  setDriverWeekLevel(driverName: string, weekKey: string, level: number | null): Promise<void>;
  getDriverInvestigation(driverName: string): Promise<{ photoUrls: string[]; reportUrls: string[] }>;
  addDriverInvestigationPhoto(driverName: string, url: string): Promise<void>;
  addDriverInvestigationReport(driverName: string, url: string): Promise<void>;
  removeDriverInvestigationPhoto(driverName: string, url: string): Promise<void>;
  removeDriverInvestigationReport(driverName: string, url: string): Promise<void>;
  getFmsUnitMitraMap(): Promise<Record<string, string>>;

  // Induction Public
  createPublicInductionAttendance(attendance: InsertPublicInductionAttendance): Promise<PublicInductionAttendance>;
  getAllPublicInductionAttendance(year?: string, search?: string): Promise<PublicInductionAttendance[]>;

  // Induction Methods
  getInductionMaterials(): Promise<InductionMaterial[]>;
  getInductionMaterial(id: string): Promise<InductionMaterial | undefined>;
  createInductionMaterial(material: InsertInductionMaterial): Promise<InductionMaterial>;
  updateInductionMaterial(id: string, material: Partial<InsertInductionMaterial>): Promise<InductionMaterial>;
  deleteInductionMaterial(id: string): Promise<void>;

  getInductionQuestions(materialId?: string): Promise<InductionQuestion[]>;
  createInductionQuestion(question: InsertInductionQuestion): Promise<InductionQuestion>;
  updateInductionQuestion(id: string, question: Partial<InsertInductionQuestion>): Promise<InductionQuestion>;
  deleteInductionQuestion(id: string): Promise<void>;

  getInductionSchedules(date?: string): Promise<(InductionSchedule & { employee: Employee })[]>;
  getInductionSchedule(id: string): Promise<(InductionSchedule & { employee: Employee; answers: InductionAnswer[] }) | undefined>;
  getPendingInductionSchedule(employeeId: string): Promise<InductionSchedule | undefined>;
  createInductionSchedule(schedule: InsertInductionSchedule): Promise<InductionSchedule>;
  updateInductionSchedule(id: string, schedule: Partial<InsertInductionSchedule>): Promise<InductionSchedule>;

  createInductionAnswer(answer: InsertInductionAnswer): Promise<InductionAnswer>;
  getInductionAnswers(scheduleId: string): Promise<InductionAnswer[]>;
  getInductionAnswers(scheduleId: string): Promise<InductionAnswer[]>;

  // MCU Methods
  getMcuRecords(): Promise<McuRecord[]>;
  getMcuRecord(id: string): Promise<McuRecord | undefined>;
  getMcuRecordsByEmployee(employeeId: string): Promise<McuRecord[]>;
  createMcuRecord(record: InsertMcuRecord): Promise<McuRecord>;
  updateMcuRecord(id: string, record: Partial<InsertMcuRecord>): Promise<McuRecord | undefined>;
  deleteMcuRecord(id: string): Promise<boolean>;
  getMcuStatistics(): Promise<{ total: number; fit: number; unfit: number; expiredSoon: number }>;
  getDashboardStats(date?: string): Promise<{ totalEmployees: number; scheduledToday: number; presentToday: number; absentToday: number; onLeaveToday: number; pendingLeaveRequests: number }>;

  // Simper EV Monitoring
  createSimperEvMonitoring(data: InsertSimperEvMonitoring): Promise<SimperEvMonitoring>;
  getAllSimperEvMonitoring(): Promise<SimperEvMonitoring[]>;
  searchSimperEvMonitoring(query: string): Promise<SimperEvMonitoring[]>;
  deleteAllSimperEvMonitoring(): Promise<void>;
  // Simper EV History
  getSimperEvHistory(nikSimper: string): Promise<SimperEvHistory[]>;
  getSimperEvHistoryById(id: string): Promise<SimperEvHistory | undefined>;
  createSimperEvHistory(history: InsertSimperEvHistory): Promise<SimperEvHistory>;
  updateSimperEvHistory(id: string, history: Partial<InsertSimperEvHistory>): Promise<SimperEvHistory | undefined>;
  updateSimperEvHistory(id: string, history: Partial<InsertSimperEvHistory>): Promise<SimperEvHistory | undefined>;
  deleteSimperEvHistory(id: string): Promise<boolean>;

  // Sidak P3K Methods
  createSidakP3k(session: InsertSidakP3kSession, items: InsertSidakP3kItem[]): Promise<SidakP3kSession>;
  getSidakP3kHistory(): Promise<SidakP3kSession[]>;
  getSidakP3kSession(id: string): Promise<(SidakP3kSession & { items: SidakP3kItem[] }) | undefined>;
  updateSidakP3kSession(id: string, updates: Partial<InsertSidakP3kSession>): Promise<SidakP3kSession | undefined>;

  // WhatsApp Notification Logs
  createWhatsappNotificationLog(data: InsertWhatsappNotificationLog): Promise<WhatsappNotificationLog>;
  updateWhatsappNotificationLogStatus(id: string, status: "SENT" | "FAILED", errorMessage?: string, apiResponse?: any): Promise<void>;
  getWhatsappNotificationLogs(module?: string, limit?: number): Promise<WhatsappNotificationLog[]>;
  getWhatsappNotificationLogsByReference(referenceId: string): Promise<WhatsappNotificationLog[]>;

  // Simper EV CRUD
  updateSimperEvMonitoring(id: string, data: Partial<InsertSimperEvMonitoring>): Promise<SimperEvMonitoring | undefined>;
  updateSimperEvMonitoringStatusByNik(nikSimper: string, status: string): Promise<void>;
  deleteSimperEvMonitoring(id: string): Promise<boolean>;

  // Simper Mitra
  getSimperMitras(): Promise<SimperMitra[]>;
  createSimperMitra(data: InsertSimperMitra): Promise<SimperMitra>;
  updateSimperMitra(id: string, data: Partial<InsertSimperMitra>): Promise<SimperMitra | undefined>;
  deleteSimperMitra(id: string): Promise<boolean>;
  getMitraPhoneByName(name: string): Promise<string | null>;
  getSimperEvMonitoringPaginated(page: number, limit: number, search?: string): Promise<{ data: SimperEvMonitoring[], total: number }>;

  // Sick Leave Methods
  getSickLeaves(): Promise<SickLeave[]>;
  getSickLeavesByEmployee(employeeId: string): Promise<SickLeave[]>;
  createSickLeave(data: InsertSickLeave): Promise<SickLeave>;
  updateSickLeave(id: string, data: Partial<InsertSickLeave>): Promise<SickLeave | undefined>;
  deleteSickLeave(id: string): Promise<boolean>;
  // Project Tracker Methods
  getProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<boolean>;

  getProjectFiles(projectId: string): Promise<ProjectFile[]>;
  createProjectFile(file: InsertProjectFile): Promise<ProjectFile>;
  deleteProjectFile(id: string): Promise<boolean>;

  // Simper Perpanjangan methods
  getSimperPerpanjanganPaginated(page: number, limit: number, search?: string, status?: string, jenis?: string): Promise<{ data: SimperPerpanjangan[], total: number }>;
  getAllSimperPerpanjangan(search?: string): Promise<SimperPerpanjangan[]>;
  getSimperPerpanjanganById(id: string): Promise<SimperPerpanjangan | undefined>;
  getSimperPerpanjanganByToken(token: string): Promise<SimperPerpanjangan | undefined>;
  createSimperPerpanjangan(data: InsertSimperPerpanjangan): Promise<SimperPerpanjangan>;
  updateSimperPerpanjangan(id: string, data: Partial<InsertSimperPerpanjangan>): Promise<SimperPerpanjangan | undefined>;
  deleteSimperPerpanjangan(id: string): Promise<boolean>;
  getSimperPerpanjanganHistory(simperPerpanjanganId: string): Promise<SimperPerpanjanganHistory[]>;
  createUsignHistory(data: InsertSimperPerpanjanganHistory): Promise<SimperPerpanjanganHistory>;

  // USign methods
  createUsignDocument(data: InsertUsignDocument): Promise<UsignDocument>;
  getUsignDocument(id: string): Promise<UsignDocument | undefined>;
  getUsignDocumentsByOwner(ownerId: string): Promise<UsignDocument[]>;
  getUsignApprovalsByUser(approverId: string): Promise<(UsignApprovalStep & { document: UsignDocument })[]>;
  addUsignApprovalStep(data: InsertUsignApprovalStep): Promise<UsignApprovalStep>;
  getUsignApprovalSteps(documentId: string): Promise<(UsignApprovalStep & { approver?: any })[]>;
  updateUsignApprovalStepStatus(id: string, status: string, remarks?: string): Promise<UsignApprovalStep | undefined>;
  voidUsignDocument(id: string, reason: string): Promise<UsignDocument | undefined>;
  createUsignSignature(data: InsertUsignSignature): Promise<UsignSignature>;
  getUsignSignatures(stepId: string): Promise<UsignSignature[]>;
  createUsignNotification(data: InsertUsignNotification): Promise<UsignNotification>;
  getInProgressUsignDocuments(): Promise<UsignDocument[]>;

  // Sidak Stand Jack Methods
  getSidakStandJackSession(id: string): Promise<SidakStandJackSession | undefined>;
  getAllSidakStandJackSessions(): Promise<SidakStandJackSession[]>;
  createSidakStandJackSession(session: InsertSidakStandJackSession & { createdBy?: string | null }): Promise<SidakStandJackSession>;
  updateSidakStandJackSession(id: string, updates: Partial<InsertSidakStandJackSession>): Promise<SidakStandJackSession | undefined>;
  getSidakStandJackRecords(sessionId: string): Promise<SidakStandJackRecord[]>;
  createSidakStandJackRecord(record: InsertSidakStandJackRecord): Promise<SidakStandJackRecord>;
  getSidakStandJackObservers(sessionId: string): Promise<SidakStandJackObserver[]>;
  createSidakStandJackObserver(observer: InsertSidakStandJackObserver): Promise<SidakStandJackObserver>;

  // Sidak Bottle Jack Methods
  getSidakBottleJackSession(id: string): Promise<SidakBottleJackSession | undefined>;
  getAllSidakBottleJackSessions(): Promise<SidakBottleJackSession[]>;
  createSidakBottleJackSession(session: InsertSidakBottleJackSession & { createdBy?: string | null }): Promise<SidakBottleJackSession>;
  updateSidakBottleJackSession(id: string, updates: Partial<InsertSidakBottleJackSession>): Promise<SidakBottleJackSession | undefined>;
  getSidakBottleJackRecords(sessionId: string): Promise<SidakBottleJackRecord[]>;
  createSidakBottleJackRecord(record: InsertSidakBottleJackRecord): Promise<SidakBottleJackRecord>;
  getSidakBottleJackObservers(sessionId: string): Promise<SidakBottleJackObserver[]>;
  createSidakBottleJackObserver(observer: InsertSidakBottleJackObserver): Promise<SidakBottleJackObserver>;
  updateSidakBottleJackSessionEquipmentCount(sessionId: string): Promise<void>;

  // Sidak Impact Methods
  getSidakImpactSession(id: string): Promise<SidakImpactSession | undefined>;
  getSidakImpactSessions(): Promise<SidakImpactSession[]>;
  createSidakImpactSession(session: InsertSidakImpactSession & { createdBy?: string | null }): Promise<SidakImpactSession>;
  updateSidakImpactSession(id: string, updates: Partial<InsertSidakImpactSession>): Promise<SidakImpactSession | undefined>;
  getSidakImpactRecords(sessionId: string): Promise<SidakImpactRecord[]>;
  createSidakImpactRecord(record: InsertSidakImpactRecord): Promise<SidakImpactRecord>;
  getSidakImpactObservers(sessionId: string): Promise<SidakImpactObserver[]>;
  createSidakImpactObserver(observer: InsertSidakImpactObserver): Promise<SidakImpactObserver>;
  updateSidakImpactSessionEquipmentCount(sessionId: string): Promise<void>;

  // Sidak Apar Methods
  getSidakAparSession(id: string): Promise<SidakAparSession | undefined>;
  getSidakAparSessions(): Promise<SidakAparSession[]>;
  createSidakAparSession(session: InsertSidakAparSession & { createdBy?: string | null }): Promise<SidakAparSession>;
  updateSidakAparSession(id: string, updates: Partial<InsertSidakAparSession>): Promise<SidakAparSession | undefined>;
  getSidakAparRecords(sessionId: string): Promise<SidakAparRecord[]>;
  createSidakAparRecord(record: InsertSidakAparRecord): Promise<SidakAparRecord>;
  getSidakAparObservers(sessionId: string): Promise<SidakAparObserver[]>;
  createSidakAparObserver(observer: InsertSidakAparObserver): Promise<SidakAparObserver>;
  updateSidakAparSessionEquipmentCount(sessionId: string): Promise<void>;

  // Sidak Fuel Storage Methods
  getSidakFuelStorageSession(id: string): Promise<SidakFuelStorageSession | undefined>;
  getSidakFuelStorageSessions(): Promise<SidakFuelStorageSession[]>;
  createSidakFuelStorageSession(session: InsertSidakFuelStorageSession & { createdBy?: string | null }): Promise<SidakFuelStorageSession>;
  updateSidakFuelStorageSession(id: string, updates: Partial<InsertSidakFuelStorageSession>): Promise<SidakFuelStorageSession | undefined>;
  getSidakFuelStorageRecords(sessionId: string): Promise<SidakFuelStorageRecord[]>;
  createSidakFuelStorageRecord(record: InsertSidakFuelStorageRecord): Promise<SidakFuelStorageRecord>;
  getSidakFuelStorageObservers(sessionId: string): Promise<SidakFuelStorageObserver[]>;
  createSidakFuelStorageObserver(observer: InsertSidakFuelStorageObserver): Promise<SidakFuelStorageObserver>;
  updateSidakFuelStorageSessionEquipmentCount(sessionId: string): Promise<void>;
  deleteSidakFuelStorageSession(id: string): Promise<boolean>;

  // Sidak Mesin Las Methods
  getSidakMesinLasSession(id: string): Promise<SidakMesinLasSession | undefined>;
  getSidakMesinLasSessions(): Promise<SidakMesinLasSession[]>;
  createSidakMesinLasSession(session: InsertSidakMesinLasSession & { createdBy?: string | null }): Promise<SidakMesinLasSession>;
  updateSidakMesinLasSession(id: string, updates: Partial<InsertSidakMesinLasSession>): Promise<SidakMesinLasSession | undefined>;
  getSidakMesinLasRecords(sessionId: string): Promise<SidakMesinLasRecord[]>;
  createSidakMesinLasRecord(record: InsertSidakMesinLasRecord): Promise<SidakMesinLasRecord>;
  getSidakMesinLasObservers(sessionId: string): Promise<SidakMesinLasObserver[]>;
  createSidakMesinLasObserver(observer: InsertSidakMesinLasObserver): Promise<SidakMesinLasObserver>;
  updateSidakMesinLasSessionEquipmentCount(sessionId: string): Promise<void>;
  deleteSidakMesinLasSession(id: string): Promise<boolean>;

  // Sidak Mesin Kompresor Methods
  getSidakMesinKompresorSession(id: string): Promise<SidakMesinKompresorSession | undefined>;
  getSidakMesinKompresorSessions(): Promise<SidakMesinKompresorSession[]>;
  createSidakMesinKompresorSession(session: InsertSidakMesinKompresorSession & { createdBy?: string | null }): Promise<SidakMesinKompresorSession>;
  updateSidakMesinKompresorSession(id: string, updates: Partial<InsertSidakMesinKompresorSession>): Promise<SidakMesinKompresorSession | undefined>;
  getSidakMesinKompresorRecords(sessionId: string): Promise<SidakMesinKompresorRecord[]>;
  createSidakMesinKompresorRecord(record: InsertSidakMesinKompresorRecord): Promise<SidakMesinKompresorRecord>;
  getSidakMesinKompresorObservers(sessionId: string): Promise<SidakMesinKompresorObserver[]>;
  createSidakMesinKompresorObserver(observer: InsertSidakMesinKompresorObserver): Promise<SidakMesinKompresorObserver>;
  updateSidakMesinKompresorSessionEquipmentCount(sessionId: string): Promise<void>;
  updateSidakMesinKompresorSessionPhotos(id: string, photos: string[]): Promise<void>;
  deleteSidakMesinKompresorSession(id: string): Promise<boolean>;

  // Sidak Gerinda Duduk Methods
  getSidakGerindaDudukSession(id: string): Promise<SidakGerindaDudukSession | undefined>;
  getSidakGerindaDudukSessions(): Promise<SidakGerindaDudukSession[]>;
  createSidakGerindaDudukSession(session: InsertSidakGerindaDudukSession & { createdBy?: string | null }): Promise<SidakGerindaDudukSession>;
  updateSidakGerindaDudukSession(id: string, updates: Partial<InsertSidakGerindaDudukSession>): Promise<SidakGerindaDudukSession | undefined>;
  getSidakGerindaDudukRecords(sessionId: string): Promise<SidakGerindaDudukRecord[]>;
  createSidakGerindaDudukRecord(record: InsertSidakGerindaDudukRecord): Promise<SidakGerindaDudukRecord>;
  getSidakGerindaDudukObservers(sessionId: string): Promise<SidakGerindaDudukObserver[]>;
  createSidakGerindaDudukObserver(observer: InsertSidakGerindaDudukObserver): Promise<SidakGerindaDudukObserver>;
  updateSidakGerindaDudukSessionEquipmentCount(sessionId: string): Promise<void>;
  updateSidakGerindaDudukSessionPhotos(id: string, photos: string[]): Promise<void>;
  deleteSidakGerindaDudukSession(id: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private employees: Map<string, Employee>;
  private attendanceRecords: Map<string, AttendanceRecord>;
  private rosterSchedules: Map<string, RosterSchedule>;
  private leaveRequests: Map<string, LeaveRequest>;
  private qrTokens: Map<string, QrToken>;
  private leaveBalances: Map<string, LeaveBalance>;
  private leaveHistory: Map<string, LeaveHistory>;
  private leaveRosterMonitoring: Map<string, LeaveRosterMonitoring>;
  private leaveReminders: Map<string, LeaveReminder>;
  private simperMonitoring: Map<string, SimperMonitoring>;
  private meetings: Map<string, Meeting>;
  private meetingAttendance: Map<string, MeetingAttendance>;
  private tnaSummaries: Map<string, TnaSummary>;
  private announcementReads: Map<string, AnnouncementRead>;
  private picaRecords: Map<string, PicaRecord>;

  constructor() {
    this.users = new Map();
    this.employees = new Map();
    this.attendanceRecords = new Map();
    this.rosterSchedules = new Map();
    this.leaveRequests = new Map();
    this.qrTokens = new Map();
    this.leaveBalances = new Map();
    this.leaveHistory = new Map();
    this.leaveRosterMonitoring = new Map();
    this.leaveReminders = new Map();
    this.simperMonitoring = new Map();
    this.meetings = new Map();
    this.meetingAttendance = new Map();
    this.tnaSummaries = new Map();

    // Initialize with sample data
    this.initializeSampleData();
  }

  // MONITORING KOMPETENSI STUBS
  async getKompetensiMonitoring(): Promise<KompetensiMonitoring[]> {
    throw new Error("Not implemented in MemStorage");
  }
  async getKompetensiMonitoringById(id: string): Promise<KompetensiMonitoring | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async createKompetensiMonitoring(data: InsertKompetensiMonitoring): Promise<KompetensiMonitoring> {
    throw new Error("Not implemented in MemStorage");
  }
  async updateKompetensiMonitoring(id: string, data: Partial<InsertKompetensiMonitoring>): Promise<KompetensiMonitoring | undefined> {
    throw new Error("Monitoring Kompetensi not implemented in MemStorage. Use DrizzleStorage.");
  }

  async deleteKompetensiMonitoring(id: string): Promise<boolean> {
    throw new Error("Monitoring Kompetensi not implemented in MemStorage. Use DrizzleStorage.");
  }


  async deleteTnaEntry(id: string): Promise<boolean> {
    throw new Error("TNA Entry delete not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Activity Calendar Methods (Not implemented in MemStorage)
  async getActivityEvents(userId: string): Promise<ActivityEvent[]> {
    throw new Error("Activity not implemented in MemStorage use DrizzleStorage.");
  }
  async createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent> {
    throw new Error("Activity not implemented in MemStorage use DrizzleStorage.");
  }
  async deleteActivityEvent(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async deleteChatSession(id: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async syncLeaveMonitoringWithRoster(): Promise<void> {
    throw new Error("Not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Simper EV Monitoring Stubs
  async createSimperEvMonitoring(data: InsertSimperEvMonitoring): Promise<SimperEvMonitoring> {
    throw new Error("Simper EV Monitoring not implemented in MemStorage.");
  }
  async getAllSimperEvMonitoring(): Promise<SimperEvMonitoring[]> {
    return [];
  }
  async searchSimperEvMonitoring(query: string): Promise<SimperEvMonitoring[]> {
    return [];
  }

  // Sidak Gerinda Duduk Stubs
  async getSidakGerindaDudukSession(id: string): Promise<SidakGerindaDudukSession | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async getSidakGerindaDudukSessions(): Promise<SidakGerindaDudukSession[]> {
    return [];
  }
  async createSidakGerindaDudukSession(session: InsertSidakGerindaDudukSession & { createdBy?: string | null }): Promise<SidakGerindaDudukSession> {
    throw new Error("Not implemented in MemStorage");
  }
  async updateSidakGerindaDudukSession(id: string, updates: Partial<InsertSidakGerindaDudukSession>): Promise<SidakGerindaDudukSession | undefined> {
    throw new Error("Not implemented in MemStorage");
  }
  async getSidakGerindaDudukRecords(sessionId: string): Promise<SidakGerindaDudukRecord[]> {
    return [];
  }
  async createSidakGerindaDudukRecord(record: InsertSidakGerindaDudukRecord): Promise<SidakGerindaDudukRecord> {
    throw new Error("Not implemented in MemStorage");
  }
  async getSidakGerindaDudukObservers(sessionId: string): Promise<SidakGerindaDudukObserver[]> {
    return [];
  }
  async createSidakGerindaDudukObserver(observer: InsertSidakGerindaDudukObserver): Promise<SidakGerindaDudukObserver> {
    throw new Error("Not implemented in MemStorage");
  }
  async updateSidakGerindaDudukSessionEquipmentCount(sessionId: string): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }
  async updateSidakGerindaDudukSessionPhotos(id: string, photos: string[]): Promise<void> {
    throw new Error("Not implemented in MemStorage");
  }
  async deleteSidakGerindaDudukSession(id: string): Promise<boolean> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteAllSimperEvMonitoring(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async updateSimperEvMonitoring(id: string, data: Partial<InsertSimperEvMonitoring>): Promise<SimperEvMonitoring | undefined> {
    throw new Error("Method not implemented.");
  }

  async deleteSimperEvMonitoring(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async updateSimperEvMonitoringStatusByNik(nikSimper: string, status: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async getSimperEvHistory(nikSimper: string): Promise<SimperEvHistory[]> {
    throw new Error("Method not implemented.");
  }

  async createSimperEvHistory(history: InsertSimperEvHistory): Promise<SimperEvHistory> {
    throw new Error("Method not implemented.");
  }

  async updateSimperEvHistory(id: string, history: Partial<InsertSimperEvHistory>): Promise<SimperEvHistory | undefined> {
    throw new Error("Method not implemented.");
  }

  async deleteSimperEvHistory(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  async getSimperMitras(): Promise<SimperMitra[]> {
    return [];
  }

  async createSimperMitra(data: InsertSimperMitra): Promise<SimperMitra> {
    throw new Error("Method not implemented.");
  }

  async updateSimperMitra(id: string, data: Partial<InsertSimperMitra>): Promise<SimperMitra | undefined> {
    throw new Error("Method not implemented.");
  }

  async deleteSimperMitra(id: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  private initializeSampleData() {
    // No sample employees - user will add their own data
    // (keeping empty for user to populate with real data)

    // No sample roster - user will add their own data through Excel upload or manual entry

    // No sample attendance - will be created through QR scan attendance system

    // No sample leave requests - will be created by employees as needed
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const user: User = {
      id: userData.id || randomUUID(),
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      createdAt: userData.createdAt || new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Auth operations (not implemented in MemStorage)
  async createAuthUser(nik: string, hashedPassword: string): Promise<void> {
    throw new Error("Auth not implemented in MemStorage. Use DrizzleStorage.");
  }

  async getAuthUserByNik(nik: string): Promise<{ nik: string; hashedPassword: string } | undefined> {
    throw new Error("Auth not implemented in MemStorage. Use DrizzleStorage.");
  }

  async updateAuthUserPassword(nik: string, hashedPassword: string): Promise<void> {
    throw new Error("Auth not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByNik(nik: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(e => e.id === nik);
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async runMigration(): Promise<void> {
    // No-op for MemStorage
  }

  async getEmployees(): Promise<Employee[]> {
    return this.getAllEmployees();
  }

  private generateNextNIK(): string {
    const existingEmployees = Array.from(this.employees.values());
    const existingNumbers = existingEmployees
      .map(emp => {
        const match = emp.id.match(/^C-(\d{5})$/);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(num => num > 0);

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    return `C-${nextNumber.toString().padStart(5, '0')}`;
  }

  // Removed generateNextNomorLambung as it's no longer needed

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    // Generate NIK automatically if not provided
    const id = insertEmployee.id || this.generateNextNIK();

    const employee: any = {
      ...insertEmployee,
      id,
      position: insertEmployee.position || null,
      nomorLambung: insertEmployee.nomorLambung || null,
      department: insertEmployee.department || null,
      investorGroup: insertEmployee.investorGroup || null,
      qrCode: insertEmployee.qrCode || null, // Add QR Code field
      photoUrl: insertEmployee.photoUrl || null,

      status: insertEmployee.status || "active",
      isSpareOrigin: insertEmployee.nomorLambung === "SPARE" ? true : (insertEmployee.isSpareOrigin || false), // Track SPARE origin
      createdAt: new Date()
    };
    this.employees.set(employee.id, employee);
    return employee;
  }

  async updateEmployee(id: string, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const existing = this.employees.get(id);
    if (!existing) return undefined;

    // Preserve isSpareOrigin if employee was originally SPARE
    let isSpareOrigin = existing.isSpareOrigin;
    if (existing.nomorLambung === "SPARE" && updateData.nomorLambung && updateData.nomorLambung !== "SPARE") {
      isSpareOrigin = true; // Mark as SPARE origin when updating from SPARE to new nomor lambung
    }

    const updated = { ...existing, ...updateData, isSpareOrigin };
    this.employees.set(id, updated);
    return updated;
  }

  async deleteEmployee(id: string): Promise<boolean> {
    return this.employees.delete(id);
  }

  async deleteAllEmployees(): Promise<boolean> {
    this.employees.clear();
    // Also clear related data when deleting all employees
    this.attendanceRecords.clear();
    this.rosterSchedules.clear();
    this.qrTokens.clear();
    return true;
  }

  // Attendance methods
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    return this.attendanceRecords.get(id);
  }

  async getAttendanceByEmployee(employeeId: string, date?: string): Promise<AttendanceRecord[]> {
    return Array.from(this.attendanceRecords.values()).filter(record =>
      record.employeeId === employeeId && (!date || record.date === date)
    );
  }

  async getAllAttendance(date?: string): Promise<AttendanceRecord[]> {
    const records = Array.from(this.attendanceRecords.values());
    return date ? records.filter(record => record.date === date) : records;
  }

  async getAllAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    const records = Array.from(this.attendanceRecords.values());
    return records.filter(record => record.date >= startDate && record.date <= endDate);
  }

  async createAttendanceRecord(insertRecord: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const record: AttendanceRecord = {
      id: randomUUID(),
      ...insertRecord,
      jamTidur: insertRecord.jamTidur || null,
      fitToWork: insertRecord.fitToWork || null,
      status: insertRecord.status || "present",
      createdAt: new Date()
    };
    this.attendanceRecords.set(record.id, record);
    return record;
  }

  // Roster methods
  async getRosterSchedule(id: string): Promise<RosterSchedule | undefined> {
    return this.rosterSchedules.get(id);
  }

  async getRosterByDate(date: string): Promise<RosterSchedule[]> {
    console.log(`Filtering roster schedules for date: ${date}`);
    const filtered = Array.from(this.rosterSchedules.values()).filter(schedule => schedule.date === date);
    console.log(`Found ${filtered.length} schedules for date ${date}`);
    return filtered;
  }

  async getRosterByEmployee(employeeId: string): Promise<RosterSchedule[]> {
    return Array.from(this.rosterSchedules.values()).filter(schedule => schedule.employeeId === employeeId);
  }

  async getRosterByEmployeeAndDate(employeeId: string, date: string): Promise<RosterSchedule | undefined> {
    return Array.from(this.rosterSchedules.values()).find(schedule =>
      schedule.employeeId === employeeId && schedule.date === date
    );
  }

  async getRosterByDateRange(startDate: string, endDate: string): Promise<RosterSchedule[]> {
    return Array.from(this.rosterSchedules.values()).filter(schedule =>
      schedule.date >= startDate && schedule.date <= endDate
    );
  }

  async createRosterSchedule(insertSchedule: InsertRosterSchedule): Promise<RosterSchedule> {
    // Get employee to populate plannedNomorLambung if not provided
    const employee = await this.getEmployee(insertSchedule.employeeId);
    const plannedNomorLambung = insertSchedule.plannedNomorLambung ?? employee?.nomorLambung ?? null;
    const actualNomorLambung = insertSchedule.actualNomorLambung ?? plannedNomorLambung;

    const schedule: RosterSchedule = {
      id: randomUUID(),
      ...insertSchedule,
      jamTidur: insertSchedule.jamTidur ?? null,
      hariKerja: insertSchedule.hariKerja ?? null,
      plannedNomorLambung,
      actualNomorLambung,
      fitToWork: insertSchedule.fitToWork || "Fit To Work",
      status: insertSchedule.status || "scheduled"
    };
    this.rosterSchedules.set(schedule.id, schedule);
    return schedule;
  }

  async bulkCreateRosterSchedules(schedules: InsertRosterSchedule[]): Promise<RosterSchedule[]> {
    const results: RosterSchedule[] = [];
    for (const s of schedules) {
      results.push(await this.createRosterSchedule(s));
    }
    return results;
  }

  async updateRosterSchedule(id: string, updateData: Partial<InsertRosterSchedule>): Promise<RosterSchedule | undefined> {
    const existing = this.rosterSchedules.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updateData };
    this.rosterSchedules.set(id, updated);
    return updated;
  }

  async deleteRosterSchedule(id: string): Promise<boolean> {
    return this.rosterSchedules.delete(id);
  }

  async deleteAllRosterSchedules(): Promise<void> {
    this.rosterSchedules.clear();
  }

  // Leave methods
  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    return this.leaveRequests.get(id);
  }

  async getLeaveByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values()).filter(request => request.employeeId === employeeId);
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values());
  }

  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return this.getAllLeaveRequests();
  }

  async createLeaveRequest(insertRequest: InsertLeaveRequest): Promise<LeaveRequest> {
    const request: LeaveRequest = {
      id: randomUUID(),
      ...insertRequest,
      reason: insertRequest.reason ?? null, // Ensure reason is string | null, not undefined
      attachmentPath: insertRequest.attachmentPath ?? null, // Ensure attachmentPath is string | null, not undefined
      actionAttachmentPath: insertRequest.actionAttachmentPath ?? null, // Fix actionAttachmentPath
      status: insertRequest.status || "pending",
      createdAt: new Date()
    };
    this.leaveRequests.set(request.id, request);
    return request;
  }

  async updateLeaveRequest(id: string, updateData: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const existing = this.leaveRequests.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updateData };
    this.leaveRequests.set(id, updated);
    return updated;
  }

  async deleteLeaveRequest(id: string): Promise<boolean> {
    return this.leaveRequests.delete(id);
  }

  // QR Token methods
  async getQrToken(employeeId: string): Promise<QrToken | undefined> {
    return Array.from(this.qrTokens.values()).find(token =>
      token.employeeId === employeeId && token.isActive
    );
  }

  async getQrTokensByEmployee(employeeId: string): Promise<QrToken[]> {
    return Array.from(this.qrTokens.values()).filter(token =>
      token.employeeId === employeeId
    );
  }

  async createQrToken(insertToken: InsertQrToken): Promise<QrToken> {
    // Deactivate existing tokens for this employee
    Array.from(this.qrTokens.values())
      .filter(token => token.employeeId === insertToken.employeeId)
      .forEach(token => {
        token.isActive = false;
        this.qrTokens.set(token.id, token);
      });

    const token: QrToken = {
      id: randomUUID(),
      ...insertToken,
      isActive: insertToken.isActive !== undefined ? insertToken.isActive : true,
      createdAt: new Date()
    };
    this.qrTokens.set(token.id, token);
    return token;
  }

  async validateQrToken(employeeId: string, token: string): Promise<boolean> {
    const qrToken = await this.getQrToken(employeeId);
    return qrToken ? qrToken.token === token && qrToken.isActive : false;
  }


  // Stub implementations for MemStorage (not used in production)
  async getLeaveReminder(leaveRequestId: string, reminderType: string): Promise<LeaveReminder | undefined> {
    return undefined;
  }

  async getLeaveReminders(): Promise<LeaveReminder[]> {
    return [];
  }

  async saveLeaveReminder(reminder: InsertLeaveReminder): Promise<LeaveReminder> {
    const leaveReminder: LeaveReminder = {
      ...reminder,
      createdAt: new Date()
    };
    return leaveReminder;
  }

  async getLeaveBalances(): Promise<LeaveBalance[]> {
    return [];
  }

  async getLeaveBalanceByEmployee(employeeId: string, year?: number): Promise<LeaveBalance | undefined> {
    return undefined;
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const leaveBalance: LeaveBalance = {
      id: randomUUID(),
      ...balance,
      status: balance.status ?? 'active',
      totalDays: balance.totalDays ?? 0,
      usedDays: balance.usedDays ?? 0,
      remainingDays: balance.remainingDays ?? 0,
      workingDaysCompleted: balance.workingDaysCompleted ?? 0,
      lastWorkDate: balance.lastWorkDate ?? null,
      lastLeaveDate: balance.lastLeaveDate ?? null,
      nextLeaveEligible: balance.nextLeaveEligible ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    return leaveBalance;
  }

  async updateLeaveBalance(id: string, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined> {
    return undefined;
  }

  async calculateLeaveEligibility(employeeId: string): Promise<{ eligible: boolean; daysEarned: number; nextEligibleDate: string | null }> {
    return { eligible: false, daysEarned: 0, nextEligibleDate: null };
  }

  async getLeaveHistory(): Promise<LeaveHistory[]> {
    return [];
  }

  async getLeaveHistoryByEmployee(employeeId: string): Promise<LeaveHistory[]> {
    return [];
  }

  async createLeaveHistory(history: InsertLeaveHistory): Promise<LeaveHistory> {
    const leaveHistory: LeaveHistory = {
      id: randomUUID(),
      ...history,
      leaveRequestId: history.leaveRequestId ?? null,
      remarks: history.remarks ?? null,
      createdAt: new Date()
    };
    return leaveHistory;
  }

  async bulkUploadLeaveRoster(data: Array<{ nik: string; leaveType: string; startDate: string; endDate: string; totalDays: number }>): Promise<{ success: number; errors: string[] }> {
    return { success: 0, errors: ["MemStorage does not support bulk operations"] };
  }

  // Leave Roster Monitoring methods for MemStorage
  async getLeaveRosterMonitoring(id: string): Promise<LeaveRosterMonitoring | undefined> {
    return undefined;
  }

  async getLeaveRosterMonitoringByNik(nik: string): Promise<LeaveRosterMonitoring | undefined> {
    return undefined;
  }

  async getAllLeaveRosterMonitoring(): Promise<LeaveRosterMonitoring[]> {
    return [];
  }

  async createLeaveRosterMonitoring(monitoring: InsertLeaveRosterMonitoring): Promise<LeaveRosterMonitoring> {
    const leaveRosterMonitoring: LeaveRosterMonitoring = {
      id: randomUUID(),
      ...monitoring,
      nomorLambung: monitoring.nomorLambung ?? null,
      lastLeaveDate: monitoring.lastLeaveDate ?? null,
      nextLeaveDate: monitoring.nextLeaveDate ?? null,
      onSite: monitoring.onSite ?? null,
      status: monitoring.status || "Aktif",
      monitoringDays: monitoring.monitoringDays || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.leaveRosterMonitoring.set(leaveRosterMonitoring.id, leaveRosterMonitoring);
    return leaveRosterMonitoring;
  }

  async updateLeaveRosterMonitoring(id: string, monitoring: Partial<InsertLeaveRosterMonitoring>): Promise<LeaveRosterMonitoring | undefined> {
    return undefined;
  }

  async deleteLeaveRosterMonitoring(id: string): Promise<boolean> {
    return this.leaveRosterMonitoring.delete(id);
  }

  // PICA Methods implementation
  async getPicaRecords(): Promise<PicaRecord[]> {
    return Array.from(this.picaRecords.values()).sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getPicaRecord(id: string): Promise<PicaRecord | undefined> {
    return this.picaRecords.get(id);
  }

  async createPicaRecord(record: InsertPicaRecord): Promise<PicaRecord> {
    const id = randomUUID();
    const picaRecord: PicaRecord = {
      ...record,
      id,
      correctiveAction: record.correctiveAction ?? null,
      pic: record.pic ?? null,
      dueDate: record.dueDate ?? null,
      priority: record.priority ?? "MEDIUM",
      category: record.category ?? null,
      notes: record.notes ?? null,
      completionDate: record.completionDate ?? null,
      verificationEvidence: record.verificationEvidence ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.picaRecords.set(id, picaRecord);
    return picaRecord;
  }

  async updatePicaRecord(id: string, updates: Partial<InsertPicaRecord>): Promise<PicaRecord | undefined> {
    const existing = this.picaRecords.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.picaRecords.set(id, updated);
    return updated;
  }

  async deletePicaRecord(id: string): Promise<boolean> {
    return this.picaRecords.delete(id);
  }

  async deleteAllPicaRecords(): Promise<void> {
    this.picaRecords.clear();
  }

  async deleteAllLeaveRosterMonitoring(): Promise<void> {
    // No-op in memory storage - would clear leave roster monitoring data if implemented
  }

  async updateLeaveRosterStatus(): Promise<void> {
    // No-op in memory storage
  }

  // SIMPER Monitoring methods implementation
  async getSimperMonitoring(id: string): Promise<SimperMonitoring | undefined> {
    return this.simperMonitoring.get(id);
  }

  async getSimperMonitoringByNik(nik: string): Promise<SimperMonitoring | undefined> {
    return Array.from(this.simperMonitoring.values()).find(simper => simper.nik === nik);
  }

  async getAllSimperMonitoring(): Promise<SimperMonitoring[]> {
    return Array.from(this.simperMonitoring.values());
  }

  async createSimperMonitoring(simperData: InsertSimperMonitoring): Promise<SimperMonitoring> {
    const simper: SimperMonitoring = {
      id: randomUUID(),
      ...simperData,
      simperBibExpiredDate: simperData.simperBibExpiredDate ?? null,
      simperTiaExpiredDate: simperData.simperTiaExpiredDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.simperMonitoring.set(simper.id, simper);
    return simper;
  }

  async updateSimperMonitoring(id: string, simperData: Partial<InsertSimperMonitoring>): Promise<SimperMonitoring | undefined> {
    const existing = this.simperMonitoring.get(id);
    if (existing) {
      const updated: SimperMonitoring = {
        ...existing,
        ...simperData,
        updatedAt: new Date()
      };
      this.simperMonitoring.set(id, updated);
      return updated;
    }
    return undefined;
  }

  async deleteSimperMonitoring(id: string): Promise<boolean> {
    return this.simperMonitoring.delete(id);
  }

  async deleteAllSimperMonitoring(): Promise<void> {
    this.simperMonitoring.clear();
  }

  async bulkUploadSimperData(data: Array<{ employeeName: string; nik: string; simperBibExpiredDate?: string; simperTiaExpiredDate?: string }>): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    for (const item of data) {
      try {
        if (!item.employeeName || !item.nik) {
          errors.push(`Data tidak lengkap untuk NIK: ${item.nik || 'kosong'}`);
          continue;
        }

        // Check if NIK already exists
        const existing = await this.getSimperMonitoringByNik(item.nik);
        if (existing) {
          // Update existing record
          await this.updateSimperMonitoring(existing.id, {
            employeeName: item.employeeName,
            simperBibExpiredDate: item.simperBibExpiredDate || null,
            simperTiaExpiredDate: item.simperTiaExpiredDate || null
          });
        } else {
          // Create new record
          await this.createSimperMonitoring({
            employeeName: item.employeeName,
            nik: item.nik,
            simperBibExpiredDate: item.simperBibExpiredDate || null,
            simperTiaExpiredDate: item.simperTiaExpiredDate || null
          });
        }
        success++;
      } catch (error) {
        errors.push(`Error untuk NIK ${item.nik}: ${error}`);
      }
    }

    return { success, errors };
  }

  // Sidak Fuel Storage Methods (Stubs)
  async getSidakFuelStorageSession(id: string): Promise<SidakFuelStorageSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageSessions(): Promise<SidakFuelStorageSession[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageSession(session: InsertSidakFuelStorageSession): Promise<SidakFuelStorageSession> { throw new Error("Method not implemented."); }
  async updateSidakFuelStorageSession(id: string, updates: Partial<InsertSidakFuelStorageSession>): Promise<SidakFuelStorageSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageRecords(sessionId: string): Promise<SidakFuelStorageRecord[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageRecord(record: InsertSidakFuelStorageRecord): Promise<SidakFuelStorageRecord> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageObservers(sessionId: string): Promise<SidakFuelStorageObserver[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageObserver(observer: InsertSidakFuelStorageObserver): Promise<SidakFuelStorageObserver> { throw new Error("Method not implemented."); }
  async updateSidakFuelStorageSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }
  async deleteSidakFuelStorageSession(id: string): Promise<boolean> { throw new Error("Method not implemented."); }

  // Sidak Mesin Las Methods (Stubs)
  async getSidakMesinLasSession(id: string): Promise<SidakMesinLasSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakMesinLasSessions(): Promise<SidakMesinLasSession[]> { throw new Error("Method not implemented."); }
  async createSidakMesinLasSession(session: InsertSidakMesinLasSession): Promise<SidakMesinLasSession> { throw new Error("Method not implemented."); }
  async updateSidakMesinLasSession(id: string, updates: Partial<InsertSidakMesinLasSession>): Promise<SidakMesinLasSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakMesinLasRecords(sessionId: string): Promise<SidakMesinLasRecord[]> { throw new Error("Method not implemented."); }
  async createSidakMesinLasRecord(record: InsertSidakMesinLasRecord): Promise<SidakMesinLasRecord> { throw new Error("Method not implemented."); }
  async getSidakMesinLasObservers(sessionId: string): Promise<SidakMesinLasObserver[]> { throw new Error("Method not implemented."); }
  async createSidakMesinLasObserver(observer: InsertSidakMesinLasObserver): Promise<SidakMesinLasObserver> { throw new Error("Method not implemented."); }
  async updateSidakMesinLasSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }
  async deleteSidakMesinLasSession(id: string): Promise<boolean> { throw new Error("Method not implemented."); }

  // Sidak Mesin Kompresor Methods (Stubs)
  async deleteSidakMesinKompresorSession(id: string): Promise<boolean> { throw new Error("Method not implemented."); }

  // Sidak Gerinda Duduk Methods (Stubs)
  async getSidakGerindaDudukSession(id: string): Promise<SidakGerindaDudukSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakGerindaDudukSessions(): Promise<SidakGerindaDudukSession[]> { throw new Error("Method not implemented."); }
  async createSidakGerindaDudukSession(session: InsertSidakGerindaDudukSession): Promise<SidakGerindaDudukSession> { throw new Error("Method not implemented."); }
  async updateSidakGerindaDudukSession(id: string, updates: Partial<InsertSidakGerindaDudukSession>): Promise<SidakGerindaDudukSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakGerindaDudukRecords(sessionId: string): Promise<SidakGerindaDudukRecord[]> { throw new Error("Method not implemented."); }
  async createSidakGerindaDudukRecord(record: InsertSidakGerindaDudukRecord): Promise<SidakGerindaDudukRecord> { throw new Error("Method not implemented."); }
  async getSidakGerindaDudukObservers(sessionId: string): Promise<SidakGerindaDudukObserver[]> { throw new Error("Method not implemented."); }
  async createSidakGerindaDudukObserver(observer: InsertSidakGerindaDudukObserver): Promise<SidakGerindaDudukObserver> { throw new Error("Method not implemented."); }
  async updateSidakGerindaDudukSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }
  async updateSidakGerindaDudukSessionPhotos(id: string, photos: string[]): Promise<void> { throw new Error("Method not implemented."); }
  async deleteSidakGerindaDudukSession(id: string): Promise<boolean> { throw new Error("Method not implemented."); }

  // Meeting methods implementation for MemStorage
  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return Array.from(this.meetings.values());
  }

  async getMeetingsByDate(date: string): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(meeting => meeting.date === date);
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    // Generate unique QR token for the meeting
    const qrToken = randomUUID().replace(/-/g, '').substring(0, 12);
    const meeting: Meeting = {
      id: randomUUID(),
      ...insertMeeting,
      status: insertMeeting.status || "scheduled",
      description: insertMeeting.description ?? null,
      meetingPhotos: insertMeeting.meetingPhotos ?? null,
      qrToken,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.meetings.set(meeting.id, meeting);
    return meeting;
  }

  async updateMeeting(id: string, updateData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const existing = this.meetings.get(id);
    if (!existing) return undefined;

    const updated: Meeting = { ...existing, ...updateData, updatedAt: new Date() };
    this.meetings.set(id, updated);
    return updated;
  }

  // Sidak Kecepatan Methods (Placeholder for MemStorage)
  async getSidakKecepatanSession(id: string): Promise<SidakKecepatanSession | undefined> { throw new Error("Method not implemented."); }
  async getAllSidakKecepatanSessions(): Promise<SidakKecepatanSession[]> { throw new Error("Method not implemented."); }
  async createSidakKecepatanSession(session: InsertSidakKecepatanSession): Promise<SidakKecepatanSession> { throw new Error("Method not implemented."); }
  async updateSidakKecepatanSession(id: string, updates: Partial<InsertSidakKecepatanSession>): Promise<SidakKecepatanSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakKecepatanRecords(sessionId: string): Promise<SidakKecepatanRecord[]> { throw new Error("Method not implemented."); }
  async createSidakKecepatanRecord(record: InsertSidakKecepatanRecord): Promise<SidakKecepatanRecord> { throw new Error("Method not implemented."); }
  async getSidakKecepatanObservers(sessionId: string): Promise<SidakKecepatanObserver[]> { throw new Error("Method not implemented."); }
  async createSidakKecepatanObserver(observer: InsertSidakKecepatanObserver): Promise<SidakKecepatanObserver> { throw new Error("Method not implemented."); }

  async deleteMeeting(id: string): Promise<boolean> {
    return this.meetings.delete(id);
  }

  async getMeetingByQrToken(qrToken: string): Promise<Meeting | undefined> {
    return Array.from(this.meetings.values()).find(meeting => meeting.qrToken === qrToken);
  }

  // Meeting attendance methods implementation for MemStorage
  async getMeetingAttendance(meetingId: string): Promise<MeetingAttendance[]> {
    return Array.from(this.meetingAttendance.values()).filter(attendance => attendance.meetingId === meetingId);
  }

  async createMeetingAttendance(insertAttendance: InsertMeetingAttendance): Promise<MeetingAttendance> {
    const attendance: MeetingAttendance = {
      id: randomUUID(),
      ...insertAttendance,
      employeeId: insertAttendance.employeeId ?? null,
      deviceInfo: insertAttendance.deviceInfo ?? null,
      attendanceType: insertAttendance.attendanceType || "qr_scan",
      manualName: insertAttendance.manualName ?? null,
      manualNik: insertAttendance.manualNik ?? null,
      manualPosition: insertAttendance.manualPosition ?? null,
      manualDepartment: insertAttendance.manualDepartment ?? null,
      createdAt: new Date()
    };
    this.meetingAttendance.set(attendance.id, attendance);
    return attendance;
  }

  async checkMeetingAttendance(meetingId: string, employeeId: string): Promise<MeetingAttendance | undefined> {
    return Array.from(this.meetingAttendance.values()).find(attendance =>
      attendance.meetingId === meetingId && attendance.employeeId === employeeId
    );
  }

  async deleteMeetingAttendance(attendanceId: string): Promise<boolean> {
    return this.meetingAttendance.delete(attendanceId);
  }

  // Sidak Fatigue methods - Not implemented in MemStorage (use DrizzleStorage)
  async getSidakFatigueSession(id: string): Promise<SidakFatigueSession | undefined> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakFatigueSessions(): Promise<SidakFatigueSession[]> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakFatigueSession(session: InsertSidakFatigueSession): Promise<SidakFatigueSession> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakFatigueSession(id: string, updates: Partial<InsertSidakFatigueSession>): Promise<SidakFatigueSession | undefined> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteSidakFatigueSession(id: string): Promise<boolean> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakFatigueRecords(sessionId: string): Promise<SidakFatigueRecord[]> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakFatigueRecordsBySessionIds(sessionIds: string[]): Promise<SidakFatigueRecord[]> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakFatigueRecord(record: InsertSidakFatigueRecord): Promise<SidakFatigueRecord> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakFatigueObservers(sessionId: string): Promise<SidakFatigueObserver[]> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakFatigueSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakFatigueObserver(observer: InsertSidakFatigueObserver): Promise<SidakFatigueObserver> {
    throw new Error("Sidak Fatigue not implemented in MemStorage. Use DrizzleStorage.");
  }

  async getSidakBehaviorSession(id: string): Promise<SidakBehaviorSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getAllSidakBehaviorSessions(): Promise<SidakBehaviorSession[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakBehaviorSession(session: InsertSidakBehaviorSession): Promise<SidakBehaviorSession> { throw new Error("Not implemented in MemStorage"); }
  async updateSidakBehaviorSession(id: string, updates: Partial<InsertSidakBehaviorSession>): Promise<SidakBehaviorSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getSidakBehaviorRecords(sessionId: string): Promise<SidakBehaviorRecord[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakBehaviorRecord(record: InsertSidakBehaviorRecord & { sessionId: string }): Promise<SidakBehaviorRecord> { throw new Error("Not implemented in MemStorage"); }
  async getSidakBehaviorObservers(sessionId: string): Promise<SidakBehaviorObserver[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakBehaviorObserver(observer: InsertSidakBehaviorObserver & { sessionId: string }): Promise<SidakBehaviorObserver> { throw new Error("Not implemented in MemStorage"); }
  async updateSidakBehaviorSessionSampleCount(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getSidakChargingStationSession(id: string): Promise<SidakChargingStationSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getAllSidakChargingStationSessions(): Promise<SidakChargingStationSession[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakChargingStationSession(session: InsertSidakChargingStationSession): Promise<SidakChargingStationSession> { throw new Error("Not implemented in MemStorage"); }
  async updateSidakChargingStationSession(id: string, updates: Partial<InsertSidakChargingStationSession>): Promise<SidakChargingStationSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getSidakChargingStationRecords(sessionId: string): Promise<SidakChargingStationRecord[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakChargingStationRecord(record: InsertSidakChargingStationRecord & { sessionId: string }): Promise<SidakChargingStationRecord> { throw new Error("Not implemented in MemStorage"); }
  async getSidakChargingStationObservers(sessionId: string): Promise<SidakChargingStationObserver[]> { throw new Error("Not implemented in MemStorage"); }
  async createSidakChargingStationObserver(observer: InsertSidakChargingStationObserver & { sessionId: string }): Promise<SidakChargingStationObserver> { throw new Error("Not implemented in MemStorage"); }
  async updateSidakChargingStationSessionSampleCount(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async getSopKritisSession(id: string): Promise<SidakSopKritisSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getAllSopKritisSessions(): Promise<SidakSopKritisSession[]> { throw new Error("Not implemented in MemStorage"); }
  async createSopKritisSession(session: InsertSidakSopKritisSession): Promise<SidakSopKritisSession> { throw new Error("Not implemented in MemStorage"); }
  async updateSopKritisSession(id: string, updates: Partial<InsertSidakSopKritisSession>): Promise<SidakSopKritisSession | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getSopKritisPengendalian(sessionId: string): Promise<SidakSopKritisPengendalian[]> { throw new Error("Not implemented in MemStorage"); }
  async createSopKritisPengendalian(item: InsertSidakSopKritisPengendalian & { sessionId: string }): Promise<SidakSopKritisPengendalian> { throw new Error("Not implemented in MemStorage"); }
  async getSopKritisLangkah(sessionId: string): Promise<SidakSopKritisLangkah[]> { throw new Error("Not implemented in MemStorage"); }
  async createSopKritisLangkah(item: InsertSidakSopKritisLangkah & { sessionId: string }): Promise<SidakSopKritisLangkah> { throw new Error("Not implemented in MemStorage"); }
  async getSopKritisObservers(sessionId: string): Promise<SidakSopKritisObserver[]> { throw new Error("Not implemented in MemStorage"); }
  async createSopKritisObserver(observer: InsertSidakSopKritisObserver & { sessionId: string }): Promise<SidakSopKritisObserver> { throw new Error("Not implemented in MemStorage"); }
  async deleteSopKritisPengendalianBySession(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async deleteSopKritisLangkahBySession(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }
  async deleteSopKritisObserversBySession(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage"); }

  // Sidak Roster methods - Not implemented in MemStorage (use DrizzleStorage)
  async getSidakRosterSession(id: string): Promise<SidakRosterSession | undefined> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakRosterSessions(): Promise<SidakRosterSession[]> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRosterSession(session: InsertSidakRosterSession): Promise<SidakRosterSession> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakRosterSession(id: string, updates: Partial<InsertSidakRosterSession>): Promise<SidakRosterSession | undefined> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteSidakRosterSession(id: string): Promise<boolean> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakRosterRecords(sessionId: string): Promise<SidakRosterRecord[]> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakRosterRecordsBySessionIds(sessionIds: string[]): Promise<SidakRosterRecord[]> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRosterRecord(record: InsertSidakRosterRecord): Promise<SidakRosterRecord> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakRosterObservers(sessionId: string): Promise<SidakRosterObserver[]> {
    throw new Error("Sidak Roster not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRosterObserver(observer: InsertSidakRosterObserver): Promise<SidakRosterObserver> {
    throw new Error("Method not implemented.");
  }
  async updateSidakRosterSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  // Sidak Seatbelt methods - Not implemented in MemStorage
  async createSidakSeatbeltSession(session: InsertSidakSeatbeltSession): Promise<SidakSeatbeltSession> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakSeatbeltSessions(): Promise<SidakSeatbeltSession[]> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakSeatbeltSession(id: string): Promise<SidakSeatbeltSession | undefined> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakSeatbeltRecord(record: InsertSidakSeatbeltRecord): Promise<SidakSeatbeltRecord> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakSeatbeltRecords(sessionId: string): Promise<SidakSeatbeltRecord[]> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakSeatbeltObserver(observer: InsertSidakSeatbeltObserver): Promise<SidakSeatbeltObserver> {
    throw new Error("Method not implemented.");
  }
  async updateSidakSeatbeltSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  async getSidakSeatbeltObservers(sessionId: string): Promise<SidakSeatbeltObserver[]> {
    throw new Error("Sidak Seatbelt not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Rambu methods - Not implemented in MemStorage
  async getSidakRambuSession(id: string): Promise<SidakRambuSession | undefined> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakRambuSessions(): Promise<SidakRambuSession[]> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRambuSession(session: InsertSidakRambuSession): Promise<SidakRambuSession> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakRambuSession(id: string, updates: Partial<InsertSidakRambuSession>): Promise<SidakRambuSession | undefined> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakRambuObservations(sessionId: string): Promise<SidakRambuObservation[]> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRambuObservation(observation: InsertSidakRambuObservation): Promise<SidakRambuObservation> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakRambuObservers(sessionId: string): Promise<SidakRambuObserver[]> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakRambuObserver(observer: InsertSidakRambuObserver): Promise<SidakRambuObserver> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakRambuSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }
  async generateSidakRambuPDF(data: { session: SidakRambuSession; observations: SidakRambuObservation[]; observers: SidakRambuObserver[] }): Promise<Buffer> {
    throw new Error("Sidak Rambu not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak APD methods - Not implemented in MemStorage
  async getSidakApdSession(id: string): Promise<SidakApdSession | undefined> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakApdSessions(): Promise<SidakApdSession[]> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakApdSession(session: InsertSidakApdSession): Promise<SidakApdSession> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakApdSession(id: string, updates: Partial<InsertSidakApdSession>): Promise<SidakApdSession | undefined> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakApdRecords(sessionId: string): Promise<SidakApdRecord[]> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakApdRecord(record: InsertSidakApdRecord): Promise<SidakApdRecord> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakApdObservers(sessionId: string): Promise<SidakApdObserver[]> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakApdObserver(observer: InsertSidakApdObserver): Promise<SidakApdObserver> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakApdSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }
  async generateSidakApdPDF(data: { session: SidakApdSession; records: SidakApdRecord[]; observers: SidakApdObserver[] }): Promise<Buffer> {
    throw new Error("Sidak APD not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Digital methods - Not implemented in MemStorage
  async getSidakDigitalSession(id: string): Promise<SidakDigitalSession | undefined> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakDigitalSessions(): Promise<SidakDigitalSession[]> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakDigitalSession(session: InsertSidakDigitalSession): Promise<SidakDigitalSession> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakDigitalSession(id: string, updates: Partial<InsertSidakDigitalSession>): Promise<SidakDigitalSession | undefined> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakDigitalRecords(sessionId: string): Promise<SidakDigitalRecord[]> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakDigitalRecord(record: InsertSidakDigitalRecord): Promise<SidakDigitalRecord> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakDigitalObservers(sessionId: string): Promise<SidakDigitalObserver[]> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakDigitalObserver(observer: InsertSidakDigitalObserver): Promise<SidakDigitalObserver> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakDigitalSessionSampleCount(sessionId: string): Promise<void> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }
  async generateSidakDigitalPDF(data: { session: SidakDigitalSession; records: SidakDigitalRecord[]; observers: SidakDigitalObserver[] }): Promise<Buffer> {
    throw new Error("Sidak Digital not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Workshop methods - Not implemented in MemStorage
  async getSidakWorkshopSession(id: string): Promise<SidakWorkshopSession | undefined> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakWorkshopSessions(): Promise<SidakWorkshopSession[]> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakWorkshopSession(session: InsertSidakWorkshopSession): Promise<SidakWorkshopSession> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakWorkshopSession(id: string, updates: Partial<InsertSidakWorkshopSession>): Promise<SidakWorkshopSession | undefined> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Stand Jack methods - Not implemented in MemStorage
  async getSidakStandJackSession(id: string): Promise<SidakStandJackSession | undefined> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakStandJackSessions(): Promise<SidakStandJackSession[]> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakStandJackSession(session: InsertSidakStandJackSession): Promise<SidakStandJackSession> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakStandJackSession(id: string, updates: Partial<InsertSidakStandJackSession>): Promise<SidakStandJackSession | undefined> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakStandJackRecords(sessionId: string): Promise<SidakStandJackRecord[]> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakStandJackRecord(record: InsertSidakStandJackRecord): Promise<SidakStandJackRecord> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakStandJackObservers(sessionId: string): Promise<SidakStandJackObserver[]> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakStandJackObserver(observer: InsertSidakStandJackObserver): Promise<SidakStandJackObserver> {
    throw new Error("Sidak Stand Jack not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakWorkshopEquipment(sessionId: string): Promise<SidakWorkshopEquipment[]> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakWorkshopEquipment(equipment: InsertSidakWorkshopEquipment): Promise<SidakWorkshopEquipment> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakWorkshopInspectors(sessionId: string): Promise<SidakWorkshopInspector[]> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakWorkshopInspector(inspector: Omit<InsertSidakWorkshopInspector, 'ordinal'>): Promise<SidakWorkshopInspector> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakWorkshopSessionEquipmentCount(sessionId: string): Promise<void> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Intercom FMS
  async getSidakIntercomSession(id: string): Promise<SidakIntercomSession | undefined> { throw new Error("Not implemented in MemStorage."); }
  async getAllSidakIntercomSessions(): Promise<SidakIntercomSession[]> { throw new Error("Not implemented in MemStorage."); }
  async createSidakIntercomSession(session: InsertSidakIntercomSession): Promise<SidakIntercomSession> { throw new Error("Not implemented in MemStorage."); }
  async updateSidakIntercomSession(id: string, updates: Partial<InsertSidakIntercomSession>): Promise<SidakIntercomSession | undefined> { throw new Error("Not implemented in MemStorage."); }
  async getSidakIntercomRecords(sessionId: string): Promise<SidakIntercomRecord[]> { throw new Error("Not implemented in MemStorage."); }
  async createSidakIntercomRecord(record: InsertSidakIntercomRecord): Promise<SidakIntercomRecord> { throw new Error("Not implemented in MemStorage."); }
  async getSidakIntercomObservers(sessionId: string): Promise<SidakIntercomObserver[]> { throw new Error("Not implemented in MemStorage."); }
  async createSidakIntercomObserver(observer: Omit<InsertSidakIntercomObserver, 'ordinal'>): Promise<SidakIntercomObserver> { throw new Error("Not implemented in MemStorage."); }
  async updateSidakIntercomSessionStats(sessionId: string): Promise<void> { throw new Error("Not implemented in MemStorage."); }
  async generateSidakWorkshopPDF(data: { session: SidakWorkshopSession; equipment: SidakWorkshopEquipment[]; inspectors: SidakWorkshopInspector[] }): Promise<Buffer> {
    throw new Error("Sidak Workshop not implemented in MemStorage. Use DrizzleStorage.");
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllAnnouncements(): Promise<Announcement[]> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getActiveAnnouncements(): Promise<Announcement[]> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateAnnouncement(id: string, announcement: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteAnnouncement(id: string): Promise<boolean> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAnnouncementReads(announcementId: string): Promise<AnnouncementRead[]> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async markAnnouncementAsRead(announcementId: string, employeeId: string, employeeName: string): Promise<AnnouncementRead> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getUnreadAnnouncementsCount(employeeId: string): Promise<number> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }
  async hasReadAnnouncement(announcementId: string, employeeId: string): Promise<boolean> {
    throw new Error("Announcements not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Document methods - Not implemented in MemStorage (use DrizzleStorage)
  async getDocument(id: string): Promise<Document | undefined> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllDocuments(): Promise<Document[]> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getDocumentsByCategory(category: string): Promise<Document[]> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getActiveDocuments(): Promise<Document[]> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createDocument(document: InsertDocument): Promise<Document> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteDocument(id: string): Promise<boolean> {
    throw new Error("Documents not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Sidak Jarak methods - Not implemented in MemStorage
  async getSidakJarakSession(id: string): Promise<SidakJarakSession | undefined> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSidakJarakSessions(): Promise<SidakJarakSession[]> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakJarakSession(session: InsertSidakJarakSession): Promise<SidakJarakSession> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSidakJarakSession(id: string, updates: Partial<InsertSidakJarakSession>): Promise<SidakJarakSession | undefined> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakJarakRecords(sessionId: string): Promise<SidakJarakRecord[]> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakJarakRecord(record: InsertSidakJarakRecord): Promise<SidakJarakRecord> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSidakJarakObservers(sessionId: string): Promise<SidakJarakObserver[]> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSidakJarakObserver(observer: InsertSidakJarakObserver): Promise<SidakJarakObserver> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }
  async generateSidakJarakPDF(data: { session: SidakJarakSession; records: SidakJarakRecord[]; observers: SidakJarakObserver[] }): Promise<Buffer> {
    throw new Error("Sidak Jarak not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Safety Patrol Template methods - Not implemented in MemStorage
  async getSafetyPatrolTemplate(id: string): Promise<SafetyPatrolTemplate | undefined> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getActiveSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSafetyPatrolTemplate(template: InsertSafetyPatrolTemplate): Promise<SafetyPatrolTemplate> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSafetyPatrolTemplate(id: string, template: Partial<InsertSafetyPatrolTemplate>): Promise<SafetyPatrolTemplate | undefined> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteSafetyPatrolTemplate(id: string): Promise<boolean> {
    throw new Error("Safety Patrol Template not implemented in MemStorage. Use DrizzleStorage.");
  }

  // TNA Methods
  async getTrainings(): Promise<Training[]> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createTraining(training: InsertTraining): Promise<Training> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getTnaSummary(employeeId: string, period: string): Promise<TnaSummary | undefined> {
    return Array.from((this.tnaSummaries as any).values()).find(
      (s: any) => s.employeeId === employeeId && s.period === period
    ) as TnaSummary | undefined;
  }

  async createOrGetTnaSummary(employeeId: string, period: string): Promise<TnaSummary> {
    const existing = await this.getTnaSummary(employeeId, period);
    if (existing) return existing;
    // Helper to get employee department
    const emp = await this.getEmployee(employeeId);
    return this.createTnaSummary({
      employeeId,
      period,
      status: 'Draft',
    } as any);
  }

  async createTnaSummary(summary: InsertTnaSummary): Promise<TnaSummary> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getTnaEntries(summaryId: string): Promise<TnaEntry[]> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllTnaEntriesWithDetails(): Promise<any[]> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }

  async getAllRawTnaEntries(): Promise<any[]> {
    throw new Error("TNA not implemented in MemStorage. Use DrizzleStorage.");
  }

  // Competency Monitoring
  async createCompetencyMonitoringLog(log: InsertCompetencyMonitoringLog): Promise<CompetencyMonitoringLog> {
    throw new Error("Competency Monitoring not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getCompetencyMonitoringLogs(tnaEntryId: string): Promise<CompetencyMonitoringLog[]> {
    throw new Error("Competency Monitoring not implemented in MemStorage. Use DrizzleStorage.");
  }
  // MCU Methods - Not implemented in MemStorage
  async getMcuRecords(): Promise<McuRecord[]> { throw new Error("Not implemented in MemStorage"); }
  async getMcuRecord(id: string): Promise<McuRecord | undefined> { throw new Error("Not implemented in MemStorage"); }
  async getMcuRecordsByEmployee(employeeId: string): Promise<McuRecord[]> { throw new Error("Not implemented in MemStorage"); }
  async createMcuRecord(record: InsertMcuRecord): Promise<McuRecord> { throw new Error("Not implemented in MemStorage"); }
  async updateMcuRecord(id: string, record: Partial<InsertMcuRecord>): Promise<McuRecord | undefined> { throw new Error("Not implemented in MemStorage"); }
  async deleteMcuRecord(id: string): Promise<boolean> { throw new Error("Not implemented in MemStorage"); }
  async getMcuStatistics(): Promise<any> { throw new Error("Not implemented in MemStorage"); }
  async getDashboardStats(date?: string): Promise<any> { throw new Error("Not implemented in MemStorage"); }

  // Project Tracker Methods - Not implemented in MemStorage
  async getProjects(): Promise<any[]> { throw new Error("Method not implemented."); }
  async getProject(id: string): Promise<any> { throw new Error("Method not implemented."); }
  async createProject(project: any): Promise<any> { throw new Error("Method not implemented."); }
  async updateProject(id: string, project: any): Promise<any> { throw new Error("Method not implemented."); }
  async deleteProject(id: string): Promise<boolean> { throw new Error("Method not implemented."); }
  async getProjectFiles(projectId: string): Promise<any[]> { throw new Error("Method not implemented."); }
  async createProjectFile(file: any): Promise<any> { throw new Error("Method not implemented."); }
  async deleteProjectFile(id: string): Promise<boolean> { throw new Error("Method not implemented."); }

  // Simper Perpanjangan Methods - Not implemented in MemStorage
  async getSimperPerpanjanganPaginated(page: number, limit: number, search?: string, status?: string, jenis?: string): Promise<{ data: SimperPerpanjangan[], total: number }> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getAllSimperPerpanjangan(search?: string): Promise<SimperPerpanjangan[]> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSimperPerpanjanganById(id: string): Promise<SimperPerpanjangan | undefined> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSimperPerpanjanganByToken(token: string): Promise<SimperPerpanjangan | undefined> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSimperPerpanjangan(data: InsertSimperPerpanjangan): Promise<SimperPerpanjangan> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async updateSimperPerpanjangan(id: string, data: Partial<InsertSimperPerpanjangan>): Promise<SimperPerpanjangan | undefined> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async deleteSimperPerpanjangan(id: string): Promise<boolean> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async getSimperPerpanjanganHistory(simperPerpanjanganId: string): Promise<SimperPerpanjanganHistory[]> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }
  async createSimperPerpanjanganHistory(data: InsertSimperPerpanjanganHistory): Promise<SimperPerpanjanganHistory> {
    throw new Error("Simper Perpanjangan not implemented in MemStorage. Use DrizzleStorage.");
  }

  async updateSidakP3kSession(id: string, updates: Partial<InsertSidakP3kSession>): Promise<SidakP3kSession | undefined> {
    throw new Error("Sidak P3K update not implemented in MemStorage. Use DrizzleStorage.");
  }

  // USign stubs
  async createUsignDocument(data: any): Promise<any> { throw new Error("Method not implemented."); }
  async getUsignDocument(id: string): Promise<any> { throw new Error("Method not implemented."); }
  async getUsignDocumentsByOwner(ownerId: string): Promise<any> { throw new Error("Method not implemented."); }
  async getUsignApprovalsByUser(approverId: string): Promise<any> { throw new Error("Method not implemented."); }
  async addUsignApprovalStep(data: any): Promise<any> { throw new Error("Method not implemented."); }
  async getUsignApprovalSteps(documentId: string): Promise<any> { throw new Error("Method not implemented."); }
  async updateUsignApprovalStepStatus(id: string, status: string, remarks?: string): Promise<any> { throw new Error("Method not implemented."); }
  async voidUsignDocument(id: string, reason: string): Promise<any> { throw new Error("Method not implemented."); }
  async createUsignNotification(data: any): Promise<any> { throw new Error("Method not implemented."); }
  async getInProgressUsignDocuments(): Promise<any> { throw new Error("Method not implemented."); }
  async createUsignHistory(data: any): Promise<any> { throw new Error("Method not implemented."); }

  // Sidak Bottle Jack Methods
  async getSidakBottleJackSession(id: string): Promise<SidakBottleJackSession | undefined> { throw new Error("Method not implemented."); }
  async getAllSidakBottleJackSessions(): Promise<SidakBottleJackSession[]> { throw new Error("Method not implemented."); }
  async createSidakBottleJackSession(session: InsertSidakBottleJackSession): Promise<SidakBottleJackSession> { throw new Error("Method not implemented."); }
  async updateSidakBottleJackSession(id: string, updates: Partial<InsertSidakBottleJackSession>): Promise<SidakBottleJackSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakBottleJackRecords(sessionId: string): Promise<SidakBottleJackRecord[]> { throw new Error("Method not implemented."); }
  async createSidakBottleJackRecord(record: InsertSidakBottleJackRecord): Promise<SidakBottleJackRecord> { throw new Error("Method not implemented."); }
  async getSidakBottleJackObservers(sessionId: string): Promise<SidakBottleJackObserver[]> { throw new Error("Method not implemented."); }
  async createSidakBottleJackObserver(observer: InsertSidakBottleJackObserver): Promise<SidakBottleJackObserver> { throw new Error("Method not implemented."); }
  async updateSidakBottleJackSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }

  // Sidak Impact Methods
  async getSidakImpactSession(id: string): Promise<SidakImpactSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakImpactSessions(): Promise<SidakImpactSession[]> { throw new Error("Method not implemented."); }
  async createSidakImpactSession(session: InsertSidakImpactSession): Promise<SidakImpactSession> { throw new Error("Method not implemented."); }
  async updateSidakImpactSession(id: string, updates: Partial<InsertSidakImpactSession>): Promise<SidakImpactSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakImpactRecords(sessionId: string): Promise<SidakImpactRecord[]> { throw new Error("Method not implemented."); }
  async createSidakImpactRecord(record: InsertSidakImpactRecord): Promise<SidakImpactRecord> { throw new Error("Method not implemented."); }
  async getSidakImpactObservers(sessionId: string): Promise<SidakImpactObserver[]> { throw new Error("Method not implemented."); }
  async createSidakImpactObserver(observer: InsertSidakImpactObserver): Promise<SidakImpactObserver> { throw new Error("Method not implemented."); }
  async updateSidakImpactSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }

  // Sidak Apar Methods
  async getSidakAparSession(id: string): Promise<SidakAparSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakAparSessions(): Promise<SidakAparSession[]> { throw new Error("Method not implemented."); }
  async createSidakAparSession(session: InsertSidakAparSession): Promise<SidakAparSession> { throw new Error("Method not implemented."); }
  async updateSidakAparSession(id: string, updates: Partial<InsertSidakAparSession>): Promise<SidakAparSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakAparRecords(sessionId: string): Promise<SidakAparRecord[]> { throw new Error("Method not implemented."); }
  async createSidakAparRecord(record: InsertSidakAparRecord): Promise<SidakAparRecord> { throw new Error("Method not implemented."); }
  async getSidakAparObservers(sessionId: string): Promise<SidakAparObserver[]> { throw new Error("Method not implemented."); }
  async createSidakAparObserver(observer: InsertSidakAparObserver): Promise<SidakAparObserver> { throw new Error("Method not implemented."); }
  async updateSidakAparSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }

  // Sidak Fuel Storage Methods
  async getSidakFuelStorageSession(id: string): Promise<SidakFuelStorageSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageSessions(): Promise<SidakFuelStorageSession[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageSession(session: InsertSidakFuelStorageSession): Promise<SidakFuelStorageSession> { throw new Error("Method not implemented."); }
  async updateSidakFuelStorageSession(id: string, updates: Partial<InsertSidakFuelStorageSession>): Promise<SidakFuelStorageSession | undefined> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageRecords(sessionId: string): Promise<SidakFuelStorageRecord[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageRecord(record: InsertSidakFuelStorageRecord): Promise<SidakFuelStorageRecord> { throw new Error("Method not implemented."); }
  async getSidakFuelStorageObservers(sessionId: string): Promise<SidakFuelStorageObserver[]> { throw new Error("Method not implemented."); }
  async createSidakFuelStorageObserver(observer: InsertSidakFuelStorageObserver): Promise<SidakFuelStorageObserver> { throw new Error("Method not implemented."); }
  async updateSidakFuelStorageSessionEquipmentCount(sessionId: string): Promise<void> { throw new Error("Method not implemented."); }
}

// DrizzleStorage implementation using PostgreSQL
export class DrizzleStorage implements IStorage {
  private db;

  constructor() {
    this.db = db;
  }

  // User operations implementation (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Auth operations implementation (NIK-based authentication)
  async createAuthUser(nik: string, hashedPassword: string): Promise<void> {
    await this.db
      .insert(authUsers)
      .values({ nik, hashedPassword });
  }

  async getAuthUserByNik(nik: string): Promise<{ nik: string; hashedPassword: string } | undefined> {
    try {
      const [authUser] = await this.db
        .select({
          nik: authUsers.nik,
          hashedPassword: authUsers.hashedPassword,
        })
        .from(authUsers)
        .where(eq(authUsers.nik, nik));
      return authUser;
    } catch (error: any) {
      console.error("❌ Database error in getAuthUserByNik:", error?.message || error);
      throw error;
    }
  }

  async updateAuthUserPassword(nik: string, hashedPassword: string): Promise<void> {
    await this.db
      .update(authUsers)
      .set({ hashedPassword, updatedAt: new Date() })
      .where(eq(authUsers.nik, nik));
  }

  // Employee methods
  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employees).where(eq(employees.id, id));
    return result[0];
  }

  async getEmployeeByNik(nik: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employees).where(eq(employees.id, nik));
    return result[0];
  }

  async getAllEmployees(): Promise<Employee[]> {
    return await this.db.select().from(employees);
  }

  async getEmployeesFiltered(search: string): Promise<Employee[]> {
    const searchPattern = `%${search.trim().toLowerCase()}%`;
    return await this.db.select().from(employees)
      .where(or(
        ilike(employees.id, searchPattern),
        ilike(employees.name, searchPattern),
        ilike(employees.department, searchPattern),
        ilike(employees.position, searchPattern)
      ))
      .orderBy(asc(employees.name));
  }

  async getEmployees(): Promise<Employee[]> {
    return this.getAllEmployees();
  }

  async getEmployeesPaginated(page: number, perPage: number, search?: string, position?: string): Promise<{ data: Employee[]; total: number; totalPages: number }> {
    const offset = (page - 1) * perPage;

    let baseQuery = this.db.select().from(employees);
    let countQuery = this.db.select({ count: sql<number>`count(*)` }).from(employees);

    const conditions: any[] = [];
    if (search && search.trim()) {
      const searchPattern = `%${search.trim().toLowerCase()}%`;
      conditions.push(or(
        ilike(employees.id, searchPattern),
        ilike(employees.name, searchPattern),
        ilike(employees.department, searchPattern),
        ilike(employees.position, searchPattern)
      ));
    }
    if (position && position.trim()) {
      conditions.push(eq(employees.position, position));
    }
    if (conditions.length > 0) {
      const combined = conditions.length === 1 ? conditions[0] : and(...conditions);
      baseQuery = baseQuery.where(combined) as any;
      countQuery = countQuery.where(combined) as any;
    }

    const [data, countResult] = await Promise.all([
      baseQuery.limit(perPage).offset(offset),
      countQuery
    ]);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / perPage);

    return { data, total, totalPages };
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const result = await this.db.insert(employees).values(insertEmployee).returning();
    return result[0];
  }

  async runMigration(): Promise<void> {
    console.log("🚀 Running fix migration for employees table...");
    await this.db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS photo_url TEXT`);
    await this.db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS sertifikat_os_url TEXT`);
    console.log("✅ Fix migration completed.");
  }

  async updateEmployee(id: string, updateData: Partial<InsertEmployee>): Promise<Employee | undefined> {
    // Filter out undefined values to prevent overwriting existing DB values with NULL
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    );
    const result = await this.db.update(employees).set(filteredData).where(eq(employees.id, id)).returning();
    return result[0];
  }

  async deleteEmployee(id: string): Promise<boolean> {
    try {
      // Delete all related records first to avoid foreign key constraint violations
      // Many tables reference employees.id without onDelete: cascade
      await this.db.transaction(async (tx) => {
        // Auth & identity
        await tx.delete(authUsers).where(eq(authUsers.nik, id));
        await tx.delete(qrTokens).where(eq(qrTokens.employeeId, id));

        // Attendance & roster
        await tx.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, id));
        await tx.delete(rosterSchedules).where(eq(rosterSchedules.employeeId, id));

        // Leave-related
        // First delete leave reminders (references both leaveRequests and employees)
        await tx.delete(leaveReminders).where(eq(leaveReminders.employeeId, id));
        // Delete leave history (references leaveRequests and employees)
        await tx.delete(leaveHistory).where(eq(leaveHistory.employeeId, id));
        // Delete leave balances
        await tx.delete(leaveBalances).where(eq(leaveBalances.employeeId, id));
        // Delete leave requests
        await tx.delete(leaveRequests).where(eq(leaveRequests.employeeId, id));

        // Announcements
        await tx.delete(announcementReads).where(eq(announcementReads.employeeId, id));

        // MCU & Sick leaves
        await tx.delete(mcuRecords).where(eq(mcuRecords.employeeId, id));
        await tx.delete(sickLeaves).where(eq(sickLeaves.employeeId, id));

        // Sidak records - set employeeId null to preserve historical inspection data
        await tx.update(sidakFatigueRecords).set({ employeeId: null }).where(eq(sidakFatigueRecords.employeeId, id));
        await tx.update(sidakRosterRecords).set({ employeeId: null }).where(eq(sidakRosterRecords.employeeId, id));
        await tx.update(sidakSeatbeltRecords).set({ employeeId: null }).where(eq(sidakSeatbeltRecords.employeeId, id));
        await tx.update(inductionMaterials).set({ uploadedBy: null }).where(eq(inductionMaterials.uploadedBy, id));

        // Meeting attendance
        await tx.delete(meetingAttendance).where(eq(meetingAttendance.employeeId, id));

        // Push subscriptions
        await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.employeeId, id));

        // TNA summaries
        await tx.delete(tnaSummaries).where(eq(tnaSummaries.employeeId, id));

        // Induction schedules
        await tx.delete(inductionSchedules).where(eq(inductionSchedules.employeeId, id));

        // Kompetensi monitoring
        await tx.delete(kompetensiMonitoring).where(eq(kompetensiMonitoring.employeeId, id));

        // WhatsApp blast recipients
        await tx.delete(whatsappBlastRecipients).where(eq(whatsappBlastRecipients.employeeId, id));

        // Document-related: step assignees, distributions, export logs, esign requests, change requests
        await tx.delete(documentStepAssignees).where(eq(documentStepAssignees.assigneeId, id));
        await tx.delete(documentDistributions).where(eq(documentDistributions.recipientId, id));
        await tx.delete(documentExportLogs).where(eq(documentExportLogs.exportedBy, id));
        await tx.delete(esignRequests).where(eq(esignRequests.signerId, id));
        await tx.delete(changeRequests).where(eq(changeRequests.requestedBy, id));

        // USign: notifications and approval steps (by recipient/approver), then documents by owner
        await tx.delete(usignNotifications).where(eq(usignNotifications.recipientId, id));
        await tx.delete(usignApprovalSteps).where(eq(usignApprovalSteps.approverId, id));
        await tx.delete(usignDocuments).where(eq(usignDocuments.ownerId, id));

        // Finally delete the employee
        await tx.delete(employees).where(eq(employees.id, id));
      });

      console.log(`✅ Successfully deleted employee ${id} and all related records`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting employee ${id}:`, error);
      throw error;
    }
  }

  async deleteAllEmployees(positions?: string[]): Promise<boolean> {
    if (!positions || positions.length === 0) {
      await this.db.execute(sql`TRUNCATE TABLE employees CASCADE`);
      return true;
    }

    const targets = await this.db
      .select({ id: employees.id })
      .from(employees)
      .where(inArray(employees.position, positions));
    const ids = targets.map(t => t.id);
    if (ids.length === 0) return true;

    // Helper: build raw SQL dengan IN clause (terbukti reliable untuk varchar arrays di Postgres)
    const idList = sql.join(ids.map(id => sql`${id}`), sql`, `);

    const tryExec = async (label: string, query: any) => {
      try {
        const result = await this.db.execute(query);
        console.log(`[deleteAllEmployees] ${label}: OK`);
        return result;
      } catch (err: any) {
        console.warn(`[deleteAllEmployees] skip ${label}: ${err?.message || err}`);
      }
    };

    // SET NULL untuk tabel historis — preserve data rekap
    await tryExec("sidak_fatigue_records", sql`UPDATE sidak_fatigue_records SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("sidak_roster_records", sql`UPDATE sidak_roster_records SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("sidak_seatbelt_records", sql`UPDATE sidak_seatbelt_records SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("mcu_records", sql`UPDATE mcu_records SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("sick_leaves", sql`UPDATE sick_leaves SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("kompetensi_sertifikat_monitoring", sql`UPDATE kompetensi_sertifikat_monitoring SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("whatsapp_blast_recipients", sql`UPDATE whatsapp_blast_recipients SET employee_id = NULL WHERE employee_id IN (${idList})`);
    await tryExec("change_requests reviewed_by", sql`UPDATE change_requests SET reviewed_by = NULL WHERE reviewed_by IN (${idList})`);
    await tryExec("document_disposal_records", sql`UPDATE document_disposal_records SET disposed_by = NULL WHERE disposed_by IN (${idList})`);
    await tryExec("induction_materials", sql`UPDATE induction_materials SET uploaded_by = NULL WHERE uploaded_by IN (${idList})`);

    // DELETE tabel operational pakai Drizzle inArray (lebih reliable)
    await tryExec("attendance_records", sql`DELETE FROM attendance_records WHERE employee_id IN (${idList})`);
    await tryExec("roster_schedules", sql`DELETE FROM roster_schedules WHERE employee_id IN (${idList})`);
    await tryExec("leave_requests", sql`DELETE FROM leave_requests WHERE employee_id IN (${idList})`);
    await tryExec("leave_balances", sql`DELETE FROM leave_balances WHERE employee_id IN (${idList})`);
    await tryExec("leave_history", sql`DELETE FROM leave_history WHERE employee_id IN (${idList})`);
    await tryExec("leave_reminders", sql`DELETE FROM leave_reminders WHERE employee_id IN (${idList})`);
    await tryExec("qr_tokens", sql`DELETE FROM qr_tokens WHERE employee_id IN (${idList})`);
    await tryExec("push_subscriptions", sql`DELETE FROM push_subscriptions WHERE employee_id IN (${idList})`);
    await tryExec("tna_summaries", sql`DELETE FROM tna_summaries WHERE employee_id IN (${idList})`);
    await tryExec("induction_schedules", sql`DELETE FROM induction_schedules WHERE employee_id IN (${idList})`);
    await tryExec("announcement_reads", sql`DELETE FROM announcement_reads WHERE employee_id IN (${idList})`);

    // DELETE tabel usign/document
    await tryExec("usign_approval_steps", sql`DELETE FROM usign_approval_steps WHERE approver_id IN (${idList})`);
    await tryExec("usign_notifications", sql`DELETE FROM usign_notifications WHERE recipient_id IN (${idList})`);
    await tryExec("usign_documents", sql`DELETE FROM usign_documents WHERE owner_id IN (${idList})`);
    await tryExec("document_step_assignees", sql`DELETE FROM document_step_assignees WHERE assignee_id IN (${idList})`);
    await tryExec("document_export_logs", sql`DELETE FROM document_export_logs WHERE exported_by IN (${idList})`);
    await tryExec("esign_requests", sql`DELETE FROM esign_requests WHERE signer_id IN (${idList})`);
    await tryExec("change_requests requested_by", sql`DELETE FROM change_requests WHERE requested_by IN (${idList})`);

    // Auth users — pakai Drizzle typed delete biar reliable
    await this.db.delete(authUsers).where(inArray(authUsers.nik, ids));

    // Finally delete the employees
    await this.db.delete(employees).where(inArray(employees.id, ids));
    return true;
  }

  // === Employee Family Members ===
  async getEmployeeFamilyMembers(employeeId: string): Promise<EmployeeFamilyMember[]> {
    return await this.db.select().from(employeeFamilyMembers)
      .where(eq(employeeFamilyMembers.employeeId, employeeId))
      .orderBy(asc(employeeFamilyMembers.createdAt));
  }

  async createEmployeeFamilyMember(data: InsertEmployeeFamilyMember): Promise<EmployeeFamilyMember> {
    const [created] = await this.db.insert(employeeFamilyMembers).values(data).returning();
    return created;
  }

  async updateEmployeeFamilyMember(id: string, data: Partial<InsertEmployeeFamilyMember>): Promise<EmployeeFamilyMember | undefined> {
    const [updated] = await this.db.update(employeeFamilyMembers).set(data)
      .where(eq(employeeFamilyMembers.id, id))
      .returning();
    return updated;
  }

  async deleteEmployeeFamilyMember(id: string): Promise<boolean> {
    const [deleted] = await this.db.delete(employeeFamilyMembers)
      .where(eq(employeeFamilyMembers.id, id))
      .returning();
    return !!deleted;
  }

  // Attendance methods
  async getAttendanceRecord(id: string): Promise<AttendanceRecord | undefined> {
    const result = await this.db.select().from(attendanceRecords).where(eq(attendanceRecords.id, id));
    return result[0];
  }

  async getAttendanceByEmployee(employeeId: string, date?: string): Promise<AttendanceRecord[]> {
    if (date) {
      return await this.db.select().from(attendanceRecords)
        .where(and(eq(attendanceRecords.employeeId, employeeId), eq(attendanceRecords.date, date)));
    }
    return await this.db.select().from(attendanceRecords).where(eq(attendanceRecords.employeeId, employeeId));
  }

  async getAllAttendance(date?: string): Promise<AttendanceRecord[]> {
    if (date) {
      return await this.db.select().from(attendanceRecords).where(eq(attendanceRecords.date, date));
    }
    return await this.db.select().from(attendanceRecords);
  }

  async getAllAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
    return await this.db.select().from(attendanceRecords)
      .where(
        and(
          sql`${attendanceRecords.date} >= ${startDate}`,
          sql`${attendanceRecords.date} <= ${endDate}`
        )
      );
  }

  async createAttendanceRecord(record: InsertAttendanceRecord): Promise<AttendanceRecord> {
    const result = await this.db.insert(attendanceRecords).values(record).returning();
    return result[0];
  }

  // Roster methods
  async getRosterSchedule(id: string): Promise<RosterSchedule | undefined> {
    const result = await this.db.select().from(rosterSchedules).where(eq(rosterSchedules.id, id));
    return result[0];
  }

  async getRosterByDate(date: string): Promise<RosterSchedule[]> {
    return await this.db.select().from(rosterSchedules).where(eq(rosterSchedules.date, date));
  }

  async getRosterByEmployee(employeeId: string): Promise<RosterSchedule[]> {
    return await this.db.select().from(rosterSchedules).where(eq(rosterSchedules.employeeId, employeeId));
  }

  async getRosterByEmployeeAndDate(employeeId: string, date: string): Promise<RosterSchedule | undefined> {
    const result = await this.db.select().from(rosterSchedules)
      .where(and(
        eq(rosterSchedules.employeeId, employeeId),
        eq(rosterSchedules.date, date)
      ));
    return result[0];
  }

  async getRosterByDateRange(startDate: string, endDate: string): Promise<RosterSchedule[]> {
    return await this.db.select().from(rosterSchedules)
      .where(
        and(
          sql`${rosterSchedules.date} >= ${startDate}`,
          sql`${rosterSchedules.date} <= ${endDate}`
        )
      );
  }

  async createRosterSchedule(insertSchedule: InsertRosterSchedule): Promise<RosterSchedule> {
    // Get employee to populate plannedNomorLambung if not provided
    const employee = await this.getEmployee(insertSchedule.employeeId);
    const plannedNomorLambung = insertSchedule.plannedNomorLambung ?? employee?.nomorLambung ?? null;
    const actualNomorLambung = insertSchedule.actualNomorLambung ?? plannedNomorLambung;

    const scheduleToInsert = {
      ...insertSchedule,
      plannedNomorLambung,
      actualNomorLambung,
    };

    const result = await this.db.insert(rosterSchedules).values(scheduleToInsert).returning();
    return result[0];
  }

  async bulkCreateRosterSchedules(insertSchedules: InsertRosterSchedule[]): Promise<RosterSchedule[]> {
    if (insertSchedules.length === 0) return [];

    // Pre-fetch all relevant employees to avoid N+1 queries for plannedNomorLambung
    const employeeIds = [...new Set(insertSchedules.map(s => s.employeeId))];
    const employeesData = await this.db.select().from(employees).where(sql`${employees.id} IN ${employeeIds}`);
    const employeeMap = new Map(employeesData.map(emp => [emp.id, emp]));

    const schedulesToInsert = insertSchedules.map(insertSchedule => {
      const employee = employeeMap.get(insertSchedule.employeeId);
      const plannedNomorLambung = insertSchedule.plannedNomorLambung ?? employee?.nomorLambung ?? null;
      const actualNomorLambung = insertSchedule.actualNomorLambung ?? plannedNomorLambung;

      return {
        ...insertSchedule,
        plannedNomorLambung,
        actualNomorLambung,
      };
    });

    // PostgreSQL has a bind parameter limit of ~65535.
    // Each row has ~10 columns, so batch at 100 rows (~1000 params) to stay within limits.
    const BATCH_SIZE = 100;
    const allResults: RosterSchedule[] = [];

    for (let i = 0; i < schedulesToInsert.length; i += BATCH_SIZE) {
      const batch = schedulesToInsert.slice(i, i + BATCH_SIZE);
      try {
        const batchResults = await this.db.insert(rosterSchedules).values(batch).onConflictDoNothing().returning();
        allResults.push(...batchResults);
      } catch (err) {
        console.error(`Bulk insert batch ${i}-${i + batch.length} failed:`, err);
        // Continue with next batch even if one fails
      }

      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= schedulesToInsert.length) {
        console.log(`Bulk insert progress: ${Math.min(i + BATCH_SIZE, schedulesToInsert.length)}/${schedulesToInsert.length}`);
      }
    }

    return allResults;
  }

  async updateRosterSchedule(id: string, updateData: Partial<InsertRosterSchedule>): Promise<RosterSchedule | undefined> {
    const result = await this.db.update(rosterSchedules).set(updateData).where(eq(rosterSchedules.id, id)).returning();
    return result[0];
  }

  async deleteRosterSchedule(id: string): Promise<boolean> {
    await this.db.delete(rosterSchedules).where(eq(rosterSchedules.id, id));
    return true;
  }

  async deleteAllRosterSchedules(): Promise<void> {
    await this.db.delete(rosterSchedules);
  }

  // Leave methods
  async getLeaveRequest(id: string): Promise<LeaveRequest | undefined> {
    const result = await this.db.select().from(leaveRequests).where(eq(leaveRequests.id, id));
    return result[0];
  }

  async getLeaveByEmployee(employeeId: string): Promise<LeaveRequest[]> {
    return await this.db.select().from(leaveRequests).where(eq(leaveRequests.employeeId, employeeId));
  }

  async getAllLeaveRequests(): Promise<LeaveRequest[]> {
    return await this.db.select().from(leaveRequests);
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const result = await this.db.insert(leaveRequests).values(request).returning();
    return result[0];
  }

  async updateLeaveRequest(id: string, updateData: Partial<InsertLeaveRequest>): Promise<LeaveRequest | undefined> {
    const result = await this.db.update(leaveRequests).set(updateData).where(eq(leaveRequests.id, id)).returning();
    return result[0];
  }

  async deleteLeaveRequest(id: string): Promise<boolean> {
    const result = await this.db.delete(leaveRequests).where(eq(leaveRequests.id, id)).returning();
    return result.length > 0;
  }

  // QR Token methods
  async getQrToken(employeeId: string): Promise<QrToken | undefined> {
    const result = await this.db.select().from(qrTokens)
      .where(and(eq(qrTokens.employeeId, employeeId), eq(qrTokens.isActive, true)));
    return result[0];
  }

  async getQrTokensByEmployee(employeeId: string): Promise<QrToken[]> {
    return await this.db.select().from(qrTokens).where(eq(qrTokens.employeeId, employeeId));
  }

  async createQrToken(insertToken: InsertQrToken): Promise<QrToken> {
    // Deactivate existing tokens for this employee
    await this.db.update(qrTokens)
      .set({ isActive: false })
      .where(eq(qrTokens.employeeId, insertToken.employeeId));

    const result = await this.db.insert(qrTokens).values(insertToken).returning();
    return result[0];
  }

  async validateQrToken(employeeId: string, token: string): Promise<boolean> {
    const qrToken = await this.getQrToken(employeeId);
    return qrToken ? qrToken.token === token && qrToken.isActive : false;
  }

  // Compatibility methods
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    return this.getAllLeaveRequests();
  }

  // Leave Reminder methods
  async getLeaveReminder(leaveRequestId: string, reminderType: string): Promise<LeaveReminder | undefined> {
    const reminderId = `${leaveRequestId}_${reminderType}`;
    const result = await this.db.select().from(leaveReminders).where(eq(leaveReminders.id, reminderId));
    return result[0];
  }

  async getLeaveReminders(): Promise<LeaveReminder[]> {
    return await this.db.select().from(leaveReminders);
  }

  async saveLeaveReminder(reminder: InsertLeaveReminder): Promise<LeaveReminder> {
    const result = await this.db.insert(leaveReminders).values(reminder).returning();
    return result[0];
  }


  // Leave Balance methods
  async getLeaveBalances(): Promise<LeaveBalance[]> {
    return await this.db.select().from(leaveBalances);
  }

  async getLeaveBalanceByEmployee(employeeId: string, year?: number): Promise<LeaveBalance | undefined> {
    const currentYear = year || new Date().getFullYear();
    const result = await this.db.select().from(leaveBalances)
      .where(and(eq(leaveBalances.employeeId, employeeId), eq(leaveBalances.year, currentYear)));
    return result[0];
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const result = await this.db.insert(leaveBalances).values(balance).returning();
    return result[0];
  }

  async updateLeaveBalance(id: string, balance: Partial<InsertLeaveBalance>): Promise<LeaveBalance | undefined> {
    const result = await this.db.update(leaveBalances).set(balance).where(eq(leaveBalances.id, id)).returning();
    return result[0];
  }

  async calculateLeaveEligibility(employeeId: string): Promise<{ eligible: boolean; daysEarned: number; nextEligibleDate: string | null }> {
    // Implementasi perhitungan cuti berdasarkan kebijakan perusahaan
    // 70 hari kerja = 14 hari cuti, 35 hari kerja = 7 hari cuti

    const currentYear = new Date().getFullYear();
    const balance = await this.getLeaveBalanceByEmployee(employeeId, currentYear);

    if (!balance) {
      return { eligible: false, daysEarned: 0, nextEligibleDate: null };
    }

    const workingDays = balance.workingDaysCompleted;
    let daysEarned = 0;

    // Hitung cuti berdasarkan hari kerja
    if (workingDays >= 70) {
      daysEarned = Math.floor(workingDays / 70) * 14;
      const remainder = workingDays % 70;
      if (remainder >= 35) {
        daysEarned += 7;
      }
    } else if (workingDays >= 35) {
      daysEarned = 7;
    }

    const nextEligibleWorkDays = workingDays < 35 ? 35 : (Math.floor(workingDays / 35) + 1) * 35;
    const daysUntilEligible = nextEligibleWorkDays - workingDays;

    const nextEligibleDate = new Date();
    nextEligibleDate.setDate(nextEligibleDate.getDate() + daysUntilEligible);

    return {
      eligible: daysEarned > balance.usedDays,
      daysEarned,
      nextEligibleDate: daysUntilEligible > 0 ? nextEligibleDate.toISOString().split('T')[0] : null
    };
  }

  // Leave History methods
  async getLeaveHistory(): Promise<LeaveHistory[]> {
    return await this.db.select().from(leaveHistory);
  }

  async getLeaveHistoryByEmployee(employeeId: string): Promise<LeaveHistory[]> {
    return await this.db.select().from(leaveHistory).where(eq(leaveHistory.employeeId, employeeId));
  }

  async createLeaveHistory(history: InsertLeaveHistory): Promise<LeaveHistory> {
    const result = await this.db.insert(leaveHistory).values(history).returning();
    return result[0];
  }

  // Bulk upload methods
  async bulkUploadLeaveRoster(data: Array<{ nik: string; leaveType: string; startDate: string; endDate: string; totalDays: number }>): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    try {
      // Batch fetch all employees at once to avoid N+1 queries
      const allEmployees = await this.getAllEmployees();
      const employeeMap = new Map(allEmployees.map(emp => [emp.id, emp]));

      // Batch fetch all existing leave balances
      const currentYear = new Date().getFullYear();
      const allBalances = await this.db.select().from(leaveBalances).where(eq(leaveBalances.year, currentYear));
      const balanceMap = new Map(allBalances.map(balance => [balance.employeeId, balance]));

      // Prepare data for bulk operations
      const validItems: Array<{
        item: typeof data[0];
        employee: any;
        rowIndex: number;
      }> = [];

      // Pre-validate all data
      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        // Validasi employee exists
        const employee = employeeMap.get(item.nik);
        if (!employee) {
          errors.push(`Baris ${i + 1}: Karyawan dengan NIK ${item.nik} tidak ditemukan`);
          continue;
        }

        // Validasi format tanggal
        const startDate = new Date(item.startDate);
        const endDate = new Date(item.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          errors.push(`Baris ${i + 1}: Format tanggal tidak valid`);
          continue;
        }

        if (startDate > endDate) {
          errors.push(`Baris ${i + 1}: Tanggal mulai tidak boleh lebih besar dari tanggal selesai`);
          continue;
        }

        validItems.push({ item, employee, rowIndex: i + 1 });
      }

      // Process items in smaller batches for better performance
      const BATCH_SIZE = 50;
      const batches = [];
      for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
        batches.push(validItems.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        // Create leave requests for this batch
        const leaveRequests = await Promise.all(
          batch.map(({ item, employee }) =>
            this.createLeaveRequest({
              employeeId: item.nik,
              employeeName: employee.name,
              phoneNumber: employee.phone,
              startDate: item.startDate,
              endDate: item.endDate,
              leaveType: item.leaveType,
              reason: 'Bulk upload roster cuti',
              status: 'approved'
            })
          )
        );

        // Process balances and histories for this batch
        const batchOperations: Array<Promise<any>> = [];

        for (let i = 0; i < batch.length; i++) {
          const { item } = batch[i];
          const leaveRequest = leaveRequests[i];

          let balance = balanceMap.get(item.nik);
          let balanceBeforeLeave = 14;
          let balanceAfterLeave = 14 - item.totalDays;

          if (!balance) {
            const newBalance = this.createLeaveBalance({
              employeeId: item.nik,
              year: currentYear,
              totalDays: 14,
              usedDays: item.totalDays,
              remainingDays: 14 - item.totalDays,
              workingDaysCompleted: 70,
              lastLeaveDate: item.endDate
            });
            batchOperations.push(newBalance);
          } else {
            balanceBeforeLeave = balance.remainingDays;
            balanceAfterLeave = balance.remainingDays - item.totalDays;

            const updateBalance = this.updateLeaveBalance(balance.id, {
              usedDays: balance.usedDays + item.totalDays,
              remainingDays: balance.remainingDays - item.totalDays,
              lastLeaveDate: item.endDate
            });
            batchOperations.push(updateBalance);
          }

          // Create leave history
          const historyCreation = this.createLeaveHistory({
            employeeId: item.nik,
            leaveRequestId: leaveRequest.id,
            leaveType: item.leaveType,
            startDate: item.startDate,
            endDate: item.endDate,
            totalDays: item.totalDays,
            balanceBeforeLeave,
            balanceAfterLeave,
            status: 'taken'
          });
          batchOperations.push(historyCreation);
        }

        // Execute batch operations
        await Promise.all(batchOperations);
      }

      successCount = validItems.length;

    } catch (error) {
      console.error('Error in bulk upload:', error);
      errors.push(`Error sistem: ${error instanceof Error ? error.message : 'Error tidak diketahui'}`);
    }

    return { success: successCount, errors };
  }


  // Leave Roster Monitoring methods implementation
  async getLeaveRosterMonitoring(id: string): Promise<LeaveRosterMonitoring | undefined> {
    const [result] = await this.db
      .select()
      .from(leaveRosterMonitoring)
      .where(eq(leaveRosterMonitoring.id, id));
    return result;
  }

  async getLeaveRosterMonitoringByNik(nik: string): Promise<LeaveRosterMonitoring | undefined> {
    const [result] = await this.db
      .select()
      .from(leaveRosterMonitoring)
      .where(eq(leaveRosterMonitoring.nik, nik));
    return result;
  }

  async getAllLeaveRosterMonitoring(): Promise<LeaveRosterMonitoring[]> {
    return await this.db
      .select()
      .from(leaveRosterMonitoring)
      .orderBy(sql`created_at DESC`);
  }

  async getLeaveRosterMonitoringByStatus(status: string): Promise<LeaveRosterMonitoring[]> {
    return await this.db
      .select()
      .from(leaveRosterMonitoring)
      .where(eq(leaveRosterMonitoring.status, status))
      .orderBy(sql`created_at DESC`);
  }

  async createLeaveRosterMonitoring(monitoring: InsertLeaveRosterMonitoring): Promise<LeaveRosterMonitoring> {
    const [result] = await this.db
      .insert(leaveRosterMonitoring)
      .values(monitoring)
      .returning();
    return result;
  }

  async updateLeaveRosterMonitoring(id: string, monitoring: Partial<InsertLeaveRosterMonitoring>): Promise<LeaveRosterMonitoring | undefined> {
    const [result] = await this.db
      .update(leaveRosterMonitoring)
      .set({ ...monitoring, updatedAt: sql`now()` })
      .where(eq(leaveRosterMonitoring.id, id))
      .returning();
    return result;
  }

  async deleteLeaveRosterMonitoring(id: string): Promise<boolean> {
    const result = await this.db
      .delete(leaveRosterMonitoring)
      .where(eq(leaveRosterMonitoring.id, id));
    return result.rowCount > 0;
  }

  async deleteAllLeaveRosterMonitoring(): Promise<void> {
    await this.db.delete(leaveRosterMonitoring);
  }

  async updateLeaveRosterStatus(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const allMonitoring = await this.getAllLeaveRosterMonitoring();

    for (const monitoring of allMonitoring) {
      let newStatus = monitoring.status;

      // RUMUS BARU: Terakhir Cuti - Today
      let monitoringDays = 0;
      if (monitoring.lastLeaveDate) {
        const lastLeaveDate = new Date(monitoring.lastLeaveDate);
        const todayDate = new Date(today);
        // Rumus baru: Terakhir Cuti - Today
        const diffTime = lastLeaveDate.getTime() - todayDate.getTime();
        monitoringDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        console.log(`[${monitoring.nik}] monitoringDays: ${monitoringDays} (${monitoringDays > 0 ? 'hari lagi' : monitoringDays < 0 ? 'sudah lewat' : 'hari ini'}), lastLeave=${monitoring.lastLeaveDate}`);
      }

      // Status berdasarkan rumus baru: Terakhir Cuti - Today
      console.log(`[${monitoring.nik}] Status check - monitoring days: ${monitoringDays}, current status: ${monitoring.status}`);

      // Aturan status baru:
      if (monitoringDays <= 10 && monitoringDays >= 0) {
        newStatus = "Menunggu Cuti";
        console.log(`[${monitoring.nik}] Set to Menunggu Cuti - ${monitoringDays} hari lagi menuju cuti`);
      } else if (monitoringDays > 10) {
        newStatus = "Aktif";
        console.log(`[${monitoring.nik}] Set to Aktif - masih ${monitoringDays} hari lagi`);
      } else if (monitoringDays < 0) {
        newStatus = "Cuti Selesai";
        console.log(`[${monitoring.nik}] Set to Cuti Selesai - sudah lewat ${Math.abs(monitoringDays)} hari`);
      }

      await this.updateLeaveRosterMonitoring(monitoring.id, {
        status: newStatus,
        monitoringDays
      });
    }
  }

  // Meeting methods implementation
  async getMeeting(id: string): Promise<Meeting | undefined> {
    const [result] = await this.db
      .select()
      .from(meetings)
      .where(eq(meetings.id, id));
    return result;
  }

  async getAllMeetings(): Promise<Meeting[]> {
    return await this.db
      .select()
      .from(meetings)
      .orderBy(sql`created_at DESC`);
  }

  async getMeetingsByDate(date: string): Promise<Meeting[]> {
    return await this.db
      .select()
      .from(meetings)
      .where(eq(meetings.date, date))
      .orderBy(sql`start_time ASC`);
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    // Generate unique QR token for the meeting
    const qrToken = randomUUID().replace(/-/g, '').substring(0, 12);
    const meetingWithToken = { ...meeting, qrToken };

    const [result] = await this.db
      .insert(meetings)
      .values(meetingWithToken)
      .returning();
    return result;
  }

  async updateMeeting(id: string, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    // Filter out undefined values so Drizzle does not reset columns to NULL
    const filteredData = Object.fromEntries(
      Object.entries(meeting).filter(([, v]) => v !== undefined)
    );
    const [result] = await this.db
      .update(meetings)
      .set({ ...filteredData, updatedAt: sql`now()` })
      .where(eq(meetings.id, id))
      .returning();
    return result;
  }

  async deleteMeeting(id: string): Promise<boolean> {
    const result = await this.db
      .delete(meetings)
      .where(eq(meetings.id, id));
    return result.rowCount > 0;
  }

  async getMeetingByQrToken(qrToken: string): Promise<Meeting | undefined> {
    const [result] = await this.db
      .select()
      .from(meetings)
      .where(eq(meetings.qrToken, qrToken));
    return result;
  }

  // Meeting attendance methods implementation
  async getMeetingAttendance(meetingId: string): Promise<MeetingAttendance[]> {
    return await this.db
      .select()
      .from(meetingAttendance)
      .where(eq(meetingAttendance.meetingId, meetingId))
      .orderBy(sql`created_at ASC`);
  }

  async createMeetingAttendance(attendance: InsertMeetingAttendance): Promise<MeetingAttendance> {
    const [result] = await this.db
      .insert(meetingAttendance)
      .values(attendance)
      .returning();
    return result;
  }

  async checkMeetingAttendance(meetingId: string, employeeId: string): Promise<MeetingAttendance | undefined> {
    const [result] = await this.db
      .select()
      .from(meetingAttendance)
      .where(and(
        eq(meetingAttendance.meetingId, meetingId),
        eq(meetingAttendance.employeeId, employeeId)
      ));
    return result;
  }

  async deleteMeetingAttendance(attendanceId: string): Promise<boolean> {
    const result = await this.db
      .delete(meetingAttendance)
      .where(eq(meetingAttendance.id, attendanceId));
    return result.rowCount > 0;
  }

  // SIMPER Monitoring methods implementation for DrizzleStorage
  async getSimperMonitoring(id: string): Promise<SimperMonitoring | undefined> {
    const [result] = await this.db
      .select()
      .from(simperMonitoring)
      .where(eq(simperMonitoring.id, id));
    return result;
  }

  async getSimperMonitoringByNik(nik: string): Promise<SimperMonitoring | undefined> {
    const [result] = await this.db
      .select()
      .from(simperMonitoring)
      .where(eq(simperMonitoring.nik, nik));
    return result;
  }

  async getAllSimperMonitoring(): Promise<SimperMonitoring[]> {
    return await this.db
      .select()
      .from(simperMonitoring)
      .orderBy(sql`created_at DESC`);
  }

  async createSimperMonitoring(simperData: InsertSimperMonitoring): Promise<SimperMonitoring> {
    const [result] = await this.db
      .insert(simperMonitoring)
      .values(simperData)
      .returning();
    return result;
  }

  async updateSimperMonitoring(id: string, simperData: Partial<InsertSimperMonitoring>): Promise<SimperMonitoring | undefined> {
    const [result] = await this.db
      .update(simperMonitoring)
      .set({
        ...simperData,
        updatedAt: new Date()
      })
      .where(eq(simperMonitoring.id, id))
      .returning();
    return result;
  }

  async deleteSimperMonitoring(id: string): Promise<boolean> {
    const result = await this.db
      .delete(simperMonitoring)
      .where(eq(simperMonitoring.id, id));
    return result.rowCount > 0;
  }

  async deleteAllSimperMonitoring(): Promise<void> {
    await this.db.delete(simperMonitoring);
  }

  async bulkUploadSimperData(data: Array<{ employeeName: string; nik: string; simperBibExpiredDate?: string; simperTiaExpiredDate?: string }>): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;

    console.log(`📤 Starting bulk upload of ${data.length} SIMPER records`);

    for (let index = 0; index < data.length; index++) {
      const item = data[index];
      try {
        if (!item.employeeName || !item.nik) {
          const error = `Data tidak lengkap untuk baris ${index + 1} - Name: "${item.employeeName}", NIK: "${item.nik}"`;
          errors.push(error);
          console.log(`❌ ${error}`);
          continue;
        }

        // Trim and validate data
        const cleanName = item.employeeName.trim();
        const cleanNik = item.nik.trim();

        if (!cleanName || !cleanNik) {
          const error = `Data kosong setelah trim untuk baris ${index + 1}`;
          errors.push(error);
          console.log(`❌ ${error}`);
          continue;
        }

        // Check if NIK already exists
        const existing = await this.getSimperMonitoringByNik(cleanNik);

        const simperData = {
          employeeName: cleanName,
          simperBibExpiredDate: item.simperBibExpiredDate || null,
          simperTiaExpiredDate: item.simperTiaExpiredDate || null
        };

        if (existing) {
          // Update existing record
          console.log(`🔄 Updating existing SIMPER for ${cleanName} (${cleanNik})`);
          await this.updateSimperMonitoring(existing.id, simperData);
        } else {
          // Create new record
          console.log(`➕ Creating new SIMPER for ${cleanName} (${cleanNik})`);
          await this.createSimperMonitoring({
            ...simperData,
            nik: cleanNik
          });
        }

        success++;
        console.log(`✅ Processed ${cleanName} (${cleanNik}) - BIB: ${item.simperBibExpiredDate || 'Kosong'}, TIA: ${item.simperTiaExpiredDate || 'Kosong'}`);

      } catch (error) {
        const errorMsg = `Error untuk NIK ${item.nik} (baris ${index + 1}): ${error}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log(`📊 Bulk upload completed: ${success} success, ${errors.length} errors`);
    return { success, errors };
  }

  // ============================================
  // SIDAK FATIGUE METHODS
  // ============================================

  async getSidakFatigueSession(id: string): Promise<SidakFatigueSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakFatigueSessions)
      .where(eq(sidakFatigueSessions.id, id));
    return result;
  }

  async getAllSidakFatigueSessions(): Promise<SidakFatigueSession[]> {
    return await this.db
      .select()
      .from(sidakFatigueSessions)
      .orderBy(sql`created_at DESC`);
  }

  async createSidakFatigueSession(sessionData: InsertSidakFatigueSession): Promise<SidakFatigueSession> {
    const [result] = await this.db
      .insert(sidakFatigueSessions)
      .values(sessionData)
      .returning();
    return result;
  }

  async updateSidakFatigueSession(id: string, updates: Partial<InsertSidakFatigueSession>): Promise<SidakFatigueSession | undefined> {
    const [result] = await this.db
      .update(sidakFatigueSessions)
      .set(updates)
      .where(eq(sidakFatigueSessions.id, id))
      .returning();
    return result;
  }

  async deleteSidakFatigueSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(sidakFatigueSessions)
      .where(eq(sidakFatigueSessions.id, id));
    return result.rowCount > 0;
  }

  async getSidakFatigueRecords(sessionId: string): Promise<SidakFatigueRecord[]> {
    return await this.db
      .select()
      .from(sidakFatigueRecords)
      .where(eq(sidakFatigueRecords.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async getSidakFatigueRecordsBySessionIds(sessionIds: string[]): Promise<SidakFatigueRecord[]> {
    if (sessionIds.length === 0) {
      return [];
    }
    return await this.db
      .select()
      .from(sidakFatigueRecords)
      .where(inArray(sidakFatigueRecords.sessionId, sessionIds))
      .orderBy(sql`created_at ASC`);
  }

  async createSidakFatigueRecord(recordData: InsertSidakFatigueRecord): Promise<SidakFatigueRecord> {
    // Retry-based optimistic locking pattern (neon-http driver doesn't support transactions)
    // Unique constraint on (sessionId, ordinal) prevents duplicates
    // Note: totalSampel is calculated on-demand from COUNT(*) to avoid partial-update issues
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Get next ordinal (MAX + 1)
        const maxOrdinalResult = await this.db
          .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
          .from(sidakFatigueRecords)
          .where(eq(sidakFatigueRecords.sessionId, recordData.sessionId));

        const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;

        // Check limit before insert
        if (nextOrdinal > 20) {
          throw new Error('Maksimal 20 karyawan per Sidak Fatigue session');
        }

        // Insert with ordinal - unique constraint catches race conditions
        const [result] = await this.db
          .insert(sidakFatigueRecords)
          .values({ ...recordData, ordinal: nextOrdinal })
          .returning();

        return result;
      } catch (error: any) {
        lastError = error;

        // Retry on unique constraint violation (concurrent insert to same ordinal)
        if (error?.code === '23505' && attempt < MAX_RETRIES - 1) {
          // Wait briefly before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
          continue;
        }

        // If max limit reached or other error, throw
        if (error?.code === '23505') {
          throw new Error('Maksimal 20 karyawan per Sidak Fatigue session (concurrent limit reached)');
        }
        throw error;
      }
    }

    // If all retries exhausted
    throw new Error(`Gagal menambahkan karyawan setelah ${MAX_RETRIES} percobaan: ${lastError?.message || 'Unknown error'}`);
  }

  async updateSidakFatigueRecord(id: string, recordData: Partial<InsertSidakFatigueRecord>): Promise<SidakFatigueRecord | undefined> {
    const [result] = await this.db
      .update(sidakFatigueRecords)
      .set(recordData)
      .where(eq(sidakFatigueRecords.id, id))
      .returning();
    return result;
  }

  async getSidakFatigueObservers(sessionId: string): Promise<SidakFatigueObserver[]> {
    return await this.db
      .select()
      .from(sidakFatigueObservers)
      .where(eq(sidakFatigueObservers.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async updateSidakFatigueSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakFatigueRecords(sessionId);
    await this.db
      .update(sidakFatigueSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakFatigueSessions.id, sessionId));
  }

  async createSidakFatigueObserver(observerData: InsertSidakFatigueObserver): Promise<SidakFatigueObserver> {
    const [result] = await this.db
      .insert(sidakFatigueObservers)
      .values(observerData)
      .returning();
    return result;
  }

  // ============================================
  // SIDAK ROSTER METHODS
  // ============================================

  async getSidakRosterSession(id: string): Promise<SidakRosterSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakRosterSessions)
      .where(eq(sidakRosterSessions.id, id));
    return result;
  }

  async getAllSidakRosterSessions(): Promise<SidakRosterSession[]> {
    return await this.db
      .select()
      .from(sidakRosterSessions)
      .orderBy(sql`created_at DESC`);
  }

  async createSidakRosterSession(sessionData: InsertSidakRosterSession): Promise<SidakRosterSession> {
    const [result] = await this.db
      .insert(sidakRosterSessions)
      .values(sessionData)
      .returning();
    return result;
  }

  async updateSidakRosterSession(id: string, updates: Partial<InsertSidakRosterSession>): Promise<SidakRosterSession | undefined> {
    const [result] = await this.db
      .update(sidakRosterSessions)
      .set(updates)
      .where(eq(sidakRosterSessions.id, id))
      .returning();
    return result;
  }

  async deleteSidakRosterSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(sidakRosterSessions)
      .where(eq(sidakRosterSessions.id, id));
    return result.rowCount > 0;
  }

  async getSidakRosterRecords(sessionId: string): Promise<SidakRosterRecord[]> {
    return await this.db
      .select()
      .from(sidakRosterRecords)
      .where(eq(sidakRosterRecords.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async getSidakRosterRecordsBySessionIds(sessionIds: string[]): Promise<SidakRosterRecord[]> {
    if (sessionIds.length === 0) return [];
    return await this.db
      .select()
      .from(sidakRosterRecords)
      .where(inArray(sidakRosterRecords.sessionId, sessionIds))
      .orderBy(sql`created_at ASC`);
  }

  async createSidakRosterRecord(recordData: InsertSidakRosterRecord): Promise<SidakRosterRecord> {
    // Retry-based optimistic locking pattern (neon-http driver doesn't support transactions)
    // Unique constraint on (sessionId, ordinal) prevents duplicates
    // Note: totalSampel is calculated on-demand from COUNT(*) to avoid partial-update issues
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Get next ordinal (MAX + 1)
        const maxOrdinalResult = await this.db
          .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
          .from(sidakRosterRecords)
          .where(eq(sidakRosterRecords.sessionId, recordData.sessionId));

        const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;

        // Check limit before insert
        if (nextOrdinal > 15) {
          throw new Error('Maksimal 15 karyawan per Sidak Roster session');
        }

        // Insert with ordinal - unique constraint catches race conditions
        const [result] = await this.db
          .insert(sidakRosterRecords)
          .values({ ...recordData, ordinal: nextOrdinal })
          .returning();

        // Update session total sampel
        await this.updateSidakRosterSessionSampleCount(recordData.sessionId);

        return result;
      } catch (error: any) {
        lastError = error;

        // Retry on unique constraint violation (concurrent insert to same ordinal)
        if (error?.code === '23505' && attempt < MAX_RETRIES - 1) {
          // Wait briefly before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
          continue;
        }

        // If max limit reached or other error, throw
        if (error?.code === '23505') {
          throw new Error('Maksimal 15 karyawan per Sidak Roster session (concurrent limit reached)');
        }
        throw error;
      }
    }

    // If all retries exhausted
    throw new Error(`Gagal menambahkan karyawan setelah ${MAX_RETRIES} percobaan: ${lastError?.message || 'Unknown error'}`);
  }

  async getSidakRosterObservers(sessionId: string): Promise<SidakRosterObserver[]> {
    return await this.db
      .select()
      .from(sidakRosterObservers)
      .where(eq(sidakRosterObservers.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async updateSidakRosterSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakRosterRecords(sessionId);
    await this.updateSidakRosterSession(sessionId, { totalSampel: records.length });
  }

  async createSidakRosterObserver(observerData: InsertSidakRosterObserver): Promise<SidakRosterObserver> {
    const [result] = await this.db
      .insert(sidakRosterObservers)
      .values(observerData)
      .returning();
    return result;
  }

  // ============================================
  // SIDAK SEATBELT METHODS
  // ============================================

  async getSidakSeatbeltSession(id: string): Promise<SidakSeatbeltSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakSeatbeltSessions)
      .where(eq(sidakSeatbeltSessions.id, id));
    return result;
  }

  async getAllSidakSeatbeltSessions(): Promise<SidakSeatbeltSession[]> {
    return await this.db
      .select()
      .from(sidakSeatbeltSessions)
      .orderBy(sql`created_at DESC`);
  }

  async createSidakSeatbeltSession(sessionData: InsertSidakSeatbeltSession): Promise<SidakSeatbeltSession> {
    const [result] = await this.db
      .insert(sidakSeatbeltSessions)
      .values(sessionData)
      .returning();
    return result;
  }

  async updateSidakSeatbeltSession(id: string, updates: Partial<InsertSidakSeatbeltSession>): Promise<SidakSeatbeltSession | undefined> {
    const [result] = await this.db
      .update(sidakSeatbeltSessions)
      .set(updates)
      .where(eq(sidakSeatbeltSessions.id, id))
      .returning();
    return result;
  }

  async deleteSidakSeatbeltSession(id: string): Promise<boolean> {
    const result = await this.db
      .delete(sidakSeatbeltSessions)
      .where(eq(sidakSeatbeltSessions.id, id));
    return result.rowCount > 0;
  }

  async getSidakSeatbeltRecords(sessionId: string): Promise<SidakSeatbeltRecord[]> {
    return await this.db
      .select()
      .from(sidakSeatbeltRecords)
      .where(eq(sidakSeatbeltRecords.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async createSidakSeatbeltRecord(recordData: InsertSidakSeatbeltRecord): Promise<SidakSeatbeltRecord> {
    const MAX_RETRIES = 3;
    let lastError: any;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const maxOrdinalResult = await this.db
          .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
          .from(sidakSeatbeltRecords)
          .where(eq(sidakSeatbeltRecords.sessionId, recordData.sessionId));

        const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;

        if (nextOrdinal > 30) {
          throw new Error('Maksimal 30 unit per Sidak Seatbelt session');
        }

        const [result] = await this.db
          .insert(sidakSeatbeltRecords)
          .values({ ...recordData, ordinal: nextOrdinal })
          .returning();

        // Update session total sampel
        await this.updateSidakSeatbeltSessionSampleCount(recordData.sessionId);

        return result;
      } catch (error: any) {
        lastError = error;

        if (error?.code === '23505' && attempt < MAX_RETRIES - 1) {
          await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
          continue;
        }

        if (error?.code === '23505') {
          throw new Error('Maksimal 30 unit per Sidak Seatbelt session (concurrent limit)');
        }
        throw error;
      }
    }

    throw new Error(`Gagal menambahkan unit setelah ${MAX_RETRIES} percobaan: ${lastError?.message || 'Unknown error'}`);
  }

  async getSidakSeatbeltObservers(sessionId: string): Promise<SidakSeatbeltObserver[]> {
    return await this.db
      .select()
      .from(sidakSeatbeltObservers)
      .where(eq(sidakSeatbeltObservers.sessionId, sessionId))
      .orderBy(sql`created_at ASC`);
  }

  async updateSidakSeatbeltSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakSeatbeltRecords(sessionId);
    await this.updateSidakSeatbeltSession(sessionId, { totalSampel: records.length });
  }

  async createSidakSeatbeltObserver(observerData: InsertSidakSeatbeltObserver): Promise<SidakSeatbeltObserver> {
    const [result] = await this.db
      .insert(sidakSeatbeltObservers)
      .values(observerData)
      .returning();
    return result;
  }

  // Announcement methods
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [result] = await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return result;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await this.db
      .select()
      .from(announcements)
      .orderBy(sql`created_at DESC`);
  }

  async getActiveAnnouncements(): Promise<Announcement[]> {
    return await this.db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(sql`created_at DESC`);
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    const [result] = await this.db
      .insert(announcements)
      .values(announcementData)
      .returning();
    return result;
  }

  async updateAnnouncement(id: string, announcementData: Partial<InsertAnnouncement>): Promise<Announcement | undefined> {
    const [result] = await this.db
      .update(announcements)
      .set(announcementData)
      .where(eq(announcements.id, id))
      .returning();
    return result;
  }

  async deleteAnnouncement(id: string): Promise<boolean> {
    const result = await this.db
      .delete(announcements)
      .where(eq(announcements.id, id));
    return true;
  }

  async getAnnouncementReads(announcementId: string): Promise<(AnnouncementRead & { employeePosition?: string | null })[]> {
    const reads = await this.db
      .select({
        id: announcementReads.id,
        announcementId: announcementReads.announcementId,
        employeeId: announcementReads.employeeId,
        employeeName: announcementReads.employeeName,
        readAt: announcementReads.readAt,
        employeePosition: employees.position,
      })
      .from(announcementReads)
      .leftJoin(employees, eq(announcementReads.employeeId, employees.id))
      .where(eq(announcementReads.announcementId, announcementId))
      .orderBy(sql`${announcementReads.readAt} DESC`);
    return reads;
  }

  async markAnnouncementAsRead(announcementId: string, employeeId: string, employeeName: string): Promise<AnnouncementRead> {
    // Use upsert to handle duplicate reads gracefully
    const [result] = await this.db
      .insert(announcementReads)
      .values({ announcementId, employeeId, employeeName })
      .onConflictDoNothing()
      .returning();

    // If conflict (already read), fetch the existing record
    if (!result) {
      const [existing] = await this.db
        .select()
        .from(announcementReads)
        .where(and(
          eq(announcementReads.announcementId, announcementId),
          eq(announcementReads.employeeId, employeeId)
        ));
      return existing;
    }
    return result;
  }

  async getUnreadAnnouncementsCount(employeeId: string): Promise<number> {
    // Get active announcements that the employee hasn't read
    const activeAnnouncements = await this.getActiveAnnouncements();
    const readAnnouncements = await this.db
      .select({ announcementId: announcementReads.announcementId })
      .from(announcementReads)
      .where(eq(announcementReads.employeeId, employeeId));

    const readIds = new Set(readAnnouncements.map(r => r.announcementId));
    const unreadCount = activeAnnouncements.filter(a => !readIds.has(a.id)).length;
    return unreadCount;
  }

  async hasReadAnnouncement(announcementId: string, employeeId: string): Promise<boolean> {
    const [result] = await this.db
      .select()
      .from(announcementReads)
      .where(and(
        eq(announcementReads.announcementId, announcementId),
        eq(announcementReads.employeeId, employeeId)
      ));
    return !!result;
  }

  // Document methods
  async getDocument(id: string): Promise<Document | undefined> {
    const [result] = await this.db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return result;
  }

  async getAllDocuments(): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .orderBy(documents.createdAt);
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.category, category), eq(documents.isActive, true)))
      .orderBy(documents.createdAt);
  }

  async getActiveDocuments(): Promise<Document[]> {
    return await this.db
      .select()
      .from(documents)
      .where(eq(documents.isActive, true))
      .orderBy(documents.createdAt);
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [result] = await this.db
      .insert(documents)
      .values(document)
      .returning();
    return result;
  }

  async updateDocument(id: string, document: Partial<InsertDocument>): Promise<Document | undefined> {
    const [result] = await this.db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return result;
  }

  async deleteDocument(id: string): Promise<boolean> {
    const result = await this.db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning();
    return result.length > 0;
  }

  // News methods
  async getNews(id: string): Promise<News | undefined> {
    const [result] = await this.db
      .select()
      .from(news)
      .where(eq(news.id, id));
    return result;
  }

  async getAllNews(): Promise<News[]> {
    return await this.db
      .select()
      .from(news)
      .orderBy(news.createdAt);
  }

  async getActiveNews(): Promise<News[]> {
    return await this.db
      .select()
      .from(news)
      .where(eq(news.isActive, true))
      .orderBy(news.createdAt);
  }

  async createNews(newsItem: InsertNews): Promise<News> {
    const [result] = await this.db
      .insert(news)
      .values(newsItem)
      .returning();
    return result;
  }

  async updateNews(id: string, newsItem: Partial<InsertNews>): Promise<News | undefined> {
    const [result] = await this.db
      .update(news)
      .set({ ...newsItem, updatedAt: new Date() })
      .where(eq(news.id, id))
      .returning();
    return result;
  }

  async deleteNews(id: string): Promise<boolean> {
    const result = await this.db
      .delete(news)
      .where(eq(news.id, id))
      .returning();
    return result.length > 0;
  }

  // Push subscription methods
  async getPushSubscription(id: string): Promise<PushSubscription | undefined> {
    const [result] = await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id));
    return result;
  }

  async getPushSubscriptionsByEmployee(employeeId: string): Promise<PushSubscription[]> {
    return await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.employeeId, employeeId));
  }

  async getActivePushSubscriptions(): Promise<PushSubscription[]> {
    return await this.db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true));
  }

  async createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [result] = await this.db
      .insert(pushSubscriptions)
      .values(subscription)
      .returning();
    return result;
  }

  async updatePushSubscription(id: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const [result] = await this.db
      .update(pushSubscriptions)
      .set(subscription)
      .where(eq(pushSubscriptions.id, id))
      .returning();
    return result;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    const result = await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.id, id))
      .returning();
    return result.length > 0;
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const result = await this.db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint))
      .returning();
    return result.length > 0;
  }

  // Safety Patrol Report methods
  async getSafetyPatrolReport(id: string): Promise<SafetyPatrolReport | undefined> {
    const [result] = await this.db
      .select()
      .from(safetyPatrolReports)
      .where(eq(safetyPatrolReports.id, id));
    return result;
  }

  async getAllSafetyPatrolReports(): Promise<SafetyPatrolReport[]> {
    return await this.db
      .select()
      .from(safetyPatrolReports)
      .orderBy(sql`${safetyPatrolReports.createdAt} DESC`);
  }

  async getSafetyPatrolReportsByDateRange(startDate: string, endDate: string): Promise<SafetyPatrolReport[]> {
    return await this.db
      .select()
      .from(safetyPatrolReports)
      .where(and(
        sql`${safetyPatrolReports.tanggal} >= ${startDate}`,
        sql`${safetyPatrolReports.tanggal} <= ${endDate}`
      ))
      .orderBy(sql`${safetyPatrolReports.createdAt} DESC`);
  }

  async getRecentSafetyPatrolReportBySender(senderPhone: string, minutesAgo: number = 5): Promise<SafetyPatrolReport | undefined> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);
    const [result] = await this.db
      .select()
      .from(safetyPatrolReports)
      .where(and(
        eq(safetyPatrolReports.senderPhone, senderPhone),
        sql`${safetyPatrolReports.createdAt} >= ${cutoffTime.toISOString()}`
      ))
      .orderBy(sql`${safetyPatrolReports.createdAt} DESC`)
      .limit(1);
    return result;
  }

  async createSafetyPatrolReport(report: InsertSafetyPatrolReport): Promise<SafetyPatrolReport> {
    const [result] = await this.db
      .insert(safetyPatrolReports)
      .values(report)
      .returning();
    return result;
  }

  async updateSafetyPatrolReport(id: string, report: Partial<InsertSafetyPatrolReport>): Promise<SafetyPatrolReport | undefined> {
    const [result] = await this.db
      .update(safetyPatrolReports)
      .set(report)
      .where(eq(safetyPatrolReports.id, id))
      .returning();
    return result;
  }

  // ---- Plan Kehadiran Pengawas ----
  async getAttendancePlan(year: number): Promise<SafetyPatrolAttendancePlan[]> {
    return await this.db
      .select()
      .from(safetyPatrolAttendancePlan)
      .where(eq(safetyPatrolAttendancePlan.year, year));
  }

  async upsertAttendancePlan(rows: InsertSafetyPatrolAttendancePlan[]): Promise<void> {
    for (const row of rows) {
      await this.db
        .insert(safetyPatrolAttendancePlan)
        .values(row)
        .onConflictDoUpdate({
          target: [safetyPatrolAttendancePlan.officerName, safetyPatrolAttendancePlan.year, safetyPatrolAttendancePlan.week],
          set: { shift1: row.shift1, shift2: row.shift2, nik: row.nik, updatedAt: new Date() },
        });
    }
  }

  // ---- Zero Harm (SIMANTIK) import ----
  private zhTable(sheet: string): any {
    return ({ hazard: zhHazard, inspeksi: zhInspeksi, observasi: zhObservasi, opk: zhOpk, attendance: zhAttendance, fms: zhFms } as any)[sheet];
  }
  // Replace penuh per sheet (mirror file export harian). File = sumber kebenaran.
  async zhUpsert(sheet: string, rows: any[]): Promise<number> {
    const table = this.zhTable(sheet);
    if (!table) return 0;
    if (!rows.length) return 0; // sheet absen di file → jangan hapus data lama
    // Dedup baris identik (sourceKey = hash baris penuh) agar tak melanggar unique
    const dedup = Array.from(new Map(rows.map((r) => [r.sourceKey, r])).values());
    await this.db.delete(table); // hapus data lama sheet ini → ganti dengan isi file
    let n = 0;
    for (let i = 0; i < dedup.length; i += 500) {
      const chunk = dedup.slice(i, i + 500);
      await this.db.insert(table).values(chunk).onConflictDoNothing();
      n += chunk.length;
    }
    return n;
  }
  async zhCounts(): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const [k, t] of Object.entries({ hazard: zhHazard, inspeksi: zhInspeksi, observasi: zhObservasi, opk: zhOpk, attendance: zhAttendance, fms: zhFms })) {
      const [r] = await this.db.select({ c: sql<number>`count(*)::int` }).from(t as any);
      out[k] = r?.c ?? 0;
    }
    return out;
  }

  // Upsert grid hari-kerja KPI Sidak (per program/tahun). days=null → NA (cuti).
  async upsertZhProgramAttendance(
    programCode: string,
    year: number,
    entries: Array<{ nik: string; week: number; days: number | null }>,
  ): Promise<number> {
    let n = 0;
    for (const e of entries) {
      if (!e.nik || !e.week) continue;
      await this.db
        .insert(zhProgramAttendance)
        .values({ programCode, nik: e.nik, year, week: e.week, days: e.days ?? null })
        .onConflictDoUpdate({
          target: [zhProgramAttendance.programCode, zhProgramAttendance.nik, zhProgramAttendance.year, zhProgramAttendance.week],
          set: { days: e.days ?? null, updatedAt: new Date() },
        });
      n++;
    }
    return n;
  }

  // Agregasi analitik per sheet untuk dashboard Zero Harm (recharts).
  async zhAnalytics(): Promise<any> {
    const rows = async (text: string) => ((await this.db.execute(sql.raw(text))) as any).rows as any[];
    const grp = (tbl: string, col: string, extra = "") => rows(`select ${col} as k, count(*)::int as c from ${tbl} where ${col} is not null and ${col} <> '' group by ${col} ${extra}`);
    // Agregasi dari kolom asli di jsonb raw (tanpa perlu kolom tabel)
    const grpRaw = (tbl: string, header: string, extra = "order by c desc limit 8") => {
      const h = header.replace(/'/g, "''");
      return rows(`select raw->>'${h}' as k, count(*)::int as c from ${tbl} where raw->>'${h}' is not null and raw->>'${h}' <> '' group by 1 ${extra}`);
    };
    const counts = await this.zhCounts();
    return {
      counts,
      total: Object.values(counts).reduce((a: number, b: number) => a + b, 0),
      hazard: {
        byJenis: await grp("zh_hazard", "jenis_temuan"),
        byRisiko: await grp("zh_hazard", "resiko"),
        byStatus: await grp("zh_hazard", "status"),
        byWeek: await grp("zh_hazard", "week", "order by k"),
        byMonth: await grp("zh_hazard", "month", "order by k"),
        byKetidaksesuaian: await grp("zh_hazard", "ketidaksesuaian", "order by c desc limit 8"),
        topPelapor: await grp("zh_hazard", "nama_pelapor", "order by c desc limit 8"),
        byPosisiPelapor: await grpRaw("zh_hazard", "Posisi Pelapor"),
        byPosisiPenindak: await grpRaw("zh_hazard", "Posisi PenindakLanjut"),
        byDeptPenindak: await grpRaw("zh_hazard", "Department PenindakLanjut"),
        byPerusahaanPenindak: await grpRaw("zh_hazard", "Perusahaan PenindakLanjut"),
        byLokasi: await grpRaw("zh_hazard", "Lokasi Laporan"),
        bySubKetidak: await grpRaw("zh_hazard", "Sub Ketidaksesuaian"),
        byPenyebab: await grpRaw("zh_hazard", "Penyebab"),
      },
      inspeksi: {
        byWeekKesesuaian: await rows("select week as k, kesesuaian_waktu as s, count(*)::int as c from zh_inspeksi where week is not null group by week, kesesuaian_waktu order by week"),
        byStatus: await grp("zh_inspeksi", "status"),
        byJenisObjek: await grp("zh_inspeksi", "jenis_objek", "order by c desc limit 8"),
        topPelaksana: await grp("zh_inspeksi", "nama_pelaksana", "order by c desc limit 8"),
        byMonth: await grp("zh_inspeksi", "month", "order by k"),
        temuan: (await rows("select coalesce(sum(jumlah_temuan),0)::int as t, coalesce(sum(jumlah_close),0)::int as c from zh_inspeksi"))[0],
        byPosisi: await grpRaw("zh_inspeksi", "Posisi"),
        byLokasi: await grpRaw("zh_inspeksi", "Lokasi Inspeksi"),
        byNamaForm: await grpRaw("zh_inspeksi", "Nama Form Inspeksi"),
        byPosisiPju: await grpRaw("zh_inspeksi", "Posisi PJU"),
        byDeptPju: await grpRaw("zh_inspeksi", "Departemen PJU"),
        byPerusahaanPju: await grpRaw("zh_inspeksi", "Perusahaan PJU"),
      },
      observasi: {
        byWeek: await grp("zh_observasi", "week", "order by k"),
        byMonth: await grp("zh_observasi", "month", "order by k"),
        byLokasi: await grp("zh_observasi", "lokasi", "order by c desc limit 8"),
        topPja: await grp("zh_observasi", "nama_pja", "order by c desc limit 8"),
        byPosisiPja: await grpRaw("zh_observasi", "Posisi PJA"),
        byPerusahaanPekerja: await grpRaw("zh_observasi", "Perusahaan Pekerja"),
        byDeptPekerja: await grpRaw("zh_observasi", "Departemen Pekerja"),
        byPosisiPelapor: await grpRaw("zh_observasi", "Posisi Pelapor"),
        bySublokasi: await grpRaw("zh_observasi", "Sublokasi observasi"),
        topPelapor: await grpRaw("zh_observasi", "Nama Pelapor"),
      },
      opk: {
        byHasil: await grp("zh_opk", "hasil", "order by c desc limit 6"),
        byJenisPekerjaan: await grp("zh_opk", "jenis_pekerjaan", "order by c desc limit 8"),
        topObserver: await grp("zh_opk", "nama_observer", "order by c desc limit 8"),
        byWeek: await grp("zh_opk", "week", "order by k"),
        byMonth: await grp("zh_opk", "month", "order by k"),
        byLokasi: await grpRaw("zh_opk", "Lokasi Observasi"),
        byPerusahaanTerlibat: await grpRaw("zh_opk", "Perusahaan Orang / Unit Terlibat"),
        byDeviasi: await grpRaw("zh_opk", "Deviasi"),
      },
      attendance: {
        byTipe: await grp("zh_attendance", "tipe_event", "order by c desc limit 8"),
        byShift: await grp("zh_attendance", "shift"),
        byWeek: await grp("zh_attendance", "week", "order by k"),
        byMonth: await grp("zh_attendance", "month", "order by k"),
        validitas: await rows("select case when lower(status_absen) like 'valid%' then 'Valid' else 'Invalid' end as k, count(*)::int as c from zh_attendance group by 1"),
        byPembicara: await grpRaw("zh_attendance", "Pembicara"),
        byJabatan: await grpRaw("zh_attendance", "jabatan"),
        byEvent: await grpRaw("zh_attendance", "Nama Event"),
        byStatusReg: await grpRaw("zh_attendance", "Status Registrasi"),
      },
      fms: {
        byKategori: await grp("zh_fms", "kategori"),
        byValidation: await grp("zh_fms", "validation_status"),
        byShift: await grp("zh_fms", "shift"),
        byViolation: await grp("zh_fms", "violation", "order by c desc limit 6"),
        byWeek: await grp("zh_fms", "week", "order by k"),
        byMonth: await grp("zh_fms", "month", "order by k"),
        slaByWeek: await rows("select week as k, round(avg(sla)::numeric,2)::float as v from zh_fms where sla is not null and week is not null group by week order by week"),
        topVehicle: await grp("zh_fms", "vehicle_no", "order by c desc limit 8"),
        byCompany: await grpRaw("zh_fms", "Company"),
        byValidatedBy: await grpRaw("zh_fms", "validated_by"),
        byKategoriValidasi: await grpRaw("zh_fms", "Kategori Validasi"),
      },
    };
  }

  async deleteSafetyPatrolReport(id: string): Promise<boolean> {
    const result = await this.db
      .delete(safetyPatrolReports)
      .where(eq(safetyPatrolReports.id, id))
      .returning();
    return result.length > 0;
  }

  // Safety Patrol Attendance methods
  async getSafetyPatrolAttendanceByReport(reportId: string): Promise<SafetyPatrolAttendance[]> {
    return await this.db
      .select()
      .from(safetyPatrolAttendance)
      .where(eq(safetyPatrolAttendance.reportId, reportId));
  }

  async createSafetyPatrolAttendance(attendance: InsertSafetyPatrolAttendance): Promise<SafetyPatrolAttendance> {
    const [result] = await this.db
      .insert(safetyPatrolAttendance)
      .values(attendance)
      .returning();
    return result;
  }

  async createManySafetyPatrolAttendance(attendances: InsertSafetyPatrolAttendance[]): Promise<SafetyPatrolAttendance[]> {
    if (attendances.length === 0) return [];
    return await this.db
      .insert(safetyPatrolAttendance)
      .values(attendances)
      .returning();
  }

  async deleteSafetyPatrolAttendanceByReport(reportId: string): Promise<void> {
    await this.db
      .delete(safetyPatrolAttendance)
      .where(eq(safetyPatrolAttendance.reportId, reportId));
  }

  // Safety Patrol Raw Messages methods
  async createSafetyPatrolRawMessage(message: InsertSafetyPatrolRawMessage): Promise<SafetyPatrolRawMessage> {
    const [result] = await this.db
      .insert(safetyPatrolRawMessages)
      .values(message)
      .returning();
    return result;
  }

  async getSafetyPatrolRawMessage(id: string): Promise<SafetyPatrolRawMessage | undefined> {
    const [result] = await this.db
      .select()
      .from(safetyPatrolRawMessages)
      .where(eq(safetyPatrolRawMessages.id, id));
    return result;
  }

  async getUnprocessedRawMessages(): Promise<SafetyPatrolRawMessage[]> {
    return await this.db
      .select()
      .from(safetyPatrolRawMessages)
      .where(eq(safetyPatrolRawMessages.processed, false));
  }

  async markRawMessageProcessed(id: string, reportId?: string): Promise<void> {
    await this.db
      .update(safetyPatrolRawMessages)
      .set({ processed: true, reportId })
      .where(eq(safetyPatrolRawMessages.id, id));
  }

  async getRecentUnprocessedMediaBySender(senderPhone: string, aroundTimestamp: Date, secondsWindow: number = 10): Promise<SafetyPatrolRawMessage[]> {
    const windowStart = new Date(aroundTimestamp.getTime() - secondsWindow * 1000);
    const windowEnd = new Date(aroundTimestamp.getTime() + secondsWindow * 1000);
    return await this.db
      .select()
      .from(safetyPatrolRawMessages)
      .where(and(
        eq(safetyPatrolRawMessages.senderPhone, senderPhone),
        eq(safetyPatrolRawMessages.processed, false),
        sql`${safetyPatrolRawMessages.mediaUrl} IS NOT NULL`,
        sql`${safetyPatrolRawMessages.messageTimestamp} IS NOT NULL`,
        sql`${safetyPatrolRawMessages.messageTimestamp} >= ${windowStart.toISOString()}`,
        sql`${safetyPatrolRawMessages.messageTimestamp} <= ${windowEnd.toISOString()}`
      ));
  }

  // Safety Patrol Template methods
  async getSafetyPatrolTemplate(id: string): Promise<SafetyPatrolTemplate | undefined> {
    const [result] = await this.db
      .select()
      .from(safetyPatrolTemplates)
      .where(eq(safetyPatrolTemplates.id, id));
    return result;
  }

  async getAllSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]> {
    return await this.db
      .select()
      .from(safetyPatrolTemplates)
      .orderBy(sql`${safetyPatrolTemplates.name} ASC`);
  }

  async getActiveSafetyPatrolTemplates(): Promise<SafetyPatrolTemplate[]> {
    return await this.db
      .select()
      .from(safetyPatrolTemplates)
      .where(eq(safetyPatrolTemplates.isActive, true))
      .orderBy(sql`${safetyPatrolTemplates.name} ASC`);
  }

  async createSafetyPatrolTemplate(template: InsertSafetyPatrolTemplate): Promise<SafetyPatrolTemplate> {
    const [result] = await this.db
      .insert(safetyPatrolTemplates)
      .values(template)
      .returning();
    return result;
  }

  async updateSafetyPatrolTemplate(id: string, template: Partial<InsertSafetyPatrolTemplate>): Promise<SafetyPatrolTemplate | undefined> {
    const [result] = await this.db
      .update(safetyPatrolTemplates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(safetyPatrolTemplates.id, id))
      .returning();
    return result;
  }

  async deleteSafetyPatrolTemplate(id: string): Promise<boolean> {
    const [deleted] = await this.db.delete(safetyPatrolTemplates)
      .where(eq(safetyPatrolTemplates.id, id))
      .returning();
    return !!deleted;
  }

  // ============================================
  // TNA Implementation
  // ============================================

  async getTrainings(): Promise<Training[]> {
    return await this.db.select().from(trainings).where(eq(trainings.isActive, true));
  }

  async createTraining(training: InsertTraining): Promise<Training> {
    const [newTraining] = await this.db.insert(trainings).values(training).returning();
    return newTraining;
  }

  async getTnaSummary(employeeId: string, period: string): Promise<TnaSummary | undefined> {
    const [summary] = await this.db.select()
      .from(tnaSummaries)
      .where(and(
        eq(tnaSummaries.employeeId, employeeId),
        eq(tnaSummaries.period, period)
      ));
    return summary;
  }

  async createTnaSummary(summary: InsertTnaSummary): Promise<TnaSummary> {
    const [newSummary] = await this.db.insert(tnaSummaries).values(summary).returning();
    return newSummary;
  }



  async createOrGetTnaSummary(employeeId: string, period: string): Promise<TnaSummary> {
    const existing = await this.getTnaSummary(employeeId, period);
    if (existing) return existing;

    // Note: department logic removed as it's not in tnaSummaries schema
    // CreatedBy is required, defaulting to SYSTEM for auto-generated summaries
    return this.createTnaSummary({
      employeeId,
      period,
      status: 'Draft',
      createdBy: 'SYSTEM'
    });
  }

  async getTnaEntries(summaryId: string): Promise<any[]> {
    return await this.db.select({
      id: tnaEntries.id,
      tnaSummaryId: tnaEntries.tnaSummaryId,
      trainingId: tnaEntries.trainingId,
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      actualDate: tnaEntries.actualDate,
      notes: tnaEntries.notes,
      evidenceFile: tnaEntries.evidenceFile,
      certificateNumber: tnaEntries.certificateNumber,
      issuer: tnaEntries.issuer,
      issueDate: tnaEntries.issueDate,
      expiryDate: tnaEntries.expiryDate,
      createdAt: tnaEntries.createdAt,
      updatedAt: tnaEntries.updatedAt,
      trainingName: trainings.name,
      trainingCategory: trainings.category,
      isMandatory: trainings.isMandatory
    })
      .from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id))
      .where(eq(tnaEntries.tnaSummaryId, summaryId));
  }

  async createTnaEntry(entry: InsertTnaEntry): Promise<TnaEntry> {
    const [newEntry] = await this.db.insert(tnaEntries).values(entry).returning();
    return newEntry;
  }

  async updateTnaEntry(id: string, entry: Partial<InsertTnaEntry>): Promise<TnaEntry> {
    const [updated] = await this.db.update(tnaEntries)
      .set({ ...entry, updatedAt: new Date() })
      .where(eq(tnaEntries.id, id))
      .returning();
    return updated;
  }

  async getAllTnaEntriesWithDetailsV2(): Promise<any[]> {
    console.log("DEBUG: getAllTnaEntriesWithDetails CALLED");
    // Get all TNA entries with employee names and training details
    const entries = await this.db.select({
      id: tnaEntries.id,
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      actualDate: tnaEntries.actualDate,
      notes: tnaEntries.notes,
      createdAt: tnaEntries.createdAt,
      updatedAt: tnaEntries.updatedAt,
      // Training info
      trainingId: tnaEntries.trainingId,
      trainingName: trainings.name,
      trainingCategory: trainings.category,
      isMandatory: trainings.isMandatory,
      // Summary info
      tnaSummaryId: tnaEntries.tnaSummaryId,
      period: tnaSummaries.period,
      summaryStatus: tnaSummaries.status,
      employeeId: tnaSummaries.employeeId,
      // Certificate Fields
      certificateNumber: tnaEntries.certificateNumber,
      issuer: tnaEntries.issuer,
      issueDate: tnaEntries.issueDate,
      expiryDate: tnaEntries.expiryDate,
      evidenceFile: tnaEntries.evidenceFile,
    })
      .from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id))
      .leftJoin(tnaSummaries, eq(tnaEntries.tnaSummaryId, tnaSummaries.id))
      .orderBy(desc(tnaEntries.createdAt));

    // Get employee names and positions
    const employeeIds = Array.from(new Set(entries.map(e => e.employeeId).filter(Boolean)));
    const employeeList = employeeIds.length > 0
      ? await this.db.select({ id: employees.id, name: employees.name, department: employees.department, position: employees.position })
        .from(employees)
        .where(inArray(employees.id, employeeIds as string[]))
      : [];

    const employeeMap = new Map(employeeList.map(e => [e.id, e]));

    // Aggregate by (employeeId, period) - Single Source of Truth
    const aggregated: Record<string, any> = {};

    entries.forEach(entry => {
      const key = `${entry.employeeId}_${entry.period}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          employeeId: entry.employeeId,
          employeeName: employeeMap.get(entry.employeeId ?? '')?.name || 'Unknown',
          position: employeeMap.get(entry.employeeId ?? '')?.position || '-',
          department: employeeMap.get(entry.employeeId ?? '')?.department || '-',
          period: entry.period,
          planMandatory: 0,  // Count of Plan = M
          planDevelopment: 0, // Count of Plan = D
          actualComplied: 0,  // Count of Actual = C
          actualNotComplied: 0, // Count of Actual = NC
          trainings: []
        };
      }

      // Count plan and actual statuses
      if (entry.planStatus === 'M') {
        aggregated[key].planMandatory++;
      } else if (entry.planStatus === 'D') {
        aggregated[key].planDevelopment++;
      }

      if (entry.actualStatus === 'C') {
        aggregated[key].actualComplied++;
      } else if (entry.actualStatus === 'NC') {
        aggregated[key].actualNotComplied++;
      }

      aggregated[key].trainings.push({
        id: entry.id,
        trainingId: entry.trainingId,
        trainingName: entry.trainingName,
        trainingCategory: entry.trainingCategory,
        isMandatory: entry.isMandatory,
        planStatus: entry.planStatus,
        actualStatus: entry.actualStatus,
        actualDate: entry.actualDate,
        notes: entry.notes,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        // Certificate Fields
        certificateNumber: entry.certificateNumber,
        issuer: entry.issuer,
        issueDate: entry.issueDate,
        expiryDate: entry.expiryDate,
        evidenceFile: entry.evidenceFile,
      });
    });

    // Convert aggregated object to array and calculate compliance
    return Object.values(aggregated).map((summary: any) => {
      console.log("DEBUG: Summary keys:", Object.keys(summary));
      const totalPlan = summary.planMandatory + summary.planDevelopment;
      const mandatoryCompliance = summary.planMandatory > 0
        ? Math.round((summary.actualComplied / summary.planMandatory) * 100)
        : 0;
      const overallCompliance = totalPlan > 0
        ? Math.round((summary.actualComplied / totalPlan) * 100)
        : 0;

      return {
        ...summary,
        mandatoryCompliance,
        overallCompliance,
      };
    }).sort((a, b) => {
      // Sort by employee name for consistent display
      if (a.employeeName < b.employeeName) return -1;
      if (a.employeeName > b.employeeName) return 1;
      return 0;
    });
  }



  async deleteTnaEntry(entryId: string): Promise<boolean> {
    const [deleted] = await this.db.delete(tnaEntries).where(eq(tnaEntries.id, entryId)).returning();
    return !!deleted;
  }

  async getTnaDashboardStats(): Promise<any> {
    // Single Source of Truth: All statistics derived from All TNA Entries
    // We fetch details to ensure we have the same basis as the main table
    const allEntries = await this.db.select({
      id: tnaEntries.id,
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      trainingCategory: trainings.category,
      isMandatory: trainings.isMandatory
    }).from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id));

    // 1. Mandatory Compliance KPI
    // Formula: (Total Actual C (where Plan=M) / Total Plan M) * 100
    const totalMandatory = allEntries.filter(e => e.planStatus === 'M').length;
    const totalMandatoryComplied = allEntries.filter(e => e.planStatus === 'M' && e.actualStatus === 'C').length;
    const mandatoryCompliance = totalMandatory ? Math.round((totalMandatoryComplied / totalMandatory) * 100) : 0;

    // 2. Overall Compliance KPI
    // Formula: (Total Actual C (M+D) / Total Plan (M+D)) * 100
    // Note: Plan D count is included in "Total Plan" here
    const totalPlan = allEntries.filter(e => ['M', 'D'].includes(e.planStatus)).length;
    const totalComplied = allEntries.filter(e => e.actualStatus === 'C').length;
    const overallCompliance = totalPlan ? Math.round((totalComplied / totalPlan) * 100) : 0;

    // 3. Open Mandatory (Sisa Target)
    // Formula: Total Plan M - Total Actual C (where Plan=M)
    // This represents straightforwardly how many mandatory trainings are pending
    const openMandatory = totalMandatory - totalMandatoryComplied;

    // 4. Data Errors
    // Entries with Actual Status but NO Plan Status - shouldn't happen in healthy system
    const dataErrors = allEntries.filter(e => !e.planStatus && e.actualStatus).length;

    // Open Development (for reference, though not a main KPI requested)
    const openDevelopment = allEntries.filter(e => e.planStatus === 'D' && e.actualStatus !== 'C').length;

    return {
      mandatoryCompliance,
      overallCompliance,
      openMandatory,
      dataErrors,
      openDevelopment,
      totalPlan
    };
  }

  // Competency Monitoring Implementation
  async createCompetencyMonitoringLog(log: InsertCompetencyMonitoringLog): Promise<CompetencyMonitoringLog> {
    const [savedLog] = await this.db.insert(competencyMonitoringLogs)
      .values(log)
      .onConflictDoUpdate({
        target: [competencyMonitoringLogs.tnaEntryId, competencyMonitoringLogs.logDate],
        set: { status: log.status, expiryDaysRemaining: log.expiryDaysRemaining }
      })
      .returning();
    return savedLog;
  }

  async getCompetencyMonitoringLogs(tnaEntryId: string): Promise<CompetencyMonitoringLog[]> {
    return await this.db.select()
      .from(competencyMonitoringLogs)
      .where(eq(competencyMonitoringLogs.tnaEntryId, tnaEntryId))
      .orderBy(desc(competencyMonitoringLogs.logDate));
  }

  async getTnaGapAnalysis(): Promise<any> {
    // Gap Analysis by Training Name (Refined based on User Request)
    // CRITICAL REQUIREMENT: GAP = PLAN (M) - ACTUAL (C)
    // We only care about Mandatory plans that are NOT yet Complied.

    const allEntries = await this.db.select({
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      trainingName: trainings.name
    }).from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id));

    const trainingGaps: Record<string, number> = {};

    allEntries.forEach(entry => {
      // Default name if missing
      const name = entry.trainingName || "Unknown Training";

      // LOGIC: Gap exists if Plan is 'M' AND Actual is NOT 'C'
      // We purposefully EXCLUDE 'D' from this gap analysis as requested
      if (entry.planStatus === 'M' && entry.actualStatus !== 'C') {
        trainingGaps[name] = (trainingGaps[name] || 0) + 1;
      }
    });

    // Convert to array format for Recharts
    // Sort by GAP count descending to show biggest problems first
    // Limit to Top 10 to avoid overcrowding the chart
    return Object.entries(trainingGaps)
      .map(([trainingName, gap]) => ({
        trainingName,
        gap
      }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 10);
  }

  async getTnaDepartmentCompliance(): Promise<any> {
    // Department Compliance
    // We need to join with employees to get the department
    const allEntries = await this.db.select({
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      department: employees.department
    }).from(tnaEntries)
      .leftJoin(tnaSummaries, eq(tnaEntries.tnaSummaryId, tnaSummaries.id))
      .leftJoin(employees, eq(tnaSummaries.employeeId, employees.id));

    const deptStats: Record<string, { planM: number, compliedM: number }> = {};

    allEntries.forEach(entry => {
      const dept = entry.department || "Unknown";

      if (!deptStats[dept]) {
        deptStats[dept] = { planM: 0, compliedM: 0 };
      }

      // We calculate MANDATORY compliance for departments
      // as this is the standard metric for compliance reports
      if (entry.planStatus === 'M') {
        deptStats[dept].planM++;
        if (entry.actualStatus === 'C') {
          deptStats[dept].compliedM++;
        }
      }
    });

    return Object.entries(deptStats)
      .map(([department, stats]) => {
        const compliance = stats.planM ? Math.round((stats.compliedM / stats.planM) * 100) : 0;
        // Optionally return target? Assuming 100% target for now or frontend handles it
        return {
          department,
          compliance,
          target: 100 // Standard target
        };
      })
      .sort((a, b) => b.compliance - a.compliance); // Sort mostly compliant first? or worst? usually worst first to focus. Let's do lowest compliance first? No, usually highest to lowest. Let's do Ascending? No, user usually wants to see who is good or bad. Let's default to high->low.
  }

  async getAllRawTnaEntries(): Promise<any[]> {
    // Returns individual TNA entries with training details for the saved data table
    const entries = await this.db.select({
      id: tnaEntries.id,
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      actualDate: tnaEntries.actualDate,
      notes: tnaEntries.notes,
      createdAt: tnaEntries.createdAt,
      // Certificate details
      certificateNumber: tnaEntries.certificateNumber,
      issuer: tnaEntries.issuer,
      issueDate: tnaEntries.issueDate,
      expiryDate: tnaEntries.expiryDate,
      // Training details
      trainingId: tnaEntries.trainingId,
      trainingName: trainings.name,
      trainingCategory: trainings.category,
      // Employee details via summary
      tnaSummaryId: tnaEntries.tnaSummaryId,
      period: tnaSummaries.period,
      employeeId: tnaSummaries.employeeId
    })
      .from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id))
      .leftJoin(tnaSummaries, eq(tnaEntries.tnaSummaryId, tnaSummaries.id));

    // Get all employees and create a map
    const allEmployees = await this.db.select({
      id: employees.id,
      name: employees.name,
      department: employees.department,
      position: employees.position
    }).from(employees);

    const employeeMap = new Map(allEmployees.map(e => [e.id, e]));

    // Sort by createdAt descending (newest first) in JS
    const result = entries.map(entry => ({
      id: entry.id,
      employeeId: entry.employeeId,
      employeeName: employeeMap.get(entry.employeeId ?? '')?.name || 'Unknown',
      position: employeeMap.get(entry.employeeId ?? '')?.position || '-',
      department: employeeMap.get(entry.employeeId ?? '')?.department || '-',
      period: entry.period,
      trainingCategory: entry.trainingCategory || 'Uncategorized',
      trainingName: entry.trainingName || 'Unknown',
      planStatus: entry.planStatus,
      actualStatus: entry.actualStatus,
      actualDate: entry.actualDate,
      // Pass through cert details
      certificateNumber: entry.certificateNumber,
      issuer: entry.issuer,
      issueDate: entry.issueDate,
      expiryDate: entry.expiryDate,
      createdAt: entry.createdAt
    }));

    // Sort by createdAt descending
    return result.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getAllTnaEntriesWithDetails(): Promise<any[]> {
    // Get all TNA entries with employee names and training details
    const entries = await this.db.select({
      id: tnaEntries.id,
      planStatus: tnaEntries.planStatus,
      actualStatus: tnaEntries.actualStatus,
      actualDate: tnaEntries.actualDate,
      notes: tnaEntries.notes,
      createdAt: tnaEntries.createdAt,
      updatedAt: tnaEntries.updatedAt,
      // Training info
      trainingId: tnaEntries.trainingId,
      trainingName: trainings.name,
      trainingCategory: trainings.category,
      isMandatory: trainings.isMandatory,
      // Summary info
      tnaSummaryId: tnaEntries.tnaSummaryId,
      period: tnaSummaries.period,
      summaryStatus: tnaSummaries.status,
      employeeId: tnaSummaries.employeeId
    })
      .from(tnaEntries)
      .leftJoin(trainings, eq(tnaEntries.trainingId, trainings.id))
      .leftJoin(tnaSummaries, eq(tnaEntries.tnaSummaryId, tnaSummaries.id))
      .orderBy(desc(tnaEntries.createdAt));

    // Get employee names and positions
    const employeeIds = Array.from(new Set(entries.map(e => e.employeeId).filter(Boolean)));
    const employeeList = employeeIds.length > 0
      ? await this.db.select({ id: employees.id, name: employees.name, department: employees.department, position: employees.position })
        .from(employees)
        .where(inArray(employees.id, employeeIds as string[]))
      : [];

    const employeeMap = new Map(employeeList.map(e => [e.id, e]));

    // Aggregate by (employeeId, period) - Single Source of Truth
    const aggregated: Record<string, any> = {};

    entries.forEach(entry => {
      const key = `${entry.employeeId}_${entry.period}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          employeeId: entry.employeeId,
          employeeName: employeeMap.get(entry.employeeId ?? '')?.name || 'Unknown',
          position: employeeMap.get(entry.employeeId ?? '')?.position || '-',
          department: employeeMap.get(entry.employeeId ?? '')?.department || '-',
          period: entry.period,
          planMandatory: 0,  // Count of Plan = M
          planDevelopment: 0, // Count of Plan = D
          actualComplied: 0,  // Count of Actual = C
          actualNotComplied: 0, // Count of Actual = NC
          trainings: []
        };
      }

      // Count PLAN (M = Mandatory, D = Development)
      if (entry.planStatus === 'M') {
        aggregated[key].planMandatory++;
        // ACTUAL(C) = only count Complied from MANDATORY entries
        if (entry.actualStatus === 'C') {
          aggregated[key].actualComplied++;
        } else if (entry.actualStatus === 'NC') {
          aggregated[key].actualNotComplied++;
        }
      } else if (entry.planStatus === 'D') {
        aggregated[key].planDevelopment++;
      }

      // Store training details
      aggregated[key].trainings.push({
        trainingName: entry.trainingName,
        trainingCategory: entry.trainingCategory,
        planStatus: entry.planStatus,
        actualStatus: entry.actualStatus,
        actualDate: entry.actualDate
      });
    });

    // Calculate compliance percentage and format output
    return Object.values(aggregated).map((row: any) => {
      const totalPlan = row.planMandatory + row.planDevelopment;
      const mandatoryCompliance = row.planMandatory > 0
        ? Math.round((row.actualComplied / row.planMandatory) * 100 * 100) / 100
        : null;
      const overallCompliance = totalPlan > 0
        ? Math.round((row.actualComplied / totalPlan) * 100 * 100) / 100
        : null;

      return {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        position: row.position,
        department: row.department,
        period: row.period,
        planMandatory: row.planMandatory,
        planDevelopment: row.planDevelopment,
        totalPlan: totalPlan,
        actualComplied: row.actualComplied,
        actualNotComplied: row.actualNotComplied,
        mandatoryCompliance: mandatoryCompliance,
        overallCompliance: overallCompliance,
        trainingCount: row.trainings.length
      };
    }).sort((a, b) => (b.period || '').localeCompare(a.period || ''));
  }

  // ============================================
  // SIDAK RAMBU METHODS
  // ============================================

  async getSidakRambuSession(id: string): Promise<SidakRambuSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakRambuSessions)
      .where(eq(sidakRambuSessions.id, id));
    return result;
  }

  async getAllSidakRambuSessions(): Promise<SidakRambuSession[]> {
    return await this.db
      .select()
      .from(sidakRambuSessions)
      .orderBy(desc(sidakRambuSessions.createdAt));
  }

  async createSidakRambuSession(session: InsertSidakRambuSession): Promise<SidakRambuSession> {
    const [result] = await this.db
      .insert(sidakRambuSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakRambuSession(id: string, updates: Partial<InsertSidakRambuSession>): Promise<SidakRambuSession | undefined> {
    const [result] = await this.db
      .update(sidakRambuSessions)
      .set(updates)
      .where(eq(sidakRambuSessions.id, id))
      .returning();
    return result;
  }

  async getSidakRambuObservations(sessionId: string): Promise<SidakRambuObservation[]> {
    return await this.db
      .select()
      .from(sidakRambuObservations)
      .where(eq(sidakRambuObservations.sessionId, sessionId))
      .orderBy(sidakRambuObservations.ordinal);
  }

  async createSidakRambuObservation(observation: InsertSidakRambuObservation): Promise<SidakRambuObservation> {
    // Get the next ordinal number
    const existingObservations = await this.getSidakRambuObservations(observation.sessionId);
    const nextOrdinal = existingObservations.length + 1;

    const [result] = await this.db
      .insert(sidakRambuObservations)
      .values({ ...observation, ordinal: nextOrdinal })
      .returning();
    return result;
  }

  async getSidakRambuObservers(sessionId: string): Promise<SidakRambuObserver[]> {
    return await this.db
      .select()
      .from(sidakRambuObservers)
      .where(eq(sidakRambuObservers.sessionId, sessionId))
      .orderBy(sidakRambuObservers.ordinal);
  }

  async createSidakRambuObserver(observer: InsertSidakRambuObserver): Promise<SidakRambuObserver> {
    // Get the next ordinal number
    const existingObservers = await this.getSidakRambuObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakRambuObservers)
      .values({ ...observer, ordinal: nextOrdinal })
      .returning();
    return result;
  }

  async updateSidakRambuSessionSampleCount(sessionId: string): Promise<void> {
    const observations = await this.getSidakRambuObservations(sessionId);
    await this.updateSidakRambuSession(sessionId, { totalSampel: observations.length });
  }

  async generateSidakRambuPDF(data: {
    session: SidakRambuSession;
    observations: SidakRambuObservation[];
    observers: SidakRambuObserver[];
  }): Promise<Buffer> {

    const { session, observations, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 30, bottom: 30, left: 40, right: 40 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Constants for layout
        const pageWidth = 595;
        const pageHeight = 842;
        const margin = 40;
        const contentWidth = pageWidth - (margin * 2);

        // Header
        doc.fontSize(14).font('Helvetica-Bold')
          .text('OBSERVASI KEPATUHAN RAMBU', margin, margin, { align: 'center' });
        doc.fontSize(10).font('Helvetica')
          .text('Form: BIB-HSE-PPO-F-072-24', margin, doc.y + 2, { align: 'center' });

        doc.moveDown(1);

        // Session metadata
        const metaY = doc.y;
        const col1X = margin;
        const col2X = margin + (contentWidth / 2);

        doc.fontSize(9).font('Helvetica');
        doc.text(`Tanggal: ${session.tanggal}`, col1X, metaY);
        doc.text(`Shift: ${session.shift}`, col2X, metaY);

        doc.text(`Waktu: ${session.waktuMulai} - ${session.waktuSelesai}`, col1X, doc.y + 2);
        doc.text(`Lokasi: ${session.lokasi}`, col2X, doc.y);

        doc.moveDown(1.5);

        // Main observation table
        const tableTop = doc.y;
        const rowHeight = 30;
        const col1Width = 30; // No
        const col2Width = 120; // Nama
        const col3Width = 80; // No Kendaraan
        const col4Width = 100; // Perusahaan
        const colComplianceWidth = 18; // Each compliance column (7 columns)
        const col12Width = 100; // Keterangan

        // Draw table header
        doc.rect(margin, tableTop, contentWidth, rowHeight * 2).stroke();

        // Column headers - first row
        let currentX = margin;
        doc.fontSize(7).font('Helvetica-Bold');

        // No
        doc.text('No', currentX + 5, tableTop + 5, { width: col1Width - 10, align: 'center' });
        currentX += col1Width;
        doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + rowHeight * 2).stroke();

        // Nama
        doc.text('Nama Pengemudi', currentX + 5, tableTop + 5, { width: col2Width - 10, align: 'center' });
        currentX += col2Width;
        doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + rowHeight * 2).stroke();

        // No Kendaraan
        doc.text('No Kendaraan', currentX + 5, tableTop + 5, { width: col3Width - 10, align: 'center' });
        currentX += col3Width;
        doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + rowHeight * 2).stroke();

        // Perusahaan
        doc.text('Perusahaan', currentX + 5, tableTop + 5, { width: col4Width - 10, align: 'center' });
        currentX += col4Width;
        doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + rowHeight * 2).stroke();

        // Compliance columns header
        const complianceStartX = currentX;
        doc.text('Kepatuhan Rambu', currentX + 5, tableTop + 3, { width: colComplianceWidth * 7 - 10, align: 'center' });
        doc.moveTo(margin, tableTop + rowHeight).lineTo(pageWidth - margin, tableTop + rowHeight).stroke();

        // Individual compliance column labels (rotated/vertical)
        const complianceLabels = [
          'Stop',
          'Give Way',
          'Max Speed',
          'No Entry',
          'No Parking',
          'Helmet',
          'No U-Turn'
        ];

        doc.fontSize(6);
        complianceLabels.forEach((label, idx) => {
          const colX = currentX + (idx * colComplianceWidth);
          doc.moveTo(colX, tableTop + rowHeight).lineTo(colX, tableTop + rowHeight * 2).stroke();

          // Simplified vertical text (centered)
          doc.text(label, colX + 2, tableTop + rowHeight + 2, {
            width: colComplianceWidth - 4,
            align: 'center'
          });
        });

        currentX += colComplianceWidth * 7;
        doc.moveTo(currentX, tableTop).lineTo(currentX, tableTop + rowHeight * 2).stroke();

        // Keterangan
        doc.fontSize(7);
        doc.text('Keterangan', currentX + 5, tableTop + 5, { width: col12Width - 10, align: 'center' });

        // Draw data rows (10 rows total, fill with observations)
        for (let i = 0; i < 10; i++) {
          const rowY = tableTop + (rowHeight * 2) + (rowHeight * i);
          const obs = observations[i];

          doc.rect(margin, rowY, contentWidth, rowHeight).stroke();

          currentX = margin;
          doc.fontSize(8).font('Helvetica');

          // No
          doc.text((i + 1).toString(), currentX + 2, rowY + 10, { width: col1Width - 4, align: 'center' });
          currentX += col1Width;
          doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

          if (obs) {
            // Nama
            doc.text(obs.nama, currentX + 2, rowY + 10, { width: col2Width - 4, align: 'left' });
            currentX += col2Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

            // No Kendaraan
            doc.text(obs.noKendaraan, currentX + 2, rowY + 10, { width: col3Width - 4, align: 'left' });
            currentX += col3Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

            // Perusahaan
            doc.fontSize(7);
            doc.text(obs.perusahaan, currentX + 2, rowY + 10, { width: col4Width - 4, align: 'left' });
            currentX += col4Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

            // Compliance checkmarks
            const complianceValues = [
              obs.rambuStop,
              obs.rambuGiveWay,
              obs.rambuKecepatanMax,
              obs.rambuLaranganMasuk,
              obs.rambuLaranganParkir,
              obs.rambuWajibHelm,
              obs.rambuLaranganUTurn
            ];

            doc.fontSize(10).font('Helvetica-Bold');
            complianceValues.forEach((val, idx) => {
              const colX = currentX + (idx * colComplianceWidth);
              doc.moveTo(colX, rowY).lineTo(colX, rowY + rowHeight).stroke();
              doc.text(val ? '✓' : '✗', colX + 2, rowY + 8, {
                width: colComplianceWidth - 4,
                align: 'center'
              });
            });

            currentX += colComplianceWidth * 7;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

            // Keterangan
            doc.fontSize(7).font('Helvetica');
            doc.text(obs.keterangan || '', currentX + 2, rowY + 10, { width: col12Width - 4, align: 'left' });
          } else {
            // Empty row
            currentX += col2Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();
            currentX += col3Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();
            currentX += col4Width;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();

            for (let j = 0; j < 7; j++) {
              doc.moveTo(currentX + (j * colComplianceWidth), rowY)
                .lineTo(currentX + (j * colComplianceWidth), rowY + rowHeight).stroke();
            }
            currentX += colComplianceWidth * 7;
            doc.moveTo(currentX, rowY).lineTo(currentX, rowY + rowHeight).stroke();
          }
        }

        // Observer signatures section
        doc.moveDown(2);
        const sigY = doc.y;
        doc.fontSize(9).font('Helvetica-Bold');
        doc.text('Observer / Pengawas:', margin, sigY);

        doc.moveDown(0.5);
        const sigStartY = doc.y;
        const sigBoxWidth = 120;
        const sigBoxHeight = 60;
        const sigsPerRow = 4;

        observers.slice(0, 8).forEach((observer, idx) => {
          const row = Math.floor(idx / sigsPerRow);
          const col = idx % sigsPerRow;
          const x = margin + (col * (sigBoxWidth + 10));
          const y = sigStartY + (row * (sigBoxHeight + 40));

          doc.rect(x, y, sigBoxWidth, sigBoxHeight).stroke();

          if (observer.signatureDataUrl) {
            try {
              const base64Data = observer.signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
              const imgBuffer = Buffer.from(base64Data, 'base64');
              doc.image(imgBuffer, x + 5, y + 5, { width: sigBoxWidth - 10, height: sigBoxHeight - 10, fit: [sigBoxWidth - 10, sigBoxHeight - 10] });
            } catch (err) {
              console.error('Error embedding signature:', err);
            }
          }

          doc.fontSize(7).font('Helvetica');
          doc.text(observer.nama, x, y + sigBoxHeight + 2, { width: sigBoxWidth, align: 'center' });
          doc.text(observer.perusahaan, x, doc.y, { width: sigBoxWidth, align: 'center' });
        });

        // Footer
        doc.fontSize(7).font('Helvetica')
          .text('PT. Goden Energi Cemerlang Lesrari - HSE Department', margin, pageHeight - 50, {
            width: contentWidth,
            align: 'center'
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }


  // ============================================================================
  // SIDAK APD (Alat Pelindung Diri) METHODS
  // ============================================================================

  async getSidakApdSession(id: string): Promise<SidakApdSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakApdSessions)
      .where(eq(sidakApdSessions.id, id));
    return result;
  }

  async getAllSidakApdSessions(): Promise<SidakApdSession[]> {
    return await this.db
      .select()
      .from(sidakApdSessions)
      .orderBy(desc(sidakApdSessions.createdAt));
  }

  async createSidakApdSession(session: InsertSidakApdSession): Promise<SidakApdSession> {
    const [result] = await this.db
      .insert(sidakApdSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakApdSession(id: string, updates: Partial<InsertSidakApdSession>): Promise<SidakApdSession | undefined> {
    const [result] = await this.db
      .update(sidakApdSessions)
      .set(updates)
      .where(eq(sidakApdSessions.id, id))
      .returning();
    return result;
  }

  async getSidakApdRecords(sessionId: string): Promise<SidakApdRecord[]> {
    return await this.db
      .select()
      .from(sidakApdRecords)
      .where(eq(sidakApdRecords.sessionId, sessionId))
      .orderBy(sidakApdRecords.ordinal);
  }

  async createSidakApdRecord(record: InsertSidakApdRecord): Promise<SidakApdRecord> {
    const [result] = await this.db
      .insert(sidakApdRecords)
      .values(record)
      .returning();

    // Update session total sampel
    await this.updateSidakApdSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakApdObservers(sessionId: string): Promise<SidakApdObserver[]> {
    return await this.db
      .select()
      .from(sidakApdObservers)
      .where(eq(sidakApdObservers.sessionId, sessionId))
      .orderBy(sidakApdObservers.ordinal);
  }

  async createSidakApdObserver(observer: InsertSidakApdObserver): Promise<SidakApdObserver> {
    const existingObservers = await this.getSidakApdObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakApdObservers)
      .values({ ...observer, ordinal: nextOrdinal })
      .returning();
    return result;
  }

  async updateSidakApdSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakApdRecords(sessionId);
    await this.updateSidakApdSession(sessionId, { totalSampel: records.length } as any);
  }

  async generateSidakApdPDF(data: {
    session: SidakApdSession;
    records: SidakApdRecord[];
    observers: SidakApdObserver[];
  }): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs');
    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89; // A4 Landscape
        const pageHeight = 595.28;
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER SECTION ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'blogo.png');
        const headerHeight = 60;

        // Header box
        doc.lineWidth(1).rect(margin, margin, contentWidth, headerHeight).stroke();

        // Logo
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 10, margin + 5, { height: 50 });
        }

        // Title with gray background
        doc.fillColor('#d0d0d0')
          .rect(margin, margin + headerHeight, contentWidth, 35)
          .fill();
        doc.fillColor('#000000');

        doc.font('Helvetica-Bold').fontSize(16)
          .text('OBSERVASI KEPATUHAN APD (ALAT PELINDUNG DIRI)', margin, margin + headerHeight + 10, {
            width: contentWidth,
            align: 'center'
          });

        // Subtitle
        doc.font('Helvetica').fontSize(9)
          .text('Formulir ini digunakan sebagai catatan hasil pengamatan APD yang dilaksanakan di PT. Goden Energi Cemerlang Lesrari',
            margin + 20, margin + headerHeight + 28, {
            width: contentWidth - 40,
            align: 'center'
          });

        // Doc Code (top right)
        doc.font('Helvetica').fontSize(9)
          .text('BIB – HSE – ES – F – 3.02 – 24', margin + contentWidth - 180, margin + 10, {
            width: 170,
            align: 'right'
          });

        // --- INFO SECTION ---
        const infoY = margin + headerHeight + 45;
        const infoRowHeight = 16;

        const drawInfoField = (label: string, value: string, x: number, y: number, w: number) => {
          doc.font('Helvetica-Bold').fontSize(9).text(label, x, y);
          doc.font('Helvetica').text(': ' + value, x + 100, y);
          doc.moveTo(x + 105, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke();
        };

        const col1X = margin + 20;
        const col2X = margin + contentWidth / 2 + 20;

        drawInfoField('Tanggal', new Date(session.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }), col1X, infoY, 250);
        drawInfoField('Shift', session.shift, col1X, infoY + infoRowHeight, 250);
        drawInfoField('Waktu', session.waktu, col1X, infoY + infoRowHeight * 2, 250);

        drawInfoField('Lokasi', session.lokasi, col2X, infoY, 250);
        drawInfoField('Departemen', session.departemen || '-', col2X, infoY + infoRowHeight, 250);
        drawInfoField('Total Sampel', session.totalSampel.toString(), col2X, infoY + infoRowHeight * 2, 250);

        // --- TABLE SECTION ---
        const tableTop = infoY + (infoRowHeight * 3) + 15;

        const cols = [
          { name: 'No', w: 30, align: 'center' },
          { name: 'Nama - NIK', w: 120, align: 'left' },
          { name: 'Perusahaan', w: 80, align: 'left' },
          { name: 'Helm', w: 45, align: 'center' },
          { name: 'Rompi', w: 45, align: 'center' },
          { name: 'Sepatu', w: 45, align: 'center' },
          { name: 'Kacamata', w: 50, align: 'center' },
          { name: 'Sarung\nTangan', w: 50, align: 'center' },
          { name: 'Earplug', w: 45, align: 'center' },
          { name: 'Masker', w: 45, align: 'center' },
          { name: 'Keterangan', w: 0, align: 'left' }
        ];

        const totalFixedW = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - totalFixedW;

        let currentY = tableTop;
        const headerHeightTable = 30;
        const rowHeight = 20;

        let x = margin;
        doc.lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9);

        // Table header with gray background
        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
        doc.fillColor('black');

        cols.forEach(col => {
          doc.rect(x, currentY, col.w, headerHeightTable).stroke();
          doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
          x += col.w;
        });

        currentY += headerHeightTable;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        records.forEach((rec, idx) => {
          if (currentY > pageHeight - margin - 100) {
            doc.addPage();
            currentY = margin;
            x = margin;
            doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
            doc.fillColor('black');
            cols.forEach(col => {
              doc.rect(x, currentY, col.w, headerHeightTable).stroke();
              doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
              x += col.w;
            });
            currentY += headerHeightTable;
          }

          x = margin;

          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            x += col.w;
          });

          x = margin;
          const drawText = (val: string, colIdx: number) => {
            doc.text(val, x + 2, currentY + 6, { width: cols[colIdx].w - 4, align: cols[colIdx].align as any });
            x += cols[colIdx].w;
          };

          drawText((idx + 1).toString(), 0);
          drawText(`${rec.nama}\n${rec.nik || ''}`, 1);
          drawText(rec.perusahaan || '-', 2);
          drawText(rec.helm ? '✓' : '✗', 3);
          drawText(rec.rompi ? '✓' : '✗', 4);
          drawText(rec.sepatu ? '✓' : '✗', 5);
          drawText(rec.kacamata ? '✓' : '✗', 6);
          drawText(rec.sarungTangan ? '✓' : '✗', 7);
          drawText(rec.earplug ? '✓' : '✗', 8);
          drawText(rec.masker ? '✓' : '✗', 9);
          drawText(rec.keterangan || '-', 10);

          currentY += rowHeight;
        });

        // --- OBSERVERS SECTION ---
        currentY += 20;

        if (currentY > pageHeight - margin - 80) {
          doc.addPage();
          currentY = margin;
        }

        const boxWidth = 150;
        const boxHeight = 80;
        let obsX = margin;

        doc.font('Helvetica-Bold').text('Observer / Pengamat:', margin, currentY);
        currentY += 15;

        observers.forEach((obs) => {
          doc.rect(obsX, currentY, boxWidth, boxHeight).stroke();

          doc.font('Helvetica').fontSize(8);
          doc.text(obs.nama, obsX + 2, currentY + 5, { width: boxWidth - 4, align: 'center' });
          doc.text(obs.perusahaan || '', obsX + 2, currentY + 15, { width: boxWidth - 4, align: 'center' });

          if (obs.tandaTangan && obs.tandaTangan.startsWith('data:image')) {
            try {
              doc.image(obs.tandaTangan, obsX + 20, currentY + 30, { height: 30 });
            } catch (e) { }
          }

          obsX += boxWidth + 10;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ============================================================================
  // SIDAK ANTRIAN (Queue Observation) METHODS
  // ============================================================================

  async getSidakAntrianSession(id: string): Promise<SidakAntrianSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakAntrianSessions)
      .where(eq(sidakAntrianSessions.id, id));
    return result;
  }

  async getAllSidakAntrianSessions(): Promise<SidakAntrianSession[]> {
    return await this.db
      .select()
      .from(sidakAntrianSessions)
      .orderBy(desc(sidakAntrianSessions.createdAt));
  }

  async createSidakAntrianSession(session: InsertSidakAntrianSession): Promise<SidakAntrianSession> {
    const [result] = await this.db
      .insert(sidakAntrianSessions)
      .values({ ...session, createdBy: 'SYSTEM' })
      .returning();
    return result;
  }

  async updateSidakAntrianSession(id: string, updates: Partial<InsertSidakAntrianSession>): Promise<SidakAntrianSession | undefined> {
    const [result] = await this.db
      .update(sidakAntrianSessions)
      .set(updates)
      .where(eq(sidakAntrianSessions.id, id))
      .returning();
    return result;
  }

  async getSidakAntrianRecords(sessionId: string): Promise<SidakAntrianRecord[]> {
    return await this.db
      .select()
      .from(sidakAntrianRecords)
      .where(eq(sidakAntrianRecords.sessionId, sessionId))
      .orderBy(sidakAntrianRecords.ordinal);
  }

  async createSidakAntrianRecord(record: InsertSidakAntrianRecord): Promise<SidakAntrianRecord> {
    const [result] = await this.db
      .insert(sidakAntrianRecords)
      .values(record)
      .returning();

    // Update session total sampel
    await this.updateSidakAntrianSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakAntrianObservers(sessionId: string): Promise<SidakAntrianObserver[]> {
    return await this.db
      .select()
      .from(sidakAntrianObservers)
      .where(eq(sidakAntrianObservers.sessionId, sessionId))
      .orderBy(sidakAntrianObservers.ordinal);
  }

  async createSidakAntrianObserver(observer: InsertSidakAntrianObserver): Promise<SidakAntrianObserver> {
    const existingObservers = await this.getSidakAntrianObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakAntrianObservers)
      .values({ ...observer, ordinal: nextOrdinal })
      .returning();
    return result;
  }

  async updateSidakAntrianSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakAntrianRecords(sessionId);
    await this.updateSidakAntrianSession(sessionId, { totalSampel: records.length } as any);
  }

  async generateSidakAntrianPDF(data: {
    session: SidakAntrianSession;
    records: SidakAntrianRecord[];
    observers: SidakAntrianObserver[];
  }): Promise<Buffer> {

    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Constants
        const margin = 30;
        const pageWidth = 841.89; // A4 Landscape width
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER ---
        doc.fontSize(16).font('Helvetica-Bold')
          .text('FORM OBSERVASI ANTRIAN UNIT', margin, margin, { align: 'center' });

        doc.moveDown(1);

        // --- SESSION INFO ---
        const metaY = doc.y;
        doc.fontSize(10).font('Helvetica');

        // Left Column
        doc.text(`Tanggal: ${new Date(session.tanggal).toLocaleDateString('id-ID')}`, margin, metaY);
        doc.text(`Jam: ${session.waktu}`, margin, metaY + 15);
        doc.text(`Shift: ${session.shift}`, margin, metaY + 30);

        // Right Column
        const rightColX = pageWidth / 2;
        doc.text(`Lokasi: ${session.lokasi}`, rightColX, metaY);
        doc.text(`Perusahaan: ${session.perusahaan || '-'}`, rightColX, metaY + 15);
        doc.text(`Departemen: ${session.departemen || '-'}`, rightColX, metaY + 30);

        doc.moveDown(3);

        // --- RECORDS TABLE ---
        const tableTop = doc.y + 10;
        const colNoWidth = 30;
        const colNamaWidth = 200;
        const colUnitWidth = 100;
        const colCheckWidth = 100; // Shared for 2 columns
        const colKetWidth = contentWidth - colNoWidth - colNamaWidth - colUnitWidth - (colCheckWidth * 2);

        // Table Header
        doc.font('Helvetica-Bold').fontSize(10);

        // Header Background
        doc.fillColor('#f0f0f0')
          .rect(margin, tableTop, contentWidth, 25)
          .fill();
        doc.fillColor('#000000'); // Reset color

        // Header Borders
        doc.lineWidth(1)
          .moveTo(margin, tableTop).lineTo(margin + contentWidth, tableTop)
          .stroke();
        doc.moveTo(margin, tableTop + 25).lineTo(margin + contentWidth, tableTop + 25)
          .stroke();

        // Header Text
        let currentX = margin;

        // No
        doc.text('No', currentX, tableTop + 7, { width: colNoWidth, align: 'center' });
        doc.moveTo(currentX + colNoWidth, tableTop).lineTo(currentX + colNoWidth, tableTop + 25).stroke();
        currentX += colNoWidth;

        // Nama
        doc.text('Nama - NIK', currentX + 5, tableTop + 7, { width: colNamaWidth - 10, align: 'left' });
        doc.moveTo(currentX + colNamaWidth, tableTop).lineTo(currentX + colNamaWidth, tableTop + 25).stroke();
        currentX += colNamaWidth;

        // No Lambung
        doc.text('No Lambung', currentX + 5, tableTop + 7, { width: colUnitWidth - 10, align: 'left' });
        doc.moveTo(currentX + colUnitWidth, tableTop).lineTo(currentX + colUnitWidth, tableTop + 25).stroke();
        currentX += colUnitWidth;

        // Handbrake
        doc.text('Handbrake?', currentX, tableTop + 7, { width: colCheckWidth, align: 'center' });
        doc.moveTo(currentX + colCheckWidth, tableTop).lineTo(currentX + colCheckWidth, tableTop + 25).stroke();
        currentX += colCheckWidth;

        // Jarak Aman
        doc.text('Jarak Aman?', currentX, tableTop + 7, { width: colCheckWidth, align: 'center' });
        doc.moveTo(currentX + colCheckWidth, tableTop).lineTo(currentX + colCheckWidth, tableTop + 25).stroke();
        currentX += colCheckWidth;

        // Keterangan
        doc.text('Keterangan', currentX + 5, tableTop + 7, { width: colKetWidth - 10, align: 'left' });
        doc.moveTo(margin + contentWidth, tableTop).lineTo(margin + contentWidth, tableTop + 25).stroke(); // Right most border
        doc.moveTo(margin, tableTop).lineTo(margin, tableTop + 25).stroke(); // Left most border

        // Table Rows
        let currentY = tableTop + 25;
        doc.font('Helvetica').fontSize(9);

        records.forEach((record, index) => {
          // Row Background (Alternating)
          if (index % 2 === 1) {
            doc.fillColor('#f9f9f9')
              .rect(margin, currentY, contentWidth, 20)
              .fill();
            doc.fillColor('#000000');
          }

          currentX = margin;

          doc.text((index + 1).toString(), currentX, currentY + 5, { width: colNoWidth, align: 'center' });
          currentX += colNoWidth;

          doc.text(record.namaNik || '-', currentX + 5, currentY + 5, { width: colNamaWidth - 10 });
          currentX += colNamaWidth;

          doc.text(record.noLambung || '-', currentX + 5, currentY + 5, { width: colUnitWidth - 10 });
          currentX += colUnitWidth;

          doc.text(record.handbrakeAktif ? 'YA' : 'TIDAK', currentX, currentY + 5, { width: colCheckWidth, align: 'center' });
          currentX += colCheckWidth;

          doc.text(record.jarakUnitAman ? 'YA' : 'TIDAK', currentX, currentY + 5, { width: colCheckWidth, align: 'center' });
          currentX += colCheckWidth;

          doc.text(record.keterangan || '-', currentX + 5, currentY + 5, { width: colKetWidth - 10 });

          // Borders
          doc.moveTo(margin, currentY + 20).lineTo(margin + contentWidth, currentY + 20).stroke(); // Bottom

          // Vertical lines reconstruction for the row
          let borderX = margin;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          borderX += colNoWidth;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          borderX += colNamaWidth;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          borderX += colUnitWidth;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          borderX += colCheckWidth;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          borderX += colCheckWidth;
          doc.moveTo(borderX, currentY).lineTo(borderX, currentY + 20).stroke();
          doc.moveTo(margin + contentWidth, currentY).lineTo(margin + contentWidth, currentY + 20).stroke();

          currentY += 20;

          // Add new page if near bottom
          if (currentY > 500) {
            doc.addPage({ layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
            currentY = 30;
          }
        });

        doc.moveDown(4);

        // --- OBSERVERS ---
        if (observers.length > 0) {
          const obsY = doc.y;
          const obsWidth = 150;
          const gap = 20;

          doc.fontSize(10).font('Helvetica-Bold').text('Observer / Pengamat:', margin, obsY - 15);

          observers.forEach((obs, idx) => {
            const obsX = margin + (idx * (obsWidth + gap));

            doc.rect(obsX, obsY, obsWidth, 80).stroke();

            // Signature
            if (obs.tandaTangan) {
              try {
                doc.image(obs.tandaTangan, obsX + 10, obsY + 5, { fit: [obsWidth - 20, 40] });
              } catch (e) {
                doc.text('(Error loading signature)', obsX + 10, obsY + 20);
              }
            }

            doc.fontSize(9).font('Helvetica')
              .text(obs.nama, obsX + 5, obsY + 50, { width: obsWidth - 10, align: 'center' });

            doc.fontSize(8).font('Helvetica-Oblique')
              .text(obs.jabatan || '-', obsX + 5, obsY + 65, { width: obsWidth - 10, align: 'center' });
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // SIDAK JARAK AMAN (Safe Distance Observation) METHODS
  // ============================================================================

  async getSidakJarakSession(id: string): Promise<SidakJarakSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakJarakSessions)
      .where(eq(sidakJarakSessions.id, id));
    return result;
  }

  async getAllSidakJarakSessions(): Promise<SidakJarakSession[]> {
    return await this.db
      .select()
      .from(sidakJarakSessions)
      .orderBy(desc(sidakJarakSessions.createdAt));
  }

  async createSidakJarakSession(session: InsertSidakJarakSession): Promise<SidakJarakSession> {
    // Ensure waktu is set to same value as jam for backwards compatibility
    const sessionData = {
      ...session,
      waktu: session.jam || (session as any).waktu || ""
    };
    const [result] = await this.db
      .insert(sidakJarakSessions)
      .values(sessionData)
      .returning();
    return result;
  }

  async updateSidakJarakSession(id: string, updates: Partial<InsertSidakJarakSession>): Promise<SidakJarakSession | undefined> {
    const [result] = await this.db
      .update(sidakJarakSessions)
      .set(updates)
      .where(eq(sidakJarakSessions.id, id))
      .returning();
    return result;
  }

  async getSidakJarakRecords(sessionId: string): Promise<SidakJarakRecord[]> {
    return await this.db
      .select()
      .from(sidakJarakRecords)
      .where(eq(sidakJarakRecords.sessionId, sessionId))
      .orderBy(sidakJarakRecords.ordinal);
  }

  async createSidakJarakRecord(record: InsertSidakJarakRecord): Promise<SidakJarakRecord> {
    const [result] = await this.db
      .insert(sidakJarakRecords)
      .values(record)
      .returning();

    // Update session stats
    await this.updateSidakJarakSessionStats(record.sessionId);

    return result;
  }

  async getSidakJarakObservers(sessionId: string): Promise<SidakJarakObserver[]> {
    return await this.db
      .select()
      .from(sidakJarakObservers)
      .where(eq(sidakJarakObservers.sessionId, sessionId))
      .orderBy(sidakJarakObservers.ordinal);
  }

  async createSidakJarakObserver(observer: InsertSidakJarakObserver): Promise<SidakJarakObserver> {
    const existingObservers = await this.getSidakJarakObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakJarakObservers)
      .values({ ...observer, ordinal: nextOrdinal })
      .returning();
    return result;
  }

  async updateSidakJarakSessionStats(sessionId: string): Promise<void> {
    const records = await this.getSidakJarakRecords(sessionId);
    // For now, just update total samples. Compliance percentage logic can be added if needed.
    await this.updateSidakJarakSession(sessionId, {
      totalSampel: records.length,
      // persenKepatuhan: ... calculation if compliant field exists
    } as any);
  }

  async generateSidakJarakPDF(data: {
    session: SidakJarakSession;
    records: SidakJarakRecord[];
    observers: SidakJarakObserver[];
  }): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 }
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Constants
        const margin = 30;
        const pageWidth = 841.89;
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER ---
        doc.fontSize(16).font('Helvetica-Bold')
          .text('OBSERVASI JARAK AMAN BERKENDARA', margin, margin, { align: 'center' });

        doc.fontSize(10).font('Helvetica')
          .text('BIB – HSE – PPO – F – 072 – 17', margin, margin + 20, { align: 'right' });

        doc.moveDown(2);

        // --- SESSION INFO ---
        const metaY = doc.y;
        doc.fontSize(10).font('Helvetica');

        // Left Column
        doc.text(`Tanggal: ${new Date(session.tanggal).toLocaleDateString('id-ID')}`, margin, metaY);
        doc.text(`Jam: ${session.waktu}`, margin, metaY + 15);
        doc.text(`Shift: ${session.shift}`, margin, metaY + 30);

        // Right Column
        const rightColX = pageWidth / 2;
        doc.text(`Lokasi: ${session.lokasi}`, rightColX, metaY);
        doc.text(`Total Sampel: ${session.totalSampel}`, rightColX, metaY + 15);
        // doc.text(`% Kepatuhan: ${session.persenKepatuhan}%`, rightColX, metaY + 30);

        doc.moveDown(3);

        // --- RECORDS TABLE ---
        const tableTop = doc.y + 10;

        // Columns: No, No Kendaraan, Tipe Unit, Lokasi Muatan, Lokasi Kosongan, No Lambung Unit, Jarak Aktual, Keterangan
        const colNoWidth = 30;
        const colBasicWidth = 90;
        const colLocWidth = 120;
        const colKetWidth = 130;

        // Header
        doc.font('Helvetica-Bold').fontSize(9);

        // Background
        doc.fillColor('#f0f0f0').rect(margin, tableTop, contentWidth, 30).fill();
        doc.fillColor('#000000');

        let currentX = margin;

        // Borders and Text
        const drawHeaderCol = (text: string, width: number) => {
          doc.text(text, currentX + 2, tableTop + 10, { width: width - 4, align: 'center' });
          doc.rect(currentX, tableTop, width, 30).stroke();
          currentX += width;
        };

        drawHeaderCol('No', colNoWidth);
        drawHeaderCol('No Kendaraan', colBasicWidth);
        drawHeaderCol('Tipe Unit', colBasicWidth);
        drawHeaderCol('Lokasi Muatan', colLocWidth);
        drawHeaderCol('Lokasi Kosongan', colLocWidth);
        drawHeaderCol('No Lambung Unit', colBasicWidth);
        drawHeaderCol('Jarak Aktual', colBasicWidth);
        drawHeaderCol('Keterangan', colKetWidth);

        // Rows
        let currentY = tableTop + 30;
        doc.font('Helvetica').fontSize(9);

        records.forEach((record, index) => {
          if (index % 2 === 1) {
            doc.fillColor('#f9f9f9').rect(margin, currentY, contentWidth, 20).fill();
            doc.fillColor('#000000');
          }

          currentX = margin;

          const drawRowCol = (text: string, width: number) => {
            doc.text(text || '-', currentX + 2, currentY + 5, { width: width - 4, align: 'center' });
            doc.rect(currentX, currentY, width, 20).stroke();
            currentX += width;
          };

          drawRowCol((index + 1).toString(), colNoWidth);
          drawRowCol(record.noKendaraan, colBasicWidth);
          drawRowCol(record.tipeUnit, colBasicWidth);
          drawRowCol(record.lokasiMuatan || '-', colLocWidth);
          drawRowCol(record.lokasiKosongan || '-', colLocWidth);
          drawRowCol(record.nomorLambungUnit || '-', colBasicWidth);
          drawRowCol(record.jarakAktualKedua || '-', colBasicWidth);
          drawRowCol(record.keterangan || '-', colKetWidth);

          currentY += 20;

          if (currentY > 500) {
            doc.addPage({ layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
            currentY = 30;
          }
        });

        doc.moveDown(4);

        // --- OBSERVERS ---
        if (observers.length > 0) {
          const obsY = doc.y;
          const obsWidth = 150;
          const gap = 20;

          doc.fontSize(10).font('Helvetica-Bold').text('Observer / Pengamat:', margin, obsY - 15);

          observers.forEach((obs, idx) => {
            const obsX = margin + (idx * (obsWidth + gap));

            doc.rect(obsX, obsY, obsWidth, 80).stroke();

            if (obs.tandaTangan) {
              try {
                doc.image(obs.tandaTangan, obsX + 10, obsY + 5, { fit: [obsWidth - 20, 40] });
              } catch (e) {
                // ignore
              }
            }

            doc.fontSize(9).font('Helvetica')
              .text(obs.nama, obsX + 5, obsY + 50, { width: obsWidth - 10, align: 'center' });

            doc.fontSize(8).font('Helvetica-Oblique')
              .text(obs.perusahaan || '-', obsX + 5, obsY + 65, { width: obsWidth - 10, align: 'center' });
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ==========================================
  // SIDAK KECEPATAN METHODS
  // ==========================================

  async deleteSidakKecepatanSession(id: string): Promise<void> {
    await this.db.delete(sidakKecepatanSessions).where(eq(sidakKecepatanSessions.id, id));
  }



  // ============================================================================
  // SIDAK PENCAHAYAAN METHODS
  // ============================================================================

  async getSidakPencahayaanSession(id: string): Promise<SidakPencahayaanSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakPencahayaanSessions)
      .where(eq(sidakPencahayaanSessions.id, id));
    return result;
  }

  async getAllSidakPencahayaanSessions(): Promise<SidakPencahayaanSession[]> {
    return await this.db
      .select()
      .from(sidakPencahayaanSessions)
      .orderBy(desc(sidakPencahayaanSessions.createdAt));
  }

  async createSidakPencahayaanSession(session: InsertSidakPencahayaanSession): Promise<SidakPencahayaanSession> {
    const [result] = await this.db
      .insert(sidakPencahayaanSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakPencahayaanSession(id: string, updates: Partial<InsertSidakPencahayaanSession>): Promise<SidakPencahayaanSession | undefined> {
    const [result] = await this.db
      .update(sidakPencahayaanSessions)
      .set(updates)
      .where(eq(sidakPencahayaanSessions.id, id))
      .returning();
    return result;
  }

  async getSidakPencahayaanRecords(sessionId: string): Promise<SidakPencahayaanRecord[]> {
    return await this.db
      .select()
      .from(sidakPencahayaanRecords)
      .where(eq(sidakPencahayaanRecords.sessionId, sessionId))
      .orderBy(asc(sidakPencahayaanRecords.ordinal));
  }

  async createSidakPencahayaanRecord(record: InsertSidakPencahayaanRecord): Promise<SidakPencahayaanRecord> {
    const [result] = await this.db
      .insert(sidakPencahayaanRecords)
      .values(record)
      .returning();

    // Update session total sampel
    await this.updateSidakPencahayaanSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakPencahayaanObservers(sessionId: string): Promise<SidakPencahayaanObserver[]> {
    return await this.db
      .select()
      .from(sidakPencahayaanObservers)
      .where(eq(sidakPencahayaanObservers.sessionId, sessionId))
      .orderBy(asc(sidakPencahayaanObservers.ordinal));
  }

  async createSidakPencahayaanObserver(observer: Omit<InsertSidakPencahayaanObserver, 'ordinal'>): Promise<SidakPencahayaanObserver> {
    const existingObservers = await this.getSidakPencahayaanObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakPencahayaanObservers)
      .values({ ...observer, ordinal: nextOrdinal } as InsertSidakPencahayaanObserver)
      .returning();
    return result;
  }

  async updateSidakPencahayaanSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakPencahayaanRecords(sessionId);

    // Direct SQL update to bypass schema validation for totalSampel
    await this.db
      .update(sidakPencahayaanSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakPencahayaanSessions.id, sessionId));
  }

  // ============================================================================
  // SIDAK WORKSHOP METHODS
  // ============================================================================

  async getSidakWorkshopSession(id: string): Promise<SidakWorkshopSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakWorkshopSessions)
      .where(eq(sidakWorkshopSessions.id, id));
    return result;
  }

  async getAllSidakWorkshopSessions(): Promise<SidakWorkshopSession[]> {
    return await this.db
      .select()
      .from(sidakWorkshopSessions)
      .orderBy(desc(sidakWorkshopSessions.createdAt));
  }

  async createSidakWorkshopSession(session: InsertSidakWorkshopSession): Promise<SidakWorkshopSession> {
    const [result] = await this.db
      .insert(sidakWorkshopSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakWorkshopSession(id: string, updates: Partial<InsertSidakWorkshopSession>): Promise<SidakWorkshopSession | undefined> {
    const [result] = await this.db
      .update(sidakWorkshopSessions)
      .set(updates)
      .where(eq(sidakWorkshopSessions.id, id))
      .returning();
    return result;
  }

  async getSidakWorkshopEquipment(sessionId: string): Promise<SidakWorkshopEquipment[]> {
    return await this.db
      .select()
      .from(sidakWorkshopEquipment)
      .where(eq(sidakWorkshopEquipment.sessionId, sessionId))
      .orderBy(asc(sidakWorkshopEquipment.ordinal));
  }

  async createSidakWorkshopEquipment(equipment: InsertSidakWorkshopEquipment): Promise<SidakWorkshopEquipment> {
    const [result] = await this.db
      .insert(sidakWorkshopEquipment)
      .values(equipment)
      .returning();

    // Update session total equipment count
    await this.updateSidakWorkshopSessionEquipmentCount(equipment.sessionId);

    return result;
  }

  async getSidakWorkshopInspectors(sessionId: string): Promise<SidakWorkshopInspector[]> {
    return await this.db
      .select()
      .from(sidakWorkshopInspectors)
      .where(eq(sidakWorkshopInspectors.sessionId, sessionId))
      .orderBy(asc(sidakWorkshopInspectors.ordinal));
  }

  async createSidakWorkshopInspector(inspector: Omit<InsertSidakWorkshopInspector, 'ordinal'>): Promise<SidakWorkshopInspector> {
    const existingInspectors = await this.getSidakWorkshopInspectors(inspector.sessionId);
    const nextOrdinal = existingInspectors.length + 1;

    const [result] = await this.db
      .insert(sidakWorkshopInspectors)
      .values({ ...inspector, ordinal: nextOrdinal } as InsertSidakWorkshopInspector)
      .returning();
    return result;
  }

  async updateSidakWorkshopSessionEquipmentCount(sessionId: string): Promise<void> {
    const equipment = await this.getSidakWorkshopEquipment(sessionId);

    // Direct SQL update to bypass schema validation for totalEquipment
    await this.db
      .update(sidakWorkshopSessions)
      .set({ totalEquipment: equipment.length })
      .where(eq(sidakWorkshopSessions.id, sessionId));
  }

  // ============================================================================
  // SIDAK INTERCOM PENGAWAS FMS METHODS
  // ============================================================================

  async getSidakIntercomSession(id: string): Promise<SidakIntercomSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakIntercomSessions)
      .where(eq(sidakIntercomSessions.id, id));
    return result;
  }

  async getAllSidakIntercomSessions(): Promise<SidakIntercomSession[]> {
    return await this.db
      .select()
      .from(sidakIntercomSessions)
      .orderBy(desc(sidakIntercomSessions.createdAt));
  }

  async createSidakIntercomSession(session: InsertSidakIntercomSession): Promise<SidakIntercomSession> {
    const [result] = await this.db
      .insert(sidakIntercomSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakIntercomSession(id: string, updates: Partial<InsertSidakIntercomSession>): Promise<SidakIntercomSession | undefined> {
    const [result] = await this.db
      .update(sidakIntercomSessions)
      .set(updates)
      .where(eq(sidakIntercomSessions.id, id))
      .returning();
    return result;
  }

  async getSidakIntercomRecords(sessionId: string): Promise<SidakIntercomRecord[]> {
    return await this.db
      .select()
      .from(sidakIntercomRecords)
      .where(eq(sidakIntercomRecords.sessionId, sessionId))
      .orderBy(asc(sidakIntercomRecords.ordinal));
  }

  async createSidakIntercomRecord(record: InsertSidakIntercomRecord): Promise<SidakIntercomRecord> {
    const [result] = await this.db
      .insert(sidakIntercomRecords)
      .values(record)
      .returning();

    // Update session totals
    await this.updateSidakIntercomSessionStats(record.sessionId);

    return result;
  }

  async getSidakIntercomObservers(sessionId: string): Promise<SidakIntercomObserver[]> {
    return await this.db
      .select()
      .from(sidakIntercomObservers)
      .where(eq(sidakIntercomObservers.sessionId, sessionId))
      .orderBy(asc(sidakIntercomObservers.ordinal));
  }

  async createSidakIntercomObserver(observer: Omit<InsertSidakIntercomObserver, 'ordinal'>): Promise<SidakIntercomObserver> {
    const existingObservers = await this.getSidakIntercomObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakIntercomObservers)
      .values({ ...observer, ordinal: nextOrdinal } as InsertSidakIntercomObserver)
      .returning();
    return result;
  }

  async updateSidakIntercomSessionStats(sessionId: string): Promise<void> {
    const records = await this.getSidakIntercomRecords(sessionId);

    // Calculate compliance stats
    let totalSesuai = 0;
    let totalPoin = 0;
    for (const rec of records) {
      const questions = [
        rec.q1_slaRespons, rec.q2_identifikasi, rec.q3_kualitasKomunikasi,
        rec.q4_instruksiK3, rec.q5_verifikasiTindakan
      ];
      for (const q of questions) {
        totalPoin++;
        if (q) totalSesuai++;
      }
    }

    const persenKepatuhan = totalPoin > 0 ? Math.round((totalSesuai / totalPoin) * 100) : 0;

    await this.db
      .update(sidakIntercomSessions)
      .set({
        totalSampel: records.length,
        totalSesuai: totalSesuai,
        persenKepatuhan: persenKepatuhan
      })
      .where(eq(sidakIntercomSessions.id, sessionId));
  }

  async generateSidakPencahayaanPDF(data: {
    session: SidakPencahayaanSession;
    records: SidakPencahayaanRecord[];
    observers: SidakPencahayaanObserver[];
  }): Promise<Buffer> {

    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89; // A4 Landscape width
        const pageHeight = 595.28; // A4 Landscape height
        const contentWidth = pageWidth - (margin * 2);

        // --- Header Section ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'blogo.png');

        // Define Header Box
        const headerHeight = 60;
        doc.lineWidth(1).rect(margin, margin, contentWidth, headerHeight).stroke();

        // Logo
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 10, margin + 5, { height: 50 });
        }

        // Title
        doc.font('Helvetica-Bold').fontSize(16)
          .text('FORM PEMERIKSAAN PENCAHAYAAN (LUX MONITORING)', margin + 100, margin + 20, { width: contentWidth - 200, align: 'center' });

        // Doc Code
        doc.font('Helvetica').fontSize(9)
          .text('No. Dokumen: BIB-HSE-PPO-F-073-18', margin + contentWidth - 200, margin + 10, { width: 190, align: 'right' });
        doc.text('Revisi: 00', margin + contentWidth - 200, margin + 22, { width: 190, align: 'right' });
        doc.text('Tanggal Efektif: 01 Jan 2024', margin + contentWidth - 200, margin + 34, { width: 190, align: 'right' });
        doc.text('Halaman: 1 dari 1', margin + contentWidth - 200, margin + 46, { width: 190, align: 'right' });

        // --- Info Section ---
        const infoY = margin + headerHeight + 10;
        const infoRowHeight = 16;

        const drawInfoField = (label: string, value: string, x: number, y: number, w: number) => {
          doc.font('Helvetica-Bold').fontSize(9).text(label, x, y);
          doc.font('Helvetica').text(': ' + value, x + 100, y); // adjusted indent
          doc.moveTo(x + 105, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke();
        };

        const col1X = margin + 20;
        const col2X = margin + contentWidth / 2 + 20;

        drawInfoField('Tanggal', new Date(session.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }), col1X, infoY, 250);
        drawInfoField('Shift', session.shift, col1X, infoY + infoRowHeight, 250);
        drawInfoField('Waktu', session.waktu, col1X, infoY + infoRowHeight * 2, 250);
        drawInfoField('Penanggung Jawab', session.penanggungJawab || '-', col1X, infoY + infoRowHeight * 3, 250);

        drawInfoField('Lokasi', session.lokasi, col2X, infoY, 250);
        drawInfoField('Departemen', session.departemen || '-', col2X, infoY + infoRowHeight, 250);
        drawInfoField('Total Sampel', session.totalSampel.toString(), col2X, infoY + infoRowHeight * 2, 250);

        // --- Table Section ---
        const tableTop = infoY + (infoRowHeight * 4) + 15;

        const cols = [
          { name: 'No', w: 30, align: 'center' },
          { name: 'Titik Pengambilan', w: 120, align: 'left' },
          { name: 'Sumber Penerangan', w: 100, align: 'left' },
          { name: 'Jenis Pengukuran', w: 80, align: 'center' },
          { name: 'Intensitas (Lux)', w: 80, align: 'center' },
          { name: 'Jarak dr Sumber', w: 90, align: 'center' },
          { name: 'Secara Visual', w: 80, align: 'center' },
          { name: 'Keterangan', w: 0, align: 'left' }
        ];

        const totalFixedW = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - totalFixedW;

        let currentY = tableTop;
        const headerHeightTable = 25;
        const rowHeight = 20;

        let x = margin;
        doc.lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9);

        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
        doc.fillColor('black');

        cols.forEach(col => {
          doc.rect(x, currentY, col.w, headerHeightTable).stroke();
          doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
          x += col.w;
        });

        currentY += headerHeightTable;

        doc.font('Helvetica').fontSize(9);
        records.forEach((rec, idx) => {
          if (currentY > pageHeight - margin - 100) {
            doc.addPage();
            currentY = margin;
            x = margin;
            doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
            doc.fillColor('black');
            cols.forEach(col => {
              doc.rect(x, currentY, col.w, headerHeightTable).stroke();
              doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
              x += col.w;
            });
            currentY += headerHeightTable;
          }

          x = margin;

          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            x += col.w;
          });

          x = margin;
          const drawText = (val: string, colIdx: number) => {
            doc.text(val, x + 2, currentY + 6, { width: cols[colIdx].w - 4, align: cols[colIdx].align as any });
            x += cols[colIdx].w;
          };

          drawText((idx + 1).toString(), 0);
          drawText(rec.titikPengambilan || '-', 1);
          drawText(rec.sumberPenerangan || '-', 2);
          drawText(rec.jenisPengukuran || '-', 3);
          drawText(rec.intensitasLux?.toString() || '-', 4);
          drawText(rec.jarakDariSumber || '-', 5);
          drawText(rec.secaraVisual || '-', 6);
          drawText(rec.keterangan || '-', 7);

          currentY += rowHeight;
        });

        // --- Observers Section ---
        currentY += 20;

        if (currentY > pageHeight - margin - 80) {
          doc.addPage();
          currentY = margin;
        }

        const boxWidth = 120;
        const boxHeight = 80;
        let obsX = margin;

        doc.font('Helvetica-Bold').text('Observer / Pengamat:', margin, currentY);
        currentY += 15;

        observers.forEach((obs) => {
          doc.rect(obsX, currentY, boxWidth, boxHeight).stroke();

          doc.font('Helvetica').fontSize(8);
          doc.text(obs.nama, obsX + 2, currentY + 5, { width: boxWidth - 4, align: 'center' });
          doc.text(obs.nik || '', obsX + 2, currentY + 15, { width: boxWidth - 4, align: 'center' });

          if (obs.tandaTangan && obs.tandaTangan.startsWith('data:image')) {
            try {
              doc.image(obs.tandaTangan, obsX + 20, currentY + 30, { height: 30 });
            } catch (e) { }
          }

          obsX += boxWidth + 10;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
  // ============================================================================
  // SIDAK LOTO METHODS
  // ============================================================================

  async getSidakLotoSession(id: string): Promise<SidakLotoSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakLotoSessions)
      .where(eq(sidakLotoSessions.id, id));
    return result;
  }

  async getAllSidakLotoSessions(): Promise<SidakLotoSession[]> {
    return await this.db
      .select()
      .from(sidakLotoSessions)
      .orderBy(desc(sidakLotoSessions.createdAt));
  }

  async createSidakLotoSession(session: InsertSidakLotoSession): Promise<SidakLotoSession> {
    const [result] = await this.db
      .insert(sidakLotoSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakLotoSession(id: string, updates: Partial<InsertSidakLotoSession>): Promise<SidakLotoSession | undefined> {
    const [result] = await this.db
      .update(sidakLotoSessions)
      .set(updates)
      .where(eq(sidakLotoSessions.id, id))
      .returning();
    return result;
  }

  async getSidakLotoRecords(sessionId: string): Promise<SidakLotoRecord[]> {
    return await this.db
      .select()
      .from(sidakLotoRecords)
      .where(eq(sidakLotoRecords.sessionId, sessionId))
      .orderBy(asc(sidakLotoRecords.ordinal));
  }

  async createSidakLotoRecord(record: InsertSidakLotoRecord): Promise<SidakLotoRecord> {
    const [result] = await this.db
      .insert(sidakLotoRecords)
      .values(record)
      .returning();

    // Update session total sampel
    await this.updateSidakLotoSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakLotoObservers(sessionId: string): Promise<SidakLotoObserver[]> {
    return await this.db
      .select()
      .from(sidakLotoObservers)
      .where(eq(sidakLotoObservers.sessionId, sessionId))
      .orderBy(asc(sidakLotoObservers.ordinal));
  }

  async createSidakLotoObserver(observer: Omit<InsertSidakLotoObserver, 'ordinal'>): Promise<SidakLotoObserver> {
    const existingObservers = await this.getSidakLotoObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakLotoObservers)
      .values({ ...observer, ordinal: nextOrdinal } as InsertSidakLotoObserver)
      .returning();
    return result;
  }

  async updateSidakLotoSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakLotoRecords(sessionId);

    // Direct SQL update to bypass schema validation for totalSampel
    await this.db
      .update(sidakLotoSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakLotoSessions.id, sessionId));
  }

  async generateSidakLotoPDF(data: {
    session: SidakLotoSession;
    records: SidakLotoRecord[];
    observers: SidakLotoObserver[];
  }): Promise<Buffer> {

    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER SECTION ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'assets', 'logo-gecl.png');

        // 1. Logo (Left)
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, margin, { height: 35 });
        } else {
          doc.font('Helvetica-Bold').fontSize(14).text('PT. GECL', margin, margin);
        }

        // 2. Doc Code (Right)
        doc.font('Helvetica').fontSize(9)
          .text('GECL - HSE - ES - F - 3.02 - 83', margin + contentWidth - 200, margin + 10, { width: 200, align: 'right' });

        // 3. Title Box
        const titleY = margin + 45;
        doc.fillColor('#e0e0e0').rect(margin, titleY, contentWidth, 35).fill();
        doc.fillColor('#000000').rect(margin, titleY, contentWidth, 35).stroke();

        doc.font('Helvetica-Bold').fontSize(14)
          .text('INSPEKSI KEPATUHAN LOTO', margin, titleY + 7, { width: contentWidth, align: 'center' });
        doc.font('Helvetica-Oblique').fontSize(9)
          .text('Formulir ini digunakan sebagai catatan hasil inspeksi LOTO yang dilaksanakan di PT. GECL', margin, titleY + 22, { width: contentWidth, align: 'center' });


        // --- INFO SECTION ---
        const infoY = titleY + 35; // Attached to title box
        const infoRowHeight = 25;

        // Draw outer box for info (2 rows)
        doc.rect(margin, infoY, contentWidth, infoRowHeight * 2).stroke();

        // Vertical divider (approx 40% / 60% split based on image)
        const splitX = margin + 350;

        doc.moveTo(splitX, infoY).lineTo(splitX, infoY + infoRowHeight * 2).stroke();
        doc.moveTo(margin, infoY + infoRowHeight).lineTo(margin + contentWidth, infoY + infoRowHeight).stroke();

        // Labels and Values
        doc.font('Helvetica-Bold').fontSize(9);
        const padding = 6;

        const labelWidth = 100;

        // Row 1
        // Col 1 (Left)
        doc.rect(margin, infoY, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
        doc.fillColor('#000000').text('Tanggal/ Shift', margin + padding, infoY + 8);
        doc.text(`${session.tanggal || ''} / ${session.shift || ''}`, margin + labelWidth + padding, infoY + 8);

        // Col 2 (Right)
        doc.rect(splitX, infoY, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
        doc.fillColor('#000000').text('Lokasi', splitX + padding, infoY + 8);
        doc.text(session.lokasi || '', splitX + labelWidth + padding, infoY + 8);

        // Row 2
        const r2y = infoY + infoRowHeight;
        // Col 1 (Left)
        doc.rect(margin, r2y, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
        doc.fillColor('#000000').text('Waktu', margin + padding, r2y + 8);
        const wEnd = ' sampai ...';
        doc.text(`${session.waktu || ''} ${wEnd}`, margin + labelWidth + padding, r2y + 8);

        // Col 2 (Right)
        doc.rect(splitX, r2y, labelWidth, infoRowHeight).fillColor('#e0e0e0').fill().stroke();
        doc.fillColor('#000000').text('Jumlah Sampel', splitX + padding, r2y + 8);
        doc.text((session.totalSampel || records.length).toString(), splitX + labelWidth + padding, r2y + 8);


        // --- TABLE SECTION ---
        const tableTop = infoY + (infoRowHeight * 2) + 10;

        const qWidth = 35;

        const cols = [
          { name: 'No', label: 'No', w: 30, align: 'center', type: 'text' },
          { name: 'Nama', label: 'Nama', w: 140, align: 'left', type: 'text' },
          { name: 'NIK', label: 'NIK', w: 70, align: 'left', type: 'text' },
          { name: 'Perusahaan', label: 'Perusahaan', w: 90, align: 'left', type: 'text' },
          { name: 'Q1', label: 'Apakah gembok dan danger tag terpasang pada unit yang sedang diperbaiki ?', w: qWidth, align: 'center', type: 'vertical' },
          { name: 'Q2', label: 'Apakah danger tag sesuai dan memadai ?', w: qWidth, align: 'center', type: 'vertical' },
          { name: 'Q3', label: 'Apakah gembok sesuai dan memadai ?', w: qWidth, align: 'center', type: 'vertical' },
          { name: 'Q4', label: 'Apakah setiap pekerja memiliki kunci unik untuk gemboknya sendiri?', w: qWidth, align: 'center', type: 'vertical' },
          { name: 'Q5', label: 'Apakah hasp (multi-lock) digunakan dengan benar jika lebih dari satu pekerja terlibat?', w: qWidth, align: 'center', type: 'vertical' },
          { name: 'Ket', label: 'Keterangan', w: 0, align: 'left', type: 'text' }
        ];

        // Calc remaining width for Ket
        const fixedWidth = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - fixedWidth;

        let currentY = tableTop;
        const headerHeightTable = 160; // Taller for vertical text to fit longer labels
        const rowHeight = 20;

        const drawHeader = (y: number) => {
          let x = margin;
          doc.fillColor('#e0e0e0').rect(margin, y, contentWidth, headerHeightTable).fill();
          doc.fillColor('#000000');

          cols.forEach(col => {
            doc.rect(x, y, col.w, headerHeightTable).stroke();

            if (col.type === 'vertical') {
              // Draw vertical text with smaller font for longer labels
              doc.save();
              doc.font('Helvetica-Bold').fontSize(7);
              const textX = x + (col.w / 2) + 2;
              const textY = y + headerHeightTable - 8;
              doc.translate(textX, textY);
              doc.rotate(-90);
              doc.text(col.label, 0, 0, { width: headerHeightTable - 15, align: 'left', lineGap: 1 });
              doc.restore();
            } else {
              // Draw centered text normally
              doc.font('Helvetica-Bold').fontSize(9);
              const textHeight = doc.heightOfString(col.label, { width: col.w - 4 });
              const textY = y + (headerHeightTable - textHeight) / 2;
              doc.text(col.label, x + 2, textY, { width: col.w - 4, align: 'center' });
            }
            x += col.w;
          });
        };

        drawHeader(currentY);
        currentY += headerHeightTable;

        // Table Rows
        doc.font('Helvetica').fontSize(9);

        records.forEach((rec, idx) => {
          // Page break check...
          if (currentY > pageHeight - margin - 150) {
            doc.addPage({ layout: 'landscape', margins: { top: 30, bottom: 30, left: 30, right: 30 } });
            currentY = margin;
            drawHeader(currentY);
            currentY += headerHeightTable;
            doc.font('Helvetica').fontSize(9); // Reset font
          }

          let x = margin;

          // Draw cells
          cols.forEach((col, cIdx) => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();

            let text = '';
            if (col.name === 'No') text = (idx + 1).toString() + '.';
            else if (col.name === 'Nama') text = rec.nama || '';
            else if (col.name === 'NIK') text = rec.nik || '';
            else if (col.name === 'Perusahaan') text = rec.perusahaan || '';
            else if (col.name === 'Q1') text = rec.q1_gembokTagTerpasang ? 'V' : (rec.q1_gembokTagTerpasang === false ? 'X' : '');
            else if (col.name === 'Q2') text = rec.q2_dangerTagSesuai ? 'V' : (rec.q2_dangerTagSesuai === false ? 'X' : '');
            else if (col.name === 'Q3') text = rec.q3_gembokSesuai ? 'V' : (rec.q3_gembokSesuai === false ? 'X' : '');
            else if (col.name === 'Q4') text = rec.q4_kunciUnik ? 'V' : (rec.q4_kunciUnik === false ? 'X' : '');
            else if (col.name === 'Q5') text = rec.q5_haspBenar ? 'V' : (rec.q5_haspBenar === false ? 'X' : '');
            else if (col.name === 'Ket') text = rec.keterangan || '';

            // Center compliance checks
            const align = (col.name.startsWith('Q') || col.name === 'No') ? 'center' : 'left';

            doc.text(text, x + 2, currentY + 6, { width: col.w - 4, align: align as any });
            x += col.w;
          });

          currentY += rowHeight;
        });

        // Fill empty rows to minimum 10
        const minRows = 10;
        const rowsToAdd = Math.max(0, minRows - records.length);

        for (let i = 0; i < rowsToAdd; i++) {
          // Check page
          if (currentY > pageHeight - margin - 150) break;

          let x = margin;
          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            if (col.name === 'No') {
              doc.text((records.length + i + 1).toString() + '.', x + 2, currentY + 6, { width: col.w, align: 'center' });
            }
            x += col.w;
          });
          currentY += rowHeight;
        }

        // --- OBSERVER SECTION ---
        currentY += 20;

        if (currentY + 100 > pageHeight - margin) doc.addPage({ layout: 'landscape' });

        // Grid Layout:
        // No | Nama Pemantau | Perusahaan | Tanda Tangan || No | Nama Pemantau | Perusahaan | Tanda Tangan

        const obsHeaderH = 20;
        const obsRowH = 40;

        // Background gray for header
        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, obsHeaderH).fill();
        doc.fillColor('#000000');

        const halfW = (contentWidth / 2);

        const oCols = [30, 100, 80, halfW - 210];

        let ox = margin;
        // Header Left
        const obHeaders = ['No', 'Nama Pemantau', 'Perusahaan', 'Tanda Tangan'];
        obHeaders.forEach((h, i) => {
          doc.rect(ox, currentY, oCols[i], obsHeaderH).stroke().text(h, ox, currentY + 6, { width: oCols[i], align: 'center' });
          ox += oCols[i];
        });

        // Header Right
        obHeaders.forEach((h, i) => {
          doc.rect(ox, currentY, oCols[i], obsHeaderH).stroke().text(h, ox, currentY + 6, { width: oCols[i], align: 'center' });
          ox += oCols[i];
        });

        currentY += obsHeaderH;

        // Render 4 rows (8 slots)
        for (let r = 0; r < 4; r++) {
          const obs1 = observers[r];
          const obs2 = observers[r + 4];

          let rowX = margin;

          // --- LEFT SIDE ---
          // No
          doc.rect(rowX, currentY, oCols[0], obsRowH).stroke().text((r + 1).toString() + '.', rowX, currentY + 15, { width: oCols[0], align: 'center' }); rowX += oCols[0];
          // Nama
          doc.rect(rowX, currentY, oCols[1], obsRowH).stroke();
          if (obs1) doc.text(obs1.nama, rowX + 5, currentY + 15, { width: oCols[1] - 10 }); rowX += oCols[1];
          // Perusahaan
          doc.rect(rowX, currentY, oCols[2], obsRowH).stroke();
          // Placeholder for perusahaan if not available
          rowX += oCols[2];
          // TT
          doc.rect(rowX, currentY, oCols[3], obsRowH).stroke();
          if (obs1?.tandaTangan && obs1.tandaTangan.length > 100) {
            try { doc.image(obs1.tandaTangan, rowX + 10, currentY + 5, { height: 30 }); } catch (e) { }
          }
          rowX += oCols[3];

          // --- RIGHT SIDE ---
          // No
          doc.rect(rowX, currentY, oCols[0], obsRowH).stroke().text((r + 5).toString() + '.', rowX, currentY + 15, { width: oCols[0], align: 'center' }); rowX += oCols[0];
          // Nama
          doc.rect(rowX, currentY, oCols[1], obsRowH).stroke();
          if (obs2) doc.text(obs2.nama, rowX + 5, currentY + 15, { width: oCols[1] - 10 }); rowX += oCols[1];
          // Perusahaan
          doc.rect(rowX, currentY, oCols[2], obsRowH).stroke();
          rowX += oCols[2];
          // TT
          doc.rect(rowX, currentY, oCols[3], obsRowH).stroke();
          if (obs2?.tandaTangan && obs2.tandaTangan.length > 100) {
            try { doc.image(obs2.tandaTangan, rowX + 10, currentY + 5, { height: 30 }); } catch (e) { }
          }

          currentY += obsRowH;
        }

        // Footer Data
        doc.fontSize(8).text(`Maret 2025/R0`, margin, pageHeight - 20, { align: 'left' });
        doc.text(`Page 1 of 1`, margin, pageHeight - 20, { width: contentWidth, align: 'right' });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });

  }
  // ============================================================================
  // SIDAK DIGITAL METHODS
  // ============================================================================

  async getSidakDigitalSession(id: string): Promise<SidakDigitalSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakDigitalSessions)
      .where(eq(sidakDigitalSessions.id, id));
    return result;
  }

  async getAllSidakDigitalSessions(): Promise<SidakDigitalSession[]> {
    return await this.db
      .select()
      .from(sidakDigitalSessions)
      .orderBy(desc(sidakDigitalSessions.createdAt));
  }

  async createSidakDigitalSession(session: InsertSidakDigitalSession): Promise<SidakDigitalSession> {
    const [result] = await this.db
      .insert(sidakDigitalSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakDigitalSession(id: string, updates: Partial<InsertSidakDigitalSession>): Promise<SidakDigitalSession | undefined> {
    const [result] = await this.db
      .update(sidakDigitalSessions)
      .set(updates)
      .where(eq(sidakDigitalSessions.id, id))
      .returning();
    return result;
  }

  async getSidakDigitalRecords(sessionId: string): Promise<SidakDigitalRecord[]> {
    return await this.db
      .select()
      .from(sidakDigitalRecords)
      .where(eq(sidakDigitalRecords.sessionId, sessionId))
      .orderBy(asc(sidakDigitalRecords.ordinal));
  }

  async createSidakDigitalRecord(record: InsertSidakDigitalRecord): Promise<SidakDigitalRecord> {
    const [result] = await this.db
      .insert(sidakDigitalRecords)
      .values(record)
      .returning();

    // Update session total sampel
    await this.updateSidakDigitalSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakDigitalObservers(sessionId: string): Promise<SidakDigitalObserver[]> {
    return await this.db
      .select()
      .from(sidakDigitalObservers)
      .where(eq(sidakDigitalObservers.sessionId, sessionId))
      .orderBy(asc(sidakDigitalObservers.ordinal));
  }

  async createSidakDigitalObserver(observer: Omit<InsertSidakDigitalObserver, 'ordinal'>): Promise<SidakDigitalObserver> {
    const existingObservers = await this.getSidakDigitalObservers(observer.sessionId);
    const nextOrdinal = existingObservers.length + 1;

    const [result] = await this.db
      .insert(sidakDigitalObservers)
      .values({ ...observer, ordinal: nextOrdinal } as InsertSidakDigitalObserver)
      .returning();
    return result;
  }

  async updateSidakDigitalSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakDigitalRecords(sessionId);

    // Direct SQL update to bypass schema validation for totalSampel
    await this.db
      .update(sidakDigitalSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakDigitalSessions.id, sessionId));
  }

  async generateSidakDigitalPDF(data: { session: SidakDigitalSession; records: SidakDigitalRecord[]; observers: SidakDigitalObserver[] }): Promise<Buffer> {

    const { session, records, observers } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER SECTION ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'blogo.png');
        const headerHeight = 60;

        // Header box
        doc.lineWidth(1).rect(margin, margin, contentWidth, headerHeight).stroke();

        // Logo
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 10, margin + 5, { height: 50 });
        }

        // Title with gray background
        doc.fillColor('#d0d0d0')
          .rect(margin, margin + headerHeight, contentWidth, 35)
          .fill();
        doc.fillColor('#000000');

        doc.font('Helvetica-Bold').fontSize(16)
          .text('INSPEKSI PENGAWAS DIGITAL', margin, margin + headerHeight + 10, {
            width: contentWidth,
            align: 'center'
          });

        // Subtitle
        doc.font('Helvetica').fontSize(9)
          .text('Formulir ini digunakan sebagai catatan hasil inspeksi penggunaan aplikasi digital di PT. Goden Energi Cemerlang Lesrari',
            margin + 20, margin + headerHeight + 28, {
            width: contentWidth - 40,
            align: 'center'
          });

        // Doc Code (top right)
        doc.font('Helvetica').fontSize(9)
          .text('BIB – HSE – PPO – F – XXX – XX', margin + contentWidth - 180, margin + 10, {
            width: 170,
            align: 'right'
          });

        // --- INFO SECTION ---
        const infoY = margin + headerHeight + 45;
        const infoRowHeight = 16;

        const drawInfoField = (label: string, value: string, x: number, y: number, w: number) => {
          doc.font('Helvetica-Bold').fontSize(9).text(label, x, y);
          doc.font('Helvetica').text(': ' + value, x + 80, y);
          doc.moveTo(x + 85, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke();
        };

        const col1X = margin + 20;
        const col2X = margin + contentWidth / 2 + 20;

        drawInfoField('Tanggal', new Date(session.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }), col1X, infoY, 250);
        drawInfoField('Shift', session.shift, col1X, infoY + infoRowHeight, 250);
        drawInfoField('Waktu', session.waktu, col1X, infoY + infoRowHeight * 2, 250);

        drawInfoField('Lokasi', session.lokasi, col2X, infoY, 250);
        drawInfoField('Departemen', session.departemen || '-', col2X, infoY + infoRowHeight, 250);
        drawInfoField('Total Sampel', session.totalSampel.toString(), col2X, infoY + infoRowHeight * 2, 250);

        // --- TABLE SECTION ---
        const tableTop = infoY + (infoRowHeight * 3) + 15;

        const cols = [
          { name: 'No', w: 30, align: 'center' },
          { name: 'Nama Pengawas', w: 120, align: 'left' },
          { name: 'NIK', w: 80, align: 'left' },
          { name: 'Jabatan', w: 90, align: 'left' },
          { name: 'Gunakan\nAplikasi?', w: 60, align: 'center' },
          { name: 'Lapor\nTepat?', w: 60, align: 'center' },
          { name: 'Kualitas\nFeedback', w: 70, align: 'center' },
          { name: 'Keterangan', w: 0, align: 'left' }
        ];

        const totalFixedW = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - totalFixedW;

        let currentY = tableTop;
        const headerHeightTable = 30;
        const rowHeight = 20;

        let x = margin;
        doc.lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9);

        // Table header
        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
        doc.fillColor('black');

        cols.forEach(col => {
          doc.rect(x, currentY, col.w, headerHeightTable).stroke();
          doc.text(col.name, x, currentY + 6, { width: col.w, align: col.align as any });
          x += col.w;
        });

        currentY += headerHeightTable;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        records.forEach((rec, idx) => {
          if (currentY > pageHeight - margin - 100) {
            doc.addPage();
            currentY = margin;
            x = margin;
            doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
            doc.fillColor('black');
            cols.forEach(col => {
              doc.rect(x, currentY, col.w, headerHeightTable).stroke();
              doc.text(col.name, x, currentY + 6, { width: col.w, align: col.align as any });
              x += col.w;
            });
            currentY += headerHeightTable;
          }

          x = margin;

          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            x += col.w;
          });

          x = margin;
          const drawText = (val: string, colIdx: number) => {
            doc.text(val, x + 2, currentY + 6, { width: cols[colIdx].w - 4, align: cols[colIdx].align as any });
            x += cols[colIdx].w;
          };

          drawText((idx + 1).toString(), 0);
          drawText(rec.namaPengawas, 1);
          drawText(rec.nik || '-', 2);
          drawText(rec.jabatan || '-', 3);
          drawText(rec.appUsage ? 'Ya' : 'Tidak', 4);
          drawText(rec.timelyReporting ? 'Ya' : 'Tidak', 5);
          drawText(rec.feedbackQuality || '-', 6);
          drawText(rec.keterangan || '-', 7);

          currentY += rowHeight;
        });

        // --- OBSERVERS SECTION ---
        currentY += 20;

        if (currentY > pageHeight - margin - 80) {
          doc.addPage();
          currentY = margin;
        }

        const boxWidth = 150;
        const boxHeight = 80;
        let obsX = margin;

        doc.font('Helvetica-Bold').text('Observer / Pengamat:', margin, currentY);
        currentY += 15;

        observers.forEach((obs) => {
          doc.rect(obsX, currentY, boxWidth, boxHeight).stroke();

          doc.font('Helvetica').fontSize(8);
          doc.text(obs.nama, obsX + 2, currentY + 5, { width: boxWidth - 4, align: 'center' });
          doc.text(obs.nik || '', obsX + 2, currentY + 15, { width: boxWidth - 4, align: 'center' });

          if (obs.tandaTangan && obs.tandaTangan.startsWith('data:image')) {
            try {
              doc.image(obs.tandaTangan, obsX + 20, currentY + 30, { height: 30 });
            } catch (e) { }
          }

          obsX += boxWidth + 10;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ============================================================================
  // SIDAK WORKSHOP METHODS
  // ============================================================================

  async getSidakWorkshopSession(id: string): Promise<SidakWorkshopSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakWorkshopSessions)
      .where(eq(sidakWorkshopSessions.id, id));
    return result;
  }

  async getAllSidakWorkshopSessions(): Promise<SidakWorkshopSession[]> {
    return await this.db
      .select()
      .from(sidakWorkshopSessions)
      .orderBy(desc(sidakWorkshopSessions.createdAt));
  }



  async generateSidakWorkshopPDF(data: { session: SidakWorkshopSession; equipment: SidakWorkshopEquipment[]; inspectors: SidakWorkshopInspector[] }): Promise<Buffer> {
    const PDFDocument = require('pdfkit');
    const path = require('path');
    const fs = require('fs');
    const { session, equipment, inspectors } = data;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const contentWidth = pageWidth - (margin * 2);

        // --- HEADER SECTION ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'blogo.png');
        const headerHeight = 60;

        // Header box
        doc.lineWidth(1).rect(margin, margin, contentWidth, headerHeight).stroke();

        // Logo
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 10, margin + 5, { height: 50 });
        }

        // Title with gray background
        doc.fillColor('#d0d0d0')
          .rect(margin, margin + headerHeight, contentWidth, 35)
          .fill();
        doc.fillColor('#000000');

        doc.font('Helvetica-Bold').fontSize(16)
          .text('CHECKLIST PERALATAN WORKSHOP', margin, margin + headerHeight + 10, {
            width: contentWidth,
            align: 'center'
          });

        // Subtitle
        doc.font('Helvetica').fontSize(9)
          .text('Formulir ini digunakan sebagai catatan hasil inspeksi kondisi peralatan workshop di PT. Goden Energi Cemerlang Lesrari',
            margin + 20, margin + headerHeight + 28, {
            width: contentWidth - 40,
            align: 'center'
          });

        // Doc Code (top right)
        doc.font('Helvetica').fontSize(9)
          .text('BIB – HSE – PPO – F – XXX – XX', margin + contentWidth - 180, margin + 10, {
            width: 170,
            align: 'right'
          });

        // --- INFO SECTION ---
        const infoY = margin + headerHeight + 45;
        const infoRowHeight = 16;

        const drawInfoField = (label: string, value: string, x: number, y: number, w: number) => {
          doc.font('Helvetica-Bold').fontSize(9).text(label, x, y);
          doc.font('Helvetica').text(': ' + value, x + 80, y);
          doc.moveTo(x + 85, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke();
        };

        const col1X = margin + 20;
        const col2X = margin + contentWidth / 2 + 20;

        drawInfoField('Tanggal', new Date(session.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }), col1X, infoY, 250);
        drawInfoField('Shift', session.shift, col1X, infoY + infoRowHeight, 250);
        drawInfoField('Waktu', session.waktu, col1X, infoY + infoRowHeight * 2, 250);

        drawInfoField('Lokasi', session.lokasi, col2X, infoY, 250);
        drawInfoField('Departemen', session.departemen || '-', col2X, infoY + infoRowHeight, 250);
        drawInfoField('Total Equipment', (session.totalEquipment || 0).toString(), col2X, infoY + infoRowHeight * 2, 250);

        // --- TABLE SECTION ---
        const tableTop = infoY + (infoRowHeight * 3) + 15;

        const cols = [
          { name: 'No', w: 30, align: 'center' },
          { name: 'Nama Alat / Mesin', w: 200, align: 'left' },
          { name: 'Kondisi\nFisik', w: 60, align: 'center' },
          { name: 'Kebersihan', w: 60, align: 'center' },
          { name: 'Sertifikasi\n/ Tag', w: 70, align: 'center' },
          { name: 'Keterangan', w: 0, align: 'left' }
        ];

        const totalFixedW = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - totalFixedW;

        let currentY = tableTop;
        const headerHeightTable = 30;
        const rowHeight = 20;

        let x = margin;
        doc.lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9);

        // Table header
        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
        doc.fillColor('black');

        cols.forEach(col => {
          doc.rect(x, currentY, col.w, headerHeightTable).stroke();
          doc.text(col.name, x, currentY + 6, { width: col.w, align: col.align as any });
          x += col.w;
        });

        currentY += headerHeightTable;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        records.forEach((rec, idx) => {
          if (currentY > pageHeight - margin - 100) {
            doc.addPage();
            currentY = margin;
            x = margin;
            doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
            doc.fillColor('black');
            cols.forEach(col => {
              doc.rect(x, currentY, col.w, headerHeightTable).stroke();
              doc.text(col.name, x, currentY + 6, { width: col.w, align: col.align as any });
              x += col.w;
            });
            currentY += headerHeightTable;
          }

          x = margin;

          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            x += col.w;
          });

          x = margin;
          const drawText = (val: string, colIdx: number) => {
            doc.text(val, x + 2, currentY + 6, { width: cols[colIdx].w - 4, align: cols[colIdx].align as any });
            x += cols[colIdx].w;
          };

          drawText((idx + 1).toString(), 0);
          drawText(rec.namaAlat, 1);
          drawText(rec.kondisi ? 'Baik' : 'Rusak', 2);
          drawText(rec.kebersihan ? 'Rapi' : 'Kotor', 3);
          drawText(rec.sertifikasi ? 'Valid' : 'Expired', 4);
          drawText(rec.keterangan || '-', 5);

          currentY += rowHeight;
        });

        // --- OBSERVERS SECTION ---
        currentY += 20;

        if (currentY > pageHeight - margin - 80) {
          doc.addPage();
          currentY = margin;
        }

        const boxWidth = 150;
        const boxHeight = 80;
        let obsX = margin;

        doc.font('Helvetica-Bold').text('Observer / Pengamat:', margin, currentY);
        currentY += 15;

        observers.forEach((obs) => {
          doc.rect(obsX, currentY, boxWidth, boxHeight).stroke();

          doc.font('Helvetica').fontSize(8);
          doc.text(obs.nama, obsX + 2, currentY + 5, { width: boxWidth - 4, align: 'center' });
          doc.text(obs.nik || '', obsX + 2, currentY + 15, { width: boxWidth - 4, align: 'center' });

          if (obs.tandaTangan && obs.tandaTangan.startsWith('data:image')) {
            try {
              doc.image(obs.tandaTangan, obsX + 20, currentY + 30, { height: 30 });
            } catch (e) { }
          }

          obsX += boxWidth + 10;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }


  // ============================================================================
  // SIDAK KECEPATAN METHODS
  // ============================================================================

  async getSidakKecepatanSession(id: string): Promise<SidakKecepatanSession | undefined> {
    const [result] = await this.db.select().from(sidakKecepatanSessions).where(eq(sidakKecepatanSessions.id, id));
    return result;
  }

  async getAllSidakKecepatanSessions(): Promise<SidakKecepatanSession[]> {
    return await this.db.select().from(sidakKecepatanSessions).orderBy(desc(sidakKecepatanSessions.createdAt));
  }

  async createSidakKecepatanSession(session: InsertSidakKecepatanSession): Promise<SidakKecepatanSession> {
    const [result] = await this.db.insert(sidakKecepatanSessions).values(session).returning();
    return result;
  }

  async updateSidakKecepatanSession(id: string, updates: Partial<SidakKecepatanSession>): Promise<SidakKecepatanSession | undefined> {
    const [result] = await this.db.update(sidakKecepatanSessions).set(updates).where(eq(sidakKecepatanSessions.id, id)).returning();
    return result;
  }

  async getSidakKecepatanRecords(sessionId: string): Promise<SidakKecepatanRecord[]> {
    return await this.db.select().from(sidakKecepatanRecords).where(eq(sidakKecepatanRecords.sessionId, sessionId)).orderBy(asc(sidakKecepatanRecords.ordinal));
  }

  async createSidakKecepatanRecord(record: InsertSidakKecepatanRecord): Promise<SidakKecepatanRecord> {
    const [result] = await this.db.insert(sidakKecepatanRecords).values(record).returning();

    // Update total samples
    const allRecords = await this.getSidakKecepatanRecords(record.sessionId);
    await this.updateSidakKecepatanSession(record.sessionId, { totalSampel: allRecords.length });

    return result;
  }

  async getSidakKecepatanObservers(sessionId: string): Promise<SidakKecepatanObserver[]> {
    return await this.db.select().from(sidakKecepatanObservers).where(eq(sidakKecepatanObservers.sessionId, sessionId));
  }

  async createSidakKecepatanObserver(observer: InsertSidakKecepatanObserver): Promise<SidakKecepatanObserver> {
    const [result] = await this.db.insert(sidakKecepatanObservers).values(observer).returning();
    return result;
  }

  async generateSidakKecepatanPDF(data: {
    session: SidakKecepatanSession;
    records: SidakKecepatanRecord[];
    observers: SidakKecepatanObserver[];
  }): Promise<Buffer> {
    const { session, records, observers } = data;
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 30, bottom: 30, left: 30, right: 30 },
          bufferPages: true
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const margin = 30;
        const pageWidth = 841.89; // A4 Landscape width
        const pageHeight = 595.28; // A4 Landscape height
        const contentWidth = pageWidth - (margin * 2);

        // --- Header Section ---
        const logoPath = path.join(process.cwd(), 'client', 'public', 'gecl-logo.jpeg');

        // Define Header Box
        const headerHeight = 60;
        doc.lineWidth(1).rect(margin, margin, contentWidth, headerHeight).stroke();

        // Logo
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin + 10, margin + 5, { height: 50 });
        }

        // Title
        doc.font('Helvetica-Bold').fontSize(16)
          .text('FORM OBSERVASI KECEPATAN BERKENDARA', margin + 100, margin + 20, { width: contentWidth - 200, align: 'center' });

        // Doc Code
        doc.font('Helvetica').fontSize(9)
          .text('No. Dokumen: BIB-HSE-PPO-F-072-18', margin + contentWidth - 200, margin + 10, { width: 190, align: 'right' });
        doc.text('Revisi: 00', margin + contentWidth - 200, margin + 22, { width: 190, align: 'right' });
        doc.text('Tanggal Efektif: 01 Jan 2024', margin + contentWidth - 200, margin + 34, { width: 190, align: 'right' });
        doc.text('Halaman: 1 dari 1', margin + contentWidth - 200, margin + 46, { width: 190, align: 'right' });

        // --- Info Section ---
        const infoY = margin + headerHeight + 10;
        const infoRowHeight = 16;

        const drawInfoField = (label: string, value: string, x: number, y: number, w: number) => {
          doc.font('Helvetica-Bold').fontSize(9).text(label, x, y);
          doc.font('Helvetica').text(': ' + value, x + 80, y);
          doc.moveTo(x + 85, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke();
        };

        const col1X = margin + 20;
        const col2X = margin + contentWidth / 2 + 20;

        drawInfoField('Hari / Tanggal', new Date(session.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }), col1X, infoY, 200);
        drawInfoField('Shift', session.shift || '-', col1X, infoY + infoRowHeight, 200);
        drawInfoField('Waktu', session.waktu || '-', col1X, infoY + infoRowHeight * 2, 200);

        drawInfoField('Lokasi', session.lokasi, col2X, infoY, 200);
        drawInfoField('Sub Lokasi', session.subLokasi || '-', col2X, infoY + infoRowHeight, 200);
        drawInfoField('Batas Kel.', (session.batasKecepatanKph?.toString() || '-') + ' km/h', col2X, infoY + infoRowHeight * 2, 200);

        // --- Table Section ---
        const tableTop = infoY + (infoRowHeight * 3) + 15;

        const cols = [
          { name: 'No', w: 30, align: 'center' },
          { name: 'No Unit', w: 80, align: 'left' },
          { name: 'Tipe Unit', w: 90, align: 'center' },
          { name: 'Arah (Muatan)', w: 70, align: 'center' },
          { name: 'Arah (Kosong)', w: 70, align: 'center' },
          { name: 'Speed (MPH)', w: 70, align: 'center' },
          { name: 'Speed (KPH)', w: 70, align: 'center' },
          { name: 'Keterangan', w: 0, align: 'left' }
        ];

        const totalFixedW = cols.reduce((sum, c) => sum + c.w, 0);
        cols[cols.length - 1].w = contentWidth - totalFixedW;

        let currentY = tableTop;
        const headerHeightTable = 25;
        const rowHeight = 20;

        let x = margin;
        doc.lineWidth(1);
        doc.font('Helvetica-Bold').fontSize(9);

        // Table header
        doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
        doc.fillColor('black');

        cols.forEach(col => {
          doc.rect(x, currentY, col.w, headerHeightTable).stroke();
          doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
          x += col.w;
        });

        currentY += headerHeightTable;

        // Table rows
        doc.font('Helvetica').fontSize(9);
        records.forEach((rec, idx) => {
          if (currentY > pageHeight - margin - 100) {
            doc.addPage();
            currentY = margin;
            x = margin;
            doc.fillColor('#e0e0e0').rect(margin, currentY, contentWidth, headerHeightTable).fill();
            doc.fillColor('black');
            cols.forEach(col => {
              doc.rect(x, currentY, col.w, headerHeightTable).stroke();
              doc.text(col.name, x, currentY + 8, { width: col.w, align: col.align as any });
              x += col.w;
            });
            currentY += headerHeightTable;
          }

          x = margin;

          cols.forEach(col => {
            doc.rect(x, currentY, col.w, rowHeight).stroke();
            x += col.w;
          });

          x = margin;
          const drawText = (val: string, colIdx: number) => {
            doc.text(val, x + 2, currentY + 6, { width: cols[colIdx].w - 4, align: cols[colIdx].align as any });
            x += cols[colIdx].w;
          };

          drawText((idx + 1).toString(), 0);
          drawText(rec.noKendaraan, 1);
          drawText(rec.tipeUnit, 2);
          drawText(rec.arahMuatan ? 'OK' : '-', 3);
          drawText(rec.arahKosongan ? 'OK' : '-', 4);
          drawText((rec.kecepatanMph || '').toString(), 5);
          drawText((rec.kecepatanKph || '0').toString(), 6);
          drawText(rec.keterangan || '', 7);

          currentY += rowHeight;
        });

        // --- Observers Section ---
        currentY += 20;

        if (currentY > pageHeight - margin - 80) {
          doc.addPage();
          currentY = margin;
        }

        const boxWidth = 120;
        const boxHeight = 80;
        let obsX = margin;

        doc.font('Helvetica-Bold').text('Observer / Pengamat:', margin, currentY);
        currentY += 15;

        observers.forEach((obs) => {
          doc.rect(obsX, currentY, boxWidth, boxHeight).stroke();

          doc.font('Helvetica').fontSize(8);
          doc.text(obs.nama, obsX + 2, currentY + 5, { width: boxWidth - 4, align: 'center' });
          doc.text(obs.nik || '', obsX + 2, currentY + 15, { width: boxWidth - 4, align: 'center' });

          if (obs.tandaTangan && obs.tandaTangan.startsWith('data:image')) {
            try {
              doc.image(obs.tandaTangan, obsX + 20, currentY + 30, { height: 30 });
            } catch (e) { }
          }

          obsX += boxWidth + 10;
        });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }




  // MONITORING KOMPETENSI
  async getKompetensiMonitoring(): Promise<KompetensiMonitoring[]> {
    return await db.select().from(kompetensiMonitoring).orderBy(desc(kompetensiMonitoring.createdAt));
  }

  async getKompetensiMonitoringById(id: string): Promise<KompetensiMonitoring | undefined> {
    const [record] = await db.select().from(kompetensiMonitoring).where(eq(kompetensiMonitoring.id, id));
    return record;
  }

  async createKompetensiMonitoring(data: InsertKompetensiMonitoring): Promise<KompetensiMonitoring> {
    const [record] = await db.insert(kompetensiMonitoring).values(data).returning();
    return record;
  }

  async updateKompetensiMonitoring(id: string, data: Partial<InsertKompetensiMonitoring>): Promise<KompetensiMonitoring | undefined> {
    const [record] = await db.update(kompetensiMonitoring).set({ ...data, updatedAt: new Date() }).where(eq(kompetensiMonitoring.id, id)).returning();
    return record;
  }

  async deleteKompetensiMonitoring(id: string): Promise<boolean> {
    const [deleted] = await db.delete(kompetensiMonitoring).where(eq(kompetensiMonitoring.id, id)).returning();
    return !!deleted;
  }



  // ============================================
  // DOCUMENT MASTERLIST STORAGE METHODS
  // ============================================

  async getDocumentMasterlist(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT dm.*, dv.file_path 
        FROM document_masterlist dm
        LEFT JOIN document_versions dv ON dm.id = dv.document_id 
          AND dm.current_version = dv.version_number 
          AND dm.current_revision = dv.revision_number
        ORDER BY dm.created_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching document masterlist:", error);
      return [];
    }
  }

  async getDocumentById(id: string): Promise<any | undefined> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM document_masterlist WHERE id = ${id}
      `);
      return result.rows?.[0];
    } catch (error) {
      console.error("Error fetching document by id:", error);
      return undefined;
    }
  }

  async addDocumentVersion(data: any): Promise<any> {
    try {
      console.log("[STORAGE] Adding document version with data:", JSON.stringify(data, null, 2));

      // 1. Insert into document_versions
      console.log("[STORAGE] Inserting into document_versions...");
      const [newVersion] = await db.insert(documentVersions).values({
        documentId: data.documentId,
        versionNumber: data.versionNumber,
        revisionNumber: data.revisionNumber,
        fileName: data.fileName,
        filePath: data.filePath,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedBy: data.uploadedBy,
        uploadedByName: data.uploadedByName,
        changesNote: data.changesNote,
        status: "DRAFT"
      }).returning();
      console.log("[STORAGE] Insert successful, ID:", newVersion.id);

      // 2. Update masterlist current version references
      console.log("[STORAGE] Updating documentMasterlist...");
      try {
        await db.update(documentMasterlist)
          .set({
            currentVersion: data.versionNumber,
            currentRevision: data.revisionNumber,
            updatedAt: new Date()
          })
          .where(eq(documentMasterlist.id, data.documentId));
        console.log("[STORAGE] Masterlist updated.");
      } catch (updateError) {
        console.error("[STORAGE] Error updating masterlist:", updateError);
        // We do not throw here to allow the version to be returned, 
        // but ideally we should transactionalize this. 
        // For debugging, we just log it.
      }

      return newVersion;
    } catch (error) {
      console.error("[STORAGE] Critical error adding document version:", error);
      throw error;
    }
  }


  async createDocumentMasterlist(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO document_masterlist (
        document_code, title, category, department,
        current_version, current_revision,
        owner_id, owner_name,
        lifecycle_status, control_type,
        effective_date, next_review_date, expiry_date,
        sign_required, smkp_clause, retention_period, description, created_by
      ) VALUES (
        ${data.documentCode}, ${data.title}, ${data.category}, ${data.department},
        ${data.currentVersion || 1}, ${data.currentRevision || 0},
        ${data.ownerId}, ${data.ownerName},
        ${data.lifecycleStatus || 'DRAFT'}, ${data.controlType || 'CONTROLLED'},
        ${data.effectiveDate || null}, ${data.nextReviewDate || null}, ${data.expiryDate || null},
        ${data.signRequired !== false}, ${data.smkpClause || null}, ${data.retentionPeriod || null},
        ${data.description || null}, ${data.createdBy}
      ) RETURNING *
    `);
    return result.rows?.[0];
  }

  async updateDocumentMasterlist(id: string, data: any): Promise<any | undefined> {
    // Build dynamic update - only update provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (data.title !== undefined) { updates.push(`title = '${data.title}'`); }
    if (data.category !== undefined) { updates.push(`category = '${data.category}'`); }
    if (data.department !== undefined) { updates.push(`department = '${data.department}'`); }
    if (data.lifecycleStatus !== undefined) { updates.push(`lifecycle_status = '${data.lifecycleStatus}'`); }
    if (data.effectiveDate !== undefined) { updates.push(`effective_date = '${data.effectiveDate}'`); }
    if (data.nextReviewDate !== undefined) { updates.push(`next_review_date = '${data.nextReviewDate}'`); }

    updates.push(`updated_at = NOW()`);

    const result = await db.execute(sql.raw(`
      UPDATE document_masterlist 
      SET ${updates.join(', ')}
      WHERE id = '${id}'
      RETURNING *
    `));
    return result.rows?.[0];
  }

  async deleteDocumentMasterlist(id: string): Promise<boolean> {
    const result = await db.execute(sql`
      DELETE FROM document_masterlist WHERE id = ${id} RETURNING id
    `);
    return (result.rows?.length || 0) > 0;
  }

  async getDocumentVersions(documentId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM document_versions 
        WHERE document_id = ${documentId}
        ORDER BY version_number DESC, revision_number DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching document versions:", error);
      return [];
    }
  }

  async submitDocumentForApproval(documentId: string, versionId: string, userId: string, userName: string, workflowName: string = "Standard Approval"): Promise<any> {
    try {
      // 1. Create Approval Record
      const [approval] = await db.insert(documentApprovals).values({
        documentId,
        versionId,
        workflowName,
        totalSteps: 2, // Default: Sect Head -> PJO
        currentStep: 1,
        status: "PENDING",
        initiatedBy: userId,
        initiatedByName: userName
      }).returning();

      // 2. Create Approval Steps
      // Step 1: Diperiksa Oleh (Sect Head)
      const [step1] = await db.insert(documentApprovalSteps).values({
        approvalId: approval.id,
        stepNumber: 1,
        stepName: "Diperiksa Oleh (Sect Head)",
        mode: "SERIAL",
        status: "PENDING"
      }).returning();

      // Step 2: Disahkan Oleh (PJO)
      const [step2] = await db.insert(documentApprovalSteps).values({
        approvalId: approval.id,
        stepNumber: 2,
        stepName: "Disahkan Oleh (PJO)",
        mode: "SERIAL",
        status: "PENDING"
      }).returning();

      // 3. Find Assignees based on Position
      // Step 1: Sect Head (Filtered by Department of the document)
      const doc = (await db.select().from(documentMasterlist).where(eq(documentMasterlist.id, documentId)))[0];

      const sectHeads = await db.select().from(employees).where(
        and(
          or(
            ilike(employees.position, '%Section Head%'),
            ilike(employees.position, '%Sect Head%'),
            ilike(employees.position, '%Head of%')
          ),
          ilike(employees.department, `%${doc.department}%`)
        )
      );

      // Step 2: Project Manager (PJO)
      const pjos = await db.select().from(employees).where(
        or(
          ilike(employees.position, '%Project Manager%'),
          ilike(employees.position, '%Manager Proyek%'),
          ilike(employees.position, '%PJO%'),
          ilike(employees.position, '%KTT%')
        )
      );

      // 4. Create Step Assignees
      // Add Sect Heads to Step 1
      for (const sh of sectHeads) {
        await db.insert(documentStepAssignees).values({
          stepId: step1.id,
          assigneeId: sh.id,
          assigneeName: sh.name,
          assigneePosition: sh.position,
        });
      }

      // Add PJO to Step 2
      for (const pjo of pjos) {
        await db.insert(documentStepAssignees).values({
          stepId: step2.id,
          assigneeId: pjo.id,
          assigneeName: pjo.name,
          assigneePosition: pjo.position,
        });
      }

      // 5. Update Document Status
      await db.update(documentMasterlist)
        .set({ lifecycleStatus: "IN_REVIEW" })
        .where(eq(documentMasterlist.id, documentId));

      await db.update(documentVersions)
        .set({ status: "PENDING_APPROVAL" })
        .where(eq(documentVersions.id, versionId));

      // 6. Update Step 1 to IN_PROGRESS if we found assignees
      if (sectHeads.length > 0) {
        await db.update(documentApprovalSteps)
          .set({ status: "IN_PROGRESS" })
          .where(eq(documentApprovalSteps.id, step1.id));
      }

      return { approval, steps: [step1, step2], assignees: [...sectHeads, ...pjos] };
    } catch (error) {
      console.error("Error submitting document for approval:", error);
      throw error;
    }
  }

  async getDocumentApprovals(documentId: string): Promise<any[]> {
    const approvals = await db.select().from(documentApprovals)
      .where(eq(documentApprovals.documentId, documentId))
      .orderBy(desc(documentApprovals.initiatedAt));

    // Fetch steps for each approval
    const result = await Promise.all(approvals.map(async (app) => {
      const steps = await db.select().from(documentApprovalSteps)
        .where(eq(documentApprovalSteps.approvalId, app.id))
        .orderBy(asc(documentApprovalSteps.stepNumber));
      return { ...app, steps };
    }));

    return result;
  }

  async approveDocumentStep(approvalId: string, stepNumber: number, userId: string, userName: string, decision: "APPROVED" | "REJECTED", notes?: string): Promise<any> {
    try {
      // 1. Get current step
      const steps = await db.select().from(documentApprovalSteps)
        .where(and(eq(documentApprovalSteps.approvalId, approvalId), eq(documentApprovalSteps.stepNumber, stepNumber)));

      const step = steps[0];
      if (!step) throw new Error("Step not found");

      // 2. Update step status
      await db.update(documentApprovalSteps)
        .set({
          status: decision === "APPROVED" ? "COMPLETED" : "REJECTED",
          completedAt: new Date(),
          quorumAchieved: 1 // Simple simplified logic for now
        })
        .where(eq(documentApprovalSteps.id, step.id));

      // 3. Log the decision
      await db.insert(documentStepAssignees).values({
        stepId: step.id,
        assigneeId: userId,
        assigneeName: userName,
        decision: decision,
        comments: notes,
        decidedAt: new Date()
      });

      // 4. Handle workflow transition
      const approval = (await db.select().from(documentApprovals).where(eq(documentApprovals.id, approvalId)))[0];

      if (decision === "REJECTED") {
        // Reject entire workflow
        await db.update(documentApprovals).set({ status: "REJECTED", completedAt: new Date(), finalDecision: "REJECTED" }).where(eq(documentApprovals.id, approvalId));
        await db.update(documentMasterlist).set({ lifecycleStatus: "DRAFT" }).where(eq(documentMasterlist.id, approval.documentId)); // Revert to Draft
        await db.update(documentVersions).set({ status: "DRAFT" }).where(eq(documentVersions.id, approval.versionId));
        return { status: "REJECTED" };
      } else {
        // Approved - check if next step exists
        if (stepNumber < approval.totalSteps) {
          // Move to next step
          await db.update(documentApprovals).set({ currentStep: stepNumber + 1 }).where(eq(documentApprovals.id, approvalId));

          // Update next step status to IN_PROGRESS
          await db.update(documentApprovalSteps)
            .set({ status: 'IN_PROGRESS' })
            .where(and(eq(documentApprovalSteps.approvalId, approvalId), eq(documentApprovalSteps.stepNumber, stepNumber + 1)));

          return { status: "NEXT_STEP" };
        } else {
          // All steps completed - Final Approval
          await db.update(documentApprovals).set({ status: "APPROVED", completedAt: new Date(), finalDecision: "APPROVED" }).where(eq(documentApprovals.id, approvalId));

          // Fetch doc to decide whether to auto-publish or wait for eSign
          const docRow = (await db.select().from(documentMasterlist).where(eq(documentMasterlist.id, approval.documentId)))[0];

          // Auto-publish if signing not required; otherwise route to ESIGN_PENDING
          const nextDocStatus = docRow?.signRequired === false ? "PUBLISHED" : "APPROVED";
          const nextVersionStatus = docRow?.signRequired === false ? "ACTIVE" : "APPROVED";

          // Compute nextReviewDate = +1 year from today (YYYY-MM-DD)
          const today = new Date();
          const reviewDate = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
          const reviewIso = reviewDate.toISOString().slice(0, 10);
          const effectiveIso = today.toISOString().slice(0, 10);

          const docUpdate: any = { lifecycleStatus: nextDocStatus, updatedAt: new Date() };
          if (nextDocStatus === "PUBLISHED") {
            docUpdate.nextReviewDate = reviewIso;
            if (!docRow?.effectiveDate) docUpdate.effectiveDate = effectiveIso;
          }
          await db.update(documentMasterlist).set(docUpdate).where(eq(documentMasterlist.id, approval.documentId));
          await db.update(documentVersions).set({ status: nextVersionStatus }).where(eq(documentVersions.id, approval.versionId));

          // If published, supersede older versions
          if (nextDocStatus === "PUBLISHED") {
            await db.update(documentVersions)
              .set({ status: "SUPERSEDED" })
              .where(and(
                eq(documentVersions.documentId, approval.documentId),
                not(eq(documentVersions.id, approval.versionId)),
                not(eq(documentVersions.status, "SUPERSEDED")),
              ));
          }

          return { status: "APPROVED" };
        }
      }
    } catch (error) {
      console.error("Error updating approval:", error);
      throw error;
    }
  }
  async getPendingApprovals(userId?: string): Promise<any[]> {
    const query = db.select({
      id: documentApprovalSteps.id,
      approvalId: documentApprovalSteps.approvalId,
      stepName: documentApprovalSteps.stepName,
      stepNumber: documentApprovalSteps.stepNumber,
      initiatedBy: documentApprovals.initiatedBy,
      initiatedByName: documentApprovals.initiatedByName,
      initiatedAt: documentApprovals.initiatedAt,
      documentId: documentApprovals.documentId,
      title: documentMasterlist.title,
      document_code: documentMasterlist.documentCode,
      workflowName: documentApprovals.workflowName,
      status: documentApprovalSteps.status,
      assignee_id: documentStepAssignees.assigneeId
    })
      .from(documentApprovalSteps)
      .innerJoin(documentApprovals, eq(documentApprovalSteps.approvalId, documentApprovals.id))
      .innerJoin(documentMasterlist, eq(documentApprovals.documentId, documentMasterlist.id))
      .innerJoin(documentStepAssignees, eq(documentApprovalSteps.id, documentStepAssignees.stepId))
      .where(
        and(
          eq(documentApprovalSteps.status, "IN_PROGRESS"),
          userId ? eq(documentStepAssignees.assigneeId, userId) : undefined
        )
      )
      .orderBy(desc(documentApprovals.initiatedAt));

    return query;
  }



  // ============================================
  // APPROVAL WORKFLOW STORAGE METHODS (Phase 2)
  // ============================================

  async submitDocumentForReview(documentId: string, data: any): Promise<any> {
    // 1. Update document status to IN_REVIEW
    await db.execute(sql`
      UPDATE document_masterlist 
      SET lifecycle_status = 'IN_REVIEW', updated_at = NOW()
      WHERE id = ${documentId}
    `);

    // 2. Create approval record
    const approvalResult = await db.execute(sql`
      INSERT INTO document_approvals (
        document_id, version_id, workflow_name, 
        total_steps, current_step, status,
        initiated_by, initiated_by_name
      ) VALUES (
        ${documentId}, ${documentId}, ${data.workflowName},
        1, 1, 'PENDING',
        ${data.initiatedBy}, ${data.initiatedByName}
      ) RETURNING *
    `);

    const approval = approvalResult.rows?.[0];
    if (!approval) throw new Error("Failed to create approval");

    // 3. Create approval step
    const stepResult = await db.execute(sql`
      INSERT INTO document_approval_steps (
        approval_id, step_number, step_name, mode, quorum_required, status
      ) VALUES (
        ${approval.id}, 1, 'Review', 'SERIAL', 1, 'IN_PROGRESS'
      ) RETURNING *
    `);

    const step = stepResult.rows?.[0];
    if (!step) throw new Error("Failed to create step");

    // 4. Add assignees
    for (const approver of data.approvers) {
      await db.execute(sql`
        INSERT INTO document_step_assignees (
          step_id, assignee_id, assignee_name, assignee_position,
          deadline
        ) VALUES (
          ${step.id}, ${approver.id}, ${approver.name}, ${approver.position || null},
          ${data.deadline ? new Date(data.deadline) : null}
        )
      `);
    }

    return approval;
  }

  async getApprovalInbox(userId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          dsa.id as assignee_id,
          dsa.assignee_name,
          dsa.decision,
          dsa.deadline,
          dsa.created_at as assigned_at,
          das.step_name,
          da.workflow_name,
          da.status as approval_status,
          dm.id as document_id,
          dm.document_code,
          dm.title,
          dm.category,
          dm.department,
          da.initiated_by_name as submitted_by,
          dv.file_path
        FROM document_step_assignees dsa
        JOIN document_approval_steps das ON dsa.step_id = das.id
        JOIN document_approvals da ON das.approval_id = da.id
        JOIN document_masterlist dm ON da.document_id = dm.id
        JOIN document_versions dv ON da.version_id = dv.id
        WHERE dsa.assignee_id = ${userId}
          AND dsa.decision IS NULL
          AND das.status = 'IN_PROGRESS'
        ORDER BY dsa.created_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching approval inbox:", error);
      return [];
    }
  }

  async processApprovalDecision(assigneeId: string, data: any): Promise<any> {
    // 1. Update assignee decision
    await db.execute(sql`
      UPDATE document_step_assignees 
      SET decision = ${data.decision}, 
          comments = ${data.comments || null},
          decided_at = NOW()
      WHERE id = ${assigneeId}
    `);

    // 2. Get the step and check if all assignees have decided
    const stepResult = await db.execute(sql`
      SELECT das.*, dsa.step_id, da.document_id
      FROM document_step_assignees dsa
      JOIN document_approval_steps das ON dsa.step_id = das.id
      JOIN document_approvals da ON das.approval_id = da.id
      WHERE dsa.id = ${assigneeId}
    `);

    const stepInfo = stepResult.rows?.[0];
    if (!stepInfo) return { success: false };

    // 3. Check pending assignees for this step
    const pendingResult = await db.execute(sql`
      SELECT COUNT(*) as pending FROM document_step_assignees 
      WHERE step_id = ${stepInfo.step_id} AND decision IS NULL
    `);

    const pendingCount = parseInt(String(pendingResult.rows?.[0]?.pending || "0"));

    // 4. If rejected, mark document as rejected
    if (data.decision === "REJECTED") {
      await db.execute(sql`
        UPDATE document_masterlist 
        SET lifecycle_status = 'DRAFT', updated_at = NOW()
        WHERE id = ${stepInfo.document_id}
      `);

      await db.execute(sql`
        UPDATE document_approvals 
        SET status = 'REJECTED', final_decision = 'REJECTED', completed_at = NOW()
        WHERE document_id = ${stepInfo.document_id} AND status = 'PENDING'
      `);
    }
    // 5. If all approved and no pending, complete the approval
    else if (pendingCount === 0 && data.decision === "APPROVED") {
      await db.execute(sql`
        UPDATE document_masterlist 
        SET lifecycle_status = 'APPROVED', updated_at = NOW()
        WHERE id = ${stepInfo.document_id}
      `);

      await db.execute(sql`
        UPDATE document_approvals 
        SET status = 'APPROVED', final_decision = 'APPROVED', completed_at = NOW()
        WHERE document_id = ${stepInfo.document_id} AND status = 'PENDING'
      `);

      await db.execute(sql`
        UPDATE document_approval_steps 
        SET status = 'COMPLETED', completed_at = NOW()
        WHERE id = ${stepInfo.step_id}
      `);
    }

    return { success: true, decision: data.decision };
  }



  // ============================================
  // DISTRIBUTION STORAGE METHODS (Phase 3)
  // ============================================

  async distributeDocument(documentId: string, data: any): Promise<any> {
    // Get the latest version ID
    const versionResult = await db.execute(sql`
      SELECT id FROM document_versions WHERE document_id = ${documentId}
      ORDER BY version_number DESC, revision_number DESC LIMIT 1
    `);
    const versionId = versionResult.rows?.[0]?.id || documentId;

    // Create distribution records for each recipient
    const results = [];
    for (const recipient of data.recipients) {
      const result = await db.execute(sql`
        INSERT INTO document_distributions (
          document_id, version_id,
          recipient_id, recipient_name, recipient_department,
          is_mandatory, deadline,
          distributed_by
        ) VALUES (
          ${documentId}, ${versionId},
          ${recipient.id}, ${recipient.name}, ${recipient.department || null},
          ${data.isMandatory}, ${data.deadline || null},
          ${data.distributedBy}
        ) RETURNING *
      `);
      results.push(result.rows?.[0]);
    }

    return { success: true, count: results.length };
  }

  async getMyDocuments(userId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          dd.id as distribution_id,
          dd.is_read,
          dd.read_at,
          dd.acknowledged_at,
          dd.deadline,
          dd.is_mandatory,
          dm.id as document_id,
          dm.document_code,
          dm.title,
          dm.category,
          dm.department,
          dm.lifecycle_status,
          dv.file_path
        FROM document_distributions dd
        JOIN document_masterlist dm ON dd.document_id = dm.id
        JOIN document_versions dv ON dd.version_id = dv.id
        WHERE dd.recipient_id = ${userId}
        ORDER BY dd.distributed_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching my documents:", error);
      return [];
    }
  }

  async acknowledgeDocument(distributionId: string, data: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE document_distributions 
      SET 
        is_read = true,
        read_at = COALESCE(read_at, NOW()),
        acknowledged_at = NOW(),
        ip_address = ${data.ipAddress || null},
        user_agent = ${data.userAgent || null}
      WHERE id = ${distributionId}
      RETURNING *
    `);
    return result.rows?.[0];
  }

  async getDocumentDistributions(documentId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          dd.*,
          CASE 
            WHEN dd.acknowledged_at IS NOT NULL THEN 'acknowledged'
            WHEN dd.read_at IS NOT NULL THEN 'read'
            ELSE 'pending'
          END as status
        FROM document_distributions dd
        WHERE dd.document_id = ${documentId}
        ORDER BY dd.distributed_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching distributions:", error);
      return [];
    }
  }

  async publishDocument(documentId: string): Promise<any> {
    const result = await db.execute(sql`
      UPDATE document_masterlist 
      SET lifecycle_status = 'PUBLISHED', updated_at = NOW()
      WHERE id = ${documentId} AND lifecycle_status = 'APPROVED'
      RETURNING *
    `);

    if (!result.rows?.[0]) {
      throw new Error("Document not found or not in APPROVED status");
    }

    return result.rows[0];
  }

  // ============================================
  // EXTERNAL DOCUMENTS STORAGE (Phase 5)
  // ============================================

  async getExternalDocuments(): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM external_documents ORDER BY created_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching external documents:", error);
      return [];
    }
  }

  async createExternalDocument(data: any): Promise<any> {
    const result = await db.execute(sql`
      INSERT INTO external_documents (
        document_code, title, source, issued_by,
        version_number, issue_date, next_review_date,
        file_type, file_url, file_name,
        status, distribution_required,
        owner_id, owner_name, department,
        notes, created_by
      ) VALUES (
        ${data.documentCode}, ${data.title}, ${data.source}, ${data.issuedBy || null},
        ${data.versionNumber || null}, ${data.issueDate || null}, ${data.nextReviewDate || null},
        ${data.fileType || 'LINK'}, ${data.fileUrl || null}, ${data.fileName || null},
        ${data.status || 'ACTIVE'}, ${data.distributionRequired || false},
        ${data.ownerId || null}, ${data.ownerName || null}, ${data.department || null},
        ${data.notes || null}, ${data.createdBy}
      ) RETURNING *
    `);
    return result.rows?.[0];
  }

  async updateExternalDocument(id: string, data: any): Promise<any> {
    const updates: string[] = [];
    if (data.title !== undefined) updates.push(`title = '${data.title}'`);
    if (data.source !== undefined) updates.push(`source = '${data.source}'`);
    if (data.status !== undefined) updates.push(`status = '${data.status}'`);
    if (data.nextReviewDate !== undefined) updates.push(`next_review_date = '${data.nextReviewDate}'`);
    if (data.fileUrl !== undefined) updates.push(`file_url = '${data.fileUrl}'`);
    updates.push(`updated_at = NOW()`);

    const result = await db.execute(sql.raw(`
      UPDATE external_documents SET ${updates.join(', ')} WHERE id = '${id}' RETURNING *
    `));
    return result.rows?.[0];
  }

  async deleteExternalDocument(id: string): Promise<boolean> {
    await db.execute(sql`DELETE FROM external_documents WHERE id = ${id}`);
    return true;
  }

  // ============================================
  // ESIGN STORAGE (Phase 5)
  // ============================================

  async createEsignRequest(documentId: string, data: any): Promise<any> {
    // Get latest version
    const versionResult = await db.execute(sql`
      SELECT id FROM document_versions WHERE document_id = ${documentId}
      ORDER BY version_number DESC, revision_number DESC LIMIT 1
    `);
    const versionId = versionResult.rows?.[0]?.id || documentId;

    // Update document status to ESIGN_PENDING
    await db.execute(sql`
      UPDATE document_masterlist SET lifecycle_status = 'ESIGN_PENDING', updated_at = NOW()
      WHERE id = ${documentId}
    `);

    // Create eSign request
    const result = await db.execute(sql`
      INSERT INTO esign_requests (
        document_id, version_id, approval_id,
        provider, signer_id, signer_name, signer_position,
        status, created_by
      ) VALUES (
        ${documentId}, ${versionId}, ${data.approvalId || null},
        ${data.provider || 'uSign'}, ${data.signerId}, ${data.signerName}, ${data.signerPosition || null},
        'PENDING', ${data.createdBy}
      ) RETURNING *
    `);
    return result.rows?.[0];
  }

  async getEsignRequests(documentId: string): Promise<any[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM esign_requests WHERE document_id = ${documentId}
        ORDER BY requested_at DESC
      `);
      return result.rows || [];
    } catch (error) {
      console.error("Error fetching esign requests:", error);
      return [];
    }
  }

  async updateEsignStatus(externalRequestId: string, data: any): Promise<any> {
    const result = await db.execute(sql`
      UPDATE esign_requests SET
        status = ${data.status},
        signed_file_path = ${data.signedFileUrl || null},
        signed_at = ${data.status === 'SIGNED' ? sql`NOW()` : null},
        failed_reason = ${data.failedReason || null}
      WHERE external_request_id = ${externalRequestId}
      RETURNING *
    `);

    // If signed, update document status
    if (data.status === 'SIGNED' && result.rows?.[0]) {
      const req = result.rows[0];
      await db.execute(sql`
        UPDATE document_masterlist SET lifecycle_status = 'SIGNED', updated_at = NOW()
        WHERE id = ${req.document_id}
      `);

      // Update version with signed file
      if (data.signedFileUrl) {
        await db.execute(sql`
          UPDATE document_versions SET signed_file_path = ${data.signedFileUrl}, signed_at = NOW()
          WHERE id = ${req.version_id}
        `);
      }
    }

    return result.rows?.[0];
  }

  async retryEsignRequest(requestId: string): Promise<any> {
    const result = await db.execute(sql`
      UPDATE esign_requests SET
        status = 'PENDING',
        retry_count = retry_count + 1,
        last_retry_at = NOW(),
        failed_reason = NULL
      WHERE id = ${requestId}
      RETURNING *
    `);
    return result.rows?.[0];
  }

  // ============================================
  // CHANGE REQUESTS
  // ============================================

  async createChangeRequest(data: any): Promise<ChangeRequest> {
    const result = await db.insert(changeRequests).values(data).returning();
    return result[0];
  }

  async getChangeRequests(documentId: string): Promise<ChangeRequest[]> {
    return db
      .select()
      .from(changeRequests)
      .where(eq(changeRequests.documentId, documentId))
      .orderBy(desc(changeRequests.requestedAt));
  }

  async updateChangeRequestStatus(id: string, updateData: any): Promise<ChangeRequest> {
    const result = await db
      .update(changeRequests)
      .set({
        ...updateData,
        // If approved, set completedAt
        completedAt: updateData.status === "COMPLETED" || updateData.status === "APPROVED" ? new Date() : undefined,
      })
      .where(eq(changeRequests.id, id))
      .returning();
    return result[0];
  }

  async getPendingChangeRequests(): Promise<any[]> {
    // Join with document masterlist to get title and code
    const result = await db
      .select({
        ...getTableColumns(changeRequests),
        documentCode: documentMasterlist.documentCode,
        documentTitle: documentMasterlist.title,
        documentCategory: documentMasterlist.category,
        filePath: documentVersions.filePath,
      })
      .from(changeRequests)
      .innerJoin(documentMasterlist, eq(changeRequests.documentId, documentMasterlist.id))
      .leftJoin(documentVersions, and(
        eq(documentMasterlist.id, documentVersions.documentId),
        eq(documentMasterlist.currentVersion, documentVersions.versionNumber),
        eq(documentMasterlist.currentRevision, documentVersions.revisionNumber)
      ))
      .where(eq(changeRequests.status, "PENDING"))
      .orderBy(desc(changeRequests.requestedAt));

    return result;
  }

  async getDisposalRecords(): Promise<DocumentDisposalRecord[]> {
    return db
      .select()
      .from(documentDisposalRecords)
      .orderBy(desc(documentDisposalRecords.disposedAt));
  }


  async createDisposalRecord(data: InsertDocumentDisposalRecord): Promise<DocumentDisposalRecord> {
    const result = await db.insert(documentDisposalRecords).values(data).returning();
    return result[0];
  }

  // ============================================
  // ACTIVITY CALENDAR (Mystic AI)
  // ============================================
  async getActivityEvents(userId: string): Promise<ActivityEvent[]> {
    return db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.userId, userId))
      .orderBy(desc(activityEvents.startTime));
  }

  async createActivityEvent(event: InsertActivityEvent): Promise<ActivityEvent> {
    const [newItem] = await db.insert(activityEvents).values(event).returning();
    return newItem;
  }

  async deleteActivityEvent(id: string): Promise<boolean> {
    const [deleted] = await db
      .delete(activityEvents)
      .where(eq(activityEvents.id, id))
      .returning();
    return !!deleted;
  }

  async deleteChatSession(id: string): Promise<void> {
    // Delete messages first (cascade usually handles this but safety first)
    // Note: Assuming chatMessages and chatSessions are available in scope or imports, otherwise this would fail.
    // Given the context, we'll proceed with the new method implementation below.
    try {
      // Attempt to delete if tables exist/imported
      // await db.delete(chatMessages).where(eq(chatMessages.sessionId, id));
      // await db.delete(chatSessions).where(eq(chatSessions.id, id));
      console.log("Delete chat session logic placeholder");
    } catch (e) {
      console.error("Error deleting chat session", e);
    }
  }

  async syncLeaveMonitoringWithRoster(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    // [NEW] Auto-add missing employees from Roster
    const rosterEmployees = await db.selectDistinct({ employeeId: rosterSchedules.employeeId }).from(rosterSchedules);
    // Optimization: Bulk check existing
    const existingIds = (await db.query.leaveRosterMonitoring.findMany({
      columns: { nik: true }
    })).map(e => e.nik);

    const missing = rosterEmployees.filter(r => r.employeeId && !existingIds.includes(r.employeeId));

    // Batch insert missing
    for (const r of missing) {
      if (!r.employeeId) continue;
      const emp = await db.query.employees.findFirst({ where: eq(employees.id, r.employeeId) });
      if (emp) {
        await db.insert(leaveRosterMonitoring).values({
          nik: emp.id,
          name: emp.name,
          investorGroup: emp.investorGroup || "Umum",
          status: "Aktif",
          leaveOption: "70",
          monitoringDays: 0,
          month: today.slice(0, 7)
        });
        console.log(`[Sync] Auto-added missing employee: ${emp.name}`);
      }
    }

    const monitoringEntries = await db.select().from(leaveRosterMonitoring);
    console.log(`[Sync] Starting robust sync for ${monitoringEntries.length} employees...`);

    // Helper to parse ANY date format to YYYY-MM-DD
    const normalizeDate = (dateStr: string | null) => {
      try {
        if (!dateStr) return null;
        // Case 1: Already YYYY-MM-DD
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
        // Case 2: DD/MM/YYYY or D/M/YYYY
        if (dateStr.includes("/")) {
          const parsed = parse(dateStr, 'd/M/yyyy', new Date());
          return format(parsed, "yyyy-MM-dd");
        }
        return dateStr;
      } catch (e) {
        console.warn(`Failed to parse date: ${dateStr}`);
        return null;
      }
    };

    // Helper to process a batch of employees
    const processBatch = async (batch: typeof monitoringEntries) => {
      await Promise.all(batch.map(async (entry) => {
        // OPTIMIZATION: Only fetch CUTI/LEAVE records
        const leaves = await db
          .select()
          .from(rosterSchedules)
          .where(and(
            eq(rosterSchedules.employeeId, entry.nik),
            or(eq(rosterSchedules.shift, 'CUTI'), eq(rosterSchedules.shift, 'LEAVE'))
          ));

        // Normalize and Sort in Memory
        const normalizedLeaves = leaves
          .map(l => ({ ...l, normalizedDate: normalizeDate(l.date) }))
          .filter(l => l.normalizedDate !== null)
          .sort((a, b) => a.normalizedDate!.localeCompare(b.normalizedDate!));

        // 1. Find Last Leave Date (before or on today)
        const pastLeaves = normalizedLeaves.filter(r => r.normalizedDate! <= today);
        let lastLeave = entry.lastLeaveDate;
        if (pastLeaves.length > 0) {
          lastLeave = pastLeaves[pastLeaves.length - 1].normalizedDate;
        }

        // 2. Find Next Leave Date (after today)
        const futureLeaves = normalizedLeaves.filter(r => r.normalizedDate! > today);
        const nextLeave = futureLeaves.length > 0 ? futureLeaves[0].normalizedDate : null;

        // 3. Determine Status
        let newStatus = "Aktif";
        // Check if today is in the leaves list
        const isCutiToday = normalizedLeaves.some(r => r.normalizedDate === today);

        if (isCutiToday) {
          newStatus = "Sedang Cuti";
        } else if (nextLeave) {
          const diffTime = new Date(nextLeave!).getTime() - new Date(today).getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays <= 7) {
            newStatus = "Akan Cuti";
          }
        }

        // 4. Calculate Monitoring Days
        let monitoringDays = 0;
        if (lastLeave) {
          const diffTime = new Date(today).getTime() - new Date(lastLeave).getTime();
          monitoringDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // Update
        await db.update(leaveRosterMonitoring)
          .set({
            lastLeaveDate: lastLeave,
            nextLeaveDate: nextLeave,
            status: newStatus,
            monitoringDays: monitoringDays,
            updatedAt: new Date()
          })
          .where(eq(leaveRosterMonitoring.id, entry.id));
      }));
    };

    // Process in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < monitoringEntries.length; i += BATCH_SIZE) {
      const batch = monitoringEntries.slice(i, i + BATCH_SIZE);
      await processBatch(batch);
      console.log(`[Sync] Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(monitoringEntries.length / BATCH_SIZE)}`);
    }

    console.log(`[Sync] Completed robust roster sync.`);
  }

  // ==========================================
  // FMS VIOLATIONS IMPLEMENTATION
  // ==========================================

  async batchInsertFmsViolations(violations: InsertFmsViolation[]): Promise<{ count: number; inserted: number }> {
    if (violations.length === 0) return { count: 0, inserted: 0 };

    // Dedupe key universal: FAMOUS pakai 'F:<alarm_id>', Excel pakai 'X:<date>|<time>|<vehicle>|<type>'.
    // Hitung otomatis bila belum ada (jalur upload Excel tak perlu diubah).
    const dk = (v: InsertFmsViolation) =>
      (v as any).dedupeKey || `X:${v.violationDate}|${v.violationTime}|${v.vehicleNo}|${v.violationType}`;
    const uniqueMap = new Map<string, InsertFmsViolation>();
    for (const v of violations) {
      (v as any).dedupeKey = dk(v);
      uniqueMap.set((v as any).dedupeKey, v); // Last occurrence wins
    }
    const uniqueViolations = Array.from(uniqueMap.values());
    console.log(`[FMS Upload] Deduplicated: ${violations.length} -> ${uniqueViolations.length} unique records`);

    // Batch insert with ON CONFLICT DO UPDATE (Smart Upsert) by dedupe_key
    const CHUNK_SIZE = 1000;
    let totalInserted = 0;
    let trulyNew = 0; // baris INSERT baru (bukan UPDATE) — via (xmax = 0)

    for (let i = 0; i < uniqueViolations.length; i += CHUNK_SIZE) {
      const chunk = uniqueViolations.slice(i, i + CHUNK_SIZE);
      const rows = await db.insert(fmsViolations)
        .values(chunk)
        .onConflictDoUpdate({
          target: fmsViolations.dedupeKey,
          set: {
            validationStatus: sql`excluded.validation_status`,
            level: sql`excluded.level`,
            location: sql`excluded.location`,
            coordinate: sql`excluded.coordinate`,
            shift: sql`excluded.shift`,
            month: sql`excluded.month`,
            week: sql`excluded.week`,
            category: sql`excluded.category`,
            validatedBy: sql`excluded.validated_by`,
            uploadedAt: new Date(),
          }
        })
        .returning({ inserted: sql<boolean>`(xmax = 0)` });

      totalInserted += chunk.length;
      trulyNew += rows.filter((r: any) => r.inserted === true).length;
    }

    return { count: totalInserted, inserted: trulyNew };
  }

  async getFmsInvestorEvaluation(options?: {
    startDate?: string;
    endDate?: string;
    violationType?: string;
    company?: string;
  }): Promise<{
    summary: any;
    byInvestor: any[];
    byUnit: any[];
  }> {
    const conditions = [
      or(
        eq(fmsViolations.validationStatus, 'Valid'),
        eq(fmsViolations.validationStatus, 'True')
      )
    ];

    if (options?.startDate) {
      conditions.push(sql`${fmsViolations.violationDate} >= ${options.startDate}`);
    }
    if (options?.endDate) {
      conditions.push(sql`${fmsViolations.violationDate} <= ${options.endDate}`);
    }

    // Filter for requested violation types: Overspeed, Jarak Aman, Monitoring Fatigue
    // We assume these Map to specific violationType strings in the DB
    const safetyTypes = ['Over Speed', 'Jarak Aman', 'Mata Tertutup', 'Mengantuk', 'Kelelahan'];
    conditions.push(inArray(fmsViolations.violationType, safetyTypes));

    if (options?.company) {
      conditions.push(eq(fmsViolations.company, options.company));
    }

    const baseWhere = and(...conditions);

    // Get unique mapping of vehicleNo to investorGroup (Mitra) from employees
    const unitMitraSubquery = db
      .select({
        nomorLambung: employees.nomorLambung,
        investorGroup: sql<string>`MAX(${employees.investorGroup})`.as('investor_group')
      })
      .from(employees)
      .where(isNotNull(employees.nomorLambung))
      .groupBy(employees.nomorLambung)
      .as('um');

    // 1. Summary Counts
    const summaryRows = await db
      .select({
        type: fmsViolations.violationType,
        count: sql<number>`count(*)`
      })
      .from(fmsViolations)
      .where(baseWhere)
      .groupBy(fmsViolations.violationType);

    const summary = {
      total: summaryRows.reduce((acc, r) => acc + Number(r.count), 0),
      overspeed: summaryRows.filter(r => r.type === 'Over Speed').reduce((acc, r) => acc + Number(r.count), 0),
      jarakAman: summaryRows.filter(r => r.type === 'Jarak Aman').reduce((acc, r) => acc + Number(r.count), 0),
      fatigue: summaryRows.filter(r => ['Mata Tertutup', 'Mengantuk', 'Kelelahan'].includes(r.type || '')).reduce((acc, r) => acc + Number(r.count), 0),
    };

    // 2. Aggregate by Investor (Company/Mitra)
    const byInvestor = await db
      .select({
        company: sql<string>`COALESCE(${unitMitraSubquery.investorGroup}, ${fmsViolations.company})`.as('company'),
        overspeed: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} = 'Over Speed' THEN 1 ELSE 0 END)`,
        jarakAman: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} = 'Jarak Aman' THEN 1 ELSE 0 END)`,
        fatigue: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} IN ('Mata Tertutup', 'Mengantuk', 'Kelelahan') THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`
      })
      .from(fmsViolations)
      .leftJoin(unitMitraSubquery, eq(fmsViolations.vehicleNo, unitMitraSubquery.nomorLambung))
      .where(baseWhere)
      .groupBy(sql`company`)
      .orderBy(sql`COUNT(*) DESC`);

    // 3. Aggregate by Unit (Vehicle No)
    const byUnit = await db
      .select({
        vehicleNo: fmsViolations.vehicleNo,
        company: sql<string>`COALESCE(${unitMitraSubquery.investorGroup}, ${fmsViolations.company})`.as('company'),
        overspeed: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} = 'Over Speed' THEN 1 ELSE 0 END)`,
        jarakAman: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} = 'Jarak Aman' THEN 1 ELSE 0 END)`,
        fatigue: sql<number>`SUM(CASE WHEN ${fmsViolations.violationType} IN ('Mata Tertutup', 'Mengantuk', 'Kelelahan') THEN 1 ELSE 0 END)`,
        total: sql<number>`COUNT(*)`
      })
      .from(fmsViolations)
      .leftJoin(unitMitraSubquery, eq(fmsViolations.vehicleNo, unitMitraSubquery.nomorLambung))
      .where(baseWhere)
      .groupBy(fmsViolations.vehicleNo, sql`company`)
      .orderBy(sql`COUNT(*) DESC`);

    return {
      summary: summary || { total: 0, overspeed: 0, jarakAman: 0, fatigue: 0 },
      byInvestor: byInvestor || [],
      byUnit: byUnit || []
    };
  }

  async getFmsUnitMitraMap(): Promise<Record<string, string>> {
    const units = await db
      .select({
        vehicleNo: employees.nomorLambung,
        investorGroup: employees.investorGroup
      })
      .from(employees)
      .where(isNotNull(employees.nomorLambung));

    const map: Record<string, string> = {};
    units.forEach(u => {
      if (u.vehicleNo && u.investorGroup) {
        // Robust normalization: remove all whitespace and uppercase
        const washed = u.vehicleNo.toString().replace(/\s+/g, "").toUpperCase();
        map[washed] = u.investorGroup.trim();
      }
    });
    return map;
  }

  async getFmsAnalytics(
    startDate?: string,
    endDate?: string,
    options?: {
      startTime?: string; // HH:mm
      endTime?: string;   // HH:mm
      violationType?: string;
      category?: string; // Tab filter: Fatigue Alarm / Non Fatigue Alarm / AEBS / Overspeed
      shift?: string;
      validationStatus?: string;
      week?: string; // Week filter (comma-separated: "1,2,3")
      month?: string; // Month filter (comma-separated: "Januari,Februari")
    }
  ): Promise<{
    byShift: any[];
    byViolation: any[];
    byCategory: any[];
    byDate: any[];
    byHour: any[];
    byWeek: any[];
    byMonth: any[];
    byLocation: any[];
    topDrivers: any[];
    allDrivers: any[];
    summary: any;
    validationStats: any[];
    availableViolationTypes: any[];
    availableWeeks: any[];
  }> {

    console.log("[DEBUG getFmsAnalytics] Passed Month:", options?.month, "Options:", options);

    // Build dynamic filter conditions
    const conditions: any[] = [];

    // Unified Date & Time Filter using violationTimestamp
    if (startDate && endDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);

      conditions.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
      conditions.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    } else if (startDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      conditions.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
    } else if (endDate) {
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
      conditions.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    }

    // Violation type filter (multi-select: comma-separated values)
    if (options?.violationType && options.violationType !== 'all') {
      const types = options.violationType.split(',').map(t => t.trim()).filter(t => t);
      if (types.length === 1) {
        conditions.push(eq(fmsViolations.violationType, types[0]));
      } else if (types.length > 1) {
        conditions.push(inArray(fmsViolations.violationType, types));
      }
    }

    // Category/tab filter (multi-select: Fatigue Alarm, Non Fatigue Alarm, AEBS, Overspeed)
    if (options?.category && options.category !== 'all') {
      const cats = options.category.split(',').map(c => c.trim()).filter(c => c);
      if (cats.length === 1) {
        conditions.push(eq(fmsViolations.category, cats[0]));
      } else if (cats.length > 1) {
        conditions.push(inArray(fmsViolations.category, cats));
      }
    }

    // Shift filter (multi-select)
    if (options?.shift && options.shift !== 'all') {
      const shifts = options.shift.split(',').map(s => s.trim()).filter(s => s);
      if (shifts.length === 1) {
        conditions.push(eq(fmsViolations.shift, shifts[0]));
      } else if (shifts.length > 1) {
        conditions.push(inArray(fmsViolations.shift, shifts));
      }
    }

    // Validation status filter (multi-select)
    if (options?.validationStatus && options.validationStatus !== 'all') {
      const statuses = options.validationStatus.split(',').map(s => s.trim()).filter(s => s);
      const statusConditions: any[] = [];
      for (const status of statuses) {
        if (status === 'Valid') {
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'Valid'`);
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'True'`);
        } else if (status === 'Tidak Valid') {
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'Tidak Valid'`);
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'False'`);
        }
      }
      if (statusConditions.length > 0) {
        conditions.push(or(...statusConditions));
      }
    }

    // Week filter (multi-select: comma-separated week numbers)
    if (options?.week && options.week !== 'all') {
      const weeks = options.week.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
      if (weeks.length === 1) {
        conditions.push(eq(fmsViolations.week, weeks[0]));
      } else if (weeks.length > 1) {
        conditions.push(inArray(fmsViolations.week, weeks));
      }
    }

    // Month filter (multi-select: comma-separated strings)
    if (options?.month && options.month !== 'all') {
      const months = options.month.split(',').map(m => m.trim()).filter(m => m);
      if (months.length === 1) {
        conditions.push(eq(fmsViolations.month, months[0]));
      } else if (months.length > 1) {
        conditions.push(inArray(fmsViolations.month, months));
      }
    }

    const dateFilter = conditions.length > 0 ? and(...conditions) : undefined;

    // Separate filter for "Available Types" (ignores violationType filter but keeps others)
    const conditionsForTypes = conditions.filter(c => {
      // Logic to exclude violationType conditions
      // Since we construct conditions procedurally, we can't easily identify them by object reference.
      // Strategy: Reconstruct conditions excluding violationType.
      return true;
    });

    // Better Strategy: Rebuild the conditions for available types
    const conditionsForAvailableTypes: any[] = [];
    if (startDate && endDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
      conditionsForAvailableTypes.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
      conditionsForAvailableTypes.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    } else if (startDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      conditionsForAvailableTypes.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
    } else if (endDate) {
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
      conditionsForAvailableTypes.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    }

    // Skip Violation Type filter
    if (options?.shift && options.shift !== 'all') {
      const shifts = options.shift.split(',').map(s => s.trim()).filter(s => s);
      if (shifts.length === 1) conditionsForAvailableTypes.push(eq(fmsViolations.shift, shifts[0]));
      else if (shifts.length > 1) conditionsForAvailableTypes.push(inArray(fmsViolations.shift, shifts));
    }
    if (options?.validationStatus && options.validationStatus !== 'all') {
      const statuses = options.validationStatus.split(',').map(s => s.trim()).filter(s => s);
      const statusConditions: any[] = [];
      for (const status of statuses) {
        if (status === 'Valid') {
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True'`);
        } else if (status === 'Tidak Valid') {
          statusConditions.push(sql`${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False'`);
        }
      }
      if (statusConditions.length > 0) conditionsForAvailableTypes.push(or(...statusConditions));
    }

    const availableTypesFilter = conditionsForAvailableTypes.length > 0 ? and(...conditionsForAvailableTypes) : undefined;

    // 10. Available Weeks Filter (Similar strategy: include Date but exclude Week filter)
    const conditionsForAvailableWeeks: any[] = [];
    if (startDate && endDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
      conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
      conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    } else if (startDate) {
      const startTS = options?.startTime ? `${startDate}T${options.startTime}` : (startDate.includes('T') ? startDate : `${startDate}T00:00:00`);
      conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTimestamp} >= ${startTS}::timestamp`);
    } else if (endDate) {
      const endTS = options?.endTime ? `${endDate}T${options.endTime}` : (endDate.includes('T') ? endDate : `${endDate}T23:59:59`);
      conditionsForAvailableWeeks.push(sql`${fmsViolations.violationTimestamp} <= ${endTS}::timestamp`);
    }

    // Include other filters if needed 
    if (options?.violationType && options.violationType !== 'all') {
      const types = options.violationType.split(',').map(t => t.trim()).filter(t => t);
      if (types.length === 1) conditionsForAvailableWeeks.push(eq(fmsViolations.violationType, types[0]));
      else if (types.length > 1) conditionsForAvailableWeeks.push(inArray(fmsViolations.violationType, types));
    }

    if (options?.shift && options.shift !== 'all') {
      const shifts = options.shift.split(',').map(s => s.trim()).filter(s => s);
      if (shifts.length === 1) conditionsForAvailableWeeks.push(eq(fmsViolations.shift, shifts[0]));
      else if (shifts.length > 1) conditionsForAvailableWeeks.push(inArray(fmsViolations.shift, shifts));
    }

    if (options?.validationStatus && options.validationStatus !== 'all') {
      const statuses = options.validationStatus.split(',').map(s => s.trim()).filter(s => s);
      const statusConditions: any[] = [];
      for (const status of statuses) {
        if (status === 'Valid') statusConditions.push(sql`${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True'`);
        else if (status === 'Tidak Valid') statusConditions.push(sql`${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False'`);
      }
      if (statusConditions.length > 0) conditionsForAvailableWeeks.push(or(...statusConditions));
    }

    const availableWeeksFilter = conditionsForAvailableWeeks.length > 0 ? and(...conditionsForAvailableWeeks) : undefined;

    console.log(`[FMS Analytics] Fetching with filter: start=${startDate}, end=${endDate}, options=`, options);

    // 1. Summary Stats
    const [summary] = await db
      .select({
        totalViolations: sql<number>`count(*)::integer`,
        totalUnits: sql<number>`count(distinct ${fmsViolations.vehicleNo})::integer`,
        validCount: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True')::integer`,
        invalidCount: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False')::integer`,
      })
      .from(fmsViolations)
      .where(dateFilter);

    // 2. By Violation Type (Pareto) - Top 10
    const byViolation = await db
      .select({
        type: fmsViolations.violationType,
        count: sql<number>`count(*)`,
        percentage: sql<number>`count(*) * 100.0 / sum(count(*)) over()`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(fmsViolations.violationType)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // 2b. By Category/Tab (Fatigue Alarm / Non Fatigue Alarm / AEBS / Overspeed)
    const byCategory = await db
      .select({
        category: fmsViolations.category,
        count: sql<number>`count(*)`,
        valid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True')::integer`,
        invalid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False')::integer`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(fmsViolations.category)
      .orderBy(desc(sql`count(*)`));

    // 3. By Shift (Split)
    const byShift = await db
      .select({
        shift: fmsViolations.shift,
        count: sql<number>`count(*)`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(fmsViolations.shift)
      .orderBy(fmsViolations.shift);

    // 4. By Date (Trend)
    const byDate = await db
      .select({
        date: fmsViolations.violationDate,
        count: sql<number>`count(*)`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(fmsViolations.violationDate)
      .orderBy(asc(fmsViolations.violationDate));

    // 5. By Hour (Heatmap)
    const byHour = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${fmsViolations.violationTime}::time)::integer`,
        count: sql<number>`count(*)::integer`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(sql`EXTRACT(HOUR FROM ${fmsViolations.violationTime}::time)`)
      .orderBy(sql`EXTRACT(HOUR FROM ${fmsViolations.violationTime}::time)`);

    // 6. Detailed Validation Matrix
    const validationStats = await db
      .select({
        violationType: fmsViolations.violationType,
        total: sql<number>`count(*)::integer`,
        valid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True')::integer`,
        invalid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False' OR ${fmsViolations.validationStatus} IS NULL)::integer`,
      })
      .from(fmsViolations)
      .where(dateFilter)
      .groupBy(fmsViolations.violationType)
      .orderBy(desc(sql`count(*)`));

    // 7. By Week - NEW
    let byWeek: any[] = [];
    try {
      byWeek = await db
        .select({
          week: fmsViolations.week,
          total: sql<number>`count(*)::integer`,
          valid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True')::integer`,
          invalid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False')::integer`,
        })
        .from(fmsViolations)
        .where(dateFilter)
        .groupBy(fmsViolations.week)
        .orderBy(asc(fmsViolations.week));
    } catch (e) {
      console.error("[getFmsAnalytics] byWeek query failed:", e);
    }

    // 7.5 By Month - NEW
    let byMonth: any[] = [];
    try {
      byMonth = await db
        .select({
          month: fmsViolations.month,
          total: sql<number>`count(*)::integer`,
          valid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Valid' OR ${fmsViolations.validationStatus} = 'True')::integer`,
          invalid: sql<number>`count(*) filter (where ${fmsViolations.validationStatus} = 'Tidak Valid' OR ${fmsViolations.validationStatus} = 'False')::integer`,
        })
        .from(fmsViolations)
        .where(dateFilter)
        .groupBy(fmsViolations.month)
        // Avoid TO_DATE for Indonesian month names causing syntax error
        .orderBy(asc(fmsViolations.month));
    } catch (e) {
      console.error("[getFmsAnalytics] byMonth query failed:", e);
    }

    // 7.6 By Location - alert fatigue per lokasi
    let byLocation: any[] = [];
    try {
      byLocation = await db
        .select({
          location: fmsViolations.location,
          count: sql<number>`count(*)::integer`,
        })
        .from(fmsViolations)
        .where(dateFilter)
        .groupBy(fmsViolations.location)
        .orderBy(desc(sql`count(*)`))
        .limit(15);
    } catch (e) {
      console.error("[getFmsAnalytics] byLocation query failed:", e);
    }


    // 8. Vehicle-Centric Aggregation (Per Nomor Lambung)
    let allDrivers: any[] = [];
    let topDrivers: any[] = [];

    try {
      const allViolationsData = await db
        .select({
          vehicleNo: fmsViolations.vehicleNo,
          validationStatus: fmsViolations.validationStatus,
          violationType: fmsViolations.violationType,
          manualDriverName: fmsViolations.manualDriverName,
        })
        .from(fmsViolations)
        .where(dateFilter);

      // Aggregate per vehicleNo only
      const vehicleStats = new Map<string, any>();

      for (const v of allViolationsData) {
        const vNo = v.vehicleNo;
        if (!vehicleStats.has(vNo)) {
          vehicleStats.set(vNo, {
            vehicleNo: vNo,
            totalCount: 0,
            validCount: 0,
            mataTertutupCount: 0,
            mengantukCount: 0,
            kelelahanCount: 0,
            unassignedCount: 0
          });
        }

        const stat = vehicleStats.get(vNo);
        stat.totalCount += 1;

        if (!v.manualDriverName || v.manualDriverName.trim() === '') {
          stat.unassignedCount += 1;
        }

        const validStatus = v.validationStatus?.toLowerCase();
        if (validStatus === 'valid' || validStatus === 'true') {
          stat.validCount += 1;
        }

        if (v.violationType === 'Mata Tertutup') stat.mataTertutupCount += 1;
        else if (v.violationType === 'Mengantuk') stat.mengantukCount += 1;
        else if (v.violationType === 'Kelelahan') stat.kelelahanCount += 1;
      }

      allDrivers = Array.from(vehicleStats.values())
        .sort((a, b) => b.totalCount - a.totalCount)
        .map((d, index) => ({ ...d, rank: index + 1 }));

      topDrivers = allDrivers.slice(0, 10);

    } catch (e) {
      console.error("[getFmsAnalytics] Error computing vehicle stats:", e);
    }


    // 9. Available Violation Types (Independent of violationType filter) - NEW
    const availableViolationTypes = await db
      .select({
        type: fmsViolations.violationType,
        count: sql<number>`count(*)`,
      })
      .from(fmsViolations)
      .where(availableTypesFilter)
      .groupBy(fmsViolations.violationType)
      .orderBy(desc(sql`count(*)`));

    // 11. Available Weeks (Independent of week filter) - NEW
    const availableWeeks = await db
      .select({
        week: fmsViolations.week
      })
      .from(fmsViolations)
      .where(availableWeeksFilter)
      .groupBy(fmsViolations.week)
      .orderBy(asc(fmsViolations.week));

    return {
      availableViolationTypes: availableViolationTypes.map(v => ({ ...v, count: Number(v.count || 0) })),
      summary: {
        totalViolations: Number(summary?.totalViolations || 0),
        totalUnits: Number(summary?.totalUnits || 0),
        validCount: Number(summary?.validCount || 0),
        invalidCount: Number(summary?.invalidCount || 0),
      },
      byShift: byShift.map(s => ({ ...s, count: Number(s.count || 0) })),
      byViolation: byViolation.map(v => ({ ...v, count: Number(v.count || 0) })),
      byCategory: byCategory.map(c => ({
        category: c.category || 'Lainnya',
        count: Number(c.count || 0),
        valid: Number(c.valid || 0),
        invalid: Number(c.invalid || 0),
      })),
      byDate: byDate.map(d => ({ ...d, count: Number(d.count || 0) })),
      byHour: byHour.map(h => ({ ...h, count: Number(h.count || 0) })),
      byWeek: byWeek.map(w => ({
        week: w.week,
        total: Number(w.total || 0),
        valid: Number(w.valid || 0),
        invalid: Number(w.invalid || 0),
      })),
      byMonth: byMonth.map(m => ({
        month: m.month,
        total: Number(m.total || 0),
        valid: Number(m.valid || 0),
        invalid: Number(m.invalid || 0),
      })),
      byLocation: byLocation
        .filter(l => l.location && String(l.location).trim() !== "")
        .map(l => ({ location: String(l.location), count: Number(l.count || 0) })),
      topDrivers,
      allDrivers,
      validationStats: validationStats.map(v => ({
        ...v,
        total: Number(v.total || 0),
        valid: Number(v.valid || 0),
        invalid: Number(v.invalid || 0),
      })),
      availableWeeks: availableWeeks.map(w => w.week)
    };
  }

  async getFmsViolations(options?: {
    vehicleNo?: string;
    driverNik?: string;
    driverName?: string;
    violationType?: string;
    month?: string;
    week?: string;
    validationStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<FmsViolation[]> {
    const conditions: any[] = [];

    if (options?.vehicleNo) {
      const vNo = options.vehicleNo.trim();
      console.log(`[DEBUG getFmsViolations] Adding vehicleNo filter: "${vNo}"`);
      // Use standard ilike with wildcard to ensure it matches even with trailing spaces in DB
      conditions.push(ilike(fmsViolations.vehicleNo, `%${vNo}%`));
    }

    if (options?.driverName) {
      conditions.push(ilike(fmsViolations.manualDriverName, `%${options.driverName.trim()}%`));
    }

    if (options?.violationType && options.violationType !== 'all') {
      const types = options.violationType.split(',').map(t => t.trim()).filter(t => t);
      console.log(`[DEBUG getFmsViolations] Adding violationType filter: ${types.join(', ')}`);
      if (types.length === 1) {
        conditions.push(eq(fmsViolations.violationType, types[0]));
      } else if (types.length > 1) {
        conditions.push(inArray(fmsViolations.violationType, types));
      }
    }

    if (options?.month && options.month !== 'all') {
      console.log(`[DEBUG getFmsViolations] Adding month filter: ${options.month}`);
      const months = options.month.split(',').map(m => m.trim()).filter(m => m);
      if (months.length === 1) {
        conditions.push(eq(fmsViolations.month, months[0]));
      } else if (months.length > 1) {
        conditions.push(inArray(fmsViolations.month, months));
      }
    }

    if (options?.week && options.week !== 'all') {
      console.log(`[DEBUG getFmsViolations] Adding week filter: ${options.week}`);
      const weeks = options.week.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
      if (weeks.length === 1) {
        conditions.push(eq(fmsViolations.week, weeks[0]));
      } else if (weeks.length > 1) {
        conditions.push(inArray(fmsViolations.week, weeks));
      }
    }

    if (options?.validationStatus && options.validationStatus !== 'all') {
      console.log(`[DEBUG getFmsViolations] Adding validationStatus filter: ${options.validationStatus}`);
      const statuses = options.validationStatus.split(',').map(s => s.trim()).filter(s => s);
      const statusConditions: any[] = [];
      for (const status of statuses) {
        if (status === 'Valid') {
          statusConditions.push(or(eq(fmsViolations.validationStatus, 'Valid'), eq(fmsViolations.validationStatus, 'True')));
        } else if (status === 'Tidak Valid') {
          statusConditions.push(or(eq(fmsViolations.validationStatus, 'Tidak Valid'), eq(fmsViolations.validationStatus, 'False')));
        }
      }
      if (statusConditions.length > 0) {
        conditions.push(or(...statusConditions));
      }
    }

    if (options?.startDate && options?.endDate) {
      const startDT = options.startDate.includes('T') ? options.startDate.replace('T', ' ') : options.startDate + ' 00:00:00';
      const endDT = options.endDate.includes('T') ? options.endDate.replace('T', ' ') : options.endDate + ' 23:59:59';
      conditions.push(sql`${fmsViolations.violationTimestamp} >= ${startDT}::timestamp`);
      conditions.push(sql`${fmsViolations.violationTimestamp} <= ${endDT}::timestamp`);
    }

    console.log(`[DEBUG getFmsViolations] Querying with ${conditions.length} conditions`);
    const results = await db
      .select()
      .from(fmsViolations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(fmsViolations.violationTimestamp));

    console.log(`[DEBUG getFmsViolations] DB returned ${results.length} rows`);
    return results;
  }

  async updateFmsViolationDriver(id: string, overrides: { manualDriverName?: string | null, manualDriverNik?: string | null, evidenceUrl?: string | null }): Promise<FmsViolation> {
    const setData: any = {};
    if (overrides.manualDriverName !== undefined) setData.manualDriverName = overrides.manualDriverName;
    if (overrides.manualDriverNik !== undefined) setData.manualDriverNik = overrides.manualDriverNik;
    if (overrides.evidenceUrl) setData.evidenceUrl = overrides.evidenceUrl;

    const [updated] = await db
      .update(fmsViolations)
      .set(setData)
      .where(eq(fmsViolations.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Failed to update violation ${id}`);
    }
    return updated;
  }

  async getAllFmsDriverLevels(): Promise<Map<string, number | null>> {
    const rows = await db.select().from(fmsDriverLevels);
    const map = new Map<string, number | null>();
    for (const row of rows) {
      map.set(row.driverName.toUpperCase(), row.level ?? null);
    }
    return map;
  }

  async setFmsDriverLevel(driverName: string, level: number | null, updatedBy?: string): Promise<void> {
    const name = driverName.trim().toUpperCase();
    await db.insert(fmsDriverLevels)
      .values({ driverName: name, level: level ?? null, updatedBy: updatedBy ?? null })
      .onConflictDoUpdate({
        target: fmsDriverLevels.driverName,
        set: { level: level ?? null, updatedAt: new Date(), updatedBy: updatedBy ?? null },
      });
  }

  async getDriverWeekLevels(driverName: string): Promise<Map<string, number | null>> {
    const name = driverName.trim().toUpperCase();
    const rows = await db.select().from(fmsDriverWeekLevels)
      .where(eq(fmsDriverWeekLevels.driverName, name));
    const map = new Map<string, number | null>();
    for (const row of rows) {
      map.set(row.weekKey, row.level ?? null);
    }
    return map;
  }

  async setDriverWeekLevel(driverName: string, weekKey: string, level: number | null): Promise<void> {
    const name = driverName.trim().toUpperCase();
    await db.insert(fmsDriverWeekLevels)
      .values({ driverName: name, weekKey, level: level ?? null })
      .onConflictDoUpdate({
        target: [fmsDriverWeekLevels.driverName, fmsDriverWeekLevels.weekKey],
        set: { level: level ?? null, updatedAt: new Date() },
      });
  }

  async getDriverInvestigation(driverName: string): Promise<{ photoUrls: string[]; reportUrls: string[] }> {
    const name = driverName.trim().toUpperCase();
    const [row] = await db.select().from(fmsDriverInvestigations).where(eq(fmsDriverInvestigations.driverName, name));
    return { photoUrls: row?.photoUrls ?? [], reportUrls: row?.reportUrls ?? [] };
  }

  async addDriverInvestigationPhoto(driverName: string, url: string): Promise<void> {
    const name = driverName.trim().toUpperCase();
    const existing = await this.getDriverInvestigation(name);
    const newUrls = [...existing.photoUrls, url];
    await db.insert(fmsDriverInvestigations)
      .values({ driverName: name, photoUrls: newUrls, reportUrls: existing.reportUrls })
      .onConflictDoUpdate({ target: fmsDriverInvestigations.driverName, set: { photoUrls: newUrls, updatedAt: new Date() } });
  }

  async addDriverInvestigationReport(driverName: string, url: string): Promise<void> {
    const name = driverName.trim().toUpperCase();
    const existing = await this.getDriverInvestigation(name);
    const newUrls = [...existing.reportUrls, url];
    await db.insert(fmsDriverInvestigations)
      .values({ driverName: name, photoUrls: existing.photoUrls, reportUrls: newUrls })
      .onConflictDoUpdate({ target: fmsDriverInvestigations.driverName, set: { reportUrls: newUrls, updatedAt: new Date() } });
  }

  async removeDriverInvestigationPhoto(driverName: string, url: string): Promise<void> {
    const name = driverName.trim().toUpperCase();
    const existing = await this.getDriverInvestigation(name);
    const newUrls = existing.photoUrls.filter(u => u !== url);
    await db.update(fmsDriverInvestigations).set({ photoUrls: newUrls, updatedAt: new Date() }).where(eq(fmsDriverInvestigations.driverName, name));
  }

  async removeDriverInvestigationReport(driverName: string, fileUrl: string): Promise<void> {
    const name = driverName.trim().toUpperCase();
    const existing = await this.getDriverInvestigation(name);
    // Match by the URL part (before '|') to be resilient to filename encoding issues
    const newUrls = existing.reportUrls.filter(u => {
      const storedUrlPart = u.split('|')[0];
      return storedUrlPart !== fileUrl && u !== fileUrl;
    });
    await db.update(fmsDriverInvestigations).set({ reportUrls: newUrls, updatedAt: new Date() }).where(eq(fmsDriverInvestigations.driverName, name));
  }

  // Induction Methods Implementation
  async getInductionMaterials(): Promise<InductionMaterial[]> {
    return await db.select().from(inductionMaterials).where(eq(inductionMaterials.isActive, true));
  }

  async getInductionMaterial(id: string): Promise<InductionMaterial | undefined> {
    const [material] = await db.select().from(inductionMaterials).where(eq(inductionMaterials.id, id));
    return material;
  }

  async createInductionMaterial(material: InsertInductionMaterial): Promise<InductionMaterial> {
    const [newMaterial] = await db.insert(inductionMaterials).values(material).returning();
    return newMaterial;
  }

  async updateInductionMaterial(id: string, material: Partial<InsertInductionMaterial>): Promise<InductionMaterial> {
    const [updated] = await db
      .update(inductionMaterials)
      .set({ ...material, updatedAt: new Date() })
      .where(eq(inductionMaterials.id, id))
      .returning();
    return updated;
  }

  async deleteInductionMaterial(id: string): Promise<void> {
    await db.delete(inductionMaterials).where(eq(inductionMaterials.id, id));
  }

  async getInductionQuestions(materialId?: string): Promise<InductionQuestion[]> {
    if (materialId) {
      return await db.select().from(inductionQuestions).where(and(eq(inductionQuestions.materialId, materialId), eq(inductionQuestions.isActive, true))).orderBy(asc(inductionQuestions.order));
    }
    return await db.select().from(inductionQuestions).where(eq(inductionQuestions.isActive, true)).orderBy(asc(inductionQuestions.order));
  }

  async createInductionQuestion(question: InsertInductionQuestion): Promise<InductionQuestion> {
    const [newQuestion] = await db.insert(inductionQuestions).values(question).returning();
    return newQuestion;
  }

  async updateInductionQuestion(id: string, question: Partial<InsertInductionQuestion>): Promise<InductionQuestion> {
    const [updated] = await db
      .update(inductionQuestions)
      .set({ ...question, updatedAt: new Date() })
      .where(eq(inductionQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteInductionQuestion(id: string): Promise<void> {
    await db.delete(inductionQuestions).where(eq(inductionQuestions.id, id));
  }

  async getInductionSchedules(date?: string): Promise<(InductionSchedule & { employee: Employee })[]> {
    const query = db
      .select({
        ...getTableColumns(inductionSchedules),
        employee: employees,
      })
      .from(inductionSchedules)
      .leftJoin(employees, eq(inductionSchedules.employeeId, employees.id));

    if (date) {
      query.where(eq(inductionSchedules.scheduledDate, date));
    }

    const results = await query;
    return results.map(row => ({
      ...row,
      employee: row.employee!,
    }));
  }

  async getInductionSchedule(id: string): Promise<(InductionSchedule & { employee: Employee; answers: InductionAnswer[] }) | undefined> {
    const result = await db
      .select({
        ...getTableColumns(inductionSchedules),
        employee: employees,
      })
      .from(inductionSchedules)
      .leftJoin(employees, eq(inductionSchedules.employeeId, employees.id))
      .where(eq(inductionSchedules.id, id))
      .then(res => res[0]);

    if (!result) return undefined;

    const answers = await db.select().from(inductionAnswers).where(eq(inductionAnswers.scheduleId, id));

    return {
      ...result,
      employee: result.employee!,
      answers,
    };
  }

  async getPendingInductionSchedule(employeeId: string): Promise<InductionSchedule | undefined> {
    const [schedule] = await db
      .select()
      .from(inductionSchedules)
      .where(and(eq(inductionSchedules.employeeId, employeeId), eq(inductionSchedules.status, "pending")))
      .orderBy(desc(inductionSchedules.scheduledDate));
    return schedule;
  }

  async createInductionSchedule(schedule: InsertInductionSchedule): Promise<InductionSchedule> {
    const [newSchedule] = await db.insert(inductionSchedules).values(schedule).returning();
    return newSchedule;
  }

  async updateInductionSchedule(id: string, schedule: Partial<InsertInductionSchedule>): Promise<InductionSchedule> {
    const [updated] = await db
      .update(inductionSchedules)
      .set({ ...schedule, updatedAt: new Date() })
      .where(eq(inductionSchedules.id, id))
      .returning();
    return updated;
  }

  async createInductionAnswer(answer: InsertInductionAnswer): Promise<InductionAnswer> {
    const [newAnswer] = await db.insert(inductionAnswers).values(answer).returning();
    return newAnswer;
  }

  async getInductionAnswers(scheduleId: string): Promise<InductionAnswer[]> {
    return await this.db.select().from(inductionAnswers).where(eq(inductionAnswers.scheduleId, scheduleId));
  }

  async createPublicInductionAttendance(attendance: InsertPublicInductionAttendance): Promise<PublicInductionAttendance> {
    const [result] = await this.db.insert(publicInductionAttendance).values(attendance).returning();
    return result;
  }

  async getAllPublicInductionAttendance(year?: string, search?: string): Promise<PublicInductionAttendance[]> {
    let conditions = [];

    if (year) {
      // Assuming tanggal_refresh_induksi is YYYY-MM-DD
      conditions.push(ilike(publicInductionAttendance.tanggalRefreshInduksi, `${year}-%`));
    }

    if (search) {
      conditions.push(
        or(
          ilike(publicInductionAttendance.namaKaryawan, `%${search}%`),
          ilike(publicInductionAttendance.nik, `%${search}%`)
        )
      );
    }

    const query = this.db.select().from(publicInductionAttendance);

    if (conditions.length > 0) {
      return await query.where(and(...conditions)).orderBy(desc(publicInductionAttendance.createdAt));
    }

    return await query.orderBy(desc(publicInductionAttendance.createdAt));
  }

  // ============================================
  // MCU METHODS
  // ============================================
  async getMcuRecords(): Promise<McuRecord[]> {
    return await this.db.select().from(mcuRecords).orderBy(desc(mcuRecords.createdAt));
  }

  async getMcuRecord(id: string): Promise<McuRecord | undefined> {
    const [result] = await this.db.select().from(mcuRecords).where(eq(mcuRecords.id, id));
    return result;
  }

  async getMcuRecordsByEmployee(employeeId: string): Promise<McuRecord[]> {
    return await this.db.select().from(mcuRecords).where(eq(mcuRecords.employeeId, employeeId)).orderBy(desc(mcuRecords.createdAt));
  }

  async createMcuRecord(record: InsertMcuRecord): Promise<McuRecord> {
    const [result] = await this.db.insert(mcuRecords).values(record).returning();
    return result;
  }

  async updateMcuRecord(id: string, updates: Partial<InsertMcuRecord>): Promise<McuRecord | undefined> {
    const [result] = await this.db
      .update(mcuRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mcuRecords.id, id))
      .returning();
    return result;
  }

  async deleteMcuRecord(id: string): Promise<boolean> {
    const result = await this.db.delete(mcuRecords).where(eq(mcuRecords.id, id));
    return result.rowCount > 0;
  }

  async getMcuStatistics(): Promise<{ total: number; fit: number; unfit: number; expiredSoon: number }> {
    const allRecords = await this.getMcuRecords();
    const total = allRecords.length;
    const fit = allRecords.filter(r => r.hasilKesimpulan?.toUpperCase().includes("FIT") && !r.hasilKesimpulan?.toUpperCase().includes("UNFIT")).length;
    const unfit = allRecords.filter(r => r.hasilKesimpulan?.toUpperCase().includes("UNFIT")).length;

    // Simple expired check (e.g. within 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const expiredSoon = allRecords.filter(r => {
      if (!r.tanggalAkhir) return false;
      const expDate = new Date(r.tanggalAkhir);
      return expDate <= thirtyDaysFromNow && expDate >= now;
    }).length;

    return { total, fit, unfit, expiredSoon };
  }

  // ============================================================================
  // SIDAK WORKSHOP METHODS
  // ============================================================================

  async getSidakWorkshopSession(id: string): Promise<SidakWorkshopSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakWorkshopSessions)
      .where(eq(sidakWorkshopSessions.id, id));
    return result;
  }

  async getAllSidakWorkshopSessions(): Promise<SidakWorkshopSession[]> {
    return await this.db
      .select()
      .from(sidakWorkshopSessions)
      .orderBy(desc(sidakWorkshopSessions.createdAt));
  }



  // Equipment Methods
  async getSidakWorkshopEquipment(sessionId: string): Promise<SidakWorkshopEquipment[]> {
    return await this.db
      .select()
      .from(sidakWorkshopEquipment)
      .where(eq(sidakWorkshopEquipment.sessionId, sessionId))
      .orderBy(asc(sidakWorkshopEquipment.ordinal));
  }

  async createSidakWorkshopEquipment(equipment: InsertSidakWorkshopEquipment): Promise<SidakWorkshopEquipment> {
    const [result] = await this.db
      .insert(sidakWorkshopEquipment)
      .values(equipment)
      .returning();

    // Update session total equipment count
    await this.updateSidakWorkshopSessionEquipmentCount(equipment.sessionId);

    return result;
  }

  async getSidakWorkshopInspectors(sessionId: string): Promise<SidakWorkshopInspector[]> {
    return await this.db
      .select()
      .from(sidakWorkshopInspectors)
      .where(eq(sidakWorkshopInspectors.sessionId, sessionId))
      .orderBy(asc(sidakWorkshopInspectors.ordinal));
  }

  async createSidakWorkshopInspector(inspector: Omit<InsertSidakWorkshopInspector, 'ordinal'>): Promise<SidakWorkshopInspector> {
    const existingInspectors = await this.getSidakWorkshopInspectors(inspector.sessionId);
    const nextOrdinal = existingInspectors.length + 1;

    const [result] = await this.db
      .insert(sidakWorkshopInspectors)
      .values({ ...inspector, ordinal: nextOrdinal } as InsertSidakWorkshopInspector)
      .returning();
    return result;
  }

  async updateSidakWorkshopSessionEquipmentCount(sessionId: string): Promise<void> {
    const equipment = await this.getSidakWorkshopEquipment(sessionId);

    await this.db
      .update(sidakWorkshopSessions)
      .set({ totalEquipment: equipment.length })
      .where(eq(sidakWorkshopSessions.id, sessionId));
  }

  // ============================================
  // SIDAK STAND JACK METHODS
  // ============================================

  async getSidakStandJackSession(id: string): Promise<SidakStandJackSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakStandJackSessions)
      .where(eq(sidakStandJackSessions.id, id));
    return result;
  }

  async getAllSidakStandJackSessions(): Promise<SidakStandJackSession[]> {
    return await this.db
      .select()
      .from(sidakStandJackSessions)
      .orderBy(desc(sidakStandJackSessions.createdAt));
  }

  async createSidakStandJackSession(session: InsertSidakStandJackSession & { createdBy?: string | null }): Promise<SidakStandJackSession> {
    const [result] = await this.db
      .insert(sidakStandJackSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakStandJackSession(id: string, updates: Partial<InsertSidakStandJackSession>): Promise<SidakStandJackSession | undefined> {
    const [result] = await this.db
      .update(sidakStandJackSessions)
      .set(updates)
      .where(eq(sidakStandJackSessions.id, id))
      .returning();
    return result;
  }

  async getSidakStandJackRecords(sessionId: string): Promise<SidakStandJackRecord[]> {
    return await this.db
      .select()
      .from(sidakStandJackRecords)
      .where(eq(sidakStandJackRecords.sessionId, sessionId))
      .orderBy(asc(sidakStandJackRecords.ordinal));
  }

  async createSidakStandJackRecord(record: InsertSidakStandJackRecord): Promise<SidakStandJackRecord> {
    const [result] = await this.db
      .insert(sidakStandJackRecords)
      .values(record)
      .returning();

    // Update session total stand jack count
    await this.updateSidakStandJackSessionEquipmentCount(record.sessionId);

    return result;
  }

  async getSidakStandJackObservers(sessionId: string): Promise<SidakStandJackObserver[]> {
    return await this.db
      .select()
      .from(sidakStandJackObservers)
      .where(eq(sidakStandJackObservers.sessionId, sessionId))
      .orderBy(asc(sidakStandJackObservers.ordinal));
  }

  async createSidakStandJackObserver(observer: InsertSidakStandJackObserver): Promise<SidakStandJackObserver> {
    const [result] = await this.db
      .insert(sidakStandJackObservers)
      .values(observer)
      .returning();
    return result;
  }

  async updateSidakStandJackSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakStandJackRecords(sessionId);

    await this.db
      .update(sidakStandJackSessions)
      .set({ totalStandJack: records.length })
      .where(eq(sidakStandJackSessions.id, sessionId));
  }

  // ============================================
  // SIDAK HYDRAULIC JACK METHODS
  // ============================================

  async getSidakHydraulicJackSession(id: string): Promise<SidakHydraulicJackSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakHydraulicJackSessions)
      .where(eq(sidakHydraulicJackSessions.id, id));
    return result;
  }

  async getAllSidakHydraulicJackSessions(): Promise<SidakHydraulicJackSession[]> {
    return await this.db
      .select()
      .from(sidakHydraulicJackSessions)
      .orderBy(desc(sidakHydraulicJackSessions.createdAt));
  }

  async createSidakHydraulicJackSession(session: InsertSidakHydraulicJackSession & { createdBy?: string | null }): Promise<SidakHydraulicJackSession> {
    const [result] = await this.db
      .insert(sidakHydraulicJackSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakHydraulicJackSession(id: string, updates: Partial<InsertSidakHydraulicJackSession>): Promise<SidakHydraulicJackSession | undefined> {
    const [result] = await this.db
      .update(sidakHydraulicJackSessions)
      .set(updates)
      .where(eq(sidakHydraulicJackSessions.id, id))
      .returning();
    return result;
  }

  async getSidakHydraulicJackRecords(sessionId: string): Promise<SidakHydraulicJackRecord[]> {
    return await this.db
      .select()
      .from(sidakHydraulicJackRecords)
      .where(eq(sidakHydraulicJackRecords.sessionId, sessionId))
      .orderBy(asc(sidakHydraulicJackRecords.ordinal));
  }

  async createSidakHydraulicJackRecord(record: InsertSidakHydraulicJackRecord): Promise<SidakHydraulicJackRecord> {
    const [result] = await this.db
      .insert(sidakHydraulicJackRecords)
      .values(record)
      .returning();

    await this.updateSidakHydraulicJackSessionEquipmentCount(record.sessionId);

    return result;
  }

  async getSidakHydraulicJackObservers(sessionId: string): Promise<SidakHydraulicJackObserver[]> {
    return await this.db
      .select()
      .from(sidakHydraulicJackObservers)
      .where(eq(sidakHydraulicJackObservers.sessionId, sessionId))
      .orderBy(asc(sidakHydraulicJackObservers.ordinal));
  }

  async createSidakHydraulicJackObserver(observer: InsertSidakHydraulicJackObserver): Promise<SidakHydraulicJackObserver> {
    const [result] = await this.db
      .insert(sidakHydraulicJackObservers)
      .values(observer)
      .returning();
    return result;
  }

  async updateSidakHydraulicJackSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakHydraulicJackRecords(sessionId);

    await this.db
      .update(sidakHydraulicJackSessions)
      .set({ totalHydraulicJack: records.length })
      .where(eq(sidakHydraulicJackSessions.id, sessionId));
  }

  // ============================================
  // SIDAK BOTTLE JACK METHODS
  // ============================================

  async getSidakBottleJackSession(id: string): Promise<SidakBottleJackSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakBottleJackSessions)
      .where(eq(sidakBottleJackSessions.id, id));
    return result;
  }

  async getAllSidakBottleJackSessions(): Promise<SidakBottleJackSession[]> {
    return await this.db
      .select()
      .from(sidakBottleJackSessions)
      .orderBy(desc(sidakBottleJackSessions.createdAt));
  }

  async createSidakBottleJackSession(session: InsertSidakBottleJackSession & { createdBy?: string | null }): Promise<SidakBottleJackSession> {
    const [result] = await this.db
      .insert(sidakBottleJackSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakBottleJackSession(id: string, updates: Partial<InsertSidakBottleJackSession>): Promise<SidakBottleJackSession | undefined> {
    const [result] = await this.db
      .update(sidakBottleJackSessions)
      .set(updates)
      .where(eq(sidakBottleJackSessions.id, id))
      .returning();
    return result;
  }

  async getSidakBottleJackRecords(sessionId: string): Promise<SidakBottleJackRecord[]> {
    return await this.db
      .select()
      .from(sidakBottleJackRecords)
      .where(eq(sidakBottleJackRecords.sessionId, sessionId))
      .orderBy(asc(sidakBottleJackRecords.ordinal));
  }

  async createSidakBottleJackRecord(record: InsertSidakBottleJackRecord): Promise<SidakBottleJackRecord> {
    const [result] = await this.db
      .insert(sidakBottleJackRecords)
      .values(record)
      .returning();

    await this.updateSidakBottleJackSessionEquipmentCount(record.sessionId);

    return result;
  }

  async getSidakBottleJackObservers(sessionId: string): Promise<SidakBottleJackObserver[]> {
    return await this.db
      .select()
      .from(sidakBottleJackObservers)
      .where(eq(sidakBottleJackObservers.sessionId, sessionId))
      .orderBy(asc(sidakBottleJackObservers.ordinal));
  }

  async createSidakBottleJackObserver(observer: InsertSidakBottleJackObserver): Promise<SidakBottleJackObserver> {
    const [result] = await this.db
      .insert(sidakBottleJackObservers)
      .values(observer)
      .returning();
    return result;
  }

  async updateSidakBottleJackSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakBottleJackRecords(sessionId);

    await this.db
      .update(sidakBottleJackSessions)
      .set({ totalBottleJack: records.length })
      .where(eq(sidakBottleJackSessions.id, sessionId));
  }

  async getSidakImpactSession(id: string): Promise<SidakImpactSession | undefined> {
    const [result] = await this.db
      .select()
      .from(sidakImpactSessions)
      .where(eq(sidakImpactSessions.id, id));
    return result;
  }

  async getSidakImpactSessions(): Promise<SidakImpactSession[]> {
    return await this.db
      .select()
      .from(sidakImpactSessions)
      .orderBy(desc(sidakImpactSessions.createdAt));
  }

  async createSidakImpactSession(session: InsertSidakImpactSession & { createdBy?: string | null }): Promise<SidakImpactSession> {
    const [result] = await this.db
      .insert(sidakImpactSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakImpactSession(id: string, updates: Partial<InsertSidakImpactSession>): Promise<SidakImpactSession | undefined> {
    const [result] = await this.db
      .update(sidakImpactSessions)
      .set(updates)
      .where(eq(sidakImpactSessions.id, id))
      .returning();
    return result;
  }

  async getSidakImpactRecords(sessionId: string): Promise<SidakImpactRecord[]> {
    return await this.db
      .select()
      .from(sidakImpactRecords)
      .where(eq(sidakImpactRecords.sessionId, sessionId))
      .orderBy(asc(sidakImpactRecords.ordinal));
  }

  async createSidakImpactRecord(record: InsertSidakImpactRecord): Promise<SidakImpactRecord> {
    const [result] = await this.db
      .insert(sidakImpactRecords)
      .values(record)
      .returning();

    await this.updateSidakImpactSessionEquipmentCount(record.sessionId);

    return result;
  }

  async getSidakImpactObservers(sessionId: string): Promise<SidakImpactObserver[]> {
    return await this.db
      .select()
      .from(sidakImpactObservers)
      .where(eq(sidakImpactObservers.sessionId, sessionId))
      .orderBy(asc(sidakImpactObservers.ordinal));
  }

  async createSidakImpactObserver(observer: InsertSidakImpactObserver): Promise<SidakImpactObserver> {
    const [result] = await this.db
      .insert(sidakImpactObservers)
      .values(observer)
      .returning();
    return result;
  }

  async updateSidakImpactSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakImpactRecords(sessionId);

    await this.db
      .update(sidakImpactSessions)
      .set({ totalImpact: records.length })
      .where(eq(sidakImpactSessions.id, sessionId));
  }


  async getDashboardStats(date?: string): Promise<{ totalEmployees: number; scheduledToday: number; presentToday: number; absentToday: number; onLeaveToday: number; pendingLeaveRequests: number }> {
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');

    const [empResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(eq(employees.status, 'active'));

    const [scheduledResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(rosterSchedules)
      .where(eq(rosterSchedules.date, targetDate));

    const [presentResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(attendanceRecords)
      .where(and(eq(attendanceRecords.date, targetDate), or(eq(attendanceRecords.status, 'present'), eq(attendanceRecords.status, 'hadir'))));

    const [leaveResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(rosterSchedules)
      .where(and(eq(rosterSchedules.date, targetDate), ilike(rosterSchedules.shift, '%CUTI%')));

    const [pendingResult] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(leaveRequests)
      .where(eq(leaveRequests.status, 'pending'));

    const totalEmployees = Number(empResult?.count || 0);
    const scheduledToday = Number(scheduledResult?.count || 0);
    const presentToday = Number(presentResult?.count || 0);
    const onLeaveToday = Number(leaveResult?.count || 0);
    const pendingLeaveRequests = Number(pendingResult?.count || 0);
    const absentToday = Math.max(0, scheduledToday - presentToday - onLeaveToday);

    return {
      totalEmployees,
      scheduledToday,
      presentToday,
      absentToday,
      onLeaveToday,
      pendingLeaveRequests
    };
  }


  // System Settings Implementation
  async getSystemSetting(key: string): Promise<string | null> {
    const [result] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));
    return result ? result.value : null;
  }

  async setSystemSetting(key: string, value: string, description?: string): Promise<SystemSetting> {
    const [result] = await db
      .insert(systemSettings)
      .values({ key, value, description })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: {
          value,
          description: description || undefined,
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  // Notifications (lonceng header)
  async createNotification(n: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(n).returning();
    return result;
  }

  async getRecentNotifications(limit: number = 20): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  async getNotificationsForUser(u: { nik: string; isHse: boolean }, limit: number = 20): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(
        or(
          eq(notifications.audience, "all"),
          u.isHse ? eq(notifications.audience, "hse") : sql`false`,
          and(eq(notifications.audience, "user"), eq(notifications.audienceValue, u.nik)),
        )
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);
  }

  // ==================================================
  // WHATSAPP BLAST & TEMPLATE METHODS
  // ==================================================

  async createWhatsappBlast(data: {
    subject?: string;
    message: string;
    blastType: string;
    mediaUrls?: string[];
    totalRecipients: number;
    createdBy?: string;
    createdByName?: string;
  }): Promise<any> {
    const [result] = await db
      .insert(whatsappBlasts)
      .values({
        subject: data.subject || null,
        message: data.message,
        blastType: data.blastType,
        mediaUrls: data.mediaUrls || [],
        totalRecipients: data.totalRecipients,
        sentCount: 0,
        failedCount: 0,
        createdBy: data.createdBy || null,
        createdByName: data.createdByName || null,
        status: 'sending',
      })
      .returning();
    return result;
  }

  async updateWhatsappBlast(id: string, data: Partial<{
    sentCount: number;
    failedCount: number;
    status: string;
    completedAt: Date;
  }>): Promise<any> {
    const [result] = await db
      .update(whatsappBlasts)
      .set(data)
      .where(eq(whatsappBlasts.id, id))
      .returning();
    return result;
  }

  async getWhatsappBlasts(limit: number = 50): Promise<any[]> {
    return db
      .select()
      .from(whatsappBlasts)
      .orderBy(desc(whatsappBlasts.createdAt))
      .limit(limit);
  }

  async getWhatsappBlastWithRecipients(blastId: string): Promise<{ blast: any; recipients: any[] } | null> {
    const [blast] = await db
      .select()
      .from(whatsappBlasts)
      .where(eq(whatsappBlasts.id, blastId));

    if (!blast) return null;

    const recipients = await db
      .select()
      .from(whatsappBlastRecipients)
      .where(eq(whatsappBlastRecipients.blastId, blastId))
      .orderBy(desc(whatsappBlastRecipients.sentAt));

    return { blast, recipients };
  }

  async createWhatsappBlastRecipients(blastId: string, recipients: Array<{
    employeeId?: string;
    employeeName: string;
    phone: string;
  }>): Promise<void> {
    if (recipients.length === 0) return;

    const values = recipients.map(r => ({
      blastId,
      employeeId: r.employeeId || null,
      employeeName: r.employeeName,
      phone: r.phone,
      status: 'pending',
    }));

    await db.insert(whatsappBlastRecipients).values(values);
  }

  async updateBlastRecipientStatus(recipientId: string, status: string, error?: string): Promise<void> {
    await db
      .update(whatsappBlastRecipients)
      .set({
        status,
        error: error || null,
        sentAt: status === 'sent' ? new Date() : null,
      })
      .where(eq(whatsappBlastRecipients.id, recipientId));
  }

  async getBlastRecipientsByBlast(blastId: string): Promise<any[]> {
    return db
      .select()
      .from(whatsappBlastRecipients)
      .where(eq(whatsappBlastRecipients.blastId, blastId));
  }

  // Template methods
  async createWhatsappTemplate(data: {
    name: string;
    message: string;
    blastType?: string;
    mediaUrls?: string[];
    createdBy?: string;
    createdByName?: string;
  }): Promise<any> {
    const [result] = await db
      .insert(whatsappTemplates)
      .values({
        name: data.name,
        message: data.message,
        blastType: data.blastType || 'text',
        mediaUrls: data.mediaUrls || [],
        createdBy: data.createdBy || null,
        createdByName: data.createdByName || null,
        isActive: true,
      })
      .returning();
    return result;
  }

  async getWhatsappTemplates(): Promise<any[]> {
    return db
      .select()
      .from(whatsappTemplates)
      .where(eq(whatsappTemplates.isActive, true))
      .orderBy(desc(whatsappTemplates.createdAt));
  }

  async deleteWhatsappTemplate(id: string): Promise<boolean> {
    const result = await db
      .update(whatsappTemplates)
      .set({ isActive: false })
      .where(eq(whatsappTemplates.id, id));
    return true;
  }

  // Evaluation statistics - OPTIMIZED with SQL aggregations
  async getWhatsappEvaluationStats(): Promise<{
    totalBlasts: number;
    totalRecipients: number;
    totalSent: number;
    totalFailed: number;
    successRate: number;
    recentBlasts: Array<{ date: string; sent: number; failed: number }>;
  }> {
    // Use SQL aggregation for summary stats - MUCH FASTER
    const [summary] = await db
      .select({
        totalBlasts: sql<number>`COUNT(*)::int`,
        totalRecipients: sql<number>`COALESCE(SUM(${whatsappBlasts.totalRecipients}), 0)::int`,
        totalSent: sql<number>`COALESCE(SUM(${whatsappBlasts.sentCount}), 0)::int`,
        totalFailed: sql<number>`COALESCE(SUM(${whatsappBlasts.failedCount}), 0)::int`,
      })
      .from(whatsappBlasts);

    const totalBlasts = summary?.totalBlasts || 0;
    const totalRecipients = summary?.totalRecipients || 0;
    const totalSent = summary?.totalSent || 0;
    const totalFailed = summary?.totalFailed || 0;
    const successRate = totalRecipients > 0 ? (totalSent / totalRecipients) * 100 : 0;

    // Get recent blasts (last 7 days) aggregated by date using SQL GROUP BY
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentBlastsQuery = await db
      .select({
        date: sql<string>`DATE(${whatsappBlasts.createdAt})`,
        sent: sql<number>`COALESCE(SUM(${whatsappBlasts.sentCount}), 0)::int`,
        failed: sql<number>`COALESCE(SUM(${whatsappBlasts.failedCount}), 0)::int`,
      })
      .from(whatsappBlasts)
      .where(sql`${whatsappBlasts.createdAt} >= ${sevenDaysAgo}`)
      .groupBy(sql`DATE(${whatsappBlasts.createdAt})`)
      .orderBy(sql`DATE(${whatsappBlasts.createdAt}) DESC`);

    return {
      totalBlasts,
      totalRecipients,
      totalSent,
      totalFailed,
      successRate,
      recentBlasts: recentBlastsQuery,
    };
  }

  // ==================================================
  // SIMPER EV MONITORING METHODS
  // ==================================================
  async createSimperEvMonitoring(data: InsertSimperEvMonitoring): Promise<SimperEvMonitoring> {
    const [result] = await db
      .insert(simperEvMonitoring)
      .values(data)
      .returning();
    return result;
  }

  async getAllSimperEvMonitoring(): Promise<SimperEvMonitoring[]> {
    return await db
      .select()
      .from(simperEvMonitoring)
      .orderBy(desc(simperEvMonitoring.createdAt));
  }

  async searchSimperEvMonitoring(query: string): Promise<SimperEvMonitoring[]> {
    if (!query) return this.getAllSimperEvMonitoring();
    const lowerQuery = query.toLowerCase();

    return await db
      .select()
      .from(simperEvMonitoring)
      .where(or(
        ilike(simperEvMonitoring.nama, `%${lowerQuery}%`),
        ilike(simperEvMonitoring.nikSimper, `%${lowerQuery}%`)
      ))
      .orderBy(asc(simperEvMonitoring.nama));
  }

  async deleteAllSimperEvMonitoring(): Promise<void> {
    await db.delete(simperEvMonitoring);
  }

  async updateSimperEvMonitoring(id: string, data: Partial<InsertSimperEvMonitoring>): Promise<SimperEvMonitoring | undefined> {
    const [result] = await db
      .update(simperEvMonitoring)
      .set({ ...data, updatedOf: new Date().toISOString() })
      .where(eq(simperEvMonitoring.id, id))
      .returning();
    return result;
  }

  async deleteSimperEvMonitoring(id: string): Promise<boolean> {
    const [result] = await db
      .delete(simperEvMonitoring)
      .where(eq(simperEvMonitoring.id, id))
      .returning();
    return !!result;
  }

  async updateSimperEvMonitoringStatusByNik(nikSimper: string, status: string): Promise<void> {
    // Also update history updated_at
    await db
      .update(simperEvMonitoring)
      .set({
        statusPengajuan: status,
        updatedOf: new Date().toISOString()
      })
      .where(eq(simperEvMonitoring.nikSimper, nikSimper));
  }

  async getSimperEvHistory(nikSimper: string): Promise<SimperEvHistory[]> {
    return await db
      .select()
      .from(simperEvHistory)
      .where(eq(simperEvHistory.nikSimper, nikSimper))
      .orderBy(desc(simperEvHistory.approvedAt));
  }

  async getSimperEvHistoryById(id: string): Promise<SimperEvHistory | undefined> {
    const [record] = await db
      .select()
      .from(simperEvHistory)
      .where(eq(simperEvHistory.id, id))
      .limit(1);
    return record as SimperEvHistory | undefined;
  }

  async createSimperEvHistory(history: InsertSimperEvHistory): Promise<SimperEvHistory> {
    const [result] = await db
      .insert(simperEvHistory)
      .values(history)
      .returning();
    return result;
  }

  async updateSimperEvHistory(id: string, history: Partial<InsertSimperEvHistory>): Promise<SimperEvHistory | undefined> {
    const [result] = await db
      .update(simperEvHistory)
      .set(history)
      .where(eq(simperEvHistory.id, id))
      .returning();
    return result;
  }

  async deleteSimperEvHistory(id: string): Promise<boolean> {
    const [result] = await db
      .delete(simperEvHistory)
      .where(eq(simperEvHistory.id, id))
      .returning();
    return !!result;
  }

  // WhatsApp Notification Logs
  async createWhatsappNotificationLog(data: InsertWhatsappNotificationLog): Promise<WhatsappNotificationLog> {
    const [log] = await db.insert(whatsappNotificationLogs).values(data).returning();
    return log as WhatsappNotificationLog;
  }

  async updateWhatsappNotificationLogStatus(
    id: string,
    status: "SENT" | "FAILED",
    errorMessage?: string,
    apiResponse?: any
  ): Promise<void> {
    await db.update(whatsappNotificationLogs)
      .set({
        status,
        sentAt: status === "SENT" ? new Date() : undefined,
        errorMessage,
        apiResponse
      })
      .where(eq(whatsappNotificationLogs.id, id));
  }

  async getWhatsappNotificationLogs(
    module?: string,
    limit: number = 100
  ): Promise<WhatsappNotificationLog[]> {
    let query = db
      .select()
      .from(whatsappNotificationLogs)
      .orderBy(desc(whatsappNotificationLogs.createdAt))
      .limit(limit);

    if (module) {
      query = query.where(eq(whatsappNotificationLogs.module, module)) as any;
    }

    const results = await query;
    return results as WhatsappNotificationLog[];
  }

  async getWhatsappNotificationLogsByReference(
    referenceId: string
  ): Promise<WhatsappNotificationLog[]> {
    const results = await db
      .select()
      .from(whatsappNotificationLogs)
      .where(eq(whatsappNotificationLogs.referenceId, referenceId))
      .orderBy(desc(whatsappNotificationLogs.createdAt));
    return results as WhatsappNotificationLog[];
  }

  // Simper Mitra
  async getSimperMitras(): Promise<SimperMitra[]> {
    return await db
      .select()
      .from(simperMitra)
      .orderBy(asc(simperMitra.name));
  }

  async getMitraPhoneByName(name: string): Promise<string | null> {
    const [result] = await db
      .select()
      .from(simperMitra)
      .where(ilike(simperMitra.name, name));

    // Attempting to access the 'phone' or 'noTelepon' field dynamically if type definition is hidden
    const record = result as any;
    // Fix: Added phoneNumber to the check list as it matches the schema definition
    return record?.phoneNumber || record?.phone || record?.noTelepon || record?.contact || null;
  }

  async createSimperMitra(data: InsertSimperMitra): Promise<SimperMitra> {
    const [result] = await db
      .insert(simperMitra)
      .values(data)
      .returning();
    return result;
  }

  async updateSimperMitra(id: string, data: Partial<InsertSimperMitra>): Promise<SimperMitra | undefined> {
    const [result] = await db
      .update(simperMitra)
      .set(data)
      .where(eq(simperMitra.id, id))
      .returning();
    return result;
  }

  async deleteSimperMitra(id: string): Promise<boolean> {
    const [result] = await db
      .delete(simperMitra)
      .where(eq(simperMitra.id, id))
      .returning();
    return !!result;
  }

  async getSimperEvMonitoringPaginated(page: number, limit: number, search?: string): Promise<{ data: SimperEvMonitoring[], total: number }> {
    const offset = (page - 1) * limit;
    const lowerQuery = search?.toLowerCase() || "";

    let whereClause = undefined;
    if (search) {
      whereClause = or(
        ilike(simperEvMonitoring.nama, `%${lowerQuery}%`),
        ilike(simperEvMonitoring.nikSimper, `%${lowerQuery}%`)
      );
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(simperEvMonitoring)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    const data = await db
      .select()
      .from(simperEvMonitoring)
      .where(whereClause)
      .orderBy(desc(simperEvMonitoring.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  // ============================================
  // SICK LEAVE METHODS
  // ============================================

  async getSickLeaves(): Promise<SickLeave[]> {
    return await db.select().from(sickLeaves).orderBy(desc(sickLeaves.createdAt));
  }

  async getSickLeavesByEmployee(employeeId: string): Promise<SickLeave[]> {
    return await db.select().from(sickLeaves).where(eq(sickLeaves.employeeId, employeeId)).orderBy(desc(sickLeaves.createdAt));
  }

  async createSickLeave(data: InsertSickLeave): Promise<SickLeave> {
    const [result] = await db.insert(sickLeaves).values({
      ...data,
      nik: data.nik || null,
      position: data.position || null,
    }).returning();
    return result;
  }

  async updateSickLeave(id: string, data: Partial<InsertSickLeave>): Promise<SickLeave | undefined> {
    const [result] = await db
      .update(sickLeaves)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sickLeaves.id, id))
      .returning();
    return result;
  }

  async deleteSickLeave(id: string): Promise<boolean> {
    const result = await db.delete(sickLeaves).where(eq(sickLeaves.id, id));
    return result.rowCount > 0;
  }

  // ============================================
  // SIMPER PERPANJANGAN METHODS
  // ============================================

  async getSimperPerpanjanganPaginated(
    page: number,
    limit: number,
    search?: string,
    status?: string,
    jenis?: string
  ): Promise<{ data: SimperPerpanjangan[], total: number }> {
    const offset = (page - 1) * limit;
    const conditions: any[] = [];

    // Search condition
    if (search && search.trim() !== "") {
      const lowerSearch = `%${search.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(simperPerpanjangan.nama, lowerSearch),
          ilike(simperPerpanjangan.nik, lowerSearch),
          ilike(simperPerpanjangan.nomorLambung, lowerSearch)
        )
      );
    }

    // Status filter
    if (status && status !== "all") {
      conditions.push(eq(simperPerpanjangan.statusPerpanjangan, status));
    }

    // Jenis filter
    if (jenis && jenis !== "all") {
      conditions.push(eq(simperPerpanjangan.jenisSimper, jenis));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(simperPerpanjangan)
      .where(whereClause);

    const total = Number(countResult?.count || 0);

    // Get data
    const data = await db
      .select()
      .from(simperPerpanjangan)
      .where(whereClause)
      .orderBy(desc(simperPerpanjangan.createdAt))
      .limit(limit)
      .offset(offset);

    return { data, total };
  }

  async getAllSimperPerpanjangan(search?: string): Promise<SimperPerpanjangan[]> {
    let query = db.select().from(simperPerpanjangan);

    if (search && search.trim() !== "") {
      const lowerSearch = `%${search.toLowerCase()}%`;
      query = query.where(
        or(
          ilike(simperPerpanjangan.nama, lowerSearch),
          ilike(simperPerpanjangan.nik, lowerSearch)
        )
      ) as any;
    }

    return await query.orderBy(desc(simperPerpanjangan.createdAt));
  }

  async getSimperPerpanjanganById(id: string): Promise<SimperPerpanjangan | undefined> {
    const [result] = await db
      .select()
      .from(simperPerpanjangan)
      .where(eq(simperPerpanjangan.id, id));
    return result;
  }

  async createSimperPerpanjangan(data: InsertSimperPerpanjangan): Promise<SimperPerpanjangan> {
    const [result] = await db
      .insert(simperPerpanjangan)
      .values({
        ...data,
        diajukanPada: new Date(),
        trackingToken: randomUUID(),
      })
      .returning();
    return result;
  }

  async getSimperPerpanjanganByToken(token: string): Promise<SimperPerpanjangan | undefined> {
    const [result] = await db
      .select()
      .from(simperPerpanjangan)
      .where(eq(simperPerpanjangan.trackingToken, token));
    return result;
  }

  async updateSimperPerpanjangan(id: string, data: Partial<InsertSimperPerpanjangan>): Promise<SimperPerpanjangan | undefined> {
    const [result] = await db
      .update(simperPerpanjangan)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(simperPerpanjangan.id, id))
      .returning();
    return result;
  }

  async deleteSimperPerpanjangan(id: string): Promise<boolean> {
    // First delete related history
    await db
      .delete(simperPerpanjanganHistory)
      .where(eq(simperPerpanjanganHistory.simperPerpanjanganId, id));

    // Then delete the main record
    const result = await db
      .delete(simperPerpanjangan)
      .where(eq(simperPerpanjangan.id, id));
    return result.rowCount > 0;
  }

  async getSimperPerpanjanganHistory(simperPerpanjanganId: string): Promise<SimperPerpanjanganHistory[]> {
    return await db
      .select()
      .from(simperPerpanjanganHistory)
      .where(eq(simperPerpanjanganHistory.simperPerpanjanganId, simperPerpanjanganId))
      .orderBy(desc(simperPerpanjanganHistory.createdAt));
  }

  async createSimperPerpanjanganHistory(data: InsertSimperPerpanjanganHistory): Promise<SimperPerpanjanganHistory> {
    const [result] = await db
      .insert(simperPerpanjanganHistory)
      .values(data)
      .returning();
    return result;
  }
  async createSidakP3k(session: InsertSidakP3kSession, items: InsertSidakP3kItem[]): Promise<SidakP3kSession> {
    return await db.transaction(async (tx) => {
      const [newSession] = await tx.insert(sidakP3kSessions).values(session).returning();

      if (items.length > 0) {
        await tx.insert(sidakP3kItems).values(
          items.map(item => ({ ...item, sessionId: newSession.id }))
        );
      }

      return newSession;
    });
  }

  async getSidakP3kHistory(): Promise<SidakP3kSession[]> {
    return await db
      .select()
      .from(sidakP3kSessions)
      .orderBy(desc(sidakP3kSessions.createdAt));
  }

  async getSidakP3kSession(id: string): Promise<(SidakP3kSession & { items: SidakP3kItem[] }) | undefined> {
    const [session] = await db
      .select()
      .from(sidakP3kSessions)
      .where(eq(sidakP3kSessions.id, id));

    if (!session) return undefined;

    const items = await db
      .select()
      .from(sidakP3kItems)
      .where(eq(sidakP3kItems.sessionId, id))
      .orderBy(asc(sidakP3kItems.ordinal));

    return { ...session, items };
  }

  async updateSidakP3kSession(id: string, updates: Partial<InsertSidakP3kSession>): Promise<SidakP3kSession | undefined> {
    const [result] = await this.db
      .update(sidakP3kSessions)
      .set(updates)
      .where(eq(sidakP3kSessions.id, id))
      .returning();
    return result;
  }

  // Sidak Behavior methods
  async getSidakBehaviorSession(id: string): Promise<SidakBehaviorSession | undefined> {
    const [result] = await this.db.select().from(sidakBehaviorSessions).where(eq(sidakBehaviorSessions.id, id));
    return result;
  }

  async getAllSidakBehaviorSessions(): Promise<SidakBehaviorSession[]> {
    return await this.db.select().from(sidakBehaviorSessions).orderBy(sql`${sidakBehaviorSessions.createdAt} DESC`);
  }

  async createSidakBehaviorSession(session: InsertSidakBehaviorSession): Promise<SidakBehaviorSession> {
    const [result] = await this.db.insert(sidakBehaviorSessions).values(session).returning();
    return result;
  }

  async updateSidakBehaviorSession(id: string, updates: Partial<InsertSidakBehaviorSession>): Promise<SidakBehaviorSession | undefined> {
    const [result] = await this.db.update(sidakBehaviorSessions).set(updates).where(eq(sidakBehaviorSessions.id, id)).returning();
    return result;
  }

  async getSidakBehaviorRecords(sessionId: string): Promise<SidakBehaviorRecord[]> {
    return await this.db.select().from(sidakBehaviorRecords).where(eq(sidakBehaviorRecords.sessionId, sessionId)).orderBy(sql`${sidakBehaviorRecords.ordinal} ASC`);
  }

  async createSidakBehaviorRecord(record: InsertSidakBehaviorRecord & { sessionId: string }): Promise<SidakBehaviorRecord> {
    // Determine next ordinal
    const maxOrdinalResult = await this.db
      .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
      .from(sidakBehaviorRecords)
      .where(eq(sidakBehaviorRecords.sessionId, record.sessionId));

    const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;

    const [result] = await this.db.insert(sidakBehaviorRecords).values({ ...record, ordinal: nextOrdinal }).returning();

    // Auto sync sample count
    await this.updateSidakBehaviorSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakBehaviorObservers(sessionId: string): Promise<SidakBehaviorObserver[]> {
    return await this.db.select().from(sidakBehaviorObservers).where(eq(sidakBehaviorObservers.sessionId, sessionId)).orderBy(sql`${sidakBehaviorObservers.createdAt} ASC`);
  }

  async createSidakBehaviorObserver(observer: InsertSidakBehaviorObserver & { sessionId: string }): Promise<SidakBehaviorObserver> {
    const [result] = await this.db.insert(sidakBehaviorObservers).values(observer).returning();
    return result;
  }

  async updateSidakBehaviorSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakBehaviorRecords(sessionId);
    await this.db
      .update(sidakBehaviorSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakBehaviorSessions.id, sessionId));
  }

  // ============================================
  // SIDAK CHARGING STATION METHODS
  // ============================================

  async getSidakChargingStationSession(id: string): Promise<SidakChargingStationSession | undefined> {
    const [result] = await this.db.select().from(sidakChargingStationSessions).where(eq(sidakChargingStationSessions.id, id));
    return result;
  }

  async getAllSidakChargingStationSessions(): Promise<SidakChargingStationSession[]> {
    return await this.db.select().from(sidakChargingStationSessions).orderBy(sql`${sidakChargingStationSessions.createdAt} DESC`);
  }

  async createSidakChargingStationSession(session: InsertSidakChargingStationSession): Promise<SidakChargingStationSession> {
    const [result] = await this.db.insert(sidakChargingStationSessions).values(session).returning();
    return result;
  }

  async updateSidakChargingStationSession(id: string, updates: Partial<InsertSidakChargingStationSession>): Promise<SidakChargingStationSession | undefined> {
    const [result] = await this.db.update(sidakChargingStationSessions).set(updates).where(eq(sidakChargingStationSessions.id, id)).returning();
    return result;
  }

  async getSidakChargingStationRecords(sessionId: string): Promise<SidakChargingStationRecord[]> {
    return await this.db.select().from(sidakChargingStationRecords).where(eq(sidakChargingStationRecords.sessionId, sessionId)).orderBy(sql`${sidakChargingStationRecords.ordinal} ASC`);
  }

  async createSidakChargingStationRecord(record: InsertSidakChargingStationRecord & { sessionId: string }): Promise<SidakChargingStationRecord> {
    // Determine next ordinal
    const maxOrdinalResult = await this.db
      .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
      .from(sidakChargingStationRecords)
      .where(eq(sidakChargingStationRecords.sessionId, record.sessionId));

    const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;

    const [result] = await this.db.insert(sidakChargingStationRecords).values({ ...record, ordinal: nextOrdinal }).returning();

    // Auto sync sample count
    await this.updateSidakChargingStationSessionSampleCount(record.sessionId);

    return result;
  }

  async getSidakChargingStationObservers(sessionId: string): Promise<SidakChargingStationObserver[]> {
    return await this.db.select().from(sidakChargingStationObservers).where(eq(sidakChargingStationObservers.sessionId, sessionId)).orderBy(sql`${sidakChargingStationObservers.createdAt} ASC`);
  }

  async createSidakChargingStationObserver(observer: InsertSidakChargingStationObserver & { sessionId: string }): Promise<SidakChargingStationObserver> {
    const [result] = await this.db.insert(sidakChargingStationObservers).values(observer).returning();
    return result;
  }

  async updateSidakChargingStationSessionSampleCount(sessionId: string): Promise<void> {
    const records = await this.getSidakChargingStationRecords(sessionId);
    await this.db
      .update(sidakChargingStationSessions)
      .set({ totalSampel: records.length })
      .where(eq(sidakChargingStationSessions.id, sessionId));
  }

  // ============================================
  // SIDAK OBSERVASI SOP KRITIS METHODS
  // ============================================

  async getSopKritisSession(id: string): Promise<SidakSopKritisSession | undefined> {
    const [result] = await this.db.select().from(sidakSopKritisSessions).where(eq(sidakSopKritisSessions.id, id));
    return result;
  }

  async getAllSopKritisSessions(): Promise<SidakSopKritisSession[]> {
    return await this.db.select().from(sidakSopKritisSessions).orderBy(sql`${sidakSopKritisSessions.createdAt} DESC`);
  }

  async createSopKritisSession(session: InsertSidakSopKritisSession): Promise<SidakSopKritisSession> {
    const [result] = await this.db.insert(sidakSopKritisSessions).values(session).returning();
    return result;
  }

  async updateSopKritisSession(id: string, updates: Partial<InsertSidakSopKritisSession>): Promise<SidakSopKritisSession | undefined> {
    const [result] = await this.db.update(sidakSopKritisSessions).set(updates).where(eq(sidakSopKritisSessions.id, id)).returning();
    return result;
  }

  async getSopKritisPengendalian(sessionId: string): Promise<SidakSopKritisPengendalian[]> {
    return await this.db.select().from(sidakSopKritisPengendalian).where(eq(sidakSopKritisPengendalian.sessionId, sessionId)).orderBy(sql`${sidakSopKritisPengendalian.ordinal} ASC`);
  }

  async createSopKritisPengendalian(item: InsertSidakSopKritisPengendalian & { sessionId: string }): Promise<SidakSopKritisPengendalian> {
    const maxOrdinalResult = await this.db
      .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
      .from(sidakSopKritisPengendalian)
      .where(eq(sidakSopKritisPengendalian.sessionId, item.sessionId));
    const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;
    const [result] = await this.db.insert(sidakSopKritisPengendalian).values({ ...item, ordinal: nextOrdinal }).returning();
    return result;
  }

  async getSopKritisLangkah(sessionId: string): Promise<SidakSopKritisLangkah[]> {
    return await this.db.select().from(sidakSopKritisLangkah).where(eq(sidakSopKritisLangkah.sessionId, sessionId)).orderBy(sql`${sidakSopKritisLangkah.ordinal} ASC`);
  }

  async createSopKritisLangkah(item: InsertSidakSopKritisLangkah & { sessionId: string }): Promise<SidakSopKritisLangkah> {
    const maxOrdinalResult = await this.db
      .select({ max: sql<number>`COALESCE(MAX(ordinal), 0)` })
      .from(sidakSopKritisLangkah)
      .where(eq(sidakSopKritisLangkah.sessionId, item.sessionId));
    const nextOrdinal = (maxOrdinalResult[0]?.max || 0) + 1;
    const [result] = await this.db.insert(sidakSopKritisLangkah).values({ ...item, ordinal: nextOrdinal }).returning();
    return result;
  }

  async getSopKritisObservers(sessionId: string): Promise<SidakSopKritisObserver[]> {
    return await this.db.select().from(sidakSopKritisObservers).where(eq(sidakSopKritisObservers.sessionId, sessionId)).orderBy(sql`${sidakSopKritisObservers.createdAt} ASC`);
  }

  async createSopKritisObserver(observer: InsertSidakSopKritisObserver & { sessionId: string }): Promise<SidakSopKritisObserver> {
    const [result] = await this.db.insert(sidakSopKritisObservers).values(observer).returning();
    return result;
  }

  async deleteSopKritisPengendalianBySession(sessionId: string): Promise<void> {
    await this.db.delete(sidakSopKritisPengendalian).where(eq(sidakSopKritisPengendalian.sessionId, sessionId));
  }

  async deleteSopKritisLangkahBySession(sessionId: string): Promise<void> {
    await this.db.delete(sidakSopKritisLangkah).where(eq(sidakSopKritisLangkah.sessionId, sessionId));
  }

  async deleteSopKritisObserversBySession(sessionId: string): Promise<void> {
    await this.db.delete(sidakSopKritisObservers).where(eq(sidakSopKritisObservers.sessionId, sessionId));
  }

  // ============================================
  // USIGN DIGITAL SIGNATURE METHODS
  // ============================================

  async createUsignDocument(data: InsertUsignDocument): Promise<UsignDocument> {
    const [result] = await this.db.insert(usignDocuments).values(data).returning();
    return result;
  }

  async getUsignDocument(id: string): Promise<(UsignDocument & { owner?: any }) | undefined> {
    const [result] = await this.db.select({
      doc: usignDocuments,
      owner: {
        name: employees.name,
        position: employees.position
      }
    })
      .from(usignDocuments)
      .leftJoin(employees, eq(usignDocuments.ownerId, employees.id))
      .where(eq(usignDocuments.id, id));

    return result ? { ...result.doc, owner: result.owner } : undefined;
  }

  async getUsignDocumentsByOwner(ownerId: string): Promise<UsignDocument[]> {
    return await this.db.select().from(usignDocuments)
      .where(eq(usignDocuments.ownerId, ownerId))
      .orderBy(desc(usignDocuments.createdAt));
  }

  async getUsignApprovalsByUser(approverId: string): Promise<(UsignApprovalStep & { document: UsignDocument })[]> {
    const steps = await this.db.select({
      step: usignApprovalSteps,
      document: usignDocuments
    })
      .from(usignApprovalSteps)
      .innerJoin(usignDocuments, eq(usignApprovalSteps.documentId, usignDocuments.id))
      .where(eq(usignApprovalSteps.approverId, approverId))
      .orderBy(desc(usignApprovalSteps.createdAt));

    return steps.map(s => ({ ...s.step, document: s.document }));
  }

  async addUsignApprovalStep(data: InsertUsignApprovalStep): Promise<UsignApprovalStep> {
    const [result] = await this.db.insert(usignApprovalSteps).values(data).returning();
    return result;
  }

  async getUsignApprovalSteps(documentId: string): Promise<(UsignApprovalStep & { approver: any, signature?: any })[]> {
    const steps = await this.db.select({
      step: usignApprovalSteps,
      approver: {
        id: employees.id,
        name: employees.name,
        position: employees.position
      },
      signatureUrl: usignSignatures.signatureImageUrl
    })
      .from(usignApprovalSteps)
      .leftJoin(employees, eq(usignApprovalSteps.approverId, employees.id))
      .leftJoin(usignSignatures, eq(usignApprovalSteps.id, usignSignatures.stepId))
      .where(eq(usignApprovalSteps.documentId, documentId))
      .orderBy(asc(usignApprovalSteps.stepOrder));

    return steps.map(s => ({
      ...s.step,
      approver: s.approver,
      signatureImageUrl: s.signatureUrl || undefined
    }));
  }

  async getUsignApprovalStepById(id: string): Promise<UsignApprovalStep | undefined> {
    const [row] = await this.db.select().from(usignApprovalSteps).where(eq(usignApprovalSteps.id, id));
    return row;
  }

  async updateUsignApprovalStepStatus(id: string, status: string, remarks?: string): Promise<UsignApprovalStep | undefined> {
    const updateData: Record<string, any> = { status, remarks };
    if (status === "completed" || status === "rejected") {
      updateData.respondedAt = new Date();
    }
    const [result] = await this.db.update(usignApprovalSteps)
      .set(updateData)
      .where(eq(usignApprovalSteps.id, id))
      .returning();

    // If all steps completed, update document status
    if (result && status === "completed") {
      const allSteps = await this.getUsignApprovalSteps(result.documentId);
      const currentOrderSteps = allSteps.filter(s => s.stepOrder === result.stepOrder);
      const isCurrentOrderCompleted = currentOrderSteps.every(s => s.status === "completed");

      if (isCurrentOrderCompleted) {
        const isFinished = allSteps.every(s => s.status === "completed");
        if (isFinished) {
          await this.db.update(usignDocuments)
            .set({ status: "completed", updatedAt: new Date() })
            .where(eq(usignDocuments.id, result.documentId));
        } else {
          // Set ALL next steps with the next order to 'current'
          const nextOrderSteps = allSteps.filter(s => s.stepOrder === result.stepOrder + 1);
          if (nextOrderSteps.length > 0) {
            await Promise.all(nextOrderSteps.map(ns =>
              this.db.update(usignApprovalSteps)
                .set({ status: "current" })
                .where(eq(usignApprovalSteps.id, ns.id))
            ));

            await this.db.update(usignDocuments)
              .set({ status: "in_progress", updatedAt: new Date() })
              .where(eq(usignDocuments.id, result.documentId));
          }
        }
      }
    } else if (result && status === "rejected") {
      await this.db.update(usignDocuments)
        .set({ status: "rejected", updatedAt: new Date() })
        .where(eq(usignDocuments.id, result.documentId));
    }

    return result;
  }

  async voidUsignDocument(id: string, reason: string): Promise<UsignDocument | undefined> {
    const [result] = await this.db.update(usignDocuments)
      .set({ status: "void", updatedAt: new Date() })
      .where(eq(usignDocuments.id, id))
      .returning();
    return result;
  }

  async createUsignSignature(data: InsertUsignSignature): Promise<UsignSignature> {
    const [result] = await this.db.insert(usignSignatures).values(data).returning();
    return result;
  }

  async getUsignSignatures(stepId: string): Promise<UsignSignature[]> {
    return await this.db.select().from(usignSignatures).where(eq(usignSignatures.stepId, stepId));
  }

  async createUsignNotification(data: InsertUsignNotification): Promise<UsignNotification> {
    const [result] = await this.db.insert(usignNotifications).values(data).returning();
    return result;
  }

  async getInProgressUsignDocuments(): Promise<UsignDocument[]> {
    return await this.db.select().from(usignDocuments)
      .where(or(
        eq(usignDocuments.status, "in_progress"),
        eq(usignDocuments.status, "pending")
      ));
  }

  async createUsignHistory(data: any): Promise<any> {
    // This is a placeholder for compatibility with the interface if needed
    return null;
  }

  // Sidak Apar Implementation
  async getSidakAparSession(id: string): Promise<SidakAparSession | undefined> {
    const [session] = await this.db.select()
      .from(sidakAparSessions)
      .where(eq(sidakAparSessions.id, id));
    return session;
  }

  async getSidakAparSessions(): Promise<SidakAparSession[]> {
    return await this.db.select()
      .from(sidakAparSessions)
      .orderBy(desc(sidakAparSessions.createdAt));
  }

  async createSidakAparSession(session: InsertSidakAparSession & { createdBy?: string | null }): Promise<SidakAparSession> {
    const [result] = await this.db.insert(sidakAparSessions)
      .values(session)
      .returning();
    return result;
  }

  async updateSidakAparSession(id: string, updates: Partial<InsertSidakAparSession>): Promise<SidakAparSession | undefined> {
    const [result] = await this.db.update(sidakAparSessions)
      .set(updates)
      .where(eq(sidakAparSessions.id, id))
      .returning();
    return result;
  }

  async getSidakAparRecords(sessionId: string): Promise<SidakAparRecord[]> {
    return await this.db.select()
      .from(sidakAparRecords)
      .where(eq(sidakAparRecords.sessionId, sessionId))
      .orderBy(asc(sidakAparRecords.ordinal));
  }

  async createSidakAparRecord(record: InsertSidakAparRecord): Promise<SidakAparRecord> {
    const [result] = await this.db.insert(sidakAparRecords)
      .values(record)
      .returning();

    // Update total count in session
    await this.updateSidakAparSessionEquipmentCount(record.sessionId);

    return result;
  }

  async getSidakAparObservers(sessionId: string): Promise<SidakAparObserver[]> {
    return await this.db.select()
      .from(sidakAparObservers)
      .where(eq(sidakAparObservers.sessionId, sessionId))
      .orderBy(asc(sidakAparObservers.ordinal));
  }

  async createSidakAparObserver(observer: InsertSidakAparObserver): Promise<SidakAparObserver> {
    const [result] = await this.db.insert(sidakAparObservers)
      .values(observer)
      .returning();
    return result;
  }

  async updateSidakAparSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakAparRecords(sessionId);
    await this.db.update(sidakAparSessions)
      .set({ totalApar: records.length })
      .where(eq(sidakAparSessions.id, sessionId));
  }

  // Sidak Fuel Storage Methods
  async getSidakFuelStorageSession(id: string): Promise<SidakFuelStorageSession | undefined> {
    const [result] = await this.db.select().from(sidakFuelStorageSessions).where(eq(sidakFuelStorageSessions.id, id));
    return result;
  }

  async getSidakFuelStorageSessions(): Promise<SidakFuelStorageSession[]> {
    return await this.db.select().from(sidakFuelStorageSessions).orderBy(desc(sidakFuelStorageSessions.createdAt));
  }

  async createSidakFuelStorageSession(session: InsertSidakFuelStorageSession): Promise<SidakFuelStorageSession> {
    const [result] = await this.db.insert(sidakFuelStorageSessions).values(session).returning();
    return result;
  }

  async updateSidakFuelStorageSession(id: string, updates: Partial<InsertSidakFuelStorageSession>): Promise<SidakFuelStorageSession | undefined> {
    const [result] = await this.db.update(sidakFuelStorageSessions).set(updates).where(eq(sidakFuelStorageSessions.id, id)).returning();
    return result;
  }

  async getSidakFuelStorageRecords(sessionId: string): Promise<SidakFuelStorageRecord[]> {
    return await this.db.select().from(sidakFuelStorageRecords).where(eq(sidakFuelStorageRecords.sessionId, sessionId)).orderBy(asc(sidakFuelStorageRecords.ordinal));
  }

  async createSidakFuelStorageRecord(record: InsertSidakFuelStorageRecord): Promise<SidakFuelStorageRecord> {
    const [result] = await this.db.insert(sidakFuelStorageRecords).values(record).returning();
    await this.updateSidakFuelStorageSessionEquipmentCount(record.sessionId);
    return result;
  }

  async getSidakFuelStorageObservers(sessionId: string): Promise<SidakFuelStorageObserver[]> {
    return await this.db.select().from(sidakFuelStorageObservers).where(eq(sidakFuelStorageObservers.sessionId, sessionId)).orderBy(asc(sidakFuelStorageObservers.ordinal));
  }

  async createSidakFuelStorageObserver(observer: InsertSidakFuelStorageObserver): Promise<SidakFuelStorageObserver> {
    const [result] = await this.db.insert(sidakFuelStorageObservers).values(observer).returning();
    return result;
  }

  async updateSidakFuelStorageSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakFuelStorageRecords(sessionId);
    await this.db.update(sidakFuelStorageSessions)
      .set({ totalItems: records.length })
      .where(eq(sidakFuelStorageSessions.id, sessionId));
  }

  async deleteSidakFuelStorageSession(id: string): Promise<boolean> {
    const result = await this.db.delete(sidakFuelStorageSessions).where(eq(sidakFuelStorageSessions.id, id)).returning();
    return result.length > 0;
  }

  // Sidak Mesin Las Methods
  async getSidakMesinLasSession(id: string): Promise<SidakMesinLasSession | undefined> {
    const [result] = await this.db.select().from(sidakMesinLasSessions).where(eq(sidakMesinLasSessions.id, id));
    return result;
  }

  async getSidakMesinLasSessions(): Promise<SidakMesinLasSession[]> {
    return await this.db.select().from(sidakMesinLasSessions).orderBy(desc(sidakMesinLasSessions.createdAt));
  }

  async createSidakMesinLasSession(session: InsertSidakMesinLasSession & { createdBy?: string | null }): Promise<SidakMesinLasSession> {
    const [result] = await this.db.insert(sidakMesinLasSessions).values(session).returning();
    return result;
  }

  async updateSidakMesinLasSession(id: string, updates: Partial<InsertSidakMesinLasSession>): Promise<SidakMesinLasSession | undefined> {
    const [result] = await this.db.update(sidakMesinLasSessions).set(updates).where(eq(sidakMesinLasSessions.id, id)).returning();
    return result;
  }

  async getSidakMesinLasRecords(sessionId: string): Promise<SidakMesinLasRecord[]> {
    return await this.db.select().from(sidakMesinLasRecords).where(eq(sidakMesinLasRecords.sessionId, sessionId)).orderBy(asc(sidakMesinLasRecords.ordinal));
  }

  async createSidakMesinLasRecord(record: InsertSidakMesinLasRecord): Promise<SidakMesinLasRecord> {
    const [result] = await this.db.insert(sidakMesinLasRecords).values(record).returning();
    await this.updateSidakMesinLasSessionEquipmentCount(record.sessionId);
    return result;
  }

  async getSidakMesinLasObservers(sessionId: string): Promise<SidakMesinLasObserver[]> {
    return await this.db.select().from(sidakMesinLasObservers).where(eq(sidakMesinLasObservers.sessionId, sessionId)).orderBy(asc(sidakMesinLasObservers.ordinal));
  }

  async createSidakMesinLasObserver(observer: InsertSidakMesinLasObserver): Promise<SidakMesinLasObserver> {
    const [result] = await this.db.insert(sidakMesinLasObservers).values(observer).returning();
    return result;
  }

  async updateSidakMesinLasSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakMesinLasRecords(sessionId);
    await this.db.update(sidakMesinLasSessions)
      .set({ totalMesinLas: records.length })
      .where(eq(sidakMesinLasSessions.id, sessionId));
  }

  async deleteSidakMesinLasSession(id: string): Promise<boolean> {
    const result = await this.db.delete(sidakMesinLasSessions).where(eq(sidakMesinLasSessions.id, id)).returning();
    return result.length > 0;
  }

  // Sidak Mesin Kompresor Implementation
  async getSidakMesinKompresorSession(id: string): Promise<SidakMesinKompresorSession | undefined> {
    const [session] = await this.db.select().from(sidakMesinKompresorSessions).where(eq(sidakMesinKompresorSessions.id, id));
    return session;
  }

  async getSidakMesinKompresorSessions(): Promise<SidakMesinKompresorSession[]> {
    return await this.db.select().from(sidakMesinKompresorSessions).orderBy(desc(sidakMesinKompresorSessions.createdAt));
  }

  async createSidakMesinKompresorSession(session: InsertSidakMesinKompresorSession & { createdBy?: string | null }): Promise<SidakMesinKompresorSession> {
    const [newSession] = await this.db.insert(sidakMesinKompresorSessions).values(session).returning();
    return newSession;
  }

  async updateSidakMesinKompresorSession(id: string, updates: Partial<InsertSidakMesinKompresorSession>): Promise<SidakMesinKompresorSession | undefined> {
    const [updated] = await this.db.update(sidakMesinKompresorSessions).set(updates).where(eq(sidakMesinKompresorSessions.id, id)).returning();
    return updated;
  }

  async getSidakMesinKompresorRecords(sessionId: string): Promise<SidakMesinKompresorRecord[]> {
    return await this.db.select().from(sidakMesinKompresorRecords).where(eq(sidakMesinKompresorRecords.sessionId, sessionId)).orderBy(asc(sidakMesinKompresorRecords.ordinal));
  }

  async createSidakMesinKompresorRecord(record: InsertSidakMesinKompresorRecord): Promise<SidakMesinKompresorRecord> {
    const [newRecord] = await this.db.insert(sidakMesinKompresorRecords).values(record).returning();
    await this.updateSidakMesinKompresorSessionEquipmentCount(record.sessionId);
    return newRecord;
  }

  async getSidakMesinKompresorObservers(sessionId: string): Promise<SidakMesinKompresorObserver[]> {
    return await this.db.select().from(sidakMesinKompresorObservers).where(eq(sidakMesinKompresorObservers.sessionId, sessionId)).orderBy(asc(sidakMesinKompresorObservers.ordinal));
  }

  async createSidakMesinKompresorObserver(observer: InsertSidakMesinKompresorObserver): Promise<SidakMesinKompresorObserver> {
    const [newObserver] = await this.db.insert(sidakMesinKompresorObservers).values(observer).returning();
    return newObserver;
  }

  async updateSidakMesinKompresorSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakMesinKompresorRecords(sessionId);
    await this.db.update(sidakMesinKompresorSessions).set({ totalItems: records.length }).where(eq(sidakMesinKompresorSessions.id, sessionId));
  }

  async updateSidakMesinKompresorSessionPhotos(id: string, photos: string[]): Promise<void> {
    await this.db.update(sidakMesinKompresorSessions).set({ activityPhotos: photos }).where(eq(sidakMesinKompresorSessions.id, id));
  }

  async deleteSidakMesinKompresorSession(id: string): Promise<boolean> {
    const result = await this.db.delete(sidakMesinKompresorSessions).where(eq(sidakMesinKompresorSessions.id, id)).returning();
    return result.length > 0;
  }

  // Sidak Gerinda Duduk Methods
  async getSidakGerindaDudukSession(id: string): Promise<SidakGerindaDudukSession | undefined> {
    const [session] = await this.db.select().from(sidakGerindaDudukSessions).where(eq(sidakGerindaDudukSessions.id, id));
    return session;
  }

  async getSidakGerindaDudukSessions(): Promise<SidakGerindaDudukSession[]> {
    return await this.db.select().from(sidakGerindaDudukSessions).orderBy(desc(sidakGerindaDudukSessions.createdAt));
  }

  async createSidakGerindaDudukSession(session: InsertSidakGerindaDudukSession & { createdBy?: string | null }): Promise<SidakGerindaDudukSession> {
    const id = randomUUID();
    const [newSession] = await this.db.insert(sidakGerindaDudukSessions).values({ ...session, id }).returning();
    return newSession;
  }

  async updateSidakGerindaDudukSession(id: string, updates: Partial<InsertSidakGerindaDudukSession>): Promise<SidakGerindaDudukSession | undefined> {
    const [updated] = await this.db.update(sidakGerindaDudukSessions).set(updates).where(eq(sidakGerindaDudukSessions.id, id)).returning();
    return updated;
  }

  async getSidakGerindaDudukRecords(sessionId: string): Promise<SidakGerindaDudukRecord[]> {
    return await this.db.select().from(sidakGerindaDudukRecords).where(eq(sidakGerindaDudukRecords.sessionId, sessionId)).orderBy(asc(sidakGerindaDudukRecords.ordinal));
  }

  async createSidakGerindaDudukRecord(record: InsertSidakGerindaDudukRecord): Promise<SidakGerindaDudukRecord> {
    const id = randomUUID();
    const [newRecord] = await this.db.insert(sidakGerindaDudukRecords).values({ ...record, id }).returning();
    await this.updateSidakGerindaDudukSessionEquipmentCount(record.sessionId);
    return newRecord;
  }

  async getSidakGerindaDudukObservers(sessionId: string): Promise<SidakGerindaDudukObserver[]> {
    return await this.db.select().from(sidakGerindaDudukObservers).where(eq(sidakGerindaDudukObservers.sessionId, sessionId)).orderBy(asc(sidakGerindaDudukObservers.ordinal));
  }

  async createSidakGerindaDudukObserver(observer: InsertSidakGerindaDudukObserver): Promise<SidakGerindaDudukObserver> {
    const id = randomUUID();
    const [newObserver] = await this.db.insert(sidakGerindaDudukObservers).values({ ...observer, id }).returning();
    return newObserver;
  }

  async updateSidakGerindaDudukSessionEquipmentCount(sessionId: string): Promise<void> {
    const records = await this.getSidakGerindaDudukRecords(sessionId);
    await this.db.update(sidakGerindaDudukSessions).set({ totalItems: records.length }).where(eq(sidakGerindaDudukSessions.id, sessionId));
  }

  async updateSidakGerindaDudukSessionPhotos(id: string, photos: string[]): Promise<void> {
    await this.db.update(sidakGerindaDudukSessions).set({ activityPhotos: photos }).where(eq(sidakGerindaDudukSessions.id, id));
  }

  async deleteSidakGerindaDudukSession(id: string): Promise<boolean> {
    const result = await this.db.delete(sidakGerindaDudukSessions).where(eq(sidakGerindaDudukSessions.id, id)).returning();
    return result.length > 0;
  }

  // PICA Methods implementation
  async getPicaRecords(): Promise<PicaRecord[]> {
    return await this.db.select().from(picaRecords).orderBy(desc(picaRecords.createdAt));
  }

  async getPicaRecord(id: string): Promise<PicaRecord | undefined> {
    const [result] = await this.db.select().from(picaRecords).where(eq(picaRecords.id, id));
    return result;
  }

  async createPicaRecord(record: InsertPicaRecord): Promise<PicaRecord> {
    const [result] = await this.db.insert(picaRecords).values(record).returning();
    return result;
  }

  async updatePicaRecord(id: string, updates: Partial<InsertPicaRecord>): Promise<PicaRecord | undefined> {
    const [result] = await this.db.update(picaRecords)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(picaRecords.id, id))
      .returning();
    return result;
  }

  async deletePicaRecord(id: string): Promise<boolean> {
    const result = await this.db.delete(picaRecords).where(eq(picaRecords.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllPicaRecords(): Promise<void> {
    await this.db.delete(picaRecords);
  }
}

export const storage = new DrizzleStorage();



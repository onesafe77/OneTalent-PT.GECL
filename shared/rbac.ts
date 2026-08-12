// Role-Based Access Control (RBAC) Configuration
// This module defines roles, permissions, and position-to-role mappings

// Define available roles
export enum Role {
  ADMIN = "ADMIN",
  SUPERVISOR = "SUPERVISOR",
  BASIC = "BASIC"
}

// Define available permissions
export enum Permission {
  // Dashboard
  VIEW_DASHBOARD = "VIEW_DASHBOARD",

  // Employee Management
  VIEW_EMPLOYEES = "VIEW_EMPLOYEES",
  MANAGE_EMPLOYEES = "MANAGE_EMPLOYEES",

  // Attendance
  VIEW_ATTENDANCE = "VIEW_ATTENDANCE",
  SCAN_QR = "SCAN_QR",
  MANAGE_ATTENDANCE = "MANAGE_ATTENDANCE",

  // Roster
  VIEW_ROSTER = "VIEW_ROSTER",
  MANAGE_ROSTER = "MANAGE_ROSTER",

  // Leave/Cuti
  VIEW_LEAVE = "VIEW_LEAVE",
  REQUEST_LEAVE = "REQUEST_LEAVE",
  MANAGE_LEAVE = "MANAGE_LEAVE",

  // SIDAK
  VIEW_SIDAK = "VIEW_SIDAK",
  CREATE_SIDAK = "CREATE_SIDAK",
  MANAGE_SIDAK = "MANAGE_SIDAK",

  // Meeting
  VIEW_MEETING = "VIEW_MEETING",
  CREATE_MEETING = "CREATE_MEETING",
  MANAGE_MEETING = "MANAGE_MEETING",

  // Reports
  VIEW_REPORTS = "VIEW_REPORTS",
  EXPORT_REPORTS = "EXPORT_REPORTS",

  // Evaluasi Driver
  VIEW_EVALUASI = "VIEW_EVALUASI",
  MANAGE_EVALUASI = "MANAGE_EVALUASI",

  // Driver View (Mobile)
  VIEW_DRIVER_VIEW = "VIEW_DRIVER_VIEW",

  // QR Code Management
  VIEW_QR = "VIEW_QR",
  GENERATE_QR = "GENERATE_QR",

  // Documents
  VIEW_DOCUMENTS = "VIEW_DOCUMENTS",
  MANAGE_DOCUMENTS = "MANAGE_DOCUMENTS",

  // Profil Kesehatan (data medis MCU) — akses TERBATAS, lihat canAccessHealthProfile()
  VIEW_HEALTH_PROFILE = "VIEW_HEALTH_PROFILE",
}

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [
    // Full access to all permissions
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_EMPLOYEES,
    Permission.MANAGE_EMPLOYEES,
    Permission.VIEW_ATTENDANCE,
    Permission.SCAN_QR,
    Permission.MANAGE_ATTENDANCE,
    Permission.VIEW_ROSTER,
    Permission.MANAGE_ROSTER,
    Permission.VIEW_LEAVE,
    Permission.REQUEST_LEAVE,
    Permission.MANAGE_LEAVE,
    Permission.VIEW_SIDAK,
    Permission.CREATE_SIDAK,
    Permission.MANAGE_SIDAK,
    Permission.VIEW_MEETING,
    Permission.CREATE_MEETING,
    Permission.MANAGE_MEETING,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_EVALUASI,
    Permission.MANAGE_EVALUASI,
    Permission.VIEW_DRIVER_VIEW,
    Permission.VIEW_QR,
    Permission.GENERATE_QR,
    Permission.VIEW_DOCUMENTS,
    Permission.MANAGE_DOCUMENTS,
  ],

  [Role.SUPERVISOR]: [
    // Scan QR, Roster, SIDAK, Laporan, Absensi Meeting
    Permission.VIEW_DASHBOARD,
    Permission.VIEW_ATTENDANCE,
    Permission.SCAN_QR,
    Permission.VIEW_ROSTER,
    Permission.VIEW_SIDAK,
    Permission.CREATE_SIDAK,
    Permission.VIEW_MEETING,
    Permission.CREATE_MEETING,
    Permission.VIEW_REPORTS,
    Permission.EXPORT_REPORTS,
    Permission.VIEW_QR,
    Permission.VIEW_DOCUMENTS,
  ],

  [Role.BASIC]: [
    // Basic access - Driver only sees Driver View and Documents, no Dashboard
    Permission.VIEW_DRIVER_VIEW,
    Permission.VIEW_DOCUMENTS,
  ],
};

// Position to Role mapping (case-insensitive matching)
// Positions with ADMIN access (full access)
const ADMIN_POSITIONS = [
  "hrga group leader",
  "admin hr",
  "data evaluator",
  "hse section head",
  "production section head",
  "maintenance section head",
  "plant section head",
  "section head plant",
  "project manager",
];

// Positions with SUPERVISOR access
const SUPERVISOR_POSITIONS = [
  "hse group leader",
  "maintenance group leader",
  "production group leader",
  "fms specialist",
  "admin penggajihan", // akses Rekap SIDAK (PUTRI SARI AZHARI.NST C-080679, satu-satunya pemegang jabatan ini)
];

// Get role from position - STRICT exact matching to prevent privilege escalation
// UPDATED: Now also considers department for automatic Admin rights
export function getRoleFromPosition(position: string | null | undefined, department?: string | null): Role {
  // 1. Check Department-based Rules First
  // Updated to handle "HSE Department" or just "HSE"
  // Updated to handle "HSE Department", "Departemen HSE", or just "HSE"
  if (department && department.toUpperCase().includes("HSE")) {
    return Role.ADMIN;
  }

  if (!position) return Role.BASIC;

  const normalizedPosition = position.toLowerCase().trim();

  // Check if position EXACTLY matches an ADMIN position
  if (ADMIN_POSITIONS.some(p => normalizedPosition === p)) {
    return Role.ADMIN;
  }

  // Check if position EXACTLY matches a SUPERVISOR position
  if (SUPERVISOR_POSITIONS.some(p => normalizedPosition === p)) {
    return Role.SUPERVISOR;
  }

  // Default to BASIC for all other positions (including Driver, Operator, etc.)
  return Role.BASIC;
}

// Get permissions from position
// Akses PROFIL KESEHATAN (data medis MCU: riwayat penyakit, hasil lab).
// Sengaja TIDAK memakai Role — kalau ikut Role.ADMIN, Section Head Produksi/Plant
// dan Admin HR ikut bisa membuka data medis. Hanya tiga pihak yang berhak
// (keputusan pemilik data, Agu 2026): departemen HSE, departemen HRGA, dan PJO.
const HEALTH_PROFILE_POSITIONS = ["project manager"]; // PJO
export function canAccessHealthProfile(position?: string | null, department?: string | null): boolean {
  const dept = (department || "").toUpperCase();
  if (dept.includes("HSE") || dept.includes("HRGA")) return true;
  return HEALTH_PROFILE_POSITIONS.includes((position || "").toLowerCase().trim());
}

export function getPermissionsFromPosition(position: string | null | undefined, department?: string | null): Permission[] {
  const role = getRoleFromPosition(position, department);
  const izin = [...ROLE_PERMISSIONS[role]];
  if (canAccessHealthProfile(position, department)) izin.push(Permission.VIEW_HEALTH_PROFILE);
  return izin;
}

// Check if a role has a specific permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// Check if a position has a specific permission
export function positionHasPermission(position: string | null | undefined, permission: Permission, department?: string | null): boolean {
  const role = getRoleFromPosition(position, department);
  return hasPermission(role, permission);
}

// User with role info (for session)
export interface UserWithRole {
  nik: string;
  name: string;
  position: string | null;
  department?: string | null; // Added department field
  role: Role;
  permissions: Permission[];
}

// Create user with role from basic user data
export function createUserWithRole(nik: string, name: string, position: string | null, department?: string | null): UserWithRole {
  const role = getRoleFromPosition(position, department);
  const permissions = getPermissionsFromPosition(position, department);

  return {
    nik,
    name,
    position,
    department,
    role,
    permissions,
  };
}

// Menu item visibility based on permissions
export interface MenuPermission {
  path: string;
  requiredPermissions: Permission[];
  requireAll?: boolean; // If true, user must have ALL permissions. If false, any one is sufficient
}

// Define which permissions are needed for each menu/route
export const MENU_PERMISSIONS: MenuPermission[] = [
  { path: "/workspace", requiredPermissions: [Permission.VIEW_DASHBOARD] },
  { path: "/workspace/dashboard", requiredPermissions: [Permission.VIEW_DASHBOARD] },
  { path: "/workspace/employees", requiredPermissions: [Permission.VIEW_EMPLOYEES] },
  { path: "/workspace/attendance", requiredPermissions: [Permission.VIEW_ATTENDANCE] },
  { path: "/workspace/scan", requiredPermissions: [Permission.SCAN_QR] },
  { path: "/workspace/roster", requiredPermissions: [Permission.VIEW_ROSTER] },
  { path: "/workspace/leave", requiredPermissions: [Permission.VIEW_LEAVE] },
  { path: "/workspace/sidak", requiredPermissions: [Permission.VIEW_SIDAK] },
  { path: "/workspace/meeting", requiredPermissions: [Permission.VIEW_MEETING] },
  { path: "/workspace/reports", requiredPermissions: [Permission.VIEW_REPORTS] },
  { path: "/workspace/evaluasi", requiredPermissions: [Permission.VIEW_EVALUASI] },
  { path: "/workspace/qr", requiredPermissions: [Permission.VIEW_QR] },
  { path: "/driver", requiredPermissions: [Permission.VIEW_DRIVER_VIEW] },
];

// Check if user can access a specific path
export function canAccessPath(permissions: Permission[], path: string): boolean {
  const menuPermission = MENU_PERMISSIONS.find(m => path.startsWith(m.path));

  if (!menuPermission) {
    // If no permission defined for path, allow access
    return true;
  }

  if (menuPermission.requireAll) {
    // Must have all required permissions
    return menuPermission.requiredPermissions.every(p => permissions.includes(p));
  } else {
    // Must have at least one of the required permissions
    return menuPermission.requiredPermissions.some(p => permissions.includes(p));
  }
}

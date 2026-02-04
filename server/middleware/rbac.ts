import { Request, Response, NextFunction } from "express";
import { Role, Permission, ROLE_PERMISSIONS, createUserWithRole } from "@shared/rbac";

// Extended request type with user info
interface AuthenticatedRequest extends Request {
  user?: {
    nik: string;
    name: string;
    position: string | null;
    department?: string | null;
    role: Role;
    permissions: Permission[];
  };
}

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Silakan login terlebih dahulu" });
  }

  // Ensure user has role info (for backward compatibility)
  if (!user.role || !user.permissions) {
    const userWithRole = createUserWithRole(user.nik, user.name, user.position || null, user.department || null);
    (req.session as any).user = userWithRole;
    (req as AuthenticatedRequest).user = userWithRole;
  } else {
    (req as AuthenticatedRequest).user = user;
  }

  next();
}

// Middleware to require specific role(s)
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)?.user;

    if (!user) {
      return res.status(401).json({ message: "Silakan login terlebih dahulu" });
    }

    // Ensure user has role info
    let userRole = user.role;
    if (!userRole) {
      const userWithRole = createUserWithRole(user.nik, user.name, user.position || null, user.department || null);
      (req.session as any).user = userWithRole;
      userRole = userWithRole.role;
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke fitur ini",
        requiredRoles: allowedRoles,
        yourRole: userRole
      });
    }

    next();
  };
}

// Middleware to require specific permission(s) - user needs at least ONE
export function requireAnyPermission(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)?.user;

    if (!user) {
      return res.status(401).json({ message: "Silakan login terlebih dahulu" });
    }

    // Ensure user has permissions
    let userPermissions = user.permissions;
    if (!userPermissions) {
      const userWithRole = createUserWithRole(user.nik, user.name, user.position || null);
      (req.session as any).user = userWithRole;
      userPermissions = userWithRole.permissions;
    }

    const hasPermission = requiredPermissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses ke fitur ini",
        requiredPermissions,
        yourPermissions: userPermissions
      });
    }

    next();
  };
}

// Middleware to require ALL specified permissions
export function requireAllPermissions(...requiredPermissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req.session as any)?.user;

    if (!user) {
      return res.status(401).json({ message: "Silakan login terlebih dahulu" });
    }

    // Ensure user has permissions
    let userPermissions = user.permissions;
    if (!userPermissions) {
      const userWithRole = createUserWithRole(user.nik, user.name, user.position || null);
      (req.session as any).user = userWithRole;
      userPermissions = userWithRole.permissions;
    }

    const hasAllPermissions = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasAllPermissions) {
      return res.status(403).json({
        message: "Anda tidak memiliki akses lengkap ke fitur ini",
        requiredPermissions,
        yourPermissions: userPermissions
      });
    }

    next();
  };
}

// Helper to get user role from request
export function getUserRole(req: Request): Role | null {
  const user = (req.session as any)?.user;
  return user?.role || null;
}

// Helper to get user permissions from request
export function getUserPermissions(req: Request): Permission[] {
  const user = (req.session as any)?.user;
  return user?.permissions || [];
}

// Helper to check if current user has a permission
export function userHasPermission(req: Request, permission: Permission): boolean {
  const permissions = getUserPermissions(req);
  return permissions.includes(permission);
}

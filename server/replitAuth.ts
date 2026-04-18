import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { pool } from "./db";



const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  // Prevent unhandled 'error' events from crashing the process
  (sessionStore as any).on?.('error', (err: any) => {
    console.error('[session-store] Error:', err.message);
  });
  return session({
    secret: process.env.SESSION_SECRET || "dev_secret_key_123",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
      maxAge: sessionTtl,
    },
  });
}
// Need to accept app to check env, so we update getSession signature and call site.
// Wait, getSession defines store. app is passed to setupAuth.
// I can change getSession to accept app, or checks process.env.NODE_ENV
// process.env.NODE_ENV is usually set.
// Or just check if REPLIT info is present?
// Safer to check NODE_ENV or default to lax/false if not prod.

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

let _authSetup = false;

export async function setupAuth(app: Express) {
  if (_authSetup) return; // Prevent double/triple registration
  _authSetup = true;

  app.set("trust proxy", 1);

  // Wrap session middleware so DB errors (ECONNRESET etc.) don't kill the request
  const sessionMiddleware = getSession();
  app.use((req: any, res: any, next: any) => {
    sessionMiddleware(req, res, (err?: any) => {
      if (err) {
        console.error('[session] Store error (continuing):', err.message);
        // Ensure req.session exists so passport doesn't crash
        if (!req.session) (req as any).session = {};
      }
      next();
    });
  });

  app.use(passport.initialize());
  app.use(passport.session());

  if (process.env.REPLIT_DOMAINS && process.env.REPL_ID) {
    const config = await getOidcConfig();

    const verify: VerifyFunction = async (
      tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
      verified: passport.AuthenticateCallback
    ) => {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    };

    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  } else {
    console.warn("Skipping Replit Auth setup (REPLIT_DOMAINS or REPL_ID not set)");
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    if (!process.env.REPLIT_DOMAINS || !process.env.REPL_ID) {
      return res.status(501).json({ message: "Replit Auth not configured" });
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    if (!process.env.REPLIT_DOMAINS || !process.env.REPL_ID) {
      return res.status(501).json({ message: "Replit Auth not configured" });
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    req.logout(async () => {
      if (process.env.REPLIT_DOMAINS && process.env.REPL_ID) {
        const config = await getOidcConfig();
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      } else {
        res.redirect("/");
      }
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  // 1. Check Passport (Replit) Auth
  if (req.isAuthenticated()) {
    const user = req.user as any;
    if (user.expires_at) {
      const now = Math.floor(Date.now() / 1000);
      if (now <= user.expires_at) {
        return next();
      }
      // Refresh logic... (omitted for brevity, or kept if needed. The original had it)
      // Let's keep original logic for Replit auth path but wrapped
    }
  }

  // 2. Check Local/Manual Auth (Routes.ts manual session)
  if ((req.session as any)?.user) {
    return next();
  }

  // 3. Fallback: Replit refresh token logic or fail
  // If we are here, strict Replit auth failed simple check.
  // The original code had refresh logic. Let's restore it fully but add the session check at top.

  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.expires_at) {
    // LAST CHANCE: Check manual session again just in case
    if ((req.session as any)?.user) return next();
    return res.status(401).json({ message: "Unauthorized" });
  }

  // ... original refresh code ...
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
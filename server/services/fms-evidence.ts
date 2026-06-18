// Token & URL builder untuk foto evidence FMS dari layanan VSS (Howen/Minergo).
// FMS menyimpan `image_path` = PATH FILESYSTEM server (mis. E:/VssService/htdocs/...), bukan URL.
// Gambar asli dilayani VSS ber-token:
//   {VSS_BASE}/fileSrv/filePreview.php?filePath=<path>&token=<tokenVSS>&ipaddr=<ip>
// Hanya tiket (tokenVSS) dari sesi FAMOUS user yang diterima VSS — auto-login server DITOLAK.
// Jadi token DISEDIAKAN user via bookmarklet (baca localStorage.tokenVSS di FAMOUS → kirim ke sini),
// disimpan di system_settings 'vss_token'. Frontend memuat gambar LANGSUNG di browser user.
import { storage } from "../storage";

export const VSS_BASE = process.env.VSS_BASE_URL || "https://vss.minergosystems.com:36301";
export const VSS_IPADDR = process.env.VSS_IPADDR || "127.0.0.1";

/** Token VSS tersimpan (selalu baca DB agar antar-proses lokal/prod konsisten). */
export async function getStoredVssToken(): Promise<string | null> {
  try {
    const v = await storage.getSystemSetting("vss_token");
    if (v && v.trim()) return v.trim();
  } catch { /* ignore */ }
  const env = process.env.VSS_TOKEN;
  return env ? env.replace(/^"|"$/g, "").trim() : null;
}

export async function setVssToken(token: string): Promise<void> {
  await storage.setSystemSetting("vss_token", token.trim(), "Token VSS (Howen) untuk preview foto evidence FMS");
}

/** Hanya izinkan path evidence VSS yang sah (anti-SSRF). */
export function isVssEvidencePath(p: string): boolean {
  const s = String(p || "");
  return /^E:[\\/]VssService[\\/]/i.test(s) || /vssFiles[\\/]/i.test(s) || /[\\/]hftp[\\/]/i.test(s);
}

/** URL preview VSS langsung (dipakai client untuk <img>). */
export function buildVssPreviewUrl(filePath: string, token: string): string {
  return `${VSS_BASE}/fileSrv/filePreview.php?filePath=${encodeURIComponent(filePath)}&token=${encodeURIComponent(token)}&ipaddr=${encodeURIComponent(VSS_IPADDR)}`;
}

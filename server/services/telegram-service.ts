// Telegram Bot API service (Safety Patrol).
// Transport tipis di atas https://api.telegram.org. Dipakai oleh telegram-bot.ts (long-polling).
import { storage } from "../storage";
import { dbStorage } from "./storage-db";

const TELEGRAM_API = "https://api.telegram.org";

let cachedToken: string | null | undefined;

/** Ambil bot token: DB system_settings -> env. (Override tanpa restart, pola sama whatsapp-service.) */
export async function getBotToken(): Promise<string | null> {
  if (cachedToken !== undefined) return cachedToken ?? null;
  let dbToken: string | null = null;
  try {
    dbToken = (await storage.getSystemSetting("TELEGRAM_BOT_TOKEN")) || null;
  } catch {
    dbToken = null;
  }
  cachedToken = dbToken || process.env.TELEGRAM_BOT_TOKEN || null;
  return cachedToken;
}

/** Panggil metode Bot API. Mengembalikan field `result` bila ok, melempar bila error. */
export async function tgApi<T = any>(method: string, params?: Record<string, any>): Promise<T> {
  const token = await getBotToken();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diset");
  const res = await fetch(`${TELEGRAM_API}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params || {}),
    signal: AbortSignal.timeout(70000), // long-poll bisa 50s
  });
  const data: any = await res.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} gagal: ${data.error_code} ${data.description}`);
  }
  return data.result as T;
}

export async function tgGetMe(): Promise<{ id: number; username?: string; first_name?: string }> {
  return tgApi("getMe");
}

/** Daftarkan webhook Telegram ke URL publik (produksi). */
export async function tgSetWebhook(url: string, secretToken?: string): Promise<void> {
  await tgApi("setWebhook", {
    url,
    allowed_updates: ["message"],
    ...(secretToken ? { secret_token: secretToken } : {}),
  });
}

/** Kirim pesan teks. parse_mode dibiarkan kosong (plain) agar aman dari karakter spesial. */
export async function tgSendMessage(chatId: string | number, text: string): Promise<void> {
  try {
    await tgApi("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true });
  } catch (e: any) {
    console.error("[Telegram] sendMessage error:", e?.message || e);
  }
}

/** "Sedang mengetik..." indicator (opsional, kosметик). */
export async function tgSendTyping(chatId: string | number): Promise<void> {
  try {
    await tgApi("sendChatAction", { chat_id: chatId, action: "typing" });
  } catch {
    /* abaikan */
  }
}

/** Unduh foto Telegram (file_id) lalu simpan ke storage DB, kembalikan URL publik internal. */
export async function tgDownloadPhotoToStorage(fileId: string): Promise<string | null> {
  try {
    const token = await getBotToken();
    if (!token) return null;
    const file = await tgApi<{ file_path?: string }>("getFile", { file_id: fileId });
    if (!file?.file_path) return null;
    const url = `${TELEGRAM_API}/file/bot${token}/${file.file_path}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) {
      console.warn("[Telegram] gagal unduh file:", resp.status, resp.statusText);
      return null;
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    const extFromPath = file.file_path.includes(".") ? "." + file.file_path.split(".").pop() : ".jpg";
    const filename = `sp-tg-${Date.now()}-${Math.round(Math.random() * 1000)}${extFromPath}`;
    const mimeType = resp.headers.get("content-type") || "image/jpeg";
    const mockFile = { buffer, originalname: filename, mimetype: mimeType } as Express.Multer.File;
    const result = await dbStorage.uploadFile(mockFile);
    return result.url;
  } catch (e: any) {
    console.error("[Telegram] tgDownloadPhotoToStorage error:", e?.message || e);
    return null;
  }
}

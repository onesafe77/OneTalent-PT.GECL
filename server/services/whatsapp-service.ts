import { storage } from "../storage";

/**
 * WhatsApp Service using Notifyme.id API
 * Endpoint: https://app.notif.my.id/api/v2/send-message
 */

const NOTIFYME_API_URL = 'https://app.notif.my.id/api/v2/send-message';

interface SendMessageParams {
    phone: string;
    message: string;
    logContext?: {
        module: string;
        referenceId?: string; // NIK Simper / Induction ID / etc
        referenceName?: string; // Employee Name
        recipientType?: "MITRA" | "EMPLOYEE" | "ADMIN";
        triggeredBy?: string; // NIK of admin or "SYSTEM"
        messageType?: string; // "STATUS_UPDATE", "REMINDER", etc.
    };
}

interface SendMessageResult {
    success: boolean;
    error?: string;
    response?: any;
}

/**
 * Normalize phone number to 62xxxx format
 */
export function normalizePhoneNumber(phone: string): string {
    if (!phone) return '';
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    // Convert 08xxx to 628xxx
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    // Add 62 if not present
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    return cleaned;
}

/**
 * Simper EV Notification Parameters
 */
interface SimperEvNotificationParams {
    employeeName: string;
    nikSimper: string;
    mitraName: string;
    status: string;
    approver?: string;
    message?: string;
    workflowType?: string;
    isRevision?: boolean;
    previousStatus?: string;
}

/**
 * Format enhanced Simper EV notification message with emojis and structured layout
 */
export function formatSimperEvNotification(params: SimperEvNotificationParams): string {
    const title = params.isRevision
        ? "🔄 *Update Status Simper EV (Revisi)*"
        : "📋 *Update Status Simper EV*";

    const statusEmoji = params.status.toLowerCase().includes("approved") ? "✅"
        : params.status.toLowerCase().includes("reject") ? "❌"
            : params.status.toLowerCase().includes("selesai") ? "🎉"
                : "⏳";

    let message = `${title}\n\n`;
    message += `👤 *Nama:* ${params.employeeName}\n`;
    message += `🆔 *NIK Simper:* ${params.nikSimper}\n`;
    message += `🏢 *Asal Mitra:* ${params.mitraName}\n`;
    message += `\n`;

    if (params.isRevision && params.previousStatus) {
        message += `📊 *Status Sebelumnya:* ${params.previousStatus}\n`;
    }

    message += `${statusEmoji} *Status Baru:* ${params.status}\n`;

    if (params.workflowType) {
        message += `📝 *Jenis Workflow:* ${params.workflowType}\n`;
    }

    if (params.approver) {
        message += `✍️ *Approver:* ${params.approver}\n`;
    }

    message += `\n`;
    message += `💬 *Pesan/Catatan:*\n${params.message || "Tidak ada catatan"}\n`;
    message += `\n`;
    message += `📅 *Tanggal:* ${new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Makassar',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}\n`;
    message += `\n`;
    message += `_Notifikasi otomatis dari OneTalent System_`;

    return message;
}

/**
 * Get API Key from DB or Env
 */
async function getApiKey(): Promise<string | null> {
    const dbKey = await storage.getSystemSetting('WHATSAPP_API_KEY');
    return dbKey || process.env.NOTIFYME_API_KEY || null;
}

/**
 * Get Admin Phone from DB or Env
 */
async function getAdminPhone(): Promise<string> {
    const dbPhone = await storage.getSystemSetting('WHATSAPP_ADMIN_PHONE');
    return dbPhone || process.env.NOTIFYME_ADMIN_PHONE || '6285126408588';
}

/**
 * Send WhatsApp message via Notifyme.id API
 */
export async function sendWhatsAppMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        console.error('[WhatsApp] API key not configured');
        return { success: false, error: 'API key not configured' };
    }

    const normalizedPhone = normalizePhoneNumber(params.phone);
    if (!normalizedPhone) {
        return { success: false, error: 'Invalid phone number' };
    }

    // [Logging] Create log entry (Always log)
    let logId: string | null = null;
    try {
        const log = await storage.createWhatsappNotificationLog({
            module: params.logContext?.module || "WHATSAPP_GENERIC",
            referenceId: params.logContext?.referenceId || null,
            referenceName: params.logContext?.referenceName || null,
            recipientPhone: normalizedPhone,
            recipientType: params.logContext?.recipientType || "EMPLOYEE",
            messageContent: params.message,
            messageType: params.logContext?.messageType || "NOTIFICATION",
            status: "PENDING",
            triggeredBy: params.logContext?.triggeredBy || "SYSTEM"
        });
        logId = log.id;
    } catch (error) {
        console.error('[WhatsApp] Failed to create log:', error);
    }

    try {
        const url = new URL(NOTIFYME_API_URL);
        url.searchParams.append('apikey', apiKey);
        url.searchParams.append('mtype', 'text');
        url.searchParams.append('receiver', normalizedPhone);
        url.searchParams.append('text', params.message);

        console.log(`[WhatsApp] Sending to ${normalizedPhone}`);
        console.log(`[WhatsApp] URL: ${url.toString()}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        const response = await fetch(url.toString(), {
            method: 'GET',
            signal: controller.signal,
            // @ts-ignore - Node.js specific options
            agent: undefined, // Let Node.js handle the agent
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok) {
            console.log(`[WhatsApp] Success: ${normalizedPhone}`);
            if (logId) {
                await storage.updateWhatsappNotificationLogStatus(logId, "SENT", undefined, data);
            }
            return { success: true, response: data };
        } else {
            console.error(`[WhatsApp] Failed: ${JSON.stringify(data)}`);
            if (logId) {
                await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", data.message || 'Send failed', data);
            }
            return { success: true, error: data.message || 'Send failed', response: data };
        }
    } catch (error) {
        console.error(`[WhatsApp] Fetch error for ${normalizedPhone}:`, error);
        if (logId) {
            await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", String(error));
        }
        return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
}

/**
 * Send notification to admin (OneTalent GECL)
 */
export async function sendAdminNotification(message: string): Promise<SendMessageResult> {
    const adminPhone = await getAdminPhone();
    return sendWhatsAppMessage({ phone: adminPhone, message });
}

/**
 * Generate SIMPER reminder message
 */
export function generateSimperReminderMessage(params: {
    name: string;
    docType: 'SIMPOL' | 'SIMPER BIB' | 'SIMPER TIA';
    daysLeft: number;
    expiredDate: string;
}): string {
    const { name, docType, daysLeft, expiredDate } = params;

    if (daysLeft < 0) {
        // Already expired
        return `⚠️ *PERINGATAN ${docType} EXPIRED*

Halo ${name},

${docType} Anda sudah *EXPIRED* ${Math.abs(daysLeft)} hari yang lalu (${expiredDate}).

Segera urus perpanjangannya!

- OneTalent GECL`;
    }

    const urgency = daysLeft <= 7 ? '🔴 URGENT' : daysLeft <= 14 ? '🟠 PENTING' : '🟡 REMINDER';

    return `${urgency} *Reminder ${docType}*

Halo ${name},

${docType} Anda akan expired dalam *${daysLeft} hari* (${expiredDate}).

Mohon segera urus perpanjangannya.

- OneTalent GECL`;
}

/**
 * Generate message for admin when SIMPER is ready
 */
export function generateAdminProgressMessage(params: {
    employeeName: string;
    employeeId: string;
    docType: string;
    status: string;
}): string {
    return `📋 *Update Status ${params.docType}*

Karyawan: ${params.employeeName}
NIK: ${params.employeeId}
Status: ${params.status}

- OneTalent System`;
}

/**
 * Generate pickup notification message
 */
export function generatePickupMessage(params: {
    name: string;
    docType: string;
}): string {
    return `📦 *${params.docType} Siap Diambil*

Halo ${params.name},

${params.docType} Anda sudah selesai diproses dan dapat diambil di kantor.

Terima kasih,
- OneTalent HR System`;
}

/**
 * Send WhatsApp message with image via Notifyme.id API (POST with JSON body)
 */
export async function sendWhatsAppImage(params: {
    phone: string;
    message: string;
    imageUrl: string;
}): Promise<SendMessageResult> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        console.error('[WhatsApp] API key not configured');
        return { success: false, error: 'API key not configured' };
    }

    const normalizedPhone = normalizePhoneNumber(params.phone);
    if (!normalizedPhone) {
        return { success: false, error: 'Invalid phone number' };
    }

    // [Logging] Create log entry (Simplified context for image)
    let logId: string | null = null;
    try {
        // Since sendWhatsAppImage doesn't take full context yet, we infer or use defaults
        // In future, update params type here too
        const log = await storage.createWhatsappNotificationLog({
            module: "WHATSAPP_IMAGE",
            recipientPhone: normalizedPhone,
            recipientType: "EMPLOYEE",
            messageContent: `[IMAGE] ${params.message} (${params.imageUrl})`,
            messageType: "IMAGE_SEND",
            status: "PENDING",
            triggeredBy: "SYSTEM"
        });
        logId = log.id;
    } catch (e) { console.error("Log error", e) }

    try {
        const body = {
            apikey: apiKey,
            receiver: normalizedPhone,
            mtype: 'image',
            text: params.message,
            url: params.imageUrl
        };

        console.log(`[WhatsApp] Sending image to ${normalizedPhone}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(NOTIFYME_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok) {
            console.log(`[WhatsApp] Image sent: ${normalizedPhone}`);
            if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "SENT", undefined, data);
            return { success: true, response: data };
        } else {
            console.error(`[WhatsApp] Image failed: ${JSON.stringify(data)}`);
            if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", data.message, data);
            return { success: false, error: data.message || 'Send failed', response: data };
        }
    } catch (error) {
        console.error(`[WhatsApp] Image error:`, error);
        if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", String(error));
        return { success: false, error: String(error) };
    }
}

/**
 * Send WhatsApp message with video via Notifyme.id API (POST with JSON body)
 */
export async function sendWhatsAppVideo(params: {
    phone: string;
    message: string;
    videoUrl: string;
}): Promise<SendMessageResult> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        console.error('[WhatsApp] API key not configured');
        return { success: false, error: 'API key not configured' };
    }

    const normalizedPhone = normalizePhoneNumber(params.phone);
    if (!normalizedPhone) {
        return { success: false, error: 'Invalid phone number' };
    }

    // [Logging] Create log entry
    let logId: string | null = null;
    try {
        const log = await storage.createWhatsappNotificationLog({
            module: "WHATSAPP_VIDEO",
            recipientPhone: normalizedPhone,
            recipientType: "EMPLOYEE",
            messageContent: `[VIDEO] ${params.message} (${params.videoUrl})`,
            messageType: "VIDEO_SEND",
            status: "PENDING",
            triggeredBy: "SYSTEM"
        });
        logId = log.id;
    } catch (e) { console.error("Log error", e) }


    try {
        const body = {
            apikey: apiKey,
            receiver: normalizedPhone,
            mtype: 'video',
            text: params.message,
            url: params.videoUrl
        };

        console.log(`[WhatsApp] Sending video to ${normalizedPhone}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(NOTIFYME_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok) {
            console.log(`[WhatsApp] Video sent: ${normalizedPhone}`);
            if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "SENT", undefined, data);
            return { success: true, response: data };
        } else {
            console.error(`[WhatsApp] Video failed: ${JSON.stringify(data)}`);
            if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", data.message, data);
            return { success: false, error: data.message || 'Send failed', response: data };
        }
    } catch (error) {
        console.error(`[WhatsApp] Video error:`, error);
        if (logId) await storage.updateWhatsappNotificationLogStatus(logId, "FAILED", String(error));
        return { success: false, error: String(error) };
    }
}

/**
 * Delay helper for batch processing
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Blast WhatsApp message to multiple recipients with batch processing
 * Sends in batches of 10 with 5 second delay between batches
 */
export async function blastWhatsApp(params: {
    phones: string[];
    message: string;
    type: 'text' | 'image' | 'video';
    mediaUrls?: string[]; // For multiple images or single video
}): Promise<{
    totalRecipients: number;
    sent: number;
    failed: number;
    failedNumbers: string[];
}> {
    const { phones, message, type, mediaUrls } = params;
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 5000; // 5 seconds

    let sent = 0;
    let failed = 0;
    const failedNumbers: string[] = [];

    console.log(`[WhatsApp Blast] Starting blast to ${phones.length} recipients (type: ${type})`);

    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        const batch = phones.slice(i, i + BATCH_SIZE);
        console.log(`[WhatsApp Blast] Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(phones.length / BATCH_SIZE)}`);

        for (const phone of batch) {
            // Initialize result with default failure state
            let result: SendMessageResult = {
                success: false,
                error: 'Unknown error'
            };

            if (type === 'text') {
                result = await sendWhatsAppMessage({ phone, message });
            } else if (type === 'image' && mediaUrls && mediaUrls.length > 0) {
                // Send first image only (WhatsApp API handles one media per message)
                result = await sendWhatsAppImage({ phone, message, imageUrl: mediaUrls[0] });
            } else if (type === 'video' && mediaUrls && mediaUrls.length > 0) {
                result = await sendWhatsAppVideo({ phone, message, videoUrl: mediaUrls[0] });
            } else {
                result = { success: false, error: 'Invalid type or missing media' };
            }

            if (result.success) {
                sent++;
                console.log(`[WhatsApp Blast] ✓ Sent to ${phone}`);
            } else {
                failed++;
                failedNumbers.push(phone);
                console.error(`[WhatsApp Blast] ✗ Failed to send to ${phone}: ${result.error}`);
            }
        }

        // Delay between batches (except for last batch)
        if (i + BATCH_SIZE < phones.length) {
            console.log(`[WhatsApp Blast] Waiting ${BATCH_DELAY / 1000}s before next batch...`);
            await delay(BATCH_DELAY);
        }
    }

    console.log(`[WhatsApp Blast] Complete: ${sent} sent, ${failed} failed`);
    return { totalRecipients: phones.length, sent, failed, failedNumbers };
}


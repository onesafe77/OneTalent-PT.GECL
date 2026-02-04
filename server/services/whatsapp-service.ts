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
 * Blast Job Interface
 */
export interface BlastJob {
    id: string;
    total: number;
    sent: number;
    failed: number;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
    failedNumbers: string[];
    createdAt: number;
    cancelRequested: boolean;
}

// In-memory job store (Note: In production, consider Redis or DB)
const blastJobs = new Map<string, BlastJob>();

/**
 * Create a new blast job
 */
export function createBlastJob(id: string, total: number): BlastJob {
    const job: BlastJob = {
        id,
        total,
        sent: 0,
        failed: 0,
        status: 'pending',
        failedNumbers: [],
        createdAt: Date.now(),
        cancelRequested: false
    };
    blastJobs.set(id, job);
    return job;
}

/**
 * Get a blast job by ID
 */
export function getBlastJob(id: string): BlastJob | undefined {
    return blastJobs.get(id);
}

/**
 * Cancel a blast job
 */
export function cancelBlastJob(id: string): boolean {
    const job = blastJobs.get(id);
    if (!job) return false;

    // Only active jobs can be cancelled
    if (job.status === 'processing' || job.status === 'pending') {
        job.cancelRequested = true;
        return true;
    }
    return false;
}

/**
 * Cleanup old jobs (optional utility)
 */
export function cleanupOldJobs(maxAgeMs = 24 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, job] of blastJobs.entries()) {
        if (now - job.createdAt > maxAgeMs) {
            blastJobs.delete(id);
        }
    }
}


/**
 * Random delay helper for safer rate limiting (mimic human behavior)
 * Returns a promise that resolves after a random time between min and max ms
 */
function randomDelay(min: number, max: number): Promise<void> {
    const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise(resolve => setTimeout(resolve, delayMs));
}

/**
 * Blast WhatsApp message to multiple recipients with batch processing
 * Sends in batches to prevent server overload and uses random delays to avoid WhatsApp blocks
 * NOW SUPPORTING: Job ID tracking and Cancellation
 */
export async function blastWhatsApp(params: {
    phones: string[];
    message: string;
    type: 'text' | 'image' | 'video';
    mediaUrls?: string[]; // For multiple images or single video
    jobId?: string; // Optional Job ID for tracking
}): Promise<{
    totalRecipients: number;
    sent: number;
    failed: number;
    failedNumbers: string[];
    status: 'completed' | 'cancelled' | 'failed';
}> {
    const { phones, message, type, mediaUrls, jobId } = params;

    // SAFETY CONFIGURATION
    const BATCH_SIZE = 5; // Reduced batch size for safety
    const MIN_MSG_DELAY = 5000; // 5 seconds min between messages
    const MAX_MSG_DELAY = 12000; // 12 seconds max between messages
    const MIN_BATCH_DELAY = 30000; // 30 seconds min between batches
    const MAX_BATCH_DELAY = 60000; // 60 seconds max between batches

    let sent = 0;
    let failed = 0;
    const failedNumbers: string[] = [];
    let isCancelled = false;

    // Get or initialize job if provided
    let job: BlastJob | undefined;
    if (jobId) {
        job = blastJobs.get(jobId);
        if (job) {
            job.status = 'processing';
            job.total = phones.length; // Ensure total is accurate
        }
    }

    console.log(`[WhatsApp Blast] Starting SAFER blast to ${phones.length} recipients (type: ${type}) ${jobId ? `[Job: ${jobId}]` : ''}`);

    outerLoop:
    for (let i = 0; i < phones.length; i += BATCH_SIZE) {
        // CHECK FOR CANCELLATION BEFORE BATCH
        if (job && job.cancelRequested) {
            console.log(`[WhatsApp Blast] Job ${jobId} CANCELLED by user request.`);
            isCancelled = true;
            break outerLoop;
        }

        const batchIndex = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(phones.length / BATCH_SIZE);
        const batch = phones.slice(i, i + BATCH_SIZE);

        console.log(`[WhatsApp Blast] Processing batch ${batchIndex}/${totalBatches} (Size: ${batch.length})`);

        for (const [index, phone] of batch.entries()) {
            // CHECK FOR CANCELLATION BEFORE MESSAGE
            if (job && job.cancelRequested) {
                console.log(`[WhatsApp Blast] Job ${jobId} CANCELLED by user request.`);
                isCancelled = true;
                break outerLoop; // Break out of both loops
            }

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

            // UPDATE JOB STATUS
            if (job) {
                job.sent = sent;
                job.failed = failed;
                if (!result.success) {
                    job.failedNumbers.push(phone);
                }
            }

            // DELAY BETWEEN MESSAGES (except for the very last one in the entire list)
            const isLastMessageOverall = (i + index + 1) === phones.length;
            if (!isLastMessageOverall) {
                console.log(`[WhatsApp Blast] Waiting random delay before next message...`);
                // We await delay, but we should check cancel again after delay if we wanted instant cancel, 
                // but checking before next iteration is usually enough.
                await randomDelay(MIN_MSG_DELAY, MAX_MSG_DELAY);
            }
        }

        // DELAY BETWEEN BATCHES (except for last batch)
        if (i + BATCH_SIZE < phones.length) {
            console.log(`[WhatsApp Blast] Batch ${batchIndex} done. Cooldown before next batch...`);
            await randomDelay(MIN_BATCH_DELAY, MAX_BATCH_DELAY);
        }
    }

    // FINALIZATION
    if (job) {
        job.status = isCancelled ? 'cancelled' : 'completed';
        job.sent = sent;
        job.failed = failed;
        // job.failedNumbers is already updated
    }

    console.log(`[WhatsApp Blast] ${isCancelled ? 'CANCELLED' : 'Complete'}: ${sent} sent, ${failed} failed`);

    return {
        totalRecipients: phones.length,
        sent,
        failed,
        failedNumbers,
        status: isCancelled ? 'cancelled' : 'completed'
    };
}


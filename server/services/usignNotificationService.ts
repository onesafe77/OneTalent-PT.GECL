import { emailService } from './emailService';
import { storage } from '../storage';
import { type UsignDocument, type UsignApprovalStep } from '@shared/schema';
import { sendWhatsAppMessage } from './whatsapp-service';

class UsignNotificationService {
    async notifyNextApprover(document: UsignDocument, step: UsignApprovalStep) {
        const approver = await storage.getEmployee(step.approverId);
        if (!approver) return;

        console.log(`[USign] Notifying next approver: ${approver.name} (${approver.id}) for document: ${document.title}`);

        // Email Notification (if available)
        const email = (approver as any).email;
        if (email) {
            await emailService.sendEmail({
                to: email,
                subject: `[USign] Permintaan Persetujuan: ${document.title}`,
                html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Halo ${approver.name},</h2>
            <p>Anda memiliki permintaan persetujuan baru untuk dokumen <b>${document.title}</b> di sistem OneTalent USign.</p>
            <p><b>Subjek:</b> ${document.subject || '-'}</p>
            <p>Silakan login ke aplikasi OneTalent untuk meninjau dan memberikan persetujuan (tanda tangan/paraf).</p>
            <p><b>Link Dokumen:</b> <a href="${process.env.APP_URL || 'https://onetalent.gecl.co.id'}/workspace/usign/document/${document.id}" target="_blank">Buka Dokumen</a></p>
            <hr />
            <p style="font-size: 0.8em; color: #777;">Ini adalah pesan otomatis dari sistem OneTalent GECL.</p>
          </div>
        `
            });
        }

        // WhatsApp Notification via Notifyme API
        if (approver.phone) {
            const docLink = `${process.env.APP_URL || 'https://onetalent.gecl.co.id'}/workspace/usign/document/${document.id}`;
            const message = `Halo ${approver.name},\n\nAnda memiliki permintaan persetujuan baru untuk dokumen *${document.title}* di sistem OneTalent USign.\n\nSubjek: ${document.subject || '-'}\n\nSilakan klik link berikut untuk meninjau dan memberikan persetujuan:\n${docLink}\n\nTerima kasih.\n_OneTalent GECL_`;
            await sendWhatsAppMessage({ phone: approver.phone as string, message, logContext: { module: 'USIGN_APPROVAL' } });
        }

        // Log notification status
        await storage.createUsignNotification({
            documentId: document.id,
            recipientId: approver.id,
            type: 'approval_request',
            status: 'sent'
        });
    }

    async notifyStatusUpdate(document: UsignDocument, status: 'approved' | 'rejected' | 'void', remarks?: string) {
        const owner = await storage.getEmployee(document.ownerId);
        if (!owner) return;

        let statusText = '';
        let color = '#333';

        if (status === 'approved') {
            statusText = 'TELAH DISETUJUI SEPENUHNYA';
            color = '#10b981'; // green
        } else if (status === 'rejected') {
            statusText = 'DITOLAK';
            color = '#ef4444'; // red
        } else if (status === 'void') {
            statusText = 'DIBATALKAN (VOID)';
            color = '#6b7280'; // gray
        }

        const docLink = `${process.env.APP_URL || 'https://onetalent.gecl.co.id'}/workspace/usign/document/${document.id}`;
        const emailSubject = `[USign] Status Dokumen: ${document.title} - ${statusText}`;
        const message = `Halo ${owner.name},\n\nDokumen Anda *${document.title}* ${statusText}.${remarks ? `\n\nCatatan: ${remarks}` : ''}\n\nSilakan cek detailnya di sini:\n${docLink}\n\nTerima kasih.\n_OneTalent GECL_`;

        const email = (owner as any).email;
        if (email) {
            await emailService.sendEmail({
                to: email,
                subject: emailSubject,
                html: `
          <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
            <h2>Halo ${owner.name},</h2>
            <p>Dokumen Anda <b>${document.title}</b> saat ini berstatus: <span style="color: ${color}; font-weight: bold;">${statusText}</span>.</p>
            ${remarks ? `<p><b>Catatan:</b> ${remarks}</p>` : ''}
            <p>Silakan periksa detailnya di dashboard OneTalent USign.</p>
            <hr />
            <p style="font-size: 0.8em; color: #777;">Ini adalah pesan otomatis dari sistem OneTalent GECL.</p>
          </div>
        `
            });
        }

        if (owner.phone) {
            await sendWhatsAppMessage({ phone: owner.phone as string, message, logContext: { module: 'USIGN_UPDATE' } });
        }
    }

    async checkAndNotifyUsignPending() {
        console.log('[USign] Running periodic reminder check...');
        try {
            const documents = await storage.getInProgressUsignDocuments();

            for (const doc of documents) {
                const allSteps = await storage.getUsignApprovalSteps(doc.id);
                const currentStep = allSteps.find(s => s.status === 'current');

                if (currentStep) {
                    const now = new Date();
                    const stepTime = new Date(currentStep.createdAt || doc.updatedAt || doc.createdAt || now);
                    const diffHrs = (now.getTime() - stepTime.getTime()) / (1000 * 60 * 60);

                    // SOP: 6h during work hours, 12h outside.
                    const currentHour = now.getHours();
                    const isWorkHour = currentHour >= 8 && currentHour < 17;
                    const threshold = isWorkHour ? 6 : 12;

                    if (diffHrs >= threshold) {
                        console.log(`[USign] Resending reminder for doc: ${doc.title}, step: ${currentStep.stepOrder}, elapsed: ${diffHrs.toFixed(1)}h`);
                        await this.notifyNextApprover(doc, currentStep);
                    }
                }
            }
        } catch (error) {
            console.error('[USign] Periodic reminder check error:', error);
        }
    }
}

export const usignNotificationService = new UsignNotificationService();

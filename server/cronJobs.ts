import * as cron from 'node-cron';
import { storage } from './storage';
import { LeaveMonitoringService } from './leaveMonitoringService';
import { simperNotificationService } from './services/simperNotificationService';
import { emailService } from './services/emailService';
import { db } from './db';
import { rosterSchedules } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Helper function to get roster entries by date
async function getRosterByDate(date: string) {
  return await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, date));
}

export function initializeCronJobs() {
  const monitoringService = new LeaveMonitoringService(storage as any);

  // Run every day at 9:00 AM to check for leave reminders
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily leave reminder check...');
    try {
      const result = await monitoringService.sendLeaveReminders();
      console.log(`Leave reminders completed: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('Error in daily leave reminder job:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });

  // Optional: Run every Monday at 8:00 AM for weekly summary
  cron.schedule('0 8 * * 1', async () => {
    console.log('Running weekly leave monitoring summary...');
    try {
      const upcomingLeaves = await monitoringService.checkUpcomingLeaves();
      console.log(`Weekly summary: ${upcomingLeaves.length} upcoming leave reminders to send`);
    } catch (error) {
      console.error('Error in weekly summary job:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });

  // Run every day at 7:00 AM WITA to check for SIMPER expired/expiring
  cron.schedule('0 7 * * *', async () => {
    console.log('📧 Running daily SIMPER expiry notification check...');
    try {
      const result = await simperNotificationService.checkAndNotifySimperExpired();
      if (result.sent) {
        console.log(`✅ SIMPER notification sent: ${result.count} employees with expired/expiring SIMPER`);
      } else if (result.count === 0) {
        console.log('✅ No SIMPER expired or expiring soon');
      } else {
        console.log('⚠️ Failed to send SIMPER notification email');
      }
    } catch (error) {
      console.error('❌ Error in SIMPER notification job:', error);
    }
  }, {
    timezone: "Asia/Makassar"
  });

  // ============================================
  // INDUCTION CRON JOBS
  // ============================================

  // Run every day at 6:00 AM to auto-generate induction schedules for drivers returning from leave (H-1)
  cron.schedule('0 6 * * *', async () => {
    console.log('🎓 Running daily induction schedule generation (H-1 detection)...');
    try {
      // Get tomorrow's date (the day driver will start working)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Get today's date (H-1, when we're checking)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      // Get yesterday's date (to check if driver was on leave)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Fetch roster for tomorrow (drivers scheduled to work)
      const tomorrowRoster = await getRosterByDate(tomorrowStr);
      console.log(`📅 Found ${tomorrowRoster.length} roster entries for tomorrow (${tomorrowStr})`);

      // Fetch roster for today (to check current status)
      const todayRoster = await getRosterByDate(todayStr);
      const todayRosterMap = new Map(todayRoster.map(r => [r.employeeId, r]));

      let generatedCount = 0;

      for (const entry of tomorrowRoster) {
        // Skip if driver is on leave tomorrow
        if (entry.shift === 'CUTI') continue;

        // Check if driver is on leave today (meaning tomorrow is their first day back)
        const todayEntry = todayRosterMap.get(entry.employeeId);
        const wasOnLeaveToday = todayEntry?.shift === 'CUTI';

        if (wasOnLeaveToday) {
          // Check if employee already has a pending induction schedule
          const existingSchedule = await storage.getPendingInductionSchedule(entry.employeeId);

          if (!existingSchedule) {
            // Create new induction schedule for tomorrow (their first day back)
            await storage.createInductionSchedule({
              employeeId: entry.employeeId,
              scheduledDate: tomorrowStr,
              reason: 'Pasca Cuti',
              status: 'pending'
            });
            generatedCount++;
            console.log(`  ✅ Generated induction for: ${entry.employeeId} (returning from leave)`);
          } else {
            console.log(`  ⏭️ Skipped ${entry.employeeId}: already has pending induction`);
          }
        }
      }

      console.log(`🎓 Induction schedule generation complete: ${generatedCount} new schedules created`);
    } catch (error) {
      console.error('❌ Error in induction schedule generation:', error);
    }
  }, {
    timezone: "Asia/Makassar"
  });

  // Run every day at 8:00 AM to send WhatsApp reminders for pending induction schedules
  cron.schedule('0 8 * * *', async () => {
    console.log('📲 Running daily induction WhatsApp reminder...');
    try {
      const { sendWhatsAppMessage } = await import('./services/whatsapp-service');

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      // Find pending schedules for today that haven't been notified
      const schedules = await storage.getInductionSchedules(today);
      const pendingSchedules = schedules.filter(s => s.status === 'pending' && !s.notifiedAt);

      let sentCount = 0;
      let failedCount = 0;

      for (const schedule of pendingSchedules) {
        if (schedule.employee?.phone) {
          const message = `Yth. ${schedule.employee.name},\n\nAnda dijadwalkan untuk *Induksi K3* hari ini.\n\nSilakan buka aplikasi OneTalent dan selesaikan quiz induksi sebelum memulai pekerjaan.\n\nTerima kasih,\nHSE Team`;

          const result = await sendWhatsAppMessage({
            phone: schedule.employee.phone,
            message,
            logContext: {
              module: 'INDUCTION',
              referenceId: schedule.id,
              referenceName: schedule.employee.name,
              recipientType: 'EMPLOYEE',
              messageType: 'REMINDER_CRON'
            }
          });

          if (result.success) {
            await storage.updateInductionSchedule(schedule.id, {
              notifiedAt: new Date(),
              notifiedVia: 'whatsapp'
            });
            sentCount++;
          } else {
            failedCount++;
          }
        }
      }

      console.log(`📲 Induction WA reminder complete: ${sentCount} sent, ${failedCount} failed`);
    } catch (error) {
      console.error('❌ Error in induction WA reminder:', error);
    }
  }, {
    timezone: "Asia/Makassar"
  });

  console.log('Cron jobs initialized for leave monitoring');
  console.log('🎓 Induction schedule generator: ACTIVE (daily at 6:00 AM WITA)');
  console.log('📲 Induction WA reminder: ACTIVE (daily at 8:00 AM WITA)');
  if (emailService.isConfigured()) {
    console.log('📧 SIMPER notification email service: ACTIVE (daily at 7:00 AM WITA)');
  } else {
    console.log('⚠️ SIMPER notification email service: INACTIVE (credentials not configured)');
  }

  // ============================================
  // USIGN CRON JOBS
  // ============================================

  // Run every 3 hours to check for pending USign approvals
  cron.schedule('0 */3 * * *', async () => {
    console.log('[USign] Running periodic reminder check...');
    try {
      const { usignNotificationService } = await import('./services/usignNotificationService');
      await usignNotificationService.checkAndNotifyUsignPending();
    } catch (error) {
      console.error('❌ Error in USign reminder job:', error);
    }
  }, {
    timezone: "Asia/Jakarta"
  });
}

import * as cron from 'node-cron';
import { storage } from './storage';
import { LeaveMonitoringService } from './leaveMonitoringService';
import { simperNotificationService } from './services/simperNotificationService';
import { emailService } from './services/emailService';
import { db } from './db';
import { rosterSchedules } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';

// Helper function to get roster entries by date
async function getRosterByDate(date: string) {
  return await db.select().from(rosterSchedules).where(eq(rosterSchedules.date, date));
}

export function initializeCronJobs() {
  const monitoringService = new LeaveMonitoringService(storage as any);

  // Zero Harm — sync Plan Kehadiran dari Google Sheet (tab GECL) tiap pagi 06:00 WITA
  cron.schedule('0 6 * * *', async () => {
    console.log('[zh] Sync Plan Kehadiran dari Google Sheet…');
    try {
      const { fetchPlanRowsFromSheet } = await import('./lib/zh-plan-sheet');
      const { applyZhPlanRows } = await import('./lib/zh-plan-apply');
      const rows = await fetchPlanRowsFromSheet();
      const r = await applyZhPlanRows(new Date().getFullYear(), rows);
      console.log(`[zh] Sync Plan Kehadiran OK: ${r.planCells} sel → ${r.derived} entri program`);
    } catch (e: any) {
      console.error('[zh] Sync Plan Kehadiran gagal:', e?.message || e);
    }
    // Safety Patrol plan (tab SAFETY PATROL GECL)
    try {
      const { fetchSafetyPatrolPlanFromSheet } = await import('./lib/zh-plan-sheet');
      const year = new Date().getFullYear();
      const sp = await fetchSafetyPatrolPlanFromSheet();
      await storage.upsertAttendancePlan(sp.map((r) => ({ officerName: r.officerName, nik: r.nik, year, week: r.week, shift1: r.shift1, shift2: r.shift2 })) as any);
      console.log(`[zh] Sync Plan Safety Patrol OK: ${sp.length} baris`);
    } catch (e: any) {
      console.error('[zh] Sync Plan Safety Patrol gagal:', e?.message || e);
    }
  }, { timezone: "Asia/Makassar" });

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

  // FMS auto-pull dari FAMOUS (read-only) — tiap jam menit ke-5 (WITA)
  // Window 6 jam agar validasi yang masuk dalam beberapa jam pertama ikut ter-refresh.
  cron.schedule('5 * * * *', async () => {
    console.log('[FMS] Running hourly FAMOUS auto-pull...');
    try {
      const { runFmsScrape } = await import('./services/fms-scraper');
      const res = await runFmsScrape({ hoursBack: 6 });
      console.log(`[FMS] auto-pull selesai: fetched=${res.fetched} upserted=${res.upserted}`);
    } catch (error) {
      console.error('❌ Error in FMS auto-pull job:', error);
    }
  }, {
    timezone: "Asia/Makassar"
  });

  // FMS revalidate — tiap hari 02:10 WITA tarik ulang 14 hari terakhir agar status
  // validasi (aksi manusia yang terjadi berhari-hari setelah alarm) ter-refresh di DB.
  cron.schedule('10 2 * * *', async () => {
    console.log('[FMS] Running daily revalidate (14 hari)...');
    try {
      const { runFmsRevalidate } = await import('./services/fms-scraper');
      const res = await runFmsRevalidate({ daysBack: 14 });
      console.log(`[FMS] revalidate selesai: fetched=${res.fetched} upserted=${res.upserted} new=${res.inserted}`);

      // Lonceng: ringkasan alert VALID yang perlu tindak lanjut (driver kosong / foto belum), 2 hari terakhir.
      try {
        const q: any = await db.execute(sql`
          SELECT COUNT(*)::int AS n, COUNT(DISTINCT vehicle_no)::int AS units
          FROM fms_violations
          WHERE category = 'Fatigue Alarm' AND validation_status = 'Valid'
            AND violation_date >= (CURRENT_DATE - INTERVAL '2 days')
            AND ( manual_driver_name IS NULL OR btrim(manual_driver_name) = '' OR manual_driver_name ILIKE 'unknown%'
                  OR evidence_url IS NULL OR evidence_url NOT LIKE '/api/uploads/%' )
        `);
        const n = q.rows?.[0]?.n || 0;
        const units = q.rows?.[0]?.units || 0;
        if (n > 0) {
          await storage.createNotification({
            type: 'fms',
            title: `${n} alert fatigue VALID perlu tindak lanjut`,
            body: `${units} unit menunggu input driver / upload foto kegiatan (2 hari terakhir).`,
            link: '/workspace/hse/fatigue-monitoring',
            audience: 'hse',
            meta: { incomplete: n, units },
          } as any);
        }
      } catch (e: any) { console.warn('[FMS] gagal buat notifikasi follow-up:', e?.message || e); }
    } catch (error) {
      console.error('❌ Error in FMS revalidate job:', error);
    }
  }, {
    timezone: "Asia/Makassar"
  });

  // Tanggal WITA (offset hari) — dipakai pengingat Safety Patrol per shift.
  const witaDate = (offsetDays = 0) =>
    new Date(Date.now() + offsetDays * 86400000).toLocaleDateString("en-CA", { timeZone: "Asia/Makassar" });

  // Pengingat SHIFT 1 (06:00–18:00) — 17:00 WITA, 1 jam sebelum tutup: sisa kegiatan HARI INI.
  cron.schedule('0 17 * * *', async () => {
    console.log('[SafetyPatrol] Pengingat Shift 1 (17:00 WITA)...');
    try {
      const { runJobReminders } = await import('./services/telegram-bot');
      const r = await runJobReminders('Shift 1', witaDate(0));
      console.log(`[SafetyPatrol] pengingat Shift 1: ${r.sent} terkirim (${r.officers} target)`);
    } catch (error) {
      console.error('❌ Error pengingat Shift 1:', error);
    }
  }, { timezone: "Asia/Makassar" });

  // Pengingat SHIFT 2 (18:00–06:00) — 05:00 WITA, 1 jam sebelum tutup. Shift dimulai 18:00 KEMARIN,
  // jadi target = tanggal kemarin; laporan dini hari (00:00–05:00) ikut lewat reportDateTo = hari ini.
  cron.schedule('0 5 * * *', async () => {
    console.log('[SafetyPatrol] Pengingat Shift 2 (05:00 WITA)...');
    try {
      const { runJobReminders } = await import('./services/telegram-bot');
      const r = await runJobReminders('Shift 2', witaDate(-1), witaDate(0));
      console.log(`[SafetyPatrol] pengingat Shift 2: ${r.sent} terkirim (${r.officers} target)`);
    } catch (error) {
      console.error('❌ Error pengingat Shift 2:', error);
    }
  }, { timezone: "Asia/Makassar" });
}


import cron from "node-cron";
import { db } from "../db";
import { activityEvents, employees } from "@shared/schema";
import { and, eq, lte, isNull, sql } from "drizzle-orm";
import { sendWhatsAppMessage } from "./whatsapp-service";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function startReminderScheduler() {
    console.log("⏰ Starting Activity Reminder Scheduler...");

    // Run every minute
    cron.schedule("* * * * *", async () => {
        try {
            const now = new Date();

            // Find events where:
            // 1. reminderSent is false OR null
            // 2. startTime - reminderMinutes <= now
            // 3. startTime > now (haven't started yet, or maybe allow slightly passed?)
            //    Let's say: startTime > now - 5 mins (to catch late runs) AND startTime <= now + reminderMinutes

            // Simplified logic: Check events starting in the next 'reminderMinutes' + buffer, not yet sent.
            // Actually, easier: (startTime - interval 'reminder_minutes minute') <= now AND reminder_sent = false

            const eventsToRemind = await db.select({
                event: activityEvents,
                phone: employees.phone,
                name: employees.name
            })
                .from(activityEvents)
                .leftJoin(employees, eq(employees.id, activityEvents.userId)) // Assuming userId matches employee.id (NIK)
                .where(sql`
        ${activityEvents.reminderSent} = false 
        AND ${activityEvents.startTime} <= (${now.toISOString()}::timestamp + (${activityEvents.reminderMinutes} || ' minutes')::interval)
        AND ${activityEvents.startTime} > ${now.toISOString()}::timestamp
      `);

            if (eventsToRemind.length > 0) {
                console.log(`⏰ Found ${eventsToRemind.length} events to remind.`);

                for (const item of eventsToRemind) {
                    const { event, phone, name } = item;

                    // Notify Creator
                    if (phone) {
                        const timeString = format(new Date(event.startTime), "HH:mm");
                        const message = `*Reminder Kegiatan*\nHalo ${name || 'Rekan'},\n\nJangan lupa kegiatan: *${event.title}*\nJam: ${timeString}\n\n${event.description || ''}`;

                        try {
                            await sendWhatsAppMessage({
                                phone,
                                message,
                                logContext: {
                                    module: "ACTIVITY",
                                    referenceId: event.id,
                                    referenceName: name || undefined,
                                    messageType: "REMINDER_CREATOR",
                                    triggeredBy: "SYSTEM_SCHEDULER"
                                }
                            });
                            console.log(`✅ Sent reminder to creator ${phone} for ${event.title}`);
                        } catch (err) {
                            console.error(`❌ Failed to send WA to creator ${phone}:`, err);
                        }
                    }

                    // Notify Participants
                    if (event.participants) {
                        const participantNames = event.participants.split(",").map(n => n.trim());
                        for (const pName of participantNames) {
                            if (!pName) continue;
                            // Find employee by partial name match
                            try {
                                // Use ILIKE for case-insensitive partial match
                                const found = await db.select({ phone: employees.phone, name: employees.name })
                                    .from(employees)
                                    .where(sql`${employees.name} ILIKE ${`%${pName}%`}`)
                                    .limit(1);

                                if (found.length > 0 && found[0].phone) {
                                    const pPhone = found[0].phone;
                                    const pEmpName = found[0].name;
                                    const timeString = format(new Date(event.startTime), "HH:mm");
                                    const msg = `*Undangan Kegiatan*\nHalo ${pEmpName},\n\nAnda diundang ke kegiatan: *${event.title}*\nOleh: ${name || 'Penyelenggara'}\nJam: ${timeString}\n\n${event.description || ''}`;

                                    await sendWhatsAppMessage({
                                        phone: pPhone,
                                        message: msg,
                                        logContext: {
                                            module: "ACTIVITY",
                                            referenceId: event.id,
                                            referenceName: pEmpName,
                                            messageType: "REMINDER_PARTICIPANT",
                                            triggeredBy: "SYSTEM_SCHEDULER"
                                        }
                                    });
                                    console.log(`✅ Sent reminder to participant ${pEmpName} (${pPhone})`);
                                } else {
                                    console.log(`⚠️ Participant not found or no phone: ${pName}`);
                                }
                            } catch (err) {
                                console.error(`❌ Error notifying participant ${pName}:`, err);
                            }
                        }
                    }

                    // Mark as sent regardless of success to avoid loop.
                    await db.update(activityEvents)
                        .set({ reminderSent: true })
                        .where(eq(activityEvents.id, event.id));
                }
            }

        } catch (error) {
            console.error("Error in reminder scheduler:", error);
        }
    });
}

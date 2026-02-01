import { db } from "../server/db";
import { systemSettings } from "../shared/schema";
import { eq } from "drizzle-orm";

async function configureWhatsApp() {
  console.log("🔧 Configuring WhatsApp API credentials...");

  // WhatsApp API Key
  const apiKeyResult = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, "WHATSAPP_API_KEY"));

  if (apiKeyResult.length > 0) {
    await db
      .update(systemSettings)
      .set({ 
        settingValue: "gUwLiqxnYAwZDGzYl21769788862605",
        description: "Notifyme.id API Key for WhatsApp Service"
      })
      .where(eq(systemSettings.settingKey, "WHATSAPP_API_KEY"));
    console.log("✅ Updated WHATSAPP_API_KEY");
  } else {
    await db.insert(systemSettings).values({
      settingKey: "WHATSAPP_API_KEY",
      settingValue: "gUwLiqxnYAwZDGzYl21769788862605",
      description: "Notifyme.id API Key for WhatsApp Service"
    });
    console.log("✅ Inserted WHATSAPP_API_KEY");
  }

  // Admin Phone
  const phoneResult = await db
    .select()
    .from(systemSettings)
    .where(eq(systemSettings.settingKey, "WHATSAPP_ADMIN_PHONE"));

  if (phoneResult.length > 0) {
    await db
      .update(systemSettings)
      .set({ 
        settingValue: "6285126406588",
        description: "Admin phone number for WhatsApp notifications"
      })
      .where(eq(systemSettings.settingKey, "WHATSAPP_ADMIN_PHONE"));
    console.log("✅ Updated WHATSAPP_ADMIN_PHONE");
  } else {
    await db.insert(systemSettings).values({
      settingKey: "WHATSAPP_ADMIN_PHONE",
      settingValue: "6285126406588",
      description: "Admin phone number for WhatsApp notifications"
    });
    console.log("✅ Inserted WHATSAPP_ADMIN_PHONE");
  }

  console.log("\n✨ WhatsApp API configuration completed!");
  console.log("📱 Admin Phone: 6285126406588");
  console.log("🔑 API Key: gUwL...605 (configured)");
  
  process.exit(0);
}

configureWhatsApp().catch((error) => {
  console.error("❌ Error configuring WhatsApp:", error);
  process.exit(1);
});

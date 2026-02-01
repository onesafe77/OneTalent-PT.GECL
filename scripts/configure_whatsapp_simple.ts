// Simple WhatsApp configuration using storage
import "../server/load-env";  // Load environment first
import { storage } from "../server/storage";

async function configureWhatsApp() {
  console.log("🔧 Configuring WhatsApp API credentials...");

  try {
    // Set API Key
    await storage.setSystemSetting(
      "WHATSAPP_API_KEY",
      "gUwLiqxnYAwZDGzYl21769788862605",
      "Notifyme.id API Key for WhatsApp Service"
    );
    console.log("✅ Configured WHATSAPP_API_KEY");

    // Set Admin Phone
    await storage.setSystemSetting(
      "WHATSAPP_ADMIN_PHONE",
      "6285126406588",
      "Admin phone number for WhatsApp notifications"
    );
    console.log("✅ Configured WHATSAPP_ADMIN_PHONE");

    console.log("\n✨ WhatsApp API configuration completed!");
    console.log("📱 Admin Phone: 6285126406588");
    console.log("🔑 API Key: gUwL...605 (configured)");
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

configureWhatsApp();

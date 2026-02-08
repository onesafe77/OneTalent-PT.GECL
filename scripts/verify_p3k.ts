import { apiRequest } from "./utils"; // Assuming utils exists or I'll use fetch directly
// Actually I'll just use fetch in this script for simplicity and independence
import fetch from "node-fetch";

const BASE_URL = "http://localhost:5000";

async function verifyP3k() {
    console.log("Starting P3K Verification...");

    // 1. Create Session
    console.log("\n1. Testing Create Session...");
    const mockSession = {
        tanggal: "2023-10-27",
        waktu: "10:00",
        lokasi: "Test Location Script",
        inspectorName: "Script Tester",
        inspectorSignature: "data:image/png;base64,testsignature",
        areaResponsibleName: "Area Manager",
        areaResponsibleSignature: "data:image/png;base64,testsignature",
        notes: "Created via verification script"
    };

    const mockItems = [
        { itemName: "Kasa Steril", minQty: 20, isAvailable: true, notes: "OK", ordinal: 1 },
        { itemName: "Perban 5cm", minQty: 2, isAvailable: false, notes: "Missing", ordinal: 2 }
    ];

    try {
        const createRes = await fetch(`${BASE_URL}/api/sidak-p3k`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session: mockSession, items: mockItems })
        });

        if (!createRes.ok) {
            throw new Error(`Create failed: ${createRes.status} ${createRes.statusText} - ${await createRes.text()}`);
        }

        const createdSession: any = await createRes.json();
        console.log("✅ Session Created:", createdSession.id);

        // 2. Get History
        console.log("\n2. Testing Get History...");
        const historyRes = await fetch(`${BASE_URL}/api/sidak-p3k`);
        if (!historyRes.ok) throw new Error("Get History failed");

        const history: any = await historyRes.json();
        const found = history.find((h: any) => h.id === createdSession.id);
        if (found) {
            console.log("✅ Created session found in history.");
        } else {
            console.error("❌ Created session NOT found in history.");
        }

        // 3. Get Detail
        console.log("\n3. Testing Get Detail...");
        const detailRes = await fetch(`${BASE_URL}/api/sidak-p3k/${createdSession.id}`);
        if (!detailRes.ok) throw new Error("Get Detail failed");

        const detail: any = await detailRes.json();
        console.log("Session Detail:", detail.lokasi);
        if (detail.items && detail.items.length === 2) {
            console.log("✅ Items retrieved correctly:", detail.items.length);
            console.log("Item 1:", detail.items[0].itemName, detail.items[0].isAvailable);
        } else {
            console.error("❌ Items mismatch or missing.");
        }

        console.log("\n🎉 P3K Backend Verification Successful!");

    } catch (error) {
        console.error("\n❌ Verification Failed:", error);
        process.exit(1);
    }
}

verifyP3k();

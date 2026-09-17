// Uji perilaku agen chat (prompt & alat PPO/peraturan sungguhan, database hanya-baca):
//   npx tsx scripts/regulasi/uji-agen.ts            (4 pertanyaan bawaan)
//   UJI_MODEL=openai/gpt-4.1-mini UJI_Q="apa tugas ktt?" npx tsx scripts/regulasi/uji-agen.ts
import "dotenv/config";
import fs from "fs";
import { db } from "../../server/db";
import { openRouterClient, AI_MODELS, kunciOpenRouter } from "../../server/ai-config";
import { cariRegulasi } from "../../server/lib/regulasi/cari";
import { cariDokumen } from "../../server/lib/pengetahuan/cari";
import { embedderOpenRouter } from "../../server/lib/pengetahuan/muat";
const src = fs.readFileSync("server/routes.ts", "utf8");
import { PROMPT_MYSTIC } from "../../server/lib/mystic-prompt";
const desk = (nama: string) => src.match(new RegExp(`name: "${nama}",\\s*description: "([^"]+)"`))![1];
const tools = [
  { type: "function", function: { name: "cari_ppo", description: desk("cari_ppo"), parameters: { type: "object", properties: { kueri: { type: "string" } }, required: ["kueri"] } } },
  { type: "function", function: { name: "cari_regulasi", description: desk("cari_regulasi"), parameters: { type: "object", properties: { kueri: { type: "string" } }, required: ["kueri"] } } },
];
const e = embedderOpenRouter(kunciOpenRouter());
async function tanya(q: string) {
  const msgs: any[] = [
    { role: "system", content: [{ type: "text", text: PROMPT_MYSTIC, cache_control: { type: "ephemeral" } }] },
    { role: "system", content: `Waktu sekarang: 2026-09-17 21:00 WITA.` },
    { role: "user", content: q }];
  const log: string[] = []; let n = 0; const mulai = Date.now();
  let tIn = 0, tOut = 0, tCache = 0, biaya = 0;
  for (let i = 0; i < 4; i++) {
    const c: any = await openRouterClient.chat.completions.create({ model: process.env.UJI_MODEL || AI_MODELS.FAST_TEXT, messages: msgs, tools: tools as any, usage: { include: true } } as any);
    tIn += c.usage?.prompt_tokens || 0; tOut += c.usage?.completion_tokens || 0;
    tCache += c.usage?.prompt_tokens_details?.cached_tokens || 0; biaya += c.usage?.cost || 0;
    const m = c.choices[0].message;
    if (!m.tool_calls?.length) {
      console.log(`\n## ${q}\n${log.join("\n")}\n→ ${m.content}\n[${((Date.now() - mulai) / 1000).toFixed(1)} dtk · in ${tIn} (cache ${tCache}) · out ${tOut} · $${biaya.toFixed(5)}]`);
      return;
    }
    msgs.push(m);
    for (const t of m.tool_calls as any[]) {
      const a = JSON.parse(t.function.arguments); const v = (await e([a.kueri]))[0];
      let hasil: any;
      if (t.function.name === "cari_regulasi") {
        hasil = { potongan: (await cariRegulasi(db, a.kueri, v)).map((h) => ({ nomor: ++n, peraturan: h.label, bagian: h.bagian, status: h.status, halaman: h.halamanAwal, isi: h.teks })) };
      } else {
        hasil = { potongan: (await cariDokumen(db, a.kueri, v, { k: 6 })).map((h) => ({ nomor: ++n, kode: h.kodeDokumen, revisi: h.revisi, bagian: h.bagian, isi: h.teks })) };
        const reg = await cariRegulasi(db, a.kueri, v, { k: 3 });
        if (reg.length && (reg[0].langsung || reg[0].skor >= 0.028)) hasil.isyarat = `Koleksi PERATURAN juga punya potongan relevan (mis. ${reg[0].label} — ${reg[0].bagian.split(" › ").slice(-1)[0]}). Panggil cari_regulasi bila pertanyaan menyangkut kewajiban/ketentuan hukum.`;
      }
      log.push(`  alat ${t.function.name}("${a.kueri}") → ${hasil.potongan.length} potongan${hasil.isyarat ? " + isyarat" : ""}`);
      msgs.push({ role: "tool", tool_call_id: t.id, content: JSON.stringify(hasil) });
    }
  }
}
(async () => {
  for (const q of (process.env.UJI_Q ? [process.env.UJI_Q] : ["apa tugas tanggung jawab ktt?", "apa tugas pengawas operasional?", "apa ppo fatigue?", "syarat pengesahan PJO"])) await tanya(q);
  process.exit(0);
})();

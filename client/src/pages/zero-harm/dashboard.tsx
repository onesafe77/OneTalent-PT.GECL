import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Upload, Database, Loader2, ArrowRight } from "lucide-react";

const COLORS = ["#0e7490", "#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777"];
type KC = { k: string; c: number };

// ---- chart helpers (recharts) ----
function ChartCard({ title, note, span, children }: any) {
  return (
    <Card className={`chartcard ${span === 2 ? "lg:col-span-2" : span === 3 ? "lg:col-span-3" : ""}`}>
      <CardContent className="p-4 flex flex-col h-full">
        <div className="font-bold text-[13px]">{title}</div>
        {note && <div className="text-[11px] text-muted-foreground mb-1">{note}</div>}
        <div className="flex-1 min-h-[210px]">{children}</div>
      </CardContent>
    </Card>
  );
}
const Donut = ({ data }: { data: KC[] }) => (
  <ResponsiveContainer width="100%" height="100%">
    <PieChart>
      <Pie data={data} dataKey="c" nameKey="k" innerRadius="52%" outerRadius="82%" paddingAngle={2}>
        {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
      </Pie>
      <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
    </PieChart>
  </ResponsiveContainer>
);
const BarH = ({ data, color = "#2563eb" }: { data: KC[]; color?: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
      <XAxis type="number" hide /><YAxis type="category" dataKey="k" width={120} tick={{ fontSize: 10 }} />
      <Tooltip /><Bar dataKey="c" fill={color} radius={[0, 5, 5, 0]} label={{ position: "right", fontSize: 10 }} />
    </BarChart>
  </ResponsiveContainer>
);
const BarV = ({ data, color = "#0e7490" }: { data: KC[]; color?: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="k" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
      <Tooltip /><Bar dataKey="c" fill={color} radius={[5, 5, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);
const LineW = ({ data, yKey = "c", color = "#0e7490" }: { data: any[]; yKey?: string; color?: string }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="k" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
      <Tooltip /><Line dataKey={yKey} stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);
function Kpis({ items }: { items: [string | number, string][] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-3">
      {items.map(([n, l], i) => (
        <Card key={i}><CardContent className="p-3"><div className="text-xl font-extrabold">{typeof n === "number" ? n.toLocaleString("id-ID") : n}</div><div className="text-[11px] text-muted-foreground mt-0.5">{l}</div></CardContent></Card>
      ))}
    </div>
  );
}
const sum = (a: KC[] = []) => a.reduce((s, x) => s + (x.c || 0), 0);
const find = (a: KC[] = [], k: string) => a.find((x) => (x.k || "").toLowerCase().includes(k))?.c || 0;
const findEx = (a: KC[] = [], k: string) => a.find((x) => (x.k || "").toLowerCase() === k)?.c || 0;
const sumSesuai = (rows: { s?: string; c: number }[] = []) => rows.filter((r) => !(r.s || "").toLowerCase().includes("tidak")).reduce((s, r) => s + (r.c || 0), 0);
function SecTitle({ children }: { children: any }) {
  return <div className="text-[13px] font-bold text-slate-700 mt-1 pl-2 border-l-4 border-[#0e7490]">{children}</div>;
}

const TABS = ["Ringkasan", "Hazard", "Inspeksi", "Observasi", "OPK", "Attendance", "FMS"];

export default function ZeroHarmDashboard() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState("Ringkasan");
  const { data: a, isLoading } = useQuery<any>({
    queryKey: ["/api/zero-harm/analytics"],
    queryFn: async () => { const r = await fetch("/api/zero-harm/analytics", { credentials: "include" }); if (!r.ok) throw new Error("gagal"); return r.json(); },
  });
  const counts = a?.counts || {};
  const hasData = (a?.total || 0) > 0;

  return (
    <div className="space-y-4">
      {/* Header SIMANTIK */}
      <div className="rounded-2xl p-5 text-white shadow-lg" style={{ background: "linear-gradient(120deg,#0e7490 0%,#1d4ed8 55%,#7c3aed 100%)" }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur"><ShieldAlert className="w-6 h-6" /></div>
            <div><h1 className="text-xl font-extrabold">SIMANTIK — Zero Harm 2.0</h1><p className="text-white/80 text-xs">Analitik data keselamatan (iSafe / FMS)</p></div>
          </div>
          <Button onClick={() => navigate("/workspace/zero-harm/import")} className="bg-white text-[#0e7490] hover:bg-white/90 font-bold"><Upload className="w-4 h-4 mr-2" /> Import Data</Button>
        </div>
      </div>

      {isLoading && <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#0e7490]" /></div>}

      {!isLoading && !hasData && (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><Database className="w-7 h-7 text-gray-400" /></div>
          <div className="font-bold text-lg">Belum ada data</div>
          <p className="text-sm text-muted-foreground mt-1">Import export iSafe & FMS untuk menampilkan analitik.</p>
          <Button onClick={() => navigate("/workspace/zero-harm/import")} className="mt-4" style={{ background: "#0e7490" }}><Upload className="w-4 h-4 mr-2" /> Mulai Import <ArrowRight className="w-4 h-4 ml-2" /></Button>
        </CardContent></Card>
      )}

      {!isLoading && hasData && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 border-b overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 ${tab === t ? "text-[#0e7490] border-[#0e7490]" : "text-muted-foreground border-transparent"}`}>{t}</button>
            ))}
          </div>

          {tab === "Ringkasan" && (
            <>
              <Kpis items={[[counts.hazard || 0, "Hazard"], [counts.inspeksi || 0, "Inspeksi"], [counts.observasi || 0, "Observasi"], [counts.opk || 0, "OPK"], [counts.attendance || 0, "Attendance"], [counts.fms || 0, "FMS"]]} />
              <div className="grid gap-3 lg:grid-cols-2">
                <ChartCard title="Jumlah Data per Sheet" note="hasil import terakhir">
                  <BarV data={["hazard", "inspeksi", "observasi", "opk", "attendance", "fms"].map((k) => ({ k, c: counts[k] || 0 }))} />
                </ChartCard>
                <ChartCard title="FMS Compliance" note="Compliant vs Non"><Donut data={a.fms?.byKategori || []} /></ChartCard>
              </div>
            </>
          )}

          {tab === "Hazard" && (
            <>
              <Kpis items={[[counts.hazard || 0, "Total"], [find(a.hazard?.byJenis, "kta"), "KTA"], [find(a.hazard?.byJenis, "tta"), "TTA"], [find(a.hazard?.byRisiko, "high"), "Risiko High"], [find(a.hazard?.byStatus, "end"), "Closed (END)"], [find(a.hazard?.byStatus, "submit"), "Submitted"]]} />
              <SecTitle>Klasifikasi & Status</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="KTA vs TTA"><Donut data={a.hazard?.byJenis || []} /></ChartCard>
                <ChartCard title="Tingkat Risiko"><BarV data={a.hazard?.byRisiko || []} color="#dc2626" /></ChartCard>
                <ChartCard title="Status Penanganan"><Donut data={a.hazard?.byStatus || []} /></ChartCard>
              </div>
              <SecTitle>Tren Waktu</SecTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <ChartCard title="Tren per Minggu"><LineW data={a.hazard?.byWeek || []} color="#dc2626" /></ChartCard>
                <ChartCard title="Per Bulan"><BarV data={a.hazard?.byMonth || []} color="#7c3aed" /></ChartCard>
              </div>
              <SecTitle>Jenis Temuan & Lokasi</SecTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <ChartCard title="Top Ketidaksesuaian"><BarH data={a.hazard?.byKetidaksesuaian || []} color="#dc2626" /></ChartCard>
                <ChartCard title="Sub Ketidaksesuaian"><BarH data={a.hazard?.bySubKetidak || []} color="#ea580c" /></ChartCard>
                <ChartCard title="Penyebab"><BarH data={a.hazard?.byPenyebab || []} color="#b45309" /></ChartCard>
                <ChartCard title="Lokasi Laporan"><BarH data={a.hazard?.byLokasi || []} color="#0891b2" /></ChartCard>
              </div>
              <SecTitle>Pelapor & Penindaklanjut</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Top Pelapor"><BarH data={a.hazard?.topPelapor || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi Pelapor"><BarH data={a.hazard?.byPosisiPelapor || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi Penindaklanjut"><BarH data={a.hazard?.byPosisiPenindak || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Departemen Penindaklanjut"><BarH data={a.hazard?.byDeptPenindak || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Perusahaan Penindaklanjut" span={2}><BarH data={a.hazard?.byPerusahaanPenindak || []} color="#7c3aed" /></ChartCard>
              </div>
            </>
          )}

          {tab === "Inspeksi" && (
            <>
              <Kpis items={[[counts.inspeksi || 0, "Total"], [find(a.inspeksi?.byStatus, "end"), "END"], [find(a.inspeksi?.byStatus, "open"), "OPEN"], [sumSesuai(a.inspeksi?.byWeekKesesuaian), "Tepat Waktu"], [a.inspeksi?.temuan?.t || 0, "Temuan"]]} />
              <SecTitle>Status & Kesesuaian</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Status"><Donut data={a.inspeksi?.byStatus || []} /></ChartCard>
                <ChartCard title="Kesesuaian Waktu / Minggu" span={2}><StackedKesesuaian rows={a.inspeksi?.byWeekKesesuaian || []} /></ChartCard>
              </div>
              <SecTitle>Objek & Form</SecTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                <ChartCard title="Per Jenis Objek"><BarH data={a.inspeksi?.byJenisObjek || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Per Nama Form"><BarH data={a.inspeksi?.byNamaForm || []} color="#0891b2" /></ChartCard>
                <ChartCard title="Per Lokasi"><BarH data={a.inspeksi?.byLokasi || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Per Bulan"><BarV data={a.inspeksi?.byMonth || []} color="#7c3aed" /></ChartCard>
              </div>
              <SecTitle>Pelaksana & PJU</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Top Pelaksana"><BarH data={a.inspeksi?.topPelaksana || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi Pelaksana"><BarH data={a.inspeksi?.byPosisi || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi PJU"><BarH data={a.inspeksi?.byPosisiPju || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Departemen PJU"><BarH data={a.inspeksi?.byDeptPju || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Perusahaan PJU" span={2}><BarH data={a.inspeksi?.byPerusahaanPju || []} color="#7c3aed" /></ChartCard>
              </div>
            </>
          )}

          {tab === "Observasi" && (
            <>
              <Kpis items={[[counts.observasi || 0, "Total"], [a.observasi?.topPja?.length || 0, "Jml PJA"], [a.observasi?.byLokasi?.length || 0, "Lokasi"], [a.observasi?.byPerusahaanPekerja?.length || 0, "Perusahaan"]]} />
              <SecTitle>Tren & Lokasi</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Tren per Minggu" span={2}><LineW data={a.observasi?.byWeek || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Per Bulan"><BarV data={a.observasi?.byMonth || []} color="#7c3aed" /></ChartCard>
                <ChartCard title="Per Lokasi"><BarH data={a.observasi?.byLokasi || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Sublokasi"><BarH data={a.observasi?.bySublokasi || []} color="#0891b2" /></ChartCard>
                <ChartCard title="Perusahaan Pekerja"><BarH data={a.observasi?.byPerusahaanPekerja || []} color="#7c3aed" /></ChartCard>
              </div>
              <SecTitle>PJA & Pelapor</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Top PJA"><BarH data={a.observasi?.topPja || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi PJA"><BarH data={a.observasi?.byPosisiPja || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Departemen Pekerja"><BarH data={a.observasi?.byDeptPekerja || []} color="#0891b2" /></ChartCard>
                <ChartCard title="Top Pelapor"><BarH data={a.observasi?.topPelapor || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Posisi Pelapor" span={2}><BarH data={a.observasi?.byPosisiPelapor || []} color="#7c3aed" /></ChartCard>
              </div>
            </>
          )}

          {tab === "OPK" && (
            <>
              <Kpis items={[[counts.opk || 0, "Total Item"], [find(a.opk?.byHasil, "aman"), "Aman"], [(counts.opk || 0) - find(a.opk?.byHasil, "aman"), "Beresiko/Temuan"], [a.opk?.topObserver?.length || 0, "Observer"]]} />
              <SecTitle>Hasil & Jenis</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Hasil Observasi"><Donut data={a.opk?.byHasil || []} /></ChartCard>
                <ChartCard title="Per Jenis Pekerjaan" span={2}><BarH data={a.opk?.byJenisPekerjaan || []} color="#7c3aed" /></ChartCard>
                <ChartCard title="Deviasi (Jenis Temuan)" span={2}><BarH data={a.opk?.byDeviasi || []} color="#dc2626" /></ChartCard>
                <ChartCard title="Per Lokasi"><BarH data={a.opk?.byLokasi || []} color="#16a34a" /></ChartCard>
              </div>
              <SecTitle>Observer, Unit & Waktu</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Top Observer"><BarH data={a.opk?.topObserver || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Perusahaan Unit Terlibat"><BarH data={a.opk?.byPerusahaanTerlibat || []} color="#0891b2" /></ChartCard>
                <ChartCard title="Per Bulan"><BarV data={a.opk?.byMonth || []} color="#7c3aed" /></ChartCard>
                <ChartCard title="Tren per Minggu" span={3}><LineW data={a.opk?.byWeek || []} color="#0d9488" /></ChartCard>
              </div>
            </>
          )}

          {tab === "Attendance" && (
            <>
              <Kpis items={[[counts.attendance || 0, "Total"], [findEx(a.attendance?.validitas, "valid"), "Valid"], [findEx(a.attendance?.validitas, "invalid"), "Invalid"], [a.attendance?.byEvent?.length || 0, "Event"], [a.attendance?.byPembicara?.length || 0, "Pembicara"]]} />
              <SecTitle>Event & Validitas</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Per Tipe Event"><BarH data={a.attendance?.byTipe || []} color="#7c3aed" /></ChartCard>
                <ChartCard title="Validitas Absen"><Donut data={a.attendance?.validitas || []} /></ChartCard>
                <ChartCard title="Per Shift"><Donut data={a.attendance?.byShift || []} /></ChartCard>
                <ChartCard title="Top Nama Event" span={2}><BarH data={a.attendance?.byEvent || []} color="#2563eb" /></ChartCard>
                <ChartCard title="Status Registrasi"><Donut data={a.attendance?.byStatusReg || []} /></ChartCard>
              </div>
              <SecTitle>Peserta & Pembicara</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Pembicara"><BarH data={a.attendance?.byPembicara || []} color="#16a34a" /></ChartCard>
                <ChartCard title="Jabatan Peserta"><BarH data={a.attendance?.byJabatan || []} color="#0891b2" /></ChartCard>
                <ChartCard title="Per Bulan"><BarV data={a.attendance?.byMonth || []} color="#7c3aed" /></ChartCard>
              </div>
            </>
          )}

          {tab === "FMS" && (
            <>
              <Kpis items={[[counts.fms || 0, "Alert"], [findEx(a.fms?.byKategori, "compliant"), "Compliant"], [findEx(a.fms?.byKategori, "non compliant"), "Non Compliant"], [findEx(a.fms?.byValidation, "valid"), "Valid"], [a.fms?.topVehicle?.length || 0, "Unit"]]} />
              <SecTitle>Compliance & Validasi</SecTitle>
              <div className="grid gap-3 lg:grid-cols-4">
                <ChartCard title="Compliance"><Donut data={a.fms?.byKategori || []} /></ChartCard>
                <ChartCard title="Status Validasi"><Donut data={a.fms?.byValidation || []} /></ChartCard>
                <ChartCard title="Per Shift"><Donut data={a.fms?.byShift || []} /></ChartCard>
                <ChartCard title="Kategori SLA"><Donut data={a.fms?.byKategoriValidasi || []} /></ChartCard>
              </div>
              <SecTitle>Violation, SLA & Tren</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Jenis Violation"><BarH data={a.fms?.byViolation || []} color="#f59e0b" /></ChartCard>
                <ChartCard title="SLA Validasi (mnt) / Minggu"><LineW data={a.fms?.slaByWeek || []} yKey="v" color="#0891b2" /></ChartCard>
                <ChartCard title="Alert / Minggu"><LineW data={a.fms?.byWeek || []} color="#f59e0b" /></ChartCard>
              </div>
              <SecTitle>Unit, Perusahaan & Validator</SecTitle>
              <div className="grid gap-3 lg:grid-cols-3">
                <ChartCard title="Top Unit (Vehicle)"><BarH data={a.fms?.topVehicle || []} color="#dc2626" /></ChartCard>
                <ChartCard title="Per Perusahaan"><BarH data={a.fms?.byCompany || []} color="#7c3aed" /></ChartCard>
                <ChartCard title="Validated By"><BarH data={a.fms?.byValidatedBy || []} color="#16a34a" /></ChartCard>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// Inspeksi: pivot [{k:week, s:kesesuaian, c}] -> stacked Sesuai/Tidak per week
function StackedKesesuaian({ rows }: { rows: { k: string; s: string; c: number }[] }) {
  const byWeek: Record<string, any> = {};
  for (const r of rows) {
    const w = r.k || "-"; byWeek[w] = byWeek[w] || { k: w, Sesuai: 0, Tidak: 0 };
    if ((r.s || "").toLowerCase().includes("tidak")) byWeek[w].Tidak += r.c; else byWeek[w].Sesuai += r.c;
  }
  const data = Object.values(byWeek);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ left: -10, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="k" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} />
        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Sesuai" stackId="s" fill="#16a34a" /><Bar dataKey="Tidak" stackId="s" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}

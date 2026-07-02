import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import {
  ClipboardCheck,
  Activity,
  Calendar as CalendarIcon,
  Users,
  Download,
  Filter,
  BarChart3,
  User,
  Eye,
  FileText,
  Image,
  MapPin,
  Clock,
  Building,
  Signature,
  Truck,
  Maximize2,
  Gauge,
  Sun,
  Lock,
  Tablet,
  PenTool,
  Shield
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useMemo, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { SeatbeltFormPreview } from "@/components/seatbelt-form-preview";
import { Check, X, Pencil } from "lucide-react";
import { FatigueEvidenceDialog } from "@/components/sidak/fatigue-evidence-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface SidakSession {
  id: string;
  type: 'Fatigue' | 'Roster' | 'Seatbelt' | 'Rambu' | 'Antrian' | 'APD' | 'Jarak' | 'Kecepatan' | 'Pencahayaan' | 'LOTO' | 'Digital' | 'Workshop' | 'Behavior' | 'Intercom' | 'ChargingStation' | 'SopKritis';
  tanggal: string;
  waktu: string;
  shift: string;
  lokasi: string;
  departemen: string;
  area: string | null;
  perusahaan: string | null;
  totalSampel: number;
  observerCount: number;
  observers: string;
  createdBy: string | null;
  supervisorName: string;
  createdAt: string;
  photos?: string[]; // evidence foto kegiatan (URL) — utk kolom link di export Excel
}

interface SupervisorStats {
  name: string;
  fatigue: number;
  roster: number;
  seatbelt: number;
  rambu: number;
  antrian: number;
  apd: number;
  jarak: number;
  kecepatan: number;
  pencahayaan: number;
  loto: number;
  digital: number;
  workshop: number;
  behavior: number;
  intercom: number;
  standjack: number;
  hydraulicjack: number;
  bottlejack: number;
  apar: number;
  impact: number;
  mesinlas: number;
  mesinkompresor: number;
  gerindaduduk: number;
  fuelstorage: number;
  total: number;
}

interface RecapData {
  sessions: SidakSession[];
  stats: {
    totalSidak: number;
    totalFatigue: number;
    totalRoster: number;
    totalSeatbelt: number;
    totalRambu: number;
    totalAntrian: number;
    totalApd: number;
    totalJarak: number;
    totalKecepatan: number;
    totalPencahayaan: number;
    totalLoto: number;
    totalDigital: number;
    totalWorkshop: number;
    totalBehavior: number;
    totalIntercom: number;
    totalStandJack: number;
    totalHydraulicJack: number;
    totalBottleJack: number;
    totalApar: number;
    totalImpact: number;
    totalMesinLas: number;
    totalMesinKompresor: number;
    totalGerindaDuduk: number;
    totalFuelStorage: number;
    totalKaryawanDiperiksa: number;
    supervisorStats: SupervisorStats[];
  };
}

interface FatigueRecord {
  id: string;
  ordinal: number;
  nama: string;
  nik: string;
  jabatan: string;
  nomorLambung: string | null;
  jamTidur: number;
  konsumiObat: boolean;
  masalahPribadi: boolean;
  pemeriksaanRespon: boolean;
  pemeriksaanKonsentrasi: boolean;
  pemeriksaanKesehatan: boolean;
  karyawanSiapBekerja: boolean;
  fitUntukBekerja: boolean;
  istirahatDanMonitor: boolean;
  istirahatLebihdariSatuJam: boolean;
  tidakBolehBekerja: boolean;
  employeeSignature: string | null;
  catatanIntervensi?: string | null;
  buktiIntervensi?: string | null;
  pvtMeanRT?: number | null;
}

interface RosterRecord {
  id: string;
  ordinal: number;
  nama: string;
  nik: string;
  nomorLambung: string | null;
  rosterSesuai: boolean;
  keterangan: string | null;
}

interface SeatbeltRecord {
  id: string;
  ordinal: number;
  nama: string;
  nik: string;
  nomorLambung: string | null;
  perusahaan: string;
  seatbeltDriverCondition: boolean;
  seatbeltPassengerCondition: boolean;
  seatbeltDriverUsage: boolean;
  seatbeltPassengerUsage: boolean;
  keterangan: string | null;
}

interface RambuRecord {
  id: string;
  ordinal: number;
  nama: string;
  noKendaraan: string;
  perusahaan: string;
  rambuStop: boolean;
  rambuGiveWay: boolean;
  rambuKecepatanMax: boolean;
  rambuLaranganMasuk: boolean;
  rambuLaranganParkir: boolean;
  rambuWajibHelm: boolean;
  rambuLaranganUTurn: boolean;
  keterangan: string | null;
}

interface JarakRecord {
  id: string;
  ordinal: number;
  noKendaraan: string;
  tipeUnit: string;
  lokasiMuatan: string | null;
  lokasiKosongan: string | null;
  nomorLambungUnit: string | null;
  jarakAktualKedua: string | null;
  keterangan: string | null;
}

interface KecepatanRecord {
  id: string;
  ordinal: number;
  noKendaraan: string;
  tipeUnit: string;
  arahMuatan: boolean;
  arahKosongan: boolean;
  kecepatanMph: string | null;
  kecepatanKph: string | null;
  keterangan: string | null;
}

interface PencahayaanRecord {
  id: string;
  ordinal: number;
  titikPengambilan: string;
  sumberPenerangan: string;
  jenisPengukuran: string;
  intensitasLux: number;
  jarakDariSumber: string | null;
  secaraVisual: string;
  keterangan: string | null;
}

interface LotoRecord {
  id: string;
  ordinal: number;
  namaKaryawan: string;
  perusahaan: string;
  jenisPekerjaan: string;
  lokasiIsolasi: string;
  nomorGembok: string;
  jamPasang: string;
  keterangan: string | null;
}

interface DigitalRecord {
  id: string;
  ordinal: number;
  namaPengawas: string;
  nik: string | null;
  jabatan: string | null;
  appUsage: boolean;
  timelyReporting: boolean;
  feedbackQuality: string | null;
  keterangan: string | null;
}

interface WorkshopRecord {
  id: string;
  ordinal: number;
  namaAlat: string;
  kondisi: boolean;
  kebersihan: boolean;
  sertifikasi: boolean;
  keterangan: string | null;
}

interface BehaviorRecord {
  id: string;
  ordinal: number;
  nama: string;
  nik: string;
  nomorLambung: string | null;
  position: string | null;
  tipeUnit: string | null;
  kecepatan: boolean;
  sabukPengaman: boolean;
  handphone: boolean;
  fatigue: boolean;
  merokok: boolean;
  makanMinum: boolean;
  rambuLaluLintas: boolean;
  markaJalan: boolean;
  jarakAman: boolean;
  stopSempurna: boolean;
  lampuUtama: boolean;
  lampuRotari: boolean;
  lampuSign: boolean;
  klakson: boolean;
  keterangan: string | null;
  tindakan: string;
}

interface Observer {
  id: string;
  nama: string;
  nik: string | null;
  perusahaan: string | null;
  jabatan: string | null;
  tandaTangan: string | null;
}
interface IntercomRecord {
  id: string;
  ordinal: number;
  nama: string;
  nik: string | null;
  perusahaan: string | null;
  q1: boolean;
  q2: boolean;
  q3: boolean;
  q4: boolean;
  q5: boolean;
  q6: boolean;
  q7: boolean;
  waktuRespons: number;
  keterangan: string | null;
}

interface SessionDetail {
  session: SidakSession & {
    waktuMulai?: string;
    waktuSelesai?: string;
    area?: string;
    perusahaan?: string;
    totalSampel?: number;
    photos?: string[];
  };
  records: FatigueRecord[] | RosterRecord[] | SeatbeltRecord[] | RambuRecord[] | AntrianRecord[] | JarakRecord[] | KecepatanRecord[] | PencahayaanRecord[] | LotoRecord[] | DigitalRecord[] | WorkshopRecord[] | BehaviorRecord[] | IntercomRecord[];
  observers: Observer[];
}

const CheckIcon = ({ checked }: { checked: boolean }) => (
  <span className={`text-lg font-bold ${checked ? 'text-green-600' : 'text-red-500'}`}>
    {checked ? '✓' : '✗'}
  </span>
);

function FatigueFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: FatigueRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      {/* Header */}
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">FORM PEMERIKSAAN FATIGUE</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Waktu Mulai:</span> {session.waktuMulai}</div>
        <div><span className="font-semibold">Waktu Selesai:</span> {session.waktuSelesai}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Area:</span> {session.area}</div>
        <div><span className="font-semibold">Departemen:</span> {session.departemen}</div>
        <div><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-1 w-8">No</th>
              <th className="border p-1">Nama</th>
              <th className="border p-1">NIK</th>
              <th className="border p-1">Jabatan</th>
              <th className="border p-1 w-12">Jam Tidur</th>
              <th className="border p-1 w-10">Obat</th>
              <th className="border p-1 w-10">Masalah</th>
              <th className="border p-1 w-16">PVT (ms)</th>
              <th className="border p-1 w-10">Fokus</th>
              <th className="border p-1 w-10">Sehat</th>
              <th className="border p-1 w-10">Siap</th>
              <th className="border p-1 w-10">FTW</th>
              <th className="border p-1 w-16">TTD</th>
              <th className="border p-1 w-10">Intv</th>
              <th className="border p-1 w-10">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-1 text-center">{record.ordinal}</td>
                <td className="border p-1 font-medium">{record.nama}</td>
                <td className="border p-1">{record.nik}</td>
                <td className="border p-1">{record.jabatan}</td>
                <td className="border p-1 text-center">{record.jamTidur}h</td>
                <td className="border p-1 text-center"><CheckIcon checked={record.konsumiObat} /></td>
                <td className="border p-1 text-center"><CheckIcon checked={record.masalahPribadi} /></td>
                <td className="border p-1 text-center">
                  {record.pvtMeanRT != null ? (
                    <span className={`font-bold text-xs ${record.pvtMeanRT <= 500 ? 'text-green-600' : record.pvtMeanRT <= 700 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {record.pvtMeanRT} ms
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="border p-1 text-center"><CheckIcon checked={record.pemeriksaanKonsentrasi} /></td>
                <td className="border p-1 text-center"><CheckIcon checked={record.pemeriksaanKesehatan} /></td>
                <td className="border p-1 text-center"><CheckIcon checked={record.karyawanSiapBekerja} /></td>
                <td className="border p-1 text-center"><CheckIcon checked={record.fitUntukBekerja} /></td>
                <td className="border p-1">
                  {record.employeeSignature && (
                    <img src={record.employeeSignature} alt="TTD" className="h-8 w-full object-contain" />
                  )}
                </td>
                <td className="border p-1 text-center">
                  {record.catatanIntervensi || record.buktiIntervensi ? (
                    <Badge variant="default" className="bg-blue-600 text-[8px] px-1 h-3">YA</Badge>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
                <td className="border p-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-600 hover:text-blue-800"
                    onClick={() => (window as any).onEditFatigueRecord?.(record)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tindak Lanjut Section (New) */}
      <div className="mt-4 space-y-3">
        <h3 className="font-semibold text-sm border-b pb-1">Tindak Lanjut & Intervensi:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.filter(r => r.catatanIntervensi || r.buktiIntervensi).map(record => (
            <div key={`tl-${record.id}`} className="border rounded p-3 bg-blue-50/30">
              <div className="flex justify-between items-start mb-2">
                <p className="font-medium text-xs">{record.nama}</p>
                <Badge variant="outline" className="text-[10px] bg-blue-100">Intervensi</Badge>
              </div>
              <div className="flex gap-3">
                {record.buktiIntervensi && (
                  <div className="w-20 h-20 border rounded overflow-hidden flex-shrink-0 bg-white">
                    <img src={record.buktiIntervensi} alt="Bukti" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-black font-medium leading-relaxed">{record.catatanIntervensi || 'Tanpa catatan'}</p>
                </div>
              </div>
            </div>
          ))}
          {records.filter(r => r.catatanIntervensi || r.buktiIntervensi).length === 0 && (
            <p className="text-xs text-gray-500 italic">Belum ada data tindak lanjut yang diinput.</p>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="text-xs text-gray-600 grid grid-cols-2 gap-2 border p-2 rounded bg-gray-50">
        <div><span className="font-semibold">Obat:</span> Konsumsi Obat</div>
        <div><span className="font-semibold">Masalah:</span> Masalah Pribadi</div>
        <div><span className="font-semibold">PVT (ms):</span> Waktu Reaksi PVT (≤500ms Baik, ≤700ms Sedang, &gt;700ms Lambat)</div>
        <div><span className="font-semibold">Fokus:</span> Konsentrasi Baik</div>
        <div><span className="font-semibold">Sehat:</span> Kesehatan Baik</div>
        <div><span className="font-semibold">Siap:</span> Siap Bekerja</div>
        <div><span className="font-semibold">FTW:</span> Fit to Work</div>
        <div><span className="font-semibold">TTD:</span> Tanda Tangan</div>
      </div>

      {/* Observers */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik} - {obs.jabatan}</p>
                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RambuFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: RambuRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      {/* Header */}
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">OBSERVASI KEPATUHAN RAMBU</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari - HSE Department</p>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Waktu:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div className="col-span-2"><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
        <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 w-10">No</th>
              <th className="border p-2">Nama</th>
              <th className="border p-2">No Kendaraan</th>
              <th className="border p-2">Perusahaan</th>
              <th className="border p-2 w-16">Stop</th>
              <th className="border p-2 w-16">Give Way</th>
              <th className="border p-2 w-16">Max Speed</th>
              <th className="border p-2 w-16">No Entry</th>
              <th className="border p-2 w-16">No Parking</th>
              <th className="border p-2 w-16">Helmet</th>
              <th className="border p-2 w-16">No U-Turn</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 text-center">{record.ordinal}</td>
                <td className="border p-2 font-medium">{record.nama}</td>
                <td className="border p-2">{record.noKendaraan}</td>
                <td className="border p-2 text-xs">{record.perusahaan}</td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuStop ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuStop ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuGiveWay ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuGiveWay ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuKecepatanMax ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuKecepatanMax ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuLaranganMasuk ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuLaranganMasuk ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuLaranganParkir ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuLaranganParkir ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuWajibHelm ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuWajibHelm ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.rambuLaranganUTurn ? 'text-green-600' : 'text-red-600'}`}>
                    {record.rambuLaranganUTurn ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-gray-600">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 text-center border p-3 rounded bg-gray-50">
        <div>
          <p className="text-2xl font-bold text-gray-800">{records.length}</p>
          <p className="text-xs text-gray-500">Total Diperiksa</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">
            {records.filter(r => [r.rambuStop, r.rambuGiveWay, r.rambuKecepatanMax, r.rambuLaranganMasuk, r.rambuLaranganParkir, r.rambuWajibHelm, r.rambuLaranganUTurn].every(v => v)).length}
          </p>
          <p className="text-xs text-gray-500">Full Compliant</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-600">
            {records.filter(r => {
              const values = [r.rambuStop, r.rambuGiveWay, r.rambuKecepatanMax, r.rambuLaranganMasuk, r.rambuLaranganParkir, r.rambuWajibHelm, r.rambuLaranganUTurn];
              return values.some(v => v) && !values.every(v => v);
            }).length}
          </p>
          <p className="text-xs text-gray-500">Partial Compliant</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">
            {records.filter(r => [r.rambuStop, r.rambuGiveWay, r.rambuKecepatanMax, r.rambuLaranganMasuk, r.rambuLaranganParkir, r.rambuWajibHelm, r.rambuLaranganUTurn].every(v => !v)).length}
          </p>
          <p className="text-xs text-gray-500">Non Compliant</p>
        </div>
      </div>

      {/* Observers */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik} - {obs.jabatan}</p>
                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RosterFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: RosterRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      {/* Header */}
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">FORM PEMERIKSAAN KESESUAIAN ROSTER</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Perusahaan:</span> {session.perusahaan}</div>
        <div><span className="font-semibold">Departemen:</span> {session.departemen}</div>
        <div><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
        <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 w-12">No</th>
              <th className="border p-2">Nama Driver</th>
              <th className="border p-2">NIK</th>
              <th className="border p-2">Nomor Lambung</th>
              <th className="border p-2 w-24">Roster Sesuai</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 text-center">{record.ordinal}</td>
                <td className="border p-2 font-medium">{record.nama}</td>
                <td className="border p-2">{record.nik}</td>
                <td className="border p-2">{record.nomorLambung || '-'}</td>
                <td className="border p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${record.rosterSesuai ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {record.rosterSesuai ? 'YA' : 'TIDAK'}
                  </span>
                </td>
                <td className="border p-2 text-gray-600">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center border p-3 rounded bg-gray-50">
        <div>
          <p className="text-2xl font-bold text-gray-800">{records.length}</p>
          <p className="text-xs text-gray-500">Total Diperiksa</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">{records.filter(r => r.rosterSesuai).length}</p>
          <p className="text-xs text-gray-500">Roster Sesuai</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">{records.filter(r => !r.rosterSesuai).length}</p>
          <p className="text-xs text-gray-500">Tidak Sesuai</p>
        </div>
      </div>

      {/* Observers */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik} - {obs.jabatan}</p>
                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface AntrianRecord {
  id: string;
  ordinal: number;
  namaNik: string;
  noLambung: string | null;
  handbrakeAktif: boolean;
  jarakUnitAman: boolean;
  keterangan: string | null;
}

function AntrianFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: AntrianRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      {/* Header */}
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">FORM OBSERVASI ANTRIAN UNIT</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Perusahaan:</span> {session.perusahaan}</div>
        <div><span className="font-semibold">Departemen:</span> {session.departemen}</div>
        <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 w-12">No</th>
              <th className="border p-2">Nama - NIK</th>
              <th className="border p-2">No Lambung</th>
              <th className="border p-2 w-24">Handbrake</th>
              <th className="border p-2 w-24">Jarak Aman</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 text-center">{record.ordinal}</td>
                <td className="border p-2 font-medium">{record.namaNik}</td>
                <td className="border p-2">{record.noLambung || '-'}</td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.handbrakeAktif ? 'text-green-600' : 'text-red-600'}`}>
                    {record.handbrakeAktif ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.jarakUnitAman ? 'text-green-600' : 'text-red-600'}`}>
                    {record.jarakUnitAman ? '✓' : '✗'}
                  </span>
                </td>
                <td className="border p-2 text-gray-600">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observers */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.jabatan}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function JarakFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: JarakRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      {/* Header */}
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">FORM OBSERVASI JARAK AMAN</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      {/* Session Info */}
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
        <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-1 w-8">No</th>
              <th className="border p-1">No Unit</th>
              <th className="border p-1">Tipe</th>
              <th className="border p-1">Lokasi Muatan</th>
              <th className="border p-1">Lokasi Kosongan</th>
              <th className="border p-1">Unit Depan</th>
              <th className="border p-1">Jarak (m)</th>
              <th className="border p-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-1 text-center">{record.ordinal}</td>
                <td className="border p-1 font-medium">{record.noKendaraan}</td>
                <td className="border p-1 text-center">{record.tipeUnit}</td>
                <td className="border p-1">{record.lokasiMuatan || '-'}</td>
                <td className="border p-1">{record.lokasiKosongan || '-'}</td>
                <td className="border p-1">{record.nomorLambungUnit || '-'}</td>
                <td className="border p-1 text-center font-bold">{record.jarakAktualKedua || '-'}</td>
                <td className="border p-1 text-gray-500">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Observers */}
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function KecepatanFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: KecepatanRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">OBSERVASI KECEPATAN BERKENDARA</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Sub Lokasi:</span> {session.area || '-'}</div>
        <div><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-1 w-8">No</th>
              <th className="border p-1">No Unit</th>
              <th className="border p-1">Tipe</th>
              <th className="border p-1 w-16">Muatan</th>
              <th className="border p-1 w-16">Kosongan</th>
              <th className="border p-1 w-16">MPH</th>
              <th className="border p-1 w-16">KPH</th>
              <th className="border p-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-1 text-center">{record.ordinal}</td>
                <td className="border p-1 font-medium">{record.noKendaraan}</td>
                <td className="border p-1 text-center">{record.tipeUnit}</td>
                <td className="border p-1 text-center"><CheckIcon checked={record.arahMuatan} /></td>
                <td className="border p-1 text-center"><CheckIcon checked={record.arahKosongan} /></td>
                <td className="border p-1 text-center">{record.kecepatanMph || '-'}</td>
                <td className="border p-1 text-center font-bold">{record.kecepatanKph || '-'}</td>
                <td className="border p-1 text-gray-500">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik ? `${obs.nik} - ` : ''}{obs.perusahaan || ''}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PencahayaanFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: PencahayaanRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">PEMERIKSAAN PENCAHAYAAN</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Departemen:</span> {session.departemen || '-'}</div>
        <div><span className="font-semibold">Penanggung Jawab:</span> {session.supervisorName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-1 w-8">No</th>
              <th className="border p-1">Titik Pengambilan</th>
              <th className="border p-1">Sumber Penerangan</th>
              <th className="border p-1">Jenis Pengukuran</th>
              <th className="border p-1">Intensitas (Lux)</th>
              <th className="border p-1">Jarak Sumber</th>
              <th className="border p-1">Visual</th>
              <th className="border p-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-1 text-center">{record.ordinal}</td>
                <td className="border p-1 font-medium">{record.titikPengambilan}</td>
                <td className="border p-1">{record.sumberPenerangan}</td>
                <td className="border p-1 text-center">{record.jenisPengukuran}</td>
                <td className="border p-1 text-center font-bold">{record.intensitasLux}</td>
                <td className="border p-1 text-center">{record.jarakDariSumber || '-'}</td>
                <td className="border p-1 text-center">{record.secaraVisual}</td>
                <td className="border p-1 text-gray-500">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pengamat:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik ? `${obs.nik} - ` : ''}{obs.perusahaan || ''}</p>
              </div>
              {obs.tandaTangan && (
                <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 border rounded object-contain" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LotoFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: LotoRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold uppercase">INSPEKSI KEPATUHAN LOTO (LOCK OUT TAG OUT)</h2>
        <p className="text-gray-600 font-medium">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded bg-gray-50/50">
        <div><span className="font-semibold text-gray-500">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold text-gray-500">Jam:</span> {session.waktu}</div>
        <div><span className="font-semibold text-gray-500">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold text-gray-500">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold text-gray-500">Departemen:</span> {session.departemen || '-'}</div>
        <div><span className="font-semibold text-gray-500">Supervisor:</span> {session.supervisorName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-orange-50">
              <th className="border p-2 w-8">No</th>
              <th className="border p-2">Nama Karyawan</th>
              <th className="border p-2">Perusahaan</th>
              <th className="border p-2">Jenis Pekerjaan</th>
              <th className="border p-2">Lokasi Isolasi</th>
              <th className="border p-2">No. Gembok</th>
              <th className="border p-2">Jam Pasang</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 text-center font-medium">{record.ordinal}</td>
                <td className="border p-2 font-bold">{record.namaKaryawan}</td>
                <td className="border p-2">{record.perusahaan}</td>
                <td className="border p-2">{record.jenisPekerjaan}</td>
                <td className="border p-2">{record.lokasiIsolasi}</td>
                <td className="border p-2 text-center font-mono font-bold text-orange-600">{record.nomorGembok}</td>
                <td className="border p-2 text-center">{record.jamPasang}</td>
                <td className="border p-2 text-gray-500 italic">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Signature className="h-4 w-4 text-primary" />
          Observer / Pengamat:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded bg-white">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik ? `${obs.nik} - ` : ''}{obs.perusahaan || ''}</p>
                <p className="text-xs text-blue-600 font-medium">{obs.jabatan || ''}</p>
              </div>
              {obs.tandaTangan && (
                <div className="p-1 border rounded bg-gray-50">
                  <img src={obs.tandaTangan} alt="TTD" className="h-12 w-20 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DigitalFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: DigitalRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm font-sans">
      <div className="text-center border-b-2 border-blue-600 pb-3">
        <h2 className="text-xl font-extrabold text-blue-800">INSPEKSI PENGAWAS DIGITAL</h2>
        <p className="text-gray-600 font-semibold">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-xl bg-blue-50/30">
        <div className="flex flex-col"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Tanggal</span> <span className="font-medium text-gray-900">{session.tanggal}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Jam</span> <span className="font-medium text-gray-900">{session.waktu}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Shift</span> <span className="font-medium text-gray-900">{session.shift}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Lokasi</span> <span className="font-medium text-gray-900">{session.lokasi}</span></div>
        <div className="col-span-2 flex flex-col pt-2 border-t border-blue-100"><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Supervisor</span> <span className="font-bold text-gray-900">{session.supervisorName}</span></div>
      </div>

      <div className="overflow-hidden border border-blue-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="p-3 w-8 text-center border-r border-blue-500">No</th>
              <th className="p-3 text-left border-r border-blue-500">Nama Pengawas</th>
              <th className="p-3 text-left border-r border-blue-500">NIK</th>
              <th className="p-3 text-left border-r border-blue-500">Jabatan</th>
              <th className="p-3 w-20 text-center border-r border-blue-500">App Usage</th>
              <th className="p-3 w-20 text-center border-r border-blue-500">Timely</th>
              <th className="p-3 text-left border-r border-blue-500">Quality</th>
              <th className="p-3 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'} hover:bg-blue-50/50 transition-colors`}>
                <td className="p-3 text-center border-r border-blue-100 font-bold text-blue-700">{record.ordinal}</td>
                <td className="p-3 font-extrabold text-gray-900 border-r border-blue-100">{record.namaPengawas}</td>
                <td className="p-3 font-medium text-gray-600 border-r border-blue-100">{record.nik || '-'}</td>
                <td className="p-3 text-gray-600 border-r border-blue-100">{record.jabatan || '-'}</td>
                <td className="p-3 text-center border-r border-blue-100">
                  <div className={`inline-flex items-center justify-center p-1 rounded-full ${record.appUsage ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <CheckIcon checked={record.appUsage} />
                  </div>
                </td>
                <td className="p-3 text-center border-r border-blue-100">
                  <div className={`inline-flex items-center justify-center p-1 rounded-full ${record.timelyReporting ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <CheckIcon checked={record.timelyReporting} />
                  </div>
                </td>
                <td className="p-3 font-semibold text-blue-800 border-r border-blue-100">{record.feedbackQuality}</td>
                <td className="p-3 text-gray-500 italic">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-blue-200 rounded-xl p-4 bg-gray-50/30">
        <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
          <Signature className="h-5 w-5" />
          Observer / Pengamat:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-center gap-4 border border-blue-100 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="font-extrabold text-gray-900">{obs.nama}</p>
                <div className="flex flex-col mt-1">
                  <p className="text-xs font-bold text-blue-600">{obs.nik || '-'}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">{obs.perusahaan || 'BIB'}</p>
                </div>
              </div>
              {obs.tandaTangan && (
                <div className="p-2 border border-blue-50 rounded-lg bg-gray-50">
                  <img src={obs.tandaTangan} alt="TTD" className="h-16 w-24 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkshopFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: WorkshopRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm font-sans">
      <div className="text-center border-b-2 border-orange-600 pb-3">
        <h2 className="text-xl font-extrabold text-orange-800">CHECKLIST PERALATAN WORKSHOP</h2>
        <p className="text-gray-600 font-semibold">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-xl bg-orange-50/30">
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Tanggal</span> <span className="font-medium text-gray-900">{session.tanggal}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Jam</span> <span className="font-medium text-gray-900">{session.waktu}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Nama Workshop</span> <span className="font-medium text-gray-900">{session.namaWorkshop || "-"}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Shift</span> <span className="font-medium text-gray-900">{session.shift}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Lokasi</span> <span className="font-medium text-gray-900">{session.lokasi}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">PJ Area</span> <span className="font-medium text-gray-900">{session.penanggungJawabArea || "-"}</span></div>
        <div className="col-span-2 flex flex-col pt-2 border-t border-orange-100"><span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Supervisor</span> <span className="font-bold text-gray-900">{session.supervisorName}</span></div>
      </div>

      <div className="overflow-hidden border border-orange-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-orange-600 text-white">
              <th className="p-3 w-8 text-center border-r border-orange-500">No</th>
              <th className="p-3 text-left border-r border-orange-500">Nama Alat</th>
              <th className="p-3 w-16 text-center border-r border-orange-500">Kondisi</th>
              <th className="p-3 w-16 text-center border-r border-orange-500">Bersih</th>
              <th className="p-3 w-16 text-center border-r border-orange-500">Sertif</th>
              <th className="p-3 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-orange-50/20'} hover:bg-orange-50/50 transition-colors`}>
                <td className="p-3 text-center border-r border-orange-100 font-bold text-orange-700">{record.ordinal}</td>
                <td className="p-3 font-extrabold text-gray-900 border-r border-orange-100">{record.namaAlat}</td>
                <td className="p-3 text-center border-r border-orange-100">
                  <div className={`inline-flex items-center justify-center p-1 rounded-full ${record.kondisi ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <CheckIcon checked={record.kondisi} />
                  </div>
                </td>
                <td className="p-3 text-center border-r border-orange-100">
                  <div className={`inline-flex items-center justify-center p-1 rounded-full ${record.kebersihan ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <CheckIcon checked={record.kebersihan} />
                  </div>
                </td>
                <td className="p-3 text-center border-r border-orange-100">
                  <div className={`inline-flex items-center justify-center p-1 rounded-full ${record.sertifikasi ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <CheckIcon checked={record.sertifikasi} />
                  </div>
                </td>
                <td className="p-3 text-gray-500 italic">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-orange-200 rounded-xl p-4 bg-gray-50/30">
        <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
          <Signature className="h-5 w-5" />
          Observer / Pengamat:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-center gap-4 border border-orange-100 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="font-extrabold text-gray-900">{obs.nama}</p>
                <div className="flex flex-col mt-1">
                  <p className="text-xs font-bold text-orange-600">{obs.nik || '-'}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">{obs.perusahaan || 'BIB'}</p>
                </div>
              </div>
              {obs.tandaTangan && (
                <div className="p-2 border border-orange-50 rounded-lg bg-gray-50">
                  <img src={obs.tandaTangan} alt="TTD" className="h-16 w-24 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BehaviorFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: BehaviorRecord[];
  observers: Observer[]
}) {
  const renderViolation = (val: boolean) => val ? <span className="text-red-600 font-bold">✓</span> : null;
  const renderAction = (val: boolean) => val ? <span className="text-green-600 font-bold">✓</span> : null;

  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">OBSERVASI TINGKAH LAKU PENGEMUDI</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lestari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded bg-gray-50">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Waktu:</span> {session.waktuMulai} - {session.waktuSelesai}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div className="col-span-2"><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-[10px]">
          <thead>
            <tr className="bg-blue-600 text-white leading-tight">
              <th className="border p-1" rowSpan={2}>No</th>
              <th className="border p-1" rowSpan={2}>Nama Driver</th>
              <th className="border p-1" rowSpan={2}>No Unit</th>
              <th className="border p-1" colSpan={10}>Parameter Perilaku</th>
              <th className="border p-1" colSpan={8}>Tindakan</th>
            </tr>
            <tr className="bg-blue-500 text-white text-[8px] uppercase">
              <th className="border p-1">MT</th>
              <th className="border p-1">SM</th>
              <th className="border p-1">MB</th>
              <th className="border p-1">KM</th>
              <th className="border p-1">PM</th>
              <th className="border p-1">KJ</th>
              <th className="border p-1">RRL</th>
              <th className="border p-1">TRR</th>
              <th className="border p-1">AFA</th>
              <th className="border p-1">MTS</th>
              <th className="border p-1">ETW</th>
              <th className="border p-1">MU</th>
              <th className="border p-1">IB</th>
              <th className="border p-1">S/M</th>
              <th className="border p-1">PA</th>
              <th className="border p-1">GD</th>
              <th className="border p-1">MR</th>
              <th className="border p-1">KP</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record: any, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-1 text-center font-bold">{record.ordinal}</td>
                <td className="border p-1 font-bold">{record.namaDriver || record.nama}</td>
                <td className="border p-1 text-center text-[8px] text-gray-500 font-mono">{record.nomorLambung || '-'}</td>
                <td className="border p-1 text-center">{renderViolation(record.mataTertutup)}</td>
                <td className="border p-1 text-center">{renderViolation(record.seringMengedip)}</td>
                <td className="border p-1 text-center">{renderViolation(record.menguapBerulang)}</td>
                <td className="border p-1 text-center">{renderViolation(record.kepalaMengangguk)}</td>
                <td className="border p-1 text-center">{renderViolation(record.posturMembungkuk)}</td>
                <td className="border p-1 text-center">{renderViolation(record.keluarJalur)}</td>
                <td className="border p-1 text-center">{renderViolation(record.reaksiRadioLambat)}</td>
                <td className="border p-1 text-center">{renderViolation(record.tidakMeresponRadio)}</td>
                <td className="border p-1 text-center">{renderViolation(record.alarmFatigueFmsAktif)}</td>
                <td className="border p-1 text-center">{renderViolation(record.mengemudiTidakStabil)}</td>
                <td className="border p-1 text-center">{renderAction(record.edukasiTwoWay)}</td>
                <td className="border p-1 text-center">{renderAction(record.monitoringUlang)}</td>
                <td className="border p-1 text-center">{renderAction(record.instruksiBerhenti)}</td>
                <td className="border p-1 text-center">{renderAction(record.stretchingMinum)}</td>
                <td className="border p-1 text-center">{renderAction(record.parkirAman)}</td>
                <td className="border p-1 text-center">{renderAction(record.gantiDriver)}</td>
                <td className="border p-1 text-center">{renderAction(record.mandatoryRest)}</td>
                <td className="border p-1 text-center">{renderAction(record.koordinasiPengawas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="text-xs text-gray-500 border rounded p-3 bg-blue-50/30">
          <h3 className="font-semibold text-blue-700 mb-2">Keterangan Singkatan:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-2 gap-y-1 text-[9px]">
            <p><strong>[MT]</strong> Mata Tertutup &gt; 2d</p>
            <p><strong>[SM]</strong> Sering Mengedip</p>
            <p><strong>[MB]</strong> Menguap Berulang</p>
            <p><strong>[KM]</strong> Kepala Mengangguk</p>
            <p><strong>[PM]</strong> Postur Membungkuk</p>
            <p><strong>[KJ]</strong> Keluar Jalur / Zig-zag</p>
            <p><strong>[RRL]</strong> Reaksi Radio Lambat</p>
            <p><strong>[TRR]</strong> Tidak Respon Radio</p>
            <p><strong>[AFA]</strong> Alarm FMS Aktif</p>
            <p><strong>[MTS]</strong> Mengemudi T.Stabil</p>
            <p><strong>[ETW]</strong> Edukasi Two-Way</p>
            <p><strong>[MU]</strong> Monitoring Ulang</p>
            <p><strong>[IB]</strong> Instruksi Berhenti</p>
            <p><strong>[S/M]</strong> Stretching / Minum</p>
            <p><strong>[PA]</strong> Parkir Aman</p>
            <p><strong>[GD]</strong> Ganti Driver</p>
            <p><strong>[MR]</strong> Mandatory Rest</p>
            <p><strong>[KP]</strong> Koord. Pengawas</p>
          </div>
        </div>
        <div className="border rounded p-3 bg-gray-50">
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <Signature className="h-4 w-4 text-primary" />
            Observer / Pengamat:
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {observers.map((obs) => (
              <div key={obs.id} className="flex flex-col gap-1 border p-2 rounded bg-white">
                <div>
                  <p className="font-bold text-[10px]">{obs.nama}</p>
                  <p className="text-[9px] text-gray-500">{obs.nik || '-'}</p>
                </div>
                {obs.tandaTangan && (
                  <img src={obs.tandaTangan} alt="TTD" className="h-8 object-contain mt-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ChargingStationFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: any[];
  observers: Observer[]
}) {
  const QUESTIONS = [
    { key: "posisiAman", label: "Posisi DT Aman" },
    { key: "kabelSesuai", label: "Kabel Sesuai" },
    { key: "apdLengkap", label: "APD Lengkap" },
    { key: "tetapDiKabin", label: "Di Dalam Kabin" },
    { key: "tidakMerokok", label: "Tidak Merokok" },
    { key: "merapikanKabel", label: "Rapikan Kabel" },
  ];
  const mark = (val: boolean) => val
    ? <span className="text-green-600 font-bold">V</span>
    : <span className="text-red-600 font-bold">X</span>;

  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">OBSERVASI KEPATUHAN DRIVER DI AREA CHARGING STATION</h2>
        <p className="text-gray-600">PT Borneo Indobara</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded bg-gray-50">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Waktu:</span> {session.waktuMulai} - {session.waktuSelesai}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div className="col-span-2"><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-[10px]">
          <thead>
            <tr className="bg-amber-500 text-white leading-tight">
              <th className="border p-1">No</th>
              <th className="border p-1">Nama</th>
              <th className="border p-1">No Lambung</th>
              {QUESTIONS.map((q, i) => (
                <th key={q.key} className="border p-1" title={q.label}>{i + 1}</th>
              ))}
              <th className="border p-1">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records?.map((r, idx) => (
              <tr key={r.id || idx}>
                <td className="border p-1 text-center">{idx + 1}</td>
                <td className="border p-1">{r.namaDriver}</td>
                <td className="border p-1">{r.nomorLambung}</td>
                {QUESTIONS.map((q) => (
                  <td key={q.key} className="border p-1 text-center">{mark(!!r[q.key])}</td>
                ))}
                <td className="border p-1">{r.keterangan || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded p-3 bg-gray-50 text-[9px]">
        <p className="font-semibold text-amber-700 mb-1">Keterangan kolom (V = Ya/Patuh, X = Tidak):</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-0.5">
          {QUESTIONS.map((q, i) => (
            <p key={q.key}><strong>{i + 1}.</strong> {q.label}</p>
          ))}
        </div>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <Signature className="h-4 w-4 text-primary" />
          Pemantau:
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {observers.map((obs) => (
            <div key={obs.id} className="flex flex-col gap-1 border p-2 rounded bg-white">
              <div>
                <p className="font-bold text-[10px]">{obs.nama}</p>
                <p className="text-[9px] text-gray-500">{(obs as any).perusahaan || '-'}</p>
              </div>
              {((obs as any).signatureDataUrl || obs.tandaTangan) && (
                <img src={(obs as any).signatureDataUrl || obs.tandaTangan} alt="TTD" className="h-8 object-contain mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SopKritisFormPreview({ session, pengendalian, langkah, observers }: {
  session: any;
  pengendalian: any[];
  langkah: any[];
  observers: Observer[];
}) {
  const statusBadge = (s: string) => (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${s === 'Ya' ? 'bg-green-100 text-green-700' : s === 'Tidak' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{s}</span>
  );
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">RINGKASAN PENGENDALIAN DAN SOP KRITIKAL</h2>
        <p className="text-gray-600">PT Borneo Indobara</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm border p-3 rounded bg-gray-50">
        <div className="col-span-2"><span className="font-semibold">Judul SOP:</span> {session.judulSop}</div>
        <div><span className="font-semibold">Departemen:</span> {session.departemen || '-'}</div>
        <div><span className="font-semibold">Risiko:</span> {session.risiko || '-'}</div>
        <div><span className="font-semibold">NR0:</span> {session.nilaiRisikoMurni || '-'} ({session.tingkatRisiko || '-'})</div>
        <div><span className="font-semibold">Supervisor:</span> {session.supervisorName}</div>
      </div>

      <div>
        <h3 className="font-semibold text-amber-700 mb-1">Pengendalian Kritikal</h3>
        <div className="space-y-1">
          {(pengendalian || []).map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs border-b py-1">
              <span className="text-gray-400 font-bold">{i + 1}.</span>
              <span className="flex-1">{it.uraian}</span>{statusBadge(it.status)}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-amber-700 mb-1">Item / Langkah Kritikal</h3>
        <div className="space-y-1">
          {(langkah || []).map((it, i) => (
            <div key={i} className="flex items-center gap-2 text-xs border-b py-1">
              <span className="text-gray-400 font-bold">{i + 1}.</span>
              <span className="flex-1">{it.uraian}</span>{statusBadge(it.status)}
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded p-3 bg-gray-50">
        <h3 className="font-semibold mb-2 flex items-center gap-2"><Signature className="h-4 w-4 text-primary" /> Pemantau:</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {observers.map((obs) => (
            <div key={obs.id} className="flex flex-col gap-1 border p-2 rounded bg-white">
              <div>
                <p className="font-bold text-[10px]">{obs.nama}</p>
                <p className="text-[9px] text-gray-500">{(obs as any).departemenPerusahaan || '-'}</p>
              </div>
              {((obs as any).signatureDataUrl || obs.tandaTangan) && (
                <img src={(obs as any).signatureDataUrl || obs.tandaTangan} alt="TTD" className="h-8 object-contain mt-1" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EquipmentFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: any[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm font-sans">
      <div className="text-center border-b-2 border-slate-600 pb-3">
        <h2 className="text-xl font-extrabold text-slate-800">CHECKLIST PEMERIKSAAN {session.type.toUpperCase()}</h2>
        <p className="text-gray-600 font-semibold">PT. Goden Energi Cemerlang Lesrari</p>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-xl bg-slate-50">
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tanggal</span> <span className="font-medium text-gray-900">{session.tanggal}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Jam</span> <span className="font-medium text-gray-900">{session.waktu}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Shift</span> <span className="font-medium text-gray-900">{session.shift || '-'}</span></div>
        <div className="flex flex-col"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lokasi</span> <span className="font-medium text-gray-900">{session.lokasi || '-'}</span></div>
        <div className="col-span-2 flex flex-col pt-2 border-t border-slate-200"><span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Supervisor</span> <span className="font-bold text-gray-900">{session.supervisorName}</span></div>
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-600 text-white">
              <th className="p-3 w-8 text-center border-r border-slate-500">No</th>
              <th className="p-3 text-left border-r border-slate-500">Nama Alat / No. Register</th>
              <th className="p-3 w-20 text-center border-r border-slate-500">Kondisi (S)</th>
              <th className="p-3 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => {
              const results = record.inspectionResults || {};
              const vals = Object.values(results);
              const allOk = vals.length > 0 && vals.every(v => v === 'S');
              let tindakLanjut = "-";
              if (record.tindakLanjutPerbaikan && typeof record.tindakLanjutPerbaikan === 'object') {
                tindakLanjut = Object.values(record.tindakLanjutPerbaikan).filter(Boolean).join(", ") || "-";
              } else if (typeof record.tindakLanjutPerbaikan === 'string') {
                tindakLanjut = record.tindakLanjutPerbaikan;
              }

              return (
                <tr key={record.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-slate-100 transition-colors`}>
                  <td className="p-3 text-center border-r border-slate-200 font-bold text-slate-700">{record.ordinal}</td>
                  <td className="p-3 font-extrabold text-gray-900 border-r border-slate-200">{record.noRegisterPeralatan || record.namaAlat || 'Alat ' + record.ordinal}</td>
                  <td className="p-3 text-center border-r border-slate-200">
                    <div className={`inline-flex items-center justify-center p-1 rounded-full ${allOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <CheckIcon checked={allOk} />
                    </div>
                  </td>
                  <td className="p-3 text-gray-500 italic">{tindakLanjut}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border border-slate-200 rounded-xl p-4 bg-gray-50/30">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Signature className="h-5 w-5" />
          Observer / Pengamat:
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-center gap-4 border border-slate-200 p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex-1">
                <p className="font-extrabold text-gray-900">{obs.nama}</p>
                <div className="flex flex-col mt-1">
                  <p className="text-xs font-bold text-slate-600">{obs.nik || '-'}</p>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-tighter">{obs.perusahaan || 'BIB'}</p>
                </div>
              </div>
              {obs.tandaTangan && (
                <div className="p-2 border border-slate-100 rounded-lg bg-gray-50">
                  <img src={obs.tandaTangan} alt="TTD" className="h-16 w-24 object-contain" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntercomFormPreview({ session, records, observers }: {
  session: SessionDetail['session'];
  records: IntercomRecord[];
  observers: Observer[]
}) {
  return (
    <div className="space-y-4 p-4 bg-white text-black text-sm">
      <div className="text-center border-b pb-3">
        <h2 className="text-lg font-bold">FORM SIDAK INTERCOM PENGAWAS FMS</h2>
        <p className="text-gray-600">PT. Goden Energi Cemerlang Lesrari</p>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm border p-3 rounded">
        <div><span className="font-semibold">Tanggal:</span> {session.tanggal}</div>
        <div><span className="font-semibold">Waktu:</span> {session.waktu}</div>
        <div><span className="font-semibold">Shift:</span> {session.shift}</div>
        <div><span className="font-semibold">Lokasi:</span> {session.lokasi}</div>
        <div><span className="font-semibold">Pengawas FMS:</span> {session.supervisorName}</div>
        <div><span className="font-semibold">Total Sampel:</span> {session.totalSampel}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-200">
              <th className="border p-2 w-10">No</th>
              <th className="border p-2">Nama Pengawas</th>
              <th className="border p-2">NIK</th>
              <th className="border p-2">Prshn</th>
              <th className="border p-2 w-8 text-center">Q1</th>
              <th className="border p-2 w-8 text-center">Q2</th>
              <th className="border p-2 w-8 text-center">Q3</th>
              <th className="border p-2 w-8 text-center">Q4</th>
              <th className="border p-2 w-8 text-center">Q5</th>
              <th className="border p-2 w-8 text-center">Q6</th>
              <th className="border p-2 w-8 text-center">Q7</th>
              <th className="border p-2 w-12 text-center">Resp(m)</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, idx) => (
              <tr key={record.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border p-2 text-center">{record.ordinal}</td>
                <td className="border p-2 font-medium">{record.nama}</td>
                <td className="border p-2">{record.nik || '-'}</td>
                <td className="border p-2">{record.perusahaan || '-'}</td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q1 ? 'text-green-600' : 'text-red-600'}`}>{record.q1 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q2 ? 'text-green-600' : 'text-red-600'}`}>{record.q2 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q3 ? 'text-green-600' : 'text-red-600'}`}>{record.q3 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q4 ? 'text-green-600' : 'text-red-600'}`}>{record.q4 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q5 ? 'text-green-600' : 'text-red-600'}`}>{record.q5 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q6 ? 'text-green-600' : 'text-red-600'}`}>{record.q6 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center">
                  <span className={`font-bold text-lg ${record.q7 ? 'text-green-600' : 'text-red-600'}`}>{record.q7 ? '✓' : '✗'}</span>
                </td>
                <td className="border p-2 text-center font-bold">{record.waktuRespons}</td>
                <td className="border p-2 text-gray-600">{record.keterangan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border rounded p-3">
        <h3 className="font-semibold mb-2">Observer / Pemantau:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {observers.map((obs) => (
            <div key={obs.id} className="flex items-start gap-3 border p-2 rounded">
              <div className="flex-1">
                <p className="font-medium">{obs.nama}</p>
                <p className="text-xs text-gray-500">{obs.nik} - {obs.jabatan}</p>
                <p className="text-xs text-gray-500">{obs.perusahaan}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SidakRecap() {
  const [editingFatigueRecord, setEditingFatigueRecord] = useState<FatigueRecord | null>(null);

  // Expose edit handler to FatigueFormPreview
  useEffect(() => {
    (window as any).onEditFatigueRecord = (record: FatigueRecord) => {
      setEditingFatigueRecord(record);
    };
    return () => {
      delete (window as any).onEditFatigueRecord;
    };
  }, []);

  const handleSaveIntervention = async (id: string, evidence: string | null, note: string) => {
    try {
      await apiRequest(`/api/sidak-fatigue/records/${id}`, "PATCH", {
        buktiIntervensi: evidence,
        catatanIntervensi: note
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sidak-recap"] });
      // Invalidate the detail query as well
      if (detailUrl) {
        queryClient.invalidateQueries({ queryKey: [detailUrl] });
      }
    } catch (error) {
      throw error;
    }
  };
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [supervisorFilter, setSupervisorFilter] = useState<string>("all");
  const [selectedSession, setSelectedSession] = useState<SidakSession | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<RecapData>({
    queryKey: ['/api/sidak-recap'],
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const detailUrl = selectedSession
    ? `/api/sidak-recap/detail?sessionId=${selectedSession.id}&type=${selectedSession.type}`
    : '';

  const { data: detailData, isLoading: detailLoading } = useQuery<SessionDetail>({
    queryKey: [detailUrl],
    enabled: !!selectedSession && detailOpen,
    staleTime: 60_000,
  });

  const handleRowClick = (session: SidakSession) => {
    setSelectedSession(session);
    setDetailOpen(true);
  };

  const handleDownloadPDF = async () => {
    if (!detailRef.current) return;

    try {
      const canvas = await html2canvas(detailRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`SIDAK_${selectedSession?.type}_${selectedSession?.id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const handleDownloadJPG = async () => {
    if (!detailRef.current) return;

    try {
      const canvas = await html2canvas(detailRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const link = document.createElement('a');
      link.download = `SIDAK_${selectedSession?.type}_${selectedSession?.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (error) {
      console.error('Error generating JPG:', error);
    }
  };

  // Deep-link dari export Excel: ?session=<id>&type=<type>&dl=pdf → buka dialog form (+ auto-download PDF)
  const deepLinkDone = useRef(false);
  const autoDlPdf = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || !data?.sessions?.length) return;
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session");
    if (!sid) { deepLinkDone.current = true; return; }
    deepLinkDone.current = true;
    const stype = params.get("type");
    const s = data.sessions.find((x) => x.id === sid && (!stype || x.type === stype));
    if (!s) return;
    autoDlPdf.current = params.get("dl") === "pdf";
    setSelectedSession(s);
    setDetailOpen(true);
    // bersihkan param agar refresh tidak memicu ulang download
    window.history.replaceState({}, "", window.location.pathname);
  }, [data]);

  useEffect(() => {
    if (!autoDlPdf.current || !detailData || !detailOpen) return;
    autoDlPdf.current = false;
    // beri waktu dialog & gambar ter-render sebelum di-render ke PDF
    const t = setTimeout(() => { handleDownloadPDF(); }, 900);
    return () => clearTimeout(t);
  }, [detailData, detailOpen]);

  const filteredSessions = useMemo(() => {
    if (!data?.sessions) return [];

    return data.sessions.filter(session => {
      if (typeFilter !== "all" && session.type !== typeFilter) return false;
      if (supervisorFilter !== "all" && session.supervisorName !== supervisorFilter) return false;
      if (dateFrom && new Date(session.tanggal) < new Date(dateFrom)) return false;
      if (dateTo && new Date(session.tanggal) > new Date(dateTo)) return false;
      return true;
    });
  }, [data?.sessions, typeFilter, supervisorFilter, dateFrom, dateTo]);

  const supervisorList = useMemo(() => {
    if (!data?.stats?.supervisorStats) return [];
    return data.stats.supervisorStats.map(s => s.name);
  }, [data?.stats?.supervisorStats]);

  const handleExportExcel = async () => {
    if (!filteredSessions.length) return;

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rekap SIDAK", { views: [{ state: "frozen", ySplit: 4 }] });

    const COLS = [
      { header: "No", width: 5 },
      { header: "Tanggal", width: 12 },
      { header: "Waktu", width: 10 },
      { header: "Tipe SIDAK", width: 18 },
      { header: "Shift", width: 9 },
      { header: "Lokasi", width: 22 },
      { header: "Departemen", width: 18 },
      { header: "Area/Perusahaan", width: 20 },
      { header: "Jumlah Sampel", width: 10 },
      { header: "Observer", width: 32 },
      { header: "Supervisor", width: 24 },
    ];
    // Kolom evidence foto (link) — dinamis sesuai jumlah foto terbanyak (maks 5)
    const maxFotos = Math.min(5, Math.max(0, ...filteredSessions.map((s) => (s.photos || []).length)));
    for (let i = 1; i <= maxFotos; i++) COLS.push({ header: `Foto ${i}`, width: 13 });
    // Kolom form: deep-link buka dialog detail sesi + auto-download PDF (?session&type&dl=pdf)
    COLS.push({ header: "Form (PDF)", width: 15 });
    const toAbsUrl = (u: string) =>
      /^https?:\/\//i.test(u) ? u : `${window.location.origin}${u.startsWith("/") ? "" : "/"}${u}`;

    ws.columns = COLS.map((c) => ({ width: c.width }));
    const lastCol = String.fromCharCode(64 + COLS.length); // K..P (maks 16 kolom, aman < Z)

    const thin = { style: "thin" as const, color: { argb: "FFD1D5DB" } };
    const border = { top: thin, left: thin, bottom: thin, right: thin };

    // Judul + periode
    const dates = filteredSessions.map((s) => new Date(s.tanggal).getTime());
    const periode = `${format(new Date(Math.min(...dates)), "dd/MM/yyyy")} – ${format(new Date(Math.max(...dates)), "dd/MM/yyyy")}`;
    ws.mergeCells(`A1:${lastCol}1`);
    const title = ws.getCell("A1");
    title.value = "REKAP KEGIATAN SIDAK";
    title.font = { bold: true, size: 14, color: { argb: "FFB91C1C" } };
    title.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 22;
    ws.mergeCells(`A2:${lastCol}2`);
    const sub = ws.getCell("A2");
    sub.value = `Periode: ${periode}  ·  Diekspor: ${format(new Date(), "dd/MM/yyyy HH:mm")}  ·  ${filteredSessions.length} sesi`;
    sub.font = { italic: true, size: 10, color: { argb: "FF6B7280" } };
    sub.alignment = { horizontal: "center" };

    // Header (baris 4)
    const headerRow = ws.getRow(4);
    COLS.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDC2626" } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = border;
    });
    headerRow.height = 20;

    // Data (mulai baris 5) + zebra + border
    filteredSessions.forEach((session, idx) => {
      const row = ws.getRow(5 + idx);
      const vals = [
        idx + 1,
        format(new Date(session.tanggal), "dd/MM/yyyy"),
        session.waktu,
        session.type,
        session.shift,
        session.lokasi,
        session.departemen,
        session.area || session.perusahaan || "-",
        session.totalSampel,
        session.observers,
        session.supervisorName,
      ];
      vals.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v as any;
        cell.border = border;
        cell.alignment = {
          vertical: "middle",
          horizontal: i === 0 || i === 8 ? "center" : i === 1 || i === 2 || i === 4 ? "center" : "left",
          wrapText: i === 9, // Observer bisa panjang
        };
        if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      });
      // Kolom evidence foto: sel ber-hyperlink "Lihat Foto i"
      const fotos = (session.photos || []).slice(0, maxFotos);
      for (let i = 0; i < maxFotos; i++) {
        const cell = row.getCell(vals.length + 1 + i);
        cell.border = border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
        if (idx % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
        if (fotos[i]) {
          cell.value = { text: `Lihat Foto ${i + 1}`, hyperlink: toAbsUrl(fotos[i]) };
          cell.font = { color: { argb: "FF0563C1" }, underline: true, size: 10 };
        }
      }
      // Kolom Form (PDF): link buka form di aplikasi + auto-download PDF
      const formCell = row.getCell(vals.length + 1 + maxFotos);
      formCell.border = border;
      formCell.alignment = { vertical: "middle", horizontal: "center" };
      if (idx % 2 === 1) formCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF9FAFB" } };
      formCell.value = {
        text: "Download Form",
        hyperlink: `${window.location.origin}/api/sidak-recap/form-pdf?sessionId=${session.id}&type=${encodeURIComponent(session.type)}`,
      };
      formCell.font = { color: { argb: "FF0563C1" }, underline: true, size: 10 };
    });

    // Baris TOTAL
    const totalRow = ws.getRow(5 + filteredSessions.length);
    ws.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
    totalRow.getCell(1).value = "TOTAL";
    totalRow.getCell(9).value = filteredSessions.reduce((a, s) => a + (Number(s.totalSampel) || 0), 0);
    for (let i = 1; i <= COLS.length; i++) {
      const cell = totalRow.getCell(i);
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      cell.border = border;
      cell.alignment = { horizontal: i === 1 ? "right" : "center", vertical: "middle" };
    }

    ws.autoFilter = { from: "A4", to: `${lastCol}4` };

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_SIDAK_${format(new Date(), "yyyyMMdd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6 text-center text-red-600">
            Gagal memuat data rekap SIDAK. Pastikan Anda login sebagai admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="shrink-0 p-2.5 rounded-2xl bg-primary/10 text-primary">
            <ClipboardCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Rekap Kegiatan SIDAK
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Rekapitulasi semua kegiatan SIDAK dari seluruh supervisor
            </p>
          </div>
        </div>
        <Button onClick={handleExportExcel} disabled={!filteredSessions.length} data-testid="button-export-excel" className="rounded-xl shadow-sm">
          <Download className="h-4 w-4 mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Stats Cards (modern, data-driven) */}
      {(() => {
        const fmt = (n: number) => (n || 0).toLocaleString("id-ID");
        const st: any = data?.stats || {};
        const CARDS: { key: string; label: string; Icon: any; chip: string }[] = [
          { key: "totalFatigue", label: "Fatigue", Icon: Activity, chip: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
          { key: "totalRoster", label: "Roster", Icon: CalendarIcon, chip: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
          { key: "totalSeatbelt", label: "Seatbelt", Icon: Users, chip: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
          { key: "totalAntrian", label: "Antrian", Icon: Truck, chip: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" },
          { key: "totalApd", label: "APD", Icon: ClipboardCheck, chip: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400" },
          { key: "totalJarak", label: "Jarak Aman", Icon: Maximize2, chip: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
          { key: "totalKecepatan", label: "Kecepatan", Icon: Gauge, chip: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
          { key: "totalPencahayaan", label: "Pencahayaan", Icon: Sun, chip: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
          { key: "totalLoto", label: "LOTO", Icon: Lock, chip: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
          { key: "totalDigital", label: "Digital", Icon: Tablet, chip: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
          { key: "totalWorkshop", label: "Workshop", Icon: PenTool, chip: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
          { key: "totalBehavior", label: "Behavior", Icon: Activity, chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400" },
          { key: "totalIntercom", label: "Intercom", Icon: ClipboardCheck, chip: "bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400" },
          { key: "totalStandJack", label: "Stand Jack", Icon: Shield, chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
          { key: "totalHydraulicJack", label: "Hydraulic Jack", Icon: Shield, chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
          { key: "totalBottleJack", label: "Bottle Jack", Icon: Shield, chip: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
          { key: "totalApar", label: "APAR", Icon: Activity, chip: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
          { key: "totalImpact", label: "Impact", Icon: PenTool, chip: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
          { key: "totalMesinLas", label: "Mesin Las", Icon: Building, chip: "bg-zinc-100 text-zinc-600 dark:bg-zinc-900/30 dark:text-zinc-400" },
          { key: "totalMesinKompresor", label: "Mesin Kompresor", Icon: Activity, chip: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
          { key: "totalGerindaDuduk", label: "Gerinda Duduk", Icon: PenTool, chip: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
          { key: "totalFuelStorage", label: "Fuel Storage", Icon: Building, chip: "bg-stone-100 text-stone-600 dark:bg-stone-900/30 dark:text-stone-400" },
        ];
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="col-span-2 sm:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-rose-500 p-4 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-3xl font-bold tracking-tight tabular-nums leading-none">{fmt(st.totalSidak)}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/80">Total SIDAK</p>
                </div>
              </div>
            </div>
            {CARDS.map((c) => (
              <div
                key={c.key}
                className="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 transition-all hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${c.chip}`}>
                    <c.Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-2xl font-bold tracking-tight tabular-nums leading-none text-gray-900 dark:text-white">{fmt(st[c.key])}</p>
                    <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400 truncate">{c.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Supervisor Stats */}
      {
        data?.stats.supervisorStats && data.stats.supervisorStats.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Statistik per Supervisor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.stats.supervisorStats.slice(0, 6).map((supervisor) => {
                  // Semua kategori SIDAK (label singkat + nama lengkap + warna). Hanya yang >0 ditampilkan.
                  const CATS: { key: keyof typeof supervisor; short: string; full: string; cls: string }[] = [
                    { key: "fatigue", short: "F", full: "Fatigue", cls: "bg-blue-50 text-blue-700" },
                    { key: "roster", short: "R", full: "Roster", cls: "bg-green-50 text-green-700" },
                    { key: "seatbelt", short: "SB", full: "Seatbelt", cls: "bg-teal-50 text-teal-700" },
                    { key: "rambu", short: "RB", full: "Rambu", cls: "bg-cyan-50 text-cyan-700" },
                    { key: "antrian", short: "AN", full: "Antrian", cls: "bg-rose-50 text-rose-700" },
                    { key: "apd", short: "APD", full: "APD", cls: "bg-purple-50 text-purple-700" },
                    { key: "jarak", short: "J", full: "Jarak Aman", cls: "bg-sky-50 text-sky-700" },
                    { key: "kecepatan", short: "K", full: "Kecepatan", cls: "bg-orange-50 text-orange-700" },
                    { key: "pencahayaan", short: "P", full: "Pencahayaan", cls: "bg-yellow-50 text-yellow-700" },
                    { key: "loto", short: "LO", full: "LOTO", cls: "bg-amber-50 text-amber-700" },
                    { key: "digital", short: "DG", full: "Digital", cls: "bg-indigo-50 text-indigo-700" },
                    { key: "workshop", short: "WS", full: "Workshop", cls: "bg-orange-50 text-orange-700" },
                    { key: "behavior", short: "BH", full: "Behavior", cls: "bg-violet-50 text-violet-700" },
                    { key: "intercom", short: "IC", full: "Intercom", cls: "bg-slate-50 text-slate-700" },
                    { key: "standjack", short: "SJ", full: "Stand Jack", cls: "bg-stone-50 text-stone-700" },
                    { key: "hydraulicjack", short: "HJ", full: "Hydraulic Jack", cls: "bg-stone-50 text-stone-700" },
                    { key: "bottlejack", short: "BJ", full: "Bottle Jack", cls: "bg-stone-50 text-stone-700" },
                    { key: "apar", short: "AP", full: "APAR", cls: "bg-red-50 text-red-700" },
                    { key: "impact", short: "IM", full: "Impact", cls: "bg-pink-50 text-pink-700" },
                    { key: "mesinlas", short: "ML", full: "Mesin Las", cls: "bg-zinc-50 text-zinc-700" },
                    { key: "mesinkompresor", short: "MK", full: "Mesin Kompresor", cls: "bg-zinc-50 text-zinc-700" },
                    { key: "gerindaduduk", short: "GD", full: "Gerinda Duduk", cls: "bg-zinc-50 text-zinc-700" },
                    { key: "fuelstorage", short: "FS", full: "Fuel Storage", cls: "bg-emerald-50 text-emerald-700" },
                  ];
                  const active = CATS.filter((c) => Number(supervisor[c.key]) > 0);
                  return (
                    <div
                      key={supervisor.name}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 shrink-0 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {supervisor.name}
                          </span>
                        </div>
                        <Badge className="text-xs shrink-0">Total: {supervisor.total}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {active.map((c) => (
                          <Badge key={c.key as string} variant="outline" title={c.full} className={`text-[11px] ${c.cls}`}>
                            {c.short}: {Number(supervisor[c.key])}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      }


      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            Filter Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-gray-500">Dari Tanggal</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
                data-testid="input-date-from"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Sampai Tanggal</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
                data-testid="input-date-to"
              />
            </div>
            <div>
              <Label className="text-xs text-gray-500">Tipe SIDAK</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="mt-1" data-testid="select-type">
                  <SelectValue placeholder="Semua Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="Fatigue">Fatigue</SelectItem>
                  <SelectItem value="Roster">Roster</SelectItem>
                  <SelectItem value="Seatbelt">Seatbelt</SelectItem>
                  <SelectItem value="Rambu">Rambu</SelectItem>
                  <SelectItem value="Antrian">Antrian</SelectItem>
                  <SelectItem value="APD">APD</SelectItem>
                  <SelectItem value="Jarak">Jarak Aman</SelectItem>
                  <SelectItem value="Kecepatan">Kecepatan</SelectItem>
                  <SelectItem value="Pencahayaan">Pencahayaan</SelectItem>
                  <SelectItem value="LOTO">LOTO</SelectItem>
                  <SelectItem value="Digital">Digital</SelectItem>
                  <SelectItem value="Workshop">Workshop</SelectItem>
                  <SelectItem value="Behavior">Driver Behavior</SelectItem>
                  <SelectItem value="Intercom">Intercom FMS</SelectItem>
                  <SelectItem value="ChargingStation">Charging Station</SelectItem>
                  <SelectItem value="SopKritis">Observasi SOP Kritis</SelectItem>

                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500">Supervisor</Label>
              <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
                <SelectTrigger className="mt-1" data-testid="select-supervisor">
                  <SelectValue placeholder="Semua Supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Supervisor</SelectItem>
                  {supervisorList.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Daftar Kegiatan SIDAK ({filteredSessions.length} data)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Tidak ada data SIDAK yang sesuai dengan filter
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">No</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Departemen</TableHead>
                    <TableHead className="text-center">Sampel</TableHead>
                    <TableHead>Observer</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead className="w-12">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSessions.map((session, idx) => (
                    <TableRow
                      key={session.id}
                      data-testid={`row-session-${session.id}`}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleRowClick(session)}
                    >
                      <TableCell className="font-medium">{idx + 1}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(new Date(session.tanggal), 'dd MMM yyyy', { locale: id })}</p>
                          <p className="text-xs text-gray-500">{session.waktu}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={session.type === 'Fatigue'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : session.type === 'Roster'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : session.type === 'Seatbelt'
                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                : session.type === 'Rambu'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : session.type === 'Antrian'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : session.type === 'APD'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : session.type === 'Kecepatan'
                                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                                        : session.type === 'Pencahayaan'
                                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                          : session.type === 'LOTO'
                                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                                            : session.type === 'Digital'
                                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                                              : session.type === 'Workshop'
                                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                                : session.type === 'Behavior'
                                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                                  : 'bg-gray-50 text-gray-700 border-gray-200'
                          }
                        >
                          {session.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{session.shift}</TableCell>
                      <TableCell>
                        <span className="text-sm">{session.lokasi}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{session.departemen}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{session.totalSampel}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px] block">
                          {session.observers || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-3 w-3 text-primary" />
                          </div>
                          <span className="text-sm font-medium">{session.supervisorName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              Detail SIDAK {selectedSession?.type}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2 mb-4">
            <Button onClick={handleDownloadPDF} variant="outline" size="sm" data-testid="button-download-pdf">
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button onClick={handleDownloadJPG} variant="outline" size="sm" data-testid="button-download-jpg">
              <Image className="h-4 w-4 mr-2" />
              Download JPG
            </Button>
          </div>

          <ScrollArea className="max-h-[calc(90vh-180px)]">
            {detailLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : detailData ? (
              <div ref={detailRef} className="bg-white p-6 space-y-6">
                {/* Session Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Tanggal</p>
                      <p className="font-medium">{selectedSession ? format(new Date(selectedSession.tanggal), 'dd MMM yyyy', { locale: id }) : '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Waktu</p>
                      <p className="font-medium">{selectedSession?.waktu || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Lokasi</p>
                      <p className="font-medium">{selectedSession?.lokasi || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Departemen</p>
                      <p className="font-medium">{selectedSession?.departemen || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <Badge variant="outline" className={
                    selectedSession?.type === 'Fatigue' ? 'bg-blue-50 text-blue-700' :
                      selectedSession?.type === 'Roster' ? 'bg-purple-50 text-purple-700' :
                        selectedSession?.type === 'Seatbelt' ? 'bg-yellow-50 text-yellow-700' :
                          selectedSession?.type === 'Rambu' ? 'bg-amber-50 text-amber-700' :
                            selectedSession?.type === 'Antrian' ? 'bg-rose-50 text-rose-700' :
                              selectedSession?.type === 'APD' ? 'bg-purple-50 text-purple-700' :
                                selectedSession?.type === 'Jarak' ? 'bg-blue-50 text-blue-700' :
                                  selectedSession?.type === 'Kecepatan' ? 'bg-orange-50 text-orange-700' :
                                    selectedSession?.type === 'Pencahayaan' ? 'bg-yellow-50 text-yellow-700' :
                                      selectedSession?.type === 'LOTO' ? 'bg-orange-50 text-orange-700' :
                                        selectedSession?.type === 'Digital' ? 'bg-blue-50 text-blue-700' :
                                          selectedSession?.type === 'Workshop' ? 'bg-orange-50 text-orange-700' :
                                            selectedSession?.type === 'Behavior' ? 'bg-indigo-50 text-indigo-700' :
                                              selectedSession?.type === 'Intercom' ? 'bg-blue-50 text-blue-700' :
                                                'bg-gray-50 text-gray-700'
                  }>
                    {selectedSession?.type}
                  </Badge>
                  <span className="text-sm">Shift: {selectedSession?.shift}</span>
                  <span className="text-sm">Supervisor: <strong>{selectedSession?.supervisorName}</strong></span>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="form" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="form">Tampilan Form</TabsTrigger>
                    <TabsTrigger value="records">Data ({detailData.records?.length || 0})</TabsTrigger>
                    <TabsTrigger value="observers">Observer ({detailData.observers?.length || 0})</TabsTrigger>
                    <TabsTrigger value="photos">Foto ({detailData.session?.photos?.length || 0})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="form" className="mt-4">
                    {selectedSession?.type === 'Fatigue' ? (
                      <FatigueFormPreview
                        session={detailData.session}
                        records={detailData.records as FatigueRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Seatbelt' ? (
                      <SeatbeltFormPreview
                        session={detailData.session}
                        records={detailData.records as SeatbeltRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Rambu' ? (
                      <RambuFormPreview
                        session={detailData.session}
                        records={detailData.records as RambuRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Antrian' ? (
                      <AntrianFormPreview
                        session={detailData.session}
                        records={detailData.records as AntrianRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Jarak' ? (
                      <JarakFormPreview
                        session={detailData.session}
                        records={detailData.records as JarakRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Kecepatan' ? (
                      <KecepatanFormPreview
                        session={detailData.session}
                        records={detailData.records as KecepatanRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Pencahayaan' ? (
                      <PencahayaanFormPreview
                        session={detailData.session}
                        records={detailData.records as PencahayaanRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'LOTO' ? (
                      <LotoFormPreview
                        session={detailData.session}
                        records={detailData.records as LotoRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Digital' ? (
                      <DigitalFormPreview
                        session={detailData.session}
                        records={detailData.records as DigitalRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Workshop' ? (
                      <WorkshopFormPreview
                        session={detailData.session}
                        records={detailData.records as WorkshopRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'Behavior' ? (
                      <BehaviorFormPreview
                        session={detailData.session}
                        records={detailData.records as BehaviorRecord[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'ChargingStation' ? (
                      <ChargingStationFormPreview
                        session={detailData.session}
                        records={detailData.records as any[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'SopKritis' ? (
                      <SopKritisFormPreview
                        session={detailData.session}
                        pengendalian={(detailData as any).pengendalian as any[]}
                        langkah={(detailData as any).langkah as any[]}
                        observers={detailData.observers}
                      />
                    ) : selectedSession?.type === 'StandJack' || selectedSession?.type === 'HydraulicJack' || selectedSession?.type === 'BottleJack' || selectedSession?.type === 'Impact' || selectedSession?.type === 'APAR' || selectedSession?.type === 'Apar' || selectedSession?.type === 'MesinLas' || selectedSession?.type === 'MesinKompresor' || selectedSession?.type === 'GerindaDuduk' || selectedSession?.type === 'FuelStorage' ? (
                      <EquipmentFormPreview
                        session={detailData.session}
                        records={detailData.records as any[]}
                        observers={detailData.observers}
                      />

                    ) : selectedSession?.type === 'StandJack' || selectedSession?.type === 'HydraulicJack' || selectedSession?.type === 'BottleJack' || selectedSession?.type === 'Impact' || selectedSession?.type === 'APAR' || selectedSession?.type === 'Apar' || selectedSession?.type === 'MesinLas' || selectedSession?.type === 'MesinKompresor' || selectedSession?.type === 'GerindaDuduk' || selectedSession?.type === 'FuelStorage' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Alat</TableHead>
                            <TableHead className="text-center">Kondisi</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as any[])?.map((record) => {
                            const results = record.inspectionResults || {};
                            const vals = Object.values(results);
                            const allOk = vals.length > 0 && vals.every(v => v === 'S');
                            let tindakLanjut = "-";
                            if (record.tindakLanjutPerbaikan && typeof record.tindakLanjutPerbaikan === 'object') {
                              tindakLanjut = Object.values(record.tindakLanjutPerbaikan).filter(Boolean).join(", ") || "-";
                            } else if (typeof record.tindakLanjutPerbaikan === 'string') {
                              tindakLanjut = record.tindakLanjutPerbaikan;
                            }
                            return (
                              <TableRow key={record.id}>
                                <TableCell>{record.ordinal}</TableCell>
                                <TableCell className="font-medium">{record.noRegisterPeralatan || record.namaAlat || 'Alat ' + record.ordinal}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={allOk ? 'default' : 'destructive'}>
                                    {allOk ? 'Baik (S)' : 'Buruk'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-gray-500">{tindakLanjut}</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
) : selectedSession?.type === 'Intercom' ? (
                      <IntercomFormPreview
                        session={detailData.session}
                        records={detailData.records as IntercomRecord[]}
                        observers={detailData.observers}
                      />
                    ) : (
                      <RosterFormPreview
                        session={detailData.session}
                        records={detailData.records as RosterRecord[]}
                        observers={detailData.observers}
                      />
                    )}
                  </TabsContent>

                  <TabsContent value="records" className="mt-4">
                    {selectedSession?.type === 'Fatigue' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead className="text-center">Jam Tidur</TableHead>
                            <TableHead className="text-center">PVT</TableHead>
                            <TableHead className="text-center">FTW</TableHead>
                            <TableHead className="text-center">Intervensi</TableHead>
                            <TableHead className="text-center">Foto</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as FatigueRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.nama}</TableCell>
                              <TableCell>{record.nik}</TableCell>
                              <TableCell>{record.jabatan}</TableCell>
                              <TableCell className="text-center">{record.jamTidur}h</TableCell>
                              <TableCell className="text-center font-mono text-xs">
                                {record.pvtMeanRT ? `${record.pvtMeanRT}ms` : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.fitUntukBekerja ? "default" : "destructive"}>
                                  {record.fitUntukBekerja ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center max-w-[150px] truncate italic text-xs">
                                {record.catatanIntervensi || '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {record.buktiIntervensi ? (
                                  <div className="w-8 h-8 mx-auto border rounded overflow-hidden">
                                    <img src={record.buktiIntervensi} alt="Bukti" className="w-full h-full object-cover" />
                                  </div>
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Seatbelt' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>No Kendaraan</TableHead>
                            <TableHead>Perusahaan</TableHead>
                            <TableHead className="text-center">Kondisi Driver</TableHead>
                            <TableHead className="text-center">Kondisi Passenger</TableHead>
                            <TableHead className="text-center">Penggunaan Driver</TableHead>
                            <TableHead className="text-center">Penggunaan Passenger</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as SeatbeltRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.nama}</TableCell>
                              <TableCell>{record.nik}</TableCell>
                              <TableCell>{record.nomorLambung || '-'}</TableCell>
                              <TableCell>{record.perusahaan}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.seatbeltDriverCondition ? 'default' : 'destructive'}>
                                  {record.seatbeltDriverCondition ? 'Baik' : 'Rusak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.seatbeltPassengerCondition ? 'default' : 'destructive'}>
                                  {record.seatbeltPassengerCondition ? 'Baik' : 'Rusak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.seatbeltDriverUsage ? 'default' : 'destructive'}>
                                  {record.seatbeltDriverUsage ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.seatbeltPassengerUsage ? 'default' : 'destructive'}>
                                  {record.seatbeltPassengerUsage ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Rambu' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>No Kendaraan</TableHead>
                            <TableHead>Perusahaan</TableHead>
                            <TableHead className="text-center">Stop</TableHead>
                            <TableHead className="text-center">Give Way</TableHead>
                            <TableHead className="text-center">Max Speed</TableHead>
                            <TableHead className="text-center">No Entry</TableHead>
                            <TableHead className="text-center">No Parking</TableHead>
                            <TableHead className="text-center">Helmet</TableHead>
                            <TableHead className="text-center">No U-Turn</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as RambuRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.nama}</TableCell>
                              <TableCell>{record.noKendaraan}</TableCell>
                              <TableCell>{record.perusahaan}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuStop ? 'default' : 'destructive'}>
                                  {record.rambuStop ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuGiveWay ? 'default' : 'destructive'}>
                                  {record.rambuGiveWay ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuKecepatanMax ? 'default' : 'destructive'}>
                                  {record.rambuKecepatanMax ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuLaranganMasuk ? 'default' : 'destructive'}>
                                  {record.rambuLaranganMasuk ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuLaranganParkir ? 'default' : 'destructive'}>
                                  {record.rambuLaranganParkir ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuWajibHelm ? 'default' : 'destructive'}>
                                  {record.rambuWajibHelm ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.rambuLaranganUTurn ? 'default' : 'destructive'}>
                                  {record.rambuLaranganUTurn ? '✓' : '✗'}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Jarak' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>No Unit</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead>Lokasi Muatan</TableHead>
                            <TableHead>Lokasi Kosongan</TableHead>
                            <TableHead>Unit Depan</TableHead>
                            <TableHead className="text-center">Jarak (m)</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as JarakRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.noKendaraan}</TableCell>
                              <TableCell className="text-center">{record.tipeUnit}</TableCell>
                              <TableCell>{record.lokasiMuatan || '-'}</TableCell>
                              <TableCell>{record.lokasiKosongan || '-'}</TableCell>
                              <TableCell>{record.nomorLambungUnit || '-'}</TableCell>
                              <TableCell className="text-center font-bold">{record.jarakAktualKedua || '-'}</TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Kecepatan' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>No Unit</TableHead>
                            <TableHead>Tipe</TableHead>
                            <TableHead className="text-center">Muatan</TableHead>
                            <TableHead className="text-center">Kosongan</TableHead>
                            <TableHead className="text-center">MPH</TableHead>
                            <TableHead className="text-center">KPH</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as KecepatanRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.noKendaraan}</TableCell>
                              <TableCell className="text-center">{record.tipeUnit}</TableCell>
                              <TableCell className="text-center"><CheckIcon checked={record.arahMuatan} /></TableCell>
                              <TableCell className="text-center"><CheckIcon checked={record.arahKosongan} /></TableCell>
                              <TableCell className="text-center">{record.kecepatanMph || '-'}</TableCell>
                              <TableCell className="text-center font-bold">{record.kecepatanKph || '-'}</TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Pencahayaan' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Titik</TableHead>
                            <TableHead>Sumber</TableHead>
                            <TableHead className="text-center">Jenis</TableHead>
                            <TableHead className="text-center">Lux</TableHead>
                            <TableHead className="text-center">Jarak</TableHead>
                            <TableHead className="text-center">Visual</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as PencahayaanRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.titikPengambilan}</TableCell>
                              <TableCell>{record.sumberPenerangan}</TableCell>
                              <TableCell className="text-center">{record.jenisPengukuran}</TableCell>
                              <TableCell className="text-center font-bold">{record.intensitasLux}</TableCell>
                              <TableCell className="text-center">{record.jarakDariSumber || '-'}</TableCell>
                              <TableCell className="text-center">{record.secaraVisual}</TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'LOTO' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Karyawan</TableHead>
                            <TableHead>Perusahaan</TableHead>
                            <TableHead>Jenis Pekerjaan</TableHead>
                            <TableHead>Lokasi Isolasi</TableHead>
                            <TableHead>No Gembok</TableHead>
                            <TableHead>Jam Pasang</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as LotoRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.namaKaryawan}</TableCell>
                              <TableCell>{record.perusahaan}</TableCell>
                              <TableCell>{record.jenisPekerjaan}</TableCell>
                              <TableCell>{record.lokasiIsolasi}</TableCell>
                              <TableCell className="font-bold text-orange-600">{record.nomorGembok}</TableCell>
                              <TableCell>{record.jamPasang}</TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Digital' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Pengawas</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>Jabatan</TableHead>
                            <TableHead className="text-center">App Usage</TableHead>
                            <TableHead className="text-center">Timely</TableHead>
                            <TableHead>Feedback Quality</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as DigitalRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.namaPengawas}</TableCell>
                              <TableCell>{record.nik || '-'}</TableCell>
                              <TableCell>{record.jabatan || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.appUsage ? 'default' : 'destructive'}>
                                  {record.appUsage ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.timelyReporting ? 'default' : 'destructive'}>
                                  {record.timelyReporting ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.feedbackQuality}</TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Workshop' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Alat</TableHead>
                            <TableHead className="text-center">Kondisi</TableHead>
                            <TableHead className="text-center">Kebersihan</TableHead>
                            <TableHead className="text-center">Sertifikasi</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as WorkshopRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.namaAlat}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.kondisi ? 'default' : 'destructive'}>
                                  {record.kondisi ? 'Baik' : 'Rusak'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.kebersihan ? 'default' : 'destructive'}>
                                  {record.kebersihan ? 'Bersih' : 'Kotor'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.sertifikasi ? 'default' : 'destructive'}>
                                  {record.sertifikasi ? 'Ada' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Behavior' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Driver</TableHead>
                            <TableHead>No Unit</TableHead>
                            <TableHead className="text-center">Tindakan</TableHead>
                            <TableHead>Keterangan</TableHead>
                            <TableHead className="text-center">Foto Evidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as BehaviorRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.namaDriver || record.nama}</TableCell>
                              <TableCell>{record.nomorLambung || '-'}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className={
                                  record.tindakan === 'Apresiasi' ? 'bg-green-100 text-green-700' :
                                    record.tindakan === 'Teguran' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                }>
                                  {record.tindakan}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500 italic">{record.keterangan || '-'}</TableCell>
                              <TableCell className="text-center">
                                {record.evidenceUrl ? (
                                  <a href={record.evidenceUrl} target="_blank" rel="noopener noreferrer">
                                    <div className="w-10 h-10 mx-auto border rounded overflow-hidden">
                                      <img src={record.evidenceUrl} alt="Evidence" className="w-full h-full object-cover" />
                                    </div>
                                  </a>
                                ) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : selectedSession?.type === 'Intercom' ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama Pengawas</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>Perusahaan</TableHead>
                            <TableHead className="text-center">Respons (m)</TableHead>
                            <TableHead className="text-center">Q1-Q7</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as IntercomRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.nama}</TableCell>
                              <TableCell>{record.nik || '-'}</TableCell>
                              <TableCell>{record.perusahaan || '-'}</TableCell>
                              <TableCell className="text-center font-bold">{record.waktuRespons}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={record.q1 && record.q2 && record.q3 && record.q4 && record.q5 && record.q6 && record.q7 ? 'default' : 'destructive'}>
                                  {record.q1 && record.q2 && record.q3 && record.q4 && record.q5 && record.q6 && record.q7 ? 'Sesuai' : 'Tidak Sesuai'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>No</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead>NIK</TableHead>
                            <TableHead>Nomor Lambung</TableHead>
                            <TableHead>Roster Sesuai</TableHead>
                            <TableHead>Keterangan</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(detailData.records as RosterRecord[])?.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell>{record.ordinal}</TableCell>
                              <TableCell className="font-medium">{record.nama}</TableCell>
                              <TableCell>{record.nik}</TableCell>
                              <TableCell>{record.nomorLambung || '-'}</TableCell>
                              <TableCell>
                                <Badge variant={record.rosterSesuai ? 'default' : 'destructive'}>
                                  {record.rosterSesuai ? 'Ya' : 'Tidak'}
                                </Badge>
                              </TableCell>
                              <TableCell>{record.keterangan || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="observers" className="mt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {detailData.observers?.map((observer) => (
                        <div key={observer.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{observer.nama}</p>
                              <p className="text-sm text-gray-500">{observer.nik || '-'}</p>
                              <p className="text-sm text-gray-500">{observer.perusahaan || '-'}</p>
                              <p className="text-sm text-gray-500">{observer.jabatan || '-'}</p>
                            </div>
                            {observer.tandaTangan && (
                              <div className="w-20 h-16 border rounded overflow-hidden">
                                <img src={observer.tandaTangan} alt="Tanda Tangan" className="w-full h-full object-contain" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!detailData.observers || detailData.observers.length === 0) && (
                        <p className="text-gray-500 text-center py-4 col-span-2">Tidak ada data observer</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="photos" className="mt-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {detailData.session?.photos?.map((photo, idx) => (
                        <a
                          key={idx}
                          href={photo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square rounded-lg overflow-hidden border bg-gray-100 dark:bg-gray-700 block"
                        >
                          <ImageWithFallback
                            src={photo}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            index={idx}
                            showClickHint={true}
                            accentColor="blue"
                          />
                        </a>
                      ))}
                      {(!detailData.session?.photos || detailData.session.photos.length === 0) && (
                        <p className="text-gray-500 text-center py-4 col-span-3">Tidak ada foto kegiatan</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Data tidak ditemukan
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <FatigueEvidenceDialog
        open={!!editingFatigueRecord}
        onOpenChange={(open) => !open && setEditingFatigueRecord(null)}
        record={editingFatigueRecord}
        onSave={handleSaveIntervention}
      />
    </div >
  );
}


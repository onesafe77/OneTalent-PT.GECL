import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, ListChecks, CheckCircle, Clock, Plus, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface ChecklistItem {
  id: string;
  templateId: string;
  itemName: string;
  category?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  fileName?: string | null;
  notes?: string | null;
}

interface ChecklistTemplate {
  id: string;
  itemName: string;
  category?: string | null;
  isActive: boolean;
}

interface ChecklistResponse {
  items: ChecklistItem[];
  summary: { total: number; completed: number; pending: number; progressPercent: number };
}

export default function ChecklistArsipPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1); // 1-12
  const [manageOpen, setManageOpen] = useState(false);

  const qc = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<ChecklistResponse>({
    queryKey: [`/api/monthly-checklist?year=${year}&month=${month}`],
  });

  const toggleMutation = useMutation({
    mutationFn: async (vars: { id: string; isCompleted: boolean }) => {
      return apiRequest(`/api/monthly-checklist/${vars.id}`, "PATCH", {
        isCompleted: vars.isCompleted,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/monthly-checklist?year=${year}&month=${month}`] });
    },
    onError: (e: any) => {
      toast({ title: "Gagal update", description: e?.message || "", variant: "destructive" });
    },
  });

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); } else setMonth(month + 1);
  };

  const items = data?.items || [];
  const summary = data?.summary || { total: 0, completed: 0, pending: 0, progressPercent: 0 };
  const monthLabel = format(new Date(year, month - 1, 1), "MMMM yyyy", { locale: localeId });

  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <ListChecks className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Checklist Arsip — {monthLabel}</h1>
            <p className="text-sm text-gray-500">Monitoring kelengkapan rekaman wajib bulanan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Kelola Rekaman Wajib
          </Button>
        </div>
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Bulan Sebelumnya
        </Button>
        <div className="text-lg font-semibold text-gray-700">{monthLabel}</div>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          Bulan Berikutnya <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
        <Stat icon={CheckCircle} label="Lengkap" value={`${summary.completed}/${summary.total}`} color="text-green-600" />
        <Stat icon={Clock} label="Belum Lengkap" value={String(summary.pending)} color="text-amber-600" />
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900 col-span-2 md:col-span-1">
          <div className="text-xs text-gray-500 font-medium mb-2">Progress</div>
          <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
            <div
              className="bg-green-500 h-2 rounded-full transition-all"
              style={{ width: `${summary.progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-gray-500">{summary.progressPercent}%</div>
        </div>
      </div>

      {/* Items list */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 w-12 text-center">✓</th>
              <th className="px-4 py-3 text-left">Nama Rekaman Wajib</th>
              <th className="px-4 py-3 text-left">Kategori</th>
              <th className="px-4 py-3 text-left">Selesai</th>
              <th className="px-4 py-3 text-left">Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                Belum ada rekaman wajib. Tambah lewat "Kelola Rekaman Wajib".
              </td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className={it.isCompleted ? "bg-green-50/30 dark:bg-green-900/10" : ""}>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={it.isCompleted}
                    onChange={(e) => toggleMutation.mutate({ id: it.id, isCompleted: e.target.checked })}
                    className="w-4 h-4 rounded accent-green-600 cursor-pointer"
                  />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{it.itemName}</td>
                <td className="px-4 py-3 text-gray-600">{it.category || "—"}</td>
                <td className="px-4 py-3 text-gray-600">
                  {it.completedAt ? format(new Date(it.completedAt), "dd MMM yyyy", { locale: localeId }) : "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{it.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ManageTemplatesDialog open={manageOpen} onOpenChange={setManageOpen} onChanged={() => {
        qc.invalidateQueries({ queryKey: [`/api/monthly-checklist?year=${year}&month=${month}`] });
      }} />
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function ManageTemplatesDialog({ open, onOpenChange, onChanged }: {
  open: boolean; onOpenChange: (v: boolean) => void; onChanged: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("");

  const { data: templates = [] } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/checklist-templates"],
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async () => apiRequest("/api/checklist-templates", "POST", {
      itemName: itemName.trim(),
      category: category.trim() || null,
      isActive: true,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      onChanged();
      setItemName("");
      setCategory("");
      toast({ title: "Rekaman wajib ditambahkan" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/checklist-templates/${id}`, "DELETE"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/checklist-templates"] });
      onChanged();
      toast({ title: "Dihapus" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Kelola Rekaman Wajib</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Label>Nama Rekaman</Label>
              <Input value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="mis. Laporan inspeksi harian" />
            </div>
            <div>
              <Label>Kategori</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Inspeksi" />
            </div>
          </div>
          <Button
            size="sm"
            disabled={!itemName.trim() || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah
          </Button>

          <div className="border border-gray-200 dark:border-gray-700 rounded-md max-h-72 overflow-y-auto">
            {templates.length === 0 && (
              <div className="p-4 text-center text-sm text-gray-400">Belum ada template.</div>
            )}
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                <div>
                  <div className="text-sm text-gray-900 dark:text-gray-100">{t.itemName}</div>
                  {t.category && <div className="text-xs text-gray-500">{t.category}</div>}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 h-7 w-7 p-0"
                  onClick={() => removeMutation.mutate(t.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

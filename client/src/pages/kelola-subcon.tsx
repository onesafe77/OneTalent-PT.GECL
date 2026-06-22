import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Plus, Pencil, Trash2, HardHat, Loader2, KeyRound } from "lucide-react";

interface SubconAccount {
  id: string;
  username: string;
  name: string;
  company: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function KelolaSubcon() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubconAccount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SubconAccount | null>(null);

  const [form, setForm] = useState({
    name: "",
    company: "",
    username: "",
    password: "",
    isActive: true,
  });

  const { data: accounts = [], isLoading } = useQuery<SubconAccount[]>({
    queryKey: ["/api/subcon-accounts"],
  });

  const resetForm = () => {
    setForm({ name: "", company: "", username: "", password: "", isActive: true });
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (acc: SubconAccount) => {
    setEditing(acc);
    setForm({
      name: acc.name,
      company: acc.company || "",
      username: acc.username,
      password: "",
      isActive: acc.isActive,
    });
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const body: any = {
          name: form.name,
          company: form.company || null,
          username: form.username,
          isActive: form.isActive,
        };
        if (form.password) body.password = form.password;
        return apiRequest(`/api/subcon-accounts/${editing.id}`, "PUT", body);
      }
      return apiRequest("/api/subcon-accounts", "POST", {
        name: form.name,
        company: form.company || null,
        username: form.username,
        password: form.password,
        isActive: form.isActive,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcon-accounts"] });
      toast({ title: editing ? "Akun subcon diperbarui" : "Akun subcon dibuat" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "Gagal menyimpan",
        description: err?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest(`/api/subcon-accounts/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subcon-accounts"] });
      toast({ title: "Akun subcon dihapus" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({
        title: "Gagal menghapus",
        description: err?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    form.name.trim() &&
    form.username.trim() &&
    (editing || form.password.trim());

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
            <HardHat className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Kelola Subcon
            </h1>
            <p className="text-sm text-gray-500">
              Akun subkontraktor (akses modul Kesehatan / MCU saja)
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4 mr-2" /> Tambah Subcon
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            Belum ada akun subcon. Klik "Tambah Subcon" untuk membuat.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Perusahaan</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((acc) => (
                <TableRow key={acc.id}>
                  <TableCell className="font-medium">{acc.name}</TableCell>
                  <TableCell className="text-gray-500">{acc.company || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{acc.username}</TableCell>
                  <TableCell>
                    <span
                      className={
                        acc.isActive
                          ? "inline-flex px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700"
                          : "inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"
                      }
                    >
                      {acc.isActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(acc)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteTarget(acc)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Akun Subcon" : "Tambah Akun Subcon"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Perusahaan</Label>
              <Input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Nama perusahaan subcon"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Username / Kode</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="username untuk login"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5" />
                Password {editing && <span className="text-xs text-gray-400">(kosongkan jika tidak diubah)</span>}
              </Label>
              <Input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? "•••••• (tidak diubah)" : "Password login"}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <Label>Akun Aktif</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!canSubmit || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun subcon?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun <b>{deleteTarget?.name}</b> ({deleteTarget?.username}) akan
              dihapus permanen dan tidak bisa login lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

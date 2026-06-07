import { useState, useEffect, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { MobileSidakLayout } from "@/components/sidak/mobile-sidak-layout";
import { cn } from "@/lib/utils";
import { Check, ArrowRight, Plus, Trash2, ShieldAlert, ClipboardList, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SignaturePad } from "@/components/sidak/signature-pad";
import { useSidakDraft } from "@/hooks/use-sidak-draft";
import { DraftRecoveryDialog } from "@/components/sidak/draft-recovery-dialog";
import { KARTU_CCC, getKartuCcc } from "@/lib/kartu-ccc";

interface ItemRow { uraian: string; status: string }
interface Observer { nama: string; departemenPerusahaan: string; signatureDataUrl: string }

interface HeaderData {
    judulSop: string;
    tanggalPublikasi: string;
    perusahaan: string;
    risiko: string;
    departemen: string;
    nilaiRisikoMurni: string;
    tingkatRisiko: string;
    kartuCccId: string;
    tanggal: string;
}

interface SopKritisDraft {
    step: number;
    headerData: HeaderData;
    pengendalian: ItemRow[];
    langkah: ItemRow[];
    observers: Observer[];
}

const initialHeader: HeaderData = {
    judulSop: "",
    tanggalPublikasi: "",
    perusahaan: "PT Borneo Indobara",
    risiko: "",
    departemen: "",
    nilaiRisikoMurni: "",
    tingkatRisiko: "Tinggi",
    kartuCccId: "",
    tanggal: new Date().toISOString().split("T")[0],
};

const initialDraft: SopKritisDraft = {
    step: 1,
    headerData: initialHeader,
    pengendalian: [],
    langkah: [],
    observers: [],
};

export default function SidakSopKritisForm() {
    const [, navigate] = useLocation();
    const { toast } = useToast();

    const [editMatch, editParams] = useRoute("/workspace/sidak/sop-kritis/:id/edit");
    const editId = editMatch ? (editParams?.id ?? null) : null;
    const isEdit = !!editId;

    const {
        saveDraft, clearDraft, restoreDraft, ignoreDraft, showRecoveryDialog, draftTimestamp,
    } = useSidakDraft<SopKritisDraft>({ key: isEdit ? `sop-kritis-edit-${editId}` : "sop-kritis", initialData: initialDraft, debounceMs: 1500 });

    const loadedRef = useRef(false);
    const restoredRef = useRef(false);

    const [step, setStep] = useState(1);
    const [headerData, setHeaderData] = useState<HeaderData>(initialHeader);
    const [pengendalian, setPengendalian] = useState<ItemRow[]>([]);
    const [langkah, setLangkah] = useState<ItemRow[]>([]);
    const [observers, setObservers] = useState<Observer[]>([]);

    const [curPengendalian, setCurPengendalian] = useState<ItemRow>({ uraian: "", status: "Ya" });
    const [curLangkah, setCurLangkah] = useState<ItemRow>({ uraian: "", status: "Ya" });
    const [curObserver, setCurObserver] = useState<Observer>({ nama: "", departemenPerusahaan: "", signatureDataUrl: "" });

    useEffect(() => {
        saveDraft({ step, headerData, pengendalian, langkah, observers });
    }, [step, headerData, pengendalian, langkah, observers, saveDraft]);

    const handleRestoreDraft = () => {
        restoredRef.current = true; // jangan timpa dengan data server (mode edit)
        const d = restoreDraft();
        if (d) {
            setStep(d.step);
            setHeaderData({ ...initialHeader, ...d.headerData });
            setPengendalian(d.pengendalian || []);
            setLangkah(d.langkah || []);
            setObservers(d.observers || []);
        }
    };

    // Mode edit: muat data sesi dari server (kecuali user memilih melanjutkan draft)
    useEffect(() => {
        if (!isEdit || loadedRef.current) return;
        loadedRef.current = true;
        (async () => {
            try {
                const res = await fetch(`/api/sidak-sop-kritis/${editId}`);
                if (!res.ok) return;
                const d = await res.json();
                if (restoredRef.current) return; // user sudah restore draft → jangan timpa
                setHeaderData({
                    ...initialHeader,
                    judulSop: d.judulSop || "",
                    tanggalPublikasi: d.tanggalPublikasi || "",
                    perusahaan: d.perusahaan || initialHeader.perusahaan,
                    risiko: d.risiko || "",
                    departemen: d.departemen || "",
                    nilaiRisikoMurni: d.nilaiRisikoMurni || "",
                    tingkatRisiko: d.tingkatRisiko || initialHeader.tingkatRisiko,
                    kartuCccId: d.kartuCccId || "",
                    tanggal: d.tanggal || initialHeader.tanggal,
                });
                setPengendalian((d.pengendalian || []).map((p: any) => ({ uraian: p.uraian, status: p.status })));
                setLangkah((d.langkah || []).map((p: any) => ({ uraian: p.uraian, status: p.status })));
                setObservers((d.observers || []).map((o: any) => ({ nama: o.nama, departemenPerusahaan: o.departemenPerusahaan || "", signatureDataUrl: o.signatureDataUrl || "" })));
            } catch (e) {
                toast({ title: "Gagal memuat", description: "Tidak bisa memuat data untuk diedit.", variant: "destructive" });
            }
        })();
    }, [isEdit, editId, toast]);

    const selectedKartu = getKartuCcc(headerData.kartuCccId);

    // Pilih Kartu CCC -> set id, isi risiko, prefill Pengendalian dari kontrol kartu (default "Ya")
    const handleSelectKartu = (id: string) => {
        const sop = getKartuCcc(id);
        if (!sop) return;
        // Auto-isi seluruh field dari SOP resmi terpilih.
        setHeaderData((h) => ({
            ...h,
            kartuCccId: id,
            judulSop: sop.judulSop,
            risiko: sop.risiko,
            departemen: sop.departemen,
            perusahaan: sop.perusahaan,
            nilaiRisikoMurni: sop.nilaiRisikoMurni,
            tingkatRisiko: sop.tingkatRisiko,
            tanggalPublikasi: sop.tanggalPublikasi || h.tanggalPublikasi,
        }));
        setPengendalian(sop.controls.map((c) => ({ uraian: c, status: "Ya" })));
        setLangkah(sop.langkah.map((l) => ({ uraian: l, status: "Ya" })));
        toast({
            title: "SOP dipilih",
            description: `${sop.controls.length} Pengendalian & ${sop.langkah.length} Langkah Kritikal terisi otomatis.`,
        });
    };

    const addPengendalian = () => {
        if (!curPengendalian.uraian.trim()) {
            toast({ title: "Peringatan", description: "Uraian pengendalian wajib diisi.", variant: "destructive" });
            return;
        }
        setPengendalian([...pengendalian, curPengendalian]);
        setCurPengendalian({ uraian: "", status: "Ya" });
    };

    const addLangkah = () => {
        if (!curLangkah.uraian.trim()) {
            toast({ title: "Peringatan", description: "Uraian item/langkah wajib diisi.", variant: "destructive" });
            return;
        }
        setLangkah([...langkah, curLangkah]);
        setCurLangkah({ uraian: "", status: "Ya" });
    };

    const addObserver = () => {
        if (!curObserver.nama || !curObserver.signatureDataUrl) {
            toast({ title: "Gagal", description: "Nama & tanda tangan wajib ada.", variant: "destructive" });
            return;
        }
        setObservers([...observers, curObserver]);
        setCurObserver({ nama: "", departemenPerusahaan: "", signatureDataUrl: "" });
    };

    const handleHeaderNext = () => {
        if (!headerData.judulSop.trim()) {
            toast({ title: "Peringatan", description: "Judul SOP wajib diisi.", variant: "destructive" });
            return;
        }
        setStep(2);
    };

    // Submit-at-end: edit -> PUT (replace-all 1 request); create -> POST sesi + batch child
    const finishMutation = useMutation({
        mutationFn: async () => {
            if (isEdit) {
                return apiRequest(`/api/sidak-sop-kritis/${editId}`, "PUT", { ...headerData, pengendalian, langkah, observers });
            }
            const session: any = await apiRequest("/api/sidak-sop-kritis", "POST", headerData);
            const sid = session.id;
            for (const it of pengendalian) {
                await apiRequest(`/api/sidak-sop-kritis/${sid}/pengendalian`, "POST", it);
            }
            for (const it of langkah) {
                await apiRequest(`/api/sidak-sop-kritis/${sid}/langkah`, "POST", it);
            }
            for (const o of observers) {
                await apiRequest(`/api/sidak-sop-kritis/${sid}/observers`, "POST", o);
            }
            return session;
        },
        onSuccess: () => {
            clearDraft();
            toast({ title: "Tersimpan", description: isEdit ? "Perubahan berhasil disimpan." : "Observasi SOP Kritis berhasil disimpan." });
            navigate("/workspace/sidak/sop-kritis/history");
        },
        onError: () => toast({ title: "Gagal", description: isEdit ? "Gagal menyimpan perubahan." : "Gagal menyimpan observasi.", variant: "destructive" }),
    });

    const StatusButtons = ({ value, onChange, withNA, size = "md" }: { value: string; onChange: (v: string) => void; withNA?: boolean; size?: "sm" | "md" }) => {
        const opts = withNA ? ["Ya", "Tidak", "N/A"] : ["Ya", "Tidak"];
        const color = (o: string) => o === "Ya" ? "bg-green-500 border-green-500" : o === "Tidak" ? "bg-red-500 border-red-500" : "bg-gray-500 border-gray-500";
        return (
            <div className={cn("grid gap-1.5", withNA ? "grid-cols-3" : "grid-cols-2")}>
                {opts.map((o) => (
                    <button key={o} type="button" onClick={() => onChange(o)}
                        className={cn("rounded-lg font-bold border-2 transition-colors", size === "sm" ? "h-7 text-xs" : "h-9 text-sm",
                            value === o ? `${color(o)} text-white` : "bg-white border-gray-200 text-gray-500")}>
                        {o}
                    </button>
                ))}
            </div>
        );
    };

    const renderBottom = () => {
        if (step === 1) return (
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={handleHeaderNext}>
                Lanjutkan <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        );
        if (step === 2) return (
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => setStep(3)} disabled={pengendalian.length === 0}>
                Lanjut ke Item/Langkah Kritikal <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        );
        if (step === 3) return (
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => setStep(4)} disabled={langkah.length === 0}>
                Lanjut ke Pemantau <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        );
        if (step === 4) return (
            <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => setStep(5)} disabled={observers.length === 0}>
                Lanjut ke Ringkasan <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
        );
        if (step === 5) return (
            <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={() => finishMutation.mutate()} disabled={finishMutation.isPending}>
                {finishMutation.isPending ? "Menyimpan..." : (isEdit ? "Perbarui & Simpan" : "Selesai & Simpan")} <Check className="ml-2 h-5 w-5" />
            </Button>
        );
        return null;
    };

    const steps = [
        { n: 1, label: "Info SOP" },
        { n: 2, label: "Pengendalian" },
        { n: 3, label: "Langkah" },
        { n: 4, label: "Pemantau" },
        { n: 5, label: "Selesai" },
    ];

    return (
        <MobileSidakLayout
            title={isEdit ? "Edit Observasi SOP Kritis" : "Observasi SOP Kritis"}
            step={step}
            totalSteps={5}
            onBack={() => step > 1 ? setStep(step - 1) : navigate(isEdit ? "/workspace/sidak/sop-kritis/history" : "/workspace/sidak")}
            bottomAction={renderBottom()}
        >
            <div className="pb-24">
                <Card className="mb-4 border-none shadow-none bg-blue-50/50">
                    <CardContent className="pt-6 pb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-blue-700">Langkah {step} dari 5</span>
                            <span className="text-sm font-bold text-blue-700">{Math.round((step / 5) * 100)}%</span>
                        </div>
                        <Progress value={(step / 5) * 100} className="h-2 bg-blue-100" />
                        <div className="flex justify-between mt-4">
                            {steps.map((s) => (
                                <div key={s.n} className={cn("flex flex-col items-center", step >= s.n ? "opacity-100" : "opacity-40")}>
                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1", step > s.n ? "bg-green-500 text-white" : "bg-blue-600 text-white")}>
                                        {step > s.n ? <Check className="w-4 h-4" /> : s.n}
                                    </div>
                                    <span className="text-[10px] font-medium">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Step 1: Info SOP */}
                {step === 1 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        {/* Selektor Kartu CCC */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="w-4 h-4 text-rose-500" /> Pilih SOP Kritikal</CardTitle>
                                <CardDescription className="text-xs">Pilih SOP resmi — Judul SOP, Risiko, Departemen, NR0, Pengendalian & Langkah Kritikal terisi otomatis.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 gap-2">
                                    {KARTU_CCC.map((k) => (
                                        <button
                                            key={k.id}
                                            type="button"
                                            onClick={() => handleSelectKartu(k.id)}
                                            className={cn(
                                                "text-left rounded-lg border-2 overflow-hidden transition-all bg-white",
                                                headerData.kartuCccId === k.id ? "border-rose-500 ring-2 ring-rose-200" : "border-gray-200 hover:border-gray-300"
                                            )}
                                        >
                                            <img src={k.image} alt={k.risiko} className="w-full h-24 object-cover object-top" />
                                            <div className="p-2">
                                                <p className="text-[11px] font-semibold leading-tight line-clamp-2">{k.judulSop}</p>
                                                <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{k.risiko}</p>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{k.controls.length} kontrol · {k.langkah.length} langkah</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {selectedKartu && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">
                                        <Check className="w-4 h-4 shrink-0" />
                                        <span>Terpilih: <strong>{selectedKartu.judulSop}</strong> — {selectedKartu.controls.length} Pengendalian & {selectedKartu.langkah.length} Langkah terisi otomatis (bisa diedit).</span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2"><ClipboardList className="w-5 h-5 text-amber-500" /> Informasi SOP</CardTitle>
                                <CardDescription>Ringkasan Pengendalian dan SOP Kritikal</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Judul SOP</Label>
                                    <Input placeholder="Contoh: GECL-HAUL-PPO_4.2.11 Charging Electric Vehicle" value={headerData.judulSop} onChange={(e) => setHeaderData({ ...headerData, judulSop: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tanggal Publikasi</Label>
                                        <Input type="date" value={headerData.tanggalPublikasi} onChange={(e) => setHeaderData({ ...headerData, tanggalPublikasi: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Departemen</Label>
                                        <Input placeholder="Operation" value={headerData.departemen} onChange={(e) => setHeaderData({ ...headerData, departemen: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Perusahaan</Label>
                                    <Input value={headerData.perusahaan} onChange={(e) => setHeaderData({ ...headerData, perusahaan: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Risiko {selectedKartu && <span className="text-[10px] text-rose-500">(dari kartu)</span>}</Label>
                                    <Input placeholder="Contoh: Unit/Charging Station Terbakar" value={headerData.risiko} onChange={(e) => setHeaderData({ ...headerData, risiko: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Nilai Risiko Murni (NR0)</Label>
                                        <Input placeholder="20" value={headerData.nilaiRisikoMurni} onChange={(e) => setHeaderData({ ...headerData, nilaiRisikoMurni: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tingkat Risiko</Label>
                                        <Select value={headerData.tingkatRisiko} onValueChange={(v) => setHeaderData({ ...headerData, tingkatRisiko: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Rendah">Rendah (Hijau)</SelectItem>
                                                <SelectItem value="Sedang">Sedang (Kuning)</SelectItem>
                                                <SelectItem value="Tinggi">Tinggi (Oranye)</SelectItem>
                                                <SelectItem value="Ekstrem">Ekstrem (Merah)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 2: Pengendalian Kritikal */}
                {step === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" /> Pengendalian Kritikal</CardTitle>
                                <CardDescription className="text-xs">{pengendalian.length} item — centang Ya / Tidak / N/A sesuai temuan lapangan.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700 flex gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>Jika satu dari Pengendalian Kritikal tidak ada di lapangan — <strong>HENTIKAN PEKERJAAN</strong>.</span>
                                </div>
                                {selectedKartu && (
                                    <img src={selectedKartu.image} alt={selectedKartu.risiko} className="w-full rounded-lg border" />
                                )}
                                {pengendalian.map((it, i) => (
                                    <div key={i} className="p-2 border rounded-lg bg-gray-50/50 space-y-2">
                                        <div className="flex items-start gap-2 text-sm">
                                            <span className="font-bold text-gray-400">{i + 1}.</span>
                                            <span className="flex-1">{it.uraian}</span>
                                            <button onClick={() => setPengendalian(pengendalian.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <StatusButtons size="sm" withNA value={it.status} onChange={(v) => setPengendalian(pengendalian.map((p, idx) => idx === i ? { ...p, status: v } : p))} />
                                    </div>
                                ))}
                                <Separator />
                                <div className="space-y-2">
                                    <Label>Tambah Pengendalian Kritikal (manual)</Label>
                                    <Textarea placeholder="Contoh: P2H / Inspeksi Area dan Peralatan kerja" value={curPengendalian.uraian} onChange={(e) => setCurPengendalian({ ...curPengendalian, uraian: e.target.value })} rows={2} />
                                    <StatusButtons value={curPengendalian.status} withNA onChange={(v) => setCurPengendalian({ ...curPengendalian, status: v })} />
                                    <Button variant="outline" className="w-full border-blue-200 text-blue-700" onClick={addPengendalian}><Plus className="w-4 h-4 mr-2" /> Tambah Pengendalian</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 3: Item/Langkah Kritikal */}
                {step === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4 text-blue-600" /> Item / Langkah Kritikal</CardTitle>
                                <CardDescription className="text-xs">{langkah.length} item ditambahkan</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {langkah.map((it, i) => (
                                    <div key={i} className="p-2 border rounded-lg bg-gray-50/50 space-y-2">
                                        <div className="flex items-start gap-2 text-sm">
                                            <span className="font-bold text-gray-400">{i + 1}.</span>
                                            <span className="flex-1">{it.uraian}</span>
                                            <button onClick={() => setLangkah(langkah.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                        <StatusButtons size="sm" value={it.status} onChange={(v) => setLangkah(langkah.map((p, idx) => idx === i ? { ...p, status: v } : p))} />
                                    </div>
                                ))}
                                <Separator />
                                <div className="space-y-2">
                                    <Label>Uraian Item / Langkah Kritikal</Label>
                                    <Textarea placeholder="Contoh: Melakukan P2H sebelum charging (kondisi charger, kabel, konektor...)" value={curLangkah.uraian} onChange={(e) => setCurLangkah({ ...curLangkah, uraian: e.target.value })} rows={2} />
                                    <StatusButtons value={curLangkah.status} onChange={(v) => setCurLangkah({ ...curLangkah, status: v })} />
                                    <Button variant="outline" className="w-full border-blue-200 text-blue-700" onClick={addLangkah}><Plus className="w-4 h-4 mr-2" /> Tambah Item/Langkah</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 4: Pemantau */}
                {step === 4 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <Card>
                            <CardHeader className="text-white bg-blue-600 rounded-t-lg">
                                <CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" /> Catatan Hasil Observasi (Pemantau)</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">
                                {observers.map((o, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                                        <div>
                                            <p className="font-bold text-sm">{o.nama}</p>
                                            <p className="text-xs text-gray-500">{o.departemenPerusahaan}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="text-green-600 w-5 h-5" />
                                            <button onClick={() => setObservers(observers.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Nama</Label>
                                        <Input placeholder="Nama Lengkap" value={curObserver.nama} onChange={(e) => setCurObserver({ ...curObserver, nama: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Departemen / Perusahaan</Label>
                                        <Input placeholder="Operation / PT Borneo Indobara" value={curObserver.departemenPerusahaan} onChange={(e) => setCurObserver({ ...curObserver, departemenPerusahaan: e.target.value })} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tanda Tangan</Label>
                                        <SignaturePad onSave={(url) => setCurObserver({ ...curObserver, signatureDataUrl: url })} />
                                    </div>
                                    <Button variant="outline" className="w-full border-blue-200 text-blue-700" onClick={addObserver}>Tambah Pemantau</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Step 5: Ringkasan */}
                {step === 5 && (
                    <Card className="animate-in fade-in slide-in-from-bottom-4">
                        <CardHeader className="bg-green-600 text-white rounded-t-lg">
                            <CardTitle>Ringkasan</CardTitle>
                            <CardDescription className="text-green-100">Review sebelum disimpan</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-3 text-sm">
                            {selectedKartu && (
                                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-lg p-2">
                                    <img src={selectedKartu.image} alt={selectedKartu.risiko} className="w-16 h-16 object-cover object-top rounded" />
                                    <div>
                                        <p className="text-[11px] text-rose-500 font-semibold">Kartu CCC</p>
                                        <p className="text-sm font-bold leading-tight">{selectedKartu.risiko}</p>
                                    </div>
                                </div>
                            )}
                            <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                                <div className="flex justify-between"><span className="text-gray-500">Judul SOP:</span><span className="font-bold text-right">{headerData.judulSop}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Departemen:</span><span className="font-bold">{headerData.departemen || "-"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Risiko:</span><span className="font-bold text-right">{headerData.risiko || "-"}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">NR0:</span><span className="font-bold">{headerData.nilaiRisikoMurni || "-"} ({headerData.tingkatRisiko})</span></div>
                            </div>
                            <div className="flex justify-between"><span className="text-gray-500">Pengendalian Kritikal:</span><span className="font-bold">{pengendalian.length} item</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Item/Langkah Kritikal:</span><span className="font-bold">{langkah.length} item</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">Pemantau:</span><span className="font-bold">{observers.map(o => o.nama).join(", ") || "-"}</span></div>
                        </CardContent>
                    </Card>
                )}
            </div>

            <DraftRecoveryDialog
                open={showRecoveryDialog}
                onRestore={handleRestoreDraft}
                onDiscard={ignoreDraft}
                timestamp={draftTimestamp}
                formType="sop-kritis"
            />
        </MobileSidakLayout>
    );
}

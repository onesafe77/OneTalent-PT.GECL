import { useState, useEffect, useRef } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    LineController,
    BarController,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Edit, Sparkles, Loader2, Download } from "lucide-react";
import html2canvas from "html2canvas";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels,
    LineController,
    BarController
);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Oct', 'Nov', 'Des'];
const STORAGE_KEY = 'gecl_dashboard_2026'; // Key updated for 2026
const DEFAULT_DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const DEFAULT_DATA = {
    manpower: Array(12).fill(100),
    days_in_month: [...DEFAULT_DAYS_IN_MONTH],
    leap_year: false,
    hours_per_day: 11,
    factor_mh: 0.85,
    // 2026 Defaults: Incidents all 0
    ti_incidents: Array(12).fill(0),
    tr_value: 6.42,
    mode_ytd_tifr: true,
    fatigue_incidents: Array(12).fill(0),
    mode_ytd_fatigue: true,
    menabrak: Array(12).fill(0),
    rebah: Array(12).fill(0),
    mode_ytd_cifr: true,
    aiInsights: [] as string[]
};

export default function DashboardStatistics() {
    const [data, setData] = useState(DEFAULT_DATA);
    const [chartsData, setChartsData] = useState<{ tifr: number[], fatigue: number[], cifr: number[] }>({ tifr: [], fatigue: [], cifr: [] });
    // MH panel toggle state (incidents are now always visible)
    const [mhOpen, setMhOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState({ mh: 0, tifr: 0, fatigue: 0, cifr: 0 });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const dashboardRef = useRef<HTMLDivElement>(null);

    const exportToJPG = async () => {
        if (!dashboardRef.current) return;
        setIsExporting(true);
        try {
            const canvas = await html2canvas(dashboardRef.current, {
                backgroundColor: '#f8fafc',
                scale: 2,
                useCORS: true,
                logging: false,
                windowWidth: 1920, // Force Desktop Width
                onclone: (clonedDoc) => {
                    const clonedContent = clonedDoc.querySelector('[data-dashboard-container]') as HTMLElement;
                    if (clonedContent) {
                        clonedContent.style.width = '1920px';
                        clonedContent.style.height = 'auto';
                        clonedContent.style.background = '#f8fafc';
                        // Ensure charts resize/render correctly
                        const charts = clonedContent.querySelectorAll('canvas');
                        charts.forEach((chart) => {
                            chart.style.display = 'block';
                        });
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `STATISTIK_KESELAMATAN_GECL_2026_${new Date().toISOString().split('T')[0]}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } catch (error) {
            console.error('Export error:', error);
            alert('Gagal export gambar');
        }
        setIsExporting(false);
    };

    const analyzeWithAI = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch("/api/ai/analyze-statistics", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data })
            });
            if (!res.ok) throw new Error("Analysis failed");
            const result = await res.json();
            const newData = { ...data, aiInsights: result.insights };
            setData(newData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
        } catch (error) {
            alert("Gagal melakukan analisa AI. Pastikan server berjalan.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Ensure structure match for new year
                setData({ ...DEFAULT_DATA, ...parsed });
            } catch (e) {
                console.error("Data corrupt, resetting");
            }
        }
    }, []);

    useEffect(() => {
        calculate();
    }, [data]);

    const saveData = (newData: typeof DEFAULT_DATA) => {
        setData(newData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    };

    const calculate = () => {
        const MH = [];
        let cumMH = 0;
        let cumTI = 0;
        let cumFatigue = 0;
        let cumMenabrak = 0;
        let cumRebah = 0;

        const series = { tifr: [] as number[], fatigue: [] as number[], cifr: [] as number[] };

        const daysInMonth = [...data.days_in_month];
        daysInMonth[1] = data.leap_year ? 29 : 28;

        for (let i = 0; i < 12; i++) {
            const currentMH = data.manpower[i] * data.hours_per_day * daysInMonth[i] * data.factor_mh;
            MH.push(currentMH);
            cumMH += currentMH;

            cumTI += data.ti_incidents[i];
            cumFatigue += data.fatigue_incidents[i];
            cumMenabrak += data.menabrak[i];
            cumRebah += data.rebah[i];
            const cumCIFRInc = cumMenabrak + cumRebah;
            const currentCIFRInc = data.menabrak[i] + data.rebah[i];

            // TIFR
            series.tifr[i] = data.mode_ytd_tifr
                ? (cumMH > 0 ? (cumTI * 1000000 / cumMH) : 0)
                : (currentMH > 0 ? (data.ti_incidents[i] * 1000000 / currentMH) : 0);

            // Fatigue
            series.fatigue[i] = data.mode_ytd_fatigue
                ? (cumMH > 0 ? (cumFatigue * 1000000 / cumMH) : 0)
                : (currentMH > 0 ? (data.fatigue_incidents[i] * 1000000 / currentMH) : 0);

            // CIFR
            series.cifr[i] = data.mode_ytd_cifr
                ? (cumMH > 0 ? (cumCIFRInc * 1000000 / cumMH) : 0)
                : (currentMH > 0 ? (currentCIFRInc * 1000000 / currentMH) : 0);
        }
        setChartsData(series);
    };

    const commonOptions: any = {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { top: 20, right: 20, left: 10, bottom: 0 }
        },
        plugins: {
            legend: {
                position: 'top',
                align: 'end',
                labels: {
                    usePointStyle: true,
                    boxWidth: 8,
                    useBorderRadius: true,
                    borderRadius: 4,
                    padding: 20,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11,
                        weight: 600
                    },
                    color: '#64748b'
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: true,
                boxPadding: 4,
                titleFont: { weight: 'bold' }
            },
            datalabels: {
                anchor: 'end', align: 'end', offset: -4,
                color: (ctx: any) => ctx.dataset.type === 'line' ? '#1e293b' : '#ffffff',
                font: { weight: 'bold', size: 10 },
                formatter: (value: number, ctx: any) => {
                    if (ctx.dataset.type === 'line') return value.toFixed(2).replace('.', ',');
                    return value > 0 ? value : '';
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { display: true, color: '#f1f5f9', drawBorder: false },
                ticks: { font: { size: 10 }, color: '#94a3b8', padding: 10 }
            },
            x: {
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#64748b' }
            },
            y1: {
                beginAtZero: true,
                position: 'right',
                grid: { display: false },
                ticks: { font: { size: 10 }, color: '#94a3b8' }
            }
        }
    };

    return (
        <div ref={dashboardRef} data-dashboard-container className="min-h-screen bg-gray-50/50 p-4 md:p-8 space-y-8 font-sans relative overflow-hidden text-slate-800">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none -z-10 blur-3xl" />

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white/70 backdrop-blur-xl p-6 rounded-3xl shadow-sm border border-white/60 sticky top-4 z-40">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                        <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-none bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent uppercase">
                            Safety Statistics
                        </h1>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Annual Safety Performance Report 2026
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={exportToJPG}
                        disabled={isExporting}
                        className="rounded-xl border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                        {isExporting ? 'Exporting...' : 'Download JPG'}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">

                {/* Main Content (Charts) */}
                <div className="xl:col-span-3 space-y-8">

                    {/* MH Input Section (Collapsible) */}
                    <Card className="border-none shadow-lg bg-white/80 backdrop-blur-sm rounded-3xl overflow-hidden group">
                        <CardHeader
                            className="bg-white/50 border-b border-gray-100 p-6 flex flex-row items-center justify-between cursor-pointer hover:bg-white/80 transition-colors"
                            onClick={() => setMhOpen(!mhOpen)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                    <Edit className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-base font-bold text-gray-800">Global Settings & Manhours</CardTitle>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5">Configure monthly manpower and working days</p>
                                </div>
                            </div>
                            {mhOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                        </CardHeader>

                        {mhOpen && (
                            <CardContent className="p-6 bg-slate-50/50 animate-in slide-in-from-top-2 duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Bulan</Label>
                                        <Select value={selectedMonth.mh.toString()} onValueChange={(v) => setSelectedMonth({ ...selectedMonth, mh: parseInt(v) })}>
                                            <SelectTrigger className="bg-white rounded-xl border-slate-200"><SelectValue /></SelectTrigger>
                                            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Manpower</Label>
                                        <Input className="bg-white rounded-xl border-slate-200" type="number" value={data.manpower[selectedMonth.mh]} onChange={(e) => {
                                            const newManpower = [...data.manpower];
                                            newManpower[selectedMonth.mh] = parseInt(e.target.value) || 0;
                                            setData({ ...data, manpower: newManpower });
                                        }} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Hari Kerja</Label>
                                        <Input className="bg-white rounded-xl border-slate-200" type="number" value={data.days_in_month[selectedMonth.mh]} onChange={(e) => {
                                            const newDays = [...data.days_in_month];
                                            newDays[selectedMonth.mh] = parseInt(e.target.value) || 0;
                                            setData({ ...data, days_in_month: newDays });
                                        }} />
                                    </div>
                                    <div className="flex items-center space-x-2 pt-6">
                                        <Checkbox id="leap" checked={data.leap_year} onCheckedChange={(c) => setData({ ...data, leap_year: !!c })} />
                                        <Label htmlFor="leap" className="text-sm">Kabisat (Feb 29)</Label>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Jam/Hari</Label>
                                        <Input className="bg-white rounded-xl border-slate-200" type="number" value={data.hours_per_day} onChange={(e) => setData({ ...data, hours_per_day: parseFloat(e.target.value) || 0 })} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">Faktor MH (0.85)</Label>
                                        <Input
                                            className="bg-white rounded-xl border-slate-200"
                                            type="text"
                                            defaultValue={data.factor_mh}
                                            onBlur={(e) => {
                                                const val = e.target.value.replace(',', '.');
                                                const floatVal = parseFloat(val);
                                                setData({ ...data, factor_mh: isNaN(floatVal) ? 0.85 : floatVal });
                                            }}
                                            placeholder="Ex: 0.85"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">MH Bulan Ini</Label>
                                        <Input readOnly disabled className="bg-slate-100 rounded-xl border-slate-200 font-bold text-gray-700" value={(() => {
                                            const idx = selectedMonth.mh;
                                            const daysInMonth = [...data.days_in_month];
                                            daysInMonth[1] = data.leap_year ? 29 : 28;
                                            const mh = data.manpower[idx] * data.hours_per_day * daysInMonth[idx] * data.factor_mh;
                                            return mh.toLocaleString('id-ID', { maximumFractionDigits: 2 });
                                        })()} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-semibold text-slate-500 uppercase">MH YTD</Label>
                                        <Input readOnly disabled className="bg-slate-100 rounded-xl border-slate-200 font-bold text-gray-700" value={(() => {
                                            const idx = selectedMonth.mh;
                                            const daysInMonth = [...data.days_in_month];
                                            daysInMonth[1] = data.leap_year ? 29 : 28;
                                            let ytd = 0;
                                            for (let i = 0; i <= idx; i++) {
                                                ytd += data.manpower[i] * data.hours_per_day * daysInMonth[i] * data.factor_mh;
                                            }
                                            return ytd.toLocaleString('id-ID', { maximumFractionDigits: 2 });
                                        })()} />
                                    </div>
                                    <div className="col-span-full pt-2 text-right">
                                        <Button size="sm" onClick={() => {
                                            saveData(data);
                                            alert("Data Manhours (MH) Berhasil Disimpan! 💾");
                                        }} className="rounded-xl bg-blue-600 hover:bg-blue-700">Simpan Perubahan MH</Button>
                                    </div>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Chart 1: TIFR */}
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
                        <div className="p-1">
                            <div className="bg-gradient-to-r from-red-50 to-white p-4 rounded-t-3xl border-b border-red-50 flex flex-col xl:flex-row gap-4 justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600 font-black text-lg shadow-sm">1</div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 text-lg">TIFR</h2>
                                        <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Total Injury Frequency Rate</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 bg-white/80 p-2 rounded-xl shadow-sm border border-red-100/50">
                                    <div className="w-[100px]">
                                        <Select value={selectedMonth.tifr.toString()} onValueChange={(v) => setSelectedMonth({ ...selectedMonth, tifr: parseInt(v) })}>
                                            <SelectTrigger className="h-8 text-xs bg-white border-none shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <Input className="h-8 w-[80px] text-xs bg-white border-slate-200" type="number" placeholder="Insiden" value={data.ti_incidents[selectedMonth.tifr]} onChange={(e) => {
                                        const newIncidents = [...data.ti_incidents];
                                        newIncidents[selectedMonth.tifr] = parseInt(e.target.value) || 0;
                                        setData({ ...data, ti_incidents: newIncidents });
                                    }} />
                                    <Input className="h-8 w-[80px] text-xs bg-white border-slate-200" type="number" step="0.01" placeholder="TR" value={data.tr_value} onChange={(e) => setData({ ...data, tr_value: parseFloat(e.target.value) || 0 })} />
                                    <div className="flex items-center space-x-2 px-2">
                                        <Checkbox id="ytd_tifr" checked={data.mode_ytd_tifr} onCheckedChange={(c) => setData({ ...data, mode_ytd_tifr: !!c })} />
                                        <Label htmlFor="ytd_tifr" className="text-xs font-semibold">YTD</Label>
                                    </div>
                                    <Button size="sm" onClick={() => saveData(data)} className="h-8 text-xs rounded-lg bg-red-600 hover:bg-red-700">Save</Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 h-[400px]">
                            <Chart type='bar' data={{
                                labels: MONTHS,
                                datasets: [
                                    { type: 'bar' as const, label: 'Insiden', data: data.ti_incidents, backgroundColor: '#dc2626', borderRadius: 4, order: 2, yAxisID: 'y' },
                                    { type: 'line' as const, label: 'TIFR', data: chartsData.tifr, borderColor: '#166534', backgroundColor: '#166534', borderWidth: 2, pointRadius: 4, tension: 0.3, order: 1, yAxisID: 'y1' },
                                    { type: 'line' as const, label: 'TR', data: Array(12).fill(data.tr_value), borderColor: '#ef4444', borderDash: [5, 5], pointRadius: 0, borderWidth: 2, order: 0, yAxisID: 'y1' }
                                ]
                            }} options={commonOptions} />
                        </div>
                    </Card>

                    {/* Chart 2: Fatigue */}
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
                        <div className="p-1">
                            <div className="bg-gradient-to-r from-orange-50 to-white p-4 rounded-t-3xl border-b border-orange-50 flex flex-col xl:flex-row gap-4 justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 font-black text-lg shadow-sm">2</div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 text-lg">FATIGUE FR</h2>
                                        <p className="text-xs text-orange-500 font-bold uppercase tracking-wider">Fatigue Frequency Rate</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 bg-white/80 p-2 rounded-xl shadow-sm border border-orange-100/50">
                                    <div className="w-[100px]">
                                        <Select value={selectedMonth.fatigue.toString()} onValueChange={(v) => setSelectedMonth({ ...selectedMonth, fatigue: parseInt(v) })}>
                                            <SelectTrigger className="h-8 text-xs bg-white border-none shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <Input className="h-8 w-[100px] text-xs bg-white border-slate-200" type="number" placeholder="Insiden" value={data.fatigue_incidents[selectedMonth.fatigue]} onChange={(e) => {
                                        const newFatigue = [...data.fatigue_incidents];
                                        newFatigue[selectedMonth.fatigue] = parseInt(e.target.value) || 0;
                                        setData({ ...data, fatigue_incidents: newFatigue });
                                    }} />
                                    <div className="flex items-center space-x-2 px-2">
                                        <Checkbox id="ytd_fat" checked={data.mode_ytd_fatigue} onCheckedChange={(c) => setData({ ...data, mode_ytd_fatigue: !!c })} />
                                        <Label htmlFor="ytd_fat" className="text-xs font-semibold">YTD</Label>
                                    </div>
                                    <Button size="sm" onClick={() => saveData(data)} className="h-8 text-xs rounded-lg bg-orange-500 hover:bg-orange-600">Save</Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 h-[400px]">
                            <Chart type='bar' data={{
                                labels: MONTHS,
                                datasets: [
                                    { type: 'bar' as const, label: 'Insiden Fatigue', data: data.fatigue_incidents, backgroundColor: '#ea580c', borderRadius: 4, order: 2, yAxisID: 'y' },
                                    { type: 'line' as const, label: 'Fatigue FR', data: chartsData.fatigue, borderColor: '#166534', backgroundColor: '#166534', borderWidth: 2, tension: 0.3, pointRadius: 4, order: 1, yAxisID: 'y1' }
                                ]
                            }} options={commonOptions} />
                        </div>
                    </Card>

                    {/* Chart 3: CIFR */}
                    <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden ring-1 ring-slate-100">
                        <div className="p-1">
                            <div className="bg-gradient-to-r from-emerald-50 to-white p-4 rounded-t-3xl border-b border-emerald-50 flex flex-col xl:flex-row gap-4 justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black text-lg shadow-sm">3</div>
                                    <div>
                                        <h2 className="font-bold text-gray-900 text-lg">CIFR</h2>
                                        <p className="text-xs text-emerald-500 font-bold uppercase tracking-wider">Combined Injury Frequency Rate</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 bg-white/80 p-2 rounded-xl shadow-sm border border-emerald-100/50">
                                    <div className="w-[80px] shrink-0">
                                        <Select value={selectedMonth.cifr.toString()} onValueChange={(v) => setSelectedMonth({ ...selectedMonth, cifr: parseInt(v) })}>
                                            <SelectTrigger className="h-8 text-xs bg-white border-none shadow-none"><SelectValue /></SelectTrigger>
                                            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={i.toString()}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <Input className="h-8 w-[80px] text-xs bg-white border-slate-200" type="number" placeholder="Nabrak" value={data.menabrak[selectedMonth.cifr]} onChange={(e) => {
                                        const newMenabrak = [...data.menabrak];
                                        newMenabrak[selectedMonth.cifr] = parseInt(e.target.value) || 0;
                                        setData({ ...data, menabrak: newMenabrak });
                                    }} />
                                    <Input className="h-8 w-[80px] text-xs bg-white border-slate-200" type="number" placeholder="Rebah" value={data.rebah[selectedMonth.cifr]} onChange={(e) => {
                                        const newRebah = [...data.rebah];
                                        newRebah[selectedMonth.cifr] = parseInt(e.target.value) || 0;
                                        setData({ ...data, rebah: newRebah });
                                    }} />
                                    <div className="flex items-center space-x-2 px-2">
                                        <Checkbox id="ytd_cifr" checked={data.mode_ytd_cifr} onCheckedChange={(c) => setData({ ...data, mode_ytd_cifr: !!c })} />
                                        <Label htmlFor="ytd_cifr" className="text-xs font-semibold">YTD</Label>
                                    </div>
                                    <Button size="sm" onClick={() => saveData(data)} className="h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700">Save</Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 h-[400px]">
                            <Chart type='bar' data={{
                                labels: MONTHS,
                                datasets: [
                                    { type: 'bar' as const, label: 'Menabrak', data: data.menabrak, backgroundColor: '#dc2626', stack: 'stack1', borderRadius: 4, order: 3, yAxisID: 'y' },
                                    { type: 'bar' as const, label: 'Rebah', data: data.rebah, backgroundColor: '#64748b', stack: 'stack1', borderRadius: 4, order: 2, yAxisID: 'y' },
                                    { type: 'line' as const, label: 'CIFR', data: chartsData.cifr, borderColor: '#166534', backgroundColor: '#166534', borderWidth: 2, tension: 0.3, pointRadius: 4, order: 1, yAxisID: 'y1' }
                                ]
                            }} options={commonOptions} />
                        </div>
                    </Card>

                    <div className="flex justify-center pt-4">
                        <Button variant="ghost" className="text-xs text-red-400 hover:text-red-500 hover:bg-red-50" onClick={() => {
                            if (confirm("Yakin ingin menghapus semua data 2026 dan kembali ke default 0?")) {
                                localStorage.removeItem(STORAGE_KEY);
                                setData(DEFAULT_DATA);
                            }
                        }}>Reset All Data</Button>
                    </div>

                </div>

                {/* Sidebar: AI Analysis */}
                <div className="xl:col-span-1 space-y-6">
                    <Card className="border-none shadow-2xl bg-gradient-to-b from-emerald-900 to-slate-900 text-white rounded-3xl overflow-hidden sticky top-32">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Sparkles className="w-40 h-40 text-white" />
                        </div>
                        <CardHeader className="relative z-10">
                            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                <h3 className="font-bold text-lg bg-gradient-to-r from-white to-emerald-200 bg-clip-text text-transparent">Mystic AI Insights</h3>
                                <Button
                                    size="sm"
                                    className="bg-white/10 hover:bg-white/20 text-white text-xs border border-white/20 rounded-full"
                                    onClick={analyzeWithAI}
                                    disabled={isAnalyzing}
                                >
                                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                    {isAnalyzing ? "Analyzing..." : "Generate Insights"}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 relative z-10 min-h-[300px]">
                            {data.aiInsights && data.aiInsights.length > 0 ? (
                                <ul className="space-y-4 text-sm text-emerald-50 leading-relaxed font-medium">
                                    {data.aiInsights.map((insight, idx) => (
                                        <li key={idx} className="flex gap-3 bg-white/5 p-3 rounded-xl border border-white/5 backdrop-blur-sm">
                                            <span className="text-emerald-400 text-lg mt-0.5">•</span>
                                            <span>{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <div className="text-center py-12 text-emerald-200/40 text-xs italic flex flex-col items-center">
                                    <Sparkles className="w-8 h-8 mb-2 opacity-50" />
                                    No AI insights generated yet. <br />Click the button to analyze safety trends.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}

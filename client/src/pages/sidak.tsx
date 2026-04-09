import { Link } from "wouter";
import { ClipboardCheck, Activity, ClipboardList, ArrowLeft, TrafficCone, Truck, Shield, Maximize2, Gauge, Sun, Lock, Tablet, PenTool, Search, Bell, User, ChevronRight, BriefcaseMedical, Users, Radio } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
export default function SidakDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Mobile Header - Modern Style */}
      <div className="bg-red-600 dark:bg-red-900 pt-8 pb-8 px-6 rounded-b-[2.5rem] shadow-lg relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none" />

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <Link href="/workspace">
              <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                <Bell className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white tracking-tight mb-1">SIDAK</h1>
            <p className="text-red-100 text-sm">Sistem Inspeksi Data Karyawan</p>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-red-500 transition-colors" />
            <Input
              placeholder="Cari form inspeksi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl bg-white text-gray-900 border-0 focus-visible:ring-2 focus-visible:ring-white/50 shadow-lg shadow-red-900/20"
            />
          </div>
        </div>
      </div>

      <div className="container max-w-7xl mx-auto px-4 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(searchQuery === "" || "sidak fatigue kelelahan karyawan".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/fatigue/new" data-testid="link-sidak-fatigue">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                  <Activity className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Sidak Fatigue</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kelelahan Karyawan</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Max 20 Orang
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak roster kesesuaian roster".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/roster/new" data-testid="link-sidak-roster">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 mr-4 flex-shrink-0">
                  <ClipboardList className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-purple-600 transition-colors">Sidak Roster</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kesesuaian Roster</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                    Max 15 Orang
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak seatbelt kepatuhan seatbelt".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/seatbelt/new" data-testid="link-sidak-seatbelt">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-4 flex-shrink-0">
                  <ClipboardCheck className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-green-600 transition-colors">Sidak Seatbelt</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kepatuhan Seatbelt</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                    Unlimited
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-green-100 group-hover:text-green-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak rambu kepatuhan rambu".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/rambu/new" data-testid="link-sidak-rambu">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 mr-4 flex-shrink-0">
                  <TrafficCone className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-amber-600 transition-colors">Sidak Rambu</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kepatuhan Rambu</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    Max 10 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak antrian observasi antrian".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/antrian/new" data-testid="link-sidak-antrian">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400 mr-4 flex-shrink-0">
                  <Truck className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-rose-600 transition-colors">Sidak Antrian</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Observasi Antrian</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    Max 10 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-rose-100 group-hover:text-rose-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak jarak jarak aman unit".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/jarak/new" data-testid="link-sidak-jarak">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                  <Maximize2 className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Sidak Jarak</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Jarak Aman Unit</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Min 30m
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak apd kelengkapan apd".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/apd/new" data-testid="link-sidak-apd">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">Sidak APD</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Kelengkapan APD</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Max 10 Orang
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak kecepatan speed gun check".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/kecepatan/new" data-testid="link-sidak-kecepatan">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4 flex-shrink-0">
                  <Gauge className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">Sidak Kecepatan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Speed Gun Check</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Max 10 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak loto lock out tag out".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/loto/new" data-testid="link-sidak-loto">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mr-4 flex-shrink-0">
                  <Lock className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">Sidak LOTO</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Lock Out Tag Out</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Max 10 Point
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak digital digital check".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/digital/new" data-testid="link-sidak-digital">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mr-4 flex-shrink-0">
                  <Tablet className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-cyan-600 transition-colors">Sidak Digital</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Digital Check</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
                    Unlimited
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak workshop workshop check".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/workshop/new" data-testid="link-sidak-workshop">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-900/30 flex items-center justify-center text-slate-600 dark:text-slate-400 mr-4 flex-shrink-0">
                  <PenTool className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-slate-600 transition-colors">Sidak Workshop</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Workshop Check</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                    Max 5 Area
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak pencahayaan cek penerangan".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/pencahayaan/new" data-testid="link-sidak-pencahayaan">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400 mr-4 flex-shrink-0">
                  <Sun className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-yellow-600 transition-colors">Sidak Pencahayaan</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Cek Penerangan</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-50 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                    Max 10 Titik
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-yellow-100 group-hover:text-yellow-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak tingkah laku driver behavior check".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/behavior/new" data-testid="link-sidak-behavior">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4 flex-shrink-0">
                  <Users className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">Sidak Tingkah Laku</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Driver Behavior Check</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Unlimited
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "inspeksi p3k cek kelengkapan p3k".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/p3k/new" data-testid="link-sidak-p3k">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mr-4 flex-shrink-0">
                  <BriefcaseMedical className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">Inspeksi P3K</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Cek Kelengkapan P3K</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Max 1 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak intercom evaluasi pengawas fms".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/intercom/new" data-testid="link-sidak-intercom">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center text-sky-600 dark:text-sky-400 mr-4 flex-shrink-0">
                  <Radio className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-sky-600 transition-colors">Sidak Intercom</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Evaluasi Pengawas FMS</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    Max 20 Orang
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak stand jack inspeksi peralatan".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/stand-jack/new" data-testid="link-sidak-stand-jack">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">Sidak Stand Jack</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Stand Jack</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Max 20 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak hydraulic jack inspeksi peralatan".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/hydraulic-jack/new" data-testid="link-sidak-hydraulic-jack">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-teal-600 transition-colors">Sidak Hydraulic Jack</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Hydraulic Jack</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                    Max 20 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-teal-100 group-hover:text-teal-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}
          {(searchQuery === "" || "sidak bottle jack inspeksi peralatan".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/bottle-jack/new" data-testid="link-sidak-bottle-jack">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">Sidak Bottle Jack</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Bottle Jack</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    Max 20 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak apar inspeksi pemadam api".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/apar/new" data-testid="link-sidak-apar">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-red-600 transition-colors">Inspeksi APAR</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Alat Pemadam Api Ringan</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    Max 20 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak impact sistem alur 3 step".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/impact/new" data-testid="link-sidak-impact">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Sidak Impact</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Impact System</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Max 20 Unit
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak mesin las inspeksi mesin las".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/mesin-las/new" data-testid="link-sidak-mesin-las">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">Sidak Mesin Las</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Mesin Las</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                    17 Item Checklist
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak mesin kompresor inspeksi unit".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/mesin-kompresor/new" data-testid="link-sidak-mesin-kompresor">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Sidak Mesin Kompresor</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Fasilitas Mesin</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    15 Item Checklist
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak gerinda duduk inspeksi unit".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/gerinda-duduk/new" data-testid="link-sidak-gerinda-duduk">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">Sidak Gerinda Duduk</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Fasilitas Gerinda</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    17 Item Checklist
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {(searchQuery === "" || "sidak fuel storage inspeksi tangki".includes(searchQuery.toLowerCase())) && (
            <Link href="/workspace/sidak/fuel-storage/new" data-testid="link-sidak-fuel-storage">
              <div className="group relative bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700 h-full flex flex-row items-center cursor-pointer overflow-hidden">
                <div className="h-16 w-16 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mr-4 flex-shrink-0">
                  <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 transition-colors">Sidak Fuel Storage</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inspeksi Fasilitas Fuel</p>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    43 Item Checklist
                  </span>
                </div>
                <div className="h-8 w-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Link>
          )}

          {/* Info Card - Simplified */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl p-5 shadow-sm">
            <div className="flex gap-4">
              <div className="flex-shrink-0 mt-0.5 bg-amber-100 dark:bg-amber-800/50 p-2 rounded-xl h-10 w-10 flex items-center justify-center">
                <span className="text-lg">ℹ️</span>
              </div>
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-100 text-sm mb-1">Catatan Penting</p>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Pastikan data yang diinput sesuai dengan temuan lapangan. Bukti foto wajib disertakan untuk setiap pelanggaran.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Message, Role, ChatSession, Source } from '../components/si-asef/types';
import ChatBubble from '../components/si-asef/ChatBubble';
import InputArea from '../components/si-asef/InputArea';
import SourcePanel from '../components/si-asef/SourcePanel';
import { SourceInfo } from '../components/si-asef/types';
import { PanelLeftClose, PanelLeftOpen, Plus, MessageSquare, Trash2, Menu, ArrowLeft, Folder, Box, Scale, ShieldCheck, Gavel, BookOpen, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";

const spotlightData = [
    {
        quote: "Perusahaan wajib menerapkan SMK3 jika mempekerjakan minimal 100 orang atau memiliki potensi bahaya tinggi.",
        source: "PP 50 Tahun 2012",
        pasal: "Pasal 5",
        query: "Jelaskan tentang kewajiban penerapan SMK3 menurut PP 50 Tahun 2012",
        color: "bg-slate-900",
        icon: Scale,
        accent: "text-yellow-300",
        badge: "REGULASI SPOTLIGHT"
    },
    {
        quote: "Setiap tenaga kerja berhak mendapat perlindungan atas keselamatan dalam melakukan pekerjaan.",
        source: "UU No. 1 Tahun 1970",
        pasal: "Pasal 3",
        query: "Apa hak tenaga kerja terkait keselamatan kerja dalam UU No. 1 Tahun 1970?",
        color: "bg-emerald-900",
        icon: ShieldCheck,
        accent: "text-emerald-300",
        badge: "HAK PEKERJA"
    },
    {
        quote: "Pengurus diwajibkan memeriksakan kesehatan badan, kondisi mental dan kemampuan fisik dari tenaga kerja.",
        source: "Permenaker No. 02/1980",
        pasal: "Pasal 2",
        query: "Jelaskan kewajiban pemeriksaan kesehatan tenaga kerja menurut Permenaker No. 02/1980",
        color: "bg-blue-900",
        icon: Gavel,
        accent: "text-blue-300",
        badge: "KESEHATAN KERJA"
    }
];

export default function SiAsefChatPage() {
    const { user } = useAuth();
    const [, setLocation] = useLocation();
    const [messages, setMessages] = useState<Message[]>([]);
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activeSource, setActiveSource] = useState<SourceInfo | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [spotlightIndex, setSpotlightIndex] = useState(0);



    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadSessions();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const interval = setInterval(() => {
            setSpotlightIndex((prev) => (prev + 1) % spotlightData.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const currentSpotlight = spotlightData[spotlightIndex];
    const SpotlightIcon = currentSpotlight.icon;

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const loadSessions = async () => {
        try {
            const res = await fetch('/api/si-asef/sessions');
            if (res.ok) {
                const data = await res.json();
                setSessions(data);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
        }
    };

    const loadSessionMessages = async (id: string) => {
        setIsLoading(true);
        setCurrentSessionId(id);
        try {
            const res = await fetch(`/api/si-asef/sessions/${id}`);
            if (res.ok) {
                const data = await res.json();
                setMessages(data.map((m: any) => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    sources: m.sources,
                })));
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (text: string, image?: string) => {
        // Optimistic UI
        const tempId = Date.now().toString();
        const userMsg: Message = {
            id: tempId,
            role: Role.USER,
            content: text, // Image handling to be added if backend supports it
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/si-asef/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    sessionId: currentSessionId
                })
            });

            if (!res.ok) throw new Error('Network error');

            const data = await res.json();

            // Update session ID if new
            if (!currentSessionId && data.sessionId) {
                setCurrentSessionId(data.sessionId);
                loadSessions(); // Refresh list to show title
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(), // Or use ID from backend if available in response
                role: Role.MODEL,
                content: data.message,
                sources: data.sources
            }]);

        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: Role.MODEL,
                content: "Maaf, terjadi kesalahan saat menghubungi server."
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full bg-zinc-50 border-r border-zinc-200 font-sans">
            {/* Header / Brand */}
            <div className="px-5 pt-6 pb-2">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-serif text-zinc-800">Mystic</h1>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600">
                        <PanelLeftClose className="h-4 w-4" />
                    </Button>
                </div>

                {/* New Chat Button */}
                <Button
                    onClick={() => {
                        setCurrentSessionId(null);
                        setMessages([]);
                    }}
                    className="w-full justify-start gap-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl h-10 px-4 mb-6 shadow-md shadow-red-500/20 font-medium transition-all group"
                >
                    <Plus className="w-4 h-4 text-white group-hover:rotate-90 transition-transform duration-300" />
                    Mulai Chat Baru
                </Button>

                {/* Main Menu */}
                <div className="space-y-1 mb-6">
                    <button className="w-full text-left px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-white hover:shadow-sm rounded-lg flex items-center gap-3 transition-all">
                        <MessageSquare className="w-4 h-4 text-zinc-500" />
                        Chats
                    </button>
                    <div className="group relative">
                        <button
                            onClick={() => setLocation('/workspace/si-asef/projects')}
                            className="w-full text-left px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-white hover:shadow-sm rounded-lg flex items-center gap-3 transition-all"
                        >
                            <Folder className="w-4 h-4 text-zinc-500" />
                            Projects
                        </button>
                    </div>
                    <button
                        onClick={() => setLocation('/workspace/si-asef/artifacts')}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-white hover:shadow-sm rounded-lg flex items-center gap-3 transition-all"
                    >
                        <Box className="w-4 h-4 text-zinc-500" />
                        Artifacts
                    </button>
                    <button
                        onClick={() => setLocation('/workspace/si-asef/admin')}
                        className="w-full text-left px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-white hover:shadow-sm rounded-lg flex items-center gap-3 transition-all"
                    >
                        <BookOpen className="w-4 h-4 text-zinc-500" />
                        Knowledge Base
                    </button>
                </div>

                <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-3">
                    Recents
                </div>
            </div>

            {/* Recent Chats List */}
            <ScrollArea className="flex-1 px-3 pb-4">
                <div className="space-y-0.5">
                    {sessions.map((session) => (
                        <div key={session.id} className="group flex items-center gap-1 w-full relative">
                            <button
                                onClick={() => loadSessionMessages(session.id)}
                                className={`flex-1 text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 min-w-0
                                ${currentSessionId === session.id
                                        ? 'bg-white shadow-sm text-zinc-900 font-medium ring-1 ring-zinc-200'
                                        : 'text-zinc-600 hover:bg-white/60 hover:text-zinc-900'
                                    }`}
                            >
                                <MessageSquare className="w-3.5 h-3.5 flex-none opacity-70" />
                                <span className="truncate">{session.title}</span>
                            </button>
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (!confirm('Hapus chat ini?')) return;
                                    try {
                                        const res = await fetch(`/api/si-asef/sessions/${session.id}`, { method: 'DELETE' });
                                        if (res.ok) {
                                            if (currentSessionId === session.id) {
                                                setCurrentSessionId(null);
                                                setMessages([]);
                                            }
                                            await loadSessions();
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        alert("Gagal menghapus chat");
                                    }
                                }}
                                className="p-2 text-zinc-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all absolute right-1 top-1/2 -translate-y-1/2 z-10 hover:shadow-sm"
                                title="Hapus chat"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center text-xs text-neutral-400 py-4 italic">
                            Belum ada riwayat
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Bottom Profile Section (Mockup) */}
            <div className="p-4 border-t border-[#e5e5e5]">
                <div className="flex items-center gap-3 px-2 py-2 cursor-pointer hover:bg-[#e8e8e7] rounded-lg transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-neutral-700 truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-neutral-500">Pro Plan</p>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex bg-white font-sans">
            {/* Desktop Sidebar */}
            <div className={`hidden md:block transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>
                <SidebarContent />
            </div>

            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Header - Glassmorphic (Web Optimized) */}
                <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-white/50 dark:bg-black/20 backdrop-blur-sm border-b border-transparent">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setLocation('/workspace/dashboard')}
                            className="text-zinc-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Button>

                        <div className="flex flex-col">
                            <h1 className="font-bold text-lg text-zinc-900 leading-tight">Mystic</h1>
                            <p className="text-[10px] uppercase tracking-wider text-red-600 font-bold">Safety Assistant</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="hidden md:flex text-zinc-500 hover:bg-zinc-100 rounded-full"
                        >
                            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                        </Button>

                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden text-zinc-500 hover:bg-zinc-100 rounded-full">
                                    <Menu className="w-5 h-5" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="p-0 w-80">
                                <SidebarContent />
                            </SheetContent>
                        </Sheet>
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-hidden relative bg-zinc-50/40">
                    {/* Ambient Background — subtle, hanya di empty state */}
                    {messages.length === 0 && (
                        <>
                            <div className="absolute top-[-10%] right-[-5%] w-[420px] h-[420px] bg-red-100/30 rounded-full blur-[140px] pointer-events-none" />
                            <div className="absolute bottom-[5%] left-[-10%] w-[360px] h-[360px] bg-rose-100/30 rounded-full blur-[120px] pointer-events-none" />
                        </>
                    )}

                    <div ref={scrollRef} className="h-full overflow-y-auto pt-20 pb-6 px-4 scroll-smooth relative z-10">
                        {messages.length === 0 ? (
                            <div className="max-w-2xl mx-auto px-2 md:px-0">
                                {/* Greeting — lebih kompak */}
                                <div className="text-center mb-8 animate-fade-in-up">
                                    <div className="inline-flex items-center justify-center w-14 h-14 mb-4 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 shadow-md shadow-red-500/25 text-white">
                                        <ShieldCheck className="w-7 h-7" />
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-semibold text-zinc-900 mb-2 tracking-tight">
                                        Halo, <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-rose-500">{user?.name?.split(' ')[0] || 'User'}</span>
                                    </h2>
                                    <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
                                        Siap membantu Anda menelusuri Regulasi K3 & Dokumen Internal Perusahaan dengan cepat.
                                    </p>
                                </div>

                                {/* Spotlight Card — compact, refined */}
                                <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl shadow-black/10">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/15 rounded-full blur-[80px] -mr-12 -mt-12 pointer-events-none" />

                                    <div className="relative z-10 p-6 md:p-8">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-widest uppercase">
                                                {currentSpotlight.badge}
                                            </span>
                                        </div>

                                        <blockquote className="text-base md:text-xl font-serif text-white/95 leading-relaxed mb-5">
                                            "{currentSpotlight.quote}"
                                        </blockquote>

                                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300 font-mono">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                                                <BookOpen className="w-3 h-3" />
                                                {currentSpotlight.source}
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10">
                                                <Gavel className="w-3 h-3" />
                                                {currentSpotlight.pasal}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Bar — tipis & rapi */}
                                    <div className="bg-white/[0.03] border-t border-white/10 px-6 md:px-8 py-3 flex items-center justify-between gap-3">
                                        <div className="text-[11px] text-zinc-500">
                                            Rekomendasi hari ini
                                        </div>
                                        <button
                                            onClick={() => handleSendMessage(currentSpotlight.query)}
                                            className="bg-white text-zinc-900 px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-100 transition-colors flex items-center gap-1.5"
                                        >
                                            Pelajari
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Quick prompts — opsional helper di empty state */}
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {[
                                        "Apa kewajiban perusahaan menurut UU No.1/1970?",
                                        "Jelaskan AKA / JSA dan kapan wajib dibuat",
                                        "Bagaimana prosedur pelaporan kecelakaan kerja?",
                                        "Apa saja klausul SMKP yang wajib didokumentasikan?",
                                    ].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => handleSendMessage(q)}
                                            className="text-left text-xs text-zinc-600 bg-white border border-zinc-200 rounded-xl px-4 py-2.5 hover:border-red-300 hover:bg-red-50/40 hover:text-zinc-900 transition-all"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-3xl mx-auto pb-4">
                                {messages.map((msg) => (
                                    <ChatBubble
                                        key={msg.id}
                                        message={msg}
                                        onRegenerate={() => handleSendMessage(msg.content)}
                                        onOpenSource={setActiveSource}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start px-4 py-4">
                                        <div className="bg-white/80 backdrop-blur border border-zinc-100 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area — flex child normal, tidak overlap dengan konten */}
                <div className="border-t border-zinc-200 bg-white px-4 py-3">
                    <div className="max-w-3xl mx-auto">
                        <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
                    </div>
                </div>

                {/* Source Panel */}
                <SourcePanel source={activeSource} onClose={() => setActiveSource(null)} />

            </div>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { Message, Role, SourceInfo } from '../si-asef/types';
import ChatBubble from '../si-asef/ChatBubble';
import InputArea from '../si-asef/InputArea';
import SourcePanel from '../si-asef/SourcePanel';
import { Button } from '@/components/ui/button';
import { MessageSquare, X, Maximize2, Minimize2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from "@/lib/auth-context";
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

export function MysticWidget() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); // For full-screen toggle
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [activeSource, setActiveSource] = useState<SourceInfo | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen]);

    const handleSendMessage = async (text: string, image?: string) => {
        const tempId = Date.now().toString();
        const userMsg: Message = {
            id: tempId,
            role: Role.USER,
            content: text,
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

            if (!currentSessionId && data.sessionId) {
                setCurrentSessionId(data.sessionId);
            }

            setMessages(prev => [...prev, {
                id: Date.now().toString(),
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

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-r from-gray-600 to-rose-600 shadow-xl hover:shadow-red-500/25 hover:scale-105 transition-all z-[60] flex items-center justify-center group"
            >
                <MessageSquare className="w-7 h-7 text-white fill-white/20" />
                <span className="absolute -top-2 -right-2 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-gray-950 border border-white"></span>
                </span>
            </Button>
        );
    }

    return (
        <div className={cn(
            "fixed z-[60] bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out border border-zinc-200 dark:border-zinc-800",
            isExpanded
                ? "inset-4 rounded-2xl"
                : "bottom-6 right-6 w-[400px] h-[600px] rounded-2xl"
        )}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-600 to-rose-600 text-white shadow-md z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm leading-tight">Mystic Assistant</h3>
                        <p className="text-[10px] text-red-100 opacity-90">Safety & Document AI</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
                        onClick={() => setIsOpen(false)}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-black/20 relative">
                <div ref={scrollRef} className="p-4 space-y-4 pb-20">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full pt-10 text-center px-6">
                            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <ShieldCheck className="w-8 h-8 text-gray-950" />
                            </div>
                            <h4 className="font-bold text-zinc-900 dark:text-white mb-2">
                                Halo, {user?.name?.split(' ')[0]}!
                            </h4>
                            <p className="text-xs text-zinc-500 max-w-[250px] leading-relaxed mb-6">
                                Tanyakan apa saja tentang Regulasi K3, Dokumen Internal, atau Data Perusahaan.
                            </p>

                            <div className="grid grid-cols-1 gap-2 w-full max-w-[280px]">
                                <button onClick={() => handleSendMessage("Apa saja APD yang wajib di area tambang?")} className="text-xs text-left p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-red-300 hover:shadow-sm transition-all text-zinc-600 dark:text-gray-300 flex items-center justify-between group">
                                    APD Wajib Tambang
                                    <ChevronRight className="w-3 h-3 text-zinc-300 group-hover:text-red-500" />
                                </button>
                                <button onClick={() => handleSendMessage("Buatkan summary safety talk tentang Fatigue")} className="text-xs text-left p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl hover:border-red-300 hover:shadow-sm transition-all text-zinc-600 dark:text-gray-300 flex items-center justify-between group">
                                    Safety Talk Fatigue
                                    <ChevronRight className="w-3 h-3 text-zinc-300 group-hover:text-gray-600" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg) => (
                                <ChatBubble
                                    key={msg.id}
                                    message={msg}
                                    onRegenerate={() => handleSendMessage(msg.content)}
                                    onOpenSource={setActiveSource}
                                />
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/80 backdrop-blur border border-zinc-100 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-gray-950 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-950 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-gray-950 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-900 dark:via-zinc-900 pt-10">
                    <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
                </div>
            </div>

            {/* Source Panel Overlay */}
            <SourcePanel source={activeSource} onClose={() => setActiveSource(null)} />
        </div>
    );
}

import React from 'react';
import { X, FileText, BookOpen } from 'lucide-react';
import { SourceInfo } from './types';

interface SourcePanelProps {
    source: SourceInfo | null;
    onClose: () => void;
}

const SourcePanel: React.FC<SourcePanelProps> = ({ source, onClose }) => {
    if (!source) return null;

    return (
        <>
            <div
                className="fixed inset-0 bg-black/20 z-40 lg:hidden"
                onClick={onClose}
            />

            <aside className="fixed right-0 top-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right border-l border-zinc-200">
                <header className="flex-none bg-primary text-white px-5 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="font-bold text-lg">Sumber Referensi</h2>
                                <p className="text-muted-foreground text-xs">Detail dokumen</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="p-5 border-b border-zinc-100 bg-zinc-50">
                        <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-6 h-6 text-foreground" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-zinc-900 text-sm leading-tight mb-1 break-words">
                                    {source.documentName}
                                </h3>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded-full">
                                        Halaman {source.pageNumber}
                                    </span>
                                    {/* Removed Chunk ID display as it might be UUID now */}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="mb-3 flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kutipan Lengkap</span>
                            <div className="flex-1 h-px bg-zinc-200" />
                        </div>

                        <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100">
                            <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">
                                {source.content}
                            </p>
                        </div>

                        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <p className="text-xs text-amber-700">
                                <strong>Relevansi:</strong> Skor kecocokan {(source.score * 100).toFixed(0)}%
                            </p>
                        </div>
                    </div>
                </div>

                <footer className="flex-none p-4 border-t border-zinc-100 bg-zinc-50">
                    <button
                        onClick={onClose}
                        className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors"
                    >
                        Tutup Panel
                    </button>
                </footer>
            </aside>
        </>
    );
};

export default SourcePanel;

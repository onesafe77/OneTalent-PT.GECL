import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Box } from 'lucide-react';
import { useLocation } from 'wouter';

export default function SiAsefArtifactsPage() {
    const [, setLocation] = useLocation();

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-4xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => setLocation('/workspace/dashboard')}
                    className="mb-6 text-slate-600 hover:text-slate-900"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Mystic Chat
                </Button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Box className="w-10 h-10 text-purple-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-4">Artifacts</h1>
                    <p className="text-slate-600 max-w-lg mx-auto leading-relaxed">
                        Fitur Artifacts sedang dalam pengembangan.
                        Di sini Anda akan dapat melihat semua hasil generate dokumen, tabel, dan diagram yang dibuat oleh Mystic AI.
                    </p>
                </div>
            </div>
        </div>
    );
}

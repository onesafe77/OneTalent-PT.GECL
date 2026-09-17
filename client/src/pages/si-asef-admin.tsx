import React, { useState, useRef, useEffect } from 'react';
import { konfirmasi } from "@/components/ui/konfirmasi";
import { UploadCloud, FileText, Trash2, Search, CheckCircle2, Database, AlertCircle, FolderOpen, ChevronDown, ChevronRight, FileType, HardDrive, Loader2, Link, FileSpreadsheet, Settings, Link2 } from 'lucide-react';
import { Link as RouterLink } from "wouter";
import { Badge } from "@/components/ui/badge";
import { UploadedDocument } from '../components/si-asef/types';

const FOLDERS = [
    'Peraturan Pemerintah',
    'SOP GECL',
    'SOP BIB',
    'Umum'
];

import { useToast } from "@/hooks/use-toast";

export default function SiAsefAdminPage() {
    const { toast } = useToast();
    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadQueue, setUploadQueue] = useState<{ name: string; status: 'pending' | 'uploading' | 'done' | 'error' }[]>([]);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [selectedFolder, setSelectedFolder] = useState('Peraturan Pemerintah');
    const [expandedFolders, setExpandedFolders] = useState<string[]>(FOLDERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploadMode, setUploadMode] = useState<'file' | 'sheet'>('file');
    const [sheetUrl, setSheetUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const res = await fetch('/api/si-asef/documents');
            if (res.ok) {
                const data = await res.json();
                setDocuments(data.map((d: any) => ({
                    id: d.id,
                    name: d.name,
                    type: d.fileType,
                    size: d.fileSize,
                    uploadDate: d.createdAt,
                    folder: d.folder
                })));
            }
        } catch (error) {
            console.error("Failed to load documents", error);
        }
    };

    const handleUpload = async (file: File, folder: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const res = await fetch('/api/si-asef/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Upload failed');
        }
    };

    const handleSheetUpload = async () => {
        if (!sheetUrl) return;
        setIsUploading(true);
        setUploadSuccess(null);
        setUploadError(null);

        try {
            const res = await fetch('/api/si-asef/upload-sheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: sheetUrl, folder: selectedFolder })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Failed to sync sheet');
            }

            setSheetUrl('');
            setUploadSuccess(`Google Sheet berhasil disinkronkan ke folder "${selectedFolder}"!`);
            loadDocuments();

            setTimeout(() => setUploadSuccess(null), 5000);
        } catch (error: any) {
            console.error(error);
            setUploadError(error.message || "Gagal menyinkronkan spreadsheet.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!(await konfirmasi("Yakin ingin menghapus dokumen ini secara permanen?"))) return;
        setDeletingId(id);
        try {
            const res = await fetch(`/api/si-asef/documents/${id}`, {
                method: 'DELETE',
                credentials: 'include' // Include session cookie
            });
            if (res.ok) {
                setDocuments(prev => prev.filter(d => d.id !== id));
                toast({
                    title: "Berhasil dihapus",
                    description: "Dokumen telah dihapus dari database.",
                    variant: "default",
                });
            } else {
                const err = await res.json();
                toast({
                    title: "Gagal menghapus",
                    description: err.message || "Terjadi kesalahan saat menghapus dokumen.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Terjadi kesalahan jaringan.",
                variant: "destructive",
            });
        } finally {
            setDeletingId(null);
        }
    };

    // --- UI Handlers (Drag & Drop) ---
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const uploadMultipleFiles = async (files: FileList) => {
        const fileArray = Array.from(files);
        if (fileArray.length === 0) return;

        setIsUploading(true);
        setUploadProgress(0);
        setUploadSuccess(null);
        setUploadError(null);
        setUploadQueue(fileArray.map(f => ({ name: f.name, status: 'pending' })));

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < fileArray.length; i++) {
            const file = fileArray[i];
            setUploadQueue(prev => prev.map((item, idx) =>
                idx === i ? { ...item, status: 'uploading' } : item
            ));
            setUploadProgress(Math.round((i / fileArray.length) * 100));

            try {
                await handleUpload(file, selectedFolder);
                setUploadQueue(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'done' } : item
                ));
                successCount++;
            } catch (error: any) {
                console.error('Upload failed:', file.name, error);
                setUploadQueue(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'error' } : item
                ));
                errorCount++;
            }
        }

        setUploadProgress(100);
        loadDocuments(); // Refresh list

        if (successCount > 0 && errorCount === 0) {
            setUploadSuccess(`${successCount} file berhasil diupload ke folder "${selectedFolder}"!`);
        } else if (successCount > 0 && errorCount > 0) {
            setUploadSuccess(`${successCount} file berhasil, ${errorCount} file gagal diupload.`);
        } else {
            setUploadError(`Semua ${errorCount} file gagal diupload.`);
        }

        setTimeout(() => {
            setUploadSuccess(null);
            setUploadError(null);
            setUploadQueue([]);
        }, 5000);

        setIsUploading(false);
        setUploadProgress(0);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await uploadMultipleFiles(e.dataTransfer.files);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadMultipleFiles(e.target.files);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const toggleFolder = (folder: string) => {
        setExpandedFolders(prev =>
            prev.includes(folder) ? prev.filter(f => f !== folder) : [...prev, folder]
        );
    };

    const getDocumentsByFolder = (folder: string) => {
        return documents.filter(d => {
            const matchesFolder = (d.folder || 'Umum') === folder;
            const matchesSearch = searchQuery === '' ||
                d.name.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFolder && matchesSearch;
        });
    };

    return (
        <div className="flex-1 bg-zinc-50 h-full overflow-y-auto p-8 font-sans">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-display font-bold text-zinc-900">Knowledge Base Admin (Updated)</h1>
                            <p className="text-zinc-500 text-sm">Kelola dokumen regulasi internal perusahaan untuk Mystic.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <RouterLink href="/workspace/settings/google-sheets">
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200 cursor-pointer hover:bg-yellow-100 px-3 py-1.5">
                                <Settings className="w-3 h-3 mr-1" /> Hubungkan Spreadsheet
                            </Badge>
                        </RouterLink>
                        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">
                            <Database className="w-5 h-5 text-foreground" />
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase">Total Dokumen</p>
                                <p className="text-lg font-bold text-zinc-900 leading-none">{documents.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Folder Selection */}
                <div className="mb-6">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Pilih Folder Tujuan</label>
                    <div className="flex gap-2 flex-wrap">
                        {FOLDERS.map((folder) => (
                            <button
                                key={folder}
                                onClick={() => setSelectedFolder(folder)}
                                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${selectedFolder === folder
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'bg-white border border-zinc-200 text-zinc-600 hover:border-border hover:text-primary'
                                    }`}
                            >
                                <FolderOpen className="w-4 h-4" />
                                {folder}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Upload Mode Toggle */}
            <div className="flex bg-white p-1 rounded-xl shadow-sm border border-zinc-200 mb-6 w-fit">
                <button
                    onClick={() => setUploadMode('file')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'file' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    <UploadCloud className="w-4 h-4" />
                    Upload File
                </button>
                <button
                    onClick={() => setUploadMode('sheet')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${uploadMode === 'sheet' ? 'bg-primary text-white shadow-sm glow-emerald' : 'text-zinc-500 hover:text-zinc-900'}`}
                >
                    <Link className="w-4 h-4" />
                    Google Sheet Link
                </button>
            </div>

            {/* Upload Area */}
            {uploadMode === 'file' ? (
                <div
                    className={`
                mb-10 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all
                ${isUploading ? 'border-border bg-muted cursor-wait' : isDragging ? 'border-border bg-muted scale-[1.01] cursor-pointer' : 'border-zinc-300 bg-white hover:border-border hover:bg-zinc-50 cursor-pointer'}
            `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".txt,.md,.pdf,.doc,.docx,.csv"
                        disabled={isUploading}
                        onChange={handleFileSelect}
                        multiple
                    />
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-sm ${isUploading ? 'bg-muted text-foreground' : 'bg-muted text-foreground'}`}>
                        {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <UploadCloud className="w-8 h-8" />}
                    </div>
                    <h3 className="text-xl font-bold text-zinc-800 mb-2">
                        {isUploading ? `Mengupload ke "${selectedFolder}"... ${uploadProgress}%` : `Upload ke Folder "${selectedFolder}"`}
                    </h3>
                    {isUploading && (
                        <div className="w-full max-w-md mb-4">
                            <div className="h-3 bg-zinc-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                            <p className="text-sm text-foreground font-medium mt-2">
                                {uploadProgress < 100 ? 'Mengunggah file...' : 'Memproses dan mengindeks dokumen...'}
                            </p>
                        </div>
                    )}
                    {!isUploading && (
                        <p className="text-zinc-500 max-w-md mb-6">
                            Drag & drop file PDF, Word, atau TXT di sini. Mystic akan otomatis mempelajarinya.
                        </p>
                    )}
                    {isUploading && uploadQueue.length > 1 && (
                        <div className="w-full max-w-md mt-2 space-y-1">
                            {uploadQueue.map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-xs">
                                    {item.status === 'pending' && <span className="w-2 h-2 rounded-full bg-zinc-300" />}
                                    {item.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin text-foreground" />}
                                    {item.status === 'done' && <CheckCircle2 className="w-3 h-3 text-foreground" />}
                                    {item.status === 'error' && <AlertCircle className="w-3 h-3 text-red-500" />}
                                    <span className={item.status === 'error' ? 'text-red-600' : 'text-zinc-600'}>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <button
                        className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-lg shadow-zinc-900/10 ${isUploading ? 'bg-zinc-400 text-white cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-primary/90'}`}
                        disabled={isUploading}
                    >
                        {isUploading ? `Mengupload...` : 'Pilih File dari Komputer'}
                    </button>
                </div>
            ) : (
                <div className="mb-10 bg-white rounded-3xl p-10 border border-zinc-200 shadow-sm">
                    <div className="flex flex-col items-center text-center max-w-xl mx-auto">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-sm bg-muted text-foreground`}>
                            <FileSpreadsheet className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-zinc-800 mb-2">Sync Google Sheet</h3>
                        <p className="text-zinc-500 mb-8">
                            Masukkan link Google Sheet yang telah dipublikasikan ("Published to Web" &rarr; CSV) untuk dipelajari oleh Mystic.
                        </p>

                        <div className="w-full flex gap-2">
                            <div className="flex-1 relative">
                                <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                    type="text"
                                    placeholder="Paste link https://docs.google.com/spreadsheets/..."
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-border transition-all font-mono text-sm"
                                    value={sheetUrl}
                                    onChange={(e) => setSheetUrl(e.target.value)}
                                />
                            </div>
                            <button
                                onClick={handleSheetUpload}
                                disabled={!sheetUrl || isUploading}
                                className={`px-6 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap shadow-lg ${!sheetUrl || isUploading ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' : 'bg-primary text-white hover:bg-primary/90 shadow-primary/20'}`}
                            >
                                {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sync Data'}
                            </button>
                        </div>
                        <p className="text-xs text-zinc-400 mt-4 bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-100">
                            💡 Tip: Di Google Sheets, pilih <strong>File &gt; Share &gt; Publish to web</strong>, pilih "Entire Document" dan ganti "Web page" menjadi <strong>"Comma-separated values (.csv)"</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Success/Error Notifications */}
            {uploadSuccess && (
                <div className="mb-6 p-4 bg-muted border border-border rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-foreground shrink-0" />
                    <p className="text-foreground font-medium">{uploadSuccess}</p>
                </div>
            )}
            {uploadError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <p className="text-red-700 font-medium">{uploadError}</p>
                </div>
            )}

            {/* Document List by Folder */}
            <div className="bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between">
                    <h3 className="font-bold text-lg text-zinc-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-foreground" />
                        Dokumen Aktif
                    </h3>
                    <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Cari dokumen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-border w-64"
                        />
                    </div>
                </div>

                {documents.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="w-8 h-8 text-zinc-300" />
                        </div>
                        <p className="text-zinc-500 font-medium">Belum ada dokumen yang diupload.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100">
                        {FOLDERS.map((folder) => {
                            const folderDocs = getDocumentsByFolder(folder);
                            if (folderDocs.length === 0) return null;
                            const isExpanded = expandedFolders.includes(folder);

                            return (
                                <div key={folder}>
                                    <button
                                        onClick={() => toggleFolder(folder)}
                                        className="w-full px-8 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            {isExpanded ? (
                                                <ChevronDown className="w-5 h-5 text-zinc-400" />
                                            ) : (
                                                <ChevronRight className="w-5 h-5 text-zinc-400" />
                                            )}
                                            <FolderOpen className="w-5 h-5 text-foreground" />
                                            <span className="font-bold text-zinc-800">{folder}</span>
                                            <span className="text-xs bg-muted text-foreground px-2 py-0.5 rounded-full font-bold">
                                                {folderDocs.length} dokumen
                                            </span>
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="bg-zinc-50/50">
                                            <table className="w-full text-left">
                                                <thead className="bg-zinc-100/50 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                                    <tr>
                                                        <th className="px-4 py-3 pl-8">Nama File</th>
                                                        <th className="px-4 py-3">Tipe</th>
                                                        <th className="px-4 py-3">Tanggal Upload</th>
                                                        <th className="px-4 py-3 text-right">HAPUS FILE</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100">
                                                    {folderDocs.map((doc) => (
                                                        <tr key={doc.id} className="hover:bg-white transition-colors group">
                                                            <td className="px-4 py-4 pl-8">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-foreground">
                                                                        <FileText className="w-5 h-5" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-bold text-zinc-800 text-sm truncate max-w-[300px]" title={doc.name}>{doc.name}</p>
                                                                        <p className="text-xs text-zinc-400">{doc.size}</p>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 text-xs font-bold uppercase">
                                                                    <FileType className="w-3 h-3" />
                                                                    {(doc.type || 'FILE').split('/').pop()?.toUpperCase()}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-sm text-zinc-500">
                                                                {new Date(doc.uploadDate).toLocaleDateString()}
                                                            </td>

                                                            <td className="px-4 py-4 text-right">
                                                                <div className="flex justify-end">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            console.log("Delete clicked for", doc.id);
                                                                            handleDelete(doc.id);
                                                                        }}
                                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border ${deletingId === doc.id
                                                                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-wait'
                                                                            : 'bg-white text-gray-950 border-gray-200 hover:bg-gray-950 hover:text-white hover:border-gray-950'
                                                                            }`}
                                                                        title="Hapus Dokumen"
                                                                        disabled={deletingId === doc.id}
                                                                    >
                                                                        {deletingId === doc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                                        Hapus
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                    }
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="mt-8 flex gap-4">
                <div className="flex-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                        <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-900 mb-1">Penyimpanan Aman</h4>
                        <p className="text-sm text-zinc-500">Dokumen dienkripsi dan hanya dapat diakses oleh akun perusahaan Anda. Tidak dibagikan ke publik.</p>
                    </div>
                </div>
                <div className="flex-1 bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-start gap-4">
                    <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                        <Database className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-zinc-900 mb-1">Auto-Training</h4>
                        <p className="text-sm text-zinc-500">Mystic langsung mempelajari dokumen baru dalam hitungan detik setelah upload selesai.</p>
                    </div>
                </div>
            </div>

        </div>
    );
};

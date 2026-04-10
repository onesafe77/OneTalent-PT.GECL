const fs = require('fs');
const path = require('path');

const forms = [
    'sidak-stand-jack-form.tsx',
    'sidak-hydraulic-jack-form.tsx',
    'sidak-bottle-jack-form.tsx',
    'sidak-apar-form.tsx',
    'sidak-impact-form.tsx',
    'sidak-mesin-las-form.tsx',
    'sidak-mesin-kompresor-form.tsx',
    'sidak-gerinda-duduk-form.tsx',
    'sidak-fuel-storage-form.tsx'
];

const basePath = path.join(__dirname, '../client/src/pages');

for (const form of forms) {
    const filePath = path.join(basePath, form);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add Camera to lucide-react imports if it doesn't exist
    if (!content.includes('Camera,') && !content.includes('Camera }')) {
        content = content.replace(/import \{([^}]+)\} from "lucide-react";/, (match, p1) => {
            return `import { Camera, ${p1} } from "lucide-react";`;
        });
    }

    // 2. Add activityPhotos state below currentInspector
    if (!content.includes('const [activityPhotos, setActivityPhotos]')) {
        content = content.replace(/const \[currentInspector, setCurrentInspector\] = useState<Inspector>\(\{[^}]+\}\);/m, (match) => {
            return `${match}\n\n    const [activityPhotos, setActivityPhotos] = useState<string[]>([]);`;
        });
    }

    // 3. Rewrite handleFinish
    if (!content.includes('activityPhotos.length > 0 && draft.sessionId')) {
        const apiRouteMatch = content.match(/api\/sidak-[a-z-]+/);
        const apiRoute = apiRouteMatch ? apiRouteMatch[0] : null;

        if (apiRoute) {
            content = content.replace(/const handleFinish = \(\) => \{([\s\S]*?)navigate\("(\/workspace\/[a-z-\/]+)"\);/m, (match, body, navPath) => {
                return `const handleFinish = async () => {${body}
        if (activityPhotos.length > 0 && draft.sessionId) {
            try {
                await apiRequest(\`${apiRoute}/\${draft.sessionId}/photos\`, "POST", { photos: activityPhotos });
            } catch (err) {
                console.error("Failed to upload photos:", err);
                toast({ title: "Peringatan", description: "Gagal mengupload bukti kegiatan, namun data inspeksi tetap tersimpan.", variant: "destructive" });
            }
        }

        navigate("${navPath}");`;
            });
        }
    }

    // 4. Inject JSX right before </div></div>)} </MobileSidakLayout> at the very end
    if (!content.includes('Bukti Kegiatan (Opsional)')) {
        const photoSectionJSX = `
                            {/* Section Upload Foto Kegiatan - BEGIN */}
                            <div className="space-y-4 pt-6 border-t mt-6">
                                <div className="flex items-center justify-between">
                                    <Label className="font-bold text-gray-700">Bukti Kegiatan (Opsional)</Label>
                                    <Badge variant="outline" className="bg-blue-50 text-blue-600 align-middle">
                                        {activityPhotos.length}/6 Foto
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {activityPhotos.map((photo, i) => (
                                        <div key={i} className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group border border-gray-200">
                                            <img src={photo} alt="Bukti" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setActivityPhotos(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute top-1.5 right-1.5 h-6 w-6 bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transform scale-90 opacity-80 hover:scale-100 hover:opacity-100 transition-all"
                                            >✕</button>
                                        </div>
                                    ))}
                                    {activityPhotos.length < 6 && (
                                        <Label className="flex flex-col items-center justify-center aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                            <Camera className="w-6 h-6 text-gray-400 mb-2" />
                                            <span className="text-[10px] font-bold text-gray-500">TAMBAH FOTO</span>
                                            <Input 
                                                type="file" 
                                                accept="image/*" 
                                                multiple
                                                className="hidden" 
                                                onChange={e => {
                                                    const files = Array.from(e.target.files || []);
                                                    files.forEach(file => {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setActivityPhotos(prev => {
                                                                if (prev.length >= 6) return prev;
                                                                return [...prev, reader.result];
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    });
                                                }}
                                            />
                                        </Label>
                                    )}
                                </div>
                            </div>
                            {/* Section Upload Foto Kegiatan - END */}
`;
        // Find the end of draft.step === 3 content
        content = content.replace(/<\/div>\n\s*<\/div>\n\s*\)}\n\s*<\/MobileSidakLayout>/, `${photoSectionJSX}                        </div>
                    </div>
                )}
            </MobileSidakLayout>`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${form}`);
}

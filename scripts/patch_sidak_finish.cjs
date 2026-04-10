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

    // Find the api route correct path
    const fullMatch = content.match(/\/api\/sidak-[a-z-]+/);
    if (!fullMatch) {
        console.log('API route not found for', form);
        continue;
    }
    const fullApiRoute = fullMatch[0]; // e.g., /api/sidak-bottle-jack

    // Make sure we have useQueryClient imported
    if (!content.includes('useQueryClient')) {
        content = content.replace(/import \{ useMutation \} from "@tanstack\/react-query";/,
            `import { useMutation, useQueryClient } from "@tanstack/react-query";`);
    }

    // Inject const queryClient = useQueryClient(); if missing
    if (!content.includes('const queryClient = useQueryClient();')) {
        content = content.replace(/const { toast } = useToast\(\);/,
            `const { toast } = useToast();\n    const queryClient = useQueryClient();`);
    }

    // Replace handleFinish completely
    // First, find and remove the old handleFinish block
    content = content.replace(/const handleFinish = async \(\) => \{[\s\S]*?navigate\("(\/workspace\/[a-z-\/]+)"\);[\s\S]*?\};\n/m, (match, navPath) => {
        // Re-write it cleanly
        return `const handleFinish = async () => {
        if (draft.inspectors.length === 0) {
            toast({
                title: "Inspektor Diperlukan",
                description: "Minimal 1 inspektor harus ditambahkan.",
                variant: "destructive"
            });
            return;
        }

        if (activityPhotos.length > 0 && draft.sessionId) {
            try {
                await apiRequest(\`${fullApiRoute}/\${draft.sessionId}/photos\`, "POST", { photos: activityPhotos });
            } catch (err) {
                console.error("Failed to upload photos:", err);
                toast({ title: "Peringatan", description: "Gagal mengupload bukti kegiatan, namun data inspeksi tetap tersimpan.", variant: "destructive" });
            }
        }

        queryClient.invalidateQueries({ queryKey: ['${fullApiRoute}/sessions'] });
        ignoreDraft(); // Clear draft data

        navigate("${navPath}");
        toast({ title: "Selesai", description: "Laporan SIDAK telah disimpan." });
    };\n`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Patched ${form} handleFinish successfully!`);
}

import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertCircle, MinusCircle, GitCompare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MappingDoc {
  id: string;
  documentCode: string;
  title: string;
  lifecycleStatus: string;
}
interface MappingRow {
  id: string;
  clauseNo: string;
  title: string;
  description?: string | null;
  documents: MappingDoc[];
  status: "COVERED" | "PARTIAL" | "GAP";
}
interface MappingResponse {
  mapping: MappingRow[];
  summary: { covered: number; partial: number; gap: number; total: number };
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  COVERED: { label: "Covered", cls: "bg-green-100 text-green-700 border-green-300" },
  PARTIAL: { label: "Partial", cls: "bg-amber-100 text-amber-700 border-amber-300" },
  GAP: { label: "Gap", cls: "bg-red-100 text-red-700 border-red-300" },
};

const docStatusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "Dalam Review",
  APPROVED: "Disetujui",
  PUBLISHED: "Diterbitkan",
  SIGNED: "Ditandatangani",
  OBSOLETE: "Obsolete",
};

export default function SmkpMappingPage() {
  const { data, isLoading } = useQuery<MappingResponse>({
    queryKey: ["/api/smkp-mapping"],
  });

  const summary = data?.summary || { covered: 0, partial: 0, gap: 0, total: 0 };
  const mapping = data?.mapping || [];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-50 rounded-lg">
          <GitCompare className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Mapping SMKP</h1>
          <p className="text-sm text-gray-500">Cross-reference klausul SMKP dengan prosedur operasional K3</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat icon={CheckCircle} label="Covered" value={summary.covered} color="text-green-600" />
        <Stat icon={AlertCircle} label="Partial" value={summary.partial} color="text-amber-600" />
        <Stat icon={MinusCircle} label="Gap" value={summary.gap} color="text-red-600" />
        <Stat icon={GitCompare} label="Total Klausul" value={summary.total} color="text-gray-600" />
      </div>

      {/* Table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left w-24">Klausul</th>
                <th className="px-4 py-3 text-left">Judul Klausul SMKP</th>
                <th className="px-4 py-3 text-left">Prosedur Terkait</th>
                <th className="px-4 py-3 text-left w-32">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
              )}
              {!isLoading && mapping.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">Belum ada klausul SMKP yang terdaftar.</td></tr>
              )}
              {mapping.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-gray-700">{m.clauseNo}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{m.title}</div>
                    {m.description && (
                      <div className="text-xs text-gray-500 mt-0.5">{m.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {m.documents.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">Belum ada dokumen</span>
                    ) : (
                      <ul className="space-y-1">
                        {m.documents.map((d) => (
                          <li key={d.id} className="text-xs flex items-center gap-2">
                            <span className="font-mono text-gray-700">{d.documentCode}</span>
                            <span className="text-gray-500">— {d.title}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                              {docStatusLabels[d.lifecycleStatus] || d.lifecycleStatus}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusBadge[m.status].cls}>
                      {statusBadge[m.status].label}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

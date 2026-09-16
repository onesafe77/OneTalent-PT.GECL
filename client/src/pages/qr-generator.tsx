import { QRGenerator } from "@/components/qr/qr-generator";

import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QRGeneratorPage() {
 return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/workspace/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">QR Generator</h1>
      </div>
      <QRGenerator />
    </div>
  );
}


import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { FolderOpen, ArrowRight, Star } from "lucide-react";

export function ProjectWidget() {
    return (
        <Card className="h-full border-none shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex flex-col hover:shadow-md transition-all duration-200">
            <CardContent className="flex-1 flex flex-col justify-between p-5">
                <div className="flex justify-between items-start">
                    <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                        <FolderOpen className="w-6 h-6 text-white" />
                    </div>
                    <Link href="/workspace/si-asef/projects">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 rounded-full">
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </Link>
                </div>

                <div className="mt-4">
                    <h3 className="text-lg font-bold text-white mb-1">Project Tracker</h3>
                    <p className="text-xs text-blue-100 mb-4 opacity-80">Kelola dan monitor progress project regulasi.</p>

                    <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="w-6 h-6 rounded-full bg-white/30 border border-white/10 flex items-center justify-center text-[8px] font-bold">
                                    UI
                                </div>
                            ))}
                        </div>
                        <span className="text-[10px] font-medium ml-1">3 Active Projects</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

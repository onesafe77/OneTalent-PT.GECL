import { UsignDashboard } from "@/components/usign/UsignDashboard";
import { useAuth } from "@/lib/auth-context";

export default function UsignDashboardPage() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="container mx-auto py-6">
            <UsignDashboard nik={user.nik} />
        </div>
    );
}

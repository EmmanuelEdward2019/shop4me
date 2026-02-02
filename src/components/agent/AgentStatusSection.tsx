import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface AgentStatusSectionProps {
  loading: boolean;
  status: string | null;
}

const AgentStatusSection = ({ loading, status }: AgentStatusSectionProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "approved":
        return {
          icon: CheckCircle,
          title: "Active Agent",
          description: "You can accept and complete orders.",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          textColor: "text-green-800",
          descColor: "text-green-600",
          iconBg: "bg-green-100",
          iconColor: "text-green-600",
        };
      case "pending":
        return {
          icon: Clock,
          title: "Application Pending",
          description: "Your application is being reviewed.",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-800",
          descColor: "text-yellow-600",
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
        };
      case "under_review":
        return {
          icon: Clock,
          title: "Under Review",
          description: "An admin is reviewing your application.",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          textColor: "text-blue-800",
          descColor: "text-blue-600",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
        };
      case "rejected":
        return {
          icon: XCircle,
          title: "Application Rejected",
          description: "Your application was not approved.",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-800",
          descColor: "text-red-600",
          iconBg: "bg-red-100",
          iconColor: "text-red-600",
        };
      case "suspended":
        return {
          icon: AlertTriangle,
          title: "Account Suspended",
          description: "Your agent account has been suspended.",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          textColor: "text-orange-800",
          descColor: "text-orange-600",
          iconBg: "bg-orange-100",
          iconColor: "text-orange-600",
        };
      default:
        return {
          icon: User,
          title: "Not an Agent",
          description: "You haven't applied to become an agent yet.",
          bgColor: "bg-muted",
          borderColor: "border-border",
          textColor: "text-foreground",
          descColor: "text-muted-foreground",
          iconBg: "bg-muted",
          iconColor: "text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agent Status</CardTitle>
        <CardDescription>
          Your current agent account status and verification.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <div className={`flex items-center justify-between p-4 border rounded-lg ${config.bgColor} ${config.borderColor}`}>
            <div>
              <p className={`font-medium ${config.textColor}`}>{config.title}</p>
              <p className={`text-sm ${config.descColor}`}>
                {config.description}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-full ${config.iconBg} flex items-center justify-center`}>
              <StatusIcon className={`w-5 h-5 ${config.iconColor}`} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentStatusSection;

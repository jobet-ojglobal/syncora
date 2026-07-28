import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useLocationWorkspace } from "@/context/LocationWorkspaceContext";

export function OnlineStatusToggleCard() {
  const { isCheckingOnlineStatus, toggleCheckingOnlineStatus } = useLocationWorkspace();

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
      <div className="space-y-0.5">
        <Label htmlFor="online-status-check" className="text-sm font-semibold">
          Automatic Status Polling
        </Label>
        <p className="text-xs text-muted-foreground">
          Automatically check location endpoint availability and network health every 15 seconds.
        </p>
      </div>
      <Switch
        id="online-status-check"
        checked={isCheckingOnlineStatus}
        onCheckedChange={(checked) => toggleCheckingOnlineStatus(checked)}
      />
    </div>
  );
}
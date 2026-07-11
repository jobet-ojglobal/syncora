import { Trash2 } from "lucide-react"
import { TrashClient } from "./trashClient";
import { getGlobalTrash } from "@/actions/trash";

export const dynamic = "force-dynamic";

export default async function GlobalTrashPage() {
  const trashItems = await getGlobalTrash();

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight">System Trash & Archives</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage softly deleted entities across the platform. Restoring a parent entity will not automatically restore cascaded children unless handled explicitly.
        </p>
      </div>

        <TrashClient initialData={trashItems}/>
    </div>
  )
}
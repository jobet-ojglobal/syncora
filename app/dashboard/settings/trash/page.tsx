import { Trash2 } from "lucide-react"
import { TrashClient } from "./trashClient";
import { getGlobalTrash } from "@/actions/trash";
import PageHeader from "@/components/layout/dashboard/PageHeader";

export const dynamic = "force-dynamic";

export default async function GlobalTrashPage() {
  const trashItems = await getGlobalTrash();

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 text-xs">
      <PageHeader 
        title="System Trash & Archives" 
        description="Manage softly deleted entities across the platform." 
        icon={Trash2}
        className="border-b border-border pb-4"
      />
        <TrashClient initialData={trashItems}/>
    </div>
  )
}
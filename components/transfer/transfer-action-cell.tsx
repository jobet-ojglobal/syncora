"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit3 } from "lucide-react";

export function TransferActionCell({ orderId, orderStatus }: { orderId: string, orderStatus: boolean }) {
  const router = useRouter();

  const handleNavigationBuster = () => {
    // 1. Push the router target sequence
    router.push(`/dashboard/transfers/${orderId}/edit`);
    
    // 2. Immediately force a refresh to pull raw data over the wire instead of client layouts
    router.refresh();
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      className="h-7 px-2 font-semibold gap-1"
      onClick={handleNavigationBuster}
    >
      <Edit3 className="w-3 h-3" /> Manage
    </Button>
  );
}
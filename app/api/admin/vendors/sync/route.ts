import { NextRequest, NextResponse } from "next/server";
import { VendorService } from "@/services/vendor.service";

export async function POST(request: NextRequest) {
  try {
    const trackingMetrics = await VendorService.syncAll();
    
    return NextResponse.json(
      { 
        message: "Bulk vendor synchronization sequence successfully offloaded to worker pool.", 
        count: trackingMetrics.scheduledJobs 
      }, 
      { status: 202 } // 202 = Accepted for background processing
    );
  } catch (error) {
    console.error("[VENDOR_BULK_SYNC_ERROR]:", error);
    return NextResponse.json(
      { error: "Fatal crash during batch sync construction pipeline." }, 
      { status: 500 }
    );
  }
}
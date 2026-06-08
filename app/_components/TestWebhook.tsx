"use client";

import { testInflowConnection } from "@/actions/webhook-test";
import { Button } from "@/components/ui/button";

const WebhookTestButton = () => {
  return ( 
    <Button onClick={() => testInflowConnection()} variant="default" >Send Webhook Test Event</Button>
  );
}
 
export default WebhookTestButton;
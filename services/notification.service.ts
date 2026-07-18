type NotificationPayload = {
  jobId: string;
  source: string;
  locationId: string;
  status: "SUCCESS" | "FAILED";
  error?: string;
};

export class NotificationService {
  /**
   * Main distribution router for sending worker status alerts
   */
  static async sendAlert(payload: NotificationPayload) {
    const timestamp = new Date().toLocaleString();
    
    // Build an clean textual log message
    const message = payload.status === "SUCCESS"
      ? `✅ [BullMQ Success] Job #${payload.jobId} passed.\n• Source: ${payload.source}\n• Location: ${payload.locationId}\n• Time: ${timestamp}`
      : `🚨 [BullMQ Failure] Job #${payload.jobId} CRASHED!\n• Source: ${payload.source}\n• Location: ${payload.locationId}\n• Error: ${payload.error}\n• Time: ${timestamp}`;

    // Log to standard console output streams
    console.log(message);

    // 🌟 PLACE YOUR DISPATCH CHANNELS HERE
    await this.sendToSlack(message);
    // await this.sendToDiscord(message);
  }

  private static async sendToSlack(text: string) {
    if (!process.env.SLACK_WEBHOOK_URL) return;
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
    } catch (err) {
      console.error("Failed sending notification message payload to Slack Channel:", err);
    }
  }
}
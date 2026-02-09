/**
 * Provider Webhook Notifications
 *
 * Fire-and-forget POST to a configurable webhook URL when the system
 * auto-pauses or resumes due to provider health changes.
 *
 * @module provider-webhook
 */

import type { HealthState } from "./provider-health";
import crypto from "crypto";

export type WebhookEventType = "system_paused" | "system_resumed" | "provider_failure";

export type WebhookEvent = {
  type: WebhookEventType;
  reason: string;
  provider?: string;
  timestamp: string;
  healthState: HealthState;
};

const WEBHOOK_TIMEOUT_MS = 5_000;

/**
 * Fire a webhook notification. Fire-and-forget: catches all errors and logs them.
 * If FH_WEBHOOK_URL is not configured, returns silently.
 */
export async function fireWebhook(event: WebhookEvent): Promise<void> {
  const url = process.env.FH_WEBHOOK_URL;
  if (!url) return;

  try {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Optional HMAC-SHA256 signature
    const secret = process.env.FH_WEBHOOK_SECRET;
    if (secret) {
      const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
      headers["X-Webhook-Signature"] = `sha256=${signature}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body,
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[Webhook] POST to ${url} failed: HTTP ${res.status} ${res.statusText}`);
    } else {
      console.log(`[Webhook] ${event.type} notification sent successfully`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Webhook] Failed to send ${event.type} notification: ${msg}`);
  }
}

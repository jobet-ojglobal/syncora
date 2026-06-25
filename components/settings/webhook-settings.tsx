// partner-app/components/WebhookSettings.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Check, Copy, RefreshCw, Trash2, Radio } from "lucide-react";

interface WebhookSubscription {
  subscriptionId: string;
  url: string;
  events: string[];
  secret?: string;
}

const AVAILABLE_EVENTS = [
  { id: "order.created", label: "Order Created", desc: "Triggers when a new order is placed." },
  { id: "order.shipped", label: "Order Shipped", desc: "Triggers when fulfillment marks an order as shipped." },
  { id: "inventory.updated", label: "Inventory Updated", desc: "Triggers when stock levels shift." },
];

export default function WebhookSettings() {
  const [loading, setLoading] = useState(false);
  const [webhook, setWebhook] = useState<WebhookSubscription | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // 1. Fetch current registration status on mount
  useEffect(() => {
    fetchWebhookStatus();
  }, []);

  const fetchWebhookStatus = async () => {
    try {
      const res = await fetch("/api/webhooks");
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        // App pattern handles a single unified consumer subscription for simplicity
        const activeSub = data[0];
        setWebhook(activeSub);
        setUrlInput(activeSub.url);
        setSelectedEvents(activeSub.events);
      } else {
        setWebhook(null);
      }
    } catch (err) {
      console.error("Failed to fetch subscription status", err);
    }
  };

  // 2. Toggle available system events
  const handleEventToggle = (eventId: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  // 3. Save or Update registration setup
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || selectedEvents.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: webhook?.subscriptionId || crypto.randomUUID(),
          url: urlInput,
          events: selectedEvents,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setWebhook(updated);
        alert("Webhook configuration saved successfully!");
      }
    } catch (err) {
      alert("Failed to update webhook config.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Delete subscription completely
  const handleDelete = async () => {
    if (!webhook || !confirm("Are you sure you want to disconnect this webhook setup?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/webhooks/${webhook.subscriptionId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setWebhook(null);
        setUrlInput("");
        setSelectedEvents([]);
      }
    } catch (err) {
      alert("Failed to delete registration.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (!webhook?.secret) return;
    navigator.clipboard.writeText(webhook.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white border border-gray-200 rounded-xl shadow-sm my-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Webhook Outbound Integration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Register custom HTTP endpoints to receive real-time payload updates from this environment.
          </p>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${webhook ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          <Radio className="w-3 h-3 animate-pulse" />
          {webhook ? "Connected" : "Disconnected"}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Endpoint URL Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint URL</label>
          <input
            type="url"
            required
            placeholder="https://your-main-app.com/api/webhooks/partner"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900"
          />
        </div>

        {/* Event Select Matrix */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Subscribe to Events</label>
          <div className="grid gap-3 sm:grid-cols-1">
            {AVAILABLE_EVENTS.map((evt) => {
              const isChecked = selectedEvents.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  onClick={() => handleEventToggle(evt.id)}
                  className={`flex items-start p-4 border rounded-xl cursor-pointer transition-colors select-none ${
                    isChecked ? "border-blue-500 bg-blue-50/40" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center h-5 mt-0.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </div>
                  <div className="ml-3">
                    <span className="block text-sm font-semibold text-gray-900">{evt.label}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{evt.desc}</span>
                  </div>
                  <span className="ml-auto text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {evt.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Security / Secret Segment */}
        {webhook?.secret && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-sm font-medium text-gray-900">Signing Secret Key</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  Verifies outbound payloads originate legitimately from this platform. Matches the <code className="bg-gray-200 px-1 py-0.2 rounded text-red-600">X-Partner-Signature</code> header.
                </span>
              </div>
              <button
                type="button"
                onClick={copySecret}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy key"}
              </button>
            </div>
            <div className="mt-2.5 font-mono text-xs bg-gray-900 text-gray-300 p-2 rounded-lg truncate select-all">
              {webhook.secret}
            </div>
          </div>
        )}

        {/* Lower Control Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          {webhook ? (
            <button
              type="button"
              disabled={loading}
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Disconnect
            </button>
          ) : (
            <div />
          )}

          <button
            type="submit"
            disabled={loading || !urlInput || selectedEvents.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Save Webhook Settings
          </button>
        </div>
      </form>
    </div>
  );
}
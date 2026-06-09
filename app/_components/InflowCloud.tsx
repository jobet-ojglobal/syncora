"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { testConnection } from "@/actions/webhook-test";

import type { ConnectionResult } from "@/actions/webhook-test";

const InflowCloudHealth = () => {
  const [pending, startTransition] =
    useTransition();
  const [error, setError] = useState<string | null>(
    null
  );
  const [result, setResult] =
  useState<Extract<ConnectionResult, { success: true }> | null>(
    null
  );

  const handleTestConnection = () => {
    startTransition(async () => {
      setError(null);

      try {
        const response =
          await testConnection();

        if (!response.success) {
          setError(
            response.error ??
              "Connection failed"
          );
          return;
        }

        setResult(response);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unknown error"
        );
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          InFlow Cloud

          {result?.connected &&
            result?.subscribed &&
            !result?.disabled && (
              <Badge>
                Healthy
              </Badge>
          )}

          {result?.disabled && (
            <Badge variant="destructive">
              Attention Needed
            </Badge>
          )}
        </CardTitle>

        <CardDescription>
          Inventory sync and webhook integration
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Status</span>
          <Badge
            variant={
              pending
                ? "secondary"
                : result?.connected
                ? "default"
                : "secondary"
            }
          >
            {pending
              ? "Testing..."
              : result?.connected
              ? "Connected"
              : "Unknown"}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <span>Webhook</span>

          <Badge
            variant={
              result?.subscribed
                ? "default"
                : "secondary"
            }
          >
            {result?.subscribed
              ? "Subscribed"
              : "Not Subscribed"}
          </Badge>
        </div>

        {result && (
          <>
            <div className="flex items-center justify-between">
              <span>Webhook Status</span>

              <Badge
                variant={
                  result.disabled
                    ? "destructive"
                    : "default"
                }
              >
                {result.disabled
                  ? "Disabled"
                  : "Active"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span>Delivery Failures</span>

              <span>{result.failures}</span>
            </div>

            <div className="flex items-center justify-between">
              <span>Webhook ID</span>

              <code className="text-xs">
                {result.webhookId.slice(0, 8)}
                ...
                {result.webhookId.slice(-4)}
              </code>
            </div>
          </>
        )}

        <Separator />

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">
            Webhook URL
          </p>

          <code className="block break-all text-xs">
            {process.env.APP_URL}
            /api/webhooks/inflow
          </code>
        </div>

        {result?.success && (
          <div className="rounded-md border bg-muted/50 p-3 text-sm space-y-1">
            <p>✓ API Authentication Successful</p>
            <p>✓ Webhook Registered</p>

            <p>
              {result.disabled
                ? "⚠ Webhook Disabled"
                : "✓ Webhook Active"}
            </p>

            <p>
              Consecutive Failures:{" "}
              {result.failures}
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Button
          onClick={handleTestConnection}
          disabled={pending}
        >
          {pending
            ? "Testing..."
            : "Test Connection"}
        </Button>

        <Button
          variant="outline"
          onClick={handleTestConnection}
          disabled={pending}
        >
          Refresh
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InflowCloudHealth;
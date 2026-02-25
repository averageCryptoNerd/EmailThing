"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CLIENT_PIN_HASH_KEY,
  PIN_REGEX,
  hasClientPin,
  isClientPinUnlocked,
  setClientPinUnlocked,
  verifyClientPin,
} from "@/utils/client-pin";
import { useEffect, useMemo, useState } from "react";

export function ClientPinGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const shouldLock = useMemo(() => locked, [locked]);

  useEffect(() => {
    const syncLockState = () => {
      const requiresPin = hasClientPin();
      const unlocked = isClientPinUnlocked();
      setLocked(requiresPin && !unlocked);
      setReady(true);
    };

    syncLockState();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === CLIENT_PIN_HASH_KEY) {
        syncLockState();
      }
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", syncLockState);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", syncLockState);
    };
  }, []);

  if (!ready) return null;
  if (!shouldLock) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Device PIN Required</CardTitle>
          <CardDescription>Enter the device PIN to access your emails on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!PIN_REGEX.test(pin.trim())) {
                setError("PIN must be 4-10 digits.");
                return;
              }

              setIsVerifying(true);
              setError(null);
              const verified = await verifyClientPin(pin);
              setIsVerifying(false);

              if (!verified) {
                setError("Incorrect PIN.");
                return;
              }

              setClientPinUnlocked(true);
              setPin("");
              setLocked(false);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="device-pin-unlock">PIN</Label>
              <Input
                id="device-pin-unlock"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D+/g, ""));
                  if (error) setError(null);
                }}
                inputMode="numeric"
                autoComplete="one-time-code"
                type="password"
                placeholder="Enter PIN"
              />
            </div>
            {error ? <p className="text-destructive text-sm">{error}</p> : null}
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? "Unlocking..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

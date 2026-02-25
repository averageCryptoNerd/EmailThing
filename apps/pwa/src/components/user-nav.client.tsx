"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { clearClientPin, hasClientPin, PIN_REGEX, setClientPin, verifyClientPin } from "@/utils/client-pin";
import { db } from "@/utils/data/db";
import { useGravatar } from "@/utils/fetching";
import { Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMediaQuery } from "usehooks-ts";
interface UserProps {
  user: {
    name: string;
    image?: string;
    secondary: string;
    email: string;
  };
}

function getInitials(name: string) {
  // first 2 characters of name
  return name.slice(0, 2).toUpperCase();
}

export function UserDropDown({ user }: UserProps) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const img = useGravatar(user.email);
  const [hasPin, setHasPin] = useState(false);

  useEffect(() => {
    const syncPinState = () => setHasPin(hasClientPin());
    syncPinState();
    window.addEventListener("storage", syncPinState);
    window.addEventListener("focus", syncPinState);
    return () => {
      window.removeEventListener("storage", syncPinState);
      window.removeEventListener("focus", syncPinState);
    };
  }, []);

  const userIcon = (
    <Button
      variant="ghost"
      className="size-8 self-center rounded-full bg-transparent hover:bg-transparent"
      suppressHydrationWarning // i give up with sanity
    >
      <Avatar className="size-8 rounded-full">
        <AvatarImage src={img} alt={user?.name} /*crossOrigin="anonymous"*/ />
        <AvatarFallback className="bg-primary/80 text-white transition-all hover:bg-primary/70 dark:bg-secondary dark:text-foreground dark:hover:bg-secondary/80">
          {user?.name ? getInitials(user?.name) : ""}
        </AvatarFallback>
      </Avatar>
    </Button>
  );

  // Mobile
  if (!isDesktop) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>{userIcon}</DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{user.name}</DrawerTitle>
            <DrawerDescription>{user.secondary}</DrawerDescription>
          </DrawerHeader>

          <div className="mx-4 flex flex-col gap-2 pt-2">
            {/* <Button variant="secondary" asChild>
                            <DrawerClose asChild>
                                <Link to="/mail" className="w-full">
                                    Mailbox
                                </Link>
                            </DrawerClose>
                        </Button> */}
            <Button variant="secondary" asChild>
              <DrawerClose asChild>
                <Link to="/settings" className="w-full">
                  User settings
                </Link>
              </DrawerClose>
            </Button>
            <Button variant="secondary" asChild>
              <DrawerClose asChild>
                <Link to="/home" className="w-full">
                  EmailThing Home
                </Link>
              </DrawerClose>
            </Button>

            <ClientPinDialog hasPin={hasPin} onPinStateChange={setHasPin} mobileButton />

            <Button variant="secondary" asChild>
              <DrawerClose className="w-full" asChild>
                <LogoutButton>Sign out</LogoutButton>
              </DrawerClose>
            </Button>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="default">Close</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{userIcon}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <h3 className="truncate font-medium text-sm">{user.name}</h3>
            <p className="truncate text-muted-foreground text-xs">{user.secondary}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link to="/mail" className="cursor-pointer">
              Mailbox
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/settings" className="cursor-pointer">
              User Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/home" className="cursor-pointer">
              EmailThing Home
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <ClientPinDialog hasPin={hasPin} onPinStateChange={setHasPin} />

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild className="flex w-full cursor-pointer gap-2">
          <LogoutButton>Sign out</LogoutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ClientPinDialog({
  hasPin,
  onPinStateChange,
  mobileButton,
}: {
  hasPin: boolean;
  onPinStateChange: (hasPin: boolean) => void;
  mobileButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [nextPin, setNextPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setCurrentPin("");
    setNextPin("");
    setConfirmPin("");
    setError(null);
    setIsSaving(false);
  };

  const actionLabel = hasPin ? "Change PIN" : "Set PIN";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        {mobileButton ? (
          <Button variant="secondary" className="w-full">
            {hasPin ? "Device PIN (Enabled)" : "Set Device PIN"}
          </Button>
        ) : (
          <button
            type="button"
            className="hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm outline-hidden"
          >
            {hasPin ? "Device PIN (Enabled)" : "Set Device PIN"}
          </button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Device PIN</DialogTitle>
          <DialogDescription>
            {hasPin
              ? "Change or remove your local PIN. This PIN is only stored on this device."
              : "Set a local PIN so this device requires it before opening your emails."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);

            if (hasPin) {
              if (!PIN_REGEX.test(currentPin.trim())) {
                setError("Current PIN must be 4-10 digits.");
                return;
              }
              const verified = await verifyClientPin(currentPin);
              if (!verified) {
                setError("Current PIN is incorrect.");
                return;
              }
            }

            if (!PIN_REGEX.test(nextPin.trim())) {
              setError("New PIN must be 4-10 digits.");
              return;
            }

            if (nextPin !== confirmPin) {
              setError("PIN confirmation does not match.");
              return;
            }

            setIsSaving(true);
            try {
              await setClientPin(nextPin);
              onPinStateChange(true);
              setOpen(false);
              reset();
            } catch {
              setError("Unable to save PIN.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          {hasPin ? (
            <div className="space-y-1.5">
              <Label htmlFor="current-device-pin">Current PIN</Label>
              <Input
                id="current-device-pin"
                value={currentPin}
                onChange={(event) => setCurrentPin(event.target.value.replace(/\D+/g, ""))}
                inputMode="numeric"
                autoComplete="off"
                type="password"
                placeholder="Current PIN"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="new-device-pin">New PIN</Label>
            <Input
              id="new-device-pin"
              value={nextPin}
              onChange={(event) => setNextPin(event.target.value.replace(/\D+/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              type="password"
              placeholder="4-10 digits"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-device-pin">Confirm PIN</Label>
            <Input
              id="confirm-device-pin"
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D+/g, ""))}
              inputMode="numeric"
              autoComplete="off"
              type="password"
              placeholder="Re-enter PIN"
            />
          </div>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <DialogFooter>
            {hasPin ? (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  setError(null);
                  if (!PIN_REGEX.test(currentPin.trim())) {
                    setError("Enter current PIN to remove it.");
                    return;
                  }
                  const verified = await verifyClientPin(currentPin);
                  if (!verified) {
                    setError("Current PIN is incorrect.");
                    return;
                  }
                  clearClientPin();
                  onPinStateChange(false);
                  setOpen(false);
                  reset();
                }}
              >
                Remove PIN
              </Button>
            ) : null}
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : actionLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LogoutButton(params: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const [transition, startTransition] = useTransition();

  return (
    <button
      {...params}
      onClick={(e) => {
        e.preventDefault();
        startTransition(async () => {
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          document.cookie = "mailboxId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

          await db.logout();
          navigate("/");
          params.onClick?.();
        });
      }}
      type="button"
    >
      {transition ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      {params.children}
    </button>
  );
}

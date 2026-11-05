"use client";

import { LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, Input } from "@/components/ui";
import { api } from "@/lib/client/api";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const next = params.get("next");
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    if (!password) {
      setError("Enter the staff password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { password });
      router.replace(target);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-950/5" noValidate>
      <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
        <LockKeyhole className="size-5" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold text-gray-950">Staff login</h1>
      <p className="mt-1 text-sm text-gray-600">Enter the password your administrator gave you.</p>
      <input type="text" name="username" autoComplete="username" value="staff" readOnly hidden />
      <Field label="Password" error={error ?? undefined} className="mt-5">
        {(p) => <Input {...p} type="password" name="password" autoComplete="current-password" autoFocus />}
      </Field>
      <Button type="submit" variant="primary" size="lg" loading={loading} className="mt-5 w-full">
        Log in
      </Button>
    </form>
  );
}

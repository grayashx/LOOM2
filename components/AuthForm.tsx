"use client";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const next = searchParams.get("next") || "/";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");
    const supabase = supabaseBrowser();
    if (!supabase) { setError("Set up Supabase in .env.local to enable accounts. The public demo is still browsable."); setBusy(false); return; }
    if (mode === "signup") {
      const username = String(form.get("username") || "").trim();
      const displayName = String(form.get("displayName") || username).trim();
      const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { username, display_name: displayName }, emailRedirectTo: `${window.location.origin}/` } });
      if (authError) setError(authError.message);
      else if (data.session) { router.push(next); router.refresh(); }
      else setNotice("Account created. Check your email to confirm your address, then sign in.");
    } else {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message); else { router.push(next); router.refresh(); }
    }
    setBusy(false);
  }
  return <form className="form-stack" onSubmit={submit}>
    {mode === "signup" && <>
      <label>Username<input required name="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]+" placeholder="inkandstarlight" autoComplete="username"/></label>
      <label>Display name<input name="displayName" maxLength={60} placeholder="How readers see you"/></label>
    </>}
    <label>Email address<input required name="email" type="email" autoComplete="email" placeholder="you@example.com"/></label>
    <label>Password<input required name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters"/></label>
    {error && <div className="form-alert error" role="alert">{error}</div>}{notice && <div className="form-alert success" role="status">{notice}</div>}
    <button className="button button-primary button-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create free account"}</button>
    <p className="form-footnote">{mode === "login" ? <>New to LOOM? <Link href="/signup">Create an account</Link></> : <>Already have an account? <Link href="/login">Sign in</Link></>}</p>
  </form>;
}

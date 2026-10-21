import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Feather, Sparkles } from "lucide-react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create your account" };
export default function SignupPage() {
  return <section className="auth-page"><div className="auth-decoration auth-decoration-warm"><div className="auth-glyph"><Feather size={32}/></div><span className="auth-quote">Every story starts with a single, brave sentence.</span><small>YOURS CAN START HERE</small><div className="auth-stars">✧　　 ·　　✦　　 ·　✧</div></div><div className="auth-panel"><Link href="/" className="back-link">← Back home</Link><div className="auth-heading"><div className="eyebrow">A PLACE TO BEGIN</div><h1>Make yourself <em>at home.</em></h1><p>Build your library, find your community, or put the first lines of your own world on the page.</p></div><Suspense fallback={<div className="form-skeleton"/>}><AuthForm mode="signup"/></Suspense><div className="auth-bottom"><Sparkles size={14}/> Free to join. Authors keep ownership of their words.</div></div></section>;
}

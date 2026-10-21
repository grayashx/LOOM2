import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };
export default function LoginPage() {
  return <section className="auth-page"><div className="auth-decoration"><div className="auth-glyph"><BookOpen size={32}/></div><span className="auth-quote">“There is no friend as loyal as a book.”</span><small>— A VERY GOOD REASON TO STAY AWHILE</small><div className="auth-stars">✦　　 ·　　✧　　 ·　✦</div></div><div className="auth-panel"><Link href="/" className="back-link">← Back home</Link><div className="auth-heading"><div className="eyebrow">WELCOME BACK</div><h1>Your next chapter <em>awaits.</em></h1><p>Sign in to keep your reading progress, library, and rewards together.</p></div><Suspense fallback={<div className="form-skeleton"/>}><AuthForm mode="login"/></Suspense><div className="auth-bottom"><Sparkles size={14}/> Your reading history stays private by default.</div></div></section>;
}

import Link from "next/link";
import { BookOpen, Compass, Feather, Flame, Gem, Library, Search, ShieldCheck, Sparkles } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { signOutAction } from "@/app/actions";

export default async function Nav() {
  const supabase = await supabaseServer();
  let signedIn = false;
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }
  return <>
    <header className="topbar">
      <Link className="brand" href="/" aria-label="LOOM home"><span className="brand-mark"><BookOpen size={19}/></span><span>LOOM<span className="brand-dot">.</span></span></Link>
      <nav className="top-links" aria-label="Main navigation">
        <Link href="/explore"><Compass size={16}/> Explore</Link>
        <Link href="/rankings"><Flame size={16}/> Rankings</Link>
        <Link href="/quests"><Sparkles size={16}/> Quests</Link>
        <Link href="/studio"><Feather size={16}/> Author Studio</Link>
      </nav>
      <div className="nav-actions">
        <Link className="icon-link" href="/explore" aria-label="Search stories"><Search size={18}/></Link>
        <Link className="essence-pill" href="/wallet"><Gem size={16}/> Essence</Link>
        {signedIn ? <form action={signOutAction}><button className="button button-quiet button-small" type="submit">Sign out</button></form> : <Link className="button button-primary button-small" href="/login">Sign in</Link>}
      </div>
    </header>
    <nav className="mobile-nav" aria-label="Mobile navigation">
      <Link href="/"><BookOpen size={18}/><span>Home</span></Link>
      <Link href="/explore"><Compass size={18}/><span>Explore</span></Link>
      <Link href="/quests"><Sparkles size={18}/><span>Quests</span></Link>
      <Link href="/wallet"><Gem size={18}/><span>Wallet</span></Link>
      <Link href="/studio"><Feather size={18}/><span>Studio</span></Link>
    </nav>
  </>;
}

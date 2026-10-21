import Link from "next/link";
import { BookOpen, Compass } from "lucide-react";
export default function NotFound(){return <section className="section-wrap not-found"><div className="not-found-mark"><BookOpen size={28}/></div><div className="eyebrow">PAGE NOT FOUND</div><h1>This page wandered<br/><em>into another story.</em></h1><p>It may have moved, or the chapter may not be published or accessible yet.</p><div><Link className="button button-primary" href="/explore"><Compass size={16}/> Explore stories</Link><Link className="button button-secondary" href="/">Back home</Link></div></section>;}

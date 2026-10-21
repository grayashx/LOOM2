import Link from "next/link";
import { ArrowRight, BookOpen, Compass, Feather, Flame, Gem, Heart, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import StoryCard from "@/components/StoryCard";
import { getPublishedStories } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function HomePage() {
  const stories = await getPublishedStories();
  const demo = !isSupabaseConfigured();
  const featured = stories[0];
  return <>
    {demo && <div className="demo-strip"><span>Preview mode</span> These are sample stories. Connect Supabase to enable accounts, publishing, and saved libraries.</div>}
    <section className="hero section-wrap">
      <div className="hero-copy"><div className="hero-kicker"><span className="kicker-line"/> A HOME FOR EVERY KIND OF STORY</div><h1>Some worlds are<br/><em>worth getting lost in.</em></h1><p>Find your next obsession. Follow every twist. Or write the story you wish existed. LOOM is where serialized fiction finds its people.</p><div className="hero-actions"><Link className="button button-primary button-large" href="/explore">Find your next read <ArrowRight size={17}/></Link><Link className="button button-quiet button-large" href="/studio">Start writing <Feather size={17}/></Link></div><div className="hero-trust"><span><ShieldCheck size={15}/> Authors own their words</span><span><Heart size={15}/> Readers support creators</span></div></div>
      <div className="hero-art" aria-label="Featured story illustration"><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-sun"/><div className="hero-moon">✦</div><div className="hero-art-label"><small>FEATURED DISCOVERY</small><strong>{featured?.title || "The stories ahead"}</strong><span>{featured?.genre || "Every genre, every voice"}</span><Link href={featured ? `/story/${featured.slug}` : "/explore"}>Open story <ArrowRight size={13}/></Link></div><div className="hero-stars">✦　·　　 ✧　　·　✦</div></div>
    </section>
    <section className="principles-band"><div><BookOpen/><strong>Read without a login wall</strong><span>Start a chapter before creating an account.</span></div><div><Sparkles/><strong>Earn Essence in quests</strong><span>Rewarded ads are verified, not self-awarded.</span></div><div><Feather/><strong>Your words stay yours</strong><span>Export and own your manuscript.</span></div></section>
    <section className="section-wrap content-section"><div className="section-heading"><div><div className="eyebrow">YOUR NEXT FAVORITE</div><h2>Stories to stay up for</h2><p>Fresh worlds, honest discovery, and new voices that deserve a turn in the light.</p></div><Link className="text-link" href="/explore">Explore all stories <ArrowRight size={16}/></Link></div><div className="story-grid">{stories.slice(0,4).map((story,i)=><StoryCard key={story.id} story={story} badge={i===0?"New Voices":undefined}/>)}</div></section>
    <section className="section-wrap discovery-strip"><div className="discovery-mark"><Compass size={28}/></div><div><div className="eyebrow">DISCOVERY, WITH THE LIGHTS ON</div><h2>Popularity isn't the same as quality.</h2><p>Trending, Rising, Reader Favorite, Hidden Gem, and New Voices each mean something different. No pay-to-win rankings. No invisible rules.</p></div><Link className="button button-secondary" href="/rankings">See how stories rise <ArrowRight size={16}/></Link></section>
    <section className="section-wrap writer-cta"><div className="writer-cta-art"><div className="writer-page page-back">Once upon a time…</div><div className="writer-page page-front"><span>YOUR STORY</span><div className="page-lines"/><div className="page-lines short"/><div className="page-lines"/><div className="page-lines medium"/><div className="page-feather">✧</div></div></div><div className="writer-cta-copy"><div className="eyebrow">FOR AUTHORS & DAYDREAMERS</div><h2>Your story deserves<br/><em>more than a folder.</em></h2><p>Write in a focused editor with autosave and revisions. Publish on your schedule, understand where readers stay, and build a community without giving up ownership.</p><Link className="button button-primary button-large" href="/studio">Open Author Studio <Feather size={17}/></Link></div></section>
    <section className="bottom-cta"><div><WandSparkles size={24}/><h2>The first chapter is free.</h2><p>Come for a story. Stay for the worlds you haven't found yet.</p></div><Link className="button button-light button-large" href="/explore">Start exploring <ArrowRight size={17}/></Link></section>
  </>;
}

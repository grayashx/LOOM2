import type { Metadata } from "next";
import { Compass, Sparkles } from "lucide-react";
import ExploreBrowser from "@/components/ExploreBrowser";
import { getPublishedStories } from "@/lib/data";

export const metadata: Metadata = { title: "Explore stories" };
export default async function ExplorePage() {
  const stories = await getPublishedStories();
  return <section className="section-wrap page-section"><div className="page-kicker"><Compass size={18}/> THE DISCOVERY ROOM</div><div className="page-title-row"><div><h1>Find your kind of <em>magic.</em></h1><p>Browse by genre, search tropes, and find a world that feels like it was waiting for you.</p></div><div className="page-title-art"><Sparkles size={28}/></div></div><ExploreBrowser stories={stories}/></section>;
}

"use client";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import StoryCard from "@/components/StoryCard";
import type { Story } from "@/lib/demo-data";

export default function ExploreBrowser({ stories }: { stories: Story[] }) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("All genres");
  const [completion, setCompletion] = useState("Any status");
  const genres = useMemo(() => ["All genres", ...Array.from(new Set(stories.map((s) => s.genre || "Fiction"))).sort()], [stories]);
  const filtered = useMemo(() => stories.filter((story) => {
    const search = `${story.title} ${story.author_name} ${story.description} ${story.genre} ${(story.tags || []).join(" ")}`.toLowerCase();
    return (!query || search.includes(query.toLowerCase())) && (genre === "All genres" || story.genre === genre) && (completion === "Any status" || (completion === "Completed" ? story.completed : !story.completed));
  }), [stories, query, genre, completion]);
  return <>
    <div className="explore-tools"><label className="search-field"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search stories, authors, tropes…" aria-label="Search stories"/>{query && <button onClick={()=>setQuery("")} aria-label="Clear search"><X size={16}/></button>}</label><label className="filter-select"><SlidersHorizontal size={16}/><select aria-label="Filter by genre" value={genre} onChange={(e)=>setGenre(e.target.value)}>{genres.map((g)=><option key={g}>{g}</option>)}</select></label><label className="filter-select"><select aria-label="Filter by completion" value={completion} onChange={(e)=>setCompletion(e.target.value)}><option>Any status</option><option>Ongoing</option><option>Completed</option></select></label></div>
    <div className="results-count">{filtered.length} {filtered.length===1?"story":"stories"} {query || genre!=="All genres" || completion!=="Any status" ? "match your filters" : "ready to discover"}</div>
    {filtered.length ? <div className="story-grid">{filtered.map((story,i)=><StoryCard key={story.id} story={story} badge={i===0 && !query ? "New Voices" : undefined}/>)}</div> : <div className="empty-state"><Search size={30}/><h3>No stories found</h3><p>Try a broader search or remove one of your filters.</p><button className="button button-secondary" onClick={()=>{setQuery("");setGenre("All genres");setCompletion("Any status");}}>Clear filters</button></div>}
  </>;
}

import Link from "next/link";
import { BookOpen, CheckCircle2, Clock3 } from "lucide-react";
import type { Story } from "@/lib/demo-data";

export default function StoryCard({ story, badge }: { story: Story; badge?: string }) {
  return <article className="story-card">
    <Link href={`/story/${story.slug}`} className="cover-link" aria-label={`Read ${story.title}`}>
      {story.cover_url ? <img className="story-cover" src={story.cover_url} alt={`Cover for ${story.title}`} loading="lazy"/> : <div className="cover-fallback"><BookOpen size={38}/><span>{story.title}</span></div>}
      {badge && <span className="cover-badge">{badge}</span>}
    </Link>
    <div className="story-card-copy">
      <div className="eyebrow">{story.genre || "Fiction"}</div>
      <h3><Link href={`/story/${story.slug}`}>{story.title}</Link></h3>
      <div className="story-author">by {story.author_name || "LOOM Author"}</div>
      <p>{story.description}</p>
      <div className="tag-row">{(story.tags || []).slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
      <div className="story-meta"><span><BookOpen size={14}/> {story.chapters_count || "New"} {story.chapters_count ? "chapters" : "story"}</span><span>{story.completed ? <><CheckCircle2 size={14}/> Complete</> : <><Clock3 size={14}/> Ongoing</>}</span></div>
    </div>
  </article>;
}

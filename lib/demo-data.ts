export type Story = {
  id: string;
  title: string;
  slug: string;
  description: string;
  author_name: string;
  genre: string;
  tags: string[];
  cover_url: string | null;
  status: string;
  completed: boolean;
  chapters_count: number;
  updated_at: string;
};

export const DEMO_STORIES: Story[] = [
  {
    id: "demo-1", title: "The Last Archive", slug: "the-last-archive",
    description: "When the stars begin forgetting their own names, a disgraced archivist discovers that every erased memory has been hiding a living world.",
    author_name: "Mira Vale", genre: "Fantasy", tags: ["found family", "mystery", "slow burn"],
    cover_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700&q=80", status: "published", completed: false, chapters_count: 24, updated_at: new Date().toISOString()
  },
  {
    id: "demo-2", title: "A Thousand Quiet Suns", slug: "a-thousand-quiet-suns",
    description: "A courier carries one last message across an empire where sunlight is rationed and kindness is an act of rebellion.",
    author_name: "June North", genre: "Science Fiction", tags: ["space opera", "found family", "hopepunk"],
    cover_url: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?auto=format&fit=crop&w=700&q=80", status: "published", completed: false, chapters_count: 17, updated_at: new Date().toISOString()
  },
  {
    id: "demo-3", title: "The Villain's Second Draft", slug: "the-villains-second-draft",
    description: "Reborn as the final boss of a romance novel, a tired editor sets out to fix every plot hole—including her own.",
    author_name: "K. Rowan", genre: "Romance", tags: ["second chance", "comedy", "meta fiction"],
    cover_url: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80", status: "published", completed: true, chapters_count: 61, updated_at: new Date().toISOString()
  },
  {
    id: "demo-4", title: "Iron Season", slug: "iron-season",
    description: "In a city built on a sleeping machine, the only way to become a hero is to learn why the legends were written to lie.",
    author_name: "Ash Marlow", genre: "LitRPG", tags: ["progression", "political intrigue", "academy"],
    cover_url: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=700&q=80", status: "published", completed: false, chapters_count: 9, updated_at: new Date().toISOString()
  }
];

export const DEMO_CHAPTERS = [
  { id: "demo-ch-1", title: "Chapter One: The Catalogue of Lost Things", order_index: 1 },
  { id: "demo-ch-2", title: "Chapter Two: A Door That Wasn't There", order_index: 2 },
  { id: "demo-ch-3", title: "Chapter Three: The Cost of Remembering", order_index: 3 }
];

export const DEMO_CHAPTER_CONTENT = `The first star went missing on a Tuesday, which was inconvenient because Tuesdays were inventory days.\n\nMara Venn noticed the empty place in the sky only because it had left a blank line in the catalogue. Every star in the northern quarter had a name, a date of discovery, and a short note describing the color it turned just before dawn. The missing one had all three, and yet when Mara looked up, there was only a neat black space where its light should have been.\n\nShe checked the record again. The page was warm beneath her fingers. Someone had written a new sentence in the margin: **Do not remember what remembers you.**\n\nMara had spent ten years restoring damaged stories. She knew a forged line when she saw one. She also knew, with the certainty of a person standing at the edge of a roof, that the handwriting was hers.\n\nOutside, the city continued its morning rituals. Brass trams shook the mist from their windows. Bakers opened their shutters. Somewhere, a child began to cry and was quickly comforted. Life carried on beneath the missing star as though the sky had always been incomplete.\n\nMara closed the book. In the quiet that followed, something on the other side of the archive shelves knocked three times.`;

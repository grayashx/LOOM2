"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const storySchema = z.object({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(3000),
  genre: z.string().trim().min(2).max(40),
  tags: z.string().max(400).optional()
});

function slugify(input: string) {
  return input.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || `story-${Date.now()}`;
}

export async function createSeries(formData: FormData) {
  const supabase = await supabaseServer();
  if (!supabase) redirect("/signup?next=%2Fstudio%2Fnew");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fstudio%2Fnew");
  const parsed = storySchema.safeParse({
    title: formData.get("title"), description: formData.get("description"),
    genre: formData.get("genre"), tags: formData.get("tags")
  });
  if (!parsed.success) redirect("/studio/new?error=Check+the+story+details");
  const payload = parsed.data;
  const tags = (payload.tags || "").split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 20);
  const baseSlug = slugify(payload.title);
  const slug = `${baseSlug}-${user.id.slice(0, 5)}`;
  const { data, error } = await supabase.from("series").insert({
    author_id: user.id, title: payload.title, description: payload.description,
    genre: payload.genre, tags, slug, status: "published"
  }).select("id").single();
  if (error || !data) redirect(`/studio/new?error=${encodeURIComponent(error?.message || "Unable to create story")}`);
  revalidatePath("/studio");
  redirect(`/studio/${data.id}`);
}

export type SaveDraftResult = { ok: boolean; chapterId?: string; error?: string; published?: boolean };

export async function saveChapterDraft(input: {
  seriesId: string; chapterId: string; title: string; content: string; publish?: boolean; paywallType?: string; priceEssence?: number;
}): Promise<SaveDraftResult> {
  const supabase = await supabaseServer();
  if (!supabase) return { ok: false, error: "Connect Supabase before saving drafts." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again to save your draft." };
  const title = input.title.trim().slice(0, 160);
  const content = input.content.slice(0, 300_000);
  const paywallType = ["free", "embers", "subscriber"].includes(input.paywallType || "") ? input.paywallType! : "free";
  const priceEssence = paywallType === "embers" ? Math.max(1, Math.min(100000, Math.floor(Number(input.priceEssence || 10)))) : 0;
  if (!title) return { ok: false, error: "Give this chapter a title before saving." };
  if (input.publish && content.trim().length < 30) return { ok: false, error: "Add at least a few sentences before publishing." };

  const { data: series, error: seriesError } = await supabase.from("series").select("id,author_id,slug").eq("id", input.seriesId).maybeSingle();
  if (seriesError || !series || series.author_id !== user.id) return { ok: false, error: "You do not have permission to edit this story." };

  const isNew = input.chapterId === "new";
  const isDraft = input.chapterId.startsWith("draft-");
  const draftId = isDraft ? input.chapterId.slice("draft-".length) : null;
  const realChapterId = isNew || isDraft ? null : input.chapterId;

  // Fresh chapter: save a private draft first; only publishing creates a public chapter row.
  if (isNew) {
    if (input.publish) {
      const { data: latest } = await supabase.from("chapters").select("order_index").eq("series_id", input.seriesId).order("order_index", { ascending: false }).limit(1);
      const orderIndex = (latest?.[0]?.order_index || 0) + 1;
      const { data, error } = await supabase.from("chapters").insert({
        series_id: input.seriesId, author_id: user.id, title, content, paywall_type: paywallType, price_essence: priceEssence, order_index: orderIndex, status: "published", published_at: new Date().toISOString()
      }).select("id").single();
      if (error || !data) return { ok: false, error: error?.message || "Could not publish chapter." };
      revalidatePath(`/studio/${input.seriesId}`); revalidatePath(`/story/${series.slug}`);
      return { ok: true, chapterId: data.id, published: true };
    }
    const { data, error } = await supabase.from("drafts").insert({ series_id: input.seriesId, author_id: user.id, title, content, paywall_type: paywallType, price_essence: priceEssence }).select("id").single();
    if (error || !data) return { ok: false, error: error?.message || "Could not create draft." };
    return { ok: true, chapterId: `draft-${data.id}`, published: false };
  }

  // A draft ID refers to private text; when publishing, promote it to a chapter atomically as far as the application flow allows.
  if (isDraft && draftId) {
    const { data: draft } = await supabase.from("drafts").select("id,chapter_id,series_id,author_id,title,content").eq("id", draftId).eq("series_id", input.seriesId).eq("author_id", user.id).maybeSingle();
    if (!draft) return { ok: false, error: "Draft not found or not owned by you." };
    if (!input.publish) {
      const { error } = await supabase.from("drafts").update({ title, content, paywall_type: paywallType, price_essence: priceEssence, autosaved_at: new Date().toISOString() }).eq("id", draft.id).eq("author_id", user.id);
      if (error) return { ok: false, error: error.message };
      return { ok: true, chapterId: input.chapterId, published: false };
    }
    if (draft.chapter_id) {
      const { data: previous } = await supabase.from("chapters").select("id,title,content,published_at").eq("id", draft.chapter_id).eq("author_id", user.id).maybeSingle();
      if (!previous) return { ok: false, error: "Published chapter not found." };
      if (previous.content !== content || previous.title !== title) {
        const { error: revisionError } = await supabase.from("chapter_revisions").insert({ chapter_id: previous.id, author_id: user.id, title: previous.title, content: previous.content });
        if (revisionError) return { ok: false, error: `Could not record revision: ${revisionError.message}` };
      }
      const { error: updateError } = await supabase.from("chapters").update({ title, content, paywall_type: paywallType, price_essence: priceEssence, status: "published", published_at: previous.published_at || new Date().toISOString() }).eq("id", previous.id).eq("author_id", user.id);
      if (updateError) return { ok: false, error: updateError.message };
      await supabase.from("drafts").delete().eq("id", draft.id).eq("author_id", user.id);
      revalidatePath(`/studio/${input.seriesId}`); revalidatePath(`/story/${series.slug}`);
      return { ok: true, chapterId: previous.id, published: true };
    }
    const { data: latest } = await supabase.from("chapters").select("order_index").eq("series_id", input.seriesId).order("order_index", { ascending: false }).limit(1);
    const orderIndex = (latest?.[0]?.order_index || 0) + 1;
    const { data: chapter, error: publishError } = await supabase.from("chapters").insert({ series_id: input.seriesId, author_id: user.id, title, content, paywall_type: paywallType, price_essence: priceEssence, order_index: orderIndex, status: "published", published_at: new Date().toISOString() }).select("id").single();
    if (publishError || !chapter) return { ok: false, error: publishError?.message || "Could not publish chapter." };
    await supabase.from("drafts").delete().eq("id", draft.id).eq("author_id", user.id);
    revalidatePath(`/studio/${input.seriesId}`); revalidatePath(`/story/${series.slug}`);
    return { ok: true, chapterId: chapter.id, published: true };
  }

  // Existing chapter autosave writes a private draft row, leaving live chapter text untouched.
  const chapterId = realChapterId!;
  const { data: previous, error: lookupError } = await supabase.from("chapters").select("id,title,content,status,published_at,series_id").eq("id", chapterId).eq("series_id", input.seriesId).eq("author_id", user.id).maybeSingle();
  if (lookupError || !previous) return { ok: false, error: "Chapter not found or not owned by you." };

  if (!input.publish) {
    const { data: existingDraft } = await supabase.from("drafts").select("id").eq("chapter_id", chapterId).maybeSingle();
    if (existingDraft) {
      const { error } = await supabase.from("drafts").update({ title, content, paywall_type: paywallType, price_essence: priceEssence, autosaved_at: new Date().toISOString() }).eq("id", existingDraft.id).eq("author_id", user.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const { error } = await supabase.from("drafts").insert({ series_id: input.seriesId, chapter_id: chapterId, author_id: user.id, title, content, paywall_type: paywallType, price_essence: priceEssence });
      if (error) return { ok: false, error: error.message };
    }
    return { ok: true, chapterId, published: false };
  }

  if (previous.content !== content || previous.title !== title) {
    const { error: revisionError } = await supabase.from("chapter_revisions").insert({ chapter_id: chapterId, author_id: user.id, title: previous.title, content: previous.content });
    if (revisionError) return { ok: false, error: `Could not record revision: ${revisionError.message}` };
  }
  const { error: updateError } = await supabase.from("chapters").update({ title, content, paywall_type: paywallType, price_essence: priceEssence, status: "published", published_at: previous.published_at || new Date().toISOString() }).eq("id", chapterId).eq("author_id", user.id);
  if (updateError) return { ok: false, error: updateError.message };
  await supabase.from("drafts").delete().eq("chapter_id", chapterId).eq("author_id", user.id);
  revalidatePath(`/studio/${input.seriesId}`); revalidatePath(`/story/${series.slug}`); revalidatePath(`/story/${series.slug}/chapter/${chapterId}`);
  return { ok: true, chapterId, published: true };
}

export async function createSubscriptionTier(formData: FormData) {
  const supabase = await supabaseServer();
  if (!supabase) redirect("/signup?next=%2Fstudio%2Fsubscriptions");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fstudio%2Fsubscriptions");
  const name = String(formData.get("name") || "").trim().slice(0, 60);
  const description = String(formData.get("description") || "").trim().slice(0, 500);
  const price = Number(formData.get("priceMonthly"));
  const benefitsText = String(formData.get("benefits") || "");
  const benefits = benefitsText.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  if (name.length < 3 || !Number.isFinite(price) || price < 1 || price > 500) redirect("/studio/subscriptions?error=Check+the+tier+details");
  const { error } = await supabase.from("subscription_tiers").insert({ author_id: user.id, name, description, price_monthly: Math.round(price * 100) / 100, benefits, active: true });
  if (error) redirect(`/studio/subscriptions?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/studio/subscriptions");
  redirect("/studio/subscriptions?created=1");
}

export async function requestPayout(formData: FormData) {
  const supabase = await supabaseServer();
  if (!supabase) redirect("/login?next=%2Fstudio%2Fpayouts");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=%2Fstudio%2Fpayouts");
  const amount = Math.round(Number(formData.get("amountUsd")) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 20) redirect("/studio/payouts?error=Minimum+payout+request+is+%2420");
  const { error } = await supabase.rpc("request_author_payout", { p_amount_usd: amount });
  if (error) redirect(`/studio/payouts?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/studio/payouts");
  redirect("/studio/payouts?requested=1");
}

export async function toggleFollow(seriesId: string, slug: string) {
  const supabase = await supabaseServer();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: existing } = await supabase.from("follows").select("id").eq("user_id", user.id).eq("series_id", seriesId).maybeSingle();
  if (existing) await supabase.from("follows").delete().eq("id", existing.id).eq("user_id", user.id);
  else await supabase.from("follows").insert({ user_id: user.id, series_id: seriesId });
  revalidatePath(`/story/${slug}`);
  revalidatePath("/library");
}

export async function addComment(formData: FormData) {
  const supabase = await supabaseServer();
  if (!supabase) redirect("/login");
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const chapterId = String(formData.get("chapterId") || "");
  const slug = String(formData.get("slug") || "");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 2 || body.length > 2000) redirect(`/story/${slug}/chapter/${chapterId}?commentError=invalid`);
  const { error } = await supabase.from("comments").insert({ chapter_id: chapterId, user_id: user.id, body });
  if (error) redirect(`/story/${slug}/chapter/${chapterId}?commentError=${encodeURIComponent("Comment could not be posted")}`);
  revalidatePath(`/story/${slug}/chapter/${chapterId}`);
}

export async function signOutAction() {
  const supabase = await supabaseServer();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}

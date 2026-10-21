import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer(); if (!supabase) return NextResponse.json({ error: "Connect Supabase first." }, { status: 503 });
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({ error: "Sign in to give Resonance." }, { status: 401 });
  try { const body=await request.json() as {seriesId?:string;chapterId?:string}; if(!body.seriesId)return NextResponse.json({error:"Missing story."},{status:400});
    const {data,error}=await supabase.rpc("claim_resonance",{p_series_id:body.seriesId,p_chapter_id:body.chapterId||null});if(error)return NextResponse.json({error:error.message},{status:409});return NextResponse.json(data);
  } catch { return NextResponse.json({error:"Could not send Resonance."},{status:400}); }
}

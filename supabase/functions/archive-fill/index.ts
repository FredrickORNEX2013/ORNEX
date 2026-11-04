import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Archive.org sample videos with audio — public domain / creative commons
const ARCHIVE_VIDEOS = [
  { title: "Big Buck Bunny", url: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4", category: "Entertainment", orientation: "landscape", caption: "Big Buck Bunny — open source animated short film" },
  { title: "Sintel", url: "https://archive.org/download/Sintel/sintel_2048x1080.mp4", category: "Drama", orientation: "landscape", caption: "Sintel — an open movie by the Blender Foundation" },
  { title: "Elephant Dream", url: "https://archive.org/download/ElephantsDream/elephants_dream_480p.mp4", category: "Entertainment", orientation: "landscape", caption: "Elephant Dream — the first open movie by Blender" },
  { title: "Tears of Steel", url: "https://archive.org/download/TearsOfSteel/Tears_of_Steel_720p.mp4", category: "Drama", orientation: "landscape", caption: "Tears of Steel — sci-fi short film by Blender" },
  { title: "Cosmic Laundromat", url: "https://archive.org/download/CosmicLaundromat/cosmic_laundromat_1080p.mp4", category: "Comedy", orientation: "landscape", caption: "Cosmic Laundromat — Blender open movie" },
  { title: "Spring", url: "https://archive.org/download/SpringBlender/spring_1080p.mp4", category: "Entertainment", orientation: "landscape", caption: "Spring — Blender open movie short" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if videos table is empty
    const { count } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true })
      .eq("is_ad", false);

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: "Videos already populated", count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert archive.org videos as approved
    const rows = ARCHIVE_VIDEOS.map((v) => ({
      title: v.title,
      url: v.url,
      storage_path: `archive/${v.title.replace(/\s+/g, "-").toLowerCase()}`,
      caption: v.caption,
      category: v.category,
      orientation: v.orientation,
      user_id: null,
      likes: Math.floor(Math.random() * 8000) + 200,
      views: Math.floor(Math.random() * 200000) + 5000,
      status: "approved",
      nsfw_flagged: false,
      downloadable: true,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("videos")
      .insert(rows)
      .select();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Archive videos populated", count: inserted?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

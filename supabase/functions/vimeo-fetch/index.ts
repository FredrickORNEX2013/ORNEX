import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const vimeoToken = Deno.env.get("VIMEO_TOKEN");
    if (!vimeoToken) {
      return new Response(
        JSON.stringify({ error: "VIMEO_TOKEN secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Supabase env not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if videos table already has entries
    const { count } = await supabase
      .from("videos")
      .select("*", { count: "exact", head: true });

    if (count && count > 0) {
      return new Response(
        JSON.stringify({ message: "Videos already populated", count }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch videos from Vimeo
    const vimeoRes = await fetch(
      "https://api.vimeo.com/me/videos?per_page=50&fields=uri,name,description,link,embed,tags,pictures,created_time,width,height",
      {
        headers: {
          Authorization: `Bearer ${vimeoToken}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      }
    );

    if (!vimeoRes.ok) {
      const errText = await vimeoRes.text();
      return new Response(
        JSON.stringify({ error: `Vimeo API error: ${vimeoRes.status}`, details: errText }),
        { status: vimeoRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vimeoData = await vimeoRes.json();
    const videos = vimeoData.data || [];

    const CATEGORIES = ["For You", "Comedy", "Drama", "Live", "Entertainment"];

    const rows = videos.map((v: Record<string, unknown>) => {
      const uri = v.uri as string;
      const videoId = uri.split("/").pop();
      const width = v.width as number;
      const height = v.height as number;
      const orientation = height > width ? "portrait" : "landscape";

      // Assign a category by rotating through the list
      const idx = Math.floor(Math.random() * CATEGORIES.length);

      // Get a thumbnail
      const pictures = v.pictures as { sizes?: { link: string }[] } | undefined;
      const thumbnail = pictures?.sizes?.[pictures.sizes.length - 1]?.link || null;

      // Build a public URL — use Vimeo's player URL or embed link
      const link = v.link as string;
      const videoUrl = link || `https://vimeo.com/${videoId}`;

      return {
        title: (v.name as string) || "Untitled",
        url: videoUrl,
        storage_path: `vimeo/${videoId}`,
        caption: (v.description as string) || (v.name as string) || null,
        category: CATEGORIES[idx],
        orientation,
        user_id: null,
        likes: Math.floor(Math.random() * 5000) + 100,
        views: Math.floor(Math.random() * 100000) + 1000,
      };
    });

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
      JSON.stringify({ message: "Videos populated from Vimeo", count: inserted?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

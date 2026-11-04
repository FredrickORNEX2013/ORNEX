const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Vimeo-Token",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Try server-side secret first, then fall back to client-provided header
    const vimeoToken = Deno.env.get("VIMEO_TOKEN") || req.headers.get("X-Vimeo-Token");
    if (!vimeoToken) {
      return new Response(
        JSON.stringify({ error: "No Vimeo token provided" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vimeoRes = await fetch(
      "https://api.vimeo.com/me/videos?per_page=20&fields=uri,name,description,link,pictures,player_embed_url,width,height,created_time",
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
    const videos = (vimeoData.data || []).map((v: Record<string, unknown>) => {
      const uri = v.uri as string;
      const match = uri.match(/\/videos\/(\d+)/);
      const vimeoId = match ? parseInt(match[1], 10) : 0;
      const width = v.width as number;
      const height = v.height as number;

      const pictures = v.pictures as { sizes?: { width: number; height: number; link: string }[] } | undefined;
      const sizes = pictures?.sizes || [];
      const thumb = sizes.find((s) => s.width >= 640 && s.width <= 1280) || sizes[sizes.length - 1];

      return {
        id: `vimeo_${vimeoId}`,
        title: (v.name as string) || `Vimeo Video ${vimeoId}`,
        thumbnail_url: thumb?.link || "",
        embed_url: (v.player_embed_url as string) || `https://player.vimeo.com/video/${vimeoId}`,
        orientation: height > width ? "portrait" : "landscape",
        width,
        height,
      };
    });

    return new Response(
      JSON.stringify({ videos }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type VimeoPicture = { width?: number; link?: string };
type VimeoApiVideo = {
  uri?: string;
  name?: string;
  description?: string;
  width?: number;
  height?: number;
  created_time?: string;
  pictures?: { sizes?: VimeoPicture[] };
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const accessToken = Deno.env.get("VIMEO_ACCESS_TOKEN");
  if (!accessToken) return json({ error: "VIMEO_ACCESS_TOKEN secret not configured" }, 500);

  try {
    const vimeoResponse = await fetch(
      "https://api.vimeo.com/me/videos?per_page=100&fields=uri,name,description,pictures,width,height,created_time",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.vimeo.*+json;version=3.4",
        },
      },
    );

    if (!vimeoResponse.ok) {
      return json({ error: `Vimeo API error: ${vimeoResponse.status}` }, vimeoResponse.status);
    }

    const result = await vimeoResponse.json();
    const videos = ((result.data || []) as VimeoApiVideo[]).flatMap((video) => {
      const match = video.uri?.match(/\/videos\/(\d+)/);
      if (!match) return [];
      const width = video.width || 0;
      const height = video.height || 0;
      const pictures = video.pictures?.sizes || [];
      const thumbnail = [...pictures].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.link || null;
      const id = match[1];
      return [{
        id,
        title: video.name || `Vimeo Video ${id}`,
        url: `https://player.vimeo.com/video/${id}?autoplay=1&muted=1&loop=1`,
        thumbnail_url: thumbnail,
        orientation: height > width ? "portrait" : "landscape",
        width,
        height,
        created_at: video.created_time,
      }];
    });

    return json({ videos });
  } catch (error) {
    console.error("Vimeo request failed", error);
    return json({ error: "Unable to fetch Vimeo videos" }, 502);
  }
});

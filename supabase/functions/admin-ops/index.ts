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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "No authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Invalid session" }, 401);
    }

    // Check if user is an admin
    const { data: adminRow } = await serviceClient
      .from("admins")
      .select("*")
      .eq("email", user.email)
      .maybeSingle();

    if (!adminRow) {
      return json({ error: "Not an admin", isAdmin: false }, 403);
    }

    // Check if this admin is banned by another admin
    const { data: banRow } = await serviceClient
      .from("admin_bans")
      .select("banned_email")
      .eq("banned_email", user.email)
      .maybeSingle();

    if (banRow) {
      return json({ error: "This admin account has been permanently banned", isAdmin: false }, 403);
    }

    const role = adminRow.role as string;
    const body = await req.json();
    const action = body.action;

    switch (action) {
      case "whoami": {
        return json({ isAdmin: true, email: user.email, role });
      }

      case "stats": {
        const [videoStats, adStats, appStats, pendingCount, adminCount] = await Promise.all([
          serviceClient.from("videos").select("*", { count: "exact" }),
          serviceClient.from("ads").select("*", { count: "exact" }),
          serviceClient.from("app_stats").select("*"),
          serviceClient.from("videos").select("*", { count: "exact", head: true }).eq("status", "pending"),
          serviceClient.from("admins").select("*"),
        ]);

        const totalVideos = videoStats.count || 0;
        const totalAds = adStats.count || 0;
        const stats: Record<string, number> = {};
        (appStats.data || []).forEach((s: { stat_key: string; stat_value: number }) => {
          stats[s.stat_key] = Number(s.stat_value);
        });

        return json({
          totalVideos,
          totalAds,
          pendingApprovals: pendingCount.count || 0,
          totalAdmins: (adminCount.data || []).length,
          admins: adminCount.data || [],
          appStats: stats,
          adRevenue: stats.total_ad_revenue || 0,
          totalRevenue: stats.total_revenue || 0,
          totalPayouts: stats.total_payouts || 0,
        });
      }

      case "list-videos": {
        const status = body.status || "all";
        let query = serviceClient.from("videos").select("*").order("created_at", { ascending: false });
        if (status !== "all") {
          query = query.eq("status", status);
        }
        const { data, error } = await query;
        if (error) return json({ error: error.message }, 500);
        return json({ videos: data });
      }

      case "approve-video": {
        if (role === "mod") {
          return json({ error: "Moderators cannot approve videos" }, 403);
        }
        const { videoId } = body;
        const { error } = await serviceClient
          .from("videos")
          .update({ status: "approved" })
          .eq("id", videoId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "reject-video": {
        if (role === "mod") {
          return json({ error: "Moderators cannot reject videos" }, 403);
        }
        const { videoId } = body;
        const { error } = await serviceClient
          .from("videos")
          .update({ status: "rejected" })
          .eq("id", videoId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "ban-video": {
        const { videoId } = body;
        const { error } = await serviceClient
          .from("videos")
          .update({ status: "banned", nsfw_flagged: true })
          .eq("id", videoId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "delete-video": {
        if (role === "mod") {
          return json({ error: "Moderators cannot delete videos" }, 403);
        }
        const { videoId } = body;
        const { data: video } = await serviceClient
          .from("videos")
          .select("storage_path")
          .eq("id", videoId)
          .maybeSingle();

        if (video?.storage_path && !video.storage_path.startsWith("vimeo/") && !video.storage_path.startsWith("archive/")) {
          await serviceClient.storage.from("videos").remove([video.storage_path]);
        }
        const { error } = await serviceClient.from("videos").delete().eq("id", videoId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "list-ads": {
        const { data, error } = await serviceClient
          .from("ads")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) return json({ error: error.message }, 500);
        return json({ ads: data });
      }

      case "create-ad": {
        if (role === "mod") {
          return json({ error: "Moderators cannot create ads" }, 403);
        }
        const { brandName, videoUrl, learnMoreUrl, skipAfter, storagePath } = body;
        const { data, error } = await serviceClient.from("ads").insert({
          brand_name: brandName,
          video_url: videoUrl,
          learn_more_url: learnMoreUrl || null,
          skip_after_seconds: skipAfter || 5,
          storage_path: storagePath || null,
          active: true,
        }).select().single();
        if (error) return json({ error: error.message }, 500);
        return json({ ad: data });
      }

      case "toggle-ad": {
        const { adId } = body;
        const { data: ad } = await serviceClient.from("ads").select("active").eq("id", adId).maybeSingle();
        const { error } = await serviceClient.from("ads").update({ active: !ad?.active }).eq("id", adId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "delete-ad": {
        if (role === "mod") {
          return json({ error: "Moderators cannot delete ads" }, 403);
        }
        const { adId } = body;
        const { data: ad } = await serviceClient.from("ads").select("storage_path").eq("id", adId).maybeSingle();
        if (ad?.storage_path) {
          await serviceClient.storage.from("videos").remove([ad.storage_path]);
        }
        const { error } = await serviceClient.from("ads").delete().eq("id", adId);
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      case "list-admins": {
        const { data, error } = await serviceClient.from("admins").select("*").order("created_at", { ascending: true });
        if (error) return json({ error: error.message }, 500);
        // Also fetch ban info
        const { data: bans } = await serviceClient.from("admin_bans").select("*");
        return json({ admins: data || [], bans: bans || [] });
      }

      case "create-admin": {
        if (role !== "owner") {
          return json({ error: "Only owners can create admins" }, 403);
        }
        const { email, password, newRole } = body;
        const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (authError) return json({ error: authError.message }, 500);

        const { error: adminError } = await serviceClient.from("admins").insert({
          email,
          role: newRole || "mod",
        });
        if (adminError) return json({ error: adminError.message }, 500);
        return json({ success: true, userId: authData.user?.id });
      }

      case "remove-admin": {
        if (role !== "owner") {
          return json({ error: "Only owners can remove admins" }, 403);
        }
        const { email } = body;
        await serviceClient.from("admins").delete().eq("email", email);
        await serviceClient.from("admin_bans").delete().eq("banned_email", email);
        const { data: users } = await serviceClient.auth.admin.listUsers();
        const targetUser = (users.users || []).find((u: { email?: string }) => u.email === email);
        if (targetUser) {
          await serviceClient.auth.admin.deleteUser(targetUser.id);
        }
        return json({ success: true });
      }

      // Admin-to-admin permanent ban
      case "ban-admin": {
        const { email, reason } = body;
        if (email === user.email) {
          return json({ error: "Cannot ban yourself" }, 400);
        }
        // Insert ban record
        const { error: banError } = await serviceClient.from("admin_bans").insert({
          banned_email: email,
          banned_by: user.email!,
          reason: reason || "Banned by admin",
        });
        if (banError) return json({ error: banError.message }, 500);
        return json({ success: true });
      }

      case "unban-admin": {
        if (role !== "owner") {
          return json({ error: "Only owners can unban" }, 403);
        }
        const { email } = body;
        await serviceClient.from("admin_bans").delete().eq("banned_email", email);
        return json({ success: true });
      }

      // App settings CRUD
      case "get-app-settings": {
        const { data, error } = await serviceClient.from("app_settings").select("*");
        if (error) return json({ error: error.message }, 500);
        const settings: Record<string, unknown> = {};
        (data || []).forEach((s: { key: string; value: unknown }) => {
          settings[s.key] = s.value;
        });
        return json({ settings });
      }

      case "update-app-setting": {
        const { key, value } = body;
        if (!key) return json({ error: "Key required" }, 400);
        const { error } = await serviceClient.from("app_settings").upsert({
          key,
          value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      // YouTube API: fetch channels using API key
      case "fetch-youtube-channels": {
        const { apiKey, channelIds } = body;
        if (!apiKey) return json({ error: "API key required" }, 400);
        const ids = Array.isArray(channelIds) ? channelIds.join(",") : channelIds;
        const ytUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids}&key=${apiKey}`;
        const ytRes = await fetch(ytUrl);
        const ytData = await ytRes.json();
        if (!ytRes.ok) {
          return json({ error: ytData.error?.message || "YouTube API error" }, 500);
        }
        const channels = (ytData.items || []).map((ch: Record<string, unknown>) => ({
          id: ch.id,
          title: (ch as { snippet?: { title?: string } }).snippet?.title,
          description: (ch as { snippet?: { description?: string } }).snippet?.description,
          thumbnail: (ch as { snippet?: { thumbnails?: { default?: { url?: string } } } }).snippet?.thumbnails?.default?.url,
          subscriberCount: (ch as { statistics?: { subscriberCount?: string } }).statistics?.subscriberCount,
          videoCount: (ch as { statistics?: { videoCount?: string } }).statistics?.videoCount,
          viewCount: (ch as { statistics?: { viewCount?: string } }).statistics?.viewCount,
        }));
        return json({ channels });
      }

      case "analytics": {
        const [impressions, clicks, skips, adData] = await Promise.all([
          serviceClient.from("ad_analytics").select("*", { count: "exact", head: true }).eq("event_type", "impression"),
          serviceClient.from("ad_analytics").select("*", { count: "exact", head: true }).eq("event_type", "click"),
          serviceClient.from("ad_analytics").select("*", { count: "exact", head: true }).eq("event_type", "skip"),
          serviceClient.from("ads").select("*"),
        ]);

        const adsWithStats = (adData.data || []).map((ad: Record<string, unknown>) => ({
          ...ad,
          impressions: Number(ad.impressions) || 0,
          clicks: Number(ad.clicks) || 0,
          ctr: Number(ad.impressions) > 0 ? ((Number(ad.clicks) / Number(ad.impressions)) * 100).toFixed(2) : "0",
        }));

        return json({
          totalImpressions: impressions.count || 0,
          totalClicks: clicks.count || 0,
          totalSkips: skips.count || 0,
          ctr: (impressions.count || 0) > 0 ? (((clicks.count || 0) / (impressions.count || 0)) * 100).toFixed(2) : "0",
          ads: adsWithStats,
        });
      }

      case "update-revenue": {
        if (role !== "owner" && role !== "full") {
          return json({ error: "Insufficient permissions" }, 403);
        }
        const { key, value } = body;
        const { error } = await serviceClient.from("app_stats").upsert({
          stat_key: key,
          stat_value: value,
          updated_at: new Date().toISOString(),
        }, { onConflict: "stat_key" });
        if (error) return json({ error: error.message }, 500);
        return json({ success: true });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

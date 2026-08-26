import type { RequestHandler } from "express";
import { createClient } from "@supabase/supabase-js";

function getUserClient(req: { headers: { authorization?: string } }) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon || !token) return null;
  return { token, supabase: createClient(url, anon) };
}

export const handleNotifyJob: RequestHandler = async (req, res) => {
  try {
    const ctx = getUserClient(req);
    if (!ctx) {
      res.status(401).json({ error: "Sign in to notify vendors." });
      return;
    }
    const { data: userData, error: userError } = await ctx.supabase.auth.getUser(ctx.token);
    if (userError || !userData.user) {
      res.status(401).json({ error: "Sign in to notify vendors." });
      return;
    }

    const projectId = String(req.body?.projectId ?? "");
    if (!projectId) {
      res.status(400).json({ error: "Missing project." });
      return;
    }

    const authed = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
      process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
      { global: { headers: { Authorization: `Bearer ${ctx.token}` } } }
    );

    const { data: project, error: projectError } = await authed
      .from("projects")
      .select("id, title, category, location, owner_id")
      .eq("id", projectId)
      .single();
    if (projectError || !project || project.owner_id !== userData.user.id) {
      res.status(404).json({ error: "Project not found." });
      return;
    }

    const { data: vendors } = await authed
      .from("vendor_profiles")
      .select("user_id, specialties, service_area, business_name");

    const category = (project.category ?? "").toLowerCase();
    const location = (project.location ?? "").toLowerCase();
    const matched = (vendors ?? []).filter((v) => {
      const specialties = (v.specialties ?? []).map((s: string) => s.toLowerCase());
      const area = (v.service_area ?? "").toLowerCase();
      const specialtyOk =
        !category || specialties.length === 0 || specialties.includes(category);
      const areaOk =
        !location ||
        !area ||
        area.includes(location) ||
        location.includes(area.split(/[·,]/)[0]?.trim() ?? "");
      return specialtyOk && areaOk;
    });

    const emails: string[] = [];
    if (matched.length) {
      const { data: profiles } = await authed
        .from("profiles")
        .select("id, email")
        .in("id", matched.map((v) => v.user_id));
      for (const p of profiles ?? []) {
        if (p.email) emails.push(p.email);
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFY_FROM_EMAIL || "Bosun <alerts@bosun.app>";
    let emailed = 0;
    if (resendKey && emails.length) {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: emails,
          subject: `New Bosun job: ${project.title}`,
          text: [
            `A boat owner posted "${project.title}".`,
            project.category ? `Category: ${project.category}` : "",
            project.location ? `Location: ${project.location}` : "",
            "",
            "Open Bosun to bid: https://bosunapp.vercel.app/vendor-dashboard",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      if (resp.ok) emailed = emails.length;
    }

    res.json({ matched: matched.length, emailed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Notify failed.";
    res.status(500).json({ error: message });
  }
};

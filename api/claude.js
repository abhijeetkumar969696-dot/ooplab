// RoopLab AI endpoint for Vercel. Keeps your Anthropic API key secret on the server.
// Environment variables (Vercel → Project → Settings → Environment Variables):
//   ANTHROPIC_API_KEY  (required)  your key from console.anthropic.com
//   ACCESS_CODE        (optional)  if set, the whole website opens only with ?code=YOURCODE (or after typing the code)
//   MODEL_QUICK        (optional)  default "claude-haiku-5-5"  (interview replies)
//   MODEL_DEFAULT      (optional)  default "claude-sonnet-5-5" (full analysis)
module.exports = async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  const code = process.env.ACCESS_CODE;
  if (req.method === "GET") return res.status(200).json({ ok: !!key, needsCode: !!code, codeOk: !code || req.headers["x-access-code"] === code });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!key) return res.status(500).json({ code: "unauthorized", error: "Server has no API key" });
  if (code && req.headers["x-access-code"] !== code) return res.status(401).json({ code: "unauthorized", error: "Wrong or missing access code" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const tier = body.tier === "quick" ? "quick" : "default";
  const model = tier === "quick" ? (process.env.MODEL_QUICK || "claude-haiku-5-5") : (process.env.MODEL_DEFAULT || "claude-sonnet-5-5");

  // Merge consecutive turns of the same role; the API needs alternating user/assistant turns.
  const msgs = [];
  for (const m of Array.isArray(body.messages) ? body.messages : []) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = String(m.content || "").slice(0, 60000);
    if (!text) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content[0].text += "\n\n" + text;
    else msgs.push({ role, content: [{ type: "text", text }] });
  }
  if (!msgs.length || msgs[0].role !== "user") return res.status(400).json({ code: "invalid_request", error: "No user message" });

  // Attach up to 2 images (data URLs) to the last user turn.
  const last = msgs[msgs.length - 1];
  if (last.role === "user" && Array.isArray(body.images)) {
    for (const d of body.images.slice(0, 2)) {
      const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,(.+)$/.exec(d || "");
      if (m) last.content.unshift({ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } });
    }
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: tier === "quick" ? 1200 : 8000, messages: msgs })
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status === 429 ? 429 : 502).json({ code: r.status === 429 ? "rate_limited" : "upstream_error", error: (j.error && j.error.message) || "API error" });
    const text = (j.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ code: "upstream_error", error: String(e) });
  }
};

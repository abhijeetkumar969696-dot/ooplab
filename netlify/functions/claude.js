// RoopLab AI endpoint for Netlify. Keeps your Anthropic API key secret on the server.
// Environment variables (Netlify → Site configuration → Environment variables):
//   ANTHROPIC_API_KEY  (required)  your key from console.anthropic.com
//   ACCESS_CODE        (optional)  if set, the whole website opens only with ?code=YOURCODE
exports.handler = async (event) => {
  const json = (status, obj) => ({ statusCode: status, headers: { "content-type": "application/json" }, body: JSON.stringify(obj) });
  const key = process.env.ANTHROPIC_API_KEY;
  const code = process.env.ACCESS_CODE;
  const sent = (event.headers && (event.headers["x-access-code"] || event.headers["X-Access-Code"])) || "";
  if (event.httpMethod === "GET") return json(200, { ok: !!key, needsCode: !!code, codeOk: !code || sent === code });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  if (!key) return json(500, { code: "unauthorized", error: "Server has no API key" });
  if (code && sent !== code) return json(401, { code: "unauthorized", error: "Wrong or missing access code" });
  let body = {};
  try { body = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString() : (event.body || "{}")); } catch (e) {}
  const tier = body.tier === "quick" ? "quick" : "default";
  const model = tier === "quick" ? (process.env.MODEL_QUICK || "claude-haiku-5-5") : (process.env.MODEL_DEFAULT || "claude-sonnet-5-5");
  const msgs = [];
  for (const m of Array.isArray(body.messages) ? body.messages : []) {
    const role = m.role === "assistant" ? "assistant" : "user";
    const text = String(m.content || "").slice(0, 60000);
    if (!text) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === role) last.content[0].text += "\n\n" + text;
    else msgs.push({ role, content: [{ type: "text", text }] });
  }
  if (!msgs.length || msgs[0].role !== "user") return json(400, { code: "invalid_request", error: "No user message" });
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
    if (!r.ok) return json(r.status === 429 ? 429 : 502, { code: r.status === 429 ? "rate_limited" : "upstream_error", error: (j.error && j.error.message) || "API error" });
    return json(200, { text: (j.content || []).filter(b => b.type === "text").map(b => b.text).join("") });
  } catch (e) { return json(502, { code: "upstream_error", error: String(e) }); }
};

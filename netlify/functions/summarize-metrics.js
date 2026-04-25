/**
 * Netlify Serverless Function: summarize-metrics
 * Route: POST /.netlify/functions/summarize-metrics
 *
 * Receives: { tasks: [...], leads: [...], proofs: [...] }
 * Returns:  { tasks: "...", leads: "...", receipts: "..." }
 *
 * Env var required: DEEPSEEK_API_KEY
 * Set it at: Netlify Dashboard → Site Settings → Environment Variables
 */

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const MODEL        = "deepseek-chat"; // swap to "deepseek-reasoner" for deeper analysis

exports.handler = async (event) => {
  // ── CORS preflight ─────────────────────────────────────────
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders() };
  }

  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  // ── Parse incoming data ─────────────────────────────────────
  let tasks = [], leads = [], proofs = [];
  try {
    const body = JSON.parse(event.body || "{}");
    tasks  = Array.isArray(body.tasks)  ? body.tasks  : [];
    leads  = Array.isArray(body.leads)  ? body.leads  : [];
    proofs = Array.isArray(body.proofs) ? body.proofs : [];
  } catch {
    return respond(400, { error: "Invalid JSON body" });
  }

  // ── Build snapshot for DeepSeek ─────────────────────────────
  const snapshot = buildSnapshot(tasks, leads, proofs);

  // ── Call DeepSeek ───────────────────────────────────────────
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return respond(500, { error: "DEEPSEEK_API_KEY not set in environment" });
  }

  try {
    const dsRes = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a terse operational assistant for Penn Enterprises LLC, an AI automation agency. " +
              "You receive a snapshot of open tasks, active leads, and proof receipts. " +
              "Respond ONLY with a JSON object containing exactly three keys: tasks, leads, receipts. " +
              "Each value must be a single plain-English insight under 15 words. No markdown. No extra keys.",
          },
          {
            role: "user",
            content: `Here is today's snapshot:\n\n${snapshot}\n\nReturn the JSON summary now.`,
          },
        ],
      }),
    });

    if (!dsRes.ok) {
      const err = await dsRes.text();
      console.error("DeepSeek error:", dsRes.status, err);
      return respond(502, { error: "DeepSeek API error", detail: err });
    }

    const dsData = await dsRes.json();
    const raw    = dsData.choices?.[0]?.message?.content || "{}";

    let summary;
    try {
      summary = JSON.parse(raw);
    } catch {
      return respond(502, { error: "DeepSeek returned unparseable JSON", raw });
    }

    // Guarantee all three keys exist
    summary.tasks    = summary.tasks    || `${tasks.length} tasks in queue`;
    summary.leads    = summary.leads    || `${leads.length} active leads`;
    summary.receipts = summary.receipts || `${proofs.length} proof receipts logged`;

    return respond(200, summary);

  } catch (err) {
    console.error("Function error:", err);
    return respond(500, { error: "Internal error", message: err.message });
  }
};

/* ── Helpers ─────────────────────────────────────────────── */

function buildSnapshot(tasks, leads, proofs) {
  const lines = [];

  // Tasks
  const openTasks    = tasks.filter(t => !t.done && !t.completed);
  const blockedTasks = tasks.filter(t => t.blocked || t.status === "blocked");
  lines.push(`TASKS: ${tasks.length} total, ${openTasks.length} open, ${blockedTasks.length} blocked`);
  openTasks.slice(0, 5).forEach(t => {
    const label = t.text || t.title || t.name || "(unnamed)";
    lines.push(`  - ${label}${t.dueDate ? ` (due ${t.dueDate})` : ""}`);
  });

  // Leads
  const stageMap = {};
  leads.forEach(l => {
    const stage = l.stage || l.status || "unknown";
    stageMap[stage] = (stageMap[stage] || 0) + 1;
  });
  const stageStr = Object.entries(stageMap).map(([s, n]) => `${n} ${s}`).join(", ") || "none";
  lines.push(`LEADS: ${leads.length} total — ${stageStr}`);
  leads.slice(0, 5).forEach(l => {
    const name = l.name || l.company || l.email || "(unknown)";
    lines.push(`  - ${name} [${l.stage || "?"}]`);
  });

  // Proofs / Receipts
  lines.push(`RECEIPTS: ${proofs.length} proof receipts logged`);
  proofs.slice(0, 3).forEach(p => {
    const label = p.text || p.title || p.description || "(no description)";
    lines.push(`  - ${label}`);
  });

  return lines.join("\n");
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function respond(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
    body: JSON.stringify(body),
  };
}

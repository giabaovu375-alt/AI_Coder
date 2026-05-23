import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SPACE_URL = "https://toilatop1sever-ai-coder.hf.space/chat";
const MAX_PROMPT_LENGTH = 4000;
const TIMEOUT_MS = 120000; // 2 phút chờ HF Space warm up

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Safe parse request body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = typeof body.prompt === "string" ? body.prompt : "";
    const history = Array.isArray(body.history) ? body.history : [];
    const system_prompt = typeof body.system_prompt === "string" ? body.system_prompt : undefined;

    if (!prompt || prompt.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Prompt is empty" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return new Response(JSON.stringify({ error: `Prompt too long (max ${MAX_PROMPT_LENGTH} chars)` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validHistory = history.filter(
      (msg: unknown) =>
        typeof msg === "object" &&
        msg !== null &&
        "role" in msg &&
        "content" in msg &&
        ((msg as Record<string, unknown>).role === "user" ||
          (msg as Record<string, unknown>).role === "assistant") &&
        typeof (msg as Record<string, unknown>).content === "string"
    );

    const hfToken = Deno.env.get("HF_TOKEN");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(SPACE_URL, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(hfToken ? { Authorization: `Bearer ${hfToken}` } : {}),
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          history: validHistory,
          system_prompt: system_prompt || "You are a helpful coding assistant. Answer clearly and provide code examples when needed.",
        }),
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        return new Response(JSON.stringify({ error: "HF Space đang khởi động, thử lại sau 30s" }), {
          status: 504,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw fetchError;
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      return new Response(
        JSON.stringify({ error: `AI Error: ${response.status}`, detail: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Safe parse response JSON
    const rawText = await response.text();
    let data: { response?: unknown };
    try {
      data = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ error: "HF Space trả về response không hợp lệ, thử lại sau." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResponse = typeof data.response === "string" ? data.response : "";

    const updatedHistory = [
      ...validHistory,
      { role: "user", content: prompt.trim() },
      { role: "assistant", content: aiResponse },
    ];

    return new Response(
      JSON.stringify({
        response: aiResponse,
        history: updatedHistory,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

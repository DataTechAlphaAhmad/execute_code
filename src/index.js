// ✅ NO IMPORTS NEEDED - Use native fetch in Node.js 18+

export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started...");

  // Parse request body
  let body = {};
  
  try {
    if (req.payload) {
      log("📦 Using req.payload");
      body = JSON.parse(req.payload);
    } else if (req.body) {
      log("📦 Using req.body");
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
      log("⚠️ No payload received");
      return res.json({
        ok: false,
        error: "No request body provided"
      });
    }
  } catch (e) {
    error("❌ JSON parsing error:", e.message);
    return res.json({
      ok: false,
      error: "Bad JSON body: " + e.message
    });
  }

  log("📦 Parsed body:", body);

  const { code, language, stdin } = body;

  log("💻 Language:", language);
  log("📝 Code length:", code ? code.length : 0);
  log("📥 Input length:", stdin ? stdin.length : 0);

  if (!code || !language) {
    error("❌ Missing required fields (code or language)");
    return res.json({
      ok: false,
      error: "Missing required fields: code and language are required"
    });
  }

  const apiKey = process.env.ONECOMPILER_API_KEY;

  if (!apiKey) {
    error("❌ OneCompiler API key missing in environment variables!");
    return res.json({
      ok: false,
      error: "OneCompiler API key not configured"
    });
  }

  log("🔑 API Key present:", !!apiKey);

  const fileName = language === 'python' ? 'main.py' : 
                   language === 'cpp' ? 'main.cpp' : 'Main.java';

  log("📄 File name:", fileName);
  log("🌐 Sending POST request to OneCompiler API...");

  let response;

  try {
    // ✅ Native fetch - No import needed
    response = await fetch("https://onecompiler.com/api/code/exec", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        language: language,
        stdin: stdin || "",
        files: [
          {
            name: fileName,
            content: code
          }
        ]
      })
    });
  } catch (err) {
    error("❌ OneCompiler fetch error:", err.message);
    return res.json({
      ok: false,
      error: "Failed to connect to OneCompiler: " + err.message
    });
  }

  log("📥 OneCompiler responded with HTTP status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    error("❌ OneCompiler API error:", errorText);
    return res.json({
      ok: false,
      error: `OneCompiler API error (${response.status}): ${errorText}`
    });
  }

  let json;

  try {
    json = await response.json();
    log("🟢 OneCompiler response:", json);
  } catch (err) {
    const txt = await response.text();
    error("❌ OneCompiler JSON parse error:", txt);
    return res.json({
      ok: false,
      error: "Invalid OneCompiler response: " + txt
    });
  }

  const executionResult = json.post?.properties?.result || {};

  log("✅ Execution completed successfully");
  log("📤 Stdout:", executionResult.stdout);
  log("📤 Stderr:", executionResult.stderr);
  log("📤 Exception:", executionResult.exception);
  log("📤 Execution Time:", executionResult.executionTime);

  return res.json({
    ok: true,
    result: {
      stdout: executionResult.stdout || "",
      stderr: executionResult.stderr || "",
      exception: executionResult.exception || null,
      executionTime: executionResult.executionTime || 0
    }
  });
};

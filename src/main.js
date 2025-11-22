import fetch from "node-fetch";

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
      body = JSON.parse(req.body);
    } else {
      log("⚠️ No payload received");
      return res.send(JSON.stringify({
        ok: false,
        error: "No request body provided"
      }));
    }
  } catch (e) {
    error("❌ JSON parsing error:", e.message);
    return res.send(JSON.stringify({
      ok: false,
      error: "Bad JSON body: " + e.message
    }));
  }

  log("📦 Parsed body:", body);

  // Extract code execution parameters
  const { code, language, stdin } = body;

  log("💻 Language:", language);
  log("📝 Code length:", code ? code.length : 0);
  log("📥 Input length:", stdin ? stdin.length : 0);

  // Validate inputs
  if (!code || !language) {
    error("❌ Missing required fields (code or language)");
    return res.send(JSON.stringify({
      ok: false,
      error: "Missing required fields: code and language are required"
    }));
  }

  // Get OneCompiler API Key from environment
  const apiKey = process.env.ONECOMPILER_API_KEY;

  if (!apiKey) {
    error("❌ OneCompiler API key missing in environment variables!");
    return res.send(JSON.stringify({
      ok: false,
      error: "OneCompiler API key not configured"
    }));
  }

  log("🔑 API Key present:", !!apiKey);

  // Determine file name based on language
  const fileName = language === 'python' ? 'main.py' : 
                   language === 'cpp' ? 'main.cpp' : 'Main.java';

  log("📄 File name:", fileName);

  // Call OneCompiler API
  log("🌐 Sending POST request to OneCompiler API...");

  let response;

  try {
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
    return res.send(JSON.stringify({
      ok: false,
      error: "Failed to connect to OneCompiler: " + err.message
    }));
  }

  log("📥 OneCompiler responded with HTTP status:", response.status);

  // Check if response is OK
  if (!response.ok) {
    const errorText = await response.text();
    error("❌ OneCompiler API error:", errorText);
    return res.send(JSON.stringify({
      ok: false,
      error: `OneCompiler API error (${response.status}): ${errorText}`
    }));
  }

  // Parse OneCompiler response
  let json;

  try {
    json = await response.json();
    log("🟢 OneCompiler response:", json);
  } catch (err) {
    const txt = await response.text();
    error("❌ OneCompiler JSON parse error:", txt);
    return res.send(JSON.stringify({
      ok: false,
      error: "Invalid OneCompiler response: " + txt
    }));
  }

  // Extract execution result
  // OneCompiler response structure: { status: 200, post: { properties: { result: {...} } } }
  const executionResult = json.post?.properties?.result || {};

  log("✅ Execution completed successfully");
  log("📤 Stdout:", executionResult.stdout);
  log("📤 Stderr:", executionResult.stderr);
  log("📤 Exception:", executionResult.exception);
  log("📤 Execution Time:", executionResult.executionTime);

  // Return success response
  return res.send(JSON.stringify({
    ok: true,
    result: {
      stdout: executionResult.stdout || null,
      stderr: executionResult.stderr || null,
      exception: executionResult.exception || null,
      executionTime: executionResult.executionTime || 0
    }
  }));
};

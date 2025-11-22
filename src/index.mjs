export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started...");

  let body = {};
  
  try {
    if (req.payload) {
      body = JSON.parse(req.payload);
    } else if (req.body) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } else {
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

  const { code, language, stdin } = body;

  if (!code || !language) {
    return res.json({
      ok: false,
      error: "Missing required fields: code and language"
    });
  }

  const apiKey = process.env.ONECOMPILER_API_KEY;

  if (!apiKey) {
    return res.json({
      ok: false,
      error: "OneCompiler API key not configured"
    });
  }

  const fileName = language === 'python' ? 'main.py' : 
                   language === 'cpp' ? 'main.cpp' : 'Main.java';

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
        files: [{ name: fileName, content: code }]
      })
    });
  } catch (err) {
    return res.json({
      ok: false,
      error: "Failed to connect to OneCompiler: " + err.message
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    return res.json({
      ok: false,
      error: `OneCompiler API error (${response.status}): ${errorText}`
    });
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    return res.json({
      ok: false,
      error: "Invalid OneCompiler response"
    });
  }

  const executionResult = json.post?.properties?.result || {};

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

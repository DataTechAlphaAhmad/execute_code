export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started");

  let body = {};

  try {
    if (req.body) {
      // Handle both object and string body types safely
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Handle the nested body structure we created in the frontend
      if (typeof body.body === 'string') {
        body = JSON.parse(body.body);
      }
    } else {
      log("⚠️ req.body is empty");
    }
  } catch (err) {
    log("❌ Failed parsing req.body:", err.message);
    return res.json({ ok: false, error: "Invalid JSON body" });
  }

  log("📦 FINAL Parsed Body Keys:", Object.keys(body));

  const { code, language, stdin } = body;

  if (!code || !language) {
    log("❌ Missing code or language IN PARSED BODY");
    return res.json({
      ok: false,
      error: "Missing required fields: code and language are required",
    });
  }

  const apiKey = process.env.ONECOMPILER_API_KEY;

  // Language mapping (Safety fallback)
  const langMap = {
    "c_cpp": "cpp",
    "python3": "python",
    "java": "java"
  };
  
  // Use the mapped name for file extension, but keep original for API if needed
  const simpleLang = langMap[language] || language;
  
  const fileName =
    simpleLang === "python" ? "main.py" :
    simpleLang === "cpp" ? "main.cpp" :
    "Main.java";

  log(`🌐 Calling OneCompiler API for ${language}...`);

  let response;
  try {
    response = await fetch("https://onecompiler.com/api/code/exec", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: language, // Pass the language code (e.g., 'c_cpp')
        stdin: stdin || "",
        files: [{ name: fileName, content: code }],
      }),
    });
  } catch (e) {
    error("❌ OneCompiler request failed:", e.message);
    return res.json({ ok: false, error: "OneCompiler request failed" });
  }

  const json = await response.json();
  
  // 🔍 CRITICAL LOGGING: See exactly what OneCompiler returned
  log("📥 OneCompiler Raw Response:", JSON.stringify(json));

  // ✅ FIX: smarter parsing logic
  // API usually returns data at root, but sometimes in .result
  // We check multiple places to be safe.
  const stdout = json.stdout || json.result?.stdout || json.post?.properties?.result?.stdout || "";
  const stderr = json.stderr || json.result?.stderr || json.exception || json.post?.properties?.result?.stderr || "";
  const executionTime = json.executionTime || json.result?.executionTime || 0;

  log(`✅ Extracted Output: ${stdout.substring(0, 50)}...`);

  return res.json({
    ok: true,
    result: {
      stdout: stdout,
      stderr: stderr,
      exception: json.exception || null,
      executionTime: executionTime,
    },
  });
};

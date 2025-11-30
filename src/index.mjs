export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started (RapidAPI Version)");

  let body = {};

  // 1. ROBUST BODY PARSING
  try {
    if (req.body) {
      // Handle both object and string body types safely
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // Handle the nested body structure passed from frontend wrapper
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

  const { code, language, stdin } = body;

  if (!code || !language) {
    log("❌ Missing code or language IN PARSED BODY");
    return res.json({
      ok: false,
      error: "Missing required fields: code and language are required",
    });
  }

  const apiKey = process.env.ONECOMPILER_API_KEY;

  if (!apiKey) {
    return res.json({ ok: false, error: "Server Error: API Key missing in environment variables" });
  }

  // 2. LANGUAGE MAPPING
  // RapidAPI OneCompiler often uses simple names (python, java, cpp)
  // We map the incoming codes to ensure compatibility.
  const langMap = {
    "c_cpp": "cpp",
    "python3": "python",
    "java": "java",
    "cpp": "cpp",
    "python": "python"
  };
  
  const targetLang = langMap[language] || language;
  
  const fileName =
    targetLang === "python" ? "main.py" :
    targetLang === "cpp" ? "main.cpp" :
    "Main.java";

  log(`🌐 Calling RapidAPI OneCompiler for ${targetLang}...`);

  // 3. RAPID API REQUEST
  let response;
  try {
    response = await fetch("https://onecompiler-apis.p.rapidapi.com/api/v1/run", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "onecompiler-apis.p.rapidapi.com"
      },
      body: JSON.stringify({
        language: targetLang,
        stdin: stdin || "",
        files: [
          {
            name: fileName,
            content: code
          }
        ]
      }),
    });
  } catch (e) {
    error("❌ RapidAPI Network request failed:", e.message);
    return res.json({ ok: false, error: "Network request failed" });
  }

  // 4. ROBUST RESPONSE HANDLING
  const status = response.status;
  log(`📥 HTTP Status: ${status}`);

  // Read raw text first to avoid JSON parse errors on empty/error responses
  const rawText = await response.text();
  
  // Log the start of the response to debug
  log(`📄 Raw Response Body: ${rawText.substring(0, 500)}`);

  if (!response.ok) {
    // If status is 401/403, it's usually an API key issue
    return res.json({ 
      ok: false, 
      error: `RapidAPI Error ${status}: ${rawText}` 
    });
  }

  let json = {};
  try {
    json = JSON.parse(rawText);
  } catch (e) {
    error("❌ Failed to parse JSON response");
    return res.json({ ok: false, error: "Invalid JSON response from Compiler API" });
  }

  // 5. DATA EXTRACTION
  // RapidAPI structure usually puts stdout at the root level
  const stdout = json.stdout || json.result?.stdout || "";
  const stderr = json.stderr || json.result?.stderr || json.exception || "";
  const executionTime = json.executionTime || json.result?.executionTime || 0;

  log(`✅ Success! Output Length: ${stdout.length}`);

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

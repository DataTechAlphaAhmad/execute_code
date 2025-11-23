export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started");

  let body = {};

  try {
    if (req.body) {
      log("🔍 RAW req.body:", req.body);
      body = JSON.parse(req.body);
    } else {
      log("⚠️ req.body is empty");
    }
  } catch (err) {
    log("❌ Failed to parse req.body:", err.message);
  }

  log("📦 FINAL Parsed Body:", JSON.stringify(body));

  const { code, language, stdin } = body;

  if (!code || !language) {
    log("❌ Missing code or language IN PARSED BODY");
    return res.json({
      ok: false,
      error: "Missing required fields: code and language are required",
    });
  }

  log("💻 Language:", language);
  log("📝 Code length:", code.length);
  log("📥 Input:", stdin || "(empty)");

  const apiKey = process.env.ONECOMPILER_API_KEY;

  if (!apiKey) {
    error("❌ OneCompiler API key not configured");
    return res.json({
      ok: false,
      error: "OneCompiler API key not configured",
    });
  }

  const fileName =
    language === "python"
      ? "main.py"
      : language === "cpp"
      ? "main.cpp"
      : "Main.java";

  log("📄 File name:", fileName);
  log("🌐 Calling OneCompiler API...");

  let response;

  try {
    response = await fetch("https://onecompiler.com/api/code/exec", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        language: language,
        stdin: stdin || "",
        files: [{ name: fileName, content: code }],
      }),
    });
  } catch (err) {
    error("❌ OneCompiler fetch error:", err.message);
    return res.json({
      ok: false,
      error: "Failed to connect to OneCompiler: " + err.message,
    });
  }

  log("📥 OneCompiler response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    error("❌ OneCompiler API error:", errorText);
    return res.json({
      ok: false,
      error: `OneCompiler API error (${response.status}): ${errorText}`,
    });
  }

  let json;
  try {
    json = await response.json();
    log("📘 OneCompiler response JSON:", JSON.stringify(json));
  } catch (err) {
    error("❌ Failed to parse OneCompiler response");
    return res.json({
      ok: false,
      error: "Invalid OneCompiler response",
    });
  }

  const executionResult = json.post?.properties?.result || {};

  log("📤 Stdout:", executionResult.stdout || "(empty)");
  log("📤 Stderr:", executionResult.stderr || "(empty)");

  return res.json({
    ok: true,
    result: {
      stdout: executionResult.stdout || "",
      stderr: executionResult.stderr || "",
      exception: executionResult.exception || null,
      executionTime: executionResult.executionTime || 0,
    },
  });
};


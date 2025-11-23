export default async ({ req, res, log, error }) => {
  log("🚀 Code Execution Function started");

  let body = {};

  try {
    if (req.body) {
      log("📌 RAW req.body:", req.body);
      body = JSON.parse(req.body);
    } else {
      log("⚠️ req.body is empty");
    }
  } catch (err) {
    log("❌ Failed parsing req.body:", err.message);
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

  const apiKey = process.env.ONECOMPILER_API_KEY;

  const fileName =
    language === "python" ? "main.py" :
    language === "cpp" ? "main.cpp" :
    "Main.java";

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
        language,
        stdin: stdin || "",
        files: [{ name: fileName, content: code }],
      }),
    });
  } catch (e) {
    return res.json({ ok: false, error: "OneCompiler request failed" });
  }

  const json = await response.json();
  const executionResult = json.post?.properties?.result || {};

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

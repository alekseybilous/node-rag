const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

function getModelsFromEnv() {
  const modelsEnv = process.env.OLLAMA_MODELS;

  if (modelsEnv) {
    return modelsEnv
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
  }

  const models = [];
  if (process.env.EMBEDDING_MODEL) models.push(process.env.EMBEDDING_MODEL);
  if (process.env.LLM_MODEL) models.push(process.env.LLM_MODEL);

  return models.length > 0
    ? [...new Set(models)]
    : ["nomic-embed-text", "mistral"];
}

const MODELS = getModelsFromEnv();

async function pullModel(model) {
  console.log(`\n📥 Pulling ${model}... (this may take a few minutes)`);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split("\n").filter(Boolean);

      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.status) {
            process.stdout.write(
              `\r   ${json.status}                              `,
            );
          }
        } catch {}
      }
    }

    console.log(`\n✅ Model ${model} is ready!`);
  } catch (error) {
    console.error(`\n✗ Error pulling model ${model}:`, error.message);
    process.exit(1);
  }
}

async function setupOllama() {
  console.log("🚀 Setting up Ollama models...");
  console.log(`   URL: ${OLLAMA_URL}`);
  console.log(`   Models: ${MODELS.join(", ")}`);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error("Ollama not responding");

    const data = await response.json();
    const existingModels = data.models?.map((m) => m.name.split(":")[0]) || [];

    console.log(`   Existing: ${existingModels.join(", ") || "none"}`);

    const modelsToInstall = MODELS.filter(
      (model) =>
        !existingModels.some((existing) => existing === model.split(":")[0]),
    );

    if (modelsToInstall.length === 0) {
      console.log("   ✓ All models already exist. Skipping download.");
      return;
    }

    console.log(`   To download: ${modelsToInstall.join(", ")}`);

    for (const model of modelsToInstall) {
      await pullModel(model);
    }
  } catch (error) {
    console.error("   ✗ Cannot connect to Ollama:", error.message);
    process.exit(1);
  }
}

setupOllama()
  .then(() => {
    console.log("\n✅ Ollama setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });

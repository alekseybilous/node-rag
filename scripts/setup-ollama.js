const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODELS = [
  "nomic-embed-text",
  process.env.LLM_MODEL || "mistral"
];

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
            process.stdout.write(`\r   ${json.status}                    `);
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
  console.log(`   Models to setup: ${MODELS.join(", ")}`);

  // Check if Ollama is running
  try {
    const response = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!response.ok) throw new Error("Ollama not responding");

    const data = await response.json();
    const existingModels = data.models?.map((m) => m.name.split(":")[0]) || [];

    const modelsToInstall = MODELS.filter(
      (model) => !existingModels.some((existing) => existing === model.split(":")[0])
    );

    if (modelsToInstall.length === 0) {
      console.log("   ✓ All required models already exist. Skipping download.");
      return;
    }

    for (const model of modelsToInstall) {
      await pullModel(model);
    }
  } catch (error) {
    console.error("   ✗ Cannot connect to Ollama:", error.message);
    process.exit(1);
  }
}

setupOllama();

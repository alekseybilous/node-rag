const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const MODEL = "nomic-embed-text";

async function setupOllama() {
    console.log("🚀 Setting up Ollama embedding model...");
    console.log(`   URL: ${OLLAMA_URL}`);
    console.log(`   Model: ${MODEL}`);

    // Check if Ollama is running
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) throw new Error("Ollama not responding");

        const data = await response.json();
        const modelExists = data.models?.some(m => m.name.includes(MODEL));

        if (modelExists) {
            console.log(`   ✓ Model ${MODEL} already exists. Skipping download.`);
            return;
        }
    } catch (error) {
        console.error("   ✗ Cannot connect to Ollama:", error.message);
        process.exit(1);
    }

    // Pull the model
    console.log(`\n📥 Pulling ${MODEL}... (this may take a few minutes)`);

    try {
        const response = await fetch(`${OLLAMA_URL}/api/pull`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: MODEL }),
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

        console.log(`\n\n✅ Model ${MODEL} is ready!`);
    } catch (error) {
        console.error("\n✗ Error pulling model:", error.message);
        process.exit(1);
    }
}

setupOllama();
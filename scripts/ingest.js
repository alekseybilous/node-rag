// scripts/ingest.js
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { ChromaClient } from "chromadb";
import fs from "fs";
import path from "path";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COLLECTION_NAME = "my_documents";
const DOCS_DIR = "/app/documents";

// Sanitize metadata for ChromaDB (only flat string/number/boolean allowed)
function sanitizeMetadata(metadata) {
  const clean = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      clean[key] = value;
    } else if (value === null || value === undefined) {
      // Skip null/undefined
    } else if (typeof value === "object") {
      // Flatten nested objects like loc.pageNumber
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (
          typeof nestedValue === "string" ||
          typeof nestedValue === "number" ||
          typeof nestedValue === "boolean"
        ) {
          clean[`${key}_${nestedKey}`] = nestedValue;
        }
      }
    }
  }
  return clean;
}

async function ingestPDFs() {
  console.log("🚀 Starting PDF ingestion...");
  console.log(`   ChromaDB: ${CHROMA_URL}`);
  console.log(`   Ollama: ${OLLAMA_URL}`);

  // Check if already ingested
  try {
    const client = new ChromaClient({ path: CHROMA_URL });
    const collection = await client.getCollection({ name: COLLECTION_NAME });
    const count = await collection.count();

    if (count > 0) {
      console.log(
        `\n✅ Collection already has ${count} documents. Skipping ingestion.`,
      );
      process.exit(0);
    }
  } catch (e) {
    console.log("   No existing collection found. Will create new one.");
  }

  // Get PDF files
  if (!fs.existsSync(DOCS_DIR)) {
    console.log(`❌ Documents directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const pdfFiles = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith(".pdf"));

  if (pdfFiles.length === 0) {
    console.log("⚠️  No PDF files found. Skipping ingestion.");
    process.exit(0);
  }

  console.log(`\n📄 Found ${pdfFiles.length} PDF files:`);
  pdfFiles.forEach((f) => console.log(`   - ${f}`));

  // Load PDFs
  const allDocs = [];

  for (const pdfFile of pdfFiles) {
    const filePath = path.join(DOCS_DIR, pdfFile);
    console.log(`\n📖 Loading: ${pdfFile}`);

    try {
      const loader = new PDFLoader(filePath, { splitPages: true });
      const docs = await loader.load();
      docs.forEach((doc) => (doc.metadata.source = pdfFile));
      console.log(`   ✓ Loaded ${docs.length} pages`);
      allDocs.push(...docs);
    } catch (error) {
      console.error(`   ✗ Error loading ${pdfFile}:`, error.message);
    }
  }

  console.log(`\n📚 Total pages loaded: ${allDocs.length}`);

  // Split into chunks
  console.log("\n✂️  Splitting into chunks...");
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const chunks = await splitter.splitDocuments(allDocs);
  console.log(`   ✓ Created ${chunks.length} chunks`);

  // Sanitize metadata for ChromaDB
  console.log("\n🧹 Sanitizing metadata...");
  chunks.forEach((chunk) => {
    chunk.metadata = sanitizeMetadata(chunk.metadata);
  });
  console.log("   ✓ Metadata cleaned");

  // Create embeddings
  console.log("\n🧠 Creating embeddings with Ollama...");
  const embeddings = new OllamaEmbeddings({
    model: "nomic-embed-text",
    baseUrl: OLLAMA_URL,
  });

  try {
    await embeddings.embedQuery("test");
    console.log("   ✓ Ollama connection successful");
  } catch (error) {
    console.error("   ✗ Ollama connection failed:", error.message);
    process.exit(1);
  }

  console.log("\n💾 Storing in ChromaDB...");
  await Chroma.fromDocuments(chunks, embeddings, {
    collectionName: COLLECTION_NAME,
    url: CHROMA_URL,
    collectionMetadata: { "hnsw:space": "cosine" },
  });

  console.log("\n✅ Ingestion complete!");
  console.log(`   Collection: ${COLLECTION_NAME}`);
  console.log(`   Total chunks: ${chunks.length}`);
}

ingestPDFs().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

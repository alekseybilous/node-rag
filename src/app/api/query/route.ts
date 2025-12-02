// src/app/api/chat
import { NextRequest } from "next/server";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { streamText, convertToModelMessages } from "ai";
import { createOllama } from "ollama-ai-provider-v2";
import { UIMessage } from "ai";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COLLECTION_NAME = "my_documents";
const LLM_MODEL = process.env.LLM_MODEL || "mistral";

// Initialize Ollama provider with AI SDK
const ollama = createOllama({
  baseURL: `${OLLAMA_URL}/api`,
});

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400 }
      );
    }

    // Get the last user message as the query
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "user") {
      return new Response(
        JSON.stringify({ error: "Last message must be from user" }),
        { status: 400 }
      );
    }

    const query =
      lastMessage.parts?.[0]?.type === "text"
        ? lastMessage.parts[0].text
        : "";

    // Setup embeddings
    const embeddings = new OllamaEmbeddings({
      model: "nomic-embed-text",
      baseUrl: OLLAMA_URL,
    });

    // Connect to ChromaDB
    const vectorstore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url: CHROMA_URL,
    });

    // Search for relevant documents
    const results = await vectorstore.similaritySearchWithScore(query, 4);

    // Format documents
    const documents = results.map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata.source,
      page: doc.metadata.loc_pageNumber || null,
      score: (1 - score).toFixed(4),
    }));

    // Build context from retrieved documents
    const context = documents
      .map((doc, idx) => {
        const pageInfo = doc.page ? ` (Page ${doc.page})` : "";
        return `Document ${idx + 1} from ${doc.source}${pageInfo}:\n${doc.content}`;
      })
      .join("\n\n");

    // Create system prompt with context
    const systemPrompt = `You are a helpful AI assistant that answers questions based on the provided context.
Your task is to:
1. Answer the user's question using ONLY the information from the context documents
2. Be clear and concise in your response
3. If the context doesn't contain enough information to fully answer the question, acknowledge this
4. Cite which document(s) you're referencing when possible
5. Do not make up information that isn't in the context
${documents.length === 0 ? "6. No documents were found for this query, provide your best answer if possible.\n" : ""}
Context documents:
${context || "No relevant documents found."}`;

    // Convert UI messages to model messages for the LLM
    const modelMessages = convertToModelMessages(messages);

    // Stream response using AI SDK
    const result = streamText({
      model: ollama(LLM_MODEL),
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.7,
    });

    // Return using AI SDK's built-in response formatter for useChat
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to process chat",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// src/app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COLLECTION_NAME = "my_documents";
const LLM_MODEL = process.env.LLM_MODEL || "mistral";

export async function POST(req: NextRequest) {
  try {
    const { query, k = 4, mode = "generate" } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

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
    const results = await vectorstore.similaritySearchWithScore(query, k);

    // Format documents
    const documents = results.map(([doc, score]) => ({
      content: doc.pageContent,
      source: doc.metadata.source,
      page: doc.metadata.loc_pageNumber || null,
      score: (1 - score).toFixed(4), // Convert distance to similarity
    }));

    // If mode is "retrieve", just return documents
    if (mode === "retrieve") {
      return NextResponse.json({
        query,
        results: documents,
      });
    }

    // Mode is "generate" - use LLM to generate answer
    if (documents.length === 0) {
      return NextResponse.json({
        query,
        answer:
          "I couldn't find any relevant documents to answer your question. Please try rephrasing your query or ask about a different topic.",
        results: [],
      });
    }

    // Initialize LLM
    const llm = new ChatOllama({
      model: LLM_MODEL,
      baseUrl: OLLAMA_URL,
      temperature: 0.7,
    });

    // Build context from retrieved documents
    const context = documents
      .map((doc, idx) => {
        const pageInfo = doc.page ? ` (Page ${doc.page})` : "";
        return `Document ${idx + 1} from ${doc.source}${pageInfo}:\n${doc.content}`;
      })
      .join("\n\n");

    // Create prompt with system message and user query
    const systemMessage = new SystemMessage(
      `You are a helpful AI assistant that answers questions based on the provided context.
Your task is to:
1. Answer the user's question using ONLY the information from the context documents
2. Be clear and concise in your response
3. If the context doesn't contain enough information to fully answer the question, acknowledge this
4. Cite which document(s) you're referencing when possible
5. Do not make up information that isn't in the context

Context documents:
${context}`,
    );

    const humanMessage = new HumanMessage(
      `Based on the context provided, please answer the following question:\n\n${query}`,
    );

    // Generate response from LLM
    const response = await llm.invoke([systemMessage, humanMessage]);

    return NextResponse.json({
      query,
      answer: response.content,
      results: documents,
    });
  } catch (error) {
    console.error("Query error:", error);
    return NextResponse.json(
      {
        error: "Failed to process query",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

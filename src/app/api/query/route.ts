// src/app/api/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { OllamaEmbeddings } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const COLLECTION_NAME = "my_documents";

export async function POST(req: NextRequest) {
    try {
        const { query, k = 4 } = await req.json();

        if (!query) {
            return NextResponse.json(
                { error: "Query is required" },
                { status: 400 }
            );
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

        // Search
        const results = await vectorstore.similaritySearchWithScore(query, k);

        // Format response
        const documents = results.map(([doc, score]) => ({
            content: doc.pageContent,
            source: doc.metadata.source,
            page: doc.metadata.loc_pageNumber || null,
            score: (1 - score).toFixed(4), // Convert distance to similarity
        }));

        return NextResponse.json({
            query,
            results: documents,
        });

    } catch (error) {
        console.error("Query error:", error);
        return NextResponse.json(
            { error: "Failed to query documents" },
            { status: 500 }
        );
    }
}
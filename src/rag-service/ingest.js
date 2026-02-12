import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitters";


export const addManualDocs = async (manualDocs, embeddings) => {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: "http://localhost:6333",
    collectionName: "career-knowledge",
  });

  // Split manual docs just in case they are long
  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
  const splitDocs = await splitter.splitDocuments(manualDocs);

  await vectorStore.addDocuments(splitDocs);
  console.log("✅ Manual career docs added to Qdrant.");
};

// Example Usage
const manualData = [
  new Document({
    pageContent: "AI Engineers with Python and MLOps are in high demand in India for 2026...",
    metadata: { industry: "AI", country: "India", source: "LinkedIn Report 2025" }
  })
];
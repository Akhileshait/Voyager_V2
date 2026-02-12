import { Worker } from "bullmq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { Document } from "@langchain/core/documents";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { TaskType } from "@google/generative-ai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

const key = "AIzaSyB2BqN_HUBqew-c3ACUKx9hhflH4-aE1T0";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: key,
  model: "gemini-embedding-001", 
  taskType: TaskType.RETRIEVAL_DOCUMENT, 
});

const worker = new Worker(
  "file-upload",
  async (job) => {
    const { filename, path: filePath } = job.data;
    console.log(`\n--- 🛠️ Processing: ${filename} ---`);

    try {
      const loader = new PDFLoader(filePath);
      const rawDocs = await loader.load();
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 100,
      });
      const allSplitDocs = await splitter.splitDocuments(rawDocs);

      // Sanitize
      const validDocs = allSplitDocs.filter(
        (doc) => doc.pageContent?.trim().length > 0,
      );

      if (validDocs.length === 0) {
        console.warn(`⚠️ Skipping ${filename}: No readable text.`);
        return;
      }

      const vectorStore = await QdrantVectorStore.fromExistingCollection(
        embeddings,
        {
          url: "http://localhost:6333",
          collectionName: "career-knowledge",
        },
      );

      const batchSize = 50; // Smaller batches are safer
      console.log(
        `🧬 Processing ${validDocs.length} chunks in batches of ${batchSize}...`,
      );

      for (let i = 0; i < validDocs.length; i += batchSize) {
        const batch = validDocs.slice(i, i + batchSize);

        try {
          // We add documents batch by batch
          await vectorStore.addDocuments(batch);
          console.log(
            `  index [${i} to ${Math.min(i + batchSize, validDocs.length)}] ✅`,
          );
        } catch (batchError) {
          console.error(`  🚨 Batch error at index ${i}:`, batchError.message);
          // If a batch fails, we don't throw; we move to the next to save the rest of the file
          continue;
        }
      }

      console.log(`✅ FINISHED: ${filename} processing complete.`);
    } catch (error) {
      console.error(`💥 JOB CRITICAL ERROR: ${error.message}`);
      throw error;
    }
  },
  {
    connection: { host: "localhost", port: 6379 },
    concurrency: 10,
  },
);

worker.on("completed", (job) => console.log(`Finished ${job.data.filename}`));

worker.on("active", (job) => {
  console.log(`🏃 Active: Job ${job.id} started processing`);
});

worker.on("completed", (job, returnvalue) => {
  console.log(`✅ Completed: Job ${job.id} finished`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Failed: Job ${job.id} failed with error: ${err.message}`);
});

worker.on("error", (err) => {
  console.error(`🚨 Connection Error: ${err.message}`);
});

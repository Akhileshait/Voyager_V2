import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ host: "localhost", port: 6333 });

async function init() {
  const collections = await client.getCollections();
  const exists = collections.collections.find(
    (c) => c.name === "career-knowledge",
  );

  if (!exists) {
    await client.createCollection("career-knowledge", {
      vectors: {
        size: 3072, // Correct for text-embedding-004
        distance: "Cosine",
      },
    });
    console.log("✅ Collection 'career-knowledge' created.");
  } else {
    console.log("ℹ️ Collection already exists.");
  }
}
init();

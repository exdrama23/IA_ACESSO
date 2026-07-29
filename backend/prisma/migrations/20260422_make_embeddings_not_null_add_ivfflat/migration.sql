-- Make embedding NOT NULL
ALTER TABLE "ChatHistory" ALTER COLUMN "embedding" SET NOT NULL;

-- Add IVFFLAT index for vector similarity search
CREATE INDEX "ChatHistory_embedding_ivfflat_idx" ON "ChatHistory" USING ivfflat ("embedding" vector_cosine_ops);

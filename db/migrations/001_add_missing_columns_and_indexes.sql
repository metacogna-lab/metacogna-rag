-- Migration 001: Add Missing Columns and Performance Indexes
-- Created: 2025-12-31
-- Purpose: Sync production schema with codebase and add performance indexes

-- Step 1: Add missing columns to documents table
ALTER TABLE documents ADD COLUMN userId TEXT;
ALTER TABLE documents ADD COLUMN uploadedAt INTEGER;
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'completed';

-- Step 2: Add missing indexes for documents table
CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId);
CREATE INDEX IF NOT EXISTS idx_documents_uploadedAt ON documents(uploadedAt DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Step 3: Add missing index for users table
CREATE INDEX IF NOT EXISTS idx_users_lastLogin ON users(lastLogin DESC);

-- Step 4: Add documentId columns to graph tables for easier cleanup
ALTER TABLE graph_nodes ADD COLUMN documentId TEXT;
ALTER TABLE graph_edges ADD COLUMN documentId TEXT;

-- Step 5: Create indexes for graph documentId columns
CREATE INDEX IF NOT EXISTS idx_graph_nodes_documentId ON graph_nodes(documentId);
CREATE INDEX IF NOT EXISTS idx_graph_edges_documentId ON graph_edges(documentId);

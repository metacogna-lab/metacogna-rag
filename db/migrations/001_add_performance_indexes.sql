-- Migration 001: Add Performance Indexes and Missing Columns
-- Created: 2025-12-31
-- Purpose: Add missing indexes for frequently queried columns and add status tracking

-- Add status column to documents table if not exists
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'completed';

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_uploadedAt ON documents(uploadedAt DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_users_lastLogin ON users(lastLogin DESC);

-- Add documentId column to graph tables for easier cleanup
ALTER TABLE graph_nodes ADD COLUMN documentId TEXT;
ALTER TABLE graph_edges ADD COLUMN documentId TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_graph_nodes_documentId ON graph_nodes(documentId);
CREATE INDEX IF NOT EXISTS idx_graph_edges_documentId ON graph_edges(documentId);

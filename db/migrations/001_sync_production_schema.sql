-- Migration 001: Sync Production Schema with Codebase
-- Created: 2025-12-31
-- Purpose: Add missing columns and performance indexes to production database

-- ===========================================
-- USERS TABLE: Add missing columns
-- ===========================================
ALTER TABLE users ADD COLUMN email TEXT;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN goals TEXT;
ALTER TABLE users ADD COLUMN isAdmin INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lastLogin INTEGER;

-- ===========================================
-- DOCUMENTS TABLE: Add missing columns
-- ===========================================
ALTER TABLE documents ADD COLUMN userId TEXT;
ALTER TABLE documents ADD COLUMN uploadedAt INTEGER;
ALTER TABLE documents ADD COLUMN status TEXT DEFAULT 'completed';

-- ===========================================
-- GRAPH TABLES: Add documentId for cleanup
-- ===========================================
ALTER TABLE graph_nodes ADD COLUMN documentId TEXT;
ALTER TABLE graph_edges ADD COLUMN documentId TEXT;

-- ===========================================
-- PERFORMANCE INDEXES
-- ===========================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_isAdmin ON users(isAdmin);
CREATE INDEX IF NOT EXISTS idx_users_lastLogin ON users(lastLogin DESC);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_userId ON documents(userId);
CREATE INDEX IF NOT EXISTS idx_documents_uploadedAt ON documents(uploadedAt DESC);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_documents_r2Key ON documents(r2Key);

-- Graph table indexes
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_documentId ON graph_nodes(documentId);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target);
CREATE INDEX IF NOT EXISTS idx_graph_edges_documentId ON graph_edges(documentId);

-- Supervisor table indexes
CREATE INDEX IF NOT EXISTS idx_user_interactions_userId ON user_interaction_log(userId);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interaction_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_supervisor_decisions_userId ON supervisor_decisions(userId);
CREATE INDEX IF NOT EXISTS idx_supervisor_policies_userId ON supervisor_policies(userId);
CREATE INDEX IF NOT EXISTS idx_supervisor_kg_userId ON supervisor_knowledge_graph(userId);
CREATE INDEX IF NOT EXISTS idx_document_status_userId ON document_ingestion_status(userId);
CREATE INDEX IF NOT EXISTS idx_user_snapshots_userId ON user_state_snapshots(userId);

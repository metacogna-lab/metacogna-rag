-- Pratejra RAG D1 Database Schema
-- This schema supports auth, document metadata, and knowledge graph storage

-- Users for Auth
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    passwordHash TEXT NOT NULL,
    createdAt INTEGER NOT NULL
);

-- Documents Metadata
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    metadata TEXT,
    createdAt INTEGER NOT NULL
);

-- Knowledge Graph Nodes
CREATE TABLE IF NOT EXISTS graph_nodes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT NOT NULL,
    summary TEXT
);

-- Knowledge Graph Edges
CREATE TABLE IF NOT EXISTS graph_edges (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    relation TEXT NOT NULL,
    FOREIGN KEY (source) REFERENCES graph_nodes(id),
    FOREIGN KEY (target) REFERENCES graph_nodes(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);
CREATE INDEX IF NOT EXISTS idx_graph_nodes_type ON graph_nodes(type);
CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source);
CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target);

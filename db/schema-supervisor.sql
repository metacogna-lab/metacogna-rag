-- MetaCogna RAG: Supervisor Agent Schema Extensions
-- 7 new tables for Supervisor persistence and metacognitive tracking

-- User Interaction Log
-- Tracks all user interactions for pattern analysis
CREATE TABLE IF NOT EXISTS user_interaction_log (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    timestamp INTEGER NOT NULL,
    viewState TEXT NOT NULL,
    actionType TEXT NOT NULL, -- 'click', 'input', 'navigation', 'upload', 'query'
    actionTarget TEXT,
    actionPayload TEXT, -- JSON
    durationMs INTEGER,
    metadata TEXT
);

-- Supervisor Decision Log
-- Records Supervisor's decisions and guidance
CREATE TABLE IF NOT EXISTS supervisor_decisions (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    timestamp INTEGER NOT NULL,
    decisionType TEXT NOT NULL, -- 'inhibit', 'allow', 'request_guidance'
    confidenceScore INTEGER NOT NULL, -- 0-100
    simulationResult TEXT,
    reasoning TEXT,
    userMessage TEXT,
    relevantGoal TEXT,
    policyUpdate TEXT,
    displayMode TEXT, -- 'widget' or 'toast'
    actionLabel TEXT,
    actionLink TEXT,
    wasActedUpon INTEGER DEFAULT 0,
    dismissedAt INTEGER
);

-- Learned Policies
-- Supervisor's learned rules and preferences
CREATE TABLE IF NOT EXISTS supervisor_policies (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    createdAt INTEGER NOT NULL,
    rule TEXT NOT NULL,
    createdContext TEXT,
    weight REAL DEFAULT 1.0,
    lastApplied INTEGER,
    applicationCount INTEGER DEFAULT 0
);

-- Supervisor Knowledge Graph (separate namespace)
-- Supervisor's own knowledge graph about the user
CREATE TABLE IF NOT EXISTS supervisor_knowledge_graph (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    nodeId TEXT NOT NULL, -- Prefixed with 'SUPERVISOR:'
    nodeType TEXT NOT NULL, -- 'Goal', 'Pattern', 'Preference', 'Habit', 'Risk'
    label TEXT NOT NULL,
    summary TEXT,
    confidence REAL DEFAULT 0.5,
    createdAt INTEGER NOT NULL,
    lastUpdated INTEGER NOT NULL,
    metadata TEXT
);

-- Document Ingestion Status
-- Tracks document processing pipeline status
CREATE TABLE IF NOT EXISTS document_ingestion_status (
    documentId TEXT PRIMARY KEY REFERENCES documents(id),
    userId TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL, -- 'queued', 'processing', 'embedding', 'graphing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,
    currentStep TEXT,
    chunksTotal INTEGER DEFAULT 0,
    chunksProcessed INTEGER DEFAULT 0,
    startedAt INTEGER,
    completedAt INTEGER,
    errorMessage TEXT,
    updatedAt INTEGER NOT NULL
);

-- User State Snapshots (for change detection)
-- Periodic snapshots to detect >5% state changes
CREATE TABLE IF NOT EXISTS user_state_snapshots (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL REFERENCES users(id),
    timestamp INTEGER NOT NULL,
    documentCount INTEGER DEFAULT 0,
    totalInteractions INTEGER DEFAULT 0,
    lastActivityAt INTEGER,
    goalsHash TEXT,
    stateMetrics TEXT, -- JSON
    changePercentage REAL
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_user_interactions_userId ON user_interaction_log(userId);
CREATE INDEX IF NOT EXISTS idx_user_interactions_timestamp ON user_interaction_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_supervisor_decisions_userId ON supervisor_decisions(userId);
CREATE INDEX IF NOT EXISTS idx_supervisor_decisions_timestamp ON supervisor_decisions(timestamp);
CREATE INDEX IF NOT EXISTS idx_supervisor_policies_userId ON supervisor_policies(userId);
CREATE INDEX IF NOT EXISTS idx_supervisor_kg_userId ON supervisor_knowledge_graph(userId);
CREATE INDEX IF NOT EXISTS idx_supervisor_kg_nodeId ON supervisor_knowledge_graph(nodeId);
CREATE INDEX IF NOT EXISTS idx_document_status_userId ON document_ingestion_status(userId);
CREATE INDEX IF NOT EXISTS idx_user_snapshots_userId ON user_state_snapshots(userId);
CREATE INDEX IF NOT EXISTS idx_user_snapshots_timestamp ON user_state_snapshots(timestamp);

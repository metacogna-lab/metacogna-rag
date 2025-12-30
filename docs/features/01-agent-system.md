# Agent System

## Overview

The Agent System is the core metacognitive simulation engine of Metacogna. It uses multiple specialized AI agents that work together to process information, reason about problems, and generate insights through structured interactions.

## Core Concept: Metacognitive Simulation

Metacognition refers to "thinking about thinking" - the ability to understand, monitor, and control one's own cognitive processes. Metacogna simulates this through:

1. **Specialized Agents**: Each agent has a distinct role and perspective
2. **Memory Tiers**: Short-term, medium-term, and long-term memory
3. **Structured Actions**: Agents can merge, explode, shake, or read from other streams
4. **Cross-Stream Communication**: Agents can request context from other agent streams

## Agent Types

### Coordinator Agent

**Role**: Synthesize and Build

**Responsibilities**:
- Combine ideas from multiple sources
- Build upon existing concepts
- Synthesize information into coherent outputs
- Check short-term memory to avoid repetition
- Use long-term memory to ground ideas

**Prompt**:
```
You are the Coordinator. Synthesize and Build. 
Check Short-Term memory to avoid repeating recent actions. 
Use Long-Term memory to ground ideas.
```

### Critic Agent

**Role**: Question and Refine

**Responsibilities**:
- Identify inconsistencies
- Question assumptions
- Refine and improve outputs
- Look for gaps in reasoning
- Use medium-term history for pattern detection
- Request context from other streams when needed

**Prompt**:
```
You are the Critic. Question and Refine. 
Look for inconsistencies in the Medium-Term history. 
If you see a reference to another stream, use READ_STREAM.
```

## Agent Actions

Agents can perform the following actions:

### MERGE
**Purpose**: Combine multiple ideas or concepts

**When to Use**:
- Multiple related ideas need synthesis
- Consolidating information from different sources
- Creating unified outputs

**Example**:
```json
{
  "action": "MERGE",
  "targetBlockIds": ["idea-1", "idea-2", "idea-3"],
  "outputContent": "Combined synthesis of all three ideas..."
}
```

### EXPLODE
**Purpose**: Break down a complex idea into components

**When to Use**:
- Idea is too complex or abstract
- Need to decompose into actionable parts
- Creating detailed breakdowns

**Example**:
```json
{
  "action": "EXPLODE",
  "targetBlockIds": ["complex-idea-1"],
  "outputContent": "1. Component A...\n2. Component B...\n3. Component C..."
}
```

### SHAKE
**Purpose**: Refine, critique, or improve an idea

**When to Use**:
- Idea needs refinement
- Identifying weaknesses or gaps
- Improving quality or clarity

**Example**:
```json
{
  "action": "SHAKE",
  "targetBlockIds": ["rough-idea-1"],
  "outputContent": "Refined version with improvements..."
}
```

### READ_STREAM
**Purpose**: Request context from another agent stream

**When to Use**:
- Need information from a different agent
- Cross-stream collaboration
- Accessing specialized knowledge

**Example**:
```json
{
  "action": "READ_STREAM",
  "targetStreamId": "stream-abc-123",
  "outputContent": "Retrieved context from stream..."
}
```

### IDLE
**Purpose**: No action needed, maintain current state

**When to Use**:
- Current state is satisfactory
- Waiting for more information
- No changes required

## Memory System

### Short-Term Memory
- **Duration**: Current session/turn
- **Storage**: In-memory during agent execution
- **Use Case**: Avoid repeating recent actions, maintain immediate context

### Medium-Term Memory
- **Duration**: Current agent stream session
- **Storage**: D1 database (`memory_streams` table)
- **Use Case**: Track agent history, detect patterns, maintain session context

### Long-Term Memory
- **Duration**: Persistent across sessions
- **Storage**: RAG system (Vectorize + D1)
- **Use Case**: Ground ideas in uploaded documents, access knowledge base

## Stream Architecture

### Stream Concept

A **stream** is an isolated agent processing context with:
- Unique stream ID
- Goal or objective
- Associated memory frames
- Status (active/archived)

### Stream Lifecycle

1. **Creation**: Stream created with initial goal
2. **Processing**: Agents process turns within the stream
3. **Memory Updates**: Each turn creates a memory frame
4. **Cross-Stream Access**: Agents can read from other streams
5. **Archival**: Stream archived when goal achieved or abandoned

### Memory Frames

Each agent turn creates a memory frame containing:
- Agent name (Coordinator/Critic)
- Input received
- Thought process
- Action taken
- Output generated
- Tags for categorization

## Agent Graph Service

The `AgentGraphService` orchestrates agent interactions:

### Key Methods

**`processTurn(streamId, input, config)`**
- Processes a single agent turn
- Retrieves relevant memory
- Calls LLM with structured schema
- Parses agent response
- Updates memory streams
- Returns agent output

**`getStreamContext(streamId)`**
- Retrieves full stream context
- Includes all memory frames
- Returns stream metadata

**`createStream(goal)`**
- Creates new agent stream
- Initializes memory
- Returns stream ID

## Structured Output Schema

Agents return structured JSON matching this schema:

```typescript
{
  agentName: "Coordinator" | "Critic",
  thought: string,           // Reasoning process
  action: "MERGE" | "EXPLODE" | "SHAKE" | "READ_STREAM" | "IDLE",
  targetBlockIds: string[],   // IDs of ideas/blocks to act on
  targetStreamId?: string,    // For READ_STREAM actions
  outputContent: string       // Generated content
}
```

## Integration with LLM Service

Agents use the LLM Service with:
- **Structured Output**: JSON schema enforcement
- **System Instructions**: Role-specific prompts
- **Memory Context**: Retrieved from memory service
- **Temperature**: Configurable (default 0.5)

## Example Workflow

### Scenario: Analyzing a Complex Problem

1. **Initial Input**: User provides complex problem statement
2. **Coordinator Turn**: 
   - Action: EXPLODE
   - Breaks problem into components
   - Output: List of sub-problems
3. **Critic Turn**:
   - Action: SHAKE
   - Reviews sub-problems
   - Identifies gaps
   - Output: Refined problem breakdown
4. **Coordinator Turn**:
   - Action: MERGE
   - Combines refined components
   - Accesses long-term memory (RAG) for context
   - Output: Comprehensive analysis
5. **Result**: Well-structured analysis with multiple perspectives

## UI Integration

The Agent Canvas View (`AgentCanvasView`) provides:
- Visual agent state display
- Turn-by-turn history
- Memory visualization
- Stream management
- Interactive agent controls

## Configuration

Agent behavior configured via:
- `MAX_TURNS`: Maximum turns per stream (default: 10)
- `DEFAULT_LLM_CONFIG`: LLM provider and model selection
- `AGENT_PROMPTS`: Role-specific system instructions
- Temperature and other LLM parameters

## Best Practices

1. **Clear Goals**: Define specific goals for each stream
2. **Memory Usage**: Leverage all three memory tiers appropriately
3. **Action Selection**: Choose actions that match the task
4. **Cross-Stream**: Use READ_STREAM for specialized knowledge
5. **Iteration**: Allow multiple turns for complex problems

## Next Steps

- [RAG Engine](./02-rag-engine.md) - How agents access document knowledge
- [Memory Service](../development/03-service-layer.md#memory-service) - Memory management details
- [Agent Canvas View](../architecture/02-frontend-architecture.md#agent-canvas-view) - UI implementation


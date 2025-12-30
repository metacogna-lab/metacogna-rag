# Frontend Architecture

## Overview

The Metacogna frontend is a modern React application built with Vite, TypeScript, and Tailwind CSS. It's designed as a Single Page Application (SPA) that communicates with Cloudflare Workers for backend functionality.

## Technology Stack

- **Framework**: React 18.3.1
- **Build Tool**: Vite 5.4.21
- **Language**: TypeScript 5.9.3
- **Styling**: Tailwind CSS 3.4.19
- **Icons**: Lucide React 0.344.0
- **Animation**: Framer Motion 11.18.2
- **Package Manager**: Bun 1.3.2

## Project Structure

```
metacogna-rag/
├── App.tsx                 # Root component, view routing
├── index.tsx               # Application entry point
├── index.html              # HTML template
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript configuration
│
├── components/             # Reusable UI components
│   ├── ErrorBoundary.tsx
│   ├── GlobalAIModal.tsx
│   ├── GlobalToast.tsx
│   ├── GraphAnalysis.tsx
│   ├── Layout.tsx
│   ├── PaperComponents.tsx
│   ├── SupervisorWidget.tsx
│   └── SystemPromptAlert.tsx
│
├── views/                  # Page-level components
│   ├── AgentCanvasView.tsx
│   ├── AuthView.tsx
│   ├── ConsoleView.tsx
│   ├── KnowledgeGraphView.tsx
│   ├── LandingPageView.tsx
│   ├── MyProfileView.tsx
│   ├── ProductXView.tsx
│   ├── PromptGenView.tsx
│   ├── QuestionView.tsx
│   ├── SettingsView.tsx
│   └── UploadView.tsx
│
├── services/               # Business logic services
│   ├── AgentGraphService.ts
│   ├── AnalyticsService.ts
│   ├── AuthService.ts
│   ├── LLMService.ts
│   ├── LogService.ts
│   ├── MemoryService.ts
│   ├── Observability.ts
│   ├── ProductXConfig.ts
│   ├── RAGEngine.ts
│   ├── SessionAnalysisService.ts
│   ├── SupervisorService.ts
│   └── TrainingDataService.ts
│
├── schemas/                # TypeScript type definitions
│   ├── agents.ts
│   ├── chat.ts
│   ├── documents.ts
│   ├── prompts.ts
│   └── settings.ts
│
├── types.ts                # Core type definitions
├── constants.ts            # Application constants
└── lib/                    # Utility libraries
    └── (various utilities)
```

## Application Entry Point

### `index.tsx`
- Initializes React application
- Sets up root rendering
- No Node.js dependencies (browser-only)

### `App.tsx`
- Main application component
- Manages view state and routing
- Handles authentication state
- Provides global layout and modals

## View System

### ViewState Enum

The application uses an enum-based routing system:

```typescript
enum ViewState {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  QUESTION = 'QUESTION',
  GRAPH = 'GRAPH',
  PROMPT = 'PROMPT',
  PRODUCT_X = 'PRODUCT_X',
  MY_PROFILE = 'MY_PROFILE',
  SETTINGS = 'SETTINGS',
  AGENT_CANVAS = 'AGENT_CANVAS',
  CONSOLE = 'CONSOLE'
}
```

### View Components

Each view is a self-contained React component:

**LandingPageView**
- Application overview
- Navigation hub
- Document summary
- Knowledge graph preview

**UploadView**
- Document upload interface
- File selection and processing
- Upload progress tracking
- R2 integration

**QuestionView**
- Chat interface
- RAG-powered Q&A
- Session management
- Multi-provider LLM support

**KnowledgeGraphView**
- Interactive graph visualization
- Entity and relationship display
- Graph analysis tools
- Filtering and search

**AgentCanvasView**
- Multi-agent simulation interface
- Agent state visualization
- Turn-by-turn history
- Memory stream management

**PromptGenView**
- Prompt engineering tools
- Model-specific optimization
- Prompt templates
- Generation and testing

**ProductXView**
- Workflow-based product development
- Step-by-step process
- Validation and refinement
- Context accumulation

**SettingsView**
- Application configuration
- LLM provider settings
- API key management
- System prompts

**ConsoleView**
- System logs display
- Debug information
- Error tracking
- Performance metrics

## Component Architecture

### Layout Component

The `Layout` component provides:
- Navigation sidebar
- View switching
- User profile access
- Global actions (AI modal, settings)

### Paper Components

Custom UI components with paper-like styling:
- `PaperCard`: Container with elevation
- `PaperButton`: Styled button component
- `PaperBadge`: Status indicators

### Error Boundary

`ErrorBoundary` component:
- Catches React errors
- Displays user-friendly error messages
- Prevents full application crashes
- Logs errors for debugging

## Service Layer

### Service Pattern

Services encapsulate business logic and API communication:

**RAGEngine**
- Document ingestion
- Vector search coordination
- Chat query processing
- Knowledge base management

**AgentGraphService**
- Agent turn processing
- Memory management
- Stream coordination
- Structured output parsing

**LLMService**
- Multi-provider LLM abstraction
- Embedding generation
- Text generation
- Error handling and retries

**AuthService**
- User authentication
- Session management
- Profile management
- Logout handling

**MemoryService**
- Memory stream CRUD
- Frame management
- Context retrieval
- Memory tier coordination

## State Management

### Local State (React Hooks)

- `useState` for component-local state
- `useEffect` for side effects
- `useContext` for shared state (if needed)

### Application State

Key state managed in `App.tsx`:
- `currentView`: Active view
- `documents`: Document list
- `config`: Application configuration
- `isAuthenticated`: Auth status

### Configuration State

`AppConfig` type contains:
- User information
- LLM provider settings
- System prompts
- Vault configuration

## API Communication

### API Client Pattern

Services communicate with backend via:
- Direct fetch calls to Worker endpoints
- Environment-based URL configuration
- Error handling and retries
- Response parsing

### Environment Variables

Frontend uses Vite environment variables:
- `VITE_WORKER_API_URL`: Backend API URL
- `VITE_API_KEY`: Google API key (optional)
- `VITE_LANGFUSE_*`: Observability keys (optional)

## Styling Approach

### Tailwind CSS

- Utility-first CSS framework
- Responsive design utilities
- Custom color palette
- Consistent spacing system

### Design System

- Paper-like elevation system
- Consistent typography
- Icon system (Lucide)
- Animation (Framer Motion)

## Build Configuration

### Vite Config

Key configurations:
- React plugin
- Path aliases
- Environment variable handling
- Node.js polyfills for browser compatibility
- Build optimizations

### TypeScript Config

- Strict type checking
- React JSX support
- Module resolution
- Path mapping

## Browser Compatibility

### Polyfills

Vite config includes polyfills for:
- `process` object (Node.js compatibility)
- `path` module (path-browserify)
- Various Node.js APIs used by dependencies

### Environment Handling

- `import.meta.env` for environment variables
- Browser-safe API access
- No Node.js runtime dependencies

## Performance Optimizations

### Code Splitting

- Route-based code splitting
- Lazy loading for views
- Dynamic imports where appropriate

### Asset Optimization

- Vite's built-in optimizations
- Image optimization
- CSS minification
- Tree shaking

## Error Handling

### Component Level

- Error boundaries for view isolation
- Try-catch in async operations
- User-friendly error messages

### Service Level

- Retry logic for API calls
- Error logging
- Graceful degradation

## Testing

### Test Structure

- Jest for unit testing
- React Testing Library for components
- Mock implementations for services

## Development Workflow

### Local Development

```bash
bun run dev        # Start Vite dev server
bun run build      # Production build
bun run preview    # Preview production build
```

### Hot Module Replacement

- Vite HMR for instant updates
- React Fast Refresh
- State preservation during updates

## Next Steps

- [Backend Architecture](./03-backend-architecture.md) - Worker API design
- [Service Layer](../development/03-service-layer.md) - Service implementation details
- [API Reference](../development/02-api-reference.md) - Backend endpoints



export interface WorkflowStep {
    id: string;
    title: string;
    role: string;
    icon: string;
    generationPrompt: string;
    validationPrompt: string;
}

export interface RefinerRule {
    keywords: string[];
    targetStepId: string;
    intentName: string;
    promptOverlay: string;
}

export const PRODUCT_X_WORKFLOW = {
    steps: [
        {
            id: 'prd',
            title: 'Product Requirements (PRD)',
            role: 'Lead Product Manager',
            icon: 'FileText',
            generationPrompt: `Act as a Lead Product Manager. Transform [USER_INPUT] into a High-Impact PRD. Define User Personas, User Stories in Gherkin (Given/When/Then), and a MoSCoW-prioritized feature set. Establish specific KPI Success Metrics and identify technical constraints for a v1 MVP. Output in structured Markdown.`,
            validationPrompt: `Audit the PRD for 'Feature Creep.' Identify requirements that violate the MVP timeline. Check for contradictions between user stories and success metrics.`
        },
        {
            id: 'design',
            title: 'Design System & Tokens',
            role: 'Principal Design Technologist',
            icon: 'Palette',
            generationPrompt: `Act as a Principal Design Technologist. Based on the PRD, architect an Atomic Design System. Define a Design Token JSON including a Fluid Typography scale, a Semantic Color Palette (Base, Primary, Accent, Error), and an 8pt Spacing Grid. Specify accessibility standards (WCAG 2.1 AA) and 'High-Density Paper' aesthetic guidelines for components.`,
            validationPrompt: `Perform a contrast and consistency check on the Design Tokens. Does the semantic palette provide enough functional variance for error vs. warning states?`
        },
        {
            id: 'schema',
            title: 'Data Models & Schema',
            role: 'Principal Database Architect',
            icon: 'Database',
            generationPrompt: `Act as a Principal Database Architect. Design a Normalized Data Model based on the PRD user stories. Provide a Mermaid ERD showing Entity Relationships (1:1, 1:N). Generate Zod runtime schemas for all entities and specify indexing strategies for high-read performance. Ensure ACID compliance for transactional data.`,
            validationPrompt: `Analyze the ERD for N+1 query risks and circular dependencies. Verify that all Zod schemas cover the mandatory fields defined in the PRD.`
        },
        {
            id: 'backend',
            title: 'Backend Domain Logic',
            role: 'Senior Backend Architect',
            icon: 'Server',
            generationPrompt: `Act as a Senior Backend Architect. Define the core Domain Logic and Service Layer. Write pseudo-code for complex business workflows (e.g., Payment processing, Auth guardrails). Specify State Machine transitions for the primary product entities. Focus on idempotency and race-condition prevention.`,
            validationPrompt: `Stress-test the Domain Logic. Identify failure points in the state machine. What happens if an API call fails mid-transaction? Suggest 'Compensating Actions'.`
        },
        {
            id: 'api',
            title: 'API Specification',
            role: 'API Architect',
            icon: 'Webhook',
            generationPrompt: `Act as an API Architect. Design a stateless RESTful/GraphQL API spec. Provide OpenAPI 3.0 documentation including endpoints, request/response payloads, and standard HTTP status codes. Define Middleware requirements for rate-limiting, CORS, and JWT authentication.`,
            validationPrompt: `Audit the API spec for payload bloat. Ensure sensitive data (PII) is not exposed in public endpoints. Check for standard naming conventions (camelCase vs snake_case).`
        },
        {
            id: 'frontend',
            title: 'Frontend Implementation',
            role: 'Senior Frontend Lead',
            icon: 'Layout',
            generationPrompt: `Act as a Senior Frontend Lead. Design a component-driven React architecture. Map the Design System to reusable UI components. Implement a global state management strategy (Context or Zustand). Define a 'Skeleton State' strategy and 'Optimistic UI' updates for all data mutations.`,
            validationPrompt: `Review the component architecture for 'Prop Drilling' and excessive re-renders. Verify that the UI implementation adheres 1:1 to the Design Tokens.`
        },
        {
            id: 'devops',
            title: 'Deployment & DevOps',
            role: 'DevSecOps Engineer',
            icon: 'Rocket',
            generationPrompt: `Act as a DevSecOps Engineer. Define a CI/CD Pipeline. Specify Environment Variables for Staging vs. Production. Define 'Infrastructure-as-Code' (IaC) parameters, Edge-Caching strategies, and Revalidation Hooks. Include automated health-check protocols and a disaster recovery rollback plan.`,
            validationPrompt: `Scan the deployment plan for security vulnerabilities. Are secrets properly rotated? Is there a single point of failure in the edge-caching logic?`
        }
    ],
    refiners: [
        {
            intentName: 'Aesthetic Pivot',
            keywords: ['visual', 'look', 'style', 'color', 'aesthetic', 'ugly', 'pretty', 'ui'],
            targetStepId: 'design',
            promptOverlay: `User intent detected: Aesthetic Pivot. Re-orient to [Design System]. Analyze the feedback and adjust the Design Tokens. How does this change impact the component layout?`
        },
        {
            intentName: 'Optimization Requirement',
            keywords: ['slow', 'performance', 'speed', 'cache', 'latency', 'fast', 'optimize'],
            targetStepId: 'schema',
            promptOverlay: `User intent detected: Optimization Requirement. Re-orient to [Data Model] and [API Spec]. Identify bottlenecks in the current schema and suggest caching or indexing improvements.`
        },
        {
            intentName: 'Scope Reduction',
            keywords: ['expensive', 'budget', 'time', 'too long', 'fast', 'mvp', 'cut'],
            targetStepId: 'prd',
            promptOverlay: `User intent detected: Scope Reduction. Re-orient to [PRD]. Perform a MoSCoW audit. Which features can be moved to v2 to ensure a faster deployment?`
        },
        {
            intentName: 'Technical Clarity',
            keywords: ['how', 'explain', 'understand', 'work', 'flow', 'diagram'],
            targetStepId: 'schema',
            promptOverlay: `User intent detected: Technical Clarity. Generate a Mermaid Sequence Diagram showing the end-to-end data flow from User Input to Database Persistence.`
        }
    ]
};

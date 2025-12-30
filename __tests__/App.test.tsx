
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import '@testing-library/jest-dom';

// --- JEST GLOBALS ---
// Fix: Declare global Jest variables to resolve TypeScript errors in this environment
declare const jest: any;
declare const describe: any;
declare const test: any;
declare const expect: any;
declare const beforeEach: any;

// --- MOCKS ---

// 1. Mock KnowledgeGraphView 
// Canvas elements are difficult to test in JSDOM without 'jest-canvas-mock'. 
// We mock this view to focus on the application logic and navigation.
jest.mock('../views/KnowledgeGraphView', () => ({
  KnowledgeGraphView: () => <div data-testid="graph-view">Graph View Active</div>
}));

// 2. Mock GoogleGenerativeAI SDK
// Prevent actual network calls to Google's API during tests.
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    models = {
      generateContent: jest.fn().mockResolvedValue({ text: "Mock AI Response" }),
      embedContent: jest.fn().mockResolvedValue({ embedding: { values: [0.1, 0.2, 0.3] } })
    }
  }
}));

// 3. Mock Application Services
// We mock the RAGEngine to return predictable data for assertions.
jest.mock('../services/RAGEngine', () => ({
  ragSystem: {
    search: jest.fn().mockResolvedValue([
      { id: 's1', documentTitle: 'Test Document', snippet: 'Test snippet content for RAG.', score: 0.95 }
    ]),
    generateRAGResponse: jest.fn().mockResolvedValue("This is a synthesized answer based on the test document."),
    recursiveBreakdown: jest.fn().mockResolvedValue([])
  },
  // Mock Analytics to prevent console noise
  analytics: { logEvent: jest.fn() }
}));

// 4. Mock Agent Service
jest.mock('../services/AgentGraphService', () => ({
  agentService: {
    generateInitialBlocks: jest.fn().mockResolvedValue([
       { id: 'b1', content: 'Concept A', type: 'concept', x: 20, y: 20, shape: 'square', color: 'red', scale: 1 }
    ]),
    generateTurn: jest.fn().mockResolvedValue({
       step: 1, agentName: 'Coordinator', thought: 'Testing', action: { type: 'IDLE', targetBlockIds: [] }, outputContent: ''
    })
  },
  AGENT_GOALS: [
      { id: 'g1', label: 'Test Goal', description: 'Testing' }
  ]
}));


// --- TESTS ---

describe('Pratejra System Integration', () => {

  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
  });

  test('initializes correctly and shows Upload View (Hero)', () => {
    render(<App />);
    // Check for Brand Title
    expect(screen.getByText('PRATEJRA')).toBeInTheDocument();
    // Check for Subtitle
    expect(screen.getByText('Personal RAG System')).toBeInTheDocument();
    // Check for Upload Area
    expect(screen.getByText(/Drag & Drop/i)).toBeInTheDocument();
  });

  test('navigation sidebar switches views correctly', async () => {
    render(<App />);

    // 1. Navigate to Agent Workspace
    fireEvent.click(screen.getByText(/Agent Workspace/i));
    expect(screen.getByText(/Mission Control/i)).toBeInTheDocument();

    // 2. Navigate to Research Chat
    fireEvent.click(screen.getByText(/Research Chat/i));
    expect(screen.getByText(/Research Assistant/i)).toBeInTheDocument();

    // 3. Navigate to Knowledge Graph (Mocked)
    fireEvent.click(screen.getByText(/Knowledge Graph/i));
    expect(screen.getByTestId('graph-view')).toBeInTheDocument();

    // 4. Navigate to Prompt Lab
    fireEvent.click(screen.getByText(/Prompt Lab/i));
    expect(screen.getByText(/Prompt Engineering Lab/i)).toBeInTheDocument();

    // 5. Navigate to My Profile
    fireEvent.click(screen.getByText(/My Profile/i));
    expect(screen.getByText(/Semantic Cloud/i)).toBeInTheDocument();
  });

  test('RAG Chat Flow: User can type and receive response', async () => {
    render(<App />);
    
    // Go to chat
    fireEvent.click(screen.getByText(/Research Chat/i));
    
    // Find input and type
    const input = screen.getByPlaceholderText(/Ask about project specs/i);
    fireEvent.change(input, { target: { value: 'How does the HNSW index work?' } });
    
    // Press Enter to send
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    // 1. Check if User Message appears immediately
    expect(screen.getByText('How does the HNSW index work?')).toBeInTheDocument();
    
    // 2. Check if "Thinking" state appears (Optional, might happen too fast in mock)
    // expect(screen.getByText(/Thinking/i)).toBeInTheDocument();

    // 3. Wait for and verify AI Response
    await waitFor(() => {
        expect(screen.getByText(/This is a synthesized answer/i)).toBeInTheDocument();
    });
  });

  test('Agent Workspace: Initialize simulation inputs', () => {
    render(<App />);
    fireEvent.click(screen.getByText(/Agent Workspace/i));

    const textArea = screen.getByPlaceholderText(/Develop a marketing strategy/i);
    fireEvent.change(textArea, { target: { value: 'Analyze new features' } });
    
    expect(textArea).toHaveValue('Analyze new features');
    
    // Check if button becomes enabled (logic check)
    const initBtn = screen.getByText(/Initialize Simulation/i);
    expect(initBtn).not.toBeDisabled();
  });

  test('Global Settings Modal triggers via keyboard shortcut (Ctrl+I)', () => {
    render(<App />);
    
    // Simulate Ctrl+I
    fireEvent.keyDown(window, { key: 'i', ctrlKey: true });
    
    expect(screen.getByText(/My AI System/i)).toBeInTheDocument();
    expect(screen.getByText(/Global Intelligence Config/i)).toBeInTheDocument();
    
    // Close it
    fireEvent.click(screen.getAllByRole('button')[0]); // Usually the X button is first or we can find by icon
  });
});

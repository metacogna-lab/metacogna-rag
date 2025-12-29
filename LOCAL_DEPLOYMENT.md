
# Pratejra RAG - Local Deployment Guide

This guide will help you run the full Pratejra RAG system locally, including the React frontend, ChromaDB vector store, and optional Ollama inference engine.

## Prerequisites

1.  **Node.js** (v18+)
2.  **Docker Desktop** (Running)
3.  **Google API Key** (Required for the Agent Graph logic, even if using Ollama for RAG)

## Step 1: Configuration

1.  Create a copy of the environment template:
    ```bash
    cp .env.example .env
    ```
2.  Open `.env` and paste your Google API Key into `VITE_API_KEY`.

## Step 2: Infrastructure (Docker)

We use Docker to run the databases and local AI services.

1.  Start the services:
    ```bash
    docker-compose up -d
    ```
2.  **Verify Ollama**: Open `http://localhost:11434` in your browser. You should see "Ollama is running".
3.  **Pull a Model**: To use local AI, you must download a model into the running container.
    ```bash
    # Pull Llama 3.2 (Latest optimized 3B model)
    docker exec -it pratejra-rag-ollama-1 ollama pull llama3.2
    
    # OR pull Mistral Nemo for larger context
    docker exec -it pratejra-rag-ollama-1 ollama pull mistral-nemo
    ```

## Step 3: Frontend

1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```
3.  Open `http://localhost:3000` in your browser.

## Step 4: Connecting Ollama

1.  In the Pratejra app, navigate to **Settings** (Bottom left).
2.  Select **Model Intelligence**.
3.  Click **Ollama**.
4.  Click the **Refresh** button next to the Model dropdown. 
5.  If configured correctly, your pulled models (e.g., `llama3.2:latest`) will appear in the list.

## Troubleshooting

-   **Ollama Connection Failed**: Ensure `OLLAMA_ORIGINS="*"` is set in `docker-compose.yml` to allow the browser to make requests to the docker container.
-   **Chroma Connection Failed**: Ensure Docker is running and port 8000 is not blocked.

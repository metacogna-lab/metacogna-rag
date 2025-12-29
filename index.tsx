import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log("Starting Pratejra RAG Application...");

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Critical: Could not find root element to mount to");
  throw new Error("Could not find root element to mount to");
}

// Clear any previous error messages injected by index.html error handler
rootElement.innerHTML = '';

try {
  console.log("Creating React Root...");
  const root = ReactDOM.createRoot(rootElement);
  
  console.log("Rendering App...");
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log("Render signal sent.");
} catch (error) {
  console.error("Failed to mount React application:", error);
  rootElement.innerHTML = `<div style="padding: 20px; color: red;">Failed to start application: ${error instanceof Error ? error.message : String(error)}</div>`;
}
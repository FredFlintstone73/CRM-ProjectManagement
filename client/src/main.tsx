import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Add error handling and basic test
console.log('Main.tsx loading...');

// Test basic JavaScript execution
window.addEventListener('load', () => {
  console.log('Window loaded, JavaScript is working');
  
  // Add a global test function
  (window as any).testClick = () => {
    console.log('Global test function called!');
    alert('Global test works!');
  };
  
  // Test basic click detection
  document.addEventListener('click', (e) => {
    console.log('MAIN.TSX: Click detected on', e.target);
  });
});

try {
  console.log('Creating React root...');
  createRoot(document.getElementById("root")!).render(<App />);
  console.log('React app rendered successfully');
} catch (error) {
  console.error('Error rendering React app:', error);
  // Fallback: create basic HTML
  document.body.innerHTML = `
    <div style="padding: 20px;">
      <h1>Fallback Mode</h1>
      <button onclick="alert('Basic button works!')">Test Basic Button</button>
      <button onclick="window.testClick()">Test Global Function</button>
      <p>Error: ${error}</p>
    </div>
  `;
}

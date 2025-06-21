// Main application entry point - refactored modular architecture
import AppController from './appController.js';

// Add clever Copy JSON to clipboard feature
window.addEventListener('DOMContentLoaded', () => {
  const copyBtn = document.getElementById('copyJsonBtn');
  const outputJson = document.getElementById('outputJson');
  if (copyBtn && outputJson) {
    copyBtn.addEventListener('click', () => {
      const text = outputJson.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1200);
        }, () => {
          copyBtn.textContent = 'Failed!';
          setTimeout(() => { copyBtn.textContent = 'Copy JSON'; }, 1200);
        });
      }
    });
  }
});

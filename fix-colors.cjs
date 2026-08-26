const fs = require('fs');

function fixColors(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  
  // Replace text colors with CSS variables
  text = text.replace(/color:\s*'#f8fafc'/g, "color: 'var(--text-primary)'");
  text = text.replace(/color:\s*'#cbd5e1'/g, "color: 'var(--text-secondary)'");
  text = text.replace(/color:\s*'#94a3b8'/g, "color: 'var(--text-muted)'");
  text = text.replace(/color:\s*'#64748b'/g, "color: 'var(--text-muted)'");
  
  text = text.replace(/color:\s*'#6ee7b7'/g, "color: 'var(--text-status-success)'");
  text = text.replace(/color:\s*'#fca5a5'/g, "color: 'var(--text-status-danger)'");
  text = text.replace(/color:\s*'#fbbf24'/g, "color: 'var(--text-status-warning)'");
  text = text.replace(/color:\s*'#93c5fd'/g, "color: 'var(--text-status-info)'");
  text = text.replace(/color:\s*'#c084fc'/g, "color: 'var(--text-status-purple)'");
  text = text.replace(/color:\s*'#67e8f9'/g, "color: 'var(--text-status-cyan)'");
  text = text.replace(/color:\s*'#38bdf8'/g, "color: 'var(--text-status-cyan)'");
  text = text.replace(/color:\s*'#a78bfa'/g, "color: 'var(--text-status-purple)'");
  
  // Replace white/black overlays
  text = text.replace(/background:\s*'rgba\\(255,255,255,0.1\\)'/g, "background: 'var(--overlay-10)'");
  text = text.replace(/background:\s*'rgba\\(255,255,255,0.2\\)'/g, "background: 'var(--overlay-20)'");
  text = text.replace(/border:\s*'1px solid rgba\\(255,255,255,0.2\\)'/g, "border: '1px solid var(--border-strong)'");
  
  fs.writeFileSync(filePath, text);
}

fixColors('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/Planning.jsx');
fixColors('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/App.jsx');
fixColors('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/DataExplorer.jsx');

console.log("Done");

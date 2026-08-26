const fs = require('fs');

function fixStragglers(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  
  // Replace remaining white text
  text = text.replace(/'#f8fafc'/g, "'var(--text-primary)'");
  text = text.replace(/'#fff'/g, "'var(--text-primary)'");
  
  // Replace remaining light gray text
  text = text.replace(/'#cbd5e1'/g, "'var(--text-secondary)'");
  text = text.replace(/'#94a3b8'/g, "'var(--text-muted)'");
  text = text.replace(/'#64748b'/g, "'var(--text-muted)'");
  
  // Update status colors in ternary operators
  text = text.replace(/'#c084fc'/g, "'var(--text-status-purple)'");
  text = text.replace(/'#fbbf24'/g, "'var(--text-status-warning)'");
  text = text.replace(/'#38bdf8'/g, "'var(--text-status-cyan)'");
  text = text.replace(/'#6ee7b7'/g, "'var(--text-status-success)'");
  
  // For icons and strong badges, keep #ef4444, #f59e0b, #3b82f6, #10b981
  // because they usually look good in both modes. But text-specific statuses can be replaced.
  // Actually, replacing #ef4444 with var(--color-danger) might be safer, but let's leave it as is if it's fine.
  
  fs.writeFileSync(filePath, text);
}

fixStragglers('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/Planning.jsx');
fixStragglers('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/App.jsx');
fixStragglers('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/DataExplorer.jsx');

console.log("Done");

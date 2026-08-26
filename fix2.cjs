const fs = require('fs');
const file = 'c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/Dashboard.jsx';
let text = fs.readFileSync(file, 'utf8');

text = text.replace(/linear-gradient\\(145deg, rgba\\(59,130,246,0.15\\) 0%, var\\(--overlay-black-20\\) 100%\\)/g, 'var(--card-gradient-1)');
text = text.replace(/linear-gradient\\(145deg, rgba\\(245,158,11,0.12\\) 0%, var\\(--overlay-black-20\\) 100%\\)/g, 'var(--card-gradient-2)');
text = text.replace(/linear-gradient\\(145deg, rgba\\(239,68,68,0.12\\) 0%, var\\(--overlay-black-20\\) 100%\\)/g, 'var(--card-gradient-3-danger)');
text = text.replace(/linear-gradient\\(145deg, rgba\\(16,185,129,0.12\\) 0%, var\\(--overlay-black-20\\) 100%\\)/g, 'var(--card-gradient-3-success)');
text = text.replace(/linear-gradient\\(145deg, rgba\\(6,182,212,0.12\\) 0%, var\\(--overlay-black-20\\) 100%\\)/g, 'var(--card-gradient-4)');

text = text.replace(/color:\s*'#e2e8f0'/g, "color: 'var(--text-secondary)'");
text = text.replace(/color:\s*isHighCompliance\s*\?\s*'#fca5a5'\s*:\s*'#6ee7b7'/g, "color: isHighCompliance ? '#ef4444' : '#10b981'");
text = text.replace(/color:\s*'#94a3b8'/g, "color: 'var(--text-secondary)'");

fs.writeFileSync(file, text);
console.log("Done");

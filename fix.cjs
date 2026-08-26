const fs = require('fs');
const file = 'c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/Dashboard.jsx';
let text = fs.readFileSync(file, 'utf8');
text = text.replace(/color:\s*'#f8fafc'/g, "color: 'var(--text-primary)'");
text = text.replace(/fill="#f8fafc"/g, 'fill="var(--text-primary)"');
text = text.replace(/color:\s*'rgba\\(255,255,255,0.4\\)'/g, "color: 'var(--text-secondary)'");
fs.writeFileSync(file, text);
console.log("Done");

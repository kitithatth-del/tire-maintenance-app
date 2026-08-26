const fs = require('fs');
let css = fs.readFileSync('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/index.css', 'utf8');
const rootVars = `
  --text-status-success: #6ee7b7;
  --text-status-danger: #fca5a5;
  --text-status-warning: #fbbf24;
  --text-status-info: #93c5fd;
  --text-status-purple: #c084fc;
  --text-status-cyan: #67e8f9;
  --text-muted: #94a3b8;
`;
const lightVars = `
  --text-status-success: #059669;
  --text-status-danger: #dc2626;
  --text-status-warning: #d97706;
  --text-status-info: #2563eb;
  --text-status-purple: #7c3aed;
  --text-status-cyan: #0891b2;
  --text-muted: #64748b;
`;
css = css.replace('--bg-primary: #0f172a;', rootVars + '\n  --bg-primary: #0f172a;');
css = css.replace('--bg-primary: #e2e8f0;', lightVars + '\n  --bg-primary: #e2e8f0;');
fs.writeFileSync('c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/index.css', css);
console.log("Done");

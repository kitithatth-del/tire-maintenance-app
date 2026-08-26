const fs = require('fs');
const file = 'c:/Users/Kitithat/.gemini/antigravity/scratch/tire-maintenance-app/src/components/Planning.jsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
const replacement = `          <button onClick={resetFilters} title="รีเซ็ตตัวกรอง" style={{ ...selectStyle, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Dashboard View */}
        {viewMode === 'dashboard' ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Top Bar Chart: Maintenance & Planning Overview */}
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'var(--overlay-black-30)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ภาพรวมความเร่งด่วนแผนการเปลี่ยนยาง</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>แบ่งตามสังกัดรถและเดือนที่ต้องเปลี่ยน</div>
                </div>
                <div style={{ display: 'flex', background: 'var(--overlay-05)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-light)' }}>
                  <button onClick={() => setChartGroupBy('fleet')} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', background: chartGroupBy === 'fleet' ? 'rgba(59,130,246,0.2)' : 'transparent', color: chartGroupBy === 'fleet' ? '#60a5fa' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}>ตามสังกัด</button>`;

lines.splice(1679, 34, replacement);
fs.writeFileSync(file, lines.join('\n'));
console.log('Done');

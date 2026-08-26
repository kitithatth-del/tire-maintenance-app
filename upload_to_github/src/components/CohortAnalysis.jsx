import React, { useState, useMemo, useEffect } from 'react';
import { processCohortData } from '../utils/dataParser';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ZAxis } from 'recharts';
import { Filter, AlertTriangle, TrendingDown, Target, Info } from 'lucide-react';

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
        borderRadius: '12px', padding: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        minWidth: '220px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{data.truckNo}</strong>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--overlay-05)', padding: '2px 8px', borderRadius: '12px' }}>{data.fleet}</span>
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          <div>ตำแหน่ง {data.position} • {data.brand}</div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ color: 'var(--text-muted)' }}>รหัสยาง:</span> <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{data.serialNumber || '-'}</span>
          </div>
          <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>ติดตั้งเมื่อ:</span> {data.installDate}
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>วิ่งไปแล้ว</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{(data.drivenKm / 1000).toFixed(1)}k <span style={{ fontSize: '0.7rem' }}>km</span></div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ดอกยางเหลือ</div>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{data.currentTread} <span style={{ fontSize: '0.7rem' }}>มม.</span></div>
          </div>
        </div>

        <div style={{ 
          background: data.isAnomaly ? 'rgba(239,68,68,0.1)' : 'var(--overlay-05)', 
          padding: '8px', borderRadius: '8px', 
          borderLeft: `3px solid ${data.isAnomaly ? '#ef4444' : '#10b981'}` 
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>อัตราสึกหรอ (มม./หมื่นกม.)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: data.isAnomaly ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '1.1rem' }}>{data.wearRate}</span>
            {data.isAnomaly && <AlertTriangle size={14} color="#ef4444" />}
          </div>
          {data.isAnomaly && (
            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '4px' }}>
              สาเหตุ: {data.anomalyReason}
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const CohortAnalysis = ({ rawData, truckMetadata }) => {
  const cohortData = useMemo(() => processCohortData(rawData, truckMetadata), [rawData, truckMetadata]);

  const types = [...new Set(cohortData.map(d => d.type))].filter(Boolean);
  const positions = [...new Set(cohortData.map(d => d.position))].filter(p => p !== null).sort((a,b) => {
    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    if (!isNaN(numA)) return -1;
    if (!isNaN(numB)) return 1;
    return String(a).localeCompare(String(b));
  });

  const [filterType, setFilterType] = useState(types.length > 0 ? types[0] : '');
  const [filterPos, setFilterPos] = useState(positions.length > 0 ? positions[0] : 1);
  
  // Ensure filters are valid when data changes
  useEffect(() => {
    if (types.length > 0 && !types.includes(filterType)) setFilterType(types[0]);
    if (positions.length > 0 && !positions.includes(filterPos)) setFilterPos(positions[0]);
  }, [types, positions, filterType, filterPos]);

  const filteredData = useMemo(() => {
    return cohortData.filter(d => d.type === filterType && String(d.position) === String(filterPos));
  }, [cohortData, filterType, filterPos]);

  const avgWearRate = useMemo(() => {
    if (filteredData.length === 0) return 0;
    const sum = filteredData.reduce((acc, val) => acc + val.wearRate, 0);
    return (sum / filteredData.length).toFixed(2);
  }, [filteredData]);

  // Sort for leaderboard
  const sortedByWear = [...filteredData].sort((a, b) => a.wearRate - b.wearRate);
  const bestPerformers = sortedByWear.slice(0, 3);
  const worstPerformers = sortedByWear.slice(-3).reverse(); // highest wear first

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header & Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
            การวิเคราะห์กลุ่มยาง (Cohort Analysis)
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            เปรียบเทียบอัตราการสึกหรอของยางในตำแหน่งเดียวกัน เพื่อหาสาเหตุความผิดปกติ
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', background: 'var(--bg-card)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-light)', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={16} color="var(--text-muted)" />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ประเภทรถ:</span>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 8px', outline: 'none' }}
            >
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>ตำแหน่ง:</span>
            <select 
              value={filterPos} 
              onChange={e => setFilterPos(Number(e.target.value))}
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', color: 'var(--text-primary)', borderRadius: '6px', padding: '4px 8px', outline: 'none' }}
            >
              {positions.map(p => <option key={p} value={p}>ตำแหน่งที่ {p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {cohortData.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Info size={48} color="var(--text-muted)" style={{ marginBottom: '1rem', display: 'inline-block' }} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ยังไม่มีข้อมูลวงจรชีวิตยางที่สมบูรณ์</h3>
          <p style={{ margin: 0 }}>ระบบต้องการข้อมูลยางที่มีทั้งประวัติ "การติดตั้ง" และ "การถอด" เพื่อคำนวณอัตราการสึกหรอที่แท้จริง</p>
        </div>
      ) : (
        <>
          {/* Main Chart Area */}
          <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>อัตราการสึกหรอเทียบระยะทาง</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>แกน X: ระยะทางที่วิ่งไป (km) | แกน Y: ดอกยางที่เหลือ (mm)</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '10px', border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ค่าเฉลี่ยกลุ่มนี้:</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-primary)' }}>{avgWearRate} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>มม./หมื่นกม.</span></div>
          </div>
        </div>

        <div style={{ height: 400, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-light)" />
              <XAxis 
                type="number" 
                dataKey="drivenKm" 
                name="Mileage" 
                tickFormatter={(v) => `${v/1000}k`}
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                domain={['auto', 'auto']}
              />
              <YAxis 
                type="number" 
                dataKey="currentTread" 
                name="Tread" 
                stroke="var(--text-muted)"
                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                domain={[0, 16]}
              />
              <ZAxis type="number" range={[80, 80]} />
              <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              
              <Scatter 
                name="Normal" 
                data={filteredData.filter(d => !d.isAnomaly)} 
                fill="var(--accent-primary)" 
                opacity={0.6}
              />
              <Scatter 
                name="Anomaly" 
                data={filteredData.filter(d => d.isAnomaly)} 
                fill="#ef4444" 
                opacity={0.9}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard Area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Best Performers */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Target size={20} color="#10b981" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>ถนอมยางดีเด่น (Top 3)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>อัตราสึกหรอต่ำสุดในกลุ่ม</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {bestPerformers.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--overlay-10)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{d.truckNo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{d.brand || 'Unknown'} • รหัสยาง: <span style={{fontFamily: 'monospace'}}>{d.serialNumber || '-'}</span><br/>ติดตั้ง: {d.installDate}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>{Number(d.wearRate).toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>มม./หมื่นกม.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worst Performers (Anomalies) */}
        <div style={{ background: 'var(--bg-card)', borderRadius: '20px', border: '1px solid var(--border-light)', padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={20} color="#ef4444" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>กินยางผิดปกติ (Bottom 3)</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>ควรตรวจสอบช่วงล่างหรือพฤติกรรมขับขี่</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {worstPerformers.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', borderLeft: '4px solid #ef4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{d.truckNo}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>รหัสยาง: <span style={{fontFamily: 'monospace'}}>{d.serialNumber || '-'}</span> • ติดตั้ง: {d.installDate} <br/> {d.anomalyReason || 'ไม่ทราบสาเหตุ'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.1rem' }}>{Number(d.wearRate).toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>มม./หมื่นกม.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
        </>
      )}
    </div>
  );
};

export default CohortAnalysis;

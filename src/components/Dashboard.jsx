import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell,
  Legend, ReferenceLine, LabelList, AreaChart, Area
} from 'recharts';
import { Wrench, AlertTriangle, Target, Recycle, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { getDashboardStats } from '../utils/dataParser';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: 'var(--glass-bg)', border: '1px solid var(--border-medium)',
      borderRadius: '10px', padding: '0.75rem 1rem', boxShadow: 'var(--glass-shadow)',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontSize: '0.9rem', fontWeight: 600 }}>
          {p.name}: {p.value}{p.name.includes('%') ? '%' : ''}
        </p>
      ))}
    </div>
  );
};

const Dashboard = ({ stats }) => {
  const s = stats;
  const isHighCompliance = s.complianceRate > 6;
  const sortedReasons = [...s.reasonsChart].sort((a, b) => b.value - a.value); // Sort highest first for bar chart

  return (
    <div className="dashboard-container">

      {/* KPI Cards */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* Card 1: Total Removed */}
        <div className="glass-panel kpi-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: '#ffffff', border: 'none', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ยางถอดทั้งหมด</div>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#ffffff', backdropFilter: 'blur(4px)' }}>
              <Wrench size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.25rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>
            {s.totalRemoved.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>เส้น</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', position: 'relative', zIndex: 1 }}>จำนวนยางที่ถูกถอดเปลี่ยนสะสม</div>
        </div>

        {/* Card 2: < 2mm */}
        <div className="glass-panel kpi-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#ffffff', border: 'none', boxShadow: '0 10px 15px -3px rgba(217, 119, 6, 0.4), 0 4px 6px -2px rgba(217, 119, 6, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>ดอกยาง &lt; 2 มม.</div>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#ffffff', backdropFilter: 'blur(4px)' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.25rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>
            {s.totalNonCompliant.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>เส้น</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', position: 'relative', zIndex: 1 }}>ยางที่ถอดแล้วดอกต่ำกว่าเกณฑ์</div>
        </div>

        {/* Card 3: % Non-Compliance */}
        <div className="glass-panel kpi-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: isHighCompliance ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', boxShadow: isHighCompliance ? '0 10px 15px -3px rgba(220, 38, 38, 0.4), 0 4px 6px -2px rgba(220, 38, 38, 0.2)' : '0 10px 15px -3px rgba(5, 150, 105, 0.4), 0 4px 6px -2px rgba(5, 150, 105, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>% Non-Compliance</div>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#ffffff', backdropFilter: 'blur(4px)' }}>
              <Target size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.25rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>
            {s.complianceRate}%
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', position: 'relative', zIndex: 1 }}>
            {isHighCompliance ? 'เกินเป้าหมาย (กำหนด ≤ 6%)' : 'อยู่ในเกณฑ์เป้าหมาย (≤ 6%)'}
          </div>
        </div>

        {/* Card 4: Ready for Retread */}
        <div className="glass-panel kpi-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', border: 'none', boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.4), 0 4px 6px -2px rgba(5, 150, 105, 0.2)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>พร้อมส่งหล่อดอก</div>
            <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '0.5rem', borderRadius: '10px', color: '#ffffff', backdropFilter: 'blur(4px)' }}>
              <Recycle size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'baseline', gap: '0.25rem', lineHeight: 1, position: 'relative', zIndex: 1 }}>
            {s.totalReadyForRetread.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>เส้น</span>
          </div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', position: 'relative', zIndex: 1 }}>ดอกยางที่เหลืออยู่ในช่วง 2–4 มม.</div>
        </div>
      </div>

      {/* Section 1: Trends */}
      <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1rem', marginTop: '2rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <TrendingUp size={20} color="var(--accent-primary)" /> ปริมาณและแนวโน้ม (Trends)
      </h2>
      <div className="charts-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            แนวโน้ม % Non-Compliance รายเดือน
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={s.monthlyTrend} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" domain={[0, dataMax => Math.max(12, Math.ceil((dataMax + 2) / 5) * 5)]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <ReferenceLine y={6} stroke="#f59e0b" strokeDasharray="5 4" label={{ value: 'เป้า 6%', fill: '#f59e0b', fontSize: 11, position: 'insideTopRight' }} />
                <Area type="linear" dataKey="CompliancePercent" name="% NON-COMPLIANCE"
                  stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorCompliance)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ยอดถอดรายเดือน (Compliant vs Non-Compliant)
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={s.monthlyTrend} margin={{ top: 10, right: 15, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} iconType="circle" />
                <Bar dataKey="Compliant" name="ผ่านเกณฑ์ (≥2มม.)" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} stroke="var(--glass-bg)" strokeWidth={1} />
                <Bar dataKey="NonCompliant" name="ต่ำกว่าเกณฑ์ (<2มม.)" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} stroke="var(--glass-bg)" strokeWidth={1} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Section 2: Deep Dive */}
      <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '1rem', marginTop: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <PieChartIcon size={20} color="var(--accent-primary)" /> วิเคราะห์เจาะลึก (Analysis)
      </h2>
      <div className="charts-grid">
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            สาเหตุการถอดยาง (เรียงตามลำดับ)
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedReasons} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" opacity={0.5} horizontal={false} />
                <XAxis type="number" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="var(--text-secondary)" tick={{ fontSize: 11 }} width={90} interval={0} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--overlay-05)' }} />
                <Bar dataKey="value" name="จำนวน (เส้น)" radius={[0, 6, 6, 0]} barSize={24}>
                  {sortedReasons.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="right" 
                    formatter={(value) => s.totalRemoved ? `${value.toLocaleString()} (${((value / s.totalRemoved) * 100).toFixed(0)}%)` : value} 
                    fill="var(--text-secondary)" 
                    fontSize={11} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            สถานะยางหลังถอด (Exit Status)
          </h3>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 25, right: 20, bottom: 5, left: 20 }}>
                <Pie data={s.exitStatusChart} cx="50%" cy="50%" innerRadius={65} outerRadius={85}
                  paddingAngle={0} dataKey="value" stroke="var(--glass-bg)" strokeWidth={3}
                  label={({ percent }) => percent > 0.03 ? `${(percent * 100).toFixed(0)}%` : ''} 
                  labelLine={false}
                >
                  {s.exitStatusChart.map((_, index) => (
                    <Cell key={`e-${index}`} fill={['#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6'][index % 5]} />
                  ))}
                </Pie>
                <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-primary)" fontSize="26" fontWeight="bold">
                  {s.totalRemoved.toLocaleString()}
                </text>
                <text x="50%" y="58%" textAnchor="middle" dominantBaseline="middle" fill="var(--text-secondary)" fontSize="13">
                  เส้น
                </text>
                <RechartsTooltip contentStyle={{ background: 'var(--glass-bg)', border: '1px solid var(--border-medium)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-primary)' }} />
                <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '12px', paddingTop: '15px' }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

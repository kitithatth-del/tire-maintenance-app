import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Filter, RefreshCw, ClipboardList, CheckCircle, Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { buildRequisitionData, buildEfficiencyChartData, getFuelPeriods, getRequisitionCenters } from '../utils/requisitionUtils';

const fmt = (n) => n != null ? Number(n).toLocaleString('th-TH') : '-';
const fmtDec = (n, d = 2) => n != null && n > 0 ? Number(n).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d }) : '-';

const TREAD_CRITICAL = 4;
const TREAD_WARNING = 6;

function TreadBadge({ avg }) {
  if (!avg || avg <= 0) return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
  const color = avg < TREAD_CRITICAL ? '#ef4444' : avg < TREAD_WARNING ? '#f59e0b' : '#10b981';
  return (
    <span style={{
      display: 'inline-block', padding: '0.15rem 0.5rem',
      borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
      background: color + '22', color, border: `1px solid ${color}55`
    }}>
      {avg} มม.
    </span>
  );
}

function SummaryCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
      border: `1px solid ${color}44`,
      borderRadius: '16px', padding: '1.25rem 1.5rem',
      display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '160px'
    }}>
      <div style={{
        width: '48px', height: '48px', borderRadius: '12px',
        background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        {React.cloneElement(icon, { size: 22, color })}
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', opacity: 0.7 }}>{sub}</div>}
      </div>
    </div>
  );
}

const CHART_COLORS = {
  'สิบล้อ ระยะทางวิ่ง เฉลี่ย(km)': '#3b82f6',
  'สิบล้อ ระยะทางวิ่ง เฉลี่ย(km/mm)': '#f97316',
  'เทรลเลอร์ ระยะทางวิ่ง เฉลี่ย(km)': '#f59e0b',
  'เทรลเลอร์ ระยะทางวิ่ง เฉลี่ย(km/mm)': '#10b981',
};

export default function Requisition({ rawData, fuelData }) {
  const periods = useMemo(() => getFuelPeriods(fuelData, rawData), [fuelData, rawData]);
  const centers = useMemo(() => getRequisitionCenters(rawData), [rawData]);

  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedCenter, setSelectedCenter] = useState('');

  useEffect(() => {
    if (periods.length > 0 && !selectedMonth && !selectedYear) {
      const latestPeriod = periods[periods.length - 1];
      setSelectedMonth(latestPeriod.month);
      setSelectedYear(latestPeriod.year);
    }
  }, [periods, selectedMonth, selectedYear]);

  const rows = useMemo(() => {
    if (!selectedMonth || !selectedYear) return [];
    return buildRequisitionData(rawData, fuelData, selectedMonth, selectedYear, selectedCenter);
  }, [rawData, fuelData, selectedMonth, selectedYear, selectedCenter]);

  const chartData = useMemo(() => buildEfficiencyChartData(rows), [rows]);

  // Summary stats
  const totalNew = rows.reduce((s, r) => s + r.isNew, 0);
  const totalRetread = rows.reduce((s, r) => s + r.isRetreaded, 0);
  const totalCritical = rows.filter(r => r.avgTread > 0 && r.avgTread < TREAD_CRITICAL).length;
  const avgKmPerMm = rows.filter(r => r.kmPerMm > 0).length > 0
    ? Math.round(rows.filter(r => r.kmPerMm > 0).reduce((s, r) => s + r.kmPerMm, 0) / rows.filter(r => r.kmPerMm > 0).length)
    : 0;

  // Group by truck for table display
  const truckGroups = useMemo(() => {
    const groups = {};
    rows.forEach(r => {
      if (!groups[r.truck]) groups[r.truck] = [];
      groups[r.truck].push(r);
    });
    return groups;
  }, [rows]);

  const noData = !selectedMonth || !selectedYear;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '0.25rem 0' }}>

      {/* Filter Bar */}
      <div className="glass-panel" style={{ padding: '1rem 1.5rem', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Filter size={16} />
            <span>ตัวกรอง:</span>
          </div>

          <select
            style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none', minWidth: '120px' }}
            value={`${selectedMonth}|${selectedYear}`}
            onChange={e => {
              const [m, y] = e.target.value.split('|');
              setSelectedMonth(Number(m));
              setSelectedYear(Number(y));
            }}
          >
            <option value="|">-- เลือกเดือน/ปี --</option>
            {periods.map(p => (
              <option key={p.label} value={`${p.month}|${p.year}`}>เดือน {p.label}</option>
            ))}
          </select>

          <select
            style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none', minWidth: '180px' }}
            value={selectedCenter}
            onChange={e => setSelectedCenter(e.target.value)}
          >
            <option value="">ทุกศูนย์บริการ</option>
            {centers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={() => { setSelectedCenter(''); }}
            style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
          >
            <RefreshCw size={14} /> รีเซ็ต
          </button>

          {rows.length > 0 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              แสดง {rows.length} เส้น / {Object.keys(truckGroups).length} คัน
            </span>
          )}
        </div>
      </div>

      {noData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '1rem', opacity: 0.5 }}>
          <ClipboardList size={56} color="var(--text-secondary)" />
          <p style={{ color: 'var(--text-secondary)' }}>กรุณาเลือกเดือน/ปีเพื่อดูข้อมูล</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <SummaryCard icon={<Package />} label="ยางแท้ทั้งหมด" value={totalNew} sub="เส้น" color="#3b82f6" />
            <SummaryCard icon={<RefreshCw />} label="ยางหล่อดอก" value={totalRetread} sub="เส้น" color="#8b5cf6" />
            <SummaryCard icon={<AlertTriangle />} label="ดอกยาง < 4 มม." value={totalCritical} sub="เส้น (วิกฤต)" color="#ef4444" />
            <SummaryCard icon={<TrendingUp />} label="กม./มิล เฉลี่ย" value={fmt(avgKmPerMm)} sub="กม./มิล" color="#10b981" />
          </div>

          {/* Efficiency Bar Chart */}
          {chartData.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={18} color="#10b981" />
                ประสิทธิภาพยาง (แยกตามขนาด/ยี่ห้อ)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                    angle={-20} textAnchor="end" interval={0}
                  />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} tickFormatter={v => v > 0 ? v.toLocaleString('th-TH') : v} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-medium)', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(v, name) => [v.toLocaleString('th-TH'), name]}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.78rem', paddingTop: '10px' }} />
                  {Object.entries(CHART_COLORS).map(([key, color]) => (
                    <Bar key={key} dataKey={key} fill={color} radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: color, formatter: v => v > 0 ? v.toLocaleString('th-TH') : '' }} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detail Table */}
          <div className="glass-panel" style={{ padding: '1.5rem', overflow: 'auto' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardList size={18} color="#3b82f6" />
              รายละเอียดยาง
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '1100px' }}>
              <thead>
                <tr>
                  {/* Row 1 - group headers */}
                  <th rowSpan={2} style={thStyle()}>เบอร์รถ</th>
                  <th rowSpan={2} style={thStyle()}>ตำแหน่ง</th>
                  <th rowSpan={2} style={thStyle()}>หมายเลขยาง</th>
                  <th style={thStyle('#3b82f633')}>ยางแท้</th>
                  <th style={thStyle('#8b5cf633')}>หล่อดอก</th>
                  <th colSpan={5} style={thStyle('#10b98122')}>วัดความลึกดอกยาง (มม.)</th>
                  <th colSpan={2} style={thStyle('#f59e0b22')}>เลขไมล์</th>
                  <th rowSpan={2} style={thStyle()}>ไมล์ติดตั้ง</th>
                  <th rowSpan={2} style={thStyle()}>กม.ที่วิ่ง</th>
                  <th rowSpan={2} style={thStyle()}>มิลใช้ไป</th>
                  <th rowSpan={2} style={thStyle()}>กม./มิล</th>
                  <th rowSpan={2} style={thStyle()}>กม.ที่ควรวิ่ง</th>
                  <th rowSpan={2} style={thStyle()}>ขนาด</th>
                </tr>
                <tr>
                  <th style={thStyle('#3b82f633')}>11R22.5</th>
                  <th style={thStyle('#8b5cf633')}>11R22.5</th>
                  <th style={thStyle('#10b98122')}>D1</th>
                  <th style={thStyle('#10b98122')}>D2</th>
                  <th style={thStyle('#10b98122')}>D3</th>
                  <th style={thStyle('#10b98122')}>D4</th>
                  <th style={thStyle('#10b98122')}>คงเหลือ</th>
                  <th style={thStyle('#f59e0b22')}>เดือนก่อน</th>
                  <th style={thStyle('#f59e0b22')}>เดือนนี้</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(truckGroups).map(([truck, tireRows]) => {
                  const totalDist = tireRows.reduce((s, r) => s + (r.distanceDriven || 0), 0);
                  return (
                    <React.Fragment key={truck}>
                      {tireRows.map((row, idx) => {
                        const isWarn = row.avgTread > 0 && row.avgTread < TREAD_WARNING;
                        const isCrit = row.avgTread > 0 && row.avgTread < TREAD_CRITICAL;
                        const rowBg = isCrit ? 'rgba(239,68,68,0.08)' : isWarn ? 'rgba(245,158,11,0.07)' : 'transparent';
                        return (
                          <tr key={row.tireNumber + row.position} style={{ background: rowBg, borderBottom: '1px solid var(--border-light)' }}>
                            <td style={tdStyle('center')}>{idx === 0 ? truck : ''}</td>
                            <td style={tdStyle('center')}>{row.position}</td>
                            <td style={tdStyle()}>{row.tireNumber}</td>
                            <td style={tdStyle('center')}>{row.isNew ? '✓' : ''}</td>
                            <td style={tdStyle('center')}>{row.isRetreaded ? '✓' : ''}</td>
                            <td style={tdStyle('center')}>{row.d1 || '-'}</td>
                            <td style={tdStyle('center')}>{row.d2 || '-'}</td>
                            <td style={tdStyle('center')}>{row.d3 || '-'}</td>
                            <td style={tdStyle('center')}>{row.d4 || '-'}</td>
                            <td style={tdStyle('center')}><TreadBadge avg={row.avgTread} /></td>
                            <td style={tdStyle('right')}>{fmt(row.prevMile)}</td>
                            <td style={tdStyle('right')}>{fmt(row.currentMile)}</td>
                            <td style={tdStyle('right')}>{fmt(row.installMile)}</td>
                            <td style={tdStyle('right')}>{fmt(row.distanceDriven)}</td>
                            <td style={tdStyle('center')}>{fmtDec(row.mmUsed)}</td>
                            <td style={tdStyle('right')}>{fmt(row.kmPerMm)}</td>
                            <td style={tdStyle('right')}>{fmt(row.expectedKm)}</td>
                            <td style={tdStyle('center')}>{row.tireSize}</td>
                          </tr>
                        );
                      })}
                      {/* Subtotal row per truck */}
                      <tr style={{ background: 'rgba(59,130,246,0.07)', borderBottom: '2px solid var(--border-medium)', fontWeight: 700 }}>
                        <td colSpan={10} style={{ ...tdStyle('right'), color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                          รวมระยะวิ่ง ({truck}):
                        </td>
                        <td colSpan={2} />
                        <td />
                        <td style={tdStyle('right', '#3b82f6')}>{fmt(totalDist)}</td>
                        <td colSpan={4} />
                      </tr>
                    </React.Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={18} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                      ไม่พบข้อมูลยางในเดือนที่เลือก
                    </td>
                  </tr>
                )}
              </tbody>
              {/* Grand total */}
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'rgba(16,185,129,0.1)', fontWeight: 800, borderTop: '2px solid var(--border-medium)' }}>
                    <td colSpan={3} style={{ ...tdStyle('right'), color: 'var(--text-secondary)' }}>ยอดรวม</td>
                    <td style={tdStyle('center', '#3b82f6')}>{totalNew}</td>
                    <td style={tdStyle('center', '#8b5cf6')}>{totalRetread}</td>
                    <td colSpan={13} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function thStyle(bg) {
  return {
    padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700,
    background: bg || 'var(--overlay-black-20)', borderBottom: '2px solid var(--border-medium)',
    borderRight: '1px solid var(--border-light)', color: 'var(--text-primary)',
    whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 1,
  };
}

function tdStyle(align = 'left', color) {
  return {
    padding: '0.45rem 0.75rem', textAlign: align, whiteSpace: 'nowrap',
    color: color || 'var(--text-primary)', borderRight: '1px solid var(--border-light)',
  };
}

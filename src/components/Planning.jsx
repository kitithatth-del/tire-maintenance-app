import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CalendarClock, AlertTriangle, Clock, CheckCircle, ShieldCheck, Download, Filter, RefreshCw, ChevronLeft, ChevronRight, BarChart2, X, Navigation, Settings, MapPin, Truck, LayoutGrid, List, Search, ArrowLeftRight, RotateCcw, HelpCircle, AlertOctagon, Wrench } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { th } from 'date-fns/locale';
import { getTruckStatusStyle, normalizeTruckId, getVehicleTypeBadge, generateRotationAdvice } from '../utils/dataParser';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import PlateTimelineModal from './PlateTimelineModal';

// Wear Pattern Analyzer (Context-Aware by Tire Position)
const analyzeTireWear = (d1, d2, d3, d4, pos) => {
  if (d1 == null || d2 == null || d3 == null || d4 == null) return null;
  const numD1 = Number(d1); const numD2 = Number(d2); const numD3 = Number(d3); const numD4 = Number(d4);
  if (isNaN(numD1) || isNaN(numD2) || isNaN(numD3) || isNaN(numD4)) return null;

  const numPos = parseInt(pos, 10);
  const isSteer = numPos === 1 || numPos === 2;
  const innerPositions = [4, 5, 8, 9, 12, 13, 16, 17, 20, 21];
  const outerPositions = [3, 6, 7, 10, 11, 14, 15, 18, 19, 22];
  const rightPositions = [2, 5, 6, 9, 10, 13, 14, 17, 18, 21, 22]; // Right side of the truck
  const isInnerDual = !isNaN(numPos) && innerPositions.includes(numPos);
  const isOuterDual = !isNaN(numPos) && outerPositions.includes(numPos);
  const isRightSide = !isNaN(numPos) && rightPositions.includes(numPos);

  const issues = [];

  // 1. Center Wear (Over-inflated)
  if (Math.min(numD1, numD4) - Math.max(numD2, numD3) >= 1) {
    issues.push({ text: 'สึกตรงกลาง (ลมแข็ง)', color: '#f59e0b', type: 'warning' });
  }
  // 2. Edge Wear (Under-inflated)
  else if (Math.min(numD2, numD3) - Math.max(numD1, numD4) >= 1) {
    issues.push({ text: 'สึกสองข้าง (ลมอ่อน)', color: '#f59e0b', type: 'warning' });
  }

  // Determine Inner vs Outer Wear dynamically based on vehicle side
  // Left side: D1 is Outer, D4 is Inner
  // Right side: D1 is Inner, D4 is Outer
  const innerDiff = isRightSide ? (numD4 - numD1) : (numD1 - numD4);
  const outerDiff = isRightSide ? (numD1 - numD4) : (numD4 - numD1);

  // 3. Inner Wear (Alignment / Axle Flex) - Inner edge is shallower
  if (innerDiff >= 1.5) {
    issues.push({ text: 'กินขอบใน (เพลา/ศูนย์ล้อ)', color: '#ef4444', type: 'critical' });
  }
  // 4. Outer Wear (Camber / Road Crown) - Outer edge is shallower
  else if (outerDiff >= 1.5) {
    issues.push({ text: 'กินขอบนอก (มุมแคมเบอร์)', color: '#ef4444', type: 'critical' });
  }

  const maxAdjDiff = Math.max(Math.abs(numD1 - numD2), Math.abs(numD2 - numD3), Math.abs(numD3 - numD4));

  // 5. Block/Cupping Wear (Out of balance) - Zigzag/Alternating pattern
  const isZigzag = (numD1 > numD2 && numD3 > numD2 && numD3 > numD4) || (numD2 > numD1 && numD2 > numD3 && numD4 > numD3);
  if (isZigzag && maxAdjDiff >= 1.5) {
    issues.push({ text: 'สึกฟันปลา (ไม่ได้ถ่วงล้อ)', color: '#ef4444', type: 'critical' });
  }
  // 6. Patchy/Uneven Wear (Suspension damaged)
  else if (maxAdjDiff >= 2.5 && issues.length === 0) {
    issues.push({ text: 'สึกไม่สม่ำเสมอ (ช่วงล่าง/โช้ค)', color: '#ef4444', type: 'critical' });
  }

  return issues.length > 0 ? issues : null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="bold" style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.8)' }}>
      {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
    </text>
  );
};

// Tread progress bar: new tires ~14-16mm, limit = 2mm
const TreadProgressBar = ({ current, initial = 16, limit = 2 }) => {
  const pct = Math.max(0, Math.min(100, ((current - limit) / (initial - limit)) * 100));
  const color = pct < 15 ? '#ef4444' : pct < 35 ? '#f59e0b' : '#10b981';
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        <span>{current} มม.</span>
        <span style={{ color: 'var(--text-muted)' }}>ขีดจำกัด: 2 มม.</span>
      </div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '999px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: '999px',
          background: `linear-gradient(90deg, ${color}aa, ${color})`,
          transition: 'width 0.8s ease',
          boxShadow: `0 0 8px ${color}88`,
        }} />
      </div>
    </div>
  );
};

const PriorityBadge = ({ days }) => {
  if (days === 0) return <span className="badge danger">⚠ หมดแล้ว</span>;
  if (days < 30) return <span className="badge danger">🔴 วิกฤต</span>;
  if (days < 90) return <span className="badge warning">🟡 เฝ้าระวัง</span>;
  return <span className="badge success">🟢 ปกติ</span>;
};

const WearStatsModal = ({ isOpen, onClose, wearRates }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-black-70)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>สถิติอัตราการสึกหรอ (Wear Rates)</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
          <div>
            <h4 style={{ color: 'var(--accent-secondary)' }}>อัตราสึกหรอ (มม. / 1,000 กม.)</h4>
            <p style={{ fontSize: '0.85rem' }}>ค่าเฉลี่ย: <strong>{(wearRates?.globalWearRatePerKm * 1000 || 0).toFixed(2)} มม.</strong></p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <table style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <thead><tr><th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>ตำแหน่งล้อ</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>อัตรา</th></tr></thead>
                <tbody>
                  {Object.entries(wearRates?.wearRateMapPerKm || {}).map(([pos, rate]) => (
                    <tr key={pos}><td>{pos}</td><td>{(rate * 1000).toFixed(2)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div>
            <h4 style={{ color: '#10b981' }}>การใช้งาน (กม. / วัน)</h4>
            <p style={{ fontSize: '0.85rem' }}>ค่าเฉลี่ยฟลีต: <strong>{(wearRates?.globalUsageRate || 0).toFixed(0)} กม.</strong></p>
            <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <table style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <thead><tr><th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>เบอร์รถ</th><th style={{ position: 'sticky', top: 0, background: 'var(--bg-card)' }}>อัตรา</th></tr></thead>
                <tbody>
                  {Object.entries(wearRates?.usageRateMap || {}).map(([truck, rate]) => (
                    <tr key={truck}><td>{truck}</td><td>{rate.toFixed(0)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const TireDot = React.memo(({ tire, partner, pos, onClick, isProblematic, hasCritical, chassisViewMode = 'tread', swapColor, hideBadges, swapLabel, disableTooltip, isRightSide = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const currentYYYY = new Date().getFullYear();
  const currentMM = new Date().getMonth() + 1;

  // ALL hooks must be called before any early returns (Rules of Hooks)
  const missingCheckMonths = useMemo(() => {
    if (!tire) return 0;
    let mm = parseInt(tire['MM'], 10);
    let yyyy = parseInt(tire['YYYY'], 10);
    if (!isNaN(mm) && !isNaN(yyyy)) {
      if (yyyy < 100) yyyy += 2000;
      else if (yyyy > 2400) yyyy -= 543;

      const diff = (currentYYYY - yyyy) * 12 + (currentMM - mm);
      return diff < 0 ? 0 : diff;
    }
    return 0;
  }, [tire, currentYYYY, currentMM]);

  const wearIssues = useMemo(() => {
    if (!tire) return null;
    const issues = analyzeTireWear(tire['D1_เข้า'], tire['D2_เข้า'], tire['D3_เข้า'], tire['D4_เข้า'], pos) || [];
    if (partner && tire.avgTreadIn != null && partner.avgTreadIn != null) {
      const diff = tire.avgTreadIn - partner.avgTreadIn;
      if (Math.abs(diff) >= 3) {
        issues.push({
          text: `ล้อคู่ไม่สมดุล (ต่างจากเส้นคู่ ${Math.abs(diff).toFixed(1)} มม.)`,
          color: 'var(--text-status-danger)',
          type: 'imbalance'
        });
      }
    }
    return issues.length > 0 ? issues : null;
  }, [tire, partner]);

  // Early return AFTER all hooks
  if (!tire) {
    return <div style={{ width: 14, height: 28, background: 'var(--overlay-05)', borderRadius: '4px', border: '1px dashed var(--border-medium)' }} title={`ตำแหน่ง ${pos}: ไม่มีข้อมูล`} />;
  }

  const tread = tire.avgTreadIn ?? 99;
  let statusText = 'ไม่มีข้อมูล';
  let color = 'var(--text-muted)';
  let isTireCritical = false;
  let shadow = '0 1px 3px rgba(0,0,0,0.3)';

  if (chassisViewMode === 'check') {
    if (!tire['MM'] || !tire['YYYY']) {
      statusText = 'ไม่มีข้อมูลการตรวจ';
      color = 'var(--text-muted)';
    } else if (missingCheckMonths >= 2) {
      statusText = `ขาดตรวจ ${missingCheckMonths >= 12 ? 'นานกว่า 1 ปี' : missingCheckMonths + ' เดือน'}`;
      color = '#ef4444';
      isTireCritical = true;
      shadow = '0 0 10px rgba(239, 68, 68, 0.4)';
    } else if (missingCheckMonths === 1) {
      statusText = 'ขาดตรวจ 1 เดือน';
      color = '#f59e0b';
      shadow = '0 0 10px rgba(245, 158, 11, 0.4)';
    } else {
      statusText = 'ตรวจเช็คแล้ว';
      color = '#10b981';
    }
  } else {
    // Tread mode logic
    if (tire.avgTreadIn !== null) {
      if (tread <= 2) {
        statusText = 'เปลี่ยนทันที';
        color = '#ef4444';
        isTireCritical = true;
        shadow = '0 0 10px rgba(239, 68, 68, 0.4)';
      } else if (tread < 4) {
        statusText = 'เปลี่ยน';
        color = '#f59e0b';
        shadow = '0 0 10px rgba(245, 158, 11, 0.4)';
      } else if (tread < 7) {
        statusText = 'วางแผนสั่ง';
        color = '#3b82f6';
        shadow = '0 0 10px rgba(59, 130, 246, 0.3)';
      } else {
        statusText = 'ปกติ';
        color = '#10b981';
      }
    } else {
      statusText = 'ไม่มีข้อมูลดอก';
      color = '#64748b';
      shadow = 'none';
    }
  }

  const border = '1px solid var(--border-strong)';
  const isRetread = tire.tireClass?.toLowerCase().includes('re-tread') || tire.tireClass?.includes('หล่อดอก');
  const isTest = tire.tireClass?.toLowerCase().includes('test') || tire.tireClass?.includes('ทดลอง');


  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Warning Badges */}
      {!hideBadges && (() => {
        const hasAlignIssue = wearIssues?.some(i => i.type !== 'imbalance');
        const hasImbalance = wearIssues?.some(i => i.type === 'imbalance') || isProblematic;
        return (
          <div style={{ position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'row', gap: '1px', zIndex: 20 }}>
            {hasAlignIssue && (
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444', border: '1px solid var(--bg-card)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900, lineHeight: 1 }}>!</span>
              </div>
            )}
            {hasImbalance && (
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#f59e0b', border: '1px solid var(--bg-card)', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                <span style={{ color: '#fff', fontSize: '8px', fontWeight: 900, lineHeight: 1 }}>!</span>
              </div>
            )}
          </div>
        );
      })()}

      {swapLabel && (() => {
        const posNum = parseInt(pos, 10);
        const isStaggeredHigh = !isNaN(posNum) && posNum > 2 && posNum % 2 !== 0;
        return (
          <div style={{ position: 'absolute', top: isStaggeredHigh ? -24 : -12, left: '50%', transform: 'translateX(-50%)', background: swapColor, color: '#fff', fontSize: '9px', fontWeight: 800, padding: '1px 5px', borderRadius: '4px', whiteSpace: 'nowrap', zIndex: 30, boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
            {swapLabel}
          </div>
        );
      })()}

      <div
        className={`tire-dot ${isTireCritical && !swapColor ? 'critical' : ''}`}
        onClick={() => {
          if (!window.matchMedia('(pointer: coarse)').matches) {
            onClick?.(tire['หมายเลขยาง_เข้า']);
          }
        }}
        style={{
          position: 'relative',
          width: 14, height: 28,
          backgroundColor: swapColor ? 'var(--overlay-05)' : color,
          backgroundImage: swapColor ? 'none' : `repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.3) 3px, rgba(0,0,0,0.3) 4px)`,
          borderRadius: '5px',
          boxShadow: swapColor ? `0 0 12px ${swapColor}` : shadow,
          cursor: 'pointer',
          border: swapColor ? `2px solid ${swapColor}` : border,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          overflow: 'hidden'
        }}
      >
        {swapColor ? (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 3, fontSize: '0.65rem', fontWeight: 900, color: '#fff', textShadow: `0 0 4px #000, 0 0 8px ${swapColor}` }}>{pos}</div>
        ) : (
          <>
            {isTest && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, fontSize: '0.65rem', fontWeight: 900, color: 'var(--text-primary)', textShadow: '0 0 3px rgba(0,0,0,0.8)' }}>T</div>}
            {isRetread && <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, color: 'var(--text-primary)', display: 'flex', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} title="ยางหล่อดอก"><RefreshCw size={10} strokeWidth={3} /></div>}
          </>
        )}
      </div>

      {/* Smart Floating Tooltip */}
      {isHovered && !disableTooltip && (
        <div style={{
          position: 'absolute',
          ...(pos === '1' || pos === '2' ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }),
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-secondary)', backdropFilter: 'blur(12px)', border: `1px solid ${color}`,
          borderRadius: '10px', padding: '0', minWidth: '200px', maxWidth: '260px', width: 'max-content', zIndex: 100,
          boxShadow: 'var(--glass-shadow)',
          pointerEvents: 'auto', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ padding: '8px 12px', background: `${color}22`, borderBottom: `1px solid ${color}44`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>ตำแหน่ง {pos}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: color, background: `${color}22`, padding: '1px 8px', borderRadius: '10px', border: `1px solid ${color}44` }}>{statusText}</span>
          </div>

          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Missing check warning */}
            {missingCheckMonths >= 1 && chassisViewMode !== 'check' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', borderRadius: '6px', background: missingCheckMonths >= 2 ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${missingCheckMonths >= 2 ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
                <Clock size={11} color={missingCheckMonths >= 2 ? '#ef4444' : '#f59e0b'} />
                <span style={{ fontSize: '0.7rem', color: missingCheckMonths >= 2 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>ขาดตรวจ {missingCheckMonths >= 12 ? 'นานกว่า 1 ปี' : `${missingCheckMonths} เดือน`}</span>
              </div>
            )}

            {/* Tire ID */}
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.03em' }}>{tire['หมายเลขยาง_เข้า']}</div>

            {/* Info row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {tire['ยี่ห้อยาง_เข้า'] && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'var(--overlay-05)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>{tire['ยี่ห้อยาง_เข้า']}</span>}
              {tire.tireClass && <span style={{ fontSize: '0.68rem', fontWeight: 600, color: isTest ? '#a78bfa' : isRetread ? '#f59e0b' : 'var(--text-secondary)', background: 'var(--overlay-05)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-light)' }}>{tire.tireClass}</span>}
            </div>

            {/* Tread depth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '3px' }}>
                <span>ความลึกดอกยาง</span>
                <span style={{ fontWeight: 700, color }}>{tire.avgTreadIn ?? '-'} มม.</span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--overlay-10)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, ((tire.avgTreadIn ?? 0) / 16) * 100))}%`, height: '100%', background: color, borderRadius: '3px' }} />
              </div>
              {/* Groove details */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '3px', marginTop: '4px' }}>
                {[1, 2, 3, 4].map(num => (
                  <div key={num} style={{ background: 'var(--overlay-05)', borderRadius: '4px', padding: '2px 0', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>ร่อง {num}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-primary)' }}>{tire[`D${num}_เข้า`] ?? '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Warnings section */}
            {(wearIssues?.length > 0 || isProblematic) && (
              <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>⚠ การแจ้งเตือน</span>
                {wearIssues?.map((issue, idx) => (
                  <div key={idx} style={{
                    fontSize: '0.68rem', padding: '4px 8px', borderRadius: '5px',
                    background: issue.type !== 'imbalance' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    border: `1px solid ${issue.type !== 'imbalance' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    color: issue.type !== 'imbalance' ? '#f87171' : '#fbbf24',
                    display: 'flex', alignItems: 'flex-start', gap: '5px'
                  }}>
                    <span style={{ marginTop: '1px', flexShrink: 0 }}>{issue.type !== 'imbalance' ? '!' : '≠'}</span>
                    <span>{issue.text}</span>
                  </div>
                ))}
                {isProblematic && (
                  <div style={{
                    fontSize: '0.68rem', padding: '4px 8px', borderRadius: '5px',
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                    color: '#fbbf24', display: 'flex', alignItems: 'flex-start', gap: '5px'
                  }}>
                    <span style={{ marginTop: '1px', flexShrink: 0 }}>≠</span>
                    <span>เพลาไม่สมดุล (ดอกยางต่างกันเกิน 5 มม.)</span>
                  </div>
                )}
              </div>
            )}

            {/* Install date */}
            {(tire.trueInstallDateRaw || tire['วันที่ติดตั้ง'] || tire['วันที่บันทึก']) && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-light)', paddingTop: '5px' }}>
                <span>ติดตั้ง</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{(() => {
                  const raw = tire.trueInstallDateRaw || tire['วันที่ติดตั้ง'] || tire['วันที่บันทึก'];
                  if (!raw) return '-';
                  if (String(raw).match(/^\d+$/) && Number(raw) > 40000) {
                    const date = new Date(1900, 0, Number(raw) - 1);
                    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                  }
                  return String(raw);
                })()}</span>
              </div>
            )}

            {/* Action button */}
            <button
              onClick={(e) => { e.stopPropagation(); onClick?.(tire['หมายเลขยาง_เข้า']); setIsHovered(false); }}
              style={{
                width: '100%', padding: '6px 0', background: 'var(--overlay-05)',
                color: 'var(--text-primary)', border: '1px solid var(--border-medium)', borderRadius: '6px',
                cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <Search size={12} /> ดูประวัติเส้นทางยาง
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const TruckCab = React.memo(({ onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
  <svg 
    width="84" height="48" viewBox="0 0 84 48" 
    style={{ 
      position: 'relative', zIndex: 2, display: 'block',
      cursor: 'pointer',
      transform: hover ? 'scale(1.05)' : 'scale(1)',
      transition: 'transform 0.2s',
      filter: hover ? 'drop-shadow(0 4px 6px rgba(59,130,246,0.3))' : 'none'
    }}
    onClick={onClick}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {/* Mirrors */}
    <path d="M 4 20 L 10 20 L 10 26 L 4 26 Z" fill="var(--chassis-frame)" />
    <path d="M 80 20 L 74 20 L 74 26 L 80 26 Z" fill="var(--chassis-frame)" />
    {/* Bumper */}
    <path d="M 16 2 Q 42 -2 68 2 L 72 8 L 12 8 Z" fill="var(--chassis-detail)" />
    {/* Cab Body */}
    <path d="M 12 8 L 72 8 L 74 44 L 10 44 Z" fill="var(--chassis-body)" />
    {/* Windshield - more sleek */}
    <path d="M 18 12 Q 42 9 66 12 L 64 22 Q 42 24 20 22 Z" fill="var(--chassis-dark)" stroke="#38bdf8" strokeWidth="0.5" />
    {/* Roof Fairing / Deflector */}
    <path d="M 22 26 Q 42 24 62 26 L 68 44 L 16 44 Z" fill="var(--chassis-dark)" opacity="0.4" />
    {/* Exhaust Pipes */}
    <circle cx="16" cy="46" r="3" fill="var(--chassis-light)" />
    <circle cx="68" cy="46" r="3" fill="var(--chassis-light)" />
    {/* Grill Details */}
    <rect x="36" y="2" width="12" height="4" fill="var(--chassis-dark)" rx="1" />
  </svg>
  );
});

const FrameGap = React.memo(({ height = 8 }) => (
  <svg width="84" height={height} viewBox={`0 0 84 ${height}`} style={{ zIndex: 0, display: 'block' }}>
    <rect x="34" y="0" width="6" height={height} fill="var(--chassis-frame)" />
    <rect x="44" y="0" width="6" height={height} fill="var(--chassis-frame)" />
    {height > 6 && <rect x="38" y={height / 2 - 2} width="8" height="4" fill="var(--chassis-body)" />}
  </svg>
));

const TrailerHinge = React.memo(({ onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
  <svg 
    width="84" height="32" viewBox="0 0 84 32" 
    style={{ 
      zIndex: 0, display: 'block',
      cursor: 'pointer',
      transform: hover ? 'scale(1.1)' : 'scale(1)',
      transition: 'transform 0.2s',
      filter: hover ? 'drop-shadow(0 4px 6px rgba(59,130,246,0.3))' : 'none'
    }}
    onClick={onClick}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {/* Frame Rails */}
    <rect x="34" y="0" width="6" height="32" fill="var(--chassis-frame)" />
    <rect x="44" y="0" width="6" height="32" fill="var(--chassis-frame)" />

    {/* Fifth wheel mounting brackets */}
    <rect x="32" y="8" width="20" height="16" fill="var(--chassis-detail)" rx="2" />

    {/* Fifth Wheel Plate (Horseshoe) */}
    <path d="M 28 6 L 56 6 Q 62 6 62 14 L 56 26 L 46 26 L 44 16 L 40 16 L 38 26 L 28 26 L 22 14 Q 22 6 28 6 Z" fill="var(--chassis-body)" stroke="var(--chassis-dark)" strokeWidth="1.5" />

    {/* Kingpin lock/grease plate */}
    <circle cx="42" cy="13" r="4" fill="var(--chassis-dark)" />
  </svg>
  );
});

const AxleRow = React.memo(({ left, right, isFront, unbalanced, showTreadValues }) => (
  <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '84px', height: '28px' }}>
    {/* SVG Frame Rails and Axle */}
    <svg width="84" height="28" viewBox="0 0 84 28" style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* Frame Rails */}
      <rect x="34" y="0" width="6" height="28" fill="var(--chassis-frame)" />
      <rect x="44" y="0" width="6" height="28" fill="var(--chassis-frame)" />

      {/* Axle Tube */}
      <rect x="14" y="11" width="56" height="6" fill={unbalanced ? "#ef4444" : "var(--chassis-detail)"} rx="2" />

      {/* Airbags (Suspension) */}
      {!isFront && (
        <>
          <circle cx="30" cy="14" r="4" fill="var(--chassis-body)" />
          <circle cx="54" cy="14" r="4" fill="var(--chassis-body)" />
        </>
      )}

      {/* Differential (Drive Axle) */}
      {!isFront && (
        <path d="M 37 14 L 42 8 L 47 14 L 42 20 Z" fill="var(--chassis-detail)" stroke={unbalanced ? "#ef4444" : "var(--chassis-body)"} strokeWidth="1.5" />
      )}
    </svg>

    <div style={{ display: 'flex', gap: showTreadValues ? '8px' : '3px', zIndex: 30, width: showTreadValues ? '36px' : '30px', justifyContent: isFront ? 'flex-start' : 'space-between' }}>{left}</div>
    <div style={{ display: 'flex', gap: showTreadValues ? '8px' : '3px', zIndex: 30, width: showTreadValues ? '36px' : '30px', justifyContent: isFront ? 'flex-end' : 'space-between' }}>{right}</div>
  </div>
));

// Helper: returns true for any vehicle type that has a trailer axle (positions 11-22)
const isTrailerType = (type) => {
  if (!type) return false;
  return (
    type === '22W' ||
    type.includes('เทรลเลอร์') ||
    type.includes('กึ่งพ่วง') ||
    type.includes('รถพ่วง') ||
    type.includes('พ่วง') ||
    type.includes('Trailer') ||
    type.includes('Semi')
  );
};

const TruckChassis = React.memo(({ type, tires, plateHead, plateTail, onHeadClick, onTailClick, onTireClick, hasCritical, chassisViewMode = 'tread', swapPositions, swapColors, showTreadValues, hideBadges, disableTooltip }) => {
  const tiresByPos = {};
  tires.forEach(t => { tiresByPos[t['ตำแหน่งล้อยาง']] = t; });

  const getAxleImbalance = (positions) => {
    const half = positions.length / 2;
    const leftPos = positions.slice(0, half);
    const rightPos = positions.slice(half);

    const getAvg = (posArray) => {
      let sum = 0, count = 0;
      posArray.forEach(pos => {
        const tire = tiresByPos[pos];
        if (tire && tire.avgTreadIn != null) {
          sum += tire.avgTreadIn;
          count++;
        }
      });
      return count > 0 ? sum / count : null;
    };

    const leftAvg = getAvg(leftPos);
    const rightAvg = getAvg(rightPos);

    if (leftAvg != null && rightAvg != null) {
      const diff = Math.abs(leftAvg - rightAvg);
      if (diff > 5) {
        const problematicPositions = leftAvg < rightAvg ? leftPos : rightPos;
        return { diff: diff.toFixed(1), problematicPositions };
      }
    }
    return null;
  };

  const renderTire = (pos, index, arr, imbalance, isRightSide = false) => {
    const tire = tiresByPos[pos];
    const isDual = arr && arr.length === 2;
    const partnerPos = isDual ? arr[index === 0 ? 1 : 0] : null;
    const partnerTire = partnerPos ? tiresByPos[partnerPos] : null;

    const isProblematic = !!(imbalance && imbalance.problematicPositions.includes(pos));
    const sIdx = swapPositions ? swapPositions[pos] : undefined;
    const sColor = sIdx !== undefined && swapColors ? swapColors[sIdx % swapColors.length] : null;
    const sLabel = sIdx !== undefined ? `คู่ ${sIdx + 1}` : null;

    const tireElement = <TireDot key={pos} tire={tire} partner={partnerTire} pos={pos} onClick={onTireClick} isProblematic={isProblematic} hasCritical={hasCritical} chassisViewMode={chassisViewMode} swapColor={sColor} hideBadges={hideBadges} swapLabel={sLabel} disableTooltip={disableTooltip} isRightSide={isRightSide} />;

    if (showTreadValues && tire && tire.avgTreadIn != null) {
      return (
        <div key={pos} style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {tireElement}
          <span style={{ position: 'absolute', top: '100%', marginTop: '4px', fontSize: '0.65rem', color: sColor || 'var(--text-secondary)', fontWeight: sColor ? 800 : 600, letterSpacing: '-0.3px', whiteSpace: 'nowrap', zIndex: 10 }}>
            {Number(tire.avgTreadIn).toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </span>
        </div>
      );
    }
    return tireElement;
  };

  const hasLabels = showTreadValues || swapPositions;

  const renderAxle = (positions, isFront = false) => {
    const imbalance = getAxleImbalance(positions);
    const half = positions.length / 2;
    const leftPos = positions.slice(0, half);
    const rightPos = positions.slice(half);

    return (
      <AxleRow
        isFront={isFront}
        unbalanced={imbalance}
        showTreadValues={showTreadValues}
        left={leftPos.map((p, i, a) => renderTire(p, i, a, imbalance, false))}
        right={rightPos.map((p, i, a) => renderTire(p, i, a, imbalance, true))}
      />
    );
  };

  const isTailOnly = (t) => {
    if (!t) return false;
    // กึ่งพ่วง means tail only. เทรลเลอร์ means combined.
    return t === 'กึ่งพ่วง' || (t.includes('กึ่งพ่วง') && !t.includes('เทรลเลอร์'));
  };

  const tailOnly = isTailOnly(type);
  const isSixWheel = type && (type.includes('หกล้อ') || type.includes('6W'));

  return (
    <div style={{ background: 'transparent', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

      {!tailOnly && (
        <>
          <TruckCab onClick={() => onHeadClick?.(plateHead)} />
          <div style={{ marginTop: '-18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {renderAxle([1, 2], true)}
          </div>
          <FrameGap height={hasLabels ? 28 : 14} />
          {renderAxle([3, 4, 5, 6])}
          {!isSixWheel && (
            <>
              <FrameGap height={hasLabels ? 20 : 6} />
              {renderAxle([7, 8, 9, 10])}
            </>
          )}
        </>
      )}

      {isTrailerType(type) && (
        <>
          {!tailOnly && <TrailerHinge onClick={() => onTailClick?.(plateTail)} />}
          {tailOnly && (
            <div style={{ width: '40px', height: '10px', background: 'var(--chassis-body)', borderRadius: '4px', margin: '0 0 10px 0' }} />
          )}
          {renderAxle([11, 12, 13, 14])}
          <FrameGap height={hasLabels ? 20 : 6} />
          {renderAxle([15, 16, 17, 18])}
          <FrameGap height={hasLabels ? 20 : 6} />
          {renderAxle([19, 20, 21, 22])}
        </>
      )}

      {/* Spare Tires Section */}
      {(() => {
        // Find any position that is not a number 1-22
        const allPos = Object.keys(tiresByPos);
        const sparePositions = allPos.filter(pos => {
          const num = parseInt(pos, 10);
          return isNaN(num) || num < 1 || num > 22;
        });

        if (sparePositions.length === 0) return null;

        return (
          <div style={{ marginTop: '16px', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>ยางอะไหล่ / อื่นๆ</span>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {sparePositions.map(pos => {
                // shorten labels for display
                let label = pos;
                if (pos.includes('หัว')) label = 'หัว';
                else if (pos.includes('หาง')) label = 'หาง';
                else if (pos.includes('อะไหล่') || pos.toLowerCase().includes('spare')) label = 'ทั่วไป';
                else if (label.length > 8) label = label.substring(0, 8) + '..';

                return (
                  <div key={pos} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    {renderTire(pos, 0, [pos], null)}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: hasLabels ? '14px' : '0' }}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
});

// ============================================================
// Tire Rotation Advisor Modal
// ============================================================
const PRIORITY_CONFIG = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)', label: '⚡ เร่งด่วน' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)', label: '⚠️ แนะนำ' },
  info: { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.25)', label: 'ℹ️ พิจารณา' },
};

const TireRotationModal = ({ truck, onClose }) => {
  const advice = React.useMemo(() => generateRotationAdvice(truck.tires), [truck.tires]);

  // Build tireByPos for chassis display
  const tireByPos = {};
  truck.tires.forEach(t => { tireByPos[String(t['ตำแหน่งล้อยาง'])] = t; });

  // Positions involved in swaps for highlighting
  const swapPositions = {}; // pos → swap index
  advice.forEach((a, i) => {
    swapPositions[a.posA] = i;
    swapPositions[a.posB] = i;
  });

  const SWAP_COLORS = ['#f59e0b', '#3b82f6', '#a78bfa', '#10b981', '#f43f5e', '#fb923c'];

  // Mini chassis diagram with highlighted swap positions
  const MiniTire = ({ pos }) => {
    const t = tireByPos[pos];
    const swapIdx = swapPositions[pos];
    const inSwap = swapIdx !== undefined;
    const color = inSwap ? SWAP_COLORS[swapIdx % SWAP_COLORS.length] : 'var(--overlay-20)';
    const treadRaw = t?.avgTreadIn;
    const tread = treadRaw != null ? Number(treadRaw).toLocaleString('en-US', { maximumFractionDigits: 2 }) : null;

    let displayPos = pos;
    const posNum = parseInt(pos, 10);
    if (isNaN(posNum) || posNum < 1 || posNum > 22) {
      displayPos = 'S';
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <div style={{
          width: 24, height: 46, borderRadius: '6px',
          background: inSwap ? `${color}15` : 'var(--bg-secondary)',
          border: `2px solid ${inSwap ? color : 'var(--border-medium)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease',
          boxShadow: inSwap ? `0 4px 12px ${color}33` : '0 2px 6px rgba(0,0,0,0.05)',
          position: 'relative', overflow: 'hidden'
        }}>
          {inSwap && <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.1 }} />}
          <span style={{ fontSize: '0.75rem', color: inSwap ? color : 'var(--text-secondary)', fontWeight: 800, zIndex: 2 }}>{displayPos}</span>
        </div>
        {tread != null && (
          <span style={{ fontSize: '0.75rem', color: inSwap ? color : 'var(--text-secondary)', fontWeight: inSwap ? 800 : 600 }}>{tread}</span>
        )}
      </div>
    );
  };

  const MiniAxle = ({ positions, isFront }) => {
    const half = Math.floor(positions.length / 2);
    const left = positions.slice(0, half);
    const right = positions.slice(half);
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '130px', height: '64px', position: 'relative' }}>
        <svg width="130" height="64" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
          <rect x="52" y="0" width="8" height="64" fill="var(--chassis-frame)" />
          <rect x="70" y="0" width="8" height="64" fill="var(--chassis-frame)" />
          <rect x="14" y="19" width="102" height="6" fill="var(--chassis-detail)" rx="3" />
          {!isFront && <path d="M 61 22 L 65 17 L 69 22 L 65 27 Z" fill="var(--chassis-detail)" />}
        </svg>
        <div style={{ display: 'flex', gap: '4px', zIndex: 2 }}>{left.map(p => <MiniTire key={p} pos={String(p)} />)}</div>
        <div style={{ display: 'flex', gap: '4px', zIndex: 2 }}>{right.map(p => <MiniTire key={p} pos={String(p)} />)}</div>
      </div>
    );
  };

  const isTrailer = truck.truckType && (
    truck.truckType.includes('เทรลเลอร์') || truck.truckType.includes('กึ่งพ่วง') || truck.truckType.includes('พ่วง')
  );

  const isSixWheel = truck.truckType && (
    truck.truckType.includes('หกล้อ') || truck.truckType.includes('6W')
  );

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'var(--overlay-black-70)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        borderRadius: '24px', padding: '2rem',
        width: '100%', maxWidth: '880px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <RotateCcw size={22} color="var(--text-primary)" />
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                แนะนำการสลับตำแหน่งยาง
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', paddingLeft: '34px' }}>
              รถหมายเลข <strong style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{truck.truckNo}</strong> · {truck.fleet || '-'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'var(--overlay-05)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)', flexShrink: 0, transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--overlay-10)'} onMouseOut={e => e.currentTarget.style.background = 'var(--overlay-05)'}>
            <X size={20} />
          </button>
        </div>

        {advice.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 1rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>ยางสึกหรอสม่ำเสมอดีแล้ว</div>
            <div style={{ fontSize: '0.95rem' }}>ไม่พบความต่างของดอกยางที่มากพอจะแนะนำการสลับตำแหน่งในขณะนี้</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '4fr 5fr', gap: '2.5rem' }}>

            {/* Left: mini chassis with colored highlights */}
            <div style={{ display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, alignSelf: 'flex-start', maxHeight: 'calc(90vh - 6rem)', overflowY: 'auto', paddingRight: '0.5rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                ผังตำแหน่งที่ควรสลับ
              </div>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)', borderRadius: '16px', padding: '24px 20px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                flex: 1
              }}>
                <div style={{ transform: 'scale(1.1)', transformOrigin: 'top center', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <TruckChassis
                    type={truck.truckType}
                    tires={truck.tires}
                    chassisViewMode="tread"
                    swapPositions={swapPositions}
                    swapColors={SWAP_COLORS}
                    showTreadValues={false}
                    hideBadges={true}
                    disableTooltip={true}
                  />
                </div>
              </div>

              {/* Color legend */}
              <div style={{ marginTop: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '0.75rem', background: 'var(--overlay-05)', padding: '12px 16px', borderRadius: '12px', border: '1px dashed var(--border-medium)' }}>
                {advice.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '3px', background: SWAP_COLORS[i % SWAP_COLORS.length], flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                    <span style={{ whiteSpace: 'nowrap' }}>คู่ {i + 1}: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{a.posA} ↔ {a.posB}</strong></span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: swap recommendations list */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                รายการคำแนะนำ ({advice.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {advice.map((a, i) => {
                  const cfg = PRIORITY_CONFIG[a.priority];
                  const swapColor = SWAP_COLORS[i % SWAP_COLORS.length];
                  return (
                    <div key={i} style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-light)',
                      borderLeft: `4px solid ${swapColor}`,
                      borderRadius: '16px', padding: '1.5rem',
                      display: 'flex', flexDirection: 'column', gap: '1.25rem',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: '6px' }}>
                          {cfg.label}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          ความต่าง: <strong style={{ color: 'var(--text-primary)' }}>{Number(a.diff).toLocaleString('en-US', { maximumFractionDigits: 2 })} มม.</strong>
                        </span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                        {/* Position A */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>ตำแหน่ง <strong style={{ color: 'var(--text-primary)' }}>{a.posA}</strong></span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{Number(a.treadA).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>มม.</span></span>
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '8px', fontWeight: 600 }}>สึกมากกว่า</span>
                        </div>

                        {/* Swap Icon */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 1rem' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--overlay-05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowLeftRight size={20} color="var(--text-secondary)" />
                          </div>
                        </div>

                        {/* Position B */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>ตำแหน่ง <strong style={{ color: 'var(--text-primary)' }}>{a.posB}</strong></span>
                          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{Number(a.treadB).toLocaleString('en-US', { maximumFractionDigits: 2 })} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>มม.</span></span>
                          <span style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px', fontWeight: 600 }}>ดอกเยอะกว่า</span>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                        <span style={{ color: 'var(--text-muted)', marginRight: '6px' }}>เหตุผล:</span> {a.reason}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

class PlanningErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, resetKey: 0 };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[PlanningErrorBoundary] Caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1.5rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>เกิดข้อผิดพลาดขึ้นในการแสดงผล</div>
            <div style={{ fontSize: '0.85rem' }}>กรุณาลองรีเซ็ตค่าตัวกรอง หรือรีเฟรชหน้าเว็บ</div>
          </div>
          {this.state.error && (
            <div style={{ background: 'var(--overlay-05)', padding: '1rem', borderRadius: '8px', maxWidth: '80%', overflow: 'auto', textAlign: 'left', border: '1px solid var(--border-medium)' }}>
              <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>{this.state.error.toString()}</div>
              <pre style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                {this.state.error.stack}
              </pre>
            </div>
          )}
          <button
            onClick={() => this.setState(s => ({ hasError: false, error: null, resetKey: s.resetKey + 1 }))}
            style={{ padding: '0.6rem 1.5rem', borderRadius: '8px', border: '1px solid var(--accent-primary)', background: 'rgba(59,130,246,0.15)', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
          >
            ลองใหม่อีกครั้ง
          </button>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}


const getExpectedTireCount = (truckTires) => {
  if (!truckTires || truckTires.length === 0) return 0;
  let t = truckTires.find(r => r.truckType && r.truckType !== 'ไม่ระบุ')?.truckType;

  if (!t || t === 'ไม่ระบุ') {
    const isValidPlate = (val) => {
      if (!val) return false;
      const str = String(val).trim();
      return str !== '' && str !== '-' && str !== 'ไม่มี' && str.toLowerCase() !== 'none';
    };
    const hasHead = truckTires.some(r => isValidPlate(r['ทะเบียนหัว']));
    const hasTail = truckTires.some(r => isValidPlate(r['ทะเบียนหาง']));

    if (hasHead && hasTail) {
      t = 'เทรลเลอร์';
    } else if (hasHead) {
      t = 'หัวลาก';
    }
  }

  if (!t) return 10;

  if (t === 'เทรลเลอร์' || t.includes('พ่วง') || t.includes('Trailer') || t.includes('Semi')) return 22;
  if (t.includes('สิบล้อ') || t.includes('10 ล้อ') || t.includes('10ล้อ') || t.includes('หัวลาก')) return 10;
  if (t.includes('หกล้อ') || t.includes('6 ล้อ') || t.includes('6ล้อ')) return 6;
  if (t.includes('4 ล้อ') || t.includes('รถยนต์') || t.includes('กระบะ') || t.includes('Pick')) return 4;
  if (t.includes('รถบรรทุก')) return 6;
  return 10;
};

const LegendModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
        borderRadius: '20px', padding: '1.5rem',
        width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HelpCircle size={20} color="var(--accent-primary)" /> คำอธิบายสัญลักษณ์
          </h2>
          <button onClick={onClose} style={{ background: 'var(--overlay-05)', border: '1px solid var(--border-medium)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>สีของดอกยาง (ความลึกเฉลี่ย)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#10b981' }} /> ปกติ (≥ 7 มม.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#3b82f6' }} /> วางแผนสั่ง (4 - 6.9 มม.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#f59e0b' }} /> ควรเปลี่ยน (2.1 - 3.9 มม.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#ef4444' }} /> เปลี่ยนทันที (≤ 2 มม.)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '4px', background: '#64748b' }} /> ไม่มีข้อมูลความลึกดอกยาง
              </div>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-medium)' }} />

          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>สัญลักษณ์และการแจ้งเตือน</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 0 8px rgba(239, 68, 68, 0.8)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900 }}>!</span>
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ปัญหาศูนย์ล้อ / การสึกหรอผิดปกติ</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>พบความผิดปกติในการสึกหรอ (เช่น กินกลาง, กินขอบ, หรือปัญหามุมล้อ) จากปัญหาลมยางหรือช่วงล่าง</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#f59e0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 0 8px rgba(245, 158, 11, 0.8)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900 }}>!</span>
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>เพลาไม่สมดุล</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>ความลึกดอกยางเฉลี่ยฝั่งซ้าย-ขวาบนเพลาเดียวกัน ต่างกันตั้งแต่ 5 มม. ขึ้นไป (แจ้งเตือนฝั่งที่ดอกบางกว่า)</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <RefreshCw size={12} strokeWidth={3} />
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ยางหล่อดอก (Retread)</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>ยางเส้นนี้ถูกระบุว่าเป็นยางหล่อดอกในระบบ</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ width: 20, height: 20, borderRadius: '4px', background: 'var(--overlay-black-30)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ fontSize: '11px', fontWeight: 900 }}>T</span>
                </div>
                <div style={{ fontSize: '0.85rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ยางทดลอง (Test Tire)</div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>ยางเส้นนี้ถูกระบุว่าเป็นยางที่กำลังทดลองใช้งาน</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};

function PlanningInner({ data, rawData, truckMetadata, onTireClick, onTruckClick, wearRates }) {
  const [filter, setFilter] = useState('all');
  const [showLegend, setShowLegend] = useState(false);
  const [showWearStats, setShowWearStats] = useState(false);
  const [chassisViewMode, setChassisViewMode] = useState('tread'); // 'tread' | 'check'
  const [filterFleet, setFilterFleet] = useState('');
  const [filterTruck, setFilterTruck] = useState('');
  const [filterPos, setFilterPos] = useState('');
  const [filterTruckStatus, setFilterTruckStatus] = useState('');
  const [filterGpsStatus, setFilterGpsStatus] = useState('');
  const [filterTruckType, setFilterTruckType] = useState('');
  const [sortBy, setSortBy] = useState('tread_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [selectedTruckNo, setSelectedTruckNo] = useState(null);
  const [chartGroupBy, setChartGroupBy] = useState('fleet'); // 'fleet' | 'month'
  const [rotationTruck, setRotationTruck] = useState(null); // truck data for rotation modal
  const [selectedPlate, setSelectedPlate] = useState(null); // { type: 'head'|'tail', plate: string, truckNo: string }
  const ROWS_PER_PAGE = 50;

  // Active tires WITH tread data — used for urgency table/list
  const activeTires = useMemo(() => {
    return data.filter(row => row.isActive && row.avgTreadIn !== null);
  }, [data]);

  // ALL active tires (including ones without tread data) — used for chassis rendering
  const allActiveTires = useMemo(() => {
    return data.filter(row => row.isActive);
  }, [data]);

  const truckNos = useMemo(() => [...new Set(allActiveTires.map(r => r['เบอร์รถ']))].sort((a, b) => a - b), [allActiveTires]);
  const positions = useMemo(() => [...new Set(allActiveTires.map(r => r['ตำแหน่งล้อยาง']))].sort((a, b) => a - b), [allActiveTires]);
  const fleets = useMemo(() => [...new Set(allActiveTires.map(r => r['สังกัดรถ'] || 'ไม่ระบุ'))].sort(), [allActiveTires]);

  const truckStatuses = useMemo(() => {
    if (!truckMetadata) return [];
    const statuses = new Set();
    allActiveTires.forEach(row => {
      const rawId = String(row['เบอร์รถ']).trim();
      const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
      if (meta?.truckStatus) statuses.add(meta.truckStatus);
    });
    return [...statuses].sort();
  }, [allActiveTires, truckMetadata]);

  const gpsStatuses = useMemo(() => {
    if (!truckMetadata) return [];
    const statuses = new Set();
    allActiveTires.forEach(row => {
      const rawId = String(row['เบอร์รถ']).trim();
      const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
      if (meta?.gpsStatus) statuses.add(meta.gpsStatus);
    });
    return [...statuses].sort();
  }, [allActiveTires, truckMetadata]);

  const unifiedTruckTypes = useMemo(() => {
    const grouped = {};
    allActiveTires.forEach(tire => {
      const truckNo = String(tire['เบอร์รถ']).trim();
      if (!grouped[truckNo]) {
        grouped[truckNo] = { truckType: tire.truckType, plateHead: null, plateTail: null, headPos: false, tailPos: false };
      }
      if (!grouped[truckNo].plateHead && tire['ทะเบียนหัว']) grouped[truckNo].plateHead = tire['ทะเบียนหัว'];
      if (!grouped[truckNo].plateTail && tire['ทะเบียนหาง']) grouped[truckNo].plateTail = tire['ทะเบียนหาง'];
      const p = parseInt(tire['ตำแหน่งล้อยาง'], 10);
      if (!isNaN(p)) {
        if (p >= 1 && p <= 10) grouped[truckNo].headPos = true;
        if (p > 10 && p <= 22) grouped[truckNo].tailPos = true;
      }
      if (!grouped[truckNo].truckType || grouped[truckNo].truckType === 'ไม่ระบุ') {
         grouped[truckNo].truckType = tire.truckType;
      }
    });

    const typesMap = {};
    Object.keys(grouped).forEach(truckNo => {
      const g = grouped[truckNo];
      const NON_TRAILER_TYPES = ['สิบล้อ', 'หกล้อ', 'รถยนต์', 'กระบะ', 'รถบรรทุก', 'จักรยานยนต์'];
      const isNonTrailer = NON_TRAILER_TYPES.some(t => g.truckType && g.truckType.includes(t));

      if (!isNonTrailer) {
        if ((g.plateHead && g.plateTail) || (g.headPos && g.tailPos)) {
          g.truckType = 'เทรลเลอร์';
        } else if (g.tailPos && !g.headPos) {
          g.truckType = 'กึ่งพ่วง';
        } else if (g.headPos && !g.tailPos) {
          g.truckType = 'หัวลาก';
        } else if (!g.truckType || g.truckType === 'ไม่ระบุ') {
          if (g.plateHead && g.plateTail) g.truckType = 'เทรลเลอร์';
          else if (g.plateTail) g.truckType = 'กึ่งพ่วง';
          else if (g.plateHead) g.truckType = 'หัวลาก';
        }
      }
      typesMap[truckNo] = g.truckType || 'ไม่ระบุ';
    });
    return typesMap;
  }, [allActiveTires]);

  const truckTypes = useMemo(() => {
    const types = new Set(Object.values(unifiedTruckTypes));
    types.delete('ไม่ระบุ');
    return [...types].sort();
  }, [unifiedTruckTypes]);

  const baseFiltered = useMemo(() => {
    // Use allActiveTires so chassis always shows every installed tire, even without tread data
    let rows = allActiveTires;
    if (filterFleet) rows = rows.filter(r => (r['สังกัดรถ'] || 'ไม่ระบุ') === filterFleet);
    if (filterTruck) {
      const term = filterTruck.trim().toLowerCase();
      rows = rows.filter(r => String(r['เบอร์รถ']).toLowerCase().includes(term));
    }
    if (filterPos) rows = rows.filter(r => String(r['ตำแหน่งล้อยาง']) === filterPos);

    if (filterTruckStatus) {
      rows = rows.filter(r => {
        const rawId = String(r['เบอร์รถ']).trim();
        const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
        return meta?.truckStatus === filterTruckStatus;
      });
    }
    if (filterGpsStatus) {
      rows = rows.filter(r => {
        const rawId = String(r['เบอร์รถ']).trim();
        const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
        return meta?.gpsStatus === filterGpsStatus;
      });
    }
    if (filterTruckType) {
      rows = rows.filter(r => {
        const truckNo = String(r['เบอร์รถ']).trim();
        return unifiedTruckTypes[truckNo] === filterTruckType;
      });
    }

    return [...rows].sort((a, b) => {
      if (sortBy === 'days_asc') return (a.estimatedDaysLeft ?? 9999) - (b.estimatedDaysLeft ?? 9999);
      if (sortBy === 'days_desc') return (b.estimatedDaysLeft ?? 0) - (a.estimatedDaysLeft ?? 0);
      if (sortBy === 'tread_asc') return (a.avgTreadIn ?? 99) - (b.avgTreadIn ?? 99);
      if (sortBy === 'truck') return (a['เบอร์รถ'] ?? 0) - (b['เบอร์รถ'] ?? 0);
      return 0;
    });
  }, [allActiveTires, filterFleet, filterTruck, filterPos, filterTruckStatus, filterGpsStatus, filterTruckType, sortBy, truckMetadata]);

  const missingTireTrucks = useMemo(() => {
    // Use allActiveTires (not baseFiltered) so fleet-filter doesn't break the missing-tires detection.
    // A truck is 'missing tires' based on its total real-world tire count, not the filtered subset.
    const truckTiresMap = {};
    allActiveTires.forEach(r => {
      const tNo = String(r['เบอร์รถ']).trim();
      if (!truckTiresMap[tNo]) truckTiresMap[tNo] = { all: [], main: [] };
      truckTiresMap[tNo].all.push(r);
      const pos = parseInt(r['ตำแหน่งล้อยาง'], 10);
      if (!isNaN(pos) && pos >= 1 && pos <= 22) {
        truckTiresMap[tNo].main.push(r);
      }
    });
    const missing = new Set();
    Object.entries(truckTiresMap).forEach(([tNo, data]) => {
      const expectedCount = getExpectedTireCount(data.all);
      if (data.main.length < expectedCount) {
        missing.add(tNo);
      }
    });
    return missing;
  }, [allActiveTires]);

  const overdueInspectionTrucks = useMemo(() => {
    const currentYYYY = new Date().getFullYear();
    const currentMM = new Date().getMonth() + 1;
    const overdue = new Set();
    allActiveTires.forEach(r => {
      let mm = parseInt(r['MM'], 10);
      let yyyy = parseInt(r['YYYY'], 10);
      if (!isNaN(mm) && !isNaN(yyyy)) {
        if (yyyy < 100) yyyy += 2000;
        else if (yyyy > 2400) yyyy -= 543;
        const diff = (currentYYYY - yyyy) * 12 + (currentMM - mm);
        // >= 2 months considered overdue for inspection
        if (diff >= 2) {
          overdue.add(String(r['เบอร์รถ']).trim());
        }
      }
    });
    return overdue;
  }, [allActiveTires]);

  const filtered = useMemo(() => {
    let rows = baseFiltered;
    if (filter === 'critical') rows = rows.filter(r => r.avgTreadIn !== null && r.avgTreadIn <= 2);
    else if (filter === 'warning') rows = rows.filter(r => r.avgTreadIn !== null && r.avgTreadIn > 2 && r.avgTreadIn < 4);
    else if (filter === 'plan_order') rows = rows.filter(r => r.avgTreadIn !== null && r.avgTreadIn >= 4 && r.avgTreadIn < 7);
    else if (filter === 'normal') rows = rows.filter(r => r.avgTreadIn !== null && r.avgTreadIn >= 7);
    else if (filter === 'unknown') rows = rows.filter(r => r.avgTreadIn === null);
    else if (filter === 'missing_tires') {
      // For missing_tires: include trucks that (a) are in missingTireTrucks AND (b) belong to the selected fleet
      rows = rows.filter(r => missingTireTrucks.has(String(r['เบอร์รถ']).trim()));
    }
    else if (filter === 'overdue_inspection') {
      rows = rows.filter(r => overdueInspectionTrucks.has(String(r['เบอร์รถ']).trim()));
    }
    return rows;
  }, [baseFiltered, filter, missingTireTrucks, overdueInspectionTrucks]);

  const criticalCount = useMemo(() => baseFiltered.filter(r => r.avgTreadIn !== null && r.avgTreadIn <= 2).length, [baseFiltered]);
  const warningCount = useMemo(() => baseFiltered.filter(r => r.avgTreadIn !== null && r.avgTreadIn > 2 && r.avgTreadIn < 4).length, [baseFiltered]);
  const planOrderCount = useMemo(() => baseFiltered.filter(r => r.avgTreadIn !== null && r.avgTreadIn >= 4 && r.avgTreadIn < 7).length, [baseFiltered]);
  const normalCount = useMemo(() => baseFiltered.filter(r => r.avgTreadIn !== null && r.avgTreadIn >= 7).length, [baseFiltered]);
  const unknownCount = useMemo(() => baseFiltered.filter(r => r.avgTreadIn === null).length, [baseFiltered]);
  const missingTrucksCount = useMemo(() => {
    const seen = new Set();
    baseFiltered.forEach(r => {
      const tNo = String(r['เบอร์รถ']).trim();
      if (missingTireTrucks.has(tNo)) seen.add(tNo);
    });
    return seen.size;
  }, [baseFiltered, missingTireTrucks]);

  const overdueTiresCount = useMemo(() => {
    const currentYYYY = new Date().getFullYear();
    const currentMM = new Date().getMonth() + 1;
    let count = 0;
    baseFiltered.forEach(r => {
      let mm = parseInt(r['MM'], 10);
      let yyyy = parseInt(r['YYYY'], 10);
      if (!isNaN(mm) && !isNaN(yyyy)) {
        if (yyyy < 100) yyyy += 2000;
        else if (yyyy > 2400) yyyy -= 543;
        const diff = (currentYYYY - yyyy) * 12 + (currentMM - mm);
        if (diff >= 2) count++;
      }
    });
    return count;
  }, [baseFiltered]);

  const dashboardData = useMemo(() => {
    const fleetMap = {};
    const monthMap = {};
    const issueMap = {};
    let totalCritical = 0, totalWarning = 0, totalPlan = 0, totalNormal = 0;

    filtered.forEach(tire => {
      const fleet = tire['สังกัดรถ'] || 'ไม่ระบุ';

      let monthStr = 'ไม่ระบุ';
      let sortKey = 0;
      if (tire.YYYY && tire.MM) {
        const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const mIdx = Number(tire.MM) - 1;
        const mName = (mIdx >= 0 && mIdx < 12) ? monthNames[mIdx] : String(tire.MM);
        monthStr = `${mName} ${tire.YYYY}`;
        sortKey = Number(tire.YYYY) * 100 + Number(tire.MM);
      }

      if (!fleetMap[fleet]) {
        fleetMap[fleet] = { name: fleet, critical: 0, warning: 0, planOrder: 0, normal: 0, total: 0 };
      }
      if (!monthMap[monthStr]) {
        monthMap[monthStr] = { name: monthStr, critical: 0, warning: 0, planOrder: 0, normal: 0, total: 0, sortKey: sortKey };
      }
      const tread = tire.avgTreadIn;
      if (tread !== null) {
        fleetMap[fleet].total++;
        monthMap[monthStr].total++;
        if (tread <= 2) { fleetMap[fleet].critical++; monthMap[monthStr].critical++; totalCritical++; }
        else if (tread < 4) { fleetMap[fleet].warning++; monthMap[monthStr].warning++; totalWarning++; }
        else if (tread < 7) { fleetMap[fleet].planOrder++; monthMap[monthStr].planOrder++; totalPlan++; }
        else { fleetMap[fleet].normal++; monthMap[monthStr].normal++; totalNormal++; }
      }
      const d1 = tire['D1_เข้า'], d2 = tire['D2_เข้า'], d3 = tire['D3_เข้า'], d4 = tire['D4_เข้า'];
      const wearIssues = analyzeTireWear(d1, d2, d3, d4, tire['ตำแหน่งล้อยาง']) || [];
      wearIssues.forEach(issue => {
        if (issueMap[issue.text] === undefined) issueMap[issue.text] = 0;
        issueMap[issue.text]++;
      });
    });

    const allFleets = Object.values(fleetMap);
    // Sort from most to least (descending) based on the total tires that need replacement
    allFleets.sort((a, b) => (b.critical + b.warning + b.planOrder) - (a.critical + a.warning + a.planOrder));

    let fleetList = allFleets;
    if (allFleets.length > 25) {
      const top25 = allFleets.slice(0, 25);
      const others = allFleets.slice(25).reduce((acc, curr) => {
        acc.critical += curr.critical; acc.warning += curr.warning;
        acc.planOrder += curr.planOrder; acc.normal += curr.normal;
        acc.total += curr.total;
        return acc;
      }, { name: 'อื่นๆ', critical: 0, warning: 0, planOrder: 0, normal: 0, total: 0 });
      fleetList = [...top25, others];
    }

    // Compute percentage-based chart data (sorted worst first, reversed for horizontal chart)
    const fleetChartData = fleetList
      .map(f => ({
        name: f.name,
        criticalPct: f.total > 0 ? parseFloat(((f.critical / f.total) * 100).toFixed(1)) : 0,
        warningPct: f.total > 0 ? parseFloat(((f.warning / f.total) * 100).toFixed(1)) : 0,
        planOrderPct: f.total > 0 ? parseFloat(((f.planOrder / f.total) * 100).toFixed(1)) : 0,
        normalPct: f.total > 0 ? parseFloat(((f.normal / f.total) * 100).toFixed(1)) : 0,
        criticalAbs: f.critical, warningAbs: f.warning, planOrderAbs: f.planOrder, normalAbs: f.normal, total: f.total,
      }));

    // Top 5 by absolute critical count
    const top5Critical = [...allFleets]
      .filter(f => f.critical > 0)
      .sort((a, b) => b.critical - a.critical)
      .slice(0, 5);

    const totalIssues = Object.values(issueMap).reduce((a, b) => a + b, 0);
    const issueChartData = Object.entries(issueMap)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name, value, percent: totalIssues > 0 ? parseFloat(((value / totalIssues) * 100).toFixed(1)) : 0 }))
      .sort((a, b) => Number(b.value) - Number(a.value));

    // Month chart data
    const monthList = Object.values(monthMap).sort((a, b) => a.sortKey - b.sortKey);
    const monthChartData = monthList.map(m => {
      return {
        name: m.name,
        criticalPct: m.total > 0 ? parseFloat(((m.critical / m.total) * 100).toFixed(1)) : 0,
        warningPct: m.total > 0 ? parseFloat(((m.warning / m.total) * 100).toFixed(1)) : 0,
        planOrderPct: m.total > 0 ? parseFloat(((m.planOrder / m.total) * 100).toFixed(1)) : 0,
        normalPct: m.total > 0 ? parseFloat(((m.normal / m.total) * 100).toFixed(1)) : 0,
        criticalAbs: m.critical, warningAbs: m.warning, planOrderAbs: m.planOrder, normalAbs: m.normal, total: m.total,
      };
    });

    return { fleetChartData, monthChartData, issueChartData, top5Critical, totalCritical, totalWarning, totalPlan, totalNormal };
  }, [filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, filterFleet, filterTruck, filterPos, filterTruckStatus, filterGpsStatus, filterTruckType, sortBy]);

  // trucksData groups ALL tires per truck (using baseFiltered so chassis shows complete layout)
  // but only includes trucks that appear in `filtered` (urgency + dropdown filters)
  const trucksData = useMemo(() => {
    const now = new Date();
    const currentMM = now.getMonth() + 1;
    const currentYYYY = now.getFullYear();

    // Get the set of truck numbers that pass the urgency filter
    const matchingTruckNos = new Set(filtered.map(t => String(t['เบอร์รถ']).trim()));

    const grouped = {};
    // Use baseFiltered so each truck card always shows ALL its tires in full chassis
    baseFiltered.forEach(tire => {
      const truckNo = String(tire['เบอร์รถ']).trim();
      // Only include trucks that have at least one tire matching the urgency filter
      if (!matchingTruckNos.has(truckNo)) return;

      if (!grouped[truckNo]) {
        grouped[truckNo] = {
          truckNo,
          tires: [],
          criticalCount: 0,
          warningCount: 0,
          overdueTiresCount: 0,
          missingTiresCheckStatus: 'ok',
          maxMonthsBehind: 0,
          truckType: tire.truckType,
          plateHead: tire['ทะเบียนหัว'],
          plateTail: tire['ทะเบียนหาง'],
          fleet: tire['สังกัดรถ']
        };
      }

      let mm = parseInt(tire['MM'], 10);
      let yyyy = parseInt(tire['YYYY'], 10);
      if (!isNaN(mm) && !isNaN(yyyy)) {
        if (yyyy < 100) yyyy += 2000;
        else if (yyyy > 2400) yyyy -= 543;

        let monthsBehind = (currentYYYY - yyyy) * 12 + (currentMM - mm);
        if (monthsBehind < 0) monthsBehind = 0;

        if (monthsBehind > grouped[truckNo].maxMonthsBehind) {
          grouped[truckNo].maxMonthsBehind = monthsBehind;
        }
        if (monthsBehind >= 1) {
          grouped[truckNo].overdueTiresCount++;
          if (monthsBehind >= 2) {
            grouped[truckNo].missingTiresCheckStatus = 'overdue';
          } else if (grouped[truckNo].missingTiresCheckStatus !== 'overdue') {
            grouped[truckNo].missingTiresCheckStatus = 'warning';
          }
        }
      }
      grouped[truckNo].tires.push(tire);
      if (tire.avgTreadIn !== null) {
        if (tire.avgTreadIn <= 2) grouped[truckNo].criticalCount++;
        else if (tire.avgTreadIn < 4) grouped[truckNo].warningCount++;
      }

      if (!grouped[truckNo].truckType || grouped[truckNo].truckType === 'ไม่ระบุ') {
        grouped[truckNo].truckType = tire.truckType;
      }
      if (!grouped[truckNo].plateHead && tire['ทะเบียนหัว']) {
        grouped[truckNo].plateHead = tire['ทะเบียนหัว'];
      }
      if (!grouped[truckNo].plateTail && tire['ทะเบียนหาง']) {
        grouped[truckNo].plateTail = tire['ทะเบียนหาง'];
      }
    });

    return Object.values(grouped).map(g => {
      g.truckType = unifiedTruckTypes[g.truckNo] || g.truckType;
      return g;
    }).sort((a, b) => {
      // Guard: if tires array is empty, treat minTread as 99 (safe fallback)
      const minTreadA = a.tires.length > 0 ? Math.min(...a.tires.map(t => t.avgTreadIn ?? 99)) : 99;
      const minTreadB = b.tires.length > 0 ? Math.min(...b.tires.map(t => t.avgTreadIn ?? 99)) : 99;

      if (sortBy === 'tread_asc') {
        if (minTreadA !== minTreadB) return minTreadA - minTreadB;
        return b.criticalCount - a.criticalCount || b.warningCount - a.warningCount;
      }
      if (sortBy === 'tread_desc') {
        if (minTreadA !== minTreadB) return minTreadB - minTreadA;
        return a.criticalCount - b.criticalCount || a.warningCount - b.warningCount;
      }
      if (sortBy === 'truck') {
        const numA = parseInt(a.truckNo.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.truckNo.replace(/[^0-9]/g, ''), 10) || 0;
        if (numA !== numB) return numA - numB;
        return a.truckNo.localeCompare(b.truckNo);
      }
      return 0;
    });
  }, [data, filtered, baseFiltered, sortBy]);

  const totalPages = viewMode === 'grid'
    ? Math.max(1, Math.ceil(trucksData.length / ROWS_PER_PAGE))
    : Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));

  const currentData = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);
  const currentTrucksData = trucksData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  useEffect(() => {
    if (viewMode === 'grid' && currentTrucksData.length > 0) {
      if (!selectedTruckNo || !currentTrucksData.find(t => t.truckNo === selectedTruckNo)) {
        setSelectedTruckNo(currentTrucksData[0].truckNo);
      }
    }
  }, [currentTrucksData, viewMode, selectedTruckNo]);



  const resetFilters = () => {
    setFilter('all');
    setFilterFleet('');
    setFilterTruck('');
    setFilterPos('');
    setFilterTruckStatus('');
    setFilterGpsStatus('');
    setFilterTruckType('');
  };

  const exportCsv = () => {
    const headers = ['เบอร์รถ', 'สังกัด', 'ตำแหน่งล้อ', 'หมายเลขยาง', 'ชนิดยาง', 'วันติดตั้ง', 'ดอกยางเฉลี่ย (มม.)', 'ความเร่งด่วน', 'วันเหลือ', 'คาดการณ์วันถอด'];
    const rows = filtered.map(r => {
      const urgency = r.estimatedDaysLeft < 30 ? 'เปลี่ยนทันที' : r.estimatedDaysLeft < 90 ? 'เปลี่ยน' : 'ปกติ';
      const fDate = r.forecastDate ? format(r.forecastDate, 'dd/MM/yyyy') : '-';
      return [r['เบอร์รถ'], r['สังกัดรถ'], r['ตำแหน่งล้อยาง'], r['หมายเลขยาง_เข้า'], r['ชนิด/ขนาดยาง_เข้า'] || '-', r['วันที่ติดตั้ง'] || r['วันที่อัปเดต'], r.avgTreadIn, urgency, r.estimatedDaysLeft, fDate];
    });
    const csvContent = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `tire_planning_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click(); URL.revokeObjectURL(url);
  };

  const selectStyle = {
    background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px',
    padding: '0.4rem 0.75rem', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none',
  };

  return (
    <>
      <div className="planning-container">
        <LegendModal isOpen={showLegend} onClose={() => setShowLegend(false)} />
        <WearStatsModal isOpen={showWearStats} onClose={() => setShowWearStats(false)} wearRates={wearRates} />

        {/* KPI Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div onClick={() => setFilter('all')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'all' ? '2px solid var(--text-secondary)' : '1px solid var(--border-light)', background: filter === 'all' ? 'linear-gradient(rgba(148,163,184,0.15), rgba(148,163,184,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>ทั้งหมด<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(148,163,184,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><LayoutGrid size={16} color="#94a3b8" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{baseFiltered.length.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('critical')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'critical' ? '2px solid #ef4444' : '1px solid var(--border-light)', background: filter === 'critical' ? 'linear-gradient(rgba(239,68,68,0.15), rgba(239,68,68,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>เปลี่ยนทันที<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(239,68,68,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><AlertTriangle size={16} color="#ef4444" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ef4444', lineHeight: 1 }}>{criticalCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('warning')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'warning' ? '2px solid #f59e0b' : '1px solid var(--border-light)', background: filter === 'warning' ? 'linear-gradient(rgba(245,158,11,0.15), rgba(245,158,11,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>เปลี่ยน<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(245,158,11,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Clock size={16} color="#f59e0b" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>{warningCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('plan_order')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'plan_order' ? '2px solid #3b82f6' : '1px solid var(--border-light)', background: filter === 'plan_order' ? 'linear-gradient(rgba(59,130,246,0.15), rgba(59,130,246,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>วางแผนสั่ง<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(59,130,246,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><CheckCircle size={16} color="#3b82f6" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#3b82f6', lineHeight: 1 }}>{planOrderCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('normal')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'normal' ? '2px solid #10b981' : '1px solid var(--border-light)', background: filter === 'normal' ? 'linear-gradient(rgba(16,185,129,0.15), rgba(16,185,129,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>ปกติ<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(16,185,129,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><ShieldCheck size={16} color="#10b981" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#10b981', lineHeight: 1 }}>{normalCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('unknown')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'unknown' ? '2px solid #64748b' : '1px solid var(--border-light)', background: filter === 'unknown' ? 'linear-gradient(rgba(100,116,139,0.15), rgba(100,116,139,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>ไม่มีข้อมูล<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(100,116,139,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><HelpCircle size={16} color="#64748b" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#64748b', lineHeight: 1 }}>{unknownCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('missing_tires')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'missing_tires' ? '2px solid #a855f7' : '1px solid var(--border-light)', background: filter === 'missing_tires' ? 'linear-gradient(rgba(168,85,247,0.15), rgba(168,85,247,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>รถล้อไม่ครบ<br />(คัน)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(168,85,247,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><AlertOctagon size={16} color="#a855f7" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#a855f7', lineHeight: 1 }}>{missingTrucksCount.toLocaleString()}</span>
          </div>
          <div onClick={() => setFilter('overdue_inspection')} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.85rem', borderRadius: '12px', cursor: 'pointer', border: filter === 'overdue_inspection' ? '2px solid #ea580c' : '1px solid var(--border-light)', background: filter === 'overdue_inspection' ? 'linear-gradient(rgba(234,88,12,0.15), rgba(234,88,12,0.15)), var(--glass-bg)' : 'var(--glass-bg)', transition: 'all 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1.3 }}>ยางขาดตรวจ<br />(เส้น)</span>
              <div style={{ width: 32, height: 32, flexShrink: 0, borderRadius: '8px', background: 'rgba(234,88,12,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Search size={16} color="#ea580c" /></div>
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ea580c', lineHeight: 1 }}>{overdueTiresCount.toLocaleString()}</span>
          </div>
        </div>



        <div className="glass-panel" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Header & Main Actions */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div className="card-header fade-in" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-badge">
                  <Settings size={20} color="var(--accent-primary)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>แผนถอดยาง (Tire Planning)</h2>
                  <div style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-secondary)', marginTop: '2px' }}>
                    วางแผนถอดเปลี่ยนและวิเคราะห์การสึกหรอของยาง
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ display: 'flex', background: 'var(--overlay-05)', borderRadius: '8px', padding: '3px', border: '1px solid var(--border-light)' }}>
                <button onClick={() => setViewMode('dashboard')} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: viewMode === 'dashboard' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'dashboard' ? '#ffffff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500, transition: '0.2s', boxShadow: viewMode === 'dashboard' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none' }}><BarChart2 size={16} /> แดชบอร์ด</button>
                <button onClick={() => setViewMode('grid')} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: viewMode === 'grid' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'grid' ? '#ffffff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500, transition: '0.2s', boxShadow: viewMode === 'grid' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none' }}><LayoutGrid size={16} /> การ์ดรถ</button>
                <button onClick={() => setViewMode('table')} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: viewMode === 'table' ? 'var(--accent-primary)' : 'transparent', color: viewMode === 'table' ? '#ffffff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500, transition: '0.2s', boxShadow: viewMode === 'table' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none' }}><List size={16} /> ตาราง</button>
              </div>
              <button onClick={() => setShowLegend(true)} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
                background: 'var(--overlay-05)', border: '1px solid var(--border-medium)',
                borderRadius: '8px', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer',
                transition: '0.2s'
              }}>
                <HelpCircle size={16} /> คำอธิบาย
              </button>
              <button onClick={exportCsv} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem',
                background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)',
                borderRadius: '8px', color: 'var(--text-status-success)', fontFamily: 'inherit', fontSize: '0.85rem', cursor: 'pointer',
                transition: '0.2s'
              }}>
                <Download size={16} /> ส่งออก
              </button>
            </div>
          </div>

          <div style={{ height: 1, background: 'var(--border-medium)', margin: '0.25rem 0' }} />

          {/* Filter Control Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: '2 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="ค้นหาเบอร์รถ..."
                value={filterTruck}
                onChange={e => setFilterTruck(e.target.value)}
                style={{ ...selectStyle, paddingLeft: '30px', width: '100%' }}
              />
            </div>
            <select style={{ ...selectStyle, flex: '1 1 110px' }} value={filterFleet} onChange={e => setFilterFleet(e.target.value)}>
              <option value="">ทุกสังกัด</option>
              {fleets.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: '1 1 110px' }} value={filterTruckType} onChange={e => setFilterTruckType(e.target.value)}>
              <option value="">ทุกประเภทรถ</option>
              {truckTypes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: '1 1 110px' }} value={filterTruckStatus} onChange={e => setFilterTruckStatus(e.target.value)}>
              <option value="">ทุกสถานะรถ</option>
              {truckStatuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...selectStyle, flex: '1 1 130px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="tread_asc">ดอกยางน้อยสุด</option>
              <option value="tread_desc">ดอกยางมากสุด</option>
              <option value="truck">เบอร์รถ</option>
            </select>
          <button onClick={resetFilters} title="รีเซ็ตตัวกรอง" style={{ ...selectStyle, padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={16} />
          </button>
        </div>
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
                  <button onClick={() => setChartGroupBy('fleet')} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', background: chartGroupBy === 'fleet' ? 'rgba(59,130,246,0.2)' : 'transparent', color: chartGroupBy === 'fleet' ? '#60a5fa' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}>ตามสังกัด</button>
            <button onClick={() => setChartGroupBy('month')} style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', background: chartGroupBy === 'month' ? 'rgba(59,130,246,0.2)' : 'transparent', color: chartGroupBy === 'month' ? '#60a5fa' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, transition: '0.2s' }}>รายเดือน</button>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {[{ color: '#ef4444', label: 'เปลี่ยนทันที' }, { color: '#f59e0b', label: 'เปลี่ยน' }, { color: '#3b82f6', label: 'วางแผนสั่ง' }].map(l => (
              <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: l.color, display: 'inline-block' }} />{l.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div style={{ width: '100%', height: 420 }}>
        <ResponsiveContainer>
          <BarChart data={chartGroupBy === 'fleet' ? dashboardData.fleetChartData : dashboardData.monthChartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="name" stroke="var(--text-secondary)"
              tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
              tickFormatter={(val) => val ? (String(val).length > 15 ? String(val).substring(0, 14) + '…' : val) : ''}
              angle={-45}
              textAnchor="end"
              height={80}
              dy={15}
              interval={0}
            />
            <YAxis type="number" stroke="transparent" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={40} />
            <RechartsTooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              contentStyle={{ backgroundColor: '#1a1f2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.82rem' }}
              formatter={(value, name, props) => {
                const d = props?.payload || {};
                const map = { criticalAbs: [d.criticalPct || 0, 'เปลี่ยนทันที'], warningAbs: [d.warningPct || 0, 'เปลี่ยน'], planOrderAbs: [d.planOrderPct || 0, 'วางแผนสั่ง'] };
                const [pct, label] = map[name] || [0, name];
                return [`${value} เส้น (${pct}%)`, label];
              }}
            />
            <Bar dataKey="planOrderAbs" name="planOrderAbs" stackId="a" fill="#3b82f6" />
            <Bar dataKey="warningAbs" name="warningAbs" stackId="a" fill="#f59e0b" />
            <Bar dataKey="criticalAbs" name="criticalAbs" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div >

      {/* Row 3: Diagnostics + Top 5 Critical */ }
      < div style = {{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }
}>

  {/* Diagnostic Issues Pie Chart */ }
  < div className = "glass-panel" style = {{ padding: '1.5rem', borderRadius: '16px', background: 'var(--overlay-black-30)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>ประเภทปัญหาการสึกหรอ</h3>
              <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>เรียงตามจำนวนยางที่ตรวจพบ</p>
{
  dashboardData.issueChartData.length > 0 ? (
    <div style={{ width: '100%', height: 240, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={dashboardData.issueChartData}
            cx="40%"
            cy="50%"
            innerRadius={65}
            outerRadius={90}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {dashboardData.issueChartData.map((entry, index) => {
              const COLORS = ['#ef4444', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#10b981'];
              return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
            })}
          </Pie>
          <RechartsTooltip
            contentStyle={{ backgroundColor: '#1a1f2e', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '0.85rem' }}
            itemStyle={{ color: '#fff' }}
            formatter={(value, name, props) => [`${value} เส้น (${props.payload.percent}%)`, '']}
          />
          <Legend
            layout="vertical"
            verticalAlign="middle"
            align="right"
            wrapperStyle={{ fontSize: '0.75rem', color: 'var(--text-secondary)', width: '55%', right: 0 }}
            formatter={(value, entry) => {
              const { payload } = entry;
              return <span style={{ color: 'var(--text-primary)' }}>{value} <span style={{ color: 'var(--text-muted)' }}>({payload.value} เส้น, {payload.percent}%)</span></span>;
            }}
          />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  ) : (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem' }}>
    <span style={{ fontSize: '2rem' }}>✅</span>
    <span>ไม่พบปัญหาการสึกหรอผิดปกติ</span>
  </div>
)
}
            </div >

  {/* Top 5 Critical Fleets */ }
  < div className = "glass-panel" style = {{ padding: '1.5rem', borderRadius: '16px', background: 'var(--overlay-black-30)' }}>
              <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>5 สังกัดที่มียางวิกฤตมากที่สุด</h3>
              <p style={{ margin: '-0.5rem 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>เรียงตามจำนวนยางเปลี่ยนทันที (≤ 2 มม.)</p>
{
  dashboardData.top5Critical.length > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
      {dashboardData.top5Critical.map((fleet, i) => {
        const maxCritical = Math.max(...dashboardData.top5Critical.map(f => f.critical), 1);
        const pct = (fleet.critical / maxCritical) * 100;
        return (
          <div key={fleet.name} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'rgba(239, 68, 68, 0.15)' : i === 1 ? 'rgba(249, 115, 22, 0.15)' : 'rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : 'var(--text-secondary)', flexShrink: 0 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fleet.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{fleet.critical}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>เส้น</span>
                </div>
              </div>
              <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: i === 0 ? '#ef4444' : i === 1 ? '#f97316' : '#f59e0b', borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem' }}>
    <span style={{ fontSize: '2rem' }}>🎉</span>
    <span>ไม่มีสังกัดที่วิกฤต</span>
  </div>
)
}
            </div >
          </div >
          </>
      ) : viewMode === 'grid' ? (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
    {/* Chassis View Mode Toggle */}
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.25rem' }}>
      <div style={{ display: 'flex', background: 'var(--overlay-05)', borderRadius: '8px', padding: '4px', border: '1px solid var(--border-light)' }}>
        <button
          onClick={() => setChassisViewMode('tread')}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: chassisViewMode === 'tread' ? 'var(--accent-primary)' : 'transparent', color: chassisViewMode === 'tread' ? '#ffffff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: '0.2s', boxShadow: chassisViewMode === 'tread' ? '0 2px 8px rgba(16,185,129,0.3)' : 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <LayoutGrid size={14} /> โหมดดูดอกยาง
        </button>
        <button
          onClick={() => setChassisViewMode('check')}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: chassisViewMode === 'check' ? '#f59e0b' : 'transparent', color: chassisViewMode === 'check' ? '#ffffff' : 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, transition: '0.2s', boxShadow: chassisViewMode === 'check' ? '0 2px 8px rgba(245,158,11,0.3)' : 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Clock size={14} /> โหมดดูการตรวจเช็ค
        </button>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
      {currentTrucksData.map(truck => {
        const rawId = String(truck.truckNo).trim();
        const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
        const hasUnbalanced = truck.tires.some(t => t.isUnbalanced);
        return (
          <div key={truck.truckNo} className="glass-panel fade-in" style={{
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            border: '1px solid var(--border-light)',
            boxShadow: truck.criticalCount > 0 ? '0 0 0 1px rgba(239,68,68,0.3), 0 4px 20px rgba(239,68,68,0.1)' : truck.warningCount > 0 ? '0 0 0 1px rgba(245,158,11,0.3), 0 4px 20px rgba(245,158,11,0.1)' : 'var(--glass-shadow)',
            outline: hasUnbalanced ? '2px dashed rgba(239, 68, 68, 0.4)' : 'none',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', minWidth: 0 }} onClick={() => onTruckClick?.(truck.truckNo)}>
                  <Truck size={18} color="var(--accent-primary)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', textDecoration: 'underline', textDecorationColor: 'transparent', transition: '0.2s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onMouseOver={e => e.target.style.textDecorationColor = 'var(--accent-primary)'} onMouseOut={e => e.target.style.textDecorationColor = 'transparent'}>{truck.truckNo}</span>
                  {truck.criticalCount > 0 ? <div title="มีล้อที่ต้องเปลี่ยนทันที (วิกฤต)" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', flexShrink: 0 }} /> : truck.warningCount > 0 ? <div title="มีล้อที่ควรเปลี่ยน (เตือน)" style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b', flexShrink: 0 }} /> : null}
                </div>
                {meta?.truckStatus && (() => {
                  const statusStyle = getTruckStatusStyle(meta.truckStatus);
                  return (
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 600, background: 'rgba(148,163,184,0.1)', color: statusStyle.color,
                      border: 'none', padding: '4px 10px', borderRadius: '9999px',
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      whiteSpace: 'nowrap', flexShrink: 0
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot, flexShrink: 0 }}></div>
                      {meta.truckStatus}
                    </span>
                  );
                })()}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {truck.truckType && (() => {
                  const badge = getVehicleTypeBadge(truck.truckType);
                  return (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600,
                      background: 'rgba(148,163,184,0.1)',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      padding: '3px 8px', borderRadius: '999px',
                      whiteSpace: 'nowrap',
                    }}>
                      {badge.label}
                    </span>
                  );
                })()}
                {truck.fleet && (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {truck.truckType ? '• ' : ''}{truck.fleet}
                  </span>
                )}
              </div>
            </div>

            {/* Check Status Badges - Full width alert style */}
            {(truck.missingTiresCheckStatus === 'overdue' || truck.missingTiresCheckStatus === 'warning' || truck.missingTiresCheckStatus === 'ok') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {truck.missingTiresCheckStatus === 'overdue' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    color: '#f87171', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <Clock size={14} style={{ flexShrink: 0 }} />
                    <span>ยางขาดตรวจ {truck.overdueTiresCount} เส้น (นานสุด {truck.maxMonthsBehind >= 12 ? 'เกิน 1 ปี' : truck.maxMonthsBehind + ' เดือน'})</span>
                  </div>
                )}
                {truck.missingTiresCheckStatus === 'warning' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <Clock size={14} style={{ flexShrink: 0 }} />
                    <span>ยางขาดตรวจ 1 เดือน ({truck.overdueTiresCount} เส้น)</span>
                  </div>
                )}
                {truck.missingTiresCheckStatus === 'ok' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    color: '#34d399', fontSize: '0.8rem', fontWeight: 600
                  }}>
                    <CheckCircle size={14} style={{ flexShrink: 0 }} />
                    <span>ตรวจเช็คครบทุกเส้นแล้ว</span>
                  </div>
                )}
              </div>
            )}

            {/* Chassis Layout */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}>
              <div style={{ zoom: 1.15 }}>
                <TruckChassis type={truck.truckType} tires={truck.tires} plateHead={truck.plateHead} plateTail={truck.plateTail} onHeadClick={(plate) => setSelectedPlate({ type: 'head', plate, truckNo: truck.truckNo })} onTailClick={(plate) => setSelectedPlate({ type: 'tail', plate, truckNo: truck.truckNo })} onTireClick={onTireClick} hasCritical={truck.criticalCount > 0} chassisViewMode={chassisViewMode} />
              </div>
            </div>

            {/* Footer Info */}
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
              {(meta?.gpsLocation || meta?.gpsTime) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {meta.gpsTime && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
                      <Clock size={12} style={{ flexShrink: 0 }} />
                      <span>{meta.gpsTime}</span>
                    </div>
                  )}
                  {meta.gpsLocation && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                      <MapPin size={12} color="var(--text-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
                      <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={meta.gpsLocation}>{meta.gpsLocation}</span>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {truck.criticalCount > 0 && <span style={{ color: '#f87171', fontWeight: 600 }}>เปลี่ยนทันที {truck.criticalCount}</span>}
                  {truck.warningCount > 0 && <span style={{ color: '#fbbf24', fontWeight: 600 }}>เปลี่ยน {truck.warningCount}</span>}
                  {truck.criticalCount === 0 && truck.warningCount === 0 && <span style={{ color: '#34d399' }}>ยางปกติทั้งหมด</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{truck.tires.length} เส้น</span>
                  <button
                    onClick={() => setRotationTruck(truck)}
                    title="แนะนำการสลับตำแหน่งยาง"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '6px',
                      background: 'rgba(59,130,246,0.1)', color: '#60a5fa',
                      border: 'none', cursor: 'pointer',
                      fontSize: '0.72rem', fontWeight: 600, transition: '0.2s',
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.2)'; e.currentTarget.style.color = '#93c5fd'; }}
                    onMouseOut={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.1)'; e.currentTarget.style.color = '#60a5fa'; }}
                  >
                    <RotateCcw size={12} /> สลับยาง
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {currentTrucksData.length === 0 && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', gap: '1rem', color: 'var(--text-muted)' }}>
          <Search size={48} color="var(--text-muted)" style={{ opacity: 0.5 }} />
          <span style={{ fontSize: '1rem', fontWeight: 600 }}>ไม่พบข้อมูลรถที่ตรงกับเงื่อนไขที่เลือก</span>
          <button onClick={resetFilters} style={{ marginTop: '0.5rem', padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-medium)', background: 'var(--overlay-05)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.85rem' }}>ล้างตัวกรองทั้งหมด</button>
        </div>
      )}
    </div>
  </div>
) : (
  <div className="glass-panel">
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>เบอร์รถ</th>
            <th>สถานะรถ</th>
            <th>พิกัด / สถานะ (GPS)</th>
            <th>สังกัด / ทะเบียน</th>
            <th>ตำแหน่งล้อ</th>
            <th>หมายเลขยาง</th>
            <th>ชนิด/ขนาด</th>
            <th>วันที่ติดตั้ง</th>
            <th style={{ minWidth: '180px' }}>ดอกยางปัจจุบันเฉลี่ย</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((row, idx) => {
            return (
              <tr key={idx}>
                <td
                  onClick={() => row['เบอร์รถ'] && onTruckClick?.(row['เบอร์รถ'])}
                  style={{ cursor: 'pointer' }}
                  title="คลิกเพื่อดูประวัติรถคันนี้"
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.6rem', background: 'var(--overlay-05)', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                      <Truck size={14} color="var(--accent-primary)" />
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem', letterSpacing: '0.02em' }}>{row['เบอร์รถ']}</span>
                    </div>
                    {(() => {
                      let displayType = row.truckType;
                      const hasHead = Boolean(row['ทะเบียนหัว']);
                      const hasTail = Boolean(row['ทะเบียนหาง']);

                      if (hasHead && hasTail) {
                        displayType = 'เทรลเลอร์';
                      } else if (!displayType || displayType === 'ไม่ระบุ') {
                        if (hasHead) displayType = 'หัวลาก';
                      }

                      if (displayType && displayType !== 'ไม่ระบุ') {
                        const badge = getVehicleTypeBadge(displayType);
                        return (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.05em',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            padding: '2px 8px', borderRadius: '9999px'
                          }}>
                            {badge.label}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </td>
                <td>
                  {(() => {
                    const rawId = String(row['เบอร์รถ']).trim();
                    const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
                    if (!meta?.truckStatus) return <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>-</span>;
                    const statusStyle = getTruckStatusStyle(meta.truckStatus);
                    return (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        background: `linear-gradient(135deg, ${statusStyle.bg}, transparent)`,
                        color: statusStyle.color,
                        border: `1px solid ${statusStyle.border}`,
                        padding: '4px 10px', borderRadius: '9999px',
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        boxShadow: `0 2px 8px ${statusStyle.border}`
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusStyle.dot }}></div>
                        {meta.truckStatus}
                      </span>
                    );
                  })()}
                </td>
                <td>
                  {(() => {
                    const rawId = String(row['เบอร์รถ']).trim();
                    const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
                    if (!meta?.gpsStatus && !meta?.gpsLocation && !meta?.gpsTime) return <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>-</span>;
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {meta.gpsStatus && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-status-cyan)', background: 'rgba(56, 189, 248, 0.1)', padding: '3px 10px', borderRadius: '9999px', alignSelf: 'flex-start', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Navigation size={10} style={{ opacity: 0.8 }} />
                            {meta.gpsStatus}
                          </span>
                        )}
                        {meta.gpsTime && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: 'var(--text-status-purple)' }}>
                            <Clock size={10} style={{ flexShrink: 0 }} />
                            {meta.gpsTime}
                          </div>
                        )}
                        {meta.gpsLocation && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.3rem', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '220px', lineHeight: 1.4 }}>
                            <MapPin size={12} color="#64748b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} title={meta.gpsLocation}>{meta.gpsLocation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{row['สังกัดรถ'] || '-'}</div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {row['ทะเบียนหัว'] && <span>หัว: <span style={{ color: 'var(--text-secondary)' }}>{row['ทะเบียนหัว']}</span></span>}
                    {row['ทะเบียนหัว'] && row['ทะเบียนหาง'] && <span style={{ color: '#475569' }}>|</span>}
                    {row['ทะเบียนหาง'] && <span>หาง: <span style={{ color: 'var(--text-secondary)' }}>{row['ทะเบียนหาง']}</span></span>}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', padding: '2px 10px', fontSize: '0.85rem' }}>{row['ตำแหน่งล้อยาง']}</span>
                </td>
                <td
                  onClick={() => row['หมายเลขยาง_เข้า'] && onTireClick?.(row['หมายเลขยาง_เข้า'])}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--accent-primary)', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {row['หมายเลขยาง_เข้า']}
                </td>
                <td style={{ fontSize: '0.85rem' }}>{row['ชนิด/ขนาดยาง_เข้า'] || '-'}</td>
                <td style={{ fontSize: '0.85rem' }}>{row['วันที่ติดตั้ง'] || row['วันที่อัปเดต'] || row['วันที่บันทึก']}</td>
                <td style={{ minWidth: '180px' }}><TreadProgressBar current={row.avgTreadIn} /></td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan="10" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                ไม่มีข้อมูลยางที่กำลังใช้งาน
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

{/* Pagination */ }
{
  viewMode !== 'dashboard' && totalPages > 0 && (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', padding: '0.75rem 1.25rem', background: 'var(--overlay-black-20)', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        {viewMode === 'grid'
          ? `แสดงรถคันที่ ${(currentPage - 1) * ROWS_PER_PAGE + 1} ถึง ${Math.min(currentPage * ROWS_PER_PAGE, trucksData.length)} จากทั้งหมด ${trucksData.length} คัน`
          : `แสดงรายการที่ ${(currentPage - 1) * ROWS_PER_PAGE + 1} ถึง ${Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} จากทั้งหมด ${filtered.length} รายการ`
        }
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ ...selectStyle, padding: '0.4rem 0.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
        >
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontSize: '0.85rem', margin: '0 0.5rem', fontWeight: 500 }}>หน้าที่ {currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ ...selectStyle, padding: '0.4rem 0.5rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
    </div >

    {rotationTruck && (
      <TireRotationModal truck={rotationTruck} onClose={() => setRotationTruck(null)} />
    )}
    {selectedPlate && (
      <PlateTimelineModal 
        plateInfo={selectedPlate} 
        rawData={rawData} 
        onClose={() => setSelectedPlate(null)} 
      />
    )}
    </>
  );
}

export default function Planning(props) {
  return (
    <PlanningErrorBoundary>
      <PlanningInner {...props} />
    </PlanningErrorBoundary>
  );
}

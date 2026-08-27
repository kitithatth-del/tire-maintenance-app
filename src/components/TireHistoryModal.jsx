import React, { useMemo } from 'react';
import { X, ArrowDownCircle, ArrowUpCircle, Search, Calendar, Truck, Wrench, FileText, Settings } from 'lucide-react';
import { parseDateThai } from '../utils/dataParser';

const TireHistoryModal = ({ tireNumber, data, onClose }) => {
  const tireAliases = useMemo(() => {
    if (!tireNumber || !data) return new Set();
    const initialStr = String(tireNumber).trim();
    const aliases = new Set([initialStr]);
    initialStr.split('/').forEach(p => {
      const pt = p.trim();
      if (pt) aliases.add(pt);
    });
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      data.forEach(row => {
        const inId = String(row['หมายเลขยาง_เข้า'] || '').trim();
        const outId = String(row['หมายเลขยาง_ออก'] || '').trim();
        
        const checkAndAdd = (idStr) => {
          if (!idStr || idStr === 'undefined' || idStr === 'null') return;
          const parts = idStr.split('/').map(p => p.trim()).filter(Boolean);
          if (parts.some(p => aliases.has(p)) || aliases.has(idStr)) {
            parts.forEach(p => {
              if (!aliases.has(p)) { aliases.add(p); addedNew = true; }
            });
            if (!aliases.has(idStr)) { aliases.add(idStr); addedNew = true; }
          }
        };
        checkAndAdd(inId);
        checkAndAdd(outId);
      });
    }
    return aliases;
  }, [tireNumber, data]);

  const events = useMemo(() => {
    if (!tireNumber || !data) return [];
    
    const evts = [];

    data.forEach(row => {
      const inId = String(row['หมายเลขยาง_เข้า'] || '').trim();
      const outId = String(row['หมายเลขยาง_ออก'] || '').trim();

      // Determine dateStr for installed/inspection
      const isInspectionForm = String(row['ประเภทแบบฟอร์ม'] || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ข้อมูลยาง');
      const inDateStr = isInspectionForm 
        ? (row['วันที่อัปเดต'] || row['วันที่บันทึก'] || row['วันที่ติดตั้ง'])
        : (row['วันที่ติดตั้ง'] || row['วันที่บันทึก'] || row['วันที่อัปเดต']);

      // Installed event
      if (tireAliases.has(inId)) {
        const dateObj = parseDateThai(inDateStr);
        const displayDate = inDateStr || 'ไม่ระบุวันที่';
        
        evts.push({
          id: `in-${row['เบอร์รถ']}-${inDateStr}`,
          type: isInspectionForm ? 'inspection' : 'installed',
          tireId: inId,
          dateStr: displayDate,
          dateObj: dateObj,
          truck: row['เบอร์รถ'],
          headPlate: row['ทะเบียนหัว'],
          unit: row['สังกัดรถ'],
          position: row['ตำแหน่งล้อยาง'],
          tread: row.avgTreadIn,
          pressure: row['แรงดันก่อน(PSI)'] || row['แรงดันก่อน'] || row['แรงดันหลัง(PSI)'] || row['แรงดันหลัง'],
          formType: row['ประเภทแบบฟอร์ม'],
          center: row['ศูนย์บริการ']
        });
      }
      
      // Determine dateStr for removed
      const outDateStr = row['วันที่ติดตั้ง'] || row['วันที่บันทึก'] || row['วันที่อัปเดต'];

      // Removed event
      if (tireAliases.has(outId)) {
        const dateObj = parseDateThai(outDateStr);
        const displayDate = outDateStr || 'ไม่ระบุวันที่';

        evts.push({
          id: `out-${row['เบอร์รถ']}-${outDateStr}`,
          type: 'removed',
          tireId: outId,
          dateStr: displayDate,
          dateObj: dateObj,
          truck: row['เบอร์รถ'],
          headPlate: row['ทะเบียนหัว'],
          unit: row['สังกัดรถ'],
          position: row['ตำแหน่งล้อยาง'],
          tread: row.avgTreadOut,
          reason: row['สาเหตุที่ถอด'],
          status: row['สถานะยางออก'],
          formType: row['ประเภทแบบฟอร์ม'],
          center: row['ศูนย์บริการ'],
          wo: row['ใบแจ้งซ่อม']
        });
      }
    });

    // Sort chronologically (Oldest first / Ascending)
    evts.sort((a, b) => {
      if (!a.dateObj && !b.dateObj) return 0;
      if (!a.dateObj) return -1;
      if (!b.dateObj) return 1;
      
      const timeDiff = a.dateObj.getTime() - b.dateObj.getTime();
      if (timeDiff !== 0) return timeDiff;

      // Same date logic (Oldest first)
      // Order of events physically on the same day: 
      // 1. Removed from old position
      // 2. Installed to new position
      // 3. Inspection happens while installed
      if (a.truck === b.truck && a.position === b.position) {
        // If same position: Installed -> Inspection -> Removed
        const order = { 'installed': 1, 'inspection': 2, 'removed': 3 };
        return (order[a.type] || 2) - (order[b.type] || 2);
      }
      
      // If different positions (e.g. rotation): Removed (from old) -> Installed (to new) -> Inspection
      const diffOrder = { 'removed': 1, 'installed': 2, 'inspection': 3 };
      return (diffOrder[a.type] || 2) - (diffOrder[b.type] || 2);
    });

    // Deduplicate same-day events of the same type
    const deduplicated = [];
    evts.forEach(evt => {
      if (deduplicated.length === 0) {
        deduplicated.push(evt);
        return;
      }
      const lastEvt = deduplicated[deduplicated.length - 1];
      
      // If same date and same event type, merge them
      if (lastEvt.dateStr === evt.dateStr && lastEvt.type === evt.type) {
        const lastHasTread = lastEvt.tread != null;
        const evtHasTread = evt.tread != null;
        
        let useNew = false;
        if (evtHasTread && !lastHasTread) {
          useNew = true;
        } else if (!evtHasTread && lastHasTread) {
          useNew = false;
        } else {
          // Both or neither have tread. Prefer specific form types.
          const evtIsGeneric = !evt.formType || evt.formType.includes('ไม่ระบุ');
          const lastIsGeneric = !lastEvt.formType || lastEvt.formType.includes('ไม่ระบุ');
          if (!evtIsGeneric && lastIsGeneric) useNew = true;
          else if (evtIsGeneric && !lastIsGeneric) useNew = false;
          else useNew = true; // Tiebreaker
        }

        if (useNew) {
          // Replace last event with the better one
          deduplicated[deduplicated.length - 1] = evt;
        }
      } else {
        deduplicated.push(evt);
      }
    });

    // Return descending (newest events at the top)
    return deduplicated.reverse();
  }, [tireNumber, data, tireAliases]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '600px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', padding: 0,
        boxShadow: 'var(--glass-shadow)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)',
          background: 'var(--overlay-05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              <Search size={16} color="var(--accent-primary)" /> ประวัติเส้นทางยาง
            </div>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontFamily: 'monospace', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '0.02em', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', rowGap: '4px' }}>
              <span style={{ overflowWrap: 'anywhere' }}>
                {(() => {
                  const aliases = Array.from(tireAliases).filter(a => a.includes('/'));
                  const displayId = aliases.length > 0 ? aliases[0] : tireNumber;
                  return displayId;
                })()}
              </span>
              {(() => {
                // Try to find the brand from any matching row
                const row = data.find(r => {
                  const inId = String(r['หมายเลขยาง_เข้า'] || '').trim();
                  const outId = String(r['หมายเลขยาง_ออก'] || '').trim();
                  return tireAliases.has(inId) || tireAliases.has(outId);
                });
                const inId = row ? String(row['หมายเลขยาง_เข้า'] || '').trim() : '';
                const brand = row ? (tireAliases.has(inId) ? row['ยี่ห้อยาง_เข้า'] : row['ยี่ห้อยาง_ออก']) : null;
                return brand ? <span style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginLeft: '12px', fontWeight: 600, fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>({brand})</span> : null;
              })()}
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--overlay-05)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)',
            width: 36, height: 36, minWidth: 36, minHeight: 36, borderRadius: '50%', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box', marginTop: 2
          }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
             onMouseOut={e => { e.currentTarget.style.background = 'var(--overlay-05)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}>
            <X size={18} />
          </button>
        </div>

        {/* Content - Timeline */}
        <div style={{ padding: '2rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              ไม่พบประวัติการใช้งานของยางหมายเลขนี้
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical line connecting timeline dots */}
              <div style={{
                position: 'absolute', top: '24px', bottom: '24px', left: '19px',
                width: '2px', background: 'var(--overlay-10)'
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {events.map((evt, idx) => {
                  const isInstalled = evt.type === 'installed';
                  const isInspection = evt.type === 'inspection';
                  
                  let Icon = ArrowDownCircle;
                  let iconColor = '#10b981'; // Green
                  let bgColor = 'var(--overlay-bg)';
                  let borderColor = 'rgba(16,185,129,0.5)';
                  let cardBg = 'rgba(16,185,129,0.03)';
                  
                  if (!isInstalled && !isInspection) {
                    Icon = ArrowUpCircle;
                    iconColor = '#ef4444'; // Red
                    borderColor = 'rgba(239,68,68,0.5)';
                    cardBg = 'rgba(239,68,68,0.03)';
                  } else if (isInspection) {
                    Icon = Search;
                    iconColor = '#3b82f6'; // Blue
                    borderColor = 'rgba(59,130,246,0.5)';
                    cardBg = 'rgba(59,130,246,0.03)';
                  }

                  return (
                    <div key={evt.id + idx} style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                      {/* Timeline Dot/Icon */}
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: bgColor, border: `2px solid ${borderColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Icon size={20} color={iconColor} />
                      </div>

                      {/* Event Details Card */}
                      <div className="fade-in" style={{
                        flex: 1, background: 'var(--glass-bg)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: `4px solid ${iconColor}`, borderRadius: '14px', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)'
                      }}>
                        <div style={{ background: `linear-gradient(135deg, ${cardBg} 0%, transparent 100%)`, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                          
                          {/* Header of card with Badges on top right */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                            
                            {/* Left: Action Title, Tire Serial, Date */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 auto', minWidth: '150px' }}>
                              <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: iconColor, letterSpacing: '-0.01em' }}>
                                {isInstalled 
                                  ? (evt.formType?.includes('สลับยาง') ? 'สลับยาง (เปลี่ยนตำแหน่ง)' : 'ติดตั้งเข้าสู่รถ') 
                                  : isInspection ? 'ตรวจเช็คสภาพยาง' : 'ถอดออกจากรถ'}
                              </h4>
                              
                              {/* Tire Serial (Moved below title) */}
                              <div style={{ display: 'flex', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '0.82rem',
                                  color: 'var(--text-primary)',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontFamily: 'monospace',
                                  fontWeight: 600,
                                  letterSpacing: '0.02em'
                                }}>
                                  {evt.tireId}
                                </span>
                              </div>

                              {/* Date */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginTop: '2px' }}>
                                <Calendar size={15} /> {evt.dateStr || 'ไม่ระบุวันที่'}
                              </div>
                            </div>
                            
                            {/* Right: Badges for Pressure & Tread */}
                            {(evt.pressure || evt.tread !== null) && (
                              <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0, alignItems: 'flex-start' }}>
                                {/* Tire Pressure badge */}
                                {evt.pressure && (
                                  <div style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                    borderRadius: '10px', padding: '0.5rem 0.85rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    minWidth: '80px'
                                  }}>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>ลมยาง (PSI)</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em', marginTop: '1px' }}>
                                      {evt.pressure}
                                    </span>
                                  </div>
                                )}
                                {/* Tread depth badge */}
                                {evt.tread !== null && (
                                  <div style={{
                                    background: evt.tread < 2.0 ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.03)',
                                    border: `1px solid ${evt.tread < 2.0 ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
                                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                                    borderRadius: '10px', padding: '0.5rem 0.85rem',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    minWidth: '80px'
                                  }}>
                                    <span style={{ fontSize: '0.72rem', color: evt.tread < 2.0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>ดอกยาง (มม.)</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: evt.tread < 2.0 ? '#ef4444' : 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em', marginTop: '1px' }}>
                                      {evt.tread}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Info Divider */}
                          <div style={{ height: '1px', background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 0%, transparent 100%)', margin: '0.25rem 0' }} />

                          {/* Truck Info Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '8px', borderRadius: '10px' }}><Truck size={18} color="var(--accent-primary)" /></div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>เบอร์รถ / ตำแหน่ง</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.truck} <span style={{ color: 'var(--text-secondary)', fontWeight: 300, margin: '0 4px' }}>|</span> <span style={{ color: 'var(--accent-secondary)' }}>ล้อ {evt.position}</span></div>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '8px', borderRadius: '10px' }}><Wrench size={18} color="var(--accent-primary)" /></div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>สังกัดรถ</div>
                                <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.unit || '-'}</div>
                              </div>
                            </div>
                          </div>

                          {/* Removal Info (if applicable) */}
                          {!isInstalled && !isInspection && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem', background: 'linear-gradient(90deg, rgba(239,68,68,0.05) 0%, transparent 100%)', padding: '1.25rem', borderRadius: '12px', marginTop: '0.5rem', borderLeft: '3px solid rgba(239,68,68,0.5)' }}>
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#ef4444', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>สาเหตุที่ถอด</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.reason || '-'}</div>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                                <div>
                                  <div style={{ fontSize: '0.75rem', color: '#ef4444', letterSpacing: '0.05em', marginBottom: '4px', textTransform: 'uppercase' }}>สถานะยางหลังถอด</div>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.status || '-'}</div>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Work order / form type */}
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                              <FileText size={15} /> {evt.formType || 'ไม่ระบุประเภทฟอร์ม'}
                            </span>
                            {evt.wo && (
                              <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.02em', fontSize: '0.8rem' }}>
                                WO: {evt.wo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TireHistoryModal;

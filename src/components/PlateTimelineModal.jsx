import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Activity, Link as LinkIcon, MapPin } from 'lucide-react';
import { parseDateThai } from '../utils/dataParser';

const PlateTimelineModal = ({ plateInfo, rawData, onClose }) => {
  if (!plateInfo || !rawData) return null;

  const timeline = useMemo(() => {
    // 1. Filter rawData based on plateInfo
    const isHead = plateInfo.type === 'head';
    let targetPlate = plateInfo.plate;
    const targetTruck = plateInfo.truckNo;
    
    // Rows involving this plate or truck
    const matchingRows = rawData.filter(row => {
      const plateHead = String(row['ทะเบียนหัว'] || '').trim();
      const plateTail = String(row['ทะเบียนหาง'] || '').trim();
      const truckNo = String(row['เบอร์รถ'] || '').trim();

      if (targetPlate) {
        if (isHead && plateHead === targetPlate) return true;
        if (!isHead && plateTail === targetPlate) return true;
      } else if (targetTruck && truckNo === targetTruck) {
        // Fallback to truck number if plate is unknown
        return true;
      }
      return false;
    });

    // If targetPlate was missing, try to find the most recent non-empty one from matched rows
    if (!targetPlate && matchingRows.length > 0) {
       let latestDate = null;
       matchingRows.forEach(row => {
         const dateRaw = row['วันที่อัปเดต'] || row['วันที่ติดตั้ง'] || row['วันที่บันทึก'];
         const dateObj = parseDateThai(dateRaw);
         if (dateObj) {
            const p = isHead ? String(row['ทะเบียนหัว'] || '').trim() : String(row['ทะเบียนหาง'] || '').trim();
            if (p && (!latestDate || dateObj > latestDate)) {
               latestDate = dateObj;
               targetPlate = p;
            }
         }
       });
    }

    // 2. Extract events
    let events = [];
    // We re-filter if targetPlate was found during fallback to ensure we get ALL history of this plate
    const finalRowsToUse = targetPlate ? rawData.filter(row => {
      const plateHead = String(row['ทะเบียนหัว'] || '').trim();
      const plateTail = String(row['ทะเบียนหาง'] || '').trim();
      if (isHead && plateHead === targetPlate) return true;
      if (!isHead && plateTail === targetPlate) return true;
      return false;
    }) : matchingRows;

    finalRowsToUse.forEach(row => {
      const dateRaw = row['วันที่ติดตั้ง'] || row['วันที่อัปเดต'] || row['วันที่บันทึก'];
      const dateObj = parseDateThai(dateRaw);
      if (!dateObj) return;

      const partnerPlate = isHead ? String(row['ทะเบียนหาง'] || '').trim() : String(row['ทะเบียนหัว'] || '').trim();
      const truckNo = String(row['เบอร์รถ'] || '').trim();
      const fleet = String(row['สังกัดรถ'] || '').trim();
      
      events.push({
        dateObj,
        dateStr: String(dateRaw),
        partnerPlate: partnerPlate || 'ไม่มี/ไม่ระบุ',
        truckNo,
        fleet
      });
    });

    // 3. Sort by date ascending
    events.sort((a, b) => a.dateObj - b.dateObj);

    // 4. Group consecutive identical partners
    const grouped = [];
    let currentGroup = null;

    events.forEach(ev => {
      if (!currentGroup) {
        currentGroup = { ...ev, endDateObj: ev.dateObj, count: 1 };
      } else if (currentGroup.partnerPlate === ev.partnerPlate) {
        // Extend current group
        if (ev.dateObj > currentGroup.endDateObj) {
          currentGroup.endDateObj = ev.dateObj;
          currentGroup.endDateStr = ev.dateStr;
        }
        currentGroup.count++;
      } else {
        // Partner changed! push current and start new
        grouped.push(currentGroup);
        currentGroup = { ...ev, endDateObj: ev.dateObj, count: 1 };
      }
    });

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    // Sort descending for display (newest first)
    return {
      grouped: grouped.sort((a, b) => b.dateObj - a.dateObj),
      displayPlate: targetPlate || 'ไม่พบทะเบียน'
    };

  }, [plateInfo, rawData]);

  const { grouped: timelineEvents, displayPlate } = timeline;

  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }} onClick={onClose}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '750px', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', padding: 0,
        boxShadow: 'var(--glass-shadow)'
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem', borderBottom: '1px solid var(--border-light)',
          background: 'var(--overlay-05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem'
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600, letterSpacing: '0.05em' }}>
              <LinkIcon size={16} color="var(--accent-primary)" /> ประวัติการเชื่อมต่อ{plateInfo.type === 'head' ? 'ทะเบียนหัว' : 'ทะเบียนหาง'}
            </div>
            <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.75rem', rowGap: '4px' }}>
              <span style={{ overflowWrap: 'anywhere' }}>{displayPlate}</span>
              {plateInfo.truckNo && <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>(เบอร์รถที่อ้างอิง: {plateInfo.truckNo})</span>}
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

        {/* Content */}
        <div style={{ padding: '2rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {timelineEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              ไม่พบข้อมูลประวัติการเชื่อมต่อ
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute', top: '16px', bottom: '16px', left: '15px',
                width: '2px', background: 'var(--overlay-10)'
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {timelineEvents.map((item, index) => {
                  const isNewest = index === 0;

                  return (
                    <div key={index} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                      {/* Timeline Dot */}
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: isNewest ? 'rgba(59,130,246,0.15)' : 'var(--overlay-bg)', 
                        border: `2px solid ${isNewest ? '#3b82f6' : 'var(--border-heavy)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Calendar size={14} color={isNewest ? '#3b82f6' : 'var(--text-secondary)'} />
                      </div>
                      
                      {/* Event Card */}
                      <div className="fade-in" style={{
                        flex: 1, background: 'var(--glass-bg)', border: '1px solid var(--border-light)',
                        borderRadius: '12px', overflow: 'hidden'
                      }}>
                        
                        {/* Visit Header */}
                        <div style={{ 
                          background: 'var(--overlay-05)', borderBottom: '1px solid var(--border-light)',
                          padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' 
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>วันที่ตรวจพบ</span>
                            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                              {item.dateStr || 'ไม่ระบุวันที่'}
                            </span>
                            {item.dateObj < item.endDateObj && (
                              <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>
                                 - {item.endDateStr || item.dateStr || 'ไม่ระบุวันที่'}
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--overlay-10)', padding: '0.3rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--border-medium)' }}>
                            <Activity size={14} color="var(--text-secondary)" />
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ตรวจพบ:</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{item.count} ครั้ง</span>
                          </div>
                        </div>

                        {/* Event Details */}
                        <div style={{ padding: '1.25rem' }}>
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            จับคู่กับ{plateInfo.type === 'head' ? 'ทะเบียนหาง' : 'ทะเบียนหัว'}
                          </div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                            {item.partnerPlate}
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Activity size={16} /> เบอร์รถ: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.truckNo || '-'}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <MapPin size={16} /> สังกัด: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.fleet || '-'}</span>
                            </div>
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

  return createPortal(modalContent, document.body);
};

export default PlateTimelineModal;

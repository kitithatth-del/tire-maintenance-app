import React, { useMemo } from 'react';
import { X, Calendar, MapPin, Wrench, Settings, Navigation, Activity, ArrowRight, Disc, Gauge } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getTruckStatusStyle, normalizeTruckId, parseDateThai } from '../utils/dataParser';

const TruckHistoryModal = ({ truckNumber, data, truckMetadata, onClose }) => {
  const serviceVisits = useMemo(() => {
    if (!truckNumber || !data) return [];
    
    const visits = {};

    data.forEach(row => {
      if (String(row['เบอร์รถ']) !== String(truckNumber)) return;

      const isInspection = String(row['ประเภทแบบฟอร์ม'] || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ตรวจเช็ค') || String(row._sheet || '').includes('ข้อมูลยาง');
      const rawDate = isInspection ? (row['วันที่อัปเดต'] || row['วันที่บันทึก'] || row['วันที่ติดตั้ง']) : (row['วันที่ติดตั้ง'] || row['วันที่อัปเดต'] || row['วันที่บันทึก']);
      const dateObj = parseDateThai(rawDate);
      const dateStr = rawDate || 'ไม่ระบุวันที่';
      const mileage = row['เลขไมล์ติดตั้ง'];
      
      const visitKey = `${dateStr}_${mileage}`;

      if (!visits[visitKey]) {
        visits[visitKey] = {
          id: visitKey,
          dateStr,
          dateObj,
          mileage,
          positions: {} // Keyed by position
        };
      }

      const pos = row['ตำแหน่งล้อยาง'] || 'ไม่ระบุ';
      if (!visits[visitKey].positions[pos]) {
        visits[visitKey].positions[pos] = {
          inTire: null,
          outTire: null
        };
      }


      if (row['หมายเลขยาง_เข้า']) {
        visits[visitKey].positions[pos].inTire = {
          tire: row['หมายเลขยาง_เข้า'],
          tread: row.avgTreadIn,
          isInspection: isInspection
        };
      }

      if (row['หมายเลขยาง_ออก']) {
        visits[visitKey].positions[pos].outTire = {
          tire: row['หมายเลขยาง_ออก'],
          tread: row.avgTreadOut,
          reason: row['สาเหตุที่ถอด'],
          status: row['สถานะยางออก'],
          isInspection: isInspection
        };
      }
    });

    // Convert to array and sort chronologically (descending: newest first)
    return Object.values(visits).sort((a, b) => {
      if (!a.dateObj && !b.dateObj) return 0;
      if (!a.dateObj) return 1;
      if (!b.dateObj) return -1;
      return b.dateObj - a.dateObj;
    });
  }, [truckNumber, data]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '1rem'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '750px', maxHeight: '90vh',
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
              <Settings size={16} color="var(--accent-primary)" /> ประวัติการเข้าบริการของรถ
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.02em', display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0.75rem', rowGap: '4px' }}>
                <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>เบอร์รถ</span> 
                <span style={{ overflowWrap: 'anywhere' }}>{truckNumber}</span>
              </h2>
              {(() => {
                const rawId = String(truckNumber).trim();
                const meta = truckMetadata?.[rawId] || truckMetadata?.[normalizeTruckId(rawId)];
                
                if (meta?.truckStatus) {
                  const statusStyle = getTruckStatusStyle(meta.truckStatus);
                  return (
                    <div style={{ 
                      background: statusStyle.bg, color: statusStyle.color, 
                      border: `1px solid ${statusStyle.border}`, padding: '4px 12px', 
                      borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '6px',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusStyle.dot }}></div>
                      {meta.truckStatus}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--overlay-05)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)',
            width: '36px', height: '36px', borderRadius: '50%', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            cursor: 'pointer', transition: 'all 0.2s'
          }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
             onMouseOut={e => { e.currentTarget.style.background = 'var(--overlay-05)'; e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}>
            <X size={18} />
          </button>
        </div>

        {/* Content - Timeline of Service Visits */}
        <div style={{ padding: '2rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          {serviceVisits.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
              ไม่พบประวัติการเปลี่ยนยางของรถคันนี้
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Vertical timeline line */}
              <div style={{
                position: 'absolute', top: '16px', bottom: '16px', left: '15px',
                width: '2px', background: 'var(--overlay-10)'
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {serviceVisits.map((visit, vIdx) => (
                  <div key={visit.id + vIdx} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                    {/* Timeline Dot */}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'var(--overlay-bg)', border: '2px solid var(--accent-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <Calendar size={14} color="var(--accent-primary)" />
                    </div>

                    {/* Service Visit Card */}
                    <div className="fade-in" style={{
                      flex: 1, background: 'var(--glass-bg)', border: '1px solid var(--border-light)',
                      borderRadius: '12px', overflow: 'hidden'
                    }}>
                      
                      {/* Visit Header */}
                      <div style={{ 
                        background: 'var(--overlay-05)', borderBottom: '1px solid var(--border-light)',
                        padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>วันที่เข้าบริการ</span>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', letterSpacing: '0.02em' }}>{visit.dateStr || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: 'var(--overlay-10)', padding: '0.3rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--border-medium)' }}>
                          <Gauge size={14} color="var(--text-secondary)" />
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>เลขไมล์:</span>
                          <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{visit.mileage && !isNaN(Number(visit.mileage)) ? Number(visit.mileage).toLocaleString() : '-'}</span>
                        </div>
                      </div>

                      {/* Tire Actions in this Visit */}
                      <div style={{ padding: '0.5rem 1.25rem 1.25rem' }}>
                        {Object.keys(visit.positions).map(pos => {
                          const action = visit.positions[pos];
                          const hasBoth = action.inTire && action.outTire;
                          
                          return (
                            <div key={pos} style={{
                              padding: '1rem 0', borderBottom: '1px dashed var(--border-medium)',
                              display: 'flex', flexDirection: 'column', gap: '1rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                                <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'var(--overlay-05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Disc size={14} color="var(--text-secondary)" />
                                </div>
                                ตำแหน่งล้อ <span style={{ color: 'var(--accent-primary)', fontSize: '1.05rem' }}>{pos}</span>
                              </div>
                              
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'stretch' }}>
                                {/* OUT Tire */}
                                {action.outTire && (
                                  <div style={{ 
                                    flex: '1 1 0%', minWidth: '220px', background: 'rgba(239,68,68,0.03)', 
                                    border: '1px solid rgba(239,68,68,0.1)', borderLeft: '4px solid #ef4444', 
                                    borderRadius: '8px', padding: '1rem', position: 'relative', overflow: 'hidden',
                                    display: 'flex', flexDirection: 'column'
                                  }}>
                                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>ถอดยางออก</div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{action.outTire.tire}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flex: 1, alignContent: 'flex-end' }}>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        ดอกยาง: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{action.outTire.tread !== null ? `${action.outTire.tread} มม.` : '-'}</span>
                                      </div>
                                      {action.outTire.reason && (
                                        <div style={{ fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(239,68,68,0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                                          <Wrench size={12} /> {action.outTire.reason}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Arrow for Replacement */}
                                {hasBoth && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--overlay-10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      <ArrowRight size={16} color="var(--text-secondary)" />
                                    </div>
                                  </div>
                                )}

                                {/* IN Tire */}
                                {action.inTire && (
                                  <div style={{ 
                                    flex: '1 1 0%', minWidth: '220px', 
                                    background: action.inTire.isInspection ? 'rgba(59,130,246,0.03)' : 'rgba(16,185,129,0.03)', 
                                    border: action.inTire.isInspection ? '1px solid rgba(59,130,246,0.1)' : '1px solid rgba(16,185,129,0.1)', 
                                    borderLeft: action.inTire.isInspection ? '4px solid #3b82f6' : '4px solid #10b981', 
                                    borderRadius: '8px', padding: '1rem', position: 'relative', overflow: 'hidden',
                                    display: 'flex', flexDirection: 'column'
                                  }}>
                                    <div style={{ fontSize: '0.8rem', color: action.inTire.isInspection ? '#3b82f6' : '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>
                                      {action.inTire.isInspection ? 'ตรวจเช็คสภาพยาง' : 'ติดตั้งยางใหม่'}
                                    </div>
                                    <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{action.inTire.tire}</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flex: 1, alignContent: 'flex-end' }}>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                                        ดอกยาง: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{action.inTire.tread !== null ? `${action.inTire.tread} มม.` : '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TruckHistoryModal;

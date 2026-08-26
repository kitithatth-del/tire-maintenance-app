import React, { useState, useMemo, useEffect } from 'react';
import { Database, Search, Filter, RefreshCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { getVehicleTypeBadge } from '../utils/dataParser';

const DataExplorer = ({ data, filterOptions, onTireClick, onTruckClick }) => {
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterCenter, setFilterCenter] = useState('');
  const [filterReason, setFilterReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCompliance, setFilterCompliance] = useState(''); // 'pass' | 'fail' | 'active'
  const [activeDataTab, setActiveDataTab] = useState('replacement');
  const [sortField, setSortField] = useState('วันที่บันทึก');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ROWS_PER_PAGE = 100;

  const months = [
    { v: '1', l: 'ม.ค.' }, { v: '2', l: 'ก.พ.' }, { v: '3', l: 'มี.ค.' },
    { v: '4', l: 'เม.ย.' }, { v: '5', l: 'พ.ค.' }, { v: '6', l: 'มิ.ย.' },
    { v: '7', l: 'ก.ค.' }, { v: '8', l: 'ส.ค.' }, { v: '9', l: 'ก.ย.' },
    { v: '10', l: 'ต.ค.' }, { v: '11', l: 'พ.ย.' }, { v: '12', l: 'ธ.ค.' },
  ];

  const filtered = useMemo(() => {
    let rows = data;

    // Filter by Tab
    if (activeDataTab === 'inspection') {
      rows = rows.filter(r => r['ประเภทแบบฟอร์ม']?.includes('ตรวจเช็ค'));
    } else {
      rows = rows.filter(r => !r['ประเภทแบบฟอร์ม']?.includes('ตรวจเช็ค'));
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r =>
        String(r['เบอร์รถ'] ?? '').includes(q) ||
        String(r['หมายเลขยาง_เข้า'] ?? '').toLowerCase().includes(q) ||
        String(r['หมายเลขยาง_ออก'] ?? '').toLowerCase().includes(q) ||
        String(r['ทะเบียนหัว'] ?? '').toLowerCase().includes(q) ||
        String(r['สังกัดรถ'] ?? '').toLowerCase().includes(q)
      );
    }
    if (filterMonth) rows = rows.filter(r => String(r.MM) === filterMonth);
    if (filterYear) rows = rows.filter(r => String(r.YYYY) === filterYear);
    if (filterCenter) rows = rows.filter(r => r['ศูนย์บริการ'] === filterCenter);
    if (filterReason) rows = rows.filter(r => r['สาเหตุที่ถอด'] === filterReason);
    if (filterStatus) rows = rows.filter(r => r['สถานะยางออก'] === filterStatus);
    if (filterCompliance === 'fail') rows = rows.filter(r => r.isNonCompliant);
    if (filterCompliance === 'pass') rows = rows.filter(r => r['หมายเลขยาง_ออก'] && !r.isNonCompliant);
    if (filterCompliance === 'active') rows = rows.filter(r => r.isActive);

    // Sort
    rows = [...rows].sort((a, b) => {
      let valA = a[sortField] ?? '';
      let valB = b[sortField] ?? '';
      if (sortField === 'avgTreadOut' || sortField === 'avgTreadIn' || sortField === 'เบอร์รถ' || sortField === 'MM') {
        valA = Number(valA) || 0; valB = Number(valB) || 0;
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB), 'th') : String(valB).localeCompare(String(valA), 'th');
    });
    return rows;
  }, [data, activeDataTab, search, filterMonth, filterYear, filterCenter, filterReason, filterStatus, filterCompliance, sortField, sortDir]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMonth, filterYear, filterCenter, filterReason, filterStatus, filterCompliance, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentData = filtered.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  const resetAll = () => {
    setSearch(''); setFilterMonth(''); setFilterYear(''); setFilterCenter('');
    setFilterReason(''); setFilterStatus(''); setFilterCompliance('');
    setCurrentPage(1);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3 }}><ChevronUp size={12} /></span>;
    return sortDir === 'asc' ? <ChevronUp size={12} color="var(--accent-primary)" /> : <ChevronDown size={12} color="var(--accent-primary)" />;
  };

  const selectStyle = {
    background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px',
    padding: '0.4rem 0.75rem', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.8rem', outline: 'none',
  };

  const thBtn = (field, label) => (
    <th onClick={() => toggleSort(field)} style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{label} <SortIcon field={field} /></span>
    </th>
  );

  return (
    <div className="data-explorer-container">
      <div className="glass-panel">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Database color="var(--accent-primary)" size={28} />
            <div>
              <h2 style={{ margin: 0 }}>ฐานข้อมูลยาง (Raw Data)</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                แสดง {filtered.length} จาก {data.length} รายการ
              </p>
            </div>
          </div>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="ค้นหาเบอร์รถ, หมายเลขยาง, ทะเบียน..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                ...selectStyle, padding: '0.5rem 1rem 0.5rem 2.5rem',
                width: '280px', fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-medium)', marginBottom: '1.25rem' }}>
          <button
            onClick={() => { setActiveDataTab('replacement'); setCurrentPage(1); }}
            style={{
              background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
              color: activeDataTab === 'replacement' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderBottom: activeDataTab === 'replacement' ? '2px solid var(--accent-primary)' : '2px solid transparent',
              fontWeight: activeDataTab === 'replacement' ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem'
            }}
          >
            <RefreshCw size={16} /> ประวัติเปลี่ยนยาง
          </button>
          <button
            onClick={() => { setActiveDataTab('inspection'); setCurrentPage(1); }}
            style={{
              background: 'none', border: 'none', padding: '0.75rem 1rem', cursor: 'pointer',
              color: activeDataTab === 'inspection' ? '#3b82f6' : 'var(--text-secondary)',
              borderBottom: activeDataTab === 'inspection' ? '2px solid #3b82f6' : '2px solid transparent',
              fontWeight: activeDataTab === 'inspection' ? 600 : 400,
              display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem'
            }}
          >
            <Search size={16} /> ประวัติการตรวจเช็ค
          </button>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--overlay-black-20)', borderRadius: '10px' }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select style={selectStyle} value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            <option value="">ทุกปี</option>
            {filterOptions?.years?.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select style={selectStyle} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            <option value="">ทุกเดือน</option>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select style={selectStyle} value={filterCenter} onChange={e => setFilterCenter(e.target.value)}>
            <option value="">ทุกศูนย์บริการ</option>
            {filterOptions?.centers?.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {activeDataTab === 'replacement' && (
            <>
              <select style={selectStyle} value={filterReason} onChange={e => setFilterReason(e.target.value)}>
                <option value="">ทุกสาเหตุ</option>
                {filterOptions?.reasons?.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">ทุกสถานะ</option>
                {filterOptions?.statuses?.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select style={selectStyle} value={filterCompliance} onChange={e => setFilterCompliance(e.target.value)}>
                <option value="">ทุก Compliance</option>
                <option value="fail">ต่ำกว่าเกณฑ์ (&lt;2มม.)</option>
                <option value="pass">ผ่านเกณฑ์ (≥2มม.)</option>
                <option value="active">กำลังใช้งาน</option>
              </select>
            </>
          )}
          <button onClick={() => {
            setSearch(''); setFilterMonth(''); setFilterYear(''); setFilterCenter(''); 
            setFilterReason(''); setFilterStatus(''); setFilterFormType(''); setFilterCompliance('');
          }} style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)', cursor: 'pointer' }}>
            <RefreshCw size={12} /> ล้างทั้งหมด
          </button>
        </div>

        {/* Table */}
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {thBtn('เบอร์รถ', 'เบอร์รถ')}
                {thBtn('MM', 'เดือน/ปี')}
                {thBtn('ศูนย์บริการ', 'ศูนย์บริการ')}
                {thBtn('สังกัดรถ', 'สังกัดรถ')}
                <th>ตำแหน่งล้อ</th>
                {activeDataTab === 'replacement' && <th>ประเภทฟอร์ม</th>}
                <th>{activeDataTab === 'replacement' ? 'หมายเลขยาง (เข้า)' : 'หมายเลขยาง'}</th>
                {thBtn('avgTreadIn', activeDataTab === 'replacement' ? 'ดอกเฉลี่ย (เข้า)' : 'ดอกเฉลี่ย')}
                <th>{activeDataTab === 'replacement' ? 'D1/D2/D3/D4 (เข้า)' : 'D1/D2/D3/D4'}</th>
                <th>{activeDataTab === 'replacement' ? 'วันที่ติดตั้ง' : 'วันที่ตรวจเช็ค'}</th>
                {activeDataTab === 'replacement' && (
                  <>
                    <th>หมายเลขยาง (ออก)</th>
                    {thBtn('avgTreadOut', 'ดอกเฉลี่ย (ออก)')}
                    <th>D1/D2/D3/D4 (ออก)</th>
                    <th>สาเหตุที่ถอด</th>
                    <th>สถานะยางออก</th>
                    <th>สถานะ Compliance</th>
                    <th>ใบแจ้งซ่อม</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {currentData.map((row, idx) => {
                const treadOutColor = row.avgTreadOut !== null && row.avgTreadOut < 2.0 ? '#fca5a5' : row.avgTreadOut !== null ? 'var(--text-status-success)' : 'inherit';
                return (
                  <tr key={idx} style={{ background: row.isNonCompliant ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    <td 
                      style={{ cursor: 'pointer' }}
                      onClick={() => row['เบอร์รถ'] && onTruckClick?.(row['เบอร์รถ'])}
                      title="คลิกเพื่อดูประวัติรถคันนี้"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)', textDecoration: 'underline' }}>{row['เบอร์รถ']}</span>
                        {row.truckType && row.truckType !== 'ไม่ระบุ' && (() => {
                          const badge = getVehicleTypeBadge(row.truckType);
                          return (
                            <span style={{
                              fontSize: '0.65rem', fontWeight: 700,
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              padding: '1px 6px', borderRadius: '4px',
                              whiteSpace: 'nowrap',
                            }}>
                              {badge.label}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>{row['Month'] || `${row.MM}/${row.YYYY}`}</td>
                    <td style={{ fontSize: '0.85rem' }}>{row['ศูนย์บริการ'] || '-'}</td>
                    <td>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row['สังกัดรถ'] || '-'}</div>
                      {row['ทะเบียนหัว'] && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>หัว: {row['ทะเบียนหัว']}</div>}
                      {row['ทะเบียนหาง'] && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>หาง: {row['ทะเบียนหาง']}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.8rem' }}>
                        {row['ตำแหน่งล้อยาง'] || '-'}
                      </span>
                    </td>
                    {activeDataTab === 'replacement' && <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row['ประเภทแบบฟอร์ม'] || '-'}</td>}
                    <td 
                      onClick={() => row['หมายเลขยาง_เข้า'] && onTireClick?.(row['หมายเลขยาง_เข้า'])}
                      style={{ cursor: row['หมายเลขยาง_เข้า'] ? 'pointer' : 'default' }}
                      title={row['หมายเลขยาง_เข้า'] ? "คลิกเพื่อดูประวัติยาง" : ""}
                    >
                      <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: row['หมายเลขยาง_เข้า'] ? 'var(--accent-primary)' : 'inherit', textDecoration: row['หมายเลขยาง_เข้า'] ? 'underline' : 'none', textUnderlineOffset: '2px' }}>
                        {row['หมายเลขยาง_เข้า'] || '-'}
                      </div>
                      {row['ยี่ห้อยาง_เข้า'] && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {row['ยี่ห้อยาง_เข้า']}
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{row.avgTreadIn !== null ? `${row.avgTreadIn} มม.` : '-'}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      {row['D1_เข้า'] != null ? `${row['D1_เข้า']}/${row['D2_เข้า']}/${row['D3_เข้า']}/${row['D4_เข้า']}` : '-'}
                    </td>
                    <td style={{ fontSize: '0.85rem' }}>
                      {activeDataTab === 'inspection' 
                        ? (row['วันที่อัปเดต'] || row['วันที่บันทึก'] || row['วันที่ติดตั้ง'] || '-')
                        : (row['วันที่ติดตั้ง'] || row['วันที่บันทึก'] || row['วันที่อัปเดต'] || '-')}
                    </td>
                    {activeDataTab === 'replacement' && (
                      <>
                        <td 
                          onClick={() => row['หมายเลขยาง_ออก'] && onTireClick?.(row['หมายเลขยาง_ออก'])}
                          style={{ cursor: row['หมายเลขยาง_ออก'] ? 'pointer' : 'default' }}
                          title={row['หมายเลขยาง_ออก'] ? "คลิกเพื่อดูประวัติยาง" : ""}
                        >
                          <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: row['หมายเลขยาง_ออก'] ? 'var(--accent-primary)' : 'inherit', textDecoration: row['หมายเลขยาง_ออก'] ? 'underline' : 'none', textUnderlineOffset: '2px' }}>
                            {row['หมายเลขยาง_ออก'] || '-'}
                          </div>
                          {row['ยี่ห้อยาง_ออก'] && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              {row['ยี่ห้อยาง_ออก']}
                            </div>
                          )}
                        </td>
                        <td style={{ color: treadOutColor, fontWeight: 600 }}>
                          {row.avgTreadOut !== null ? `${row.avgTreadOut} มม.` : '-'}
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          {row['D1_ออก'] != null ? `${row['D1_ออก']}/${row['D2_ออก']}/${row['D3_ออก']}/${row['D4_ออก']}` : '-'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{row['สาเหตุที่ถอด'] || '-'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{row['สถานะยางออก'] || '-'}</td>
                        <td>
                          {row['หมายเลขยาง_ออก'] ? (
                            <span className={row.isNonCompliant ? 'badge danger' : 'badge success'}>
                              {row.isNonCompliant ? '❌ ต่ำกว่า 2 มม.' : '✅ ผ่านเกณฑ์'}
                            </span>
                          ) : (
                            <span className="badge info">🔵 กำลังใช้งาน</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row['ใบแจ้งซ่อม'] || '-'}</td>
                      </>
                    )}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="16" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่กำหนด
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filtered.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--overlay-black-20)', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              แสดง {(currentPage - 1) * ROWS_PER_PAGE + 1} ถึง {Math.min(currentPage * ROWS_PER_PAGE, filtered.length)} จากทั้งหมด {filtered.length} รายการ
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{ ...selectStyle, padding: '0.4rem 0.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontSize: '0.85rem', margin: '0 0.5rem' }}>หน้าที่ {currentPage} / {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{ ...selectStyle, padding: '0.4rem 0.5rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataExplorer;

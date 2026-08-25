import React, { useState, useMemo } from 'react';
import { Wrench, Search, Filter, RefreshCw } from 'lucide-react';

const columns = [
  { key: 'Owner', label: 'Owner' },
  { key: 'คลัง', label: 'คลัง' },
  { key: 'PostingDate', label: 'PostingDate' },
  { key: 'เลขที่เอกสาร', label: 'เลขที่เอกสาร' },
  { key: 'วันที่เอกสาร', label: 'วันที่เอกสาร' },
  { key: 'เลขที่อ้างอิง', label: 'เลขที่อ้างอิง' },
  { key: 'รายละเอียด', label: 'รายละเอียด' },
  { key: 'รหัสสินค้า', label: 'รหัสสินค้า' },
  { key: 'ชื่อสินค้า', label: 'ชื่อสินค้า' },
  { key: 'Barcode', label: 'Barcode' },
  { key: 'โซนเก็บ', label: 'โซนเก็บ' },
  { key: 'สถานะ', label: 'สถานะ' },
  { key: 'จำนวนเข้า', label: 'จำนวนเข้า' },
  { key: 'ทุนเข้าต่อหน่วย', label: 'ทุนเข้าต่อหน่วย' },
  { key: 'ทุนเข้ารวม', label: 'ทุนเข้ารวม' },
  { key: 'จำนวนออก', label: 'จำนวนออก' },
  { key: 'ทุนออกต่อหน่วย', label: 'ทุนออกต่อหน่วย' },
  { key: 'ทุนออกรวม', label: 'ทุนออกรวม' },
  { key: 'จำนวนคงเหลือ', label: 'จำนวนคงเหลือ' },
  { key: 'ทุนคงเหลือต่อหน่วย', label: 'ทุนคงเหลือต่อหน่วย' },
  { key: 'ทุนคงเหลือรวม', label: 'ทุนคงเหลือรวม' },
  { key: 'หน่วย', label: 'หน่วย' },
  { key: 'วันที่ทำรายการ', label: 'วันที่ทำรายการ' },
  { key: 'CreateDate', label: 'CreateDate' },
  { key: 'CreateBy', label: 'CreateBy' },
  { key: 'ประเภทงาน', label: 'ประเภทงาน' },
  { key: 'ประเภทงาน2', label: 'ประเภทงาน (2)' },
  { key: 'Q 1-4', label: 'Q 1-4' },
  { key: 'รหัสรถ', label: 'รหัสรถ' },
  { key: 'ประเภทรถ', label: 'ประเภทรถ' },
  { key: 'ประจำFleet', label: 'ประจำFleet' },
  { key: 'แยกประเภทธุรกิจ', label: 'แยกประเภทธุรกิจ' },
  { key: 'ประเภทธุรกิจ', label: 'ประเภทธุรกิจ' },
  { key: 'COST', label: 'COST' },
  { key: 'เลขที่เอกสาร 2', label: 'เลขที่เอกสาร 2' },
  { key: 'วันที่ซ่อมครั้งก่อนหน้า', label: 'วันที่ซ่อมครั้งก่อนหน้า' },
  { key: 'เลขที่เอกสารก่อนหน้า', label: 'เลขที่เอกสารก่อนหน้า' },
  { key: 'จำนวนวันห่าง', label: 'จำนวนวันห่าง' },
  { key: 'สถานะซ่อมซ้ำ', label: 'สถานะซ่อมซ้ำ' },
  { key: 'ช่างผู้รับผิดชอบก่อนหน้า', label: 'ช่างผู้รับผิดชอบก่อนหน้า' },
  { key: 'อู่/ศูนย์บริการก่อนหน้า', label: 'อู่/ศูนย์บริการก่อนหน้า' },
  { key: 'ครั้งที่เปลี่ยน (เฉพาะอะไหล่นี้)', label: 'ครั้งที่เปลี่ยน (เฉพาะอะไหล่นี้)' },
  { key: 'รวมประวัติซ่อมซ้ำสะสม (คันนี้)', label: 'รวมประวัติซ่อมซ้ำสะสม (คันนี้)' },
  { key: 'ชื่อช่างประจำงานซ่อม', label: 'ชื่อช่างประจำงานซ่อม' },
  { key: 'อู่/ศูนย์บริการ', label: 'อู่/ศูนย์บริการ' },
  { key: 'รายละเอียดซ่อมหัว', label: 'รายละเอียดซ่อมหัว' },
  { key: 'รายละเอียดซ่อมหาง', label: 'รายละเอียดซ่อมหาง' }
];

const RepeatedRepairDashboard = ({ data }) => {
  const [search, setSearch] = useState('');
  const [filterFleet, setFilterFleet] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filterOptions = useMemo(() => {
    const fleets = new Set();
    const statuses = new Set();
    data.forEach(row => {
      if (row['ประจำFleet']) fleets.add(row['ประจำFleet']);
      if (row['สถานะซ่อมซ้ำ']) statuses.add(row['สถานะซ่อมซ้ำ']);
    });
    return {
      fleets: Array.from(fleets).sort(),
      statuses: Array.from(statuses).sort()
    };
  }, [data]);

  const filtered = useMemo(() => {
    let rows = data;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(r => 
        String(r['รหัสรถ'] ?? '').toLowerCase().includes(q) ||
        String(r['รหัสสินค้า'] ?? '').toLowerCase().includes(q) ||
        String(r['ชื่อสินค้า'] ?? '').toLowerCase().includes(q) ||
        String(r['เลขที่เอกสาร'] ?? '').toLowerCase().includes(q)
      );
    }
    if (filterFleet) rows = rows.filter(r => r['ประจำFleet'] === filterFleet);
    if (filterStatus) rows = rows.filter(r => r['สถานะซ่อมซ้ำ'] === filterStatus);
    
    return rows;
  }, [data, search, filterFleet, filterStatus]);

  const selectStyle = {
    background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px',
    padding: '0.4rem 0.75rem', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.8rem', outline: 'none',
  };

  return (
    <div className="data-explorer-container">
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wrench color="var(--accent-primary)" size={28} />
            <div>
              <h2 style={{ margin: 0 }}>รายการอะไหล่ซ่อมซ้ำ (Repeated Repair Parts)</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                แสดง {filtered.length} จาก {data.length} รายการ
              </p>
            </div>
          </div>
          
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="ค้นหารหัสรถ, รหัสสินค้า, เอกสาร..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                ...selectStyle, padding: '0.5rem 1rem 0.5rem 2.5rem',
                width: '280px', fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--overlay-black-20)', borderRadius: '10px' }}>
          <Filter size={14} color="var(--text-secondary)" />
          <select style={selectStyle} value={filterFleet} onChange={e => setFilterFleet(e.target.value)}>
            <option value="">ทุก Fleet</option>
            {filterOptions.fleets.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select style={selectStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">ทุกสถานะซ่อมซ้ำ</option>
            {filterOptions.statuses.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => {
            setSearch(''); setFilterFleet(''); setFilterStatus(''); 
          }} style={{ ...selectStyle, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(59,130,246,0.15)', borderColor: 'rgba(59,130,246,0.4)', cursor: 'pointer' }}>
            <RefreshCw size={12} /> ล้างทั้งหมด
          </button>
        </div>

        {/* Table - Very wide table for 47 columns */}
        <div className="table-container" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
          <table style={{ whiteSpace: 'nowrap' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => {
                const isRepeated = row['สถานะซ่อมซ้ำ'] && String(row['สถานะซ่อมซ้ำ']).includes('ซ่อมซ้ำ');
                return (
                  <tr key={idx} style={{ background: isRepeated ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                    {columns.map(col => (
                      <td key={col.key} style={{ 
                        color: (col.key === 'สถานะซ่อมซ้ำ' && isRepeated) ? 'var(--text-status-danger)' : 'inherit',
                        fontWeight: (col.key === 'สถานะซ่อมซ้ำ' && isRepeated) ? 600 : 'normal'
                      }}>
                        {row[col.key] != null && row[col.key] !== '' ? row[col.key] : '-'}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไขที่กำหนด
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RepeatedRepairDashboard;

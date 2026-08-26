import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Eye, Loader, Link as LinkIcon, DownloadCloud } from 'lucide-react';
import { parseFile, fetchGoogleSheet } from '../utils/fileImport';

const ImportModal = ({ onClose, onImport }) => {
  const [mode, setMode] = useState('upload'); // 'upload' | 'gsheet'
  const [stage, setStage] = useState('input'); // 'input' | 'preview' | 'loading' | 'error'
  const [dragOver, setDragOver] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [activePreviewTab, setActivePreviewTab] = useState(null);
  const fileInputRef = useRef();

  const handleFile = async (file) => {
    if (!file) return;
    setStage('loading');
    setErrorMsg('');
    
    // Yield to the browser so the CSS loading animation can start before parsing blocks the thread
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const result = await parseFile(file);
      if (result.data.length === 0 && (!result.rawPreviews || Object.keys(result.rawPreviews).length === 0)) {
        setStage('error');
        setErrorMsg('ไม่พบข้อมูลในไฟล์ หรือโครงสร้างไม่ตรงตามที่กำหนด (ต้องมีข้อมูลตั้งแต่แถวที่ 3)');
        return;
      }
      setParseResult(result);
      if (result.rawPreviews && Object.keys(result.rawPreviews).length > 0) {
        setActivePreviewTab(Object.keys(result.rawPreviews)[0]);
      }
      setStage('preview');
    } catch (err) {
      setStage('error');
      setErrorMsg(err.message);
    }
  };

  const handleFetchSheet = async () => {
    if (!sheetUrl.trim()) {
      setStage('error');
      setErrorMsg('กรุณาระบุ URL ของ Google Sheets');
      return;
    }
    setStage('loading');
    setErrorMsg('');
    
    // Yield to the browser to ensure the CSS loading animation spins smoothly
    await new Promise(resolve => setTimeout(resolve, 150));
    
    try {
      const result = await fetchGoogleSheet(sheetUrl.trim());
      if (result.data.length === 0) {
        setStage('error');
        setErrorMsg('ไม่พบข้อมูลในไฟล์ หรือโครงสร้างไม่ตรงตามที่กำหนด (ต้องมีข้อมูลตั้งแต่แถวที่ 3)');
        return;
      }
      setParseResult(result);
      if (result.rawPreviews && Object.keys(result.rawPreviews).length > 0) {
        setActivePreviewTab(Object.keys(result.rawPreviews)[0]);
      }
      setStage('preview');
    } catch (err) {
      setStage('error');
      setErrorMsg(err.message);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    if (mode === 'upload') {
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    }
  };

  const handleConfirm = () => {
    if (parseResult?.data) {
      onImport(parseResult.data, parseResult.fileName, parseResult.truckMetadata);
      onClose();
    }
  };

  const previewRows = parseResult?.data?.slice(0, 5) ?? [];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'var(--overlay-black-75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-medium)',
        borderRadius: '20px', boxShadow: 'var(--glass-shadow)',
        width: '100%', maxWidth: stage === 'preview' ? '950px' : '600px',
        maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
        transition: 'max-width 0.4s ease',
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(59,130,246,0.2)', borderRadius: '10px', padding: '0.5rem' }}>
              <FileSpreadsheet color="var(--accent-primary)" size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>นำเข้าข้อมูลยาง</h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>รองรับ .xlsx, .xls, .csv หรือ URL ของ Google Sheets</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--overlay-05)', border: '1px solid var(--border-light)', borderRadius: '8px', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {/* Input Stage */}
          {(stage === 'input' || stage === 'error') && (
            <>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', background: 'var(--overlay-05)', padding: '0.4rem', borderRadius: '12px' }}>
                <button
                  onClick={() => setMode('upload')}
                  style={{
                    flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: mode === 'upload' ? 'var(--overlay-10)' : 'transparent',
                    color: mode === 'upload' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: mode === 'upload' ? 600 : 400,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Upload size={16} /> อัปโหลดไฟล์
                </button>
                <button
                  onClick={() => setMode('gsheet')}
                  style={{
                    flex: 1, padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    background: mode === 'gsheet' ? 'rgba(16,185,129,0.15)' : 'transparent',
                    color: mode === 'gsheet' ? '#10b981' : 'var(--text-secondary)',
                    border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: mode === 'gsheet' ? 600 : 400,
                    transition: 'all 0.2s ease',
                  }}
                >
                  <LinkIcon size={16} /> ลิงก์ Google Sheets
                </button>
              </div>

              {/* Upload Mode */}
              {mode === 'upload' && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragOver ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                    borderRadius: '14px', padding: '3rem 2rem', textAlign: 'center',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    background: dragOver ? 'rgba(59,130,246,0.08)' : 'var(--overlay-05)',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <Upload size={40} color={dragOver ? 'var(--accent-primary)' : 'var(--text-secondary)'} style={{ margin: '0 auto', display: 'block', transition: 'color 0.25s' }} />
                  </div>
                  <p style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>
                    {dragOver ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวางหรือคลิกเพื่อเลือกไฟล์'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    รองรับ Excel (.xlsx, .xls) และ CSV
                  </p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files?.[0])} />
                </div>
              )}

              {/* Google Sheets Mode */}
              {mode === 'gsheet' && (
                <div style={{ marginBottom: '1.25rem', background: 'var(--overlay-05)', padding: '1.5rem', borderRadius: '14px', border: '1px solid var(--border-light)' }}>
                  <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    วางลิงก์ Google Sheets (URL)
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      style={{
                        flex: 1, padding: '0.75rem 1rem', borderRadius: '8px',
                        background: 'var(--bg-primary)', border: '1px solid var(--border-medium)',
                        color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem', outline: 'none'
                      }}
                    />
                    <button
                      onClick={handleFetchSheet}
                      style={{
                        padding: '0 1.25rem', background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                      }}
                    >
                      <DownloadCloud size={18} /> ดึงข้อมูล
                    </button>
                  </div>
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--text-status-warning)', fontSize: '0.85rem' }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                      <div>
                        <strong>คำแนะนำ:</strong>
                        <ul style={{ margin: '0.25rem 0 0 0', paddingLeft: '1.25rem', opacity: 0.9 }}>
                          <li>ไฟล์ Google Sheets ต้องมีการแชร์แบบ <strong>"ทุกคนที่มีลิงก์ (Anyone with the link)"</strong> เป็น Viewer</li>
                          <li>ระบบจะดึงข้อมูลเฉพาะแท็บที่ชื่อ <strong>"ข้อมูลเปลี่ยนยาง"</strong> เท่านั้น</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stage === 'error' && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px' }}>
                  <AlertTriangle color="var(--danger)" size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <p style={{ color: 'var(--text-status-danger)', fontWeight: 600, marginBottom: '0.25rem' }}>เกิดข้อผิดพลาด</p>
                    <p style={{ color: 'var(--text-status-danger)', fontSize: '0.85rem', opacity: 0.8 }}>{errorMsg}</p>
                  </div>
                </div>
              )}

              {/* Format Guide */}
              <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px' }}>
                <p style={{ color: 'var(--text-status-info)', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.85rem' }}>📋 โครงสร้างข้อมูลที่รองรับ:</p>
                <ul style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: '1rem', lineHeight: 1.8, margin: 0 }}>
                  <li>แถวที่ 1: หัวกลุ่ม ("ยางเข้า/ตรวจเช็ค" = N–U, "ยางออก" = V–AC)</li>
                  <li>แถวที่ 2: ชื่อคอลัม A–AH</li>
                  <li>แถวที่ 3 เป็นต้นไป: ข้อมูล</li>
                </ul>
              </div>
            </>
          )}

          {/* Loading Stage */}
          {stage === 'loading' && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <Loader size={40} color="var(--accent-primary)" style={{ animation: 'spin 2s linear infinite' }} />
              </div>
              <p style={{ fontWeight: 600 }}>กำลังดึงข้อมูล...</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>กรุณารอสักครู่</p>
            </div>
          )}

          {/* Preview Stage */}
          {stage === 'preview' && parseResult && (
            <>
              {/* Summary */}
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, padding: '0.75rem 1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px' }}>
                  <div style={{ color: 'var(--text-status-success)', fontWeight: 700, fontSize: '1.5rem' }}>{parseResult.data.length}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>แถวข้อมูลที่อ่านสำเร็จ</div>
                </div>
                {parseResult.errors.length > 0 && (
                  <div style={{ flex: 1, padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '10px' }}>
                    <div style={{ color: 'var(--text-status-warning)', fontWeight: 700, fontSize: '1.5rem' }}>{parseResult.errors.length}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>แถวที่มีข้อผิดพลาด</div>
                  </div>
                )}
                <div style={{ flex: 2, padding: '0.75rem 1rem', background: 'var(--overlay-05)', border: '1px solid var(--border-light)', borderRadius: '10px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem', wordBreak: 'break-all', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {parseResult.fileName}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                    รูปแบบ: {parseResult.source === 'google-sheet' ? 'Google Sheets' : parseResult.source.toUpperCase()} | ทั้งหมด: {parseResult.totalRows} แถว
                  </div>
                  
                  <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                      <Eye size={16} color="var(--text-secondary)" />
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>ตัวอย่างข้อมูลดิบ (5 แถวแรก):</span>
                    </div>
                    
                    {parseResult.rawPreviews && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px' }}>
                        {Object.keys(parseResult.rawPreviews).map(sheetName => (
                          <button
                            key={sheetName}
                            onClick={() => setActivePreviewTab(sheetName)}
                            style={{
                              padding: '0.4rem 1rem', borderRadius: '8px', cursor: 'pointer',
                              background: activePreviewTab === sheetName ? 'rgba(59,130,246,0.15)' : 'var(--overlay-05)',
                              border: `1px solid ${activePreviewTab === sheetName ? 'rgba(59,130,246,0.4)' : 'transparent'}`,
                              color: activePreviewTab === sheetName ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontSize: '0.85rem', fontWeight: activePreviewTab === sheetName ? 600 : 400,
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {sheetName}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="preview-table" style={{ overflowX: 'auto' }}>
                      <table>
                        <tbody>
                          {parseResult.rawPreviews?.[activePreviewTab]?.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {Array.from({ length: Math.max(...parseResult.rawPreviews[activePreviewTab].map(r => r.length)) }).map((_, colIdx) => (
                                <td key={colIdx} style={{ 
                                  whiteSpace: 'nowrap', 
                                  color: row[colIdx] == null ? 'var(--text-secondary)' : 'var(--text-primary)',
                                  opacity: row[colIdx] == null ? 0.5 : 1,
                                  borderBottom: '1px solid var(--border-light)',
                                  padding: '0.5rem'
                                }}>
                                  {row[colIdx] == null ? '-' : String(row[colIdx])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>



              {parseResult.errors.length > 0 && (
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-status-warning)' }}>
                  ⚠ พบ {parseResult.errors.length} แถวที่ข้ามเนื่องจากข้อมูลไม่ครบ (แถว {parseResult.errors.map(e => e.row).join(', ')})
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Buttons */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ padding: '0.6rem 1.25rem', background: 'transparent', border: '1px solid var(--border-medium)', borderRadius: '8px', color: 'var(--text-secondary)', fontFamily: 'inherit', fontSize: '0.9rem', cursor: 'pointer' }}>
            ยกเลิก
          </button>
          {stage === 'preview' && (
            <button onClick={handleConfirm} style={{ padding: '0.6rem 1.5rem', background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', border: 'none', borderRadius: '8px', color: '#fff', fontFamily: 'inherit', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
              <CheckCircle size={16} /> ยืนยันนำเข้า {parseResult.data.length} รายการ
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ImportModal;

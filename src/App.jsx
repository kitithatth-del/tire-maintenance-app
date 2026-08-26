import React, { useState, useMemo, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Planning from './components/Planning';
import DataExplorer from './components/DataExplorer';
import ImportModal from './components/ImportModal';
import TireHistoryModal from './components/TireHistoryModal';
import TruckHistoryModal from './components/TruckHistoryModal';
import CohortAnalysis from './components/CohortAnalysis';
import RepeatedRepairDashboard from './components/RepeatedRepairDashboard';
import { repeatedRepairMockData } from './utils/repeatedRepairMockData';
import { rawMockData, processTireData, getDashboardStats, getFilterOptions, calculateWearRates } from './utils/dataParser';
import { LayoutDashboard, CalendarClock, Database, Truck, Upload, FileCheck, Filter, RefreshCw, Sun, Moon, Menu, Activity, Search, Wrench } from 'lucide-react';
import logoUrl from './assets/logo.png';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  useEffect(() => {
    document.body.classList.toggle('light-mode', !isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showImport, setShowImport] = useState(false);
  const [importedRaw, setImportedRaw] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [importedTruckMetadata, setImportedTruckMetadata] = useState(null);
  const [importedFileName, setImportedFileName] = useState('');
  const [selectedTire, setSelectedTire] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [globalFilters, setGlobalFilters] = useState({ year: '', month: '', center: '', unit: '' });

  const months = [
    { v: '1', l: 'ม.ค.' }, { v: '2', l: 'ก.พ.' }, { v: '3', l: 'มี.ค.' },
    { v: '4', l: 'เม.ย.' }, { v: '5', l: 'พ.ค.' }, { v: '6', l: 'มิ.ย.' },
    { v: '7', l: 'ก.ค.' }, { v: '8', l: 'ส.ค.' }, { v: '9', l: 'ก.ย.' },
    { v: '10', l: 'ต.ค.' }, { v: '11', l: 'พ.ย.' }, { v: '12', l: 'ธ.ค.' },
  ];

  useEffect(() => {
    // Fetch data from backend on mount
    const loadBackendData = async () => {
      try {
        setIsLoading(true);
        const apiBase = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiBase}/api/data`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.changeData) {
            // Combine data from different sheets and inject _sheet attribute
            const allTiresData = [
              ...(data.changeData || []).map(r => ({ ...r, _sheet: 'เปลี่ยนยาง' })),
              ...(data.checkData || []).map(r => ({ ...r, _sheet: 'ตรวจเช็ค' })),
              ...(data.receiveData || []).map(r => ({ ...r, _sheet: 'รับยางใหม่' }))
            ];
            
            const timeStr = new Date(data.lastUpdated).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
            setImportedFileName(`ข้อมูลล่าสุดเมื่อ ${timeStr} น.`);
            setImportedRaw(allTiresData);
            setImportedTruckMetadata(data.truckData);
          }
        } else {
          console.warn('Backend not ready or failed to load data, using mock data fallback');
        }
      } catch (error) {
        console.error('Failed to connect to backend API:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadBackendData();
  }, []);

  // Use imported data if available, else mock
  const rawData = useMemo(() => {
    const data = importedRaw ?? rawMockData;
    if (!data) return [];
    
    // Filter out unwanted trucks: starts with 'IO:' or exactly '221'
    return data.filter(row => {
      const truckNo = String(row['เบอร์รถ'] || '').trim().toUpperCase();
      if (truckNo.startsWith('IO:')) return false;
      if (truckNo === '221') return false;
      return true;
    });
  }, [importedRaw]);

  const processedData = useMemo(() => processTireData(rawData, importedTruckMetadata), [rawData, importedTruckMetadata]);
  const filterOptions = useMemo(() => getFilterOptions(processedData), [processedData]);
  const wearRates = useMemo(() => calculateWearRates(rawData), [rawData]);

  const globalFilteredData = useMemo(() => {
    let res = processedData;
    if (globalFilters.year) res = res.filter(r => String(r.YYYY) === String(globalFilters.year));
    if (globalFilters.month) res = res.filter(r => String(r.MM) === String(globalFilters.month));
    if (globalFilters.center) res = res.filter(r => r['ศูนย์บริการ'] === globalFilters.center);
    if (globalFilters.unit) res = res.filter(r => r['สังกัดรถ'] === globalFilters.unit);
    return res;
  }, [processedData, globalFilters]);

  const planningData = useMemo(() => {
    if (!globalFilters.center && !globalFilters.unit) return processedData;
    
    // Find the latest center and unit for each truck (based on last seen row in data)
    const truckLatestInfo = {};
    processedData.forEach(r => {
      const t = String(r['เบอร์รถ']);
      if (t && t !== 'null') {
        truckLatestInfo[t] = {
          center: r['ศูนย์บริการ'],
          unit: r['สังกัดรถ']
        };
      }
    });

    // Identify which trucks currently belong to the selected filters
    const validTrucks = new Set();
    Object.entries(truckLatestInfo).forEach(([t, info]) => {
      let match = true;
      if (globalFilters.center && info.center !== globalFilters.center) match = false;
      if (globalFilters.unit && info.unit !== globalFilters.unit) match = false;
      if (match) validTrucks.add(t);
    });

    // Return the full history of these valid trucks so we don't lose past active tires
    return processedData.filter(r => validTrucks.has(String(r['เบอร์รถ'])));
  }, [processedData, globalFilters]);

  const dashboardStats = useMemo(() => getDashboardStats(globalFilteredData), [globalFilteredData]);

  const handleImport = (newData, fileName, truckMetadata) => {
    setImportedRaw(newData);
    setImportedFileName(fileName);
    setImportedTruckMetadata(truckMetadata || null);
    setActiveTab('dashboard');
  };

  const handleClearImport = () => {
    setImportedRaw(null);
    setImportedFileName('');
    setImportedTruckMetadata(null);
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ position: 'relative', paddingBottom: '1.25rem', paddingTop: '0.25rem', justifyContent: isSidebarOpen ? 'flex-end' : 'center' }}>
          <div 
            className="logo-wrapper" 
            style={{ 
              display: isSidebarOpen ? 'flex' : 'none', 
              position: 'absolute',
              left: '50%',
              top: '20px',
              transform: 'translate(-50%, -50%)',
              alignItems: 'center', 
              justifyContent: 'center',
              height: '40px'
            }}
          >
            <div 
              title="Logo"
              style={{
                width: '160px',
                height: '40px',
                background: isDarkMode ? '#ffffff' : 'linear-gradient(to bottom, #10b981 72%, #000000 72%)',
                WebkitMaskImage: `url(${logoUrl})`,
                WebkitMaskSize: 'contain',
                WebkitMaskRepeat: 'no-repeat',
                WebkitMaskPosition: 'center center',
                maskImage: `url(${logoUrl})`,
                maskSize: 'contain',
                maskRepeat: 'no-repeat',
                maskPosition: 'center center',
                transition: 'opacity 0.2s',
                opacity: isSidebarOpen ? 1 : 0,
                display: isSidebarOpen ? 'block' : 'none'
              }}
            />
          </div>
          <button className="toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)} title="ซ่อน/แสดงเมนู">
            <Menu size={20} />
          </button>
        </div>
        <div style={{ padding: '0 1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
          {isSidebarOpen ? (
            <form 
              onSubmit={e => { 
                e.preventDefault(); 
                if (searchQuery.trim()) {
                  setSelectedTire(searchQuery.trim());
                  setSearchQuery('');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '10px', padding: '0.5rem 0.75rem', transition: 'all 0.2s', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)' }}
            >
              <Search size={16} color="var(--text-secondary)" style={{ marginRight: '0.5rem' }} />
              <input 
                type="text" 
                placeholder="ค้นหาเบอร์ยาง..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.85rem', fontFamily: 'var(--font-sans)' }}
              />
            </form>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px',
                background: 'var(--overlay-05)', border: '1px solid var(--border-medium)', borderRadius: '10px',
                color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s'
              }}
              title="ค้นหาเบอร์ยาง"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        <nav className="nav-tabs" style={{ flex: 1, marginTop: '0.5rem' }}>
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            title="ภาพรวม"
          >
            <LayoutDashboard size={18} />
            <span>ภาพรวม</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'planning' ? 'active' : ''}`}
            onClick={() => setActiveTab('planning')}
            title="แผนถอดยาง"
          >
            <CalendarClock size={18} />
            <span>แผนถอดยาง</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'cohort' ? 'active' : ''}`}
            onClick={() => setActiveTab('cohort')}
            title="วิเคราะห์กลุ่ม"
          >
            <Activity size={18} />
            <span>วิเคราะห์กลุ่ม</span>
          </button>
          <button
            className={`nav-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
            title="ฐานข้อมูล"
          >
            <Database size={18} />
            <span>ฐานข้อมูล</span>
          </button>
        </nav>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {importedRaw ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isSidebarOpen ? 'space-between' : 'center', padding: isSidebarOpen ? '0.6rem 0.85rem' : '0.6rem', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-status-success)' }} title={importedFileName}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                <FileCheck size={isSidebarOpen ? 14 : 18} style={{ flexShrink: 0 }} />
                {isSidebarOpen && <span style={{ fontWeight: 500, lineHeight: 1.3 }}>{importedFileName}</span>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: isSidebarOpen ? '0.6rem 0.85rem' : '0.6rem', background: 'var(--overlay-black-20)', border: '1px solid var(--border-light)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }} title="กำลังใช้ข้อมูล Demo">
              {!isSidebarOpen ? <Database size={18} /> : 'กำลังใช้ข้อมูล Demo'}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexDirection: isSidebarOpen ? 'row' : 'column' }}>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px',
                background: 'var(--overlay-05)', border: '1px solid var(--border-medium)', borderRadius: '10px',
                color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s'
              }}
              title="สลับโหมดสี"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={() => {
                // Force sync data from backend
                setIsLoading(true);
                fetch('/api/sync').then(r => r.json()).then(() => {
                  window.location.reload();
                }).catch(err => {
                  console.error(err);
                  setIsLoading(false);
                });
              }}
              style={{
                flex: isSidebarOpen ? 3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                height: '40px', background: 'rgba(59,130,246,0.15)',
                border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px',
                color: 'var(--text-status-info)', fontFamily: 'inherit', fontSize: '0.85rem',
                fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
              }}
              title="ซิงค์ข้อมูลล่าสุด"
            >
              <RefreshCw size={16} /> {!isSidebarOpen ? null : <span>ซิงค์ข้อมูลล่าสุด</span>}
            </button>
          </div>
        </div>
      </aside>

      <div className="main-content">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1rem' }}>
            <RefreshCw size={48} color="var(--accent-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
            <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>กำลังโหลดข้อมูล...</h2>
            <p style={{ color: 'var(--text-secondary)' }}>ข้อมูลมีขนาดใหญ่ อาจใช้เวลาสักครู่ในครั้งแรก</p>
          </div>
        ) : (
          <>
            {/* Global Filter Bar */}
        {activeTab === 'dashboard' && (
          <div className="glass-panel" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <Filter size={16} />
                <span>ตัวกรองภาพรวม:</span>
              </div>
              <select 
                style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                value={globalFilters.year} onChange={e => setGlobalFilters(prev => ({ ...prev, year: e.target.value }))}
              >
                <option value="">ทุกปี</option>
                {filterOptions?.years?.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                value={globalFilters.month} onChange={e => setGlobalFilters(prev => ({ ...prev, month: e.target.value }))}
              >
                <option value="">ทุกเดือน</option>
                {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
              </select>
              <select 
                style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                value={globalFilters.center} onChange={e => setGlobalFilters(prev => ({ ...prev, center: e.target.value }))}
              >
                <option value="">ทุกศูนย์บริการ</option>
                {filterOptions?.centers?.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select 
                style={{ background: 'var(--overlay-black-30)', border: '1px solid var(--border-medium)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', outline: 'none' }}
                value={globalFilters.unit} onChange={e => setGlobalFilters(prev => ({ ...prev, unit: e.target.value }))}
              >
                <option value="">ทุกสังกัดรถ</option>
                {filterOptions?.units?.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button
                onClick={() => setGlobalFilters({ year: '', month: '', center: '', unit: '' })}
                style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '8px', padding: '0.4rem 0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <RefreshCw size={14} /> รีเซ็ต
              </button>
            </div>
          </div>
        )}

        <main className="fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'dashboard' && <Dashboard stats={dashboardStats} />}
          {activeTab === 'cohort' && <CohortAnalysis rawData={rawData} truckMetadata={importedTruckMetadata} />}
          {activeTab === 'planning' && <Planning data={planningData} rawData={rawData} truckMetadata={importedTruckMetadata} onTireClick={setSelectedTire} onTruckClick={setSelectedTruck} wearRates={wearRates} />}
          {activeTab === 'data' && (
            <DataExplorer data={globalFilteredData} truckMetadata={importedTruckMetadata} filterOptions={filterOptions} onTireClick={setSelectedTire} onTruckClick={setSelectedTruck} />
          )}
          {activeTab === 'repeatedRepair' && (
            <RepeatedRepairDashboard data={repeatedRepairMockData} />
          )}
        </main>
        </>
        )}
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
        />
      )}

      {selectedTire && (
        <TireHistoryModal
          tireNumber={selectedTire}
          data={processedData} // Use full processed data for history, un-filtered by global filters
          onClose={() => setSelectedTire(null)}
        />
      )}

      {selectedTruck && (
        <TruckHistoryModal
          truckNumber={selectedTruck}
          data={processedData}
          truckMetadata={importedTruckMetadata}
          onClose={() => setSelectedTruck(null)}
        />
      )}
    </div>
  );
}

export default App;

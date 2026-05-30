import React, { useState } from 'react';
import { useDrawingStore } from '../../store/drawingStore';

const ToolButton = ({ tool, currentTool, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = currentTool === tool.id;

  let bgColor = 'transparent';
  if (isActive) bgColor = '#0ea5e9';
  else if (isHovered) bgColor = '#1e293b';

  let color = isActive ? '#ffffff' : '#94a3b8';
  if (isHovered && !isActive) color = '#f8fafc';

  return (
    <button
      onClick={() => onClick(tool.action || tool.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={tool.title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '38px', height: '38px',
        backgroundColor: bgColor, color: color,
        border: 'none', borderRadius: '8px',
        cursor: 'pointer', transition: 'all 0.15s ease'
      }}
    >
       <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {tool.svg}
       </svg>
    </button>
  );
};

const Divider = () => (
  <div style={{ width: '1px', height: '24px', backgroundColor: '#334155', margin: '0 8px' }} />
);

export const TopToolbox = () => {
  const { 
    currentTool, setCurrentTool, modifyValue, setModifyValue, applyTransform, 
    undo, redo, copyShapes, cutShapes, pasteShapes, explodeSelected, 
    groupSelected, intersectSelected, deleteSelectedShapes, selections 
  } = useDrawingStore();

  const handleToolClick = (tool) => {
    if (tool === 'UNDO') { undo(); return; }
    if (tool === 'REDO') { redo(); return; }
    if (tool === 'COPY') { copyShapes(); return; }
    if (tool === 'CUT') { cutShapes(); return; }
    if (tool === 'PASTE') { pasteShapes(); return; }
    if (tool === 'EXPLODE') { explodeSelected(); return; }
    if (tool === 'GROUP') { groupSelected(); return; }
    if (tool === 'INTERSECT') { intersectSelected(); return; }
    
    if (tool === 'DELETE') {
        if (selections.length > 0) {
            deleteSelectedShapes();
            setCurrentTool('SELECT');
        } else {
            setCurrentTool('DELETE');
        }
        return;
    }
    
    setCurrentTool(tool);
  };

  const tools = [
    { id: 'SELECT', title: 'Seçim (ESC)', svg: <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" /> },
    { id: 'LINE', title: 'Çizgi', svg: <line x1="5" y1="19" x2="19" y2="5" /> },
    { id: 'POLYLINE', title: 'Çoklu Çizgi', svg: <polyline points="3 17 9 11 15 15 21 5" /> },
    { id: 'RECTANGLE', title: 'Dikdörtgen', svg: <rect x="3" y="3" width="18" height="18" rx="2" /> },
    { id: 'POLYGON', title: 'Çokgen', svg: <polygon points="12 2 22 8.5 18.2 19.5 5.8 19.5 2 8.5" /> },
    { id: 'CIRCLE_CENTER', title: 'Daire (Merkez)', svg: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="1" fill="currentColor" /></> },
    { id: 'ARC_3P', title: 'Yay (3 Nokta)', svg: <><path d="M3 12a9 9 0 0 1 18 0" /><circle cx="3" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none"/><circle cx="21" cy="12" r="1.5" fill="currentColor" stroke="none"/></> },
    
    { id: 'MOVE', title: 'Taşı', svg: <><path d="M12 2L12 22M2 12L22 12M12 2L9 5M12 2L15 5M12 22L9 19M12 22L15 19M2 12L5 9M2 12L5 15M22 12L19 9M22 12L19 15" /></> },
    { id: 'COPY_CMD', action: 'COPY', title: 'Kopyala', svg: <><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></> },
    { id: 'ROTATE', title: 'Döndür', svg: <><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3" /></> },
    { id: 'SCALE', title: 'Ölçekle', svg: <><path d="M21 3l-6 6M21 3v6M21 3h-6M14 10H3v11h11V10z" /></> },
    { id: 'OFFSET', title: 'Ötele (Offset)', svg: <><path d="M4 20L20 4M9 21L21 9" /></> },
    { id: 'TRIM', title: 'Kırp (Trim)', svg: <><path d="M20 4L8.12 15.88M14.47 14.48L20 20M8.12 8.12L12 12" /><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /></> },
    { id: 'FILLET', title: 'Yuvarla (Fillet)', svg: <path d="M4 20v-5A11 11 0 0 1 15 4h5" /> },
    { id: 'CHAMFER', title: 'Pah Kır (Chamfer)', svg: <path d="M4 20V9l7-5h9" /> },
    { id: 'DELETE', title: 'Sil (Erase)', svg: <><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></> },
    
    { id: 'EXPLODE', title: 'Parçala (Explode)', svg: <><path d="M10 10l-6-6M14 14l6 6M14 10l6-6M10 14l-6 6M12 2v3M12 19v3M2 12h3M19 12h3" /></> },
    { id: 'GROUP', title: 'Gruplandır (Group)', svg: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /></> },
    { id: 'INTERSECT', title: 'Kesiştir (Intersect)', svg: <><circle cx="9" cy="12" r="6" /><circle cx="15" cy="12" r="6" /></> },
    
    { id: 'UNDO', title: 'Geri Al', svg: <><path d="M3 7v6h6M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.6L3 13" /></> },
    { id: 'REDO', title: 'İleri Al', svg: <><path d="M21 7v6h-6M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.6L21 13" /></> }
  ];

  const needsInput = ['OFFSET', 'ROTATE', 'SCALE', 'FILLET', 'CHAMFER'].includes(currentTool);

  return (
    // ÇÖZÜM 1: Z-Index ile donatılmış Relative kapsayıcı
    <div style={{ position: 'relative', zIndex: 10, background: '#0f172a', borderBottom: '1px solid #1e293b', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
      <div style={{ padding: '8px 16px', display: 'flex', gap: '4px', alignItems: 'center', overflowX: 'auto' }}>
        {tools.slice(0, 7).map(t => <ToolButton key={t.id} tool={t} currentTool={currentTool} onClick={handleToolClick} />)}
        <Divider />
        {tools.slice(7, 16).map(t => <ToolButton key={t.id} tool={t} currentTool={currentTool} onClick={handleToolClick} />)}
        <Divider />
        {tools.slice(16, 19).map(t => <ToolButton key={t.id} tool={t} currentTool={currentTool} onClick={handleToolClick} />)}
        <Divider />
        {tools.slice(19, 21).map(t => <ToolButton key={t.id} tool={t} currentTool={currentTool} onClick={handleToolClick} />)}
      </div>

      {/* ÇÖZÜM 1 DEVAMI: Input kutusu Absolute yapılarak havada süzülmesi sağlandı */}
      {needsInput && (
        <div style={{ 
          position: 'absolute', top: '100%', right: '16px', marginTop: '8px', 
          display: 'flex', alignItems: 'center', gap: '8px', 
          background: '#020617', padding: '0 12px', 
          borderRadius: '6px', border: '1px solid #334155', 
          height: '34px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)' 
        }}>
          <span style={{fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold'}}>
            {currentTool} Değeri:
          </span>
          <input 
            autoFocus 
            type="number" 
            value={modifyValue} 
            onChange={(e) => setModifyValue(e.target.value)} 
            onKeyDown={(e) => { if(e.key === 'Enter') applyTransform(currentTool, modifyValue, null); }} 
            style={{ 
              background: 'transparent', border: 'none', color: '#38bdf8', 
              outline: 'none', width: '80px', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' 
            }} 
          />
        </div>
      )}
    </div>
  );
};
import React from 'react';
import { useDrawingStore } from '../../store/drawingStore';

export const BottomStatusBar = () => {
  const {
    snapGrid, snapTracking, snapPolar, snapVertex, snapEdge, snapCenter,
    toggleSnapGrid, toggleSnapTracking, toggleSnapPolar, toggleSnapVertex, toggleSnapEdge, toggleSnapCenter,
    useBasePoint, toggleUseBasePoint
  } = useDrawingStore();

  const SnapButton = ({ active, onClick, label, shortcut }) => (
    <button
      onClick={onClick}
      title={`Kısayol: Ctrl + ${shortcut}`}
      style={{
        padding: '4px 12px',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        backgroundColor: active ? '#0ea5e9' : 'transparent',
        color: active ? '#ffffff' : '#64748b',
        border: `1px solid ${active ? '#0ea5e9' : '#334155'}`,
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      height: '36px',
      backgroundColor: '#0f172a',
      borderTop: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '8px',
      overflowX: 'auto',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <span style={{ color: '#475569', fontSize: '11px', marginRight: '4px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
        SNAPS:
      </span>
      <SnapButton active={snapGrid} onClick={toggleSnapGrid} label="Grid" shortcut="1" />
      <SnapButton active={snapTracking} onClick={toggleSnapTracking} label="Track" shortcut="2" />
      <SnapButton active={snapPolar} onClick={toggleSnapPolar} label="Polar" shortcut="3" />
      <SnapButton active={snapVertex} onClick={toggleSnapVertex} label="Vertex" shortcut="4" />
      <SnapButton active={snapEdge} onClick={toggleSnapEdge} label="Edge" shortcut="5" />
      <SnapButton active={snapCenter} onClick={toggleSnapCenter} label="Center" shortcut="6" />

      <div style={{ width: '1px', height: '16px', backgroundColor: '#334155', margin: '0 8px' }} />

      <SnapButton active={useBasePoint} onClick={toggleUseBasePoint} label="Base Point" shortcut="9" />
    </div>
  );
};
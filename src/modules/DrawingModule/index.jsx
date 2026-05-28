import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Grid } from '@react-three/drei';
import { useDrawingStore } from './store/drawingStore';
import { DrawingPlane } from './components/Tools/DrawingPlane';
import { BoundaryBuilder } from './components/Environment/BoundaryBuilder';

export default function DrawingModule() {
  const { activeFloorId, floors, closeBoundary, resetBoundary } = useDrawingStore();
  const activeFloor = floors[activeFloorId];
  const currentElevation = activeFloor ? activeFloor.elevation : 0;

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Üst Kontrol Paneli */}
      <div style={{ padding: '15px', background: '#f8f9fa', display: 'flex', gap: '15px', borderBottom: '1px solid #ddd' }}>
        <div style={{ fontWeight: 'bold' }}>Aktif Kat: {activeFloor?.name} (Kot: {currentElevation}cm)</div>
        
        {!activeFloor?.isBoundaryClosed ? (
          <>
            <button onClick={() => closeBoundary(activeFloorId)}>Sınırı Kapat (Poligon Oluştur)</button>
            <button onClick={() => resetBoundary(activeFloorId)}>Çizimi Sıfırla</button>
            <span style={{ color: 'gray', fontSize: '14px' }}>Ekrana tıklayarak kat sınırlarını (köşeleri) belirleyin...</span>
          </>
        ) : (
          <span style={{ color: 'green', fontWeight: 'bold' }}>Kat Sınırı Belirlendi. Tesisat çizimine geçilebilir.</span>
        )}
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1 }}>
        <Canvas>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />

          {/* Sadece 2D Çizim Kamerası (Şimdilik) */}
          <OrthographicCamera makeDefault position={[0, 1000, 0]} zoom={2} />
          <OrbitControls enableRotate={false} enablePan={true} enableZoom={true} />

          {/* Grid Referansı */}
          <Grid position={[0, currentElevation - 0.1, 0]} infiniteGrid cellSize={10} sectionSize={100} fadeDistance={2000} fadeStrength={1} />

          {/* Adım 2 Bileşenleri */}
          <DrawingPlane activeFloorElevation={currentElevation} />
          <BoundaryBuilder elevation={currentElevation} />

        </Canvas>
      </div>
    </div>
  );
}
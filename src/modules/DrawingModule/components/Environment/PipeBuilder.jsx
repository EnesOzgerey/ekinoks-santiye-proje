import React, { useState } from 'react';
import { Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useDrawingStore } from '../../store/drawingStore';

export const PipeBuilder = () => {
  const { activeFloorId, floors, pipeViewMode } = useDrawingStore();
  const currentFloor = floors[activeFloorId];
  const lines = currentFloor?.lines || [];

  return (
    <group>
      {lines.map((line) => (
        <SinglePipe key={line.id} lineData={line} viewMode={pipeViewMode} />
      ))}
    </group>
  );
};

const SinglePipe = ({ lineData, viewMode }) => {
  const [hovered, setHovered] = useState(false);
  const { start, end, mechanicalData } = lineData;

  // 3D Silindir için hesaplamalar (Matematik kısmı)
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  
  // Orta nokta (Silindirin pozisyonu merkezden ayarlanır)
  const midPoint = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ];

  // Y eksenindeki sapma açısı (Düz zemin varsayımıyla sadece XZ rotasyonu yapıyoruz)
  const angleY = Math.atan2(dx, dz); 

  // Boru çapını mm'den cm'ye (veya birime) çevirip yarıçap bulma
  const radius = (mechanicalData.diameter / 10) / 2;

  return (
    <group 
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={(e) => { e.stopPropagation(); setHovered(false); }}
    >
      {/* GÖRÜNÜM 1: 2D Tel Çerçeve (Çizgi) */}
      {viewMode === '2D_LINE' && (
        <Line
          points={[start, end]}
          color={hovered ? "#f1c40f" : mechanicalData.color}
          lineWidth={hovered ? 5 : 3}
        />
      )}

      {/* GÖRÜNÜM 2: 3D Katı Boru (Silindir) */}
      {viewMode === '3D_PIPE' && (
        <mesh 
          position={midPoint} 
          rotation={[Math.PI / 2, 0, angleY]} // Silindiri yatır ve doğru açıya çevir
        >
          <cylinderGeometry args={[radius, radius, distance, 16]} />
          <meshStandardMaterial 
            color={hovered ? "#f1c40f" : mechanicalData.color} 
            roughness={0.4} 
            metalness={0.2} 
          />
        </mesh>
      )}

      {/* ÜZERİNE GELİNCE ÇIKAN HTML BİLGİ KUTUSU (TOOLTIP) */}
      {hovered && (
        <Html position={midPoint} center distanceFactor={10} zIndexRange={[100, 0]}>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontFamily: 'sans-serif',
            fontSize: '12px',
            pointerEvents: 'none', // Farenin HTML'e takılmasını engeller
            whiteSpace: 'nowrap',
            boxShadow: '0px 4px 6px rgba(0,0,0,0.3)'
          }}>
            <strong style={{ color: mechanicalData.color }}>{mechanicalData.type}</strong><br/>
            Malzeme: {mechanicalData.material}<br/>
            Çap: DN{mechanicalData.diameter}<br/>
            Uzunluk: {Math.round(distance)} cm
          </div>
        </Html>
      )}
    </group>
  );
};
import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useDrawingStore } from '../../store/drawingStore';
import { snapToGrid, snapToPoint } from '../../utils/math';

export const BoundaryBuilder = ({ elevation }) => {
  const { activeFloorId, floors } = useDrawingStore();
  const currentFloor = floors[activeFloorId];
  const points = currentFloor?.boundaryPoints || [];
  const isClosed = currentFloor?.isBoundaryClosed;

  const [mousePos, setMousePos] = useState([0, 0, 0]);
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -elevation));

  // Farenin anlık pozisyonunu hesaplamak için useFrame hook'u kullanıyoruz
  // Bu, "elastik çizgi" (rubber band) etkisini yaratır (CAD programlarındaki gibi)
 useFrame(({ pointer, camera, raycaster }) => {
    if (!isClosed && points.length > 0) {
      raycaster.setFromCamera(pointer, camera);
      const intersectPoint = new THREE.Vector3();
      raycaster.ray.intersectPlane(planeRef.current, intersectPoint);
      
      if (intersectPoint) {
        // Önizleme için de aynı Snap mantığını çalıştırıyoruz
        let snappedX = snapToGrid(intersectPoint.x, 10);
        let snappedZ = snapToGrid(intersectPoint.z, 10);

        if (points.length > 0) {
          const pointSnap = snapToPoint([snappedX, snappedZ], points, 20);
          snappedX = pointSnap[0];
          snappedZ = pointSnap[1];
        }

        setMousePos([snappedX, elevation, snappedZ]);
      }
    }
  });

  if (points.length === 0) return null;

  // 2D noktaları 3D vektörlere çevir (yükseklik/elevation ekle)
  const linePoints = points.map(p => [p[0], elevation, p[1]]);
  
  // Eğer sınır henüz kapanmadıysa, son noktadan farenin anlık konumuna bir önizleme çizgisi ekle
  const renderPoints = isClosed ? [...linePoints, linePoints[0]] : [...linePoints, mousePos];

  return (
    <group>
      {/* Sınır Çizgileri */}
      {renderPoints.length > 1 && (
        <Line
          points={renderPoints}
          color={isClosed ? "black" : "blue"}
          lineWidth={3} // Ekrandaki piksel kalınlığı
          dashed={!isClosed} // Çizim devam ederken kesikli çizgi göster
          dashSize={10}
          gapSize={5}
        />
      )}

      {/* Tıklanan Köşe Noktaları (Vertices) */}
      {linePoints.map((pos, index) => (
        <mesh key={index} position={pos}>
          <boxGeometry args={[5, 5, 5]} />
          <meshBasicMaterial color="red" />
        </mesh>
      ))}
      
      {/* Poligon Kapandığında Katı Zemin Gösterme */}
      {isClosed && (
        <ShapeRenderer points={points} elevation={elevation} />
      )}
    </group>
  );
};

// Noktalardan oluşan kapalı poligonun içini dolduran yardımcı bileşen
const ShapeRenderer = ({ points, elevation }) => {
  const shape = new THREE.Shape();
  points.forEach((p, index) => {
    if (index === 0) shape.moveTo(p[0], p[1]);
    else shape.lineTo(p[0], p[1]);
  });

  return (
    <mesh position={[0, elevation, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial color="#a8d5e2" side={THREE.DoubleSide} transparent opacity={0.6} />
    </mesh>
  );
};
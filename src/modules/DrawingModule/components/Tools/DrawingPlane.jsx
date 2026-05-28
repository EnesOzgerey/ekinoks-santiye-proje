import React from 'react';
import { useDrawingStore } from '../../store/drawingStore';
import { snapToGrid, snapToPoint } from '../../utils/math';

export const DrawingPlane = ({ activeFloorElevation }) => {
  const { activeFloorId, addBoundaryPoint, floors } = useDrawingStore();
  const currentFloor = floors[activeFloorId];
  
  const isDrawingMode = !currentFloor?.isBoundaryClosed;

  const handlePlaneClick = (e) => {
    e.stopPropagation(); 
    
    if (isDrawingMode) {
      // 1. Önce farenin ham koordinatlarını 10'luk grid'e yuvarla
      let snappedX = snapToGrid(e.point.x, 10);
      let snappedZ = snapToGrid(e.point.z, 10);

      // 2. Eğer sahnede daha önceden atılmış noktalar varsa, onlara yakınlığı kontrol et
      if (currentFloor?.boundaryPoints?.length > 0) {
        const pointSnap = snapToPoint([snappedX, snappedZ], currentFloor.boundaryPoints, 20);
        snappedX = pointSnap[0];
        snappedZ = pointSnap[1];
      }

      // 3. Temizlenmiş ve hizalanmış noktayı store'a gönder
      addBoundaryPoint(activeFloorId, [snappedX, snappedZ]);
    }
  };

  return (
    <mesh 
      position={[0, activeFloorElevation, 0]} 
      rotation={[-Math.PI / 2, 0, 0]} 
      onClick={handlePlaneClick}
      visible={false} 
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};
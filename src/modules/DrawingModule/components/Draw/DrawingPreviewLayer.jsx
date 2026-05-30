import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useDrawingStore } from '../../store/drawingStore';
import { generateCirclePoints, generateArcPoints, getCircumcenter } from '../../utils/geometry';

// Bu bileşen, ana dosyadan faremizin anlık olarak kilitlendiği (snapped) posizyonu prop olarak alır.
export const DrawingPreviewLayer = ({ activeCursorPos }) => {
  const currentTool = useDrawingStore(state => state.currentTool);
  const temporaryPoints = useDrawingStore(state => state.temporaryPoints);
  const polygonSides = useDrawingStore(state => state.polygonSides);

  const previewPoints = useMemo(() => {
    // Çizim işlemi başlamadıysa veya seçim modundaysak önizleme çizme
    if (temporaryPoints.length === 0 || currentTool === 'SELECT') return [];
    
    const p1 = temporaryPoints[0]; 
    const p2 = activeCursorPos; // Farenin anlık konumu

    if (currentTool === 'LINE' || currentTool === 'POLYLINE') {
        return [...temporaryPoints, p2];
    }
    if (currentTool === 'RECTANGLE') {
        return [p1, [p2[0], p1[1]], p2, [p1[0], p2[1]], p1];
    }
    if (currentTool === 'POLYGON') {
        const r = Math.hypot(p2[0]-p1[0], p2[1]-p1[1]); 
        const startAngle = Math.atan2(p2[1]-p1[1], p2[0]-p1[0]);
        const pts = []; 
        for(let i=0; i<=polygonSides; i++) {
            pts.push([p1[0] + r * Math.cos(startAngle + (i/polygonSides)*Math.PI*2), p1[1] + r * Math.sin(startAngle + (i/polygonSides)*Math.PI*2)]);
        }
        return pts;
    }
    if (currentTool === 'CIRCLE_CENTER') {
        return generateCirclePoints(p1[0], p1[1], Math.hypot(p2[0]-p1[0], p2[1]-p1[1]));
    }
    if (currentTool === 'CIRCLE_2P') {
        return generateCirclePoints((p1[0]+p2[0])/2, (p1[1]+p2[1])/2, Math.hypot(p2[0]-p1[0], p2[1]-p1[1])/2);
    }
    if (currentTool === 'CIRCLE_3P') {
        if (temporaryPoints.length === 1) return [p1, p2];
        const cc = getCircumcenter(p1, temporaryPoints[1], p2);
        return cc ? generateCirclePoints(cc[0], cc[1], Math.hypot(p1[0]-cc[0], p1[1]-cc[1])) : [p1, temporaryPoints[1], p2];
    }
    if (currentTool === 'ARC_3P') {
        if (temporaryPoints.length === 1) return [p1, p2];
        return generateArcPoints(p1, temporaryPoints[1], p2);
    }
    
    return [];
  }, [temporaryPoints, activeCursorPos, currentTool, polygonSides]);

  if (previewPoints.length === 0) return null;

  return (
      // activeZ = 2 katmanında çizilir ki diğer çizgilerin altında kalmasın
      <Line points={previewPoints.map(p => [p[0], p[1], 2])} color="#38bdf8" lineWidth={3} />
  );
};
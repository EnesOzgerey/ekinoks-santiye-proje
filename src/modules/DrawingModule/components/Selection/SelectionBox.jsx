import React, { useState, useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useDrawingStore } from '../../store/drawingStore';
import { getNearestPointOnSegment, generateCirclePoints, generateArcPoints } from '../../utils/geometry';

export const SelectionBox = () => {
  const currentTool = useDrawingStore(state => state.currentTool);
  const shapes = useDrawingStore(state => state.shapes);
  const selections = useDrawingStore(state => state.selections);
  const setSelections = useDrawingStore(state => state.setSelections);
  const editShapeId = useDrawingStore(state => state.editShapeId);
  const setEditShapeId = useDrawingStore(state => state.setEditShapeId);
  const startLiveDrag = useDrawingStore(state => state.startLiveDrag);
  const updateLiveDrag = useDrawingStore(state => state.updateLiveDrag);
  const endLiveDrag = useDrawingStore(state => state.endLiveDrag);
  const filterVertex = useDrawingStore(state => state.filterVertex);

  const [box, setBox] = useState(null);
  const dragMode = useRef('NONE');
  const dragStartPos = useRef([0, 0]);
  const lastClickTime = useRef(0);
  const lastClickPos = useRef([0, 0]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);

  useFrame(({ pointer, camera, raycaster }) => {
    if (!['SELECT', 'DELETE'].includes(currentTool) || dragMode.current === 'NONE') return;
    
    raycaster.setFromCamera(pointer, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    if (!intersect) return;
    if (dragMode.current === 'MARQUEE') setBox({ start: dragStartPos.current, end: [intersect.x, intersect.y] });
    else if (dragMode.current === 'MANIPULATION') updateLiveDrag(intersect.x - dragStartPos.current[0], intersect.y - dragStartPos.current[1]);
  });

  const testHitTarget = (pt) => {
    let hit = null;
    shapes.forEach(shape => {
       if (hit) return; 

       // ÇÖZÜM: Nesnenin içine girildiyse sadece onun alt-objeleriyle (Vertex/Edge) ilgilen!
       if (editShapeId && shape.id !== editShapeId) return;

       if (filterVertex) {
          if (shape.type === 'circle') {
              if (Math.hypot(pt[0]-shape.center[0], pt[1]-shape.center[1]) < 15) { hit = { id: shape.id, type: 'VERTEX', index: 0 }; }
          } else if (shape.type === 'polyline' || shape.type === 'composite' || shape.type === 'arc') {
              shape.points.forEach((p, i) => { 
                  if (p && Math.hypot(pt[0]-p[0], pt[1]-p[1]) < 15) hit = { id: shape.id, type: 'VERTEX', index: i }; 
              });
          } else if (shape.type === 'point' && shape.points && shape.points[0]) {
              if (Math.hypot(pt[0]-shape.points[0][0], pt[1]-shape.points[0][1]) < 15) hit = { id: shape.id, type: 'SHAPE' };
          }
       }

       if (!hit) {
          // ÇÖZÜM: Edit modundaysa çizgiler artık kendini 'EDGE' olarak tanıtır!
          const hitType = editShapeId === shape.id ? 'EDGE' : 'SHAPE';

          if (shape.type === 'circle') {
              const distToCenter = Math.hypot(pt[0]-shape.center[0], pt[1]-shape.center[1]);
              if (Math.abs(distToCenter - shape.radius) < 15) hit = { id: shape.id, type: hitType, index: 0 };
          } else {
              if (shape.type === 'composite' && shape.segments) {
                  for(let i=0; i<shape.segments.length; i++) {
                      const seg = shape.segments[i];
                      if (!seg.indices) continue;
                      const p0 = shape.points[seg.indices[0]]; const p1 = shape.points[seg.indices[1]]; const p2 = shape.points[seg.indices[2]];
                      if (!p0 || !p1) continue;
                      let scanPts = seg.type === 'line' ? [p0, p1] : generateArcPoints(p0, p1, p2, 16);
                      for(let j=0; j<scanPts.length-1; j++) {
                          if (scanPts[j] && scanPts[j+1] && scanPts[j][0]!==undefined && scanPts[j+1][0]!==undefined) {
                              if (Math.hypot(pt[0]-getNearestPointOnSegment(pt, scanPts[j], scanPts[j+1])[0], pt[1]-getNearestPointOnSegment(pt, scanPts[j], scanPts[j+1])[1]) < 15) {
                                  hit = { id: shape.id, type: hitType, index: i }; // EDGE Index'i segmentin kendi numarasıdır!
                                  break;
                              }
                          }
                      }
                      if (hit) break;
                  }
              } else if (shape.type === 'arc') {
                  const scanPts = generateArcPoints(shape.points[0], shape.points[1], shape.points[2], 32);
                  for (let i = 0; i < scanPts.length - 1; i++) {
                     if (scanPts[i] && scanPts[i+1] && scanPts[i][0] !== undefined && scanPts[i+1][0] !== undefined) {
                         if (Math.hypot(pt[0] - getNearestPointOnSegment(pt, scanPts[i], scanPts[i+1])[0], pt[1] - getNearestPointOnSegment(pt, scanPts[i], scanPts[i+1])[1]) < 15) {
                             hit = { id: shape.id, type: hitType, index: 0 };
                             break;
                         }
                     }
                  }
              } else if (shape.type === 'polyline') {
                  for (let i = 0; i < shape.points.length - 1; i++) {
                     if (shape.points[i] && shape.points[i+1] && shape.points[i][0] !== undefined && shape.points[i+1][0] !== undefined) {
                         if (Math.hypot(pt[0] - getNearestPointOnSegment(pt, shape.points[i], shape.points[i+1])[0], pt[1] - getNearestPointOnSegment(pt, shape.points[i], shape.points[i+1])[1]) < 15) {
                             hit = { id: shape.id, type: hitType, index: i };
                             break;
                         }
                     }
                  }
              }
          }
       }
    });
    return hit;
  };

  const handleDoubleClick = (pt) => {
    let hits = [];
    shapes.forEach(shape => {
       if (shape.type === 'polyline' || shape.type === 'composite') {
          for (let i = 0; i < shape.points.length - 1; i++) {
             if (shape.points[i] && shape.points[i+1] && shape.points[i][0] !== undefined && shape.points[i+1][0] !== undefined) {
                const d = Math.hypot(pt[0] - getNearestPointOnSegment(pt, shape.points[i], shape.points[i+1])[0], pt[1] - getNearestPointOnSegment(pt, shape.points[i], shape.points[i+1])[1]);
                if (d < 15) hits.push({ id: shape.id, dist: d });
             }
          }
       } else if (shape.type === 'circle') {
           const distToCenter = Math.hypot(pt[0]-shape.center[0], pt[1]-shape.center[1]);
           if (Math.abs(distToCenter - shape.radius) < 15) hits.push({ id: shape.id, dist: Math.abs(distToCenter - shape.radius) });
       }
    });
    if (hits.length > 0) { hits.sort((a,b) => a.dist - b.dist); setEditShapeId(hits[0].id); setSelections([]); }
  };

  const performSelection = (ptUp, isShiftPressed) => {
    if (!box || Math.hypot(box.end[0] - box.start[0], box.end[1] - box.start[1]) < 4) return;
    let targetSels = [];
    const minX = Math.min(box.start[0], box.end[0]); const maxX = Math.max(box.start[0], box.end[0]);
    const minY = Math.min(box.start[1], box.end[1]); const maxY = Math.max(box.start[1], box.end[1]);

    shapes.forEach(shape => {
      // ÇÖZÜM: Edit Modundaysak diğer nesneleri seçim kutusuna dahil etme
      if (editShapeId && shape.id !== editShapeId) return;

      if (editShapeId === shape.id) {
          // Edit modunda kutu seçimi yalnızca noktaları (Vertex) toplar
          if (filterVertex) {
              if (shape.type === 'circle') {
                  if (shape.center[0] >= minX && shape.center[0] <= maxX && shape.center[1] >= minY && shape.center[1] <= maxY) targetSels.push({ id: shape.id, type: 'VERTEX', index: 0 });
              } else if (shape.type === 'arc' || shape.type === 'composite' || shape.type === 'polyline') {
                  shape.points.forEach((p, i) => { if (p && p[0] !== undefined && p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY) targetSels.push({ id: shape.id, type: 'VERTEX', index: i }); });
              }
          }
      } else {
          let pts = shape.type === 'polyline' || shape.type === 'composite' || shape.type === 'point' ? shape.points : (shape.type === 'circle' ? generateCirclePoints(shape.center[0], shape.center[1], shape.radius, 16) : generateArcPoints(shape.points[0], shape.points[1], shape.points[2], 16));
          const anyInside = pts.some(p => p && p[0] !== undefined && p[0] >= minX && p[0] <= maxX && p[1] >= minY && p[1] <= maxY);
          if (anyInside && !targetSels.some(t => t.id === shape.id)) targetSels.push({ id: shape.id, type: 'SHAPE' });
      }
    });
    setSelections(isShiftPressed ? [...selections, ...targetSels] : targetSels);
  };

  return (
    <group>
      {['SELECT', 'DELETE'].includes(currentTool) && (
        <mesh 
          onPointerDown={(e) => { 
            e.stopPropagation(); const pt = [e.point.x, e.point.y];
            if (e.button === 0) { 
              const now = Date.now();
              if (now - lastClickTime.current < 350 && Math.hypot(pt[0]-lastClickPos.current[0], pt[1]-lastClickPos.current[1]) < 10 && !editShapeId) { handleDoubleClick(pt); dragMode.current = 'NONE'; return; }
              lastClickTime.current = now; lastClickPos.current = pt;
              
              const hitTarget = testHitTarget(pt);
              if (hitTarget) { 
                 dragMode.current = 'MANIPULATION'; dragStartPos.current = pt; 
                 const isAlreadySelected = selections.some(s => s.id === hitTarget.id && s.type === hitTarget.type && s.index === hitTarget.index);
                 if (!isAlreadySelected) setSelections(e.shiftKey ? [...selections, hitTarget] : [hitTarget]);
                 startLiveDrag(); 
              } else { dragMode.current = 'MARQUEE'; dragStartPos.current = pt; if (!e.shiftKey) setSelections([]); }
            } else if (e.button === 2 && editShapeId) { setEditShapeId(null); setSelections([]); }
          }}
          onPointerUp={(e) => { if (dragMode.current === 'MARQUEE') performSelection([e.point.x, e.point.y], e.shiftKey); else if (dragMode.current === 'MANIPULATION') endLiveDrag(); dragMode.current = 'NONE'; setBox(null); }}
        >
          <planeGeometry args={[250000, 250000]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      {box && (
        <group position={[(box.start[0] + box.end[0])/2, (box.start[1] + box.end[1])/2, 3]}>
          <mesh><planeGeometry args={[Math.abs(box.end[0]-box.start[0]), Math.abs(box.end[1]-box.start[1])]} /><meshBasicMaterial color={box.start[0] > box.end[0] ? "#22c55e" : "#38bdf8"} transparent opacity={0.15} depthWrite={false} /></mesh>
          <Line points={[[(box.start[0] - box.end[0])/2, (box.start[1] - box.end[1])/2, 0], [(box.end[0] - box.start[0])/2, (box.start[1] - box.end[1])/2, 0], [(box.end[0] - box.start[0])/2, (box.end[1] - box.start[1])/2, 0], [(box.start[0] - box.end[0])/2, (box.end[1] - box.start[1])/2, 0], [(box.start[0] - box.end[0])/2, (box.start[1] - box.end[1])/2, 0]]} color={box.start[0] > box.end[0] ? "#22c55e" : "#38bdf8"} dashed={box.start[0] > box.end[0]} dashSize={4} gapSize={4} lineWidth={1.5} />
        </group>
      )}
    </group>
  );
};
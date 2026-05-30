import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Line } from '@react-three/drei';
import * as THREE from 'three';

import { useDrawingStore, getCornerModifiedShape, getOffsetShape } from './store/drawingStore';
import { generateCirclePoints, generateArcPoints } from './utils/geometry';
import { get2DSnap } from './utils/snapEngine';
import { getTrimData } from './utils/trimEngine';
import { TopToolbox } from './components/General/TopToolbox';
import { BottomStatusBar } from './components/General/BottomStatusBar';
import { SelectionBox } from './components/Selection/SelectionBox';
import { ShapesRenderer } from './components/ObjectOperation/ShapesRenderer';
import { DrawingPreviewLayer } from './components/Draw/DrawingPreviewLayer';

// ÇÖZÜM ZIRHI: NaN (Sayı Değil) ve Infinity (Sonsuz) değerleri engellendi!
const getSafePts = (pts, zLevel) => {
    if (!pts || !Array.isArray(pts)) return [];
    return pts
        .filter(p => p && p[0] !== undefined && p[1] !== undefined && !Number.isNaN(p[0]) && !Number.isNaN(p[1]) && isFinite(p[0]) && isFinite(p[1]))
        .map(p => [p[0], p[1], zLevel]);
};

const InteractionDriver = () => {
  const store = useDrawingStore();
  const [visualData, setVisualData] = useState({ pos: [0, 0], rawPos: [0, 0], type: 'GRID', lines: [] });
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const lastPointer = useRef({ x: -999, y: -999 });

  useEffect(() => {
    if (store.currentTool === 'DELETE' && store.selections.length > 0) {
        store.deleteSelectedShapes();
    }
  }, [store.selections, store.currentTool, store]);

  useFrame(({ pointer, camera, raycaster }) => {
    if (store.currentTool === 'SELECT') return;
    if (Math.abs(pointer.x - lastPointer.current.x) < 0.0001 && Math.abs(pointer.y - lastPointer.current.y) < 0.0001) return;
    lastPointer.current = { x: pointer.x, y: pointer.y };

    raycaster.setFromCamera(pointer, camera);
    const intersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersect);
    
    if (intersect) {
      const snap = get2DSnap(intersect.x, intersect.y, store.temporaryPoints, store.shapes, { 
        snapGrid: store.snapGrid, snapTracking: store.snapTracking, snapPolar: store.snapPolar, 
        snapVertex: store.snapVertex, snapEdge: store.snapEdge, snapCenter: store.snapCenter, basePoint: store.basePoint 
      });
      
      setVisualData({ pos: snap.point, rawPos: [intersect.x, intersect.y], type: snap.type, lines: snap.trackingLines });

      if (['ROTATE', 'SCALE'].includes(store.currentTool)) {
         const pivotReady = !store.useBasePoint || store.basePoint !== null;
         if (pivotReady && document.activeElement.tagName !== 'INPUT') {
            const cx = store.useBasePoint ? store.basePoint[0] : selectionCenter[0];
            const cy = store.useBasePoint ? store.basePoint[1] : selectionCenter[1];
            let newVal = store.modifyValue;

            if (store.currentTool === 'ROTATE') {
               const ang = Math.atan2(snap.point[1] - cy, snap.point[0] - cx) * 180 / Math.PI;
               newVal = Math.round(ang).toString();
            } else if (store.currentTool === 'SCALE') {
               const dist = Math.hypot(snap.point[0] - cx, snap.point[1] - cy);
               newVal = Math.max(0.1, (dist / 100)).toFixed(2);
            }
            if (newVal !== store.modifyValue) store.setModifyValue(newVal);
         }
      } 
      else if (['FILLET', 'CHAMFER'].includes(store.currentTool)) {
         const selVerts = store.selections.filter(s => s.type === 'VERTEX');
         if (selVerts.length === 1 && document.activeElement.tagName !== 'INPUT') {
            const shape = store.shapes.find(s => s.id === selVerts[0].id);
            if (shape && (shape.type === 'polyline' || shape.type === 'composite')) {
               const p_curr = shape.points[selVerts[0].index];
               const dist = Math.hypot(snap.point[0] - p_curr[0], snap.point[1] - p_curr[1]);
               const newVal = Math.max(0.1, dist).toFixed(1);
               if (newVal !== store.modifyValue) store.setModifyValue(newVal);
            }
         }
      }
    }
  });

  const handleCanvasClick = (e) => {
    if (['SELECT', 'DELETE'].includes(store.currentTool)) return;
    e.stopPropagation();

    if (['FILLET', 'CHAMFER'].includes(store.currentTool) && store.selections.filter(s => s.type === 'VERTEX').length === 0) {
        if (e.button !== 0) return;
        let hitVertex = null; let minDist = 20;
        store.shapes.forEach(s => {
            if (s.type === 'polyline' || s.type === 'composite') {
                s.points.forEach((p, i) => {
                    if (p && p[0] !== undefined && Math.hypot(visualData.rawPos[0]-p[0], visualData.rawPos[1]-p[1]) < minDist) {
                        minDist = Math.hypot(visualData.rawPos[0]-p[0], visualData.rawPos[1]-p[1]);
                        hitVertex = { id: s.id, type: 'VERTEX', index: i };
                    }
                });
            }
        });
        if (hitVertex) store.setSelections([hitVertex]);
        else alert(`Lütfen ${store.currentTool} uygulamak için bir köşeye (Vertex) yakın tıklayın.`);
        return;
    }
    
    const modTools = ['MOVE', 'COPY', 'ROTATE', 'SCALE', 'OFFSET', 'EXPLODE', 'GROUP', 'INTERSECT'];
    if (modTools.includes(store.currentTool) && store.selections.length === 0) {
        if (e.button !== 0) return;
        let hitId = null;
        store.shapes.forEach(s => {
            if(s.type === 'group') {
                s.children.forEach(c => {
                   const pts = (c.type === 'circle') ? [c.center] : c.points;
                   if (pts && pts.some(p => p && p[0] !== undefined && Math.hypot(visualData.rawPos[0]-p[0], visualData.rawPos[1]-p[1]) < 20)) hitId = s.id;
                });
            } else {
               const pts = (s.type === 'circle') ? [s.center] : s.points;
               if (pts && pts.some(p => p && p[0] !== undefined && Math.hypot(visualData.rawPos[0]-p[0], visualData.rawPos[1]-p[1]) < 20)) hitId = s.id;
            }
        });
        if (!hitId) { const tData = getTrimData(visualData.rawPos, store.shapes); if (tData) hitId = tData.id; }
        if (hitId) store.setSelections([{ id: hitId, type: 'SHAPE' }]);
        else alert(`Lütfen '${store.currentTool}' komutunu uygulamak için bir nesnenin üzerine tıklayın.`);
        return; 
    }

    if (['MOVE', 'COPY', 'ROTATE', 'SCALE'].includes(store.currentTool)) {
       if (e.button === 0) {
          if (store.useBasePoint && !store.basePoint) { store.addTemporaryPoint(visualData.pos); } 
          else {
              if (['MOVE', 'COPY'].includes(store.currentTool)) store.finalizeMoveCopy(visualData.pos); 
              else store.applyTransform(store.currentTool, store.modifyValue, store.useBasePoint ? store.basePoint : null);
          }
       }
    } 
    else if (store.currentTool === 'OFFSET') {
        if (e.button === 0) store.executeOffset(visualData.rawPos);
    }
    else if (['FILLET', 'CHAMFER'].includes(store.currentTool)) {
       if (e.button === 0) {
          const selVerts = store.selections.filter(s => s.type === 'VERTEX');
          if (selVerts.length === 1) { 
              store.applyTransform(store.currentTool, store.modifyValue, null); 
              store.setSelections([]);
          } 
       }
    }
    else if (store.currentTool === 'TRIM') {
       if (e.button === 0) {
          const freshTrimData = getTrimData(visualData.rawPos, store.shapes);
          if (freshTrimData) store.executeTrim(freshTrimData);
       }
    } else if (store.currentTool === 'PASTE') {
       if (e.button === 0) store.executePaste(visualData.pos);
       else if (e.button === 2) store.setCurrentTool('SELECT');
    } else {
       if (e.button === 0) store.addTemporaryPoint(visualData.pos);
       else if (e.button === 2) store.finalizeLine();
    }
  };

  const getCursorColor = (type) => {
    if (type === 'VERTEX') return '#22c55e'; if (type === 'EDGE') return '#38bdf8';
    if (type === 'CENTER') return '#ec4899'; if (type === 'TRACK') return '#d946ef';
    if (type === 'ANGLE') return '#a855f7'; return '#f59e0b';
  };

  // ÇÖZÜM 2: Mükemmel ve Tam Korumalı Merkez (Selection Center) Algılayıcı
  const selectionCenter = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    const checkPt = (p) => { 
        if (p && Array.isArray(p) && p.length >= 2 && p[0] !== undefined && p[1] !== undefined && !Number.isNaN(p[0]) && !Number.isNaN(p[1])) { 
            if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0]; 
            if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; 
        } 
    };

    store.shapes.forEach(s => {
      if (s.type === 'group') {
          s.children.forEach(c => {
             const pts = (c.type === 'polyline' || c.type === 'arc' || c.type === 'composite' || c.type === 'point') ? c.points : (c.center ? [c.center] : []);
             if (Array.isArray(pts)) pts.forEach(checkPt);
          });
      } else if (store.selections.some(sel => sel.id === s.id)) {
        const pts = (s.type === 'polyline' || s.type === 'arc' || s.type === 'composite' || s.type === 'point') ? s.points : (s.center ? [s.center] : []);
        if (Array.isArray(pts)) pts.forEach(checkPt);
      }
    });
    
    if (minX === Infinity) return [0, 0];
    return [(minX + maxX)/2, (minY + maxY)/2];
  }, [store.shapes, store.selections]);

  const activeZ = 2;

  const renderGhostShape = (shape, tool, pos, cx, cy, val) => {
     const dx = pos[0] - cx; const dy = pos[1] - cy;
     const ang = (parseFloat(val) || 0) * Math.PI / 180;
     const factor = parseFloat(val) || 1;
     const cosA = Math.cos(ang), sinA = Math.sin(ang);

     const transformPoint = (p) => {
         if (!p || p[0] === undefined) return null;
         if (tool === 'MOVE' || tool === 'COPY') return [p[0] + dx, p[1] + dy];
         if (tool === 'ROTATE') return [cx + (p[0] - cx) * cosA - (p[1] - cy) * sinA, cy + (p[0] - cx) * sinA + (p[1] - cy) * cosA];
         if (tool === 'SCALE') return [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor];
         return [p[0], p[1]];
     };

     if (shape.type === 'composite') {
         return shape.segments.map((seg, i) => {
             if (!seg.indices) return null;
             const p0 = shape.points[seg.indices[0]]; const p1 = shape.points[seg.indices[1]]; const p2 = shape.points[seg.indices[2]];
             if (!p0 || !p1 || (seg.type === 'arc' && !p2)) return null;
             
             const tp0 = transformPoint(p0); const tp1 = transformPoint(p1); const tp2 = transformPoint(p2);
             if (!tp0 || !tp1 || (seg.type === 'arc' && !tp2)) return null;

             let primPts = seg.type === 'line' ? [tp0, tp1] : generateArcPoints(tp0, tp1, tp2, 32);
             if (!primPts) return null;
             
             const safePts = getSafePts(primPts, activeZ);
             if (safePts.length < 2) return null;
             
             return <Line key={`g_${shape.id}_${i}`} points={safePts} color="#38bdf8" lineWidth={2} dashed dashSize={4} gapSize={4} depthTest={false} />
         });
     }
     
     let pts = [];
     if (shape.type === 'polyline' || shape.type === 'point') pts = shape.points.map(transformPoint).filter(p => p);
     else if (shape.type === 'circle') {
         const newCenter = transformPoint(shape.center);
         if (newCenter && newCenter[0] !== undefined) {
             const newRadius = tool === 'SCALE' ? shape.radius * factor : shape.radius;
             pts = generateCirclePoints(newCenter[0], newCenter[1], newRadius);
         }
     } else if (shape.type === 'arc') {
         const t0 = transformPoint(shape.points[0]); const t1 = transformPoint(shape.points[1]); const t2 = transformPoint(shape.points[2]);
         if (t0 && t1 && t2) pts = generateArcPoints(t0, t1, t2);
     }
     
     const safePts = getSafePts(pts, activeZ);
     if(safePts.length > 1) return <Line key={`g_${shape.id}`} points={safePts} color="#38bdf8" lineWidth={2} dashed dashSize={4} gapSize={4} depthTest={false} />
     return null;
  };

  return (
    <group>
      {!['SELECT', 'DELETE'].includes(store.currentTool) && (
        <mesh onPointerDown={handleCanvasClick}>
          <planeGeometry args={[250000, 250000]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}

      <ShapesRenderer />
      <SelectionBox />
      <DrawingPreviewLayer activeCursorPos={visualData.pos} />

      {['MOVE', 'COPY', 'ROTATE', 'SCALE'].includes(store.currentTool) && (
        <group>
          {store.useBasePoint && store.basePoint && (
             <Line points={getSafePts([[store.basePoint[0], store.basePoint[1]], [visualData.pos[0], visualData.pos[1]]], activeZ)} color="#f59e0b" dashed dashSize={4} gapSize={4} lineWidth={2} depthTest={false} />
          )}
          
          {store.shapes.map(shape => {
            const isGroupSel = shape.type === 'group' && store.selections.some(sel => sel.id === shape.children[0]?.id);
            const isShapeSel = store.selections.some(sl => sl.id === shape.id && sl.type === 'SHAPE');
            
            if (!isGroupSel && !isShapeSel && store.currentTool !== 'COPY') return null;
            if (store.currentTool === 'COPY' && !isGroupSel && !isShapeSel && store.selections.length > 0) return null;
            if (store.useBasePoint && !store.basePoint) return null;

            const cx = store.useBasePoint ? store.basePoint[0] : selectionCenter[0];
            const cy = store.useBasePoint ? store.basePoint[1] : selectionCenter[1];

            if (shape.type === 'group') {
                return shape.children.map(child => renderGhostShape(child, store.currentTool, visualData.pos, cx, cy, store.modifyValue));
            }
            return renderGhostShape(shape, store.currentTool, visualData.pos, cx, cy, store.modifyValue);
          })}
        </group>
      )}

      {store.currentTool === 'OFFSET' && store.selections.length > 0 && store.shapes.map(shape => {
          if (!store.selections.some(sel => sel.id === shape.id)) return null;
          const offsetPreview = getOffsetShape(shape, parseFloat(store.modifyValue) || 10, visualData.rawPos);
          if (!offsetPreview) return null;
          
          if (offsetPreview.type === 'composite') {
              return offsetPreview.segments.map((seg, i) => {
                  if (!seg.indices) return null;
                  const p0 = offsetPreview.points[seg.indices[0]]; const p1 = offsetPreview.points[seg.indices[1]]; const p2 = offsetPreview.points[seg.indices[2]];
                  if (!p0 || !p1 || (seg.type === 'arc' && !p2)) return null;
                  let primPts = seg.type === 'line' ? [p0, p1] : generateArcPoints(p0, p1, p2, 32);
                  if (!primPts) return null;
                  
                  const safePts = getSafePts(primPts, activeZ);
                  if (safePts.length < 2) return null;
                  return <Line key={`ghost_off_${shape.id}_${i}`} points={safePts} color="#38bdf8" lineWidth={2} dashed dashSize={4} gapSize={4} depthTest={false} />
              });
          }
          
          let pts = [];
          if (offsetPreview.type === 'polyline') pts = offsetPreview.points;
          else if (offsetPreview.type === 'circle') pts = generateCirclePoints(offsetPreview.center[0], offsetPreview.center[1], offsetPreview.radius);
          else if (offsetPreview.type === 'arc') pts = generateArcPoints(offsetPreview.points[0], offsetPreview.points[1], offsetPreview.points[2]);
          
          const safePts = getSafePts(pts, activeZ);
          if (safePts.length > 1) return <Line key={`ghost_off_${shape.id}`} points={safePts} color="#38bdf8" lineWidth={2} dashed dashSize={4} gapSize={4} depthTest={false} />;
          return null;
      })}

      {['FILLET', 'CHAMFER'].includes(store.currentTool) && store.shapes.map(shape => {
          const shapeSels = store.selections.filter(sl => sl.id === shape.id);
          const selVerts = shapeSels.filter(s => s.type === 'VERTEX');
          if (selVerts.length === 1 && (shape.type === 'polyline' || shape.type === 'composite')) {
              const modified = getCornerModifiedShape(shape, selVerts[0].index, store.currentTool, parseFloat(store.modifyValue));
              if (modified && modified.type === 'composite') {
                  return modified.segments.map((seg, i) => {
                      if (!seg.indices) return null;
                      const p0 = modified.points[seg.indices[0]]; const p1 = modified.points[seg.indices[1]]; const p2 = modified.points[seg.indices[2]];
                      if (!p0 || !p1 || (seg.type === 'arc' && !p2)) return null;
                      let primPts = seg.type === 'line' ? [p0, p1] : generateArcPoints(p0, p1, p2, 32);
                      if (!primPts) return null;
                      
                      const safePts = getSafePts(primPts, activeZ);
                      if (safePts.length < 2) return null;
                      return <Line key={`ghost_f_${modified.id}_${i}`} points={safePts} color="#38bdf8" lineWidth={2} dashed dashSize={4} gapSize={4} depthTest={false} />
                  });
              }
          }
          return null;
      })}

      {store.currentTool !== 'SELECT' && store.currentTool !== 'DELETE' && !['FILLET', 'CHAMFER', 'TRIM'].includes(store.currentTool) && (
        <mesh position={[visualData.pos[0], visualData.pos[1], activeZ + 0.5]}>
           <boxGeometry args={[visualData.type !== 'GRID' ? 10 : 6, visualData.type !== 'GRID' ? 10 : 6, 2]} />
           <meshBasicMaterial color={getCursorColor(visualData.type)} depthTest={false} />
        </mesh>
      )}
      
      {store.currentTool !== 'SELECT' && store.currentTool !== 'DELETE' && visualData.lines.map((line, i) => {
         const safePts = getSafePts([[line.start[0], line.start[1]], [line.end[0], line.end[1]]], activeZ);
         if (safePts.length < 2) return null;
         return <Line key={`track_${i}`} points={safePts} color="#d946ef" dashed dashSize={4} gapSize={4} lineWidth={2} depthTest={false} />
      })}
    </group>
  );
};

export default function DrawingModule() {
  const store = useDrawingStore();

  useEffect(() => {
    const handleKeyDown = (e) => {
      // ÇÖZÜM: Shift tuşuna basıldığında mağazadaki sündürme kalkanını aktif et
      if (e.key === 'Shift') store.setIsShiftPressed(true);

      if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement.tagName !== 'INPUT') {
          e.preventDefault();
          if (store.selections.length > 0) store.deleteSelectedShapes();
      }
      if (e.key === 'Escape') {
         e.preventDefault();
         if (store.currentTool !== 'SELECT' || store.editShapeId) { store.setCurrentTool('SELECT'); useDrawingStore.setState({ temporaryPoints: [], editShapeId: null, selections: [] }); } 
         else { store.setSelections([]); } return;
      }
    };

    const handleKeyUp = (e) => {
      // ÇÖZÜM: Shift bırakıldığında kalkanı kapat (Normal sürüklemeye dön)
      if (e.key === 'Shift') store.setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [store]);

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', overflow: 'hidden' }}>
      <TopToolbox />
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }} onContextMenu={(e) => e.preventDefault()}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Canvas orthographic camera={{ position: [0, 0, 1000], zoom: 2.5, near: -1000, far: 5000 }}>
            <ambientLight intensity={1} />
            <OrbitControls makeDefault enableRotate={false} enablePan={true} mouseButtons={{ LEFT: THREE.MOUSE.NONE, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.PAN }} enableDamping={false} />
            <Grid position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} infiniteGrid cellSize={10} sectionSize={100} fadeDistance={15000} cellColor="#1e293b" sectionColor="#334155" />
            <InteractionDriver />
          </Canvas>
        </div>
      </div>
      <BottomStatusBar />
    </div>
  );
}
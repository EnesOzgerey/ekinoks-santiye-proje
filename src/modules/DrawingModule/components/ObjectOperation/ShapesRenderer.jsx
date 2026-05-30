import React from 'react';
import { Line } from '@react-three/drei';
import { useDrawingStore } from '../../store/drawingStore';
import { generateCirclePoints, generateArcPoints } from '../../utils/geometry';

const getSafePts = (pts, zLevel) => {
    if (!pts || !Array.isArray(pts)) return [];
    return pts
        .filter(p => p && p[0] !== undefined && p[1] !== undefined && !Number.isNaN(p[0]) && !Number.isNaN(p[1]) && isFinite(p[0]) && isFinite(p[1]))
        .map(p => [p[0], p[1], zLevel]);
};

const renderShape = (shape, selections, editShapeId, activeZ) => {
    if (shape.type === 'group') {
        return (
            <group key={shape.id}>
                {shape.children.map(child => renderShape(child, selections, editShapeId, activeZ))}
            </group>
        );
    }

    const shapeSels = selections.filter(s => s.id === shape.id);
    const isShapeSel = shapeSels.some(s => s.type === 'SHAPE');
    const selVerts = shapeSels.filter(s => s.type === 'VERTEX').map(s => s.index);
    const selEdges = shapeSels.filter(s => s.type === 'EDGE').map(s => s.index); // ÇÖZÜM: Seçili kenarlar
    const isEditMode = editShapeId === shape.id;
    const baseColor = isShapeSel ? "#facc15" : "#cbd5e1";
    const baseWidth = isShapeSel ? 3.5 : 2;

    return (
        <group key={shape.id}>
             {/* COMPOSITE ŞEKİL ÇİZİMİ VE KENAR AYDINLATMASI */}
             {shape.type === 'composite' && shape.segments && shape.segments.map((seg, i) => {
                 if (!seg.indices) return null;
                 const p0 = shape.points[seg.indices[0]]; const p1 = shape.points[seg.indices[1]]; const p2 = shape.points[seg.indices[2]];
                 if (!p0 || !p1 || (seg.type === 'arc' && !p2)) return null; 
                 let primPts = seg.type === 'line' ? [p0, p1] : generateArcPoints(p0, p1, p2, 32);
                 if (!primPts || primPts.length === 0) return null;
                 
                 const safePts = getSafePts(primPts, activeZ);
                 if (safePts.length < 2) return null; 
                 
                 // ÇÖZÜM: Kenar seçiliyse sadece o segment sapsarı yanar
                 const isEdgeSel = selEdges.includes(i);
                 const segColor = (isShapeSel || isEdgeSel) ? "#facc15" : "#cbd5e1";
                 const segWidth = (isShapeSel || isEdgeSel) ? 3.5 : 2;
                 
                 return <Line key={`comp_${shape.id}_${i}`} points={safePts} color={segColor} lineWidth={segWidth} />
             })}

             {/* POLYLINE ÇİZİMİ VE ÜZERİNE KENAR FOSFORU EKLENMESİ */}
             {shape.type === 'polyline' && getSafePts(shape.points, activeZ).length > 1 && (
                 <group>
                     <Line points={getSafePts(shape.points, activeZ)} color={baseColor} lineWidth={baseWidth} />
                     {selEdges.map(eIdx => {
                         const p1 = shape.points[eIdx]; const p2 = shape.points[eIdx+1];
                         if (p1 && p2 && p1[0] !== undefined && p2[0] !== undefined) {
                             return <Line key={`edge_${eIdx}`} points={getSafePts([p1, p2], activeZ+0.1)} color="#facc15" lineWidth={3.5} />
                         }
                         return null;
                     })}
                 </group>
             )}

             {/* DAIRE VE YAY ÇİZİMİ */}
             {shape.type === 'circle' && getSafePts(generateCirclePoints(shape.center[0], shape.center[1], shape.radius), activeZ).length > 1 && (
                 <Line points={getSafePts(generateCirclePoints(shape.center[0], shape.center[1], shape.radius), activeZ)} color={isShapeSel || selEdges.includes(0) ? "#facc15" : baseColor} lineWidth={isShapeSel || selEdges.includes(0) ? 3.5 : baseWidth} />
             )}
             
             {shape.type === 'arc' && getSafePts(generateArcPoints(shape.points[0], shape.points[1], shape.points[2]), activeZ).length > 1 && (
                 <Line points={getSafePts(generateArcPoints(shape.points[0], shape.points[1], shape.points[2]), activeZ)} color={isShapeSel || selEdges.includes(0) ? "#facc15" : baseColor} lineWidth={isShapeSel || selEdges.includes(0) ? 3.5 : baseWidth} />
             )}
             
             {/* NOKTALAR (VERTEX) ÇİZİMİ */}
             {shape.type === 'point' && shape.points && shape.points[0] && shape.points[0][0] !== undefined && !Number.isNaN(shape.points[0][0]) && isFinite(shape.points[0][0]) && (
                 <mesh position={[shape.points[0][0], shape.points[0][1], activeZ+0.5]}>
                     <circleGeometry args={[isShapeSel ? 8 : 5, 16]} />
                     <meshBasicMaterial color={isShapeSel ? "#facc15" : "#ef4444"} depthTest={false} />
                 </mesh>
             )}

             {(shape.type === 'polyline' || shape.type === 'composite' || shape.type === 'arc') && shape.points.map((p, vIdx) => {
                if (!p || p[0] === undefined || Number.isNaN(p[0]) || Number.isNaN(p[1]) || !isFinite(p[0]) || !isFinite(p[1])) return null; 
                const isSelectedVert = selVerts.includes(vIdx);
                let isVisible = isEditMode || isSelectedVert;
                if (!isEditMode && !isSelectedVert) {
                   if (shape.type === 'composite' || shape.type === 'arc') isVisible = true; 
                   else if (shape.type === 'polyline' && (vIdx === 0 || vIdx === shape.points.length - 1)) isVisible = true;
                }
                if (!isVisible) return null;
                const pointColor = isSelectedVert ? "#facc15" : (isShapeSel ? "#38bdf8" : "#64748b");

                return (
                  <mesh key={`vert_${vIdx}`} position={[p[0], p[1], activeZ+0.2]}>
                     <circleGeometry args={[isSelectedVert ? 5 : 3.5, 16]} />
                     <meshBasicMaterial color={pointColor} depthTest={false} />
                  </mesh>
                )
             })}

             {shape.type === 'circle' && shape.center && shape.center[0] !== undefined && !Number.isNaN(shape.center[0]) && !Number.isNaN(shape.center[1]) && isFinite(shape.center[0]) && (
                 <mesh position={[shape.center[0], shape.center[1], activeZ + 0.2]}>
                     <circleGeometry args={selVerts.includes(0) ? [5, 16] : [2.5, 16]} />
                     <meshBasicMaterial color={selVerts.includes(0) ? "#facc15" : (isShapeSel ? "#38bdf8" : baseColor)} depthTest={false} />
                 </mesh>
             )}
        </group>
    );
};

export const ShapesRenderer = () => {
  const shapes = useDrawingStore(state => state.shapes);
  const selections = useDrawingStore(state => state.selections); 
  const editShapeId = useDrawingStore(state => state.editShapeId); 
  const activeZ = 1.5;

  return <group>{shapes.map(shape => renderShape(shape, selections, editShapeId, activeZ))}</group>;
};
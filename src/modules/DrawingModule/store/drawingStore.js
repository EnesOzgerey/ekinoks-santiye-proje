import { create } from 'zustand';
import { findIntersections } from '../utils/intersectEngine';

export const getCornerModifiedShape = (shape, vIdx, type, val) => {
    let clone = JSON.parse(JSON.stringify(shape));
    if (clone.type === 'polyline') {
        const segments = [];
        for (let i = 0; i < clone.points.length - 1; i++) { segments.push({ type: 'line', indices: [i, i+1] }); }
        clone.type = 'composite'; clone.segments = segments;
    }
    if (clone.type !== 'composite' || !clone.segments || clone.segments.length === 0) return shape;
    const p_curr = clone.points[vIdx]; if (!p_curr) return shape;
    let seg_prev_idx = clone.segments.findIndex(seg => seg.indices && Math.hypot(clone.points[seg.indices[seg.indices.length - 1]][0] - p_curr[0], clone.points[seg.indices[seg.indices.length - 1]][1] - p_curr[1]) < 0.1);
    let seg_next_idx = clone.segments.findIndex(seg => seg.indices && Math.hypot(clone.points[seg.indices[0]][0] - p_curr[0], clone.points[seg.indices[0]][1] - p_curr[1]) < 0.1);
    if (seg_prev_idx === -1 || seg_next_idx === -1) return shape;
    const seg_prev = clone.segments[seg_prev_idx]; const seg_next = clone.segments[seg_next_idx];
    const p_prev = clone.points[seg_prev.indices[0]]; const p_next = clone.points[seg_next.indices[seg_next.indices.length - 1]];
    const d1 = Math.hypot(p_prev[0] - p_curr[0], p_prev[1] - p_curr[1]); const d2 = Math.hypot(p_next[0] - p_curr[0], p_next[1] - p_curr[1]);
    const safeVal = Math.min(val, d1 / 2.01, d2 / 2.01); if (safeVal < 0.1) return shape;
    const u1 = [(p_prev[0] - p_curr[0]) / d1, (p_prev[1] - p_curr[1]) / d1]; const u2 = [(p_next[0] - p_curr[0]) / d2, (p_next[1] - p_curr[1]) / d2];
    const pA = [p_curr[0] + u1[0] * safeVal, p_curr[1] + u1[1] * safeVal]; const pB = [p_curr[0] + u2[0] * safeVal, p_curr[1] + u2[1] * safeVal];
    const pA_idx = clone.points.length; clone.points.push(pA); const pB_idx = clone.points.length; clone.points.push(pB);
    let newSeg = null;
    if (type === 'CHAMFER') { newSeg = { type: 'line', indices: [pA_idx, pB_idx] }; } 
    else if (type === 'FILLET') {
        const dot = u1[0] * u2[0] + u1[1] * u2[1]; const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
        const bx = u1[0] + u2[0]; const by = u1[1] + u2[1]; const blen = Math.hypot(bx, by);
        if (blen < 1e-6 || Math.cos(angle / 2) < 1e-6) return shape;
        const theta = angle / 2; const d_center = safeVal / Math.cos(theta);
        const cx = p_curr[0] + (bx / blen) * d_center; const cy = p_curr[1] + (by / blen) * d_center; const r = safeVal * Math.tan(theta);
        const startAng = Math.atan2(pA[1] - cy, pA[0] - cx); const endAng = Math.atan2(pB[1] - cy, pB[0] - cx);
        let diff = endAng - startAng; if (diff > Math.PI) diff -= 2 * Math.PI; if (diff < -Math.PI) diff += 2 * Math.PI;
        const pMid = [cx + r * Math.cos(startAng + diff / 2), cy + r * Math.sin(startAng + diff / 2)];
        const pMid_idx = clone.points.length; clone.points.push(pMid);
        newSeg = { type: 'arc', indices: [pA_idx, pMid_idx, pB_idx] };
    }
    seg_prev.indices[seg_prev.indices.length - 1] = pA_idx; seg_next.indices[0] = pB_idx;
    clone.segments.splice(seg_prev_idx + 1, 0, newSeg);
    let finalPts = []; let oldToNew = {};
    clone.segments.forEach(seg => {
        if (seg.indices) {
            seg.indices.forEach((idx, i) => {
                if (oldToNew[idx] === undefined) { oldToNew[idx] = finalPts.length; finalPts.push(clone.points[idx]); }
                seg.indices[i] = oldToNew[idx];
            });
        }
    });
    clone.points = finalPts; return clone;
};

export const getOffsetShape = (shape, dist, mousePt) => {
    if (!shape) return null; const clone = JSON.parse(JSON.stringify(shape)); clone.id = `shape_${Date.now()}_offset_${Math.random().toString(36).substr(2, 5)}`;
    if (shape.type === 'circle') {
        const cx = shape.center[0]; const cy = shape.center[1]; const r = shape.radius; const d_mouse = Math.hypot(mousePt[0] - cx, mousePt[1] - cy);
        const sign = d_mouse > r ? 1 : -1; clone.radius = Math.max(1, r + sign * dist); return clone;
    }
    if (shape.type === 'arc') {
        const p1 = shape.points[0]; const p2 = shape.points[1]; const p3 = shape.points[2];
        const cx_rel = p2[0] - p1[0], cy_rel = p2[1] - p1[1]; const bx_rel = p3[0] - p1[0], by_rel = p3[1] - p1[1];
        const denom = 2 * (cx_rel * by_rel - cy_rel * bx_rel); if (Math.abs(denom) < 1e-6) return shape;
        const cx = p1[0] + (by_rel * cx_rel * cx_rel + by_rel * cy_rel * cy_rel - cy_rel * bx_rel * bx_rel - cy_rel * by_rel * by_rel) / denom;
        const cy = p1[1] + (cx_rel * bx_rel * bx_rel + cx_rel * by_rel * by_rel - bx_rel * cx_rel * cx_rel - bx_rel * cy_rel * cy_rel) / denom;
        const r = Math.hypot(p1[0] - cx, p1[1] - cy); const d_mouse = Math.hypot(mousePt[0] - cx, mousePt[1] - cy);
        const sign = d_mouse > r ? 1 : -1; const new_r = Math.max(1, r + sign * dist);
        clone.points = shape.points.map(p => { const ang = Math.atan2(p[1] - cy, p[0] - cx); return [cx + Math.cos(ang) * new_r, cy + Math.sin(ang) * new_r]; });
        return clone;
    }
    if (shape.type === 'polyline' || shape.type === 'composite') {
        const points = shape.points; const offsetPts1 = []; const offsetPts2 = [];
        const isClosed = Math.hypot(points[0][0]-points[points.length-1][0], points[0][1]-points[points.length-1][1]) < 0.1;
        for (let i = 0; i < points.length; i++) {
            let p = points[i];
            if (!isClosed) {
                if (i === 0) { let dx = points[1][0] - p[0]; let dy = points[1][1] - p[1]; let len = Math.hypot(dx, dy) || 1; let nx = -dy / len; let ny = dx / len; offsetPts1.push([p[0] + nx * dist, p[1] + ny * dist]); offsetPts2.push([p[0] - nx * dist, p[1] - ny * dist]); continue; }
                if (i === points.length - 1) { let dx = p[0] - points[i-1][0]; let dy = p[1] - points[i-1][1]; let len = Math.hypot(dx, dy) || 1; let nx = -dy / len; let ny = dx / len; offsetPts1.push([p[0] + nx * dist, p[1] + ny * dist]); offsetPts2.push([p[0] - nx * dist, p[1] - ny * dist]); continue; }
            }
            let p_prev = points[i === 0 ? points.length - 2 : i - 1]; let p_next = points[i === points.length - 1 ? 1 : i + 1];
            if(!p_prev || !p_next) { offsetPts1.push([...p]); offsetPts2.push([...p]); continue; }
            let dx1 = p[0] - p_prev[0]; let dy1 = p[1] - p_prev[1]; let len1 = Math.hypot(dx1, dy1) || 1; let n1x = -dy1 / len1; let n1y = dx1 / len1;
            let dx2 = p_next[0] - p[0]; let dy2 = p_next[1] - p[1]; let len2 = Math.hypot(dx2, dy2) || 1; let n2x = -dy2 / len2; let n2y = dx2 / len2;
            let ax = (n1x + n2x) / 2; let ay = (n1y + n2y) / 2; let alen = Math.hypot(ax, ay) || 1; ax /= alen; ay /= alen;
            offsetPts1.push([p[0] + ax * dist, p[1] + ay * dist]); offsetPts2.push([p[0] - ax * dist, p[1] - ay * dist]);
        }
        let d1 = 0; let d2 = 0; offsetPts1.forEach(p => d1 += Math.hypot(mousePt[0]-p[0], mousePt[1]-p[1])); offsetPts2.forEach(p => d2 += Math.hypot(mousePt[0]-p[0], mousePt[1]-p[1]));
        clone.points = d1 < d2 ? offsetPts1 : offsetPts2; return clone;
    }
    return null;
};

const resolveGroupSelections = (shapes, selections) => {
    let resolvedSels = [...selections];
    shapes.forEach(shape => {
        if (shape.type === 'group') {
            const isGroupSelected = shape.children.some(childShape => resolvedSels.some(s => s.id === childShape.id));
            if (isGroupSelected) { shape.children.forEach(child => { if (!resolvedSels.some(s => s.id === child.id)) resolvedSels.push({ id: child.id, type: 'SHAPE' }); }); }
        }
    });
    return resolvedSels;
};

export const useDrawingStore = create((set, get) => ({
  currentTool: 'SELECT', shapes: [], temporaryPoints: [], polygonSides: 5, polygonDir: 1, selections: [], editShapeId: null, dragSnapshot: null, useBasePoint: true, basePoint: null, modifyValue: "10", filterVertex: true, filterEdge: true, history: [], future: [], clipboard: [], clipboardPivot: [0, 0], snapGrid: true, snapTracking: true, snapPolar: false, snapVertex: true, snapEdge: true, snapCenter: true,
  
  // ÇÖZÜM: Shift Tuşu Kalkanı
  isShiftPressed: false,
  setIsShiftPressed: (val) => set({ isShiftPressed: val }),

  setCurrentTool: (tool) => set({ currentTool: tool, temporaryPoints: [], basePoint: null, editShapeId: null, selections: ['MOVE', 'COPY', 'OFFSET', 'ROTATE', 'SCALE', 'EXPLODE', 'JOIN', 'PASTE', 'FILLET', 'CHAMFER', 'GROUP', 'INTERSECT', 'DELETE'].includes(tool) ? get().selections : [] }),
  setSelections: (sels) => set({ selections: sels }), setEditShapeId: (id) => set({ editShapeId: id }), setBasePoint: (pt) => set({ basePoint: pt }), setModifyValue: (val) => set({ modifyValue: val }), toggleFilterVertex: () => set((state) => ({ filterVertex: !state.filterVertex })), toggleFilterEdge: () => set((state) => ({ filterEdge: !state.filterEdge })), toggleSnapGrid: () => set((state) => ({ snapGrid: !state.snapGrid })), toggleSnapTracking: () => set((state) => ({ snapTracking: !state.snapTracking })), toggleSnapPolar: () => set((state) => ({ snapPolar: !state.snapPolar })), toggleSnapVertex: () => set((state) => ({ snapVertex: !state.snapVertex })), toggleSnapEdge: () => set((state) => ({ snapEdge: !state.snapEdge })), toggleSnapCenter: () => set((state) => ({ snapCenter: !state.snapCenter })), toggleUseBasePoint: () => set((state) => ({ useBasePoint: !state.useBasePoint, basePoint: null })),
  cyclePolygonSides: () => set((state) => { let nextSides = state.polygonSides + state.polygonDir; let nextDir = state.polygonDir; if (nextSides >= 8) { nextSides = 8; nextDir = -1; } if (nextSides <= 3) { nextSides = 3; nextDir = 1; } return { polygonSides: nextSides, polygonDir: nextDir }; }),
  undo: () => set((state) => { if (state.history.length === 0) return state; return { shapes: state.history[state.history.length - 1], history: state.history.slice(0, -1), future: [state.shapes, ...state.future], selections: [], editShapeId: null }; }),
  redo: () => set((state) => { if (state.future.length === 0) return state; return { shapes: state.future[0], history: [...state.history, state.shapes], future: state.future.slice(1), selections: [], editShapeId: null }; }),

  startLiveDrag: () => { set({ history: [...get().history, get().shapes], future: [], dragSnapshot: JSON.parse(JSON.stringify(get().shapes)) }); },
  updateLiveDrag: (dx, dy) => { 
    const { dragSnapshot, shapes, isShiftPressed } = get(); if (!dragSnapshot) return; 
    let selections = resolveGroupSelections(shapes, get().selections);

    const updated = dragSnapshot.map(shape => { 
      if (shape.type === 'group') {
          const clone = JSON.parse(JSON.stringify(shape));
          clone.children = clone.children.map(child => {
              if (selections.some(s => s.id === child.id)) {
                  if (child.points) child.points = child.points.map(p => p ? [p[0] + dx, p[1] + dy] : p);
                  if (child.type === 'circle' && child.center) child.center = [child.center[0] + dx, child.center[1] + dy];
              }
              return child;
          });
          return clone;
      }

      const shapeSels = selections.filter(sl => sl.id === shape.id); if (shapeSels.length === 0) return shape; 
      const clone = JSON.parse(JSON.stringify(shape)); 
      const isShapeSel = shapeSels.some(s => s.type === 'SHAPE'); 
      const selVerts = shapeSels.filter(s => s.type === 'VERTEX').map(s => s.index); 
      const selEdges = shapeSels.filter(s => s.type === 'EDGE').map(s => s.index); 
      
      if (isShapeSel) { 
         if (clone.points) clone.points = clone.points.map(p => p ? [p[0] + dx, p[1] + dy] : p);
         if (clone.type === 'circle' && clone.center) clone.center = [clone.center[0] + dx, clone.center[1] + dy];
      } else { 
        // ÇÖZÜM: Yalnızca Çizgi (Kenar) seçildiyse ve Shift tuşu basılıysa SİHİRLİ SÜNDÜRME devreye girer
        const isEdgeOnly = selEdges.length > 0 && selVerts.length === 0;

        if (isEdgeOnly && isShiftPressed) {
            
            // Sonsuz Kesişim Denklemi Çözücüsü
            const getLineIntersection = (p1, p2, p3, p4) => {
                const denom = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
                if (Math.abs(denom) < 1e-6) return null; // Çizgiler birbirine tam paralelse (collinear) güvenli çıkış
                const x = ((p1[0]*p2[1] - p1[1]*p2[0]) * (p3[0] - p4[0]) - (p1[0] - p2[0]) * (p3[0]*p4[1] - p3[1]*p4[0])) / denom;
                const y = ((p1[0]*p2[1] - p1[1]*p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0]*p4[1] - p3[1]*p4[0])) / denom;
                return [x, y];
            };

            const origShape = dragSnapshot.find(s => s.id === shape.id);

            if (clone.type === 'polyline') {
                const isClosed = Math.hypot(origShape.points[0][0] - origShape.points[origShape.points.length-1][0], origShape.points[0][1] - origShape.points[origShape.points.length-1][1]) < 0.1;
                
                selEdges.forEach(eIdx => {
                    const p1_orig = origShape.points[eIdx];
                    const p2_orig = origShape.points[eIdx + 1];
                    
                    let p0_orig = eIdx > 0 ? origShape.points[eIdx - 1] : null;
                    let p3_orig = eIdx + 2 < origShape.points.length ? origShape.points[eIdx + 2] : null;

                    if (isClosed) {
                        if (eIdx === 0) p0_orig = origShape.points[origShape.points.length - 2];
                        if (eIdx === origShape.points.length - 2) p3_orig = origShape.points[1];
                    }

                    const L_prime_p1 = [p1_orig[0] + dx, p1_orig[1] + dy];
                    const L_prime_p2 = [p2_orig[0] + dx, p2_orig[1] + dy];

                    let new_p1 = L_prime_p1;
                    if (p0_orig) {
                        const int1 = getLineIntersection(p0_orig, p1_orig, L_prime_p1, L_prime_p2);
                        if (int1) new_p1 = int1;
                    }

                    let new_p2 = L_prime_p2;
                    if (p3_orig) {
                        const int2 = getLineIntersection(p2_orig, p3_orig, L_prime_p1, L_prime_p2);
                        if (int2) new_p2 = int2;
                    }

                    clone.points[eIdx] = new_p1;
                    clone.points[eIdx + 1] = new_p2;

                    if (isClosed) {
                        if (eIdx === 0) clone.points[clone.points.length - 1] = new_p1;
                        if (eIdx === clone.points.length - 2) clone.points[0] = new_p2;
                    }
                });
            } 
            else if (clone.type === 'composite' && clone.segments) {
                selEdges.forEach(eIdx => {
                    const seg = origShape.segments[eIdx];
                    if (seg.type === 'line' && seg.indices) {
                        const idx1 = seg.indices[0]; const idx2 = seg.indices[1];
                        const p1_orig = origShape.points[idx1]; const p2_orig = origShape.points[idx2];
                        let p0_orig = null; let p3_orig = null;

                        origShape.segments.forEach((s, s_i) => {
                            if (s_i !== eIdx && s.indices) {
                                const pos1 = s.indices.indexOf(idx1);
                                if (pos1 !== -1) {
                                    if (pos1 > 0) p0_orig = origShape.points[s.indices[pos1 - 1]];
                                    else if (pos1 < s.indices.length - 1) p0_orig = origShape.points[s.indices[pos1 + 1]];
                                }
                                const pos2 = s.indices.indexOf(idx2);
                                if (pos2 !== -1) {
                                    if (pos2 > 0) p3_orig = origShape.points[s.indices[pos2 - 1]];
                                    else if (pos2 < s.indices.length - 1) p3_orig = origShape.points[s.indices[pos2 + 1]];
                                }
                            }
                        });

                        const L_prime_p1 = [p1_orig[0] + dx, p1_orig[1] + dy];
                        const L_prime_p2 = [p2_orig[0] + dx, p2_orig[1] + dy];

                        let new_p1 = L_prime_p1;
                        if (p0_orig) { const int1 = getLineIntersection(p0_orig, p1_orig, L_prime_p1, L_prime_p2); if (int1) new_p1 = int1; }
                        let new_p2 = L_prime_p2;
                        if (p3_orig) { const int2 = getLineIntersection(p2_orig, p3_orig, L_prime_p1, L_prime_p2); if (int2) new_p2 = int2; }

                        clone.points[idx1] = new_p1; clone.points[idx2] = new_p2;
                    } else {
                        // Eğer seçilen kenar bir YAY ise doğrusal sündürme yapılamaz; standart kaydır
                        if (seg.indices) seg.indices.forEach(idx => { if (!selVerts.includes(idx)) selVerts.push(idx); });
                    }
                });
                selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; });
            } 
            else if (clone.type === 'arc') {
                if (selEdges.includes(0)) { if (!selVerts.includes(0)) selVerts.push(0); if (!selVerts.includes(1)) selVerts.push(1); if (!selVerts.includes(2)) selVerts.push(2); }
                selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; });
            } 
            else if (clone.type === 'circle') {
                if ((selVerts.includes(0) || selEdges.includes(0)) && clone.center) clone.center = [clone.center[0] + dx, clone.center[1] + dy]; 
            }

        } else {
            // ŞİFT BASILI DEĞİLSE NORMAL SERBEST SÜRÜKLEME 
            if (clone.type === 'polyline') { 
              selEdges.forEach(eIdx => { if (!selVerts.includes(eIdx)) selVerts.push(eIdx); if (!selVerts.includes(eIdx + 1)) selVerts.push(eIdx + 1); }); 
              selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; }); 
            } 
            else if (clone.type === 'composite') {
              selEdges.forEach(eIdx => { if (clone.segments[eIdx] && clone.segments[eIdx].indices) clone.segments[eIdx].indices.forEach(idx => { if (!selVerts.includes(idx)) selVerts.push(idx); }); });
              selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; });
            } 
            else if (clone.type === 'arc') { 
              if (selEdges.includes(0)) { if (!selVerts.includes(0)) selVerts.push(0); if (!selVerts.includes(1)) selVerts.push(1); if (!selVerts.includes(2)) selVerts.push(2); }
              selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; }); 
            } 
            else if (clone.type === 'circle') { if (selVerts.includes(0) && clone.center) clone.center = [clone.center[0] + dx, clone.center[1] + dy]; }
        }
      } 
      return clone; 
    }); 
    set({ shapes: updated }); 
  },
  endLiveDrag: () => set({ dragSnapshot: null }),

  deleteSelectedShapes: () => set((state) => { let newShapes = []; let selections = resolveGroupSelections(state.shapes, state.selections); state.shapes.forEach(shape => { if (shape.type === 'group') { const isGroupSel = selections.some(s => s.id === shape.children[0]?.id); if (!isGroupSel) newShapes.push(shape); return; } const shapeSels = selections.filter(s => s.id === shape.id); if (shapeSels.length === 0) { newShapes.push(shape); return; } if (shapeSels.some(s => s.type === 'SHAPE')) return; const selVerts = shapeSels.filter(s => s.type === 'VERTEX').map(s => s.index); const selEdges = shapeSels.filter(s => s.type === 'EDGE').map(s => s.index); if (shape.type === 'polyline') { let edgesToKeep = []; for(let i=0; i<shape.points.length-1; i++) { if (!selEdges.includes(i) && !selVerts.includes(i) && !selVerts.includes(i+1)) edgesToKeep.push(i); } if (edgesToKeep.length > 0) { let currentPoly = [shape.points[edgesToKeep[0]], shape.points[edgesToKeep[0]+1]]; for(let k=1; k<edgesToKeep.length; k++) { if (edgesToKeep[k] === edgesToKeep[k-1] + 1) { currentPoly.push(shape.points[edgesToKeep[k]+1]); } else { if (currentPoly.length > 1) newShapes.push({ id: `${shape.id}_del_${k}`, type: 'polyline', points: currentPoly }); currentPoly = [shape.points[edgesToKeep[k]], shape.points[edgesToKeep[k]+1]]; } } if (currentPoly.length > 1) newShapes.push({ id: `${shape.id}_del_last`, type: 'polyline', points: currentPoly }); } } else if (shape.type === 'composite') { let segmentsToKeep = []; shape.segments.forEach((seg, i) => { if (!selEdges.includes(i)) { const hasDeletedVert = seg.indices && seg.indices.some(idx => selVerts.includes(idx)); if (!hasDeletedVert) segmentsToKeep.push(seg); } }); if (segmentsToKeep.length > 0) { let clusters = []; let visited = new Set(); const getConnected = (segIdx) => { let cluster = []; let queue = [segIdx]; visited.add(segIdx); while(queue.length > 0) { let curr = queue.shift(); cluster.push(segmentsToKeep[curr]); let currIndices = segmentsToKeep[curr].indices; segmentsToKeep.forEach((s, j) => { if(!visited.has(j)) { if(s.indices && s.indices.some(idx => currIndices.includes(idx))) { visited.add(j); queue.push(j); } } }); } return cluster; }; for(let i=0; i<segmentsToKeep.length; i++) if(!visited.has(i)) clusters.push(getConnected(i)); clusters.forEach((cluster, i) => { const clone = JSON.parse(JSON.stringify(shape)); clone.id = `${shape.id}_del_${Date.now()}_${i}`; clone.segments = cluster; newShapes.push(clone); }); } } else if (shape.type === 'arc' || shape.type === 'circle' || shape.type === 'point') { if (selVerts.length > 0) return; newShapes.push(shape); } }); const isEditShapeDeleted = state.editShapeId && !newShapes.find(s => s.id === state.editShapeId); return { history: [...state.history, state.shapes], future: [], shapes: newShapes, selections: [], editShapeId: isEditShapeDeleted ? null : state.editShapeId, currentTool: state.currentTool }; }),
  explodeSelected: () => set((state) => { const newShapes = []; const remaining = []; const selections = resolveGroupSelections(state.shapes, state.selections); state.shapes.forEach(s => { if (s.type === 'group' && selections.some(sel => sel.id === s.children[0]?.id)) { s.children.forEach(child => newShapes.push(child)); } else if (selections.some(sel => sel.id === s.id)) { if (s.type === 'composite') { s.segments.forEach((seg, i) => { if (!seg.indices) return; if (seg.type === 'line') newShapes.push({ id: `${s.id}_expl_${i}`, type: 'polyline', points: [s.points[seg.indices[0]], s.points[seg.indices[1]]] }); else if (seg.type === 'arc') newShapes.push({ id: `${s.id}_expl_${i}`, type: 'arc', points: [s.points[seg.indices[0]], s.points[seg.indices[1]], s.points[seg.indices[2]]] }); }); } else if (s.type === 'polyline') { for (let i = 0; i < s.points.length - 1; i++) newShapes.push({ id: `${s.id}_expl_${i}`, type: 'polyline', points: [s.points[i], s.points[i+1]] }); } else { remaining.push(s); } } else { remaining.push(s); } }); return { shapes: [...remaining, ...newShapes], history: [...state.history, state.shapes], future: [], selections: newShapes.map(s => ({id: s.id, type: 'SHAPE'})), editShapeId: null, currentTool: 'SELECT' }; }),
  groupSelected: () => set((state) => { const selections = resolveGroupSelections(state.shapes, state.selections); const targets = state.shapes.filter(s => selections.some(sel => sel.id === s.id) || (s.type === 'group' && s.children.some(c => selections.some(sel => sel.id === c.id)))); if (targets.length < 2) return state; let remaining = []; let flattenedChildren = []; state.shapes.forEach(s => { if (targets.some(t => t.id === s.id)) { if (s.type === 'group') flattenedChildren.push(...s.children); else flattenedChildren.push(s); } else { remaining.push(s); } }); const newGroup = { id: `group_${Date.now()}`, type: 'group', children: flattenedChildren }; remaining.push(newGroup); return { shapes: remaining, history: [...state.history, state.shapes], future: [], selections: [{id: newGroup.children[0].id, type: 'SHAPE'}], currentTool: 'SELECT' }; }),
  intersectSelected: () => set((state) => { const selections = resolveGroupSelections(state.shapes, state.selections); const targets = state.shapes.filter(s => selections.some(sel => sel.id === s.id)); if (targets.length < 2) { alert("Lütfen kesişimleri bulmak için birbirinin üzerine binen en az 2 nesne seçin."); return { currentTool: 'SELECT' }; } const hitPoints = findIntersections(targets); if (hitPoints.length === 0) { alert("Seçilen nesneler arasında fiziksel bir kesişim bulunamadı."); return { currentTool: 'SELECT' }; } const newVertexNodes = hitPoints.map((pt, i) => ({ id: `intersection_${Date.now()}_${i}`, type: 'point', points: [pt] })); const newGroup = { id: `group_${Date.now()}_welded`, type: 'group', children: [...targets, ...newVertexNodes] }; const remainingShapes = state.shapes.filter(s => !targets.some(t => t.id === s.id)); return { shapes: [...remainingShapes, newGroup], history: [...state.history, state.shapes], future: [], selections: [{id: newGroup.children[0].id, type: 'SHAPE'}], currentTool: 'SELECT' }; }),
  executeOffset: (mousePt) => set((state) => { let selections = resolveGroupSelections(state.shapes, state.selections); const targets = state.shapes.filter(s => selections.some(sel => sel.id === s.id)); if (targets.length === 0) return state; const newOffsets = []; targets.forEach(shape => { const off = getOffsetShape(shape, parseFloat(state.modifyValue) || 10, mousePt); if (off) newOffsets.push(off); }); return { shapes: [...state.shapes, ...newOffsets], history: [...state.history, state.shapes], future: [], currentTool: 'SELECT', selections: [] }; }),
  executeTrim: (trimData) => set((state) => { if (!trimData) return state; const shapes = [...state.shapes]; const targetIdx = shapes.findIndex(s => s.id === trimData.id); if (targetIdx === -1) return state; const getPointAtDist = (pts, dist) => { let l = 0; for(let i=0; i<pts.length-1; i++) { const d = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); if (dist <= l + d + 0.001) { const t = Math.max(0, Math.min(1, (dist - l) / (d || 1))); return [pts[i][0] + t*(pts[i+1][0]-pts[i][0]), pts[i][1] + t*(pts[i+1][1]-pts[i][1])]; } l += d; } return pts[pts.length-1]; }; const extractPoly = (pts, d1, d2) => { const out = [getPointAtDist(pts, d1)]; let l = 0; for(let i=0; i<pts.length-1; i++) { const d = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); l += d; if (l > d1 + 0.001 && l < d2 - 0.001) out.push(pts[i+1]); } out.push(getPointAtDist(pts, d2)); return out; }; const extractArc = (originalPoints, cutStartPt, cutEndPt) => { const p1 = originalPoints[0]; const p2 = originalPoints[1]; const p3 = originalPoints[2]; const cx_rel = p2[0] - p1[0], cy_rel = p2[1] - p1[1]; const bx_rel = p3[0] - p1[0], by_rel = p3[1] - p1[1]; const denom = 2 * (cx_rel * by_rel - cy_rel * bx_rel); if (Math.abs(denom) < 1e-6) return null; const cx = p1[0] + (by_rel * cx_rel * cx_rel + by_rel * cy_rel * cy_rel - cy_rel * bx_rel * bx_rel - cy_rel * by_rel * by_rel) / denom; const cy = p1[1] + (cx_rel * bx_rel * bx_rel + cx_rel * by_rel * by_rel - bx_rel * cx_rel * cx_rel - bx_rel * cy_rel * cy_rel) / denom; const r = Math.hypot(p1[0] - cx, p1[1] - cy); const startAng = Math.atan2(cutStartPt[1] - cy, cutStartPt[0] - cx); const endAng = Math.atan2(cutEndPt[1] - cy, cutEndPt[0] - cx); let diff = endAng - startAng; const isClockwise = (p2[0]-p1[0])*(p3[1]-p1[1]) - (p2[1]-p1[1])*(p3[0]-p1[0]) < 0; if (isClockwise) { if (diff > 0) diff -= 2 * Math.PI; } else { if (diff < 0) diff += 2 * Math.PI; } const midAng = startAng + diff / 2; return [ [cutStartPt[0], cutStartPt[1]], [cx + r * Math.cos(midAng), cy + r * Math.sin(midAng)], [cutEndPt[0], cutEndPt[1]] ]; }; let newShapes = []; if (trimData.type === 'arc') { const arcData = trimData.originalShapeData.points; const pStartArc = trimData.originalPts[0]; const pEndArc = trimData.originalPts[trimData.originalPts.length - 1]; const pStartTrim = getPointAtDist(trimData.originalPts, trimData.startD); const pEndTrim = getPointAtDist(trimData.originalPts, trimData.endD); if (trimData.startD > 0.1) { const arc1Pts = extractArc(arcData, pStartArc, pStartTrim); if (arc1Pts) newShapes.push({ id: `shape_${Date.now()}_1`, type: 'arc', points: arc1Pts }); } if (trimData.totLen - trimData.endD > 0.1) { const arc2Pts = extractArc(arcData, pEndTrim, pEndArc); if (arc2Pts) newShapes.push({ id: `shape_${Date.now()}_2`, type: 'arc', points: arc2Pts }); } } else if (trimData.isClosed) { const remain = extractPoly([...trimData.originalPts, ...trimData.originalPts.slice(1)], trimData.endD, trimData.startD + trimData.totLen); if (remain.length > 1) { newShapes.push({ id: `shape_${Date.now()}_trim`, type: 'polyline', points: remain }); } } else { const p1 = extractPoly(trimData.originalPts, 0, trimData.startD); const p2 = extractPoly(trimData.originalPts, trimData.endD, trimData.totLen); if (p1.length > 1 && trimData.startD > 0.1) newShapes.push({ id: `shape_${Date.now()}_1`, type: 'polyline', points: p1 }); if (p2.length > 1 && trimData.totLen - trimData.endD > 0.1) newShapes.push({ id: `shape_${Date.now()}_2`, type: 'polyline', points: p2 }); } shapes.splice(targetIdx, 1, ...newShapes); return { history: [...state.history, state.shapes], future: [], shapes }; }),

  finalizeMoveCopy: (targetPoint) => set((state) => { 
    const tool = state.currentTool; let cx = 0, cy = 0; let selections = resolveGroupSelections(state.shapes, state.selections); 
    if (state.useBasePoint && state.basePoint) { cx = state.basePoint[0]; cy = state.basePoint[1]; } 
    else { 
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; 
        const checkPt = (p) => { if(p && Array.isArray(p) && p[0]!==undefined && !Number.isNaN(p[0])){ if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0]; if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1]; } };
        state.shapes.forEach(s => { 
            if (s.type === 'group') { s.children.forEach(c => { if(selections.some(sel => sel.id === c.id)) { if(c.points) c.points.forEach(checkPt); if(c.center) checkPt(c.center); } }); } 
            else if (selections.some(sel => sel.id === s.id)) { if(s.points) s.points.forEach(checkPt); if(s.center) checkPt(s.center); } 
        }); 
        cx = (minX === Infinity) ? 0 : (minX + maxX)/2; cy = (minY === Infinity) ? 0 : (minY + maxY)/2; 
    } 
    const dx = targetPoint[0] - cx; const dy = targetPoint[1] - cy; let newShapes = []; 
    state.shapes.forEach(shape => { 
        if (shape.type === 'group') { 
            const isGroupSel = selections.some(s => s.id === shape.children[0]?.id); 
            if (isGroupSel) { 
                const clone = JSON.parse(JSON.stringify(shape)); if(tool==='COPY') clone.id=`group_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; 
                clone.children = clone.children.map(c => { 
                    if(c.points) c.points=c.points.map(p=> p ? [p[0]+dx, p[1]+dy] : p); 
                    if(c.center) c.center=[c.center[0]+dx, c.center[1]+dy]; 
                    if(tool==='COPY') c.id=`${c.id}_copy_${Date.now()}`; return c; 
                }); 
                newShapes.push(clone); if(tool==='COPY') newShapes.push(shape); 
            } else newShapes.push(shape); 
            return; 
        } 
        const shapeSels = selections.filter(sl => sl.id === shape.id); if (shapeSels.length === 0) { newShapes.push(shape); return; } 
        const clone = JSON.parse(JSON.stringify(shape)); if (tool === 'COPY') clone.id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; 
        const isShapeSel = shapeSels.some(s => s.type === 'SHAPE'); const selVerts = shapeSels.filter(s => s.type === 'VERTEX').map(s => s.index); const selEdges = shapeSels.filter(s => s.type === 'EDGE').map(s => s.index); 
        if (isShapeSel || tool === 'COPY') { 
            if(clone.points) clone.points=clone.points.map(p=> p ? [p[0]+dx, p[1]+dy] : p); 
            if(clone.center) clone.center=[clone.center[0]+dx, clone.center[1]+dy]; 
        } else { 
            if (clone.type === 'polyline') { 
                selEdges.forEach(eIdx => { if (!selVerts.includes(eIdx)) selVerts.push(eIdx); if (!selVerts.includes(eIdx + 1)) selVerts.push(eIdx + 1); }); 
                selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; }); 
            } else if (clone.type === 'composite') {
                selEdges.forEach(eIdx => { if (clone.segments[eIdx] && clone.segments[eIdx].indices) clone.segments[eIdx].indices.forEach(idx => { if (!selVerts.includes(idx)) selVerts.push(idx); }); });
                selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; });
            } else if (clone.type === 'arc') { 
                selVerts.forEach(vIdx => { if(clone.points[vIdx]) clone.points[vIdx] = [clone.points[vIdx][0] + dx, clone.points[vIdx][1] + dy]; }); 
            } else if (clone.type === 'circle') { if (selVerts.includes(0) && clone.center) clone.center = [clone.center[0] + dx, clone.center[1] + dy]; }
        } 
        newShapes.push(clone); if (tool === 'COPY') newShapes.push(shape); 
    }); 
    return { history: [...state.history, state.shapes], future: [], shapes: newShapes, basePoint: null, currentTool: 'SELECT' }; 
  }),

  applyTransform: (type, val, customPivot) => set((state) => { 
    let selections = resolveGroupSelections(state.shapes, state.selections); 
    const targets = state.shapes.filter(s => selections.some(sel => sel.id === s.id) || (s.type === 'group' && s.children.some(c => selections.some(sel => sel.id === c.id)))); 
    if (targets.length === 0) return state; 
    let newShapesList = [...state.shapes]; 
    if (['FILLET', 'CHAMFER'].includes(type)) { 
        const shapeSels = state.selections.filter(sel => sel.type === 'VERTEX'); 
        if (shapeSels.length === 1) { 
            const selVert = shapeSels[0]; const shapeIdx = newShapesList.findIndex(s => s.id === selVert.id); 
            if (shapeIdx > -1 && (newShapesList[shapeIdx].type === 'polyline' || newShapesList[shapeIdx].type === 'composite')) { 
                const shape = newShapesList[shapeIdx]; const unifiedModifiedShape = getCornerModifiedShape(shape, selVert.index, type, parseFloat(val)); 
                if (unifiedModifiedShape) newShapesList[shapeIdx] = unifiedModifiedShape; 
            } 
        } 
        return { shapes: newShapesList, history: [...state.history, state.shapes], future: [], basePoint: null, currentTool: 'SELECT', modifyValue: "0", selections: [] }; 
    } 
    const mappedShapes = state.shapes.map(s => { 
        let cx = 0, cy = 0; 
        if (customPivot) { cx = customPivot[0]; cy = customPivot[1]; } 
        else { 
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; 
            const checkPt = (p) => { if(p && Array.isArray(p) && p[0]!==undefined && !Number.isNaN(p[0])){ if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0]; if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1]; } };
            targets.forEach(ts => { if(ts.type==='group') { ts.children.forEach(c => { if(c.points) c.points.forEach(checkPt); if(c.center) checkPt(c.center); }); } else { if(ts.points) ts.points.forEach(checkPt); if(ts.center) checkPt(ts.center); } }); 
            cx = (minX === Infinity) ? 0 : (minX + maxX) / 2; cy = (minY === Infinity) ? 0 : (minY + maxY) / 2; 
        }
        const transformPt = (p) => {
            if (!p || p[0] === undefined) return p;
            if (type === 'ROTATE') { const ang = (parseFloat(val) || 0) * Math.PI / 180; const cosA = Math.cos(ang), sinA = Math.sin(ang); return [cx + (p[0] - cx) * cosA - (p[1] - cy) * sinA, cy + (p[0] - cx) * sinA + (p[1] - cy) * cosA]; }
            if (type === 'SCALE') { const factor = parseFloat(val) || 1; return [cx + (p[0] - cx) * factor, cy + (p[1] - cy) * factor]; }
            return p;
        };
        const transformRadius = (r) => (type === 'SCALE') ? r * (parseFloat(val) || 1) : r;
        if (s.type === 'group') { 
            const isGroupSel = selections.some(sel => sel.id === s.children[0]?.id); if (!isGroupSel) return s; 
            const clone = JSON.parse(JSON.stringify(s)); 
            clone.children = clone.children.map(c => { 
                if(c.points) c.points = c.points.map(p => transformPt(p));
                if(c.center) c.center = transformPt(c.center);
                if(c.radius) c.radius = transformRadius(c.radius);
                return c; 
            }); 
            return clone; 
        } 
        if (!selections.some(sel => sel.id === s.id)) return s; 
        const clone = JSON.parse(JSON.stringify(s)); 
        if(clone.points) clone.points = clone.points.map(p => transformPt(p));
        if(clone.center) clone.center = transformPt(clone.center);
        if(clone.radius) clone.radius = transformRadius(clone.radius);
        return clone; 
    }); 
    return { shapes: mappedShapes, history: [...state.history, state.shapes], future: [], basePoint: null, currentTool: 'SELECT', modifyValue: "0", selections: [] }; 
  }),

  copyShapes: () => { const { shapes, selections } = get(); const targets = shapes.filter(s => selections.some(sel => sel.id === s.id)); if (targets.length === 0) return; let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity; targets.forEach(s => { if(s.type==='group') { s.children.forEach(c => { const pts = (c.type === 'polyline' || c.type === 'arc' || c.type === 'composite' || c.type === 'point') ? c.points : (c.center ? [c.center] : []); pts.forEach(p => { if (p && p[0] !== undefined) { if (p[0]<minX) minX=p[0]; if(p[0]>maxX) maxX=p[0]; if(p[1]<minY) minY=p[1]; if(p[1]>maxY) maxY=p[1]; } }); }) } else { const pts = (s.type === 'polyline' || s.type === 'arc' || s.type === 'composite' || s.type === 'point') ? s.points : (s.center ? [s.center] : []); pts.forEach(p => { if (p && p[0] !== undefined) { if (p[0]<minX) minX=p[0]; if(p[0]>maxX) maxX=p[0]; if(p[1]<minY) minY=p[1]; if(p[1]>maxY) maxY=p[1]; } }); } }); set({ clipboard: JSON.parse(JSON.stringify(targets)), clipboardPivot: [(minX + maxX)/2, (minY + maxY)/2] }); },
  cutShapes: () => { const state = get(); state.copyShapes(); state.deleteSelectedShapes(); },
  pasteShapes: () => { if (get().clipboard.length > 0) set({ currentTool: 'PASTE' }); },
  executePaste: (targetPoint) => set((state) => { if (state.clipboard.length === 0) return state; const dx = targetPoint[0] - state.clipboardPivot[0]; const dy = targetPoint[1] - state.clipboardPivot[1]; const pasted = state.clipboard.map(s => { const clone = JSON.parse(JSON.stringify(s)); clone.id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; if (clone.type === 'polyline' || clone.type === 'composite' || clone.type === 'point') { clone.points = clone.points.map(p => p ? [p[0]+dx, p[1]+dy] : p); } else if (clone.type === 'circle') { if(clone.center) clone.center = [clone.center[0]+dx, clone.center[1]+dy]; } else if (clone.type === 'arc') { if(clone.points) clone.points = clone.points.map(p => p ? [p[0]+dx, p[1]+dy] : p); } return clone; }); return { history: [...state.history, state.shapes], future: [], shapes: [...state.shapes, ...pasted], currentTool: 'SELECT', selections: pasted.map(s => ({id: s.id, type: 'SHAPE'})) }; }),
  addTemporaryPoint: (point) => set((state) => { const pts = [...state.temporaryPoints, point]; const tool = state.currentTool; if (['MOVE', 'COPY', 'ROTATE', 'SCALE'].includes(tool)) { if (state.useBasePoint && !state.basePoint) return { basePoint: point }; else return state; } const bakeShape = (shapeObj) => ({ history: [...state.history, state.shapes], future: [], shapes: [...state.shapes, shapeObj], temporaryPoints: [], currentTool: tool }); if (tool === 'LINE' && pts.length === 2) return bakeShape({ id: `shape_${Date.now()}`, type: 'polyline', points: pts }); if (tool === 'POLYLINE' && pts.length > 2) { if (Math.hypot(point[0] - pts[0][0], point[1] - pts[0][1]) < 12) return bakeShape({ id: `shape_${Date.now()}`, type: 'polyline', points: [...state.temporaryPoints, state.temporaryPoints[0]] }); } if (tool === 'RECTANGLE' && pts.length === 2) return bakeShape({ id: `shape_${Date.now()}`, type: 'polyline', points: [[pts[0][0], pts[0][1]], [pts[1][0], pts[0][1]], [pts[1][0], pts[1][1]], [pts[0][0], pts[1][1]], [pts[0][0], pts[0][1]]] }); if (tool === 'POLYGON' && pts.length === 2) { const r = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]); const startAngle = Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]); const polyPts = []; for (let i = 0; i <= state.polygonSides; i++) polyPts.push([pts[0][0] + r * Math.cos(startAngle + (i / state.polygonSides) * Math.PI * 2), pts[0][1] + r * Math.sin(startAngle + (i / state.polygonSides) * Math.PI * 2)]); return bakeShape({ id: `shape_${Date.now()}`, type: 'polyline', points: polyPts }); } if (tool === 'CIRCLE_CENTER' && pts.length === 2) return bakeShape({ id: `shape_${Date.now()}`, type: 'circle', center: pts[0], radius: Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) }); if (tool === 'CIRCLE_2P' && pts.length === 2) return bakeShape({ id: `shape_${Date.now()}`, type: 'circle', center: [(pts[0][0] + pts[1][0])/2, (pts[0][1] + pts[1][1])/2], radius: Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1])/2 }); if (tool === 'CIRCLE_3P' && pts.length === 3) { const d = 2 * (pts[0][0] * (pts[1][1] - pts[2][1]) + pts[1][0] * (pts[2][1] - pts[0][1]) + pts[2][0] * (pts[0][1] - pts[1][1])); if (Math.abs(d) > 0.001) { const cx = ((pts[0][0]**2 + pts[0][1]**2) * (pts[1][1] - pts[2][1]) + (pts[1][0]**2 + pts[1][1]**2) * (pts[2][1] - pts[0][1]) + (pts[2][0]**2 + pts[2][1]**2) * (pts[0][1] - pts[1][1])) / d; const cy = ((pts[0][0]**2 + pts[0][1]**2) * (pts[2][0] - pts[1][0]) + (pts[1][0]**2 + pts[1][1]**2) * (pts[0][0] - pts[2][0]) + (pts[2][0]**2 + pts[2][1]**2) * (pts[1][0] - pts[0][0])) / d; return bakeShape({ id: `shape_${Date.now()}`, type: 'circle', center: [cx, cy], radius: Math.hypot(pts[0][0] - cx, pts[0][1] - cy) }); } } if (tool === 'ARC_3P' && pts.length === 3) return bakeShape({ id: `shape_${Date.now()}`, type: 'arc', points: pts }); return { temporaryPoints: pts }; }),
  finalizeLine: () => set((state) => { if (state.temporaryPoints.length < 2) return { temporaryPoints: [] }; return { history: [...state.history, state.shapes], future: [], shapes: [...state.shapes, { id: `shape_${Date.now()}`, type: 'polyline', points: state.temporaryPoints }], temporaryPoints: [] }; }),
  resetCanvas: () => set({ shapes: [], temporaryPoints: [], currentTool: 'SELECT', selections: [], editShapeId: null, history: [], future: [], basePoint: null, modifyValue: "0" })
}));
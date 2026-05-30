import { generateCirclePoints, generateArcPoints } from './geometry';

const getNearestPointOnSegment = (p, a, b) => {
    const atob = { x: b[0] - a[0], y: b[1] - a[1] };
    const atop = { x: p[0] - a[0], y: p[1] - a[1] };
    const len = atob.x * atob.x + atob.y * atob.y;
    let dot = atop.x * atob.x + atop.y * atob.y;
    const t = Math.min(1, Math.max(0, len > 0 ? dot / len : 0));
    return [a[0] + atob.x * t, a[1] + atob.y * t];
};

const getSegmentIntersection = (A, B, C, D) => {
    const rX = B[0] - A[0]; const rY = B[1] - A[1];
    const sX = D[0] - C[0]; const sY = D[1] - C[1];
    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 0.0001) return null;
    const t = ((C[0] - A[0]) * sY - (C[1] - A[1]) * sX) / denom;
    const u = ((C[0] - A[0]) * rY - (C[1] - A[1]) * rX) / denom;
    if (t >= -0.005 && t <= 1.005 && u >= -0.005 && u <= 1.005) {
        return [A[0] + t * rX, A[1] + t * rY];
    }
    return null;
};

const getPolyLength = (pts) => {
    let l = 0; for(let i=0; i<pts.length-1; i++) l += Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]); return l;
};

const getPointAtDist = (pts, dist) => {
    let l = 0;
    for(let i=0; i<pts.length-1; i++) {
        const d = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]);
        if (dist <= l + d + 0.001) {
            const t = Math.max(0, Math.min(1, (dist - l) / (d || 1)));
            return [pts[i][0] + t*(pts[i+1][0]-pts[i][0]), pts[i][1] + t*(pts[i+1][1]-pts[i][1])];
        }
        l += d;
    }
    return pts[pts.length-1];
};

export const extractPoly = (pts, d1, d2) => {
    const out = [getPointAtDist(pts, d1)];
    let l = 0;
    for(let i=0; i<pts.length-1; i++) {
        const d = Math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]);
        l += d;
        if (l > d1 + 0.001 && l < d2 - 0.001) out.push(pts[i+1]);
    }
    out.push(getPointAtDist(pts, d2));
    return out;
};

// ÇÖZÜM: Vektörel Çarpım (Cross Product) Kilidi İçeren Kusursuz Yay Çıkarıcı
export const extractArc = (originalPoints, cutStartPt, cutEndPt) => {
    const [p1, p2, p3] = originalPoints;
    const cx_rel = p2[0] - p1[0], cy_rel = p2[1] - p1[1];
    const bx_rel = p3[0] - p1[0], by_rel = p3[1] - p1[1];
    const denom = 2 * (cx_rel * by_rel - cy_rel * bx_rel);
    if (Math.abs(denom) < 1e-6) return null;
    
    const valC = cx_rel * cx_rel + cy_rel * cy_rel;
    const valB = bx_rel * bx_rel + by_rel * by_rel;
    
    const cx = p1[0] + (by_rel * valC - cy_rel * valB) / denom;
    const cy = p1[1] + (cx_rel * valB - bx_rel * valC) / denom;
    const r = Math.hypot(p1[0] - cx, p1[1] - cy);

    const startAng = Math.atan2(cutStartPt[1] - cy, cutStartPt[0] - cx);
    const endAng = Math.atan2(cutEndPt[1] - cy, cutEndPt[0] - cx);
    
    // Orijinal dönüş yönünü kilitliyoruz (Ters bükülme iptal edildi)
    const crossP = (p2[0]-p1[0])*(p3[1]-p2[1]) - (p2[1]-p1[1])*(p3[0]-p2[0]);
    const isCounterClockwise = crossP > 0;
    
    let diff = endAng - startAng;
    if (isCounterClockwise) {
        while (diff <= 0) diff += 2 * Math.PI;
    } else {
        while (diff >= 0) diff -= 2 * Math.PI;
    }

    const midAng = startAng + diff / 2;
    const newMidPt = [cx + r * Math.cos(midAng), cy + r * Math.sin(midAng)];

    return [ [cutStartPt[0], cutStartPt[1]], newMidPt, [cutEndPt[0], cutEndPt[1]] ];
};

export const getTrimData = (cursor, shapes) => {
    const polyShapes = shapes.map(s => {
        let pts = [];
        if (s.type === 'composite' && s.segments) {
            s.segments.forEach((seg, idx) => {
                if (!seg.indices) return;
                const p0 = s.points[seg.indices[0]]; const p1 = s.points[seg.indices[1]]; const p2 = s.points[seg.indices[2]];
                if (p0 && p1) {
                    if (seg.type === 'line') {
                        if (idx === 0) pts.push(p0);
                        pts.push(p1);
                    } else if (seg.type === 'arc' && p2) {
                        const aPts = generateArcPoints(p0, p1, p2, 64);
                        if (idx === 0) pts.push(...aPts);
                        else pts.push(...aPts.slice(1));
                    }
                }
            });
        } 
        else if (s.type === 'polyline') pts = s.points;
        else if (s.type === 'circle') pts = generateCirclePoints(s.center[0], s.center[1], s.radius, 128);
        else if (s.type === 'arc') pts = generateArcPoints(s.points[0], s.points[1], s.points[2], 128);
        
        const isClosed = s.type === 'circle' || ((s.type === 'polyline' || s.type === 'composite') && pts.length > 1 && Math.hypot(pts[0][0]-pts[pts.length-1][0], pts[0][1]-pts[pts.length-1][1]) < 0.1);
        return { id: s.id, pts, isClosed, type: s.type, original: s };
    });

    let target = null; let minD = 30; let hoverDist = 0;
    polyShapes.forEach(ps => {
        if (!ps.pts || ps.pts.length < 2) return;
        let currentDist = 0;
        for(let i=0; i<ps.pts.length-1; i++) {
            const p1 = ps.pts[i]; const p2 = ps.pts[i+1];
            const nearest = getNearestPointOnSegment(cursor, p1, p2);
            const d = Math.hypot(cursor[0]-nearest[0], cursor[1]-nearest[1]);
            if (d < minD) {
                minD = d; target = ps;
                hoverDist = currentDist + Math.hypot(nearest[0]-p1[0], nearest[1]-p1[1]);
            }
            currentDist += Math.hypot(p2[0]-p1[0], p2[1]-p1[1]);
        }
    });

    if (!target) return null;

    const totLen = getPolyLength(target.pts);
    let ints = [0, totLen];

    polyShapes.forEach(other => {
        if (other.id === target.id || !other.pts || other.pts.length < 2) return;
        let tDist = 0;
        for(let i=0; i<target.pts.length-1; i++) {
            const tp1 = target.pts[i]; const tp2 = target.pts[i+1];
            for(let j=0; j<other.pts.length-1; j++) {
                const intPt = getSegmentIntersection(tp1, tp2, other.pts[j], other.pts[j+1]);
                if (intPt) ints.push(tDist + Math.hypot(intPt[0]-tp1[0], intPt[1]-tp1[1]));
            }
            tDist += Math.hypot(tp2[0]-tp1[0], tp2[1]-tp1[1]);
        }
    });

    ints = [...new Set(ints.map(v => Math.round(v*1000)/1000))].sort((a,b)=>a-b);

    let startD = 0, endD = totLen;
    for(let i=0; i<ints.length-1; i++) {
        if (hoverDist >= ints[i] - 0.01 && hoverDist <= ints[i+1] + 0.01) { startD = ints[i]; endD = ints[i+1]; break; }
    }

    let previewPts = [];
    if (target.type === 'arc') {
        const pStart = getPointAtDist(target.pts, startD);
        const pEnd = getPointAtDist(target.pts, endD);
        previewPts = extractArc(target.original.points, pStart, pEnd) || extractPoly(target.pts, startD, endD);
    } else {
        previewPts = target.isClosed ? extractPoly([...target.pts, ...target.pts.slice(1)], startD, endD) : extractPoly(target.pts, startD, endD);
    }

    return { id: target.id, startD, endD, previewPts, totLen, isClosed: target.isClosed, type: target.type, originalPts: target.pts, originalShapeData: target.original };
};
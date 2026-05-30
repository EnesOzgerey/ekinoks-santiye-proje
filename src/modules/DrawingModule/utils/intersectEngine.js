import { generateCirclePoints, generateArcPoints } from './geometry';

// İki doğru parçasının kesişimi
export const getLineLineIntersection = (A, B, C, D) => {
    const rX = B[0] - A[0]; const rY = B[1] - A[1];
    const sX = D[0] - C[0]; const sY = D[1] - C[1];
    const denom = rX * sY - rY * sX;
    if (Math.abs(denom) < 1e-6) return null; // Paralel
    const t = ((C[0] - A[0]) * sY - (C[1] - A[1]) * sX) / denom;
    const u = ((C[0] - A[0]) * rY - (C[1] - A[1]) * rX) / denom;
    // 0 ile 1 arasındaysa kesişiyorlar demektir (tolerans payı eklendi)
    if (t >= -0.001 && t <= 1.001 && u >= -0.001 && u <= 1.001) {
        return [A[0] + t * rX, A[1] + t * rY];
    }
    return null;
};

// Tüm noktaları ve segmentleri analiz edip kesişim noktalarını çıkaran ana motor
export const findIntersections = (shapesToIntersect) => {
    let allSegments = [];
    
    // 1. Seçili tüm şekilleri temel 'segment' (çizgi) havuzuna düzleştir
    shapesToIntersect.forEach(shape => {
        let pts = [];
        if (shape.type === 'composite') {
            shape.segments.forEach(seg => {
                if (seg.type === 'line') allSegments.push({ id: shape.id, p1: shape.points[seg.indices[0]], p2: shape.points[seg.indices[1]] });
                else if (seg.type === 'arc') {
                    const aPts = generateArcPoints(shape.points[seg.indices[0]], shape.points[seg.indices[1]], shape.points[seg.indices[2]], 16);
                    for(let i=0; i<aPts.length-1; i++) allSegments.push({ id: shape.id, p1: aPts[i], p2: aPts[i+1] });
                }
            });
        } 
        else if (shape.type === 'polyline') {
            pts = shape.points;
            for(let i=0; i<pts.length-1; i++) allSegments.push({ id: shape.id, p1: pts[i], p2: pts[i+1] });
        }
        else if (shape.type === 'arc') {
            pts = generateArcPoints(shape.points[0], shape.points[1], shape.points[2], 32);
            for(let i=0; i<pts.length-1; i++) allSegments.push({ id: shape.id, p1: pts[i], p2: pts[i+1] });
        }
        else if (shape.type === 'circle') {
            pts = generateCirclePoints(shape.center[0], shape.center[1], shape.radius, 64);
            for(let i=0; i<pts.length-1; i++) allSegments.push({ id: shape.id, p1: pts[i], p2: pts[i+1] });
        }
    });

    // 2. Olası tüm kesişimleri hesapla
    let intersections = [];
    for (let i = 0; i < allSegments.length; i++) {
        for (let j = i + 1; j < allSegments.length; j++) {
            const seg1 = allSegments[i];
            const seg2 = allSegments[j];
            
            // Aynı nesnenin kendi içindeki komşu noktalarını kesişim sayma
            if (seg1.id === seg2.id) continue; 

            const hit = getLineLineIntersection(seg1.p1, seg1.p2, seg2.p1, seg2.p2);
            if (hit) {
                // Önceden bulunmuş aynı noktayı ekleme (Dublicate check)
                const exists = intersections.some(p => Math.hypot(p[0] - hit[0], p[1] - hit[1]) < 0.5);
                if (!exists) intersections.push(hit);
            }
        }
    }
    return intersections;
};
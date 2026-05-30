import { getNearestPointOnSegment, generateCirclePoints, generateArcPoints, getCircumcenter } from './geometry';

export const get2DSnap = (rawX, rawY, temporaryPoints, shapes, config) => {
  let finalX = rawX; let finalY = rawY; 
  let type = 'NONE'; 
  let trackingLines = []; 
  const snapThreshold = 15;

  // 1. Grid (Izgara)
  if (config.snapGrid) { 
    finalX = Math.round(rawX / 10) * 10; 
    finalY = Math.round(rawY / 10) * 10; 
    type = 'GRID'; 
  }
  
  const vertices = []; const edges = []; const centers = [];
  
  const processPointsArray = (pts) => { 
    for (let i = 0; i < pts.length; i++) { 
      vertices.push(pts[i]); 
      if (i < pts.length - 1) {
        edges.push([pts[i], pts[i+1]]);
        centers.push([(pts[i][0] + pts[i+1][0]) / 2, (pts[i][1] + pts[i+1][1]) / 2]);
      }
    } 
  };

  shapes.forEach(shape => {
    if (shape.type === 'polyline') {
      processPointsArray(shape.points);
      if (shape.points.length > 2) {
        let mx = 0, my = 0;
        let pts = shape.points;
        if (Math.hypot(pts[0][0] - pts[pts.length-1][0], pts[0][1] - pts[pts.length-1][1]) < 0.1) {
          pts = pts.slice(0, -1);
        }
        pts.forEach(p => { mx += p[0]; my += p[1] });
        centers.push([mx / pts.length, my / pts.length]);
      }
    }
    else if (shape.type === 'circle') { 
      centers.push(shape.center); 
      processPointsArray(generateCirclePoints(shape.center[0], shape.center[1], shape.radius)); 
    } 
    else if (shape.type === 'arc') { 
      const arcCenter = getCircumcenter(shape.points[0], shape.points[1], shape.points[2]); 
      if (arcCenter) centers.push(arcCenter); 
      processPointsArray(generateArcPoints(shape.points[0], shape.points[1], shape.points[2])); 
    }
  });
  
  if (temporaryPoints.length > 0) processPointsArray(temporaryPoints);
  
  let bestVertex = null; let bestEdge = null; let bestCenter = null;
  let minDistVertex = snapThreshold; let minDistEdge = snapThreshold; let minDistCenter = snapThreshold;

  if (config.snapVertex) { 
    for (let v of vertices) { const d = Math.hypot(rawX - v[0], rawY - v[1]); if (d < minDistVertex) { minDistVertex = d; bestVertex = v; } } 
  }
  if (config.snapCenter) { 
    for (let c of centers) { const d = Math.hypot(rawX - c[0], rawY - c[1]); if (d < minDistCenter) { minDistCenter = d; bestCenter = c; } } 
  }
  if (!bestVertex && !bestCenter && config.snapEdge) { 
    for (let edge of edges) { const nearest = getNearestPointOnSegment([rawX, rawY], edge[0], edge[1]); const d = Math.hypot(rawX - nearest[0], rawY - nearest[1]); if (d < minDistEdge) { minDistEdge = d; bestEdge = nearest; } } 
  }
  
  // ÇÖZÜM 3: Çizgi Doğrultusu ve Dik Açı İzdüşümü (Vector Tracking)
  let bestTrackDist = snapThreshold;
  if (config.snapTracking && !bestVertex && !bestCenter && !bestEdge) {
    // Verilen P noktasından nx, ny vektörü boyunca sonsuz bir ışın atar
    const checkTrack = (P, nx, ny) => {
        // Farenin bu ışına olan dik uzaklığı (Dot Product)
        const dist = Math.abs((rawX - P[0])*(-ny) + (rawY - P[1])*nx);
        if (dist < bestTrackDist) {
            bestTrackDist = dist;
            // Fareyi ışının üzerine yansıt (Projection)
            const t = (rawX - P[0])*nx + (rawY - P[1])*ny;
            finalX = P[0] + t*nx; 
            finalY = P[1] + t*ny;
            type = 'TRACK';
            trackingLines = [{ start: P, end: [finalX, finalY] }];
        }
    };

    edges.forEach(edge => {
       const p1 = edge[0]; const p2 = edge[1];
       const dx = p2[0] - p1[0]; const dy = p2[1] - p1[1];
       const len = Math.hypot(dx, dy);
       if(len === 0) return;
       
       const ux = dx/len; const uy = dy/len; // Doğrusal Yön Vektörü (Extension)
       const vx = -uy; const vy = ux;        // 90 Derece Dik Vektör (Perpendicular)
       
       checkTrack(p1, ux, uy); // Çizginin uzantısını takip et
       checkTrack(p1, vx, vy); // Çizgiye 90 derece dik olan ekseni takip et
       checkTrack(p2, vx, vy); // Çizginin diğer ucundan 90 derece dik ekseni takip et
    });
  }
  
  // OSNAP HİYERARŞİSİ (Öncelik: Merkez > Köşe > Çizgi)
  if (bestCenter) { finalX = bestCenter[0]; finalY = bestCenter[1]; type = 'CENTER'; trackingLines = []; }
  else if (bestVertex) { finalX = bestVertex[0]; finalY = bestVertex[1]; type = 'VERTEX'; trackingLines = []; }
  else if (bestEdge) { finalX = bestEdge[0]; finalY = bestEdge[1]; type = 'EDGE'; trackingLines = []; }

  // ÇÖZÜM 1: Düzeltilmiş Polar Kilidi
  const startP = temporaryPoints.length > 0 ? temporaryPoints[temporaryPoints.length - 1] : config.basePoint;
  if (config.snapPolar && startP && !bestVertex && !bestCenter && type !== 'TRACK') {
    const dx = rawX - startP[0]; const dy = rawY - startP[1];
    const currentAngle = Math.atan2(dy, dx); 
    const dist = Math.hypot(dx, dy);

    // 0, 45, 90, 135, 180, 225, 270, 315 derece açı havuzu
    const targetAngles = []; 
    for(let i=0; i<8; i++) targetAngles.push(i * Math.PI / 4); 
    
    // Ayrıca ekrandaki mevcut çizgilerin açısını da havuza ekle (Paralel / Dik çizmek için)
    edges.forEach(edge => { 
      const a = Math.atan2(edge[1][1] - edge[0][1], edge[1][0] - edge[0][0]); 
      targetAngles.push(a, a + Math.PI/2, a - Math.PI/2); 
    });

    // Açıyı her zaman [0, 2PI] aralığına zorla (Negatif Açı Bug'ı Düzeltmesi)
    const normalizeAngle = (a) => ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

    let bestAngleDiff = Infinity; let snappedAngle = currentAngle;
    targetAngles.forEach(ang => {
      let diff = Math.abs(normalizeAngle(currentAngle) - normalizeAngle(ang));
      if (diff > Math.PI) diff = 2 * Math.PI - diff; // Çemberin diğer tarafından daha yakınsa düzelt
      if (diff < bestAngleDiff) { bestAngleDiff = diff; snappedAngle = ang; }
    });

    if (bestAngleDiff < (5 * Math.PI / 180)) { // 5 derecelik kilitlenme vakumu
      if (config.snapGrid) {
        const gridDist = Math.max(10, Math.round(dist / 10) * 10);
        finalX = startP[0] + gridDist * Math.cos(snappedAngle); finalY = startP[1] + gridDist * Math.sin(snappedAngle);
      } else {
        finalX = startP[0] + dist * Math.cos(snappedAngle); finalY = startP[1] + dist * Math.sin(snappedAngle);
      }
      type = 'ANGLE'; trackingLines = [{ start: startP, end: [finalX, finalY] }];
    }
  }
  return { point: [finalX, finalY], type, trackingLines };
};
export const getNearestPointOnSegment = (p, a, b) => {
  const atob = [b[0] - a[0], b[1] - a[1]]; const atop = [p[0] - a[0], p[1] - a[1]];
  const lenSq = atob[0] * atob[0] + atob[1] * atob[1];
  if (lenSq === 0) return a;
  let t = (atop[0] * atob[0] + atop[1] * atob[1]) / lenSq;
  t = Math.max(0, Math.min(1, t)); 
  return [a[0] + t * atob[0], a[1] + t * atob[1]];
};

export const getCircumcenter = (p1, p2, p3) => {
  const d = 2 * (p1[0] * (p2[1] - p3[1]) + p2[0] * (p3[1] - p1[1]) + p3[0] * (p1[1] - p2[1]));
  if (Math.abs(d) < 0.001) return null;
  const cx = ((p1[0]**2 + p1[1]**2) * (p2[1] - p3[1]) + (p2[0]**2 + p2[1]**2) * (p3[1] - p1[1]) + (p3[0]**2 + p3[1]**2) * (p1[1] - p2[1])) / d;
  const cy = ((p1[0]**2 + p1[1]**2) * (p3[0] - p2[0]) + (p2[0]**2 + p2[1]**2) * (p1[0] - p3[0]) + (p3[0]**2 + p3[1]**2) * (p2[0] - p1[0])) / d;
  return [cx, cy];
};

export const generateCirclePoints = (cx, cy, r, segments = 64) => {
  const pts = []; 
  for (let i = 0; i <= segments; i++) pts.push([cx + r * Math.cos((i / segments) * Math.PI * 2), cy + r * Math.sin((i / segments) * Math.PI * 2)]);
  return pts;
};

export const generateArcPoints = (p1, p2, p3, segments = 32) => {
  const center = getCircumcenter(p1, p2, p3); 
  if (!center) return [p1, p2, p3];
  const [cx, cy] = center; const r = Math.hypot(p1[0]-cx, p1[1]-cy);
  let a1 = Math.atan2(p1[1]-cy, p1[0]-cx); let a2 = Math.atan2(p2[1]-cy, p2[0]-cx); let a3 = Math.atan2(p3[1]-cy, p3[0]-cx);
  let angle2 = a2 - a1; while(angle2 < 0) angle2 += Math.PI * 2;
  let angle3 = a3 - a1; while(angle3 < 0) angle3 += Math.PI * 2;
  const pts = [];
  if (angle2 < angle3) { for(let i=0; i<=segments; i++) pts.push([cx + r * Math.cos(a1 + (angle3 * (i / segments))), cy + r * Math.sin(a1 + (angle3 * (i / segments)))]); } 
  else { const sweep = Math.PI * 2 - angle3; for(let i=0; i<=segments; i++) pts.push([cx + r * Math.cos(a1 - (sweep * (i / segments))), cy + r * Math.sin(a1 - (sweep * (i / segments)))]); }
  return pts;
};
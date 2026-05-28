// Koordinatı belirlediğimiz grid aralığına (örn: 10cm) yuvarlar
export const snapToGrid = (value, gridSize = 10) => {
  return Math.round(value / gridSize) * gridSize;
};

// Fare mevcut bir noktaya çok yaklaşırsa, mıknatıs gibi o noktaya yapışır
export const snapToPoint = (currentPos, existingPoints, threshold = 20) => {
  // currentPos: [x, z], existingPoints: [[x, z], [x, z]...]
  for (let p of existingPoints) {
    const dx = currentPos[0] - p[0];
    const dz = currentPos[1] - p[1];
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Eğer fare mevcut bir noktaya 20 birimden yakınsa, o noktanın koordinatını dön
    if (distance < threshold) {
      return [...p]; 
    }
  }
  return currentPos; // Yakında nokta yoksa farenin grid'e yuvarlanmış halini dön
};
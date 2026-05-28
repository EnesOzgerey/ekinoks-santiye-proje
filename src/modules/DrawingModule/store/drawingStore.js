import { create } from 'zustand';

export const useDrawingStore = create((set, get) => ({
  // --- STATE (VERİLER) ---
  
  activeFloorId: 'floor_1', 
  pipeViewMode: '2D_LINE', // '2D_LINE' veya '3D_PIPE'
  selectedMechanicalData: null, // Çizim yaparken aktif olarak seçili malzeme
  
  floors: {
    'floor_1': {
      id: 'floor_1',
      name: 'Zemin Kat',
      elevation: 0,        
      height: 300,         
      thickness: 20,       
      boundaryPoints: [],  // Kat sınırı köşe noktaları [[x, z], [x, z]]
      isBoundaryClosed: false, 
      lines: [],           // Mekanik tesisat boruları
    }
  },

  // --- GENEL VE GÖRÜNÜM AKSİYONLARI ---

  setActiveFloor: (floorId) => set({ activeFloorId: floorId }),
  setPipeViewMode: (mode) => set({ pipeViewMode: mode }),
  setSelectedMechanicalData: (data) => set({ selectedMechanicalData: data }),

  addFloor: (newFloorId, name) => set((state) => {
    const currentFloors = Object.values(state.floors);
    const highestElevation = Math.max(...currentFloors.map(f => f.elevation + f.height));
    
    return {
      floors: {
        ...state.floors,
        [newFloorId]: {
          id: newFloorId,
          name: name,
          elevation: highestElevation,
          height: 300,
          thickness: 20,
          boundaryPoints: [],
          isBoundaryClosed: false,
          lines: [],
        }
      }
    };
  }),

  // --- KAT SINIRI (BOUNDARY) ÇİZİM AKSİYONLARI ---

  addBoundaryPoint: (floorId, point) => set((state) => {
    const floor = state.floors[floorId];
    if (floor.isBoundaryClosed) return state; 

    return {
      floors: {
        ...state.floors,
        [floorId]: {
          ...floor,
          boundaryPoints: [...floor.boundaryPoints, point]
        }
      }
    };
  }),

  closeBoundary: (floorId) => set((state) => ({
    floors: {
      ...state.floors,
      [floorId]: {
        ...state.floors[floorId],
        isBoundaryClosed: true
      }
    }
  })),

  resetBoundary: (floorId) => set((state) => ({
    floors: {
      ...state.floors,
      [floorId]: {
        ...state.floors[floorId],
        boundaryPoints: [],
        isBoundaryClosed: false
      }
    }
  })),

  // --- MEKANİK ÇİZGİ (BORU) AKSİYONLARI ---

  addLine: (floorId, startPoint, endPoint, mechanicalData) => set((state) => {
    const newLine = {
      id: `line_${Date.now()}`,
      start: startPoint, 
      end: endPoint,     
      mechanicalData: mechanicalData || { type: 'Bilinmeyen', diameter: 0, color: '#000' }
    };

    return {
      floors: {
        ...state.floors,
        [floorId]: {
          ...state.floors[floorId],
          lines: [...state.floors[floorId].lines, newLine]
        }
      }
    };
  })
}));
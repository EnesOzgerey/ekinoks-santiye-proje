import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Mevcut sayfaların (Örnek)
import Dashboard from './pages/Dashboard';
import MaterialList from './pages/MaterialList';

// Yeni oluşturduğumuz modül
import DrawingModule from './modules/DrawingModule'; 

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Navigasyon - Çizim sayfasına link veriyoruz */}
        <nav style={{ padding: '10px', background: '#333', color: 'white', display: 'flex', gap: '15px' }}>
          <Link to="/" style={{ color: 'white' }}>Ana Sayfa</Link>
          <Link to="/malzemeler" style={{ color: 'white' }}>Malzemeler</Link>
          <Link to="/cizim-modulu" style={{ color: '#a8d5e2', fontWeight: 'bold' }}>3D Tesisat Çizimi</Link>
        </nav>

        {/* Sayfa Yönlendirmeleri */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/malzemeler" element={<MaterialList />} />
          
          {/* Çizim Modülü Rotası */}
          <Route 
            path="/cizim-modulu" 
            element={
              // Çizim modülü ekranın geri kalanını tam kaplamalı
              <div style={{ height: 'calc(100vh - 40px)', width: '100%' }}>
                <DrawingModule />
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
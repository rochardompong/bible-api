import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Overview from './pages/Overview';
import ScraperControl from './pages/ScraperControl';
import DataControl from './pages/DataControl';
import Analytics from './pages/Analytics';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index element={<Overview />} />
          <Route path="scraper" element={<ScraperControl />} />
          <Route path="data" element={<DataControl />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

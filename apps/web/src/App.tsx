import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AdvisoryCenter from './pages/AdvisoryCenter';
import AuditTrail from './pages/AuditTrail';
import DistrictExplorer from './pages/DistrictExplorer';
import InstitutionalDashboard from './pages/InstitutionalDashboard';
import Overview from './pages/Overview';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="institutional" element={<InstitutionalDashboard />} />
          <Route path="advisories" element={<AdvisoryCenter />} />
          <Route path="districts" element={<DistrictExplorer />} />
          <Route path="audit" element={<AuditTrail />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

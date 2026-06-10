import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import GunDetail from './pages/GunDetail';
import DefrostTodo from './pages/DefrostTodo';
import RecoveryTodo from './pages/RecoveryTodo';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="gun/:id" element={<GunDetail />} />
          <Route path="todo" element={<DefrostTodo />} />
          <Route path="recovery" element={<RecoveryTodo />} />
        </Route>
      </Routes>
    </Router>
  );
}

import { Outlet } from 'react-router-dom';
import '../assets/lab.css';

// Raíz CSS de las vistas heredadas del Laboratorio (login, registro).
export default function LabLayout() {
  return (
    <div className="lab">
      <Outlet />
    </div>
  );
}

import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../assets/lab.css';

// Vistas heredadas del Laboratorio (login, registro).
// La navbar va FUERA de la raíz .lab para que las reglas genéricas de lab.css (button, input) no la alteren.
export default function LabLayout() {
  return (
    <>
      <Navbar />
      <div className="lab">
        <Outlet />
      </div>
    </>
  );
}

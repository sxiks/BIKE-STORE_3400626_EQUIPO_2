import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../assets/panel.css';

// Layout de las secciones privadas: /admin (administrador) y /cuenta (cliente).
// La navbar va fuera del contenedor, igual que en LabLayout.
export default function PanelLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
    </>
  );
}

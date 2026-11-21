import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Warehouse, PackagePlus, ScanBarcode,
  Tag, ClipboardList, Users, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import logo from '../assets/logo-casabrin-h.png'
import { ICONO } from './ui.jsx'
import './layout.css'

// Menú ordenado según el flujo real de un rollo en Casa Brin:
// llega (ingreso) → se etiqueta → se mueve a donde se vende → se corta → se controla y reporta.
const grupos = [
  { titulo: null, items: [{ to: '/', label: 'Panel', Icon: LayoutDashboard, end: true }] },
  {
    titulo: '1. Recepción',
    items: [
      { to: '/ingreso', label: 'Ingreso mercadería', Icon: PackagePlus },
      { to: '/etiquetas', label: 'Etiquetas', Icon: Tag },
    ],
  },
  {
    // Inventario concentra la consulta de stock y el traslado de rollos (ventana emergente).
    titulo: '2. Operación',
    items: [
      { to: '/inventario', label: 'Inventario y traslados', Icon: Warehouse },
      { to: '/escanear', label: 'Escanear / Cortar', Icon: ScanBarcode },
    ],
  },
  {
    titulo: '3. Control',
    items: [
      { to: '/reportes', label: 'Movimientos y reporte', Icon: ClipboardList },
    ],
  },
]
const grupoAdmin = { titulo: 'Administración', items: [{ to: '/usuarios', label: 'Usuarios', Icon: Users }] }

export default function Layout() {
  const { user, esAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)

  function salir() {
    logout()
    navigate('/login')
  }

  const visibles = esAdmin ? [...grupos, grupoAdmin] : grupos

  return (
    <div className="layout">
      <aside id="menu-lateral" className={`sidebar ${abierto ? 'abierto' : ''}`} aria-label="Menú principal">
        <div className="marca">
          <img src={logo} alt="Casa Brin — Telas y Telas" className="marca-logo" />
          <button className="sidebar-cerrar btn btn-ghost btn-sm btn-icon" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X {...ICONO} aria-hidden="true" />
          </button>
        </div>

        <nav className="nav">
          {visibles.map((g, gi) => (
            <div className="nav-grupo" key={g.titulo || gi} role="group" aria-label={g.titulo || 'Inicio'}>
              {g.titulo && <div className="nav-grupo-titulo" aria-hidden="true">{g.titulo}</div>}
              {g.items.map(({ to, label, Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `nav-item ${isActive ? 'activo' : ''}`}
                  onClick={() => setAbierto(false)}
                >
                  <Icon className="nav-icon" {...ICONO} aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-pie">
          <div className="usuario-box">
            <div className="usuario-avatar" aria-hidden="true">{(user?.nombreCompleto || 'U')[0]}</div>
            <div className="usuario-datos">
              <div className="usuario-nombre">{user?.nombreCompleto}</div>
              <div className="usuario-rol">{user?.rol}</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm btn-block" onClick={salir}>
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="contenido">
        <header className="topbar">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
            aria-controls="menu-lateral"
          >
            <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <img src={logo} alt="Casa Brin" className="topbar-logo" />
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>

      {abierto && <div className="overlay" onClick={() => setAbierto(false)} />}
    </div>
  )
}

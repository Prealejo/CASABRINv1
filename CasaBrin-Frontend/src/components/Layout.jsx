import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Warehouse, PackagePlus, ScanBarcode, ArrowLeftRight,
  Tag, ClipboardList, Users, LogOut, Menu, X,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import logo from '../assets/logo-casabrin-h.png'
import { ICONO } from './ui.jsx'
import './layout.css'

const items = [
  { to: '/', label: 'Panel', Icon: LayoutDashboard, end: true },
  { to: '/inventario', label: 'Inventario', Icon: Warehouse },
  { to: '/ingreso', label: 'Ingreso mercadería', Icon: PackagePlus },
  { to: '/escanear', label: 'Escanear / Cortar', Icon: ScanBarcode },
  { to: '/traslados', label: 'Traslados', Icon: ArrowLeftRight },
  { to: '/etiquetas', label: 'Etiquetas', Icon: Tag },
  { to: '/reportes', label: 'Movimientos', Icon: ClipboardList },
]

export default function Layout() {
  const { user, esAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [abierto, setAbierto] = useState(false)

  function salir() {
    logout()
    navigate('/login')
  }

  const visibles = esAdmin ? [...items, { to: '/usuarios', label: 'Usuarios', Icon: Users }] : items

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
          {visibles.map(({ to, label, Icon, end }) => (
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

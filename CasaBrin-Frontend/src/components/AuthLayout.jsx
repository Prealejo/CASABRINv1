import { Cylinder, Scissors, Warehouse } from 'lucide-react'
import logo from '../assets/logo-casabrin-h.png'
import '../pages/login.css'

/**
 * Estructura común de las pantallas de acceso (login, recuperación, cambio de clave):
 * panel visual con trama textil y logo, y panel blanco con el formulario.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="login-wrap">
      <aside className="login-arte" aria-hidden="true">
        <div className="login-trama" />
        <div className="login-arte-contenido">
          <div className="login-logo">
            <img src={logo} alt="" />
          </div>
          <p className="login-lema">Control de inventario textil por rollo y metro.</p>
          <ul className="login-features">
            <li><Cylinder size={18} strokeWidth={1.75} />Telas y rollos con código de barras</li>
            <li><Scissors size={18} strokeWidth={1.75} />Cortes con descuento exacto de metros</li>
            <li><Warehouse size={18} strokeWidth={1.75} />Stock separado en Bodega y Local</li>
          </ul>
        </div>
      </aside>

      <main className="login-form-lado">
        <div className="login-panel">
          <img className="login-logo-movil" src={logo} alt="Casa Brin — Telas y Telas" />
          {children}
        </div>
      </main>
    </div>
  )
}

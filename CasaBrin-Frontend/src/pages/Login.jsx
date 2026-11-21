import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'
import { User, Lock, LogIn, Cylinder, Scissors, Warehouse } from 'lucide-react'
import logoCasaBrin from '../assets/logo-casabrin-h.png'
import Campo from '../components/Campo.jsx'
import { Mensaje } from '../components/ui.jsx'
import './login.css'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')
    setCargando(true)
    try {
      await login(usuario.trim(), contrasena)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-arte">
        <div className="login-arte-contenido">
          <div className="login-logo">
            <img src={logoCasaBrin} alt="Casa Brin — Telas y Telas" />
          </div>
          <p>Sistema de control de inventario textil con código de barras.</p>
          <ul className="login-features">
            <li><Cylinder size={18} strokeWidth={1.75} aria-hidden="true" />Registro de telas y rollos por metros</li>
            <li><Scissors size={18} strokeWidth={1.75} aria-hidden="true" />Corte con cálculo de valor en tiempo real</li>
            <li><Warehouse size={18} strokeWidth={1.75} aria-hidden="true" />Control por bodega y local</li>
          </ul>
        </div>
      </div>

      <div className="login-form-lado">
        <form className="login-form" onSubmit={enviar}>
          <img className="login-logo-movil" src={logoCasaBrin} alt="Casa Brin — Telas y Telas" />
          <h2>Iniciar sesión</h2>
          <p className="login-form-sub">Ingresa tus credenciales para continuar.</p>

          {error && <Mensaje tipo="error">{error}</Mensaje>}

          <Campo label="Usuario" icon={User}>
            <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus placeholder="admin" autoComplete="username" />
          </Campo>
          <Campo label="Contraseña" icon={Lock}>
            <input type="password" value={contrasena} onChange={(e) => setContrasena(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </Campo>

          <button className="btn btn-primary btn-block" disabled={cargando} type="submit">
            <LogIn size={18} strokeWidth={1.75} aria-hidden="true" />
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <div className="login-hint">
            Usuario inicial: <span className="mono">admin</span> · Contraseña: <span className="mono">Admin123*</span>
          </div>
        </form>
      </div>
    </div>
  )
}

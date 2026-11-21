import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, LogIn, Loader2, KeyRound } from 'lucide-react'
import { useAuth } from '../auth/AuthContext.jsx'
import Campo from '../components/Campo.jsx'
import ContrasenaInput from '../components/ContrasenaInput.jsx'
import AuthLayout from '../components/AuthLayout.jsx'
import { Mensaje } from '../components/ui.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [errores, setErrores] = useState({})
  const [error, setError] = useState('')
  const [bloqMayus, setBloqMayus] = useState(false)
  const [cargando, setCargando] = useState(false)

  function validar() {
    const e = {}
    const u = usuario.trim()
    if (!u) e.usuario = 'Ingresa tu usuario.'
    else if (u.length < 3) e.usuario = 'El usuario tiene al menos 3 caracteres.'
    else if (/\s/.test(u)) e.usuario = 'El usuario no lleva espacios.'
    if (!contrasena) e.contrasena = 'Ingresa tu contraseña.'
    setErrores(e)
    return e
  }

  async function enviar(e) {
    e.preventDefault()
    if (cargando) return
    setError('')
    const errs = validar()
    if (Object.keys(errs).length) {
      // Lleva el foco al primer campo con error.
      document.getElementById(errs.usuario ? 'login-usuario' : 'login-clave')?.focus()
      return
    }
    setCargando(true)
    try {
      const u = await login(usuario.trim(), contrasena)
      navigate(u?.debeCambiarContrasena ? '/cambiar-contrasena' : '/', { replace: true })
    } catch (err) {
      setError(err.message)
      setContrasena('')
      document.getElementById('login-clave')?.focus()
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthLayout>
      <form className="login-form" onSubmit={enviar} noValidate aria-describedby={error ? 'login-error' : undefined}>
        <h1 className="login-titulo">Iniciar sesión</h1>
        <p className="login-form-sub">Ingresa con tu usuario de Casa Brin.</p>

        {error && <div id="login-error"><Mensaje tipo="error">{error}</Mensaje></div>}

        <Campo label="Usuario" icon={User} error={errores.usuario}>
          <input
            id="login-usuario"
            value={usuario}
            onChange={(e) => { setUsuario(e.target.value); if (errores.usuario) setErrores({ ...errores, usuario: '' }) }}
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Tu usuario"
            disabled={cargando}
          />
        </Campo>

        <Campo
          label="Contraseña"
          icon={Lock}
          error={errores.contrasena}
          ayuda={bloqMayus ? '⇪ Bloq Mayús está activado.' : undefined}
        >
          <ContrasenaInput
            id="login-clave"
            value={contrasena}
            onChange={(e) => { setContrasena(e.target.value); if (errores.contrasena) setErrores({ ...errores, contrasena: '' }) }}
            onBloqMayus={setBloqMayus}
            autoComplete="current-password"
            placeholder="Tu contraseña"
            disabled={cargando}
          />
        </Campo>

        <div className="login-olvido">
          <Link to="/recuperar"><KeyRound size={14} strokeWidth={2} aria-hidden="true" />¿Olvidaste tu contraseña?</Link>
        </div>

        <button className="btn btn-primary btn-block btn-grande" disabled={cargando} type="submit" aria-busy={cargando}>
          {cargando
            ? <><Loader2 size={18} strokeWidth={2} className="girando" aria-hidden="true" />Ingresando…</>
            : <><LogIn size={18} strokeWidth={1.75} aria-hidden="true" />Ingresar</>}
        </button>
      </form>
    </AuthLayout>
  )
}

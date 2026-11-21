import { useEffect, useState } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import {
  UserPlus, Users, User, IdCard, Mail, Shield, ShieldCheck, Lock, KeyRound, Pencil, UserX,
  CircleCheck, CircleMinus, CircleDot, Save,
} from 'lucide-react'
import Campo from '../components/Campo.jsx'
import { ICONO, ICONO_SM, Vacio, Cargando, Mensaje } from '../components/ui.jsx'
import './pages.css'

const ROLES = ['Admin', 'Operador']
const FORM_VACIO = { nombreUsuario: '', nombreCompleto: '', correo: '', rol: 'Operador', contrasena: '' }

export default function Usuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const [modo, setModo] = useState('crear')   // 'crear' | 'editar'
  const [form, setForm] = useState({ ...FORM_VACIO })
  const [editId, setEditId] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [passId, setPassId] = useState(null)
  const [pass, setPass] = useState('')

  async function cargar() {
    setCargando(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsuarios(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  function nuevo() {
    setModo('crear')
    setForm({ ...FORM_VACIO })
    setEditId(null)
    setError(''); setOk('')
  }

  function editar(u) {
    setModo('editar')
    setEditId(u.idUsuario)
    setForm({
      nombreUsuario: u.nombreUsuario,
      nombreCompleto: u.nombreCompleto,
      correo: u.correo || '',
      rol: u.rol,
      contrasena: '',
      activo: u.activo,
    })
    setError(''); setOk('')
  }

  async function guardar() {
    setError(''); setOk('')
    if (modo === 'crear') {
      if (!form.nombreUsuario.trim() || form.nombreUsuario.trim().length < 3) return setError('El usuario debe tener al menos 3 caracteres.')
      if (!form.nombreCompleto.trim()) return setError('Escribe el nombre completo.')
      if (!form.contrasena || form.contrasena.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    } else {
      if (!form.nombreCompleto.trim()) return setError('Escribe el nombre completo.')
    }
    setGuardando(true)
    try {
      if (modo === 'crear') {
        await api.post('/usuarios', {
          nombreUsuario: form.nombreUsuario.trim(),
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim() || null,
          contrasena: form.contrasena,
          rol: form.rol,
        })
        setOk('Usuario creado correctamente.')
      } else {
        await api.put(`/usuarios/${editId}`, {
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim() || null,
          rol: form.rol,
          activo: form.activo ?? true,
        })
        setOk('Usuario actualizado.')
      }
      await cargar()
      nuevo()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function desactivar(u) {
    if (u.idUsuario === user?.idUsuario) return setError('No puedes desactivar tu propio usuario.')
    if (!confirm(`¿Desactivar a ${u.nombreCompleto}? No podrá iniciar sesión.`)) return
    setError(''); setOk('')
    try {
      await api.delete(`/usuarios/${u.idUsuario}`)
      setOk('Usuario desactivado.')
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function guardarPass() {
    if (!pass || pass.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    setError(''); setOk('')
    try {
      await api.put(`/usuarios/${passId}/password`, { nuevaContrasena: pass })
      setOk('Contraseña actualizada.')
      setPassId(null); setPass('')
    } catch (e) {
      setError(e.message)
    }
  }

  const usuarioPass = usuarios.find((u) => u.idUsuario === passId)

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Usuarios</h1>
          <p>Gestiona quién puede acceder al sistema y con qué rol.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={nuevo}>
          <UserPlus {...ICONO} aria-hidden="true" />
          Nuevo usuario
        </button>
      </div>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      <div className="usuarios-grid">
        {/* -------- Lista -------- */}
        <div className="card card-flush">
          {cargando ? (
            <Cargando>Cargando usuarios…</Cargando>
          ) : usuarios.length === 0 ? (
            <Vacio icon={Users}>No hay usuarios.</Vacio>
          ) : (
            <div className="tabla-scroll">
              <table className="tabla tabla-usuarios">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.idUsuario}>
                      <td>
                        <div className="usuario-celda">
                          <span>{u.nombreCompleto}</span>
                          <small className="mono">{u.nombreUsuario}</small>
                          {u.correo && <small>{u.correo}</small>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.rol === 'Admin' ? 'badge-marca' : 'badge-neutro'}`}>
                          {u.rol === 'Admin'
                            ? <ShieldCheck {...ICONO_SM} aria-hidden="true" />
                            : <User {...ICONO_SM} aria-hidden="true" />}
                          {u.rol}
                        </span>
                      </td>
                      <td>
                        <span className={u.activo ? 'badge badge-ok' : 'badge badge-neutro'}>
                          {u.activo
                            ? <CircleCheck {...ICONO_SM} aria-hidden="true" />
                            : <CircleMinus {...ICONO_SM} aria-hidden="true" />}
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => editar(u)} aria-label={`Editar a ${u.nombreCompleto}`}>
                            <Pencil size={14} strokeWidth={2} aria-hidden="true" />Editar
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setPassId(u.idUsuario); setPass(''); setError(''); setOk('') }}
                            aria-label={`Cambiar clave de ${u.nombreCompleto}`}
                          >
                            <KeyRound size={14} strokeWidth={2} aria-hidden="true" />Clave
                          </button>
                          {u.activo && u.idUsuario !== user?.idUsuario && (
                            <button type="button" className="btn btn-danger-ghost btn-sm" onClick={() => desactivar(u)} aria-label={`Dar de baja a ${u.nombreCompleto}`}>
                              <UserX size={14} strokeWidth={2} aria-hidden="true" />Baja
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* -------- Formulario -------- */}
        <div className="card">
          <div className="seccion-titulo" style={{ marginBottom: '0.9rem' }}>
            <span className="titulo-icono">
              {modo === 'crear' ? <UserPlus {...ICONO} aria-hidden="true" /> : <Pencil {...ICONO} aria-hidden="true" />}
              {modo === 'crear' ? 'Nuevo usuario' : `Editar: ${form.nombreUsuario}`}
            </span>
          </div>

          <Campo label="Usuario" icon={User} requerido>
            <input
              value={form.nombreUsuario}
              onChange={(e) => setForm({ ...form, nombreUsuario: e.target.value })}
              disabled={modo === 'editar'}
              placeholder="Ej. jperez"
              autoComplete="off"
            />
          </Campo>
          <Campo label="Nombre completo" icon={IdCard} requerido>
            <input value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} placeholder="Ej. Juan Pérez" />
          </Campo>
          <Campo label="Correo" icon={Mail}>
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="opcional" autoComplete="off" />
          </Campo>
          <Campo label="Rol" icon={Shield} requerido>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Campo>
          {modo === 'crear' && (
            <Campo label="Contraseña" icon={Lock} requerido ayuda="Mínimo 6 caracteres.">
              <input type="password" value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} placeholder="••••••" autoComplete="new-password" />
            </Campo>
          )}
          {modo === 'editar' && (
            <Campo label="Estado" icon={CircleDot}>
              <select value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </Campo>
          )}

          <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={guardar} disabled={guardando}>
              <Save size={16} strokeWidth={1.75} aria-hidden="true" />
              {guardando ? 'Guardando…' : (modo === 'crear' ? 'Crear usuario' : 'Guardar cambios')}
            </button>
            {modo === 'editar' && <button type="button" className="btn btn-ghost" onClick={nuevo}>Cancelar</button>}
          </div>
        </div>
      </div>

      {/* -------- Mini panel cambiar contraseña -------- */}
      {passId && (
        <div className="card" style={{ marginTop: '1.25rem', maxWidth: 440 }}>
          <div className="seccion-titulo" style={{ marginBottom: '0.9rem' }}>
            <span className="titulo-icono">
              <KeyRound {...ICONO} aria-hidden="true" />
              Cambiar contraseña{usuarioPass ? `: ${usuarioPass.nombreUsuario}` : ''}
            </span>
          </div>
          <Campo label="Nueva contraseña" icon={Lock} ayuda="Mínimo 6 caracteres.">
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••" autoComplete="new-password" autoFocus />
          </Campo>
          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button type="button" className="btn btn-primary" onClick={guardarPass}>
              <Save size={16} strokeWidth={1.75} aria-hidden="true" />Actualizar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setPassId(null); setPass('') }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

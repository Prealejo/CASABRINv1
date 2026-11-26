import { useEffect, useState } from 'react'
import { UserPlus, Users, Pencil, LockKeyhole, KeyRound, UserX, UserCheck, Save, TriangleAlert } from 'lucide-react'
import { api } from '../api/client.js'
import { useAuth } from '../auth/AuthContext.jsx'
import Campo from '../components/Campo.jsx'
import ContrasenaInput from '../components/ContrasenaInput.jsx'
import FuerzaContrasena from '../components/FuerzaContrasena.jsx'
import Modal from '../components/Modal.jsx'
import MenuAcciones from '../components/MenuAcciones.jsx'
import CodigoRecuperacionCard from '../components/CodigoRecuperacionCard.jsx'
import { errorContrasena } from '../lib/contrasena.js'
import { Encabezado, Vacio, Mensaje } from '../components/ui.jsx'
import './pages.css'

const ROLES = ['Admin', 'Operador']
const FORM_VACIO = { nombreUsuario: '', nombreCompleto: '', correo: '', rol: 'Operador', contrasena: '' }

export default function Usuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  // Panel lateral de alta / edición
  const [panel, setPanel] = useState(false)
  const [modo, setModo] = useState('crear')   // 'crear' | 'editar'
  const [form, setForm] = useState({ ...FORM_VACIO })
  const [editId, setEditId] = useState(null)
  const [errForm, setErrForm] = useState('')
  const [guardando, setGuardando] = useState(false)

  const [passId, setPassId] = useState(null)
  const [pass, setPass] = useState('')
  const [errPass, setErrPass] = useState('')

  // Código de recuperación recién generado (se muestra una sola vez).
  const [codigo, setCodigo] = useState(null)        // { usuario, codigo, nuevo }

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
    setErrForm(''); setError(''); setOk('')
    setPanel(true)
  }

  function editar(u) {
    setModo('editar')
    setEditId(u.idUsuario)
    setForm({ nombreUsuario: u.nombreUsuario, nombreCompleto: u.nombreCompleto, correo: u.correo || '', rol: u.rol, contrasena: '', activo: u.activo })
    setErrForm(''); setError(''); setOk('')
    setPanel(true)
  }

  function cerrarPanel() {
    if (guardando) return
    setPanel(false)
  }

  async function guardar(e) {
    e?.preventDefault()
    setErrForm('')
    if (modo === 'crear') {
      if (!form.nombreUsuario.trim() || form.nombreUsuario.trim().length < 3) return setErrForm('El usuario debe tener al menos 3 caracteres.')
      if (!form.nombreCompleto.trim()) return setErrForm('Escribe el nombre completo.')
      if (/\s/.test(form.nombreUsuario.trim())) return setErrForm('El usuario no puede llevar espacios.')
      const ec = errorContrasena(form.contrasena, form.nombreUsuario)
      if (ec) return setErrForm(ec)
    } else if (!form.nombreCompleto.trim()) {
      return setErrForm('Escribe el nombre completo.')
    }
    setGuardando(true)
    try {
      if (modo === 'crear') {
        const { data: creado } = await api.post('/usuarios', {
          nombreUsuario: form.nombreUsuario.trim(),
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim() || null,
          contrasena: form.contrasena,
          rol: form.rol,
        })
        setOk('Usuario creado correctamente.')
        // Todo usuario nuevo recibe su código de recuperación para entregárselo impreso.
        try {
          const { data } = await api.post(`/usuarios/${creado.idUsuario}/codigo-recuperacion`)
          setCodigo({ usuario: creado.nombreUsuario, codigo: data.codigo, nuevo: true })
        } catch { /* se puede generar después desde el menú de acciones */ }
      } else {
        await api.put(`/usuarios/${editId}`, {
          nombreCompleto: form.nombreCompleto.trim(),
          correo: form.correo.trim() || null,
          rol: form.rol,
          activo: form.activo ?? true,
        })
        setOk('Usuario actualizado.')
      }
      setPanel(false)
      await cargar()
    } catch (err) {
      setErrForm(err.message)
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

  // Reactivar usa la misma edición existente (PUT con activo = true).
  async function activar(u) {
    if (!confirm(`¿Activar de nuevo a ${u.nombreCompleto}? Podrá volver a iniciar sesión.`)) return
    setError(''); setOk('')
    try {
      await api.put(`/usuarios/${u.idUsuario}`, { nombreCompleto: u.nombreCompleto, correo: u.correo || null, rol: u.rol, activo: true })
      setOk('Usuario activado.')
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  async function guardarPass() {
    const u = usuarios.find((x) => x.idUsuario === passId)
    const ec = errorContrasena(pass, u?.nombreUsuario)
    if (ec) { setErrPass(ec); return }
    setErrPass(''); setError(''); setOk('')
    try {
      await api.put(`/usuarios/${passId}/password`, { nuevaContrasena: pass })
      setOk(`Contraseña temporal asignada a ${u?.nombreUsuario}. Al ingresar, el sistema le pedirá crear una nueva.`)
      setPassId(null); setPass('')
      await cargar()
    } catch (e) {
      setErrPass(e.message)
    }
  }

  async function generarCodigo(u) {
    const reemplaza = u.tieneCodigoRecuperacion ? `\n\nEl código anterior de ${u.nombreUsuario} dejará de funcionar.` : ''
    if (!confirm(`¿Generar un código de recuperación para ${u.nombreCompleto}?${reemplaza}`)) return
    setError(''); setOk('')
    try {
      const { data } = await api.post(`/usuarios/${u.idUsuario}/codigo-recuperacion`)
      setCodigo({ usuario: u.nombreUsuario, codigo: data.codigo, nuevo: false })
      await cargar()
    } catch (e) {
      setError(e.message)
    }
  }

  const yo = usuarios.find((u) => u.idUsuario === user?.idUsuario)
  const usuarioPass = usuarios.find((u) => u.idUsuario === passId)

  return (
    <div>
      <Encabezado titulo="Usuarios" subtitulo="Administración de accesos y permisos">
        <button type="button" className="btn btn-primary" onClick={nuevo}>
          <UserPlus size={17} strokeWidth={1.9} aria-hidden="true" />Nuevo usuario
        </button>
      </Encabezado>

      {error && <Mensaje tipo="error">{error}</Mensaje>}
      {ok && <Mensaje tipo="ok">{ok}</Mensaje>}

      {yo && !yo.tieneCodigoRecuperacion && (
        <div className="aviso-seguridad">
          <TriangleAlert size={18} strokeWidth={1.9} aria-hidden="true" />
          <div>
            <strong>Aún no tienes código de recuperación.</strong>
            <p>Sin correo, es la única forma de recuperar tu cuenta de administrador si olvidas la contraseña.</p>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => generarCodigo(yo)}>Generar mi código</button>
        </div>
      )}

      <div className="panel">
        {cargando ? (
          <div className="filas-esqueleto" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="esq esq-linea" />)}</div>
        ) : usuarios.length === 0 ? (
          <Vacio icon={Users} titulo="Sin usuarios">No hay usuarios registrados.</Vacio>
        ) : (
          <div className="tabla-scroll">
            <table className="tabla tabla-usuarios-v2">
              <thead>
                <tr>
                  <th>Nombre completo</th>
                  <th>Usuario</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Código de acceso</th>
                  <th className="num">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const soyYo = u.idUsuario === user?.idUsuario
                  return (
                    <tr key={u.idUsuario}>
                      <td>
                        <span className="nombre-usuario">{u.nombreCompleto}</span>
                        {soyYo && <span className="tenue"> (tú)</span>}
                        {u.debeCambiarContrasena && <span className="badge badge-info badge-inline">Clave temporal</span>}
                      </td>
                      <td className="codigo">{u.nombreUsuario}</td>
                      <td className={u.correo ? '' : 'tenue'}>{u.correo || '—'}</td>
                      <td><span className={`badge ${u.rol === 'Admin' ? 'badge-marca' : 'badge-neutro'}`}>{u.rol === 'Admin' ? 'Administrador' : 'Operador'}</span></td>
                      <td><span className={`badge ${u.activo ? 'badge-ok' : 'badge-neutro'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        {u.tieneCodigoRecuperacion
                          ? <span className="tenue">Asignado</span>
                          : <span className="badge badge-alerta">Sin código</span>}
                      </td>
                      <td>
                        <div className="acciones-tabla">
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => editar(u)} aria-label={`Editar a ${u.nombreCompleto}`}>
                            <Pencil size={14} strokeWidth={2} aria-hidden="true" />Editar
                          </button>
                          <MenuAcciones
                            etiqueta={`Más acciones de ${u.nombreCompleto}`}
                            items={[
                              { texto: 'Cambiar contraseña', icono: LockKeyhole, onClick: () => { setPassId(u.idUsuario); setPass(''); setErrPass(''); setError(''); setOk('') } },
                              { texto: u.tieneCodigoRecuperacion ? 'Regenerar código de acceso' : 'Generar código de acceso', icono: KeyRound, onClick: () => generarCodigo(u) },
                              !soyYo && u.activo && { texto: 'Dar de baja', icono: UserX, peligro: true, onClick: () => desactivar(u) },
                              !soyYo && !u.activo && { texto: 'Activar', icono: UserCheck, onClick: () => activar(u) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------- Panel lateral: alta / edición -------- */}
      <Modal
        abierto={panel}
        lateral
        titulo={modo === 'crear' ? 'Nuevo usuario' : `Editar usuario · ${form.nombreUsuario}`}
        onCerrar={cerrarPanel}
        pie={(
          <>
            <button type="button" className="btn btn-secondary" onClick={cerrarPanel} disabled={guardando}>Cancelar</button>
            <button type="submit" form="form-usuario" className="btn btn-primary" disabled={guardando}>
              <Save size={16} strokeWidth={1.9} aria-hidden="true" />
              {guardando ? 'Guardando…' : (modo === 'crear' ? 'Crear usuario' : 'Guardar cambios')}
            </button>
          </>
        )}
      >
        <form id="form-usuario" onSubmit={guardar} noValidate>
          {errForm && <Mensaje tipo="error">{errForm}</Mensaje>}
          <Campo label="Usuario" requerido ayuda={modo === 'editar' ? 'El nombre de usuario no se puede cambiar.' : undefined}>
            <input value={form.nombreUsuario} onChange={(e) => setForm({ ...form, nombreUsuario: e.target.value })} disabled={modo === 'editar'} placeholder="Ej. jperez" autoComplete="off" />
          </Campo>
          <Campo label="Nombre completo" requerido>
            <input value={form.nombreCompleto} onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })} placeholder="Ej. Juan Pérez" />
          </Campo>
          <Campo label="Correo">
            <input type="email" value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} placeholder="Opcional" autoComplete="off" />
          </Campo>
          <Campo label="Rol" requerido>
            <select value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r === 'Admin' ? 'Administrador' : 'Operador'}</option>)}
            </select>
          </Campo>
          {modo === 'crear' ? (
            <>
              <Campo label="Contraseña" requerido>
                <ContrasenaInput value={form.contrasena} onChange={(e) => setForm({ ...form, contrasena: e.target.value })} autoComplete="new-password" />
              </Campo>
              <FuerzaContrasena clave={form.contrasena} usuario={form.nombreUsuario} />
            </>
          ) : (
            <Campo label="Estado">
              <select value={form.activo ? '1' : '0'} onChange={(e) => setForm({ ...form, activo: e.target.value === '1' })} disabled={editId === user?.idUsuario}>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </Campo>
          )}
        </form>
      </Modal>

      {/* -------- Contraseña temporal -------- */}
      <Modal
        abierto={!!passId}
        titulo={`Cambiar contraseña${usuarioPass ? ` · ${usuarioPass.nombreUsuario}` : ''}`}
        onCerrar={() => { setPassId(null); setPass('') }}
        ancho={460}
        pie={(
          <>
            <button type="button" className="btn btn-secondary" onClick={() => { setPassId(null); setPass('') }}>Cancelar</button>
            <button type="submit" form="form-clave" className="btn btn-primary">Asignar contraseña</button>
          </>
        )}
      >
        <form id="form-clave" onSubmit={(e) => { e.preventDefault(); guardarPass() }} noValidate>
          <p className="texto-ayuda">Se asigna como contraseña temporal: al ingresar, el usuario deberá crear una propia.</p>
          <Campo label="Contraseña temporal" requerido error={errPass}>
            <ContrasenaInput value={pass} onChange={(e) => { setPass(e.target.value); setErrPass('') }} autoComplete="new-password" />
          </Campo>
          <FuerzaContrasena clave={pass} usuario={usuarioPass?.nombreUsuario} />
        </form>
      </Modal>

      {/* -------- Código de acceso generado -------- */}
      <Modal
        abierto={!!codigo}
        titulo="Código de acceso"
        onCerrar={() => setCodigo(null)}
        ancho={460}
        pie={<button type="button" className="btn btn-primary" onClick={() => setCodigo(null)}>Listo, ya lo guardé</button>}
      >
        {codigo && (
          <>
            <p className="texto-ayuda">
              {codigo.nuevo ? 'Usuario creado. ' : ''}Entrega este código a <strong>{codigo.usuario}</strong>. Con él podrá crear una nueva contraseña desde «¿Olvidaste tu contraseña?».
            </p>
            <CodigoRecuperacionCard codigo={codigo.codigo} usuario={codigo.usuario} />
          </>
        )}
      </Modal>
    </div>
  )
}

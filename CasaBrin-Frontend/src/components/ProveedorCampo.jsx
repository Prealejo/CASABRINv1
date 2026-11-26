import { useRef, useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { api } from '../api/client.js'
import Campo from './Campo.jsx'

/**
 * Selector de proveedor con alta rápida en línea:
 * "Nuevo" muestra un campo; al guardar, el proveedor se crea y queda seleccionado.
 */
export default function ProveedorCampo({ proveedores, value, onChange, onCreado, style }) {
  const [creando, setCreando] = useState(false)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  function abrir() {
    setCreando(true)
    setError('')
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  function cerrar() {
    setCreando(false)
    setNombre('')
    setError('')
  }

  async function guardar() {
    const n = nombre.trim()
    if (!n) { setError('Escribe el nombre del proveedor.'); return }
    const existe = proveedores.find((p) => p.nombre.toLowerCase() === n.toLowerCase())
    if (existe) { onChange(String(existe.idProveedor)); cerrar(); return }
    setGuardando(true)
    setError('')
    try {
      const { data } = await api.post('/catalogos/proveedores', { nombre: n })
      onCreado?.(data)
      onChange(String(data.idProveedor))
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (creando) {
    return (
      <div style={style}>
        <Campo label="Nuevo proveedor" error={error} style={{ marginBottom: '0.4rem' }}>
          <input
            ref={inputRef}
            value={nombre}
            onChange={(e) => { setNombre(e.target.value); setError('') }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); guardar() }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar() }
            }}
            placeholder="Nombre del proveedor"
            autoComplete="off"
          />
        </Campo>
        <div className="acciones-inline">
          <button type="button" className="btn btn-primary btn-sm" onClick={guardar} disabled={guardando}>
            <Check size={14} strokeWidth={2} aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar proveedor'}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={cerrar}>
            <X size={14} strokeWidth={2} aria-hidden="true" />Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="campo-con-accion" style={style}>
      <Campo label="Proveedor">
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— Sin proveedor —</option>
          {proveedores.map((p) => <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>)}
        </select>
      </Campo>
      <button type="button" className="btn btn-secondary" onClick={abrir} aria-label="Agregar un proveedor nuevo">
        <Plus size={16} strokeWidth={1.75} aria-hidden="true" />Nuevo
      </button>
    </div>
  )
}

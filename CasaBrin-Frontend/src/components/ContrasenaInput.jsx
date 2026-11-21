import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/**
 * Campo de contraseña con botón para mostrar u ocultar y aviso de Bloq Mayús.
 * Se usa dentro de <Campo>, que le pasa id y atributos aria al input.
 */
export default function ContrasenaInput({ onBloqMayus, className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  function revisarMayus(e) {
    if (typeof e.getModifierState === 'function') onBloqMayus?.(e.getModifierState('CapsLock'))
  }

  return (
    <>
      <input
        {...props}
        className={`input-clave ${className}`}
        type={visible ? 'text' : 'password'}
        onKeyUp={(e) => { revisarMayus(e); props.onKeyUp?.(e) }}
        onKeyDown={(e) => { revisarMayus(e); props.onKeyDown?.(e) }}
        onBlur={(e) => { onBloqMayus?.(false); props.onBlur?.(e) }}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      <button
        type="button"
        className="ver-clave"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {visible
          ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" />
          : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
      </button>
    </>
  )
}

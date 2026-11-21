import { Children, cloneElement, isValidElement, useId } from 'react'
import { CircleAlert } from 'lucide-react'

/**
 * Campo de formulario unificado: etiqueta visible arriba, icono opcional a la
 * izquierda del control, y mensaje de error o ayuda debajo.
 * Asocia automáticamente la etiqueta y los mensajes al control (accesibilidad).
 *
 *   <Campo label="Ubicación" icon={MapPin} requerido error={err}>
 *     <select …/>
 *   </Campo>
 */
export default function Campo({ label, icon: Icon, requerido = false, error, ayuda, className = '', style, children }) {
  const autoId = useId()
  const hijo = Children.only(children)
  const id = (isValidElement(hijo) && hijo.props.id) || autoId
  const idMsg = `${id}-msg`
  const tieneMsg = Boolean(error || ayuda)

  const control = cloneElement(hijo, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': tieneMsg ? idMsg : undefined,
    'aria-required': requerido || undefined,
  })

  return (
    <div className={`campo ${className}`} style={style}>
      {label && (
        <label htmlFor={id}>
          {label}{requerido && <span className="req" aria-hidden="true">*</span>}
        </label>
      )}
      <div className={`control ${Icon ? 'con-icono' : ''} ${error ? 'con-error' : ''}`}>
        {Icon && <Icon className="control-icono" size={18} strokeWidth={1.75} aria-hidden="true" />}
        {control}
      </div>
      {error ? (
        <span className="campo-error" id={idMsg}>
          <CircleAlert size={14} strokeWidth={2} aria-hidden="true" />{error}
        </span>
      ) : ayuda ? (
        <span className="campo-ayuda" id={idMsg}>{ayuda}</span>
      ) : null}
    </div>
  )
}

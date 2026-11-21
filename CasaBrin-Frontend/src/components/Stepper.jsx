import { Minus, Plus } from 'lucide-react'

/**
 * Campo numérico con botones − / + grandes (cómodos en tablet o celular).
 * Recibe id/aria-* desde <Campo> y los pasa al input.
 */
export default function Stepper({ value, onChange, min = 1, max = 999, step = 1, etiqueta = 'cantidad', ...resto }) {
  const n = parseInt(value, 10)
  const actual = Number.isFinite(n) ? n : min

  function cambiar(delta) {
    const nuevo = Math.min(max, Math.max(min, actual + delta))
    onChange(String(nuevo))
  }

  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper-btn"
        onClick={() => cambiar(-step)}
        disabled={actual <= min}
        aria-label={`Restar ${etiqueta}`}
        tabIndex={-1}
      >
        <Minus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      <input
        {...resto}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') { e.preventDefault(); cambiar(step) }
          if (e.key === 'ArrowDown') { e.preventDefault(); cambiar(-step) }
        }}
      />
      <button
        type="button"
        className="stepper-btn"
        onClick={() => cambiar(step)}
        disabled={actual >= max}
        aria-label={`Sumar ${etiqueta}`}
        tabIndex={-1}
      >
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Recuperar from './pages/Recuperar.jsx'
import CambiarContrasena from './pages/CambiarContrasena.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventario from './pages/Inventario.jsx'
import IngresoMercaderia from './pages/IngresoMercaderia.jsx'
import Escanear from './pages/Escanear.jsx'
import Etiquetas from './pages/Etiquetas.jsx'
import Reportes from './pages/Reportes.jsx'
import Usuarios from './pages/Usuarios.jsx'

function Privada({ children, soloAdmin = false }) {
  const { user, esAdmin, cargando } = useAuth()
  if (cargando) return <div className="cargando-pantalla">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  // Con una clave temporal, primero debe crear su propia contraseña.
  if (user.debeCambiarContrasena) return <Navigate to="/cambiar-contrasena" replace />
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />
  return children
}

// Pantallas de acceso: si ya hay sesión, no tiene sentido mostrarlas.
function SoloInvitado({ children }) {
  const { user, cargando } = useAuth()
  if (cargando) return null
  if (user) return <Navigate to={user.debeCambiarContrasena ? '/cambiar-contrasena' : '/'} replace />
  return children
}

function CambioObligatorio() {
  const { user, cargando } = useAuth()
  if (cargando) return null
  if (!user) return <Navigate to="/login" replace />
  if (!user.debeCambiarContrasena) return <Navigate to="/" replace />
  return <CambiarContrasena />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<SoloInvitado><Login /></SoloInvitado>} />
      <Route path="/recuperar" element={<SoloInvitado><Recuperar /></SoloInvitado>} />
      <Route path="/cambiar-contrasena" element={<CambioObligatorio />} />
      <Route
        path="/"
        element={<Privada><Layout /></Privada>}
      >
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ingreso" element={<IngresoMercaderia />} />
        <Route path="escanear" element={<Escanear />} />
        {/* Los traslados ahora se hacen desde Inventario (ventana emergente). */}
        <Route path="traslados" element={<Navigate to="/inventario" replace />} />
        <Route path="etiquetas" element={<Etiquetas />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="usuarios" element={<Privada soloAdmin><Usuarios /></Privada>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

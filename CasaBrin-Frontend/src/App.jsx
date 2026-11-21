import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Inventario from './pages/Inventario.jsx'
import IngresoMercaderia from './pages/IngresoMercaderia.jsx'
import Escanear from './pages/Escanear.jsx'
import Traslados from './pages/Traslados.jsx'
import Etiquetas from './pages/Etiquetas.jsx'
import Reportes from './pages/Reportes.jsx'
import Usuarios from './pages/Usuarios.jsx'

function Privada({ children, soloAdmin = false }) {
  const { user, esAdmin, cargando } = useAuth()
  if (cargando) return <div className="cargando-pantalla">Cargando…</div>
  if (!user) return <Navigate to="/login" replace />
  if (soloAdmin && !esAdmin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<Privada><Layout /></Privada>}
      >
        <Route index element={<Dashboard />} />
        <Route path="inventario" element={<Inventario />} />
        <Route path="ingreso" element={<IngresoMercaderia />} />
        <Route path="escanear" element={<Escanear />} />
        <Route path="traslados" element={<Traslados />} />
        <Route path="etiquetas" element={<Etiquetas />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="usuarios" element={<Privada soloAdmin><Usuarios /></Privada>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

import { useEffect, useState } from 'react'

const Icon = ({ children }) => <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-zinc-900/70 text-amber-400">{children}</span>

const features = [
  ['01', 'Recepción', 'Registra vehículo, cliente y diagnóstico inicial.'],
  ['02', 'Operación', 'Asigna técnicos y controla cada fase de reparación.'],
  ['03', 'Entrega', 'Documenta costos, garantías y cierre de la orden.']
]

function Field({ label, type = 'text', placeholder, value, onChange, autoComplete }) {
  return <label className="block text-sm font-medium text-zinc-300">
    {label}
    <input type={type} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} required
      className="mt-2 h-12 w-full rounded-xl border border-line bg-zinc-950 px-4 text-sm text-zinc-100 placeholder:text-zinc-600" />
  </label>
}

const roleLabels = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  RECEPCION: 'Recepción',
  TECNICO: 'Técnico',
  ALMACEN: 'Almacén'
}

function Header({ user, onExit }) {
  return <header className="flex items-center justify-between border-b border-line bg-zinc-950/80 px-5 py-4 backdrop-blur sm:px-8">
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-zinc-950">T</div><div><p className="font-bold">Taller Control</p><p className="text-xs text-zinc-500">{roleLabels[user.role] || 'Usuario'}</p></div></div>
    <button onClick={onExit} className="rounded-lg border border-line px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">Cerrar sesión</button>
  </header>
}

function AdminDashboard({ user, onExit }) {
  const sections = [['Usuarios y roles', 'Crea perfiles y define permisos por puesto.'], ['Órdenes de reparación', 'Supervisa todas las fases y asignaciones.'], ['Auditoría', 'Consulta acciones y cambios registrados.'], ['Configuración', 'Gestiona datos generales del taller.']]
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} /><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">PANEL DE ADMINISTRACIÓN</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hola, {user.name}</h1><p className="mt-3 max-w-2xl text-zinc-500">Tienes acceso completo a la operación, usuarios y configuración del taller.</p><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6"><p className="text-sm text-amber-300">Rol activo</p><p className="mt-2 text-2xl font-bold">Administrador</p><p className="mt-4 text-sm text-zinc-400">Control total de registros y permisos.</p></div>{sections.map(([title, description]) => <article key={title} className="rounded-2xl border border-line bg-panel p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p><button className="mt-5 text-sm font-medium text-amber-400 hover:text-amber-300">Próximamente →</button></article>)}</div></div></main>
}

function GeneralDashboard({ user, onExit }) {
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} /><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">VISTA GENERAL</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hola, {user.name}</h1><p className="mt-3 max-w-2xl text-zinc-500">Consulta y actualiza las órdenes que correspondan a tu función de {roleLabels[user.role]?.toLowerCase()}.</p><div className="mt-10 grid gap-4 sm:grid-cols-3">{[['Mis órdenes', 'Las órdenes asignadas aparecerán aquí.'], ['Actividad reciente', 'Los últimos movimientos del taller.'], ['Mi perfil', 'Datos y permisos de tu cuenta.']].map(([title, description]) => <article key={title} className="rounded-2xl border border-line bg-panel p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p></article>)}</div></div></main>
}

export default function App() {
  const [screen, setScreen] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const update = key => e => setForm({ ...form, [key]: e.target.value })
  const isLogin = screen === 'login'
  const isRegister = screen === 'register'
  const submit = async e => {
    e.preventDefault()
    if (isRegister && form.password !== form.confirm) return setNotice('Las contraseñas no coinciden.')
    setNotice('')
    const url = isLogin ? '/api/auth/login' : isRegister ? '/api/auth/register' : '/api/auth/forgot-password'
    const body = isLogin ? { email: form.email, password: form.password } : isRegister ? { name: form.name, email: form.email, password: form.password } : { email: form.email }
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      if (isLogin) {
        setUser(data.user)
        const destination = data.user.role === 'ADMIN' ? '/administracion' : '/inicio'
        window.history.pushState({}, '', destination)
        setScreen(data.user.role === 'ADMIN' ? 'admin' : 'general')
        return
      }
      setNotice(data.message || 'Solicitud enviada correctamente.')
    } catch (error) {
      setNotice(error.message || 'No fue posible completar la solicitud. Verifica que la API esté en ejecución.')
    }
  }
  const exit = () => {
    setUser(null)
    setForm({ name: '', email: '', password: '', confirm: '' })
    setNotice('')
    window.history.pushState({}, '', '/')
    setScreen('login')
  }
  useEffect(() => {
    const onPopState = () => {
      if (!user) setScreen('login')
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [user])
  if (screen === 'admin' && user) return <AdminDashboard user={user} onExit={exit} />
  if (screen === 'general' && user) return <GeneralDashboard user={user} onExit={exit} />
  const text = isLogin ? ['Bienvenido de nuevo', 'Ingresa para administrar la operación de tu taller.', 'Iniciar sesión'] : isRegister ? ['Crea la cuenta de tu taller', 'El primer usuario se registra como administrador.', 'Crear cuenta'] : ['Recupera tu acceso', 'Te enviaremos las instrucciones a tu correo registrado.', 'Enviar instrucciones']

  return <main className="min-h-screen bg-ink selection:bg-amber-400 selection:text-zinc-950">
    <div className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.12fr_.88fr]">
      <section className="relative hidden overflow-hidden border-r border-line px-12 py-12 lg:flex lg:flex-col xl:px-20">
        <div className="absolute -left-36 top-24 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
        <header className="relative flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-400 text-xl font-black text-zinc-950">T</div>
          <div><p className="font-bold tracking-tight">Taller Control</p><p className="text-xs text-zinc-500">Gestión de órdenes de reparación</p></div>
        </header>
        <div className="relative my-auto max-w-xl">
          <p className="mb-6 text-sm font-semibold tracking-[.22em] text-amber-400">OPERACIÓN CONECTADA</p>
          <h1 className="text-5xl font-bold leading-[1.04] tracking-tight xl:text-6xl">Tu taller, bajo <span className="text-zinc-500">control total.</span></h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-zinc-400">Coordina cada orden desde la recepción hasta la entrega. Información confiable para tu equipo y tu negocio.</p>
          <div className="mt-14 grid gap-4">
            {features.map(([n, title, desc]) => <div key={n} className="flex items-center gap-4 rounded-2xl border border-line bg-panel/60 p-4"><span className="text-xs font-bold text-amber-400">{n}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm text-zinc-500">{desc}</p></div></div>)}
          </div>
        </div>
        <p className="relative text-xs text-zinc-600">© 2026 Taller Control · Acceso protegido</p>
      </section>
      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-zinc-950">T</div><span className="font-bold">Taller Control</span></div>
          <div className="mb-8"><div className="mb-5"><Icon>◈</Icon></div><h2 className="text-3xl font-bold tracking-tight">{text[0]}</h2><p className="mt-3 leading-relaxed text-zinc-500">{text[1]}</p></div>
          <form onSubmit={submit} className="space-y-5">
            {isRegister && <Field label="Nombre completo" placeholder="Tu nombre" value={form.name} onChange={update('name')} autoComplete="name" />}
            <Field label="Correo electrónico" type="email" placeholder="nombre@taller.com" value={form.email} onChange={update('email')} autoComplete="email" />
            {!(!isLogin && !isRegister) && <Field label="Contraseña" type="password" placeholder="Mínimo 10 caracteres" value={form.password} onChange={update('password')} autoComplete={isLogin ? 'current-password' : 'new-password'} />}
            {isRegister && <Field label="Confirmar contraseña" type="password" placeholder="Repite tu contraseña" value={form.confirm} onChange={update('confirm')} autoComplete="new-password" />}
            {isLogin && <button type="button" onClick={() => { setScreen('forgot'); setNotice('') }} className="block ml-auto -mt-1 text-sm font-medium text-amber-400 hover:text-amber-300">¿Olvidaste tu contraseña?</button>}
            {notice && <p role="status" className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{notice}</p>}
            <button className="h-12 w-full rounded-xl bg-amber-400 font-semibold text-zinc-950 transition hover:bg-amber-300 active:scale-[.99]">{text[2]}</button>
          </form>
          <div className="my-7 h-px bg-line" />
          <p className="text-center text-sm text-zinc-500">{isLogin ? '¿Aún no tienes cuenta?' : '¿Ya tienes una cuenta?'} <button onClick={() => { setScreen(isLogin ? 'register' : 'login'); setNotice('') }} className="font-semibold text-zinc-200 hover:text-amber-400">{isLogin ? 'Crear cuenta' : 'Inicia sesión'}</button></p>
          <p className="mt-9 text-center text-xs leading-relaxed text-zinc-600">Al continuar, aceptas los términos de uso y la política de privacidad.</p>
        </div>
      </section>
    </div>
  </main>
}

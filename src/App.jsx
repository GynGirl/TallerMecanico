import { useEffect, useRef, useState } from 'react'
import { CustomerRegistrationFacade } from './customerRegistrationFacade.js'

const Icon = ({ children }) => <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-zinc-900/70 text-amber-400">{children}</span>

const features = [
  ['01', 'Recepción', 'Registra vehículo, cliente y diagnóstico inicial.'],
  ['02', 'Operación', 'Asigna técnicos y controla cada fase de reparación.'],
  ['03', 'Entrega', 'Documenta costos, garantías y cierre de la orden.']
]

function Field({ label, type = 'text', placeholder, value, onChange, autoComplete, required = true, ...attributes }) {
  return <label className="block text-sm font-medium text-zinc-300">
    {label}
    <input type={type} value={value} onChange={onChange} autoComplete={autoComplete} placeholder={placeholder} required={required} {...attributes}
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

function Header({ user, onExit, onRegisterCustomer, onViewCustomers }) {
  return <header className="flex items-center justify-between border-b border-line bg-zinc-950/80 px-5 py-4 backdrop-blur sm:px-8">
    <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 font-black text-zinc-950">T</div><div><p className="font-bold">Taller Control</p><p className="text-xs text-zinc-500">{roleLabels[user.role] || 'Usuario'}</p></div></div>
    <div className="flex items-center gap-2">{onViewCustomers && <button onClick={onViewCustomers} className="rounded-lg border border-line px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">Clientes</button>}{onRegisterCustomer && <button onClick={onRegisterCustomer} className="rounded-lg bg-amber-400 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300">Nuevo cliente</button>}<button onClick={onExit} className="rounded-lg border border-line px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white">Cerrar sesión</button></div>
  </header>
}

function AdminDashboard({ user, onExit, onRegisterCustomer, onViewCustomers }) {
  const sections = [['Usuarios y roles', 'Crea perfiles y define permisos por puesto.'], ['Órdenes de reparación', 'Supervisa todas las fases y asignaciones.'], ['Auditoría', 'Consulta acciones y cambios registrados.'], ['Configuración', 'Gestiona datos generales del taller.']]
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} onRegisterCustomer={onRegisterCustomer} onViewCustomers={onViewCustomers} /><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">PANEL DE ADMINISTRACIÓN</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hola, {user.name}</h1><p className="mt-3 max-w-2xl text-zinc-500">Tienes acceso completo a la operación, usuarios y configuración del taller.</p><div className="mt-10 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-6"><p className="text-sm text-amber-300">Rol activo</p><p className="mt-2 text-2xl font-bold">Administrador</p><p className="mt-4 text-sm text-zinc-400">Control total de registros y permisos.</p></div>{sections.map(([title, description]) => <article key={title} className="rounded-2xl border border-line bg-panel p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p><button className="mt-5 text-sm font-medium text-amber-400 hover:text-amber-300">Próximamente →</button></article>)}</div></div></main>
}

function GeneralDashboard({ user, onExit, onRegisterCustomer, onViewCustomers }) {
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} onRegisterCustomer={user.role === 'RECEPCION' ? onRegisterCustomer : null} onViewCustomers={user.role === 'RECEPCION' ? onViewCustomers : null} /><div className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">VISTA GENERAL</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">Hola, {user.name}</h1><p className="mt-3 max-w-2xl text-zinc-500">Consulta y actualiza las órdenes que correspondan a tu función de {roleLabels[user.role]?.toLowerCase()}.</p><div className="mt-10 grid gap-4 sm:grid-cols-3">{[['Mis órdenes', 'Las órdenes asignadas aparecerán aquí.'], ['Actividad reciente', 'Los últimos movimientos del taller.'], ['Mi perfil', 'Datos y permisos de tu cuenta.']].map(([title, description]) => <article key={title} className="rounded-2xl border border-line bg-panel p-6"><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p></article>)}</div></div></main>
}

function CustomerRegistration({ user, token, onExit, onBack }) {
  const [form, setForm] = useState({ fullName: '', alternateContact: '', age: '', dateOfBirth: '', personalPhone: '', workPhone: '', email: '', workEmail: '', street: '', neighborhood: '', municipality: '', state: '', postalCode: '' })
  const [photo, setPhoto] = useState(null)
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const formRef = useRef(null)
  const update = key => event => setForm({ ...form, [key]: event.target.value })
  const submitCustomer = async event => {
    event.preventDefault()
    setSaving(true); setNotice('')
    try {
      const result = await new CustomerRegistrationFacade(token).register(form, photo)
      setNotice('Cliente guardado')
      setForm({ fullName: '', alternateContact: '', age: '', dateOfBirth: '', personalPhone: '', workPhone: '', email: '', workEmail: '', street: '', neighborhood: '', municipality: '', state: '', postalCode: '' })
      setPhoto(null)
      formRef.current?.reset()
    } catch (error) { setNotice(error.message) } finally { setSaving(false) }
  }
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} /><section className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><button onClick={onBack} className="text-sm font-medium text-amber-400 hover:text-amber-300">← Volver al panel</button><div className="mt-6"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">CLIENTES</p><h1 className="mt-3 text-3xl font-bold">Registrar cliente</h1><p className="mt-3 text-zinc-500">Todos los datos son obligatorios, excepto el correo de trabajo.</p></div><form ref={formRef} onSubmit={submitCustomer} className="mt-9 grid gap-5 rounded-2xl border border-line bg-panel p-5 sm:grid-cols-2 sm:p-8"><div className="sm:col-span-2"><p className="text-sm font-semibold text-zinc-200">Datos personales</p></div><Field label="Nombre completo" value={form.fullName} onChange={update('fullName')} autoComplete="name" maxLength="150" /><Field label="Contacto alternativo" value={form.alternateContact} onChange={update('alternateContact')} maxLength="150" /><Field label="Edad" type="number" value={form.age} onChange={update('age')} min="0" max="120" /><Field label="Fecha de nacimiento" type="date" value={form.dateOfBirth} onChange={update('dateOfBirth')} /><Field label="Teléfono personal" type="tel" value={form.personalPhone} onChange={update('personalPhone')} pattern="\+?[0-9 ()-]{7,25}" /><Field label="Teléfono de trabajo" type="tel" value={form.workPhone} onChange={update('workPhone')} pattern="\+?[0-9 ()-]{7,25}" /><Field label="Email personal" type="email" value={form.email} onChange={update('email')} autoComplete="email" /><Field label="Email de trabajo" type="email" value={form.workEmail} onChange={update('workEmail')} required={false} /><label className="block text-sm font-medium text-zinc-300 sm:col-span-2">Fotografía<input type="file" accept="image/*" required onChange={event => setPhoto(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-xl border border-dashed border-line bg-zinc-950 px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-400 file:px-3 file:py-2 file:font-semibold file:text-zinc-950" /><span className="mt-2 block text-xs text-zinc-500">Todos los formatos de imagen, máximo 7 MB.</span></label><div className="border-t border-line pt-5 sm:col-span-2"><p className="text-sm font-semibold text-zinc-200">Dirección</p></div><Field label="Calle" value={form.street} onChange={update('street')} maxLength="150" /><Field label="Colonia" value={form.neighborhood} onChange={update('neighborhood')} maxLength="100" /><Field label="Municipio" value={form.municipality} onChange={update('municipality')} maxLength="100" /><Field label="Estado" value={form.state} onChange={update('state')} maxLength="100" /><Field label="Código postal" value={form.postalCode} onChange={update('postalCode')} inputMode="numeric" pattern="\d{5}" maxLength="5" />{notice && <p role="status" className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-3 text-sm text-amber-300 sm:col-span-2">{notice}</p>}<div className="flex justify-end sm:col-span-2"><button disabled={saving} className="h-12 rounded-xl bg-amber-400 px-6 font-semibold text-zinc-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cliente'}</button></div></form></section></main>
}

function CustomerList({ user, token, onExit, onBack }) {
  const [clients, setClients] = useState([])
  const [notice, setNotice] = useState('Cargando clientes…')
  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch('/api/clients', { headers: { Authorization: `Bearer ${token}` } })
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'No fue posible cargar los clientes.')
        setClients(result)
        setNotice('')
      } catch (error) { setNotice(error.message) }
    }
    loadClients()
  }, [token])
  const formatDate = date => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'America/Mexico_City' }).format(new Date(date))
  return <main className="min-h-screen bg-ink"><Header user={user} onExit={onExit} /><section className="mx-auto max-w-6xl px-5 py-10 sm:px-8"><button onClick={onBack} className="text-sm font-medium text-amber-400 hover:text-amber-300">← Volver al panel</button><div className="mt-6"><p className="text-sm font-semibold tracking-[.2em] text-amber-400">CLIENTES</p><h1 className="mt-3 text-3xl font-bold">Clientes registrados</h1></div>{notice ? <p role="status" className="mt-8 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">{notice}</p> : <div className="mt-8 overflow-x-auto rounded-2xl border border-line bg-panel"><table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-line bg-zinc-950/60 text-zinc-400"><tr><th className="px-5 py-4 font-medium">Nombre</th><th className="px-5 py-4 font-medium">Teléfono</th><th className="px-5 py-4 font-medium">Email</th><th className="px-5 py-4 font-medium">Fecha de registro</th></tr></thead><tbody>{clients.map(client => <tr key={`${client.email}-${client.createdAt}`} className="border-b border-line last:border-0"><td className="px-5 py-4 font-medium text-zinc-100">{client.fullName}</td><td className="px-5 py-4 text-zinc-400">{client.personalPhone}</td><td className="px-5 py-4 text-zinc-400">{client.email}</td><td className="px-5 py-4 text-zinc-400">{formatDate(client.createdAt)}</td></tr>)}{clients.length === 0 && <tr><td colSpan="4" className="px-5 py-10 text-center text-zinc-500">Aún no hay clientes registrados.</td></tr>}</tbody></table></div>}</section></main>
}

export default function App() {
  const [screen, setScreen] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [notice, setNotice] = useState('')
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
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
        setToken(data.token)
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
    setToken(null)
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
  const openCustomerRegistration = () => {
    window.history.pushState({}, '', '/clientes/nuevo')
    setScreen('customers')
  }
  const backToDashboard = () => {
    const destination = user.role === 'ADMIN' ? '/administracion' : '/inicio'
    window.history.pushState({}, '', destination)
    setScreen(user.role === 'ADMIN' ? 'admin' : 'general')
  }
  const openCustomerList = () => {
    window.history.pushState({}, '', '/clientes')
    setScreen('customer-list')
  }
  if (screen === 'customers' && user && token && ['ADMIN', 'RECEPCION'].includes(user.role)) return <CustomerRegistration user={user} token={token} onExit={exit} onBack={backToDashboard} />
  if (screen === 'customer-list' && user && token && ['ADMIN', 'RECEPCION'].includes(user.role)) return <CustomerList user={user} token={token} onExit={exit} onBack={backToDashboard} />
  if (screen === 'admin' && user) return <AdminDashboard user={user} onExit={exit} onRegisterCustomer={openCustomerRegistration} onViewCustomers={openCustomerList} />
  if (screen === 'general' && user) return <GeneralDashboard user={user} onExit={exit} onRegisterCustomer={openCustomerRegistration} onViewCustomers={openCustomerList} />
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

/**
 * Facade de registro: la vista React usa una única interfaz para validar y
 * enviar el formulario; no conoce FormData, cabeceras ni detalles REST.
 */
export class CustomerRegistrationFacade {
  constructor(token) {
    this.token = token
  }

  /** Valida formatos antes de enviar datos personales a la API. */
  validate(data, photo) {
    const required = ['fullName', 'alternateContact', 'age', 'dateOfBirth', 'personalPhone', 'workPhone', 'email', 'street', 'neighborhood', 'municipality', 'state', 'postalCode']
    if (required.some(key => !String(data[key] || '').trim())) return 'Completa todos los campos obligatorios.'
    if (!/^\S+@\S+\.\S+$/.test(data.email)) return 'El correo personal no tiene un formato válido.'
    if (data.workEmail && !/^\S+@\S+\.\S+$/.test(data.workEmail)) return 'El correo de trabajo no tiene un formato válido.'
    if (!/^\+?[0-9 ()-]{7,25}$/.test(data.personalPhone) || !/^\+?[0-9 ()-]{7,25}$/.test(data.workPhone)) return 'Verifica el formato de los teléfonos.'
    if (!/^\d{5}$/.test(data.postalCode)) return 'El código postal debe tener 5 dígitos.'
    if (!Number.isInteger(Number(data.age)) || Number(data.age) < 0 || Number(data.age) > 120) return 'La edad debe ser un número entre 0 y 120.'
    if (!photo || !photo.type.startsWith('image/')) return 'Selecciona una imagen válida para la fotografía.'
    if (photo.size > 7 * 1024 * 1024) return 'La fotografía no puede superar 7 MB.'
    return null
  }

  /** Envía el cliente como multipart/form-data al recurso REST protegido. */
  async register(data, photo) {
    const validationError = this.validate(data, photo)
    if (validationError) throw new Error(validationError)
    const payload = new FormData()
    Object.entries(data).forEach(([key, value]) => payload.append(key, String(value).trim()))
    payload.append('photo', photo)
    const response = await fetch('/api/clients', { method: 'POST', headers: { Authorization: `Bearer ${this.token}` }, body: payload })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || 'No fue posible guardar el usuario.')
    return result
  }
}

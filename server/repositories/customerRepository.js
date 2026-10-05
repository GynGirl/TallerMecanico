/** Repositorio: concentra exclusivamente las consultas SQL de clientes. */
export class CustomerRepository {
  constructor(pool) {
    this.pool = pool
  }

  /** Devuelve el resumen de clientes para la vista de consulta. */
  async list() {
    const [rows] = await this.pool.execute(
      'SELECT full_name AS fullName, personal_phone AS personalPhone, personal_email AS email, created_at AS createdAt FROM clients ORDER BY created_at DESC'
    )
    return rows
  }

  /** Busca coincidencias por correo, teléfono o identidad normalizada. */
  async findDuplicate(connection, { email, personalPhone, identityKey }) {
    const [rows] = await connection.execute(
      'SELECT id FROM clients WHERE personal_email = ? OR personal_phone = ? OR identity_key = ? LIMIT 1',
      [email, personalPhone, identityKey]
    )
    return rows[0] || null
  }

  /** Inserta un cliente y devuelve el identificador generado por MySQL. */
  async create(connection, customer) {
    const [result] = await connection.execute(
      `INSERT INTO clients (
        full_name, alternate_contact, age, birth_date, personal_phone, work_phone,
        personal_email, work_email, photo_data, photo_mime, street, neighborhood,
        municipality, state, postal_code, identity_key, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.fullName, customer.alternateContact, customer.age, customer.dateOfBirth,
        customer.personalPhone, customer.workPhone, customer.email, customer.workEmail,
        customer.photo.buffer, customer.photo.mimetype, customer.street, customer.neighborhood,
        customer.municipality, customer.state, customer.postalCode, customer.identityKey,
        customer.createdBy
      ]
    )
    return result.insertId
  }

  /** Registra la creación sin mezclar auditoría con la lógica de transporte HTTP. */
  async recordAudit(connection, userId, customerId, ipAddress) {
    await connection.execute(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, 'CLIENT_CREATED', 'clients', customerId, ipAddress]
    )
  }
}

/** Repositorio: concentra exclusivamente las consultas SQL de clientes. */
export class CustomerRepository {
  constructor(pool) {
    this.pool = pool
  }

  /** Devuelve el resumen de clientes para la vista de consulta. */
  async list() {
    const [rows] = await this.pool.execute(
      'SELECT id, full_name AS fullName, personal_phone AS personalPhone, personal_email AS email, created_at AS createdAt FROM clients ORDER BY created_at DESC'
    )
    return rows
  }

  /** Busca todos los datos necesarios para la vista de detalle. */
  async findById(id) {
    const [rows] = await this.pool.execute(
      `SELECT id, full_name AS fullName, alternate_contact AS alternateContact, age,
        birth_date AS dateOfBirth, personal_phone AS personalPhone, work_phone AS workPhone,
        personal_email AS email, work_email AS workEmail, photo_data AS photoData,
        photo_mime AS photoMime, street, neighborhood, municipality, state, postal_code AS postalCode
       FROM clients WHERE id = ? LIMIT 1`,
      [id]
    )
    return rows[0] || null
  }

  /** Busca coincidencias por correo, teléfono o identidad normalizada. */
  async findDuplicate(connection, { email, personalPhone, identityKey }) {
    const [rows] = await connection.execute(
      'SELECT id FROM clients WHERE personal_email = ? OR personal_phone = ? OR identity_key = ? LIMIT 1',
      [email, personalPhone, identityKey]
    )
    return rows[0] || null
  }

  /** Busca coincidencias sin considerar el cliente que se está editando. */
  async findDuplicateExcept(connection, id, { email, personalPhone, identityKey }) {
    const [rows] = await connection.execute(
      'SELECT id FROM clients WHERE id <> ? AND (personal_email = ? OR personal_phone = ? OR identity_key = ?) LIMIT 1',
      [id, email, personalPhone, identityKey]
    )
    return rows[0] || null
  }

  async existsForUpdate(connection, id) {
    const [rows] = await connection.execute('SELECT id FROM clients WHERE id = ? FOR UPDATE', [id])
    return Boolean(rows[0])
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

  /** Actualiza datos de cliente y conserva la foto si no llega un reemplazo. */
  async update(connection, id, customer, photo) {
    const fields = `full_name = ?, alternate_contact = ?, age = ?, birth_date = ?, personal_phone = ?, work_phone = ?,
      personal_email = ?, work_email = ?, street = ?, neighborhood = ?, municipality = ?, state = ?, postal_code = ?, identity_key = ?`
    const values = [customer.fullName, customer.alternateContact, customer.age, customer.dateOfBirth, customer.personalPhone, customer.workPhone, customer.email, customer.workEmail, customer.street, customer.neighborhood, customer.municipality, customer.state, customer.postalCode, customer.identityKey]
    if (photo) {
      await connection.execute(`UPDATE clients SET ${fields}, photo_data = ?, photo_mime = ? WHERE id = ?`, [...values, photo.buffer, photo.mimetype, id])
      return
    }
    await connection.execute(`UPDATE clients SET ${fields} WHERE id = ?`, [...values, id])
  }

  /** Registra la creación sin mezclar auditoría con la lógica de transporte HTTP. */
  async recordAudit(connection, userId, customerId, ipAddress, action = 'CLIENT_CREATED') {
    await connection.execute(
      'INSERT INTO audit_log (user_id, action, entity_type, entity_id, ip_address) VALUES (?, ?, ?, ?, ?)',
      [userId, action, 'clients', customerId, ipAddress]
    )
  }
}

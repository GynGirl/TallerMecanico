import crypto from 'node:crypto'

export class DuplicateCustomerError extends Error {}

/** Servicio: aplica reglas de negocio y coordina el repositorio en una transacción. */
export class CustomerService {
  constructor(pool, customerRepository) {
    this.pool = pool
    this.customerRepository = customerRepository
  }

  /** Evita registros del mismo cliente incluso si cambia correo o teléfono. */
  createIdentityKey(fullName, dateOfBirth) {
    const normalizedName = fullName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
    return crypto.createHash('sha256').update(`${normalizedName}|${dateOfBirth}`).digest('hex')
  }

  /** Crea el cliente y su auditoría como una sola operación atómica. */
  async register(input, photo, createdBy, ipAddress) {
    const identityKey = this.createIdentityKey(input.fullName, input.dateOfBirth)
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      const duplicate = await this.customerRepository.findDuplicate(connection, { email: input.email, personalPhone: input.personalPhone, identityKey })
      if (duplicate) throw new DuplicateCustomerError('El cliente ya existe; no se creó un registro duplicado.')
      const customerId = await this.customerRepository.create(connection, { ...input, photo, identityKey, createdBy })
      await this.customerRepository.recordAudit(connection, createdBy, customerId, ipAddress)
      await connection.commit()
      return customerId
    } catch (error) {
      await connection.rollback()
      if (error?.code === 'ER_DUP_ENTRY') throw new DuplicateCustomerError('El cliente ya existe; no se creó un registro duplicado.')
      throw error
    } finally {
      connection.release()
    }
  }
}

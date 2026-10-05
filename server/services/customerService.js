import crypto from 'node:crypto'

export class DuplicateCustomerError extends Error {}
export class CustomerNotFoundError extends Error {}

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

  /** Actualiza un cliente existente dentro de una transacción y evita duplicados. */
  async update(id, input, photo, updatedBy, ipAddress) {
    const identityKey = this.createIdentityKey(input.fullName, input.dateOfBirth)
    const connection = await this.pool.getConnection()
    try {
      await connection.beginTransaction()
      if (!(await this.customerRepository.existsForUpdate(connection, id))) throw new CustomerNotFoundError('Cliente no encontrado.')
      const duplicate = await this.customerRepository.findDuplicateExcept(connection, id, { email: input.email, personalPhone: input.personalPhone, identityKey })
      if (duplicate) throw new DuplicateCustomerError('El cliente ya existe; no se guardaron cambios duplicados.')
      await this.customerRepository.update(connection, id, { ...input, identityKey }, photo)
      await this.customerRepository.recordAudit(connection, updatedBy, id, ipAddress, 'CLIENT_UPDATED')
      await connection.commit()
    } catch (error) {
      await connection.rollback()
      if (error?.code === 'ER_DUP_ENTRY') throw new DuplicateCustomerError('El cliente ya existe; no se guardaron cambios duplicados.')
      throw error
    } finally {
      connection.release()
    }
  }
}

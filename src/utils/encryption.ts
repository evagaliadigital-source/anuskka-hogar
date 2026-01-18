// ============================================
// MÓDULO DE CIFRADO/DESCIFRADO AES-256-GCM
// ============================================

// Clave de cifrado (32 bytes para AES-256)
// En producción: usar variable de entorno ENCRYPTION_KEY
const ENCRYPTION_KEY = 'anushka-hogar-2026-secret-key!' // 32 caracteres

// Convertir string a ArrayBuffer
function str2ab(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

// Convertir ArrayBuffer a string
function ab2str(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer)
}

// Convertir ArrayBuffer a hex
function ab2hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Convertir hex a ArrayBuffer
function hex2ab(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return bytes
}

// ============================================
// CIFRAR TEXTO
// ============================================
export async function encrypt(plaintext: string): Promise<string> {
  try {
    // Generar IV aleatorio (12 bytes para GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12))
    
    // Importar clave
    const key = await crypto.subtle.importKey(
      'raw',
      str2ab(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    )
    
    // Cifrar
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      str2ab(plaintext)
    )
    
    // Retornar: iv + ciphertext en hex
    return ab2hex(iv) + ':' + ab2hex(ciphertext)
  } catch (error) {
    console.error('Error cifrando:', error)
    throw new Error('Error al cifrar datos')
  }
}

// ============================================
// DESCIFRAR TEXTO
// ============================================
export async function decrypt(encrypted: string): Promise<string> {
  try {
    if (!encrypted || !encrypted.includes(':')) {
      return encrypted // No está cifrado
    }
    
    // Separar IV y ciphertext
    const [ivHex, ciphertextHex] = encrypted.split(':')
    const iv = hex2ab(ivHex)
    const ciphertext = hex2ab(ciphertextHex)
    
    // Importar clave
    const key = await crypto.subtle.importKey(
      'raw',
      str2ab(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    )
    
    // Descifrar
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    return ab2str(plaintext)
  } catch (error) {
    console.error('Error descifrando:', error)
    return encrypted // Retornar original si falla
  }
}

// ============================================
// CIFRAR OBJETO (múltiples campos)
// ============================================
export async function encryptObject(obj: any, fields: string[]): Promise<any> {
  const encrypted = { ...obj }
  
  for (const field of fields) {
    if (obj[field]) {
      encrypted[field] = await encrypt(obj[field])
    }
  }
  
  return encrypted
}

// ============================================
// DESCIFRAR OBJETO (múltiples campos)
// ============================================
export async function decryptObject(obj: any, fields: string[]): Promise<any> {
  const decrypted = { ...obj }
  
  for (const field of fields) {
    if (obj[field]) {
      decrypted[field] = await decrypt(obj[field])
    }
  }
  
  return decrypted
}

// ============================================
// CIFRAR LISTA DE OBJETOS
// ============================================
export async function encryptList(list: any[], fields: string[]): Promise<any[]> {
  return Promise.all(list.map(item => encryptObject(item, fields)))
}

// ============================================
// DESCIFRAR LISTA DE OBJETOS
// ============================================
export async function decryptList(list: any[], fields: string[]): Promise<any[]> {
  return Promise.all(list.map(item => decryptObject(item, fields)))
}

// ============================================
// HASH ONE-WAY (para búsquedas)
// ============================================
export async function hashForSearch(text: string): Promise<string> {
  const data = str2ab(text.toLowerCase().trim())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return ab2hex(hash)
}

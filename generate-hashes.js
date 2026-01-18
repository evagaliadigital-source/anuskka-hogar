// Script para generar hashes bcrypt de passwords
import bcrypt from 'bcryptjs';

const passwords = [
  { password: '1984', user: 'Ana Ramos' },
  { password: '881917176', user: 'Tienda Anushka' }
];

console.log('🔐 Generando hashes bcrypt...\n');

passwords.forEach(({ password, user }) => {
  const hash = bcrypt.hashSync(password, 10);
  console.log(`${user}:`);
  console.log(`  Password: ${password}`);
  console.log(`  Hash: ${hash}\n`);
});

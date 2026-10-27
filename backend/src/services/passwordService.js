import bcrypt from 'bcryptjs';

const COST = 12;

export const hashPassword = (password) => bcrypt.hash(password, COST);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when the email is unknown, so failed logins take similar time either way.
let dummyHash;
export async function verifyAgainstDummy(password) {
  dummyHash ??= await bcrypt.hash('timing-equalizer-password', COST);
  await bcrypt.compare(password, dummyHash);
  return false;
}

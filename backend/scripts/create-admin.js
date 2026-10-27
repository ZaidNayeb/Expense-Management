// Creates the first administrator account.
//
//   npm run create-admin                 interactive prompts (password input is hidden)
//   ADMIN_NAME=.. ADMIN_EMAIL=.. ADMIN_PASSWORD=.. npm run create-admin
//
// Refuses to run when an administrator already exists. If every administrator has lost
// access, run `npm run create-admin -- --recover` on the server: it asks you to type
// RECOVER to confirm and then creates one additional administrator (see README).
import readline from 'node:readline';
import { pool } from '../src/config/database.js';
import { countAdmins, createUser } from '../src/services/userService.js';
import {
  normalizeEmail,
  validateEmail,
  validateName,
  validatePassword,
} from '../src/validators/userValidator.js';

const recover = process.argv.includes('--recover');

function ask(question, { hidden = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    // Print the prompt, then suppress echoing of typed characters.
    rl._writeToOutput = (text) => {
      if (text.includes(question)) rl.output.write(text);
    };
  }
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function promptUntilValid(question, validate, options) {
  for (;;) {
    const value = await ask(question, options);
    const error = validate(value);
    if (!error) return value;
    console.log(`  ${error}`);
  }
}

async function main() {
  const existingAdmins = await countAdmins();
  if (existingAdmins > 0 && !recover) {
    throw new Error(
      'An administrator account already exists. Sign in as that administrator to create more accounts.\n' +
        'If no administrator can sign in, see "Administrator recovery" in the README.',
    );
  }
  if (existingAdmins > 0 && recover) {
    if (!process.stdin.isTTY) throw new Error('Recovery mode must be run interactively.');
    const confirm = await ask(
      `${existingAdmins} administrator(s) already exist. Type RECOVER to create an additional administrator: `,
    );
    if (confirm !== 'RECOVER') throw new Error('Recovery cancelled.');
  }

  let name = (process.env.ADMIN_NAME || '').trim();
  let email = normalizeEmail(process.env.ADMIN_EMAIL);
  let password = process.env.ADMIN_PASSWORD || '';
  const fromEnv = Boolean(name || email || password);

  if (fromEnv) {
    const problems = [validateName(name), validateEmail(email), validatePassword(password)].filter(Boolean);
    if (problems.length) throw new Error(`Invalid ADMIN_* settings:\n  ${problems.join('\n  ')}`);
  } else {
    if (!process.stdin.isTTY) {
      throw new Error('Set ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD, or run this script in an interactive terminal.');
    }
    console.log('Create the first administrator account.\n');
    name = (await promptUntilValid('Full name: ', (v) => validateName(v.trim()))).trim();
    email = normalizeEmail(await promptUntilValid('Email: ', (v) => validateEmail(normalizeEmail(v))));
    password = await promptUntilValid('Password (min. 8 characters): ', validatePassword, { hidden: true });
    const repeat = await ask('Repeat password: ', { hidden: true });
    if (repeat !== password) throw new Error('Passwords do not match. Nothing was created.');
  }

  // createUser hashes the password with bcrypt before it is stored.
  const admin = await createUser({ name, email, password, role: 'admin' });
  console.log(`Administrator created: ${admin.name} <${admin.email}> (id ${admin.id}).`);
  if (fromEnv) console.log('You can now remove ADMIN_PASSWORD from backend/.env.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

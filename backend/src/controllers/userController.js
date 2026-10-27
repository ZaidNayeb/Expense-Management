import * as users from '../services/userService.js';
import { paginated, parseId, parsePagination, parseSearch } from '../validators/common.js';
import { validateNewUser } from '../validators/userValidator.js';

export function me(req, res) {
  res.json({ data: req.user });
}

export async function list(req, res) {
  const pagination = parsePagination(req.query);
  const search = parseSearch(req.query.search);
  const { rows, total } = await users.listUsers({ search, ...pagination });
  res.json(paginated(rows, total, pagination));
}

export async function create(req, res) {
  const input = validateNewUser(req.body);
  const user = await users.createUser(input);
  res.status(201).json({ data: user });
}

export async function remove(req, res) {
  const id = parseId(req.params.id, 'User');
  const result = await users.deleteUser(id, req.user.id);
  res.json({ data: result });
}

import { useEffect, useState } from 'react';
import { listUsers } from '../services/userService.js';

// Admin-only: users for owner pickers (first 100, which is the API's maximum page size).
export function useUserOptions(enabled) {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listUsers({ limit: 100 })
      .then((res) => active && setUsers([...res.data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => active && setUsers([]));
    return () => {
      active = false;
    };
  }, [enabled]);
  return users;
}

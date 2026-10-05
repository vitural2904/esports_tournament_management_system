function fail(status, message) { throw Object.assign(new Error(message), { status }); }

export function createAccess() {
  const roles = user => [user.role];
  const managesDirectory = user => ['admin', 'operator'].includes(user.role);
  const readsDirectory = user => ['admin', 'operator', 'caster'].includes(user.role);
  function requireRole(user, _tournamentId, permission) {
    const allowed = !permission || (permission === 'operator' ? managesDirectory(user)
      : permission === 'results' ? ['admin', 'operator', 'referee'].includes(user.role)
      : permission === 'progress' ? readsDirectory(user) : false);
    if (!allowed) fail(403, 'Role không được phép thực hiện thao tác này.');
  }
  return { roles, requireRole, managesDirectory, readsDirectory };
}

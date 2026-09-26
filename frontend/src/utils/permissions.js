/** permissions is either '*' (SUPER_ADMIN) or an array of { module, action }. */
function can(permissions, module, action) {
  if (permissions === '*') return true;
  if (!Array.isArray(permissions)) return false;
  return permissions.some((p) => p.module === module && p.action === action);
}

export { can };

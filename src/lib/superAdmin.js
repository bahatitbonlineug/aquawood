// The super admin is the app creator — identified by email, NOT by a selectable role.
// This prevents any admin from promoting themselves to super admin via the role dropdown.
const SUPER_ADMIN_EMAIL = "Bahatitbonline@gmail.com";

export function isSuperAdmin(user) {
  if (!user || !user.email) return false;
  return user.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
}
/**
 * Role constants — single source of truth.
 * @typedef {'super_admin' | 'manager' | 'police' | 'citizen'} UserRole
 */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  MANAGER: 'manager',
  POLICE: 'police',
  CITIZEN: 'citizen',
}

/**
 * Returns the authenticated user's profile including role.
 * Always derived server-side — never trust client-passed values.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<{ user: object, profile: object }>}
 */
export async function getSession(supabase) {
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Joautorizuar')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role, badge_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Profili nuk u gjet')
  }

  return { user, profile }
}

/**
 * Asserts the current user has one of the required roles.
 * Throws an error (caught by Next.js error boundaries) if the check fails.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {UserRole[]} allowedRoles
 * @returns {Promise<{ user: object, profile: object }>}
 */
export async function requireRole(supabase, allowedRoles) {
  const { user, profile } = await getSession(supabase)

  if (!allowedRoles.includes(profile.role)) {
    throw new Error('Nuk keni leje për këtë veprim')
  }

  return { user, profile }
}

/**
 * Returns the default redirect path for a given role.
 * @param {UserRole} role
 * @returns {string}
 */
export function defaultPathForRole(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.MANAGER:
      return '/admin/dashboard'
    case ROLES.POLICE:
      return '/police/skaner'
    case ROLES.CITIZEN:
    default:
      return '/citizen/dashboard'
  }
}

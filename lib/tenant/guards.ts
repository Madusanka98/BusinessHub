import "server-only";
import { getTenantContext, TenantContext, AuthorizationError, AuthenticationError } from "./context";
import { Permission, hasPermission, SuperAdminPermission, hasSuperAdminPermission } from "./permissions";
import { getSession } from "@/lib/auth/session";

/**
 * Asserts that the current active tenant context holds the required permission.
 * Throws AuthorizationError if forbidden.
 */
export function assertTenantPermission(context: TenantContext, permission: Permission): void {
  if (!hasPermission(context.role, permission)) {
    throw new AuthorizationError(`Forbidden: Role '${context.role}' lacks permission '${permission}'.`);
  }
}

/**
 * Asserts that the authenticated user is a Platform Super Admin.
 */
export async function assertSuperAdmin(permission: SuperAdminPermission): Promise<{ userId: string; email: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new AuthenticationError("Authentication required.");
  }

  if (!hasSuperAdminPermission(session.isSuperAdmin, permission)) {
    throw new AuthorizationError("Access denied: Platform Super Admin privilege required.");
  }

  return { userId: session.userId, email: session.email };
}

/**
 * Higher-order Server Action guard wrapping operations with verified tenant context and permission check.
 */
export function withTenantGuard<TInput, TOutput>(
  permission: Permission,
  actionFn: (context: TenantContext, input: TInput) => Promise<TOutput>
) {
  return async (input: TInput): Promise<TOutput> => {
    const context = await getTenantContext();
    assertTenantPermission(context, permission);
    return await actionFn(context, input);
  };
}

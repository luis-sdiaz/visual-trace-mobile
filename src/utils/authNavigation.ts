export type AuthRouteAccess = {
  canAccessAuthenticatedRoutes: boolean;
  canAccessGuestRoutes: boolean;
};

export function getAuthRouteAccess(isAuthenticated: boolean): AuthRouteAccess {
  return {
    canAccessAuthenticatedRoutes: isAuthenticated,
    canAccessGuestRoutes: !isAuthenticated,
  };
}

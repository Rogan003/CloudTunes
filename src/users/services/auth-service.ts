import { TokenStorage } from "./user-token-storage-service";
import { jwtDecode } from "jwt-decode";

export type UserRole = "admin" | "user";

export const AuthService = {
  isLoggedIn(): boolean {
    return !!TokenStorage.getAccessToken();
  },

  // Attempts to read roles from ID token claims. Supports Cognito groups ("cognito:groups") or a single custom claim ("custom:role").
  getRoles(): UserRole[] {
    const id = TokenStorage.getIdToken();
    if (!id) return [];
    try {
      const decoded = jwtDecode<any>(id) as any;
      const groups: unknown = decoded?.["cognito:groups"];
      const roles: string[] = Array.isArray(groups)
        ? (groups as string[])
        : (decoded?.["custom:role"] ? [decoded["custom:role"]] : []);
      return roles.filter((r): r is UserRole => r === "admin" || r === "user");
    } catch {
      return [];
    }
  },

  hasRole(role: UserRole): boolean {
    return this.getRoles().includes(role);
  }
};

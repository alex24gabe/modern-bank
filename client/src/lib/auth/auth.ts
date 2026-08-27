export type TokenPayload = {
  userId?: string;
  email?: string;
  role?: string;
  exp?: number;
};

export function getToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    localStorage.getItem("token") ||
    localStorage.getItem("novabank_token") ||
    localStorage.getItem("accessToken")
  );
}

export function getTokenPayload(
  token: string
): TokenPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const normalized = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = atob(normalized);

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getCurrentUserRole(): string | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  const payload = getTokenPayload(token);

  if (!payload) {
    return null;
  }

  if (
    payload.exp &&
    payload.exp * 1000 < Date.now()
  ) {
    return null;
  }

  return String(
    payload.role || ""
  ).toUpperCase() || null;
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("novabank_token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

export function getRoleDestination(
  role?: string | null
) {
  return String(role || "").toUpperCase() ===
    "ADMIN"
    ? "/admin"
    : "/dashboard";
}

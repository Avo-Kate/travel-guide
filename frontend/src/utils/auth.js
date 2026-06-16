import { request } from "./api.js";

// POST /auth/register -> { token, user }. 409 if the email is taken.
export async function register(email, password) {
  return request("/auth/register", {
    body: { email, password },
    label: "Sign up",
  });
}

// POST /auth/login -> { token, user }. 401 on bad credentials.
export async function login(email, password) {
  return request("/auth/login", {
    body: { email, password },
    label: "Sign in",
  });
}

// GET /auth/me -> the current user for a token. Throws (status 401) if invalid.
export async function fetchMe(token) {
  return request("/auth/me", { method: "GET", token, label: "Session check" });
}

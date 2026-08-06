import { logoutUser } from "./actions";

/**
 * Logout page — runs the server action immediately on navigation.
 * The session cookie is httpOnly so it must be cleared server-side.
 */
export default async function LogoutPage() {
  await logoutUser();
  // logoutUser() calls redirect("/login") so this is unreachable,
  // but return something for the type system.
  return null;
}

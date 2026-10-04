import { Metadata } from "next";
import { ResetPasswordClient } from "./reset-password-client";

export const metadata: Metadata = {
  title: "Reset Password | VyntRise",
  description: "Set a new password for your VyntRise account.",
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}

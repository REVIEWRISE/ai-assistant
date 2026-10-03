import { Metadata } from "next";
import { ForgotPasswordClient } from "./forgot-password-client";

export const metadata: Metadata = {
  title: "Forgot Password | VyntRise",
  description: "Reset your VyntRise account password.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}

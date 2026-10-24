import AuthForm from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="hero-grid flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="signup" />
    </main>
  );
}

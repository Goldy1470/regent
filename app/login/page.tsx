import AuthForm from "@/components/auth-form";

export default function LoginPage() {
  return (
    <main className="hero-grid flex min-h-screen items-center justify-center px-4">
      <AuthForm mode="login" />
    </main>
  );
}

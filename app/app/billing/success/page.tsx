import Link from "next/link";
import { PartyPopper, Loader2 } from "lucide-react";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-5">
      <div className="panel max-w-md p-10 text-center">
        <PartyPopper className="mx-auto h-10 w-10 text-mint-500" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Checkout complete</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Dodo Payments is processing your subscription. Your plan activates the moment
          the <code className="font-mono text-volt-400">subscription.active</code> webhook
          lands — usually seconds, and this page will show it when you refresh.
        </p>
        <Link href="/app/billing" className="btn-primary mt-6 w-full !text-xs">
          <Loader2 className="h-3.5 w-3.5" /> Refresh billing status
        </Link>
        <Link href="/app/dashboard" className="mt-3 block text-xs text-zinc-500 hover:text-zinc-300">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

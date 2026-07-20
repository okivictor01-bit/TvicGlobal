import SubscriptionGate from "@/components/SubscriptionGate";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <SubscriptionGate>{children}</SubscriptionGate>;
}

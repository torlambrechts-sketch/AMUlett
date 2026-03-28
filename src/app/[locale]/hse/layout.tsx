import { HseSubnav } from "@/components/hse/hse-subnav";

export default function HseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <HseSubnav />
      {children}
    </div>
  );
}

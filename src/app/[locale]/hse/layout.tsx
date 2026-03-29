import { HsePdWrapper } from "@/components/hse/hse-pd-wrapper";

export default function HseLayout({ children }: { children: React.ReactNode }) {
  return <HsePdWrapper>{children}</HsePdWrapper>;
}

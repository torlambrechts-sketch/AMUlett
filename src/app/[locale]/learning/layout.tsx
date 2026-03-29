import { LearningRouteTheme } from "@/components/learning/learning-route-theme";

export default function LearningLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LearningRouteTheme />
      {children}
    </>
  );
}

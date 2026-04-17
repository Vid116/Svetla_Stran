import { LocalPipelineBanner } from "@/components/local-pipeline-banner";

export default function UrednikLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LocalPipelineBanner />
      {children}
    </>
  );
}

import { PhoneFrame } from "@/components/ui/PhoneFrame";
import { TabBar } from "@/components/ui/TabBar";

export default function ParticipantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PhoneFrame withTabs>{children}</PhoneFrame>
      <TabBar />
    </>
  );
}

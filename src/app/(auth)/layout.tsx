import { PhoneFrame } from "@/components/ui/PhoneFrame";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame>{children}</PhoneFrame>;
}

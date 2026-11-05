import Link from "next/link";
import { PhoneFrame } from "@/components/ui/PhoneFrame";

export default function NotFound() {
  return (
    <PhoneFrame>
      <h1 className="h1">Not found</h1>
      <p className="lead">This page doesn&apos;t exist or you don&apos;t have access to it.</p>
      <Link href="/quest" className="btn">
        Back to my quest
      </Link>
    </PhoneFrame>
  );
}

/** The rounded "phone" container from the prototype (full-bleed on small screens). */
export function PhoneFrame({ children, withTabs = false }: { children: React.ReactNode; withTabs?: boolean }) {
  return (
    <div className="phone">
      <main className={`px-5 pt-7 ${withTabs ? "pb-[110px]" : "pb-10"}`}>{children}</main>
    </div>
  );
}

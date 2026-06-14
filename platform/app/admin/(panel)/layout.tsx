import { redirect } from "next/navigation";
import { isAuthed, currentSession } from "../../../lib/auth";
import AdminNav from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) redirect("/admin/login");
  const session = currentSession();
  const role = session?.role ?? "OWNER";
  const name = session?.name ?? "Dueño";
  return (
    <div className="pos">
      <AdminNav role={role} name={name} />
      <div className="pos-body">{children}</div>
    </div>
  );
}

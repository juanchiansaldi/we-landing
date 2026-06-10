import { redirect } from "next/navigation";
import { isAuthed } from "../../../lib/auth";
import AdminNav from "../../../components/AdminNav";

export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthed()) redirect("/admin/login");
  return (
    <div className="pos">
      <AdminNav />
      <div className="pos-body">{children}</div>
    </div>
  );
}

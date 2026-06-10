import { posGuard } from "../../lib/pos";
import PosNav from "../../components/PosNav";

export const dynamic = "force-dynamic";

export default function PosLayout({ children }: { children: React.ReactNode }) {
  posGuard();
  return (
    <div className="pos">
      <PosNav />
      <div className="pos-body">{children}</div>
    </div>
  );
}

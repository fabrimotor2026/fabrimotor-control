import { ClipboardCheck, Info, Package, Timer, TrendingUp, Users } from "lucide-react";
import KPICard from "./KPICard";

export default function KPIGrid({ stats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <KPICard icon={<TrendingUp className="h-5 w-5" />} label="Ocupación" value={`${stats.percent}%`} detail={`${stats.completedBoxes}/${stats.targetBoxes} cajas`} />
      <KPICard icon={<Package className="h-5 w-5" />} label="Media piezas/caja" value={stats.averagePieces} detail="según cajas registradas" />
      <KPICard icon={<Users className="h-5 w-5" />} label="Último operario" value={stats.lastOperator} detail={stats.lastBoxTime} />
      <KPICard icon={<ClipboardCheck className="h-5 w-5" />} label="Última fabricación" value={stats.lastManufacturing} detail={`Caja ${stats.lastBoxNumber}`} />
      <KPICard icon={<Info className="h-5 w-5" />} label="Última colada" value={stats.lastHeat} detail="última caja" />
      <KPICard icon={<Timer className="h-5 w-5" />} label="Tiempo última caja" value={stats.elapsed} detail={`Caja ${stats.lastBoxNumber}`} />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Eye, Edit, TrendingUp, Package, AlertCircle, BarChart3 } from 'lucide-react';
import { getCommandes } from '@/services/commandes.service';
import { getArticles } from '@/services/articles.service';
import { getClients } from '@/services/clients.service';

export default function MoligeERPDashboard() {
  const [commandes, setCommandes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const criticalThreshold = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orders, items, customers] = await Promise.all([
        getCommandes(),
        getArticles(),
        getClients(),
      ]);
      setCommandes(orders);
      setArticles(items);
      setClients(customers);
    } finally {
      setLoading(false);
    }
  };

  const revenue = useMemo(
    () => commandes.reduce((sum, cmd) => sum + Number(cmd.montant_total || 0), 0),
    [commandes]
  );

  const ordersByMonth = useMemo(() => {
    const months = Array.from({ length: 12 }).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (11 - i));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('fr-FR', { month: 'short' }),
        count: 0,
        total: 0,
      };
    });

    commandes.forEach((cmd) => {
      if (!cmd.created_at) return;
      const date = new Date(cmd.created_at);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = months.find((m) => m.key === key);
      if (bucket) {
        bucket.count += 1;
        bucket.total += Number(cmd.montant_total || 0);
      }
    });

    return months;
  }, [commandes]);

  const maxOrders = Math.max(1, ...ordersByMonth.map((m) => m.count));
  const maxRevenue = Math.max(1, ...ordersByMonth.map((m) => m.total));

  const stockAlerts = articles.filter((a) => (a.quantite_stock ?? 0) <= criticalThreshold);
  const recentOrders = commandes.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-blue-700">Tableau de bord analytique</h1>
        <p className="text-sm text-gray-500">Analyse des commandes et suivi de la performance.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <div className="text-sm text-blue-600 font-medium">Chiffre d'affaires</div>
          <div className="text-3xl font-bold text-orange-500 mt-3">
            {loading ? '...' : `${revenue.toFixed(2)} €`}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total cumule</div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <div className="text-sm text-blue-600 font-medium">Commandes totales</div>
          <div className="text-3xl font-bold text-orange-500 mt-3">
            {loading ? '...' : commandes.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Toutes periodes</div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <div className="text-sm text-blue-600 font-medium">Articles critiques</div>
          <div className="text-3xl font-bold text-orange-500 mt-3">
            {loading ? '...' : stockAlerts.length}
          </div>
          <div className="text-xs text-gray-500 mt-1">Sous le seuil</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex items-center gap-2 text-blue-600">
            <BarChart3 size={18} />
            <h2 className="text-lg font-semibold">Analyse des commandes (12 mois)</h2>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-3 h-48">
              {ordersByMonth.map((month) => (
                <div key={month.key} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full rounded-t-md bg-blue-200"
                    style={{ height: `${(month.count / maxOrders) * 140}px` }}
                  />
                  <div className="text-xs text-gray-500">{month.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Volume des commandes mensuelles.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <div className="flex items-center gap-2 text-blue-600">
            <TrendingUp size={18} />
            <h2 className="text-lg font-semibold">Revenus mensuels</h2>
          </div>
          <div className="mt-6 space-y-3">
            {ordersByMonth.slice(-6).map((month) => (
              <div key={month.key} className="flex items-center gap-3">
                <div className="w-10 text-xs text-gray-500">{month.label}</div>
                <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400"
                    style={{ width: `${(month.total / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">{month.total.toFixed(1)}€</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex items-center gap-2 text-blue-600">
            <Package size={18} />
            <h2 className="text-lg font-semibold">Stocks sensibles</h2>
          </div>
          <div className="p-4 space-y-3 text-sm text-gray-600">
            {loading ? (
              <div>Chargement...</div>
            ) : stockAlerts.length ? (
              stockAlerts.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  {item.designation}
                  <span className="text-orange-500 font-semibold">{item.quantite_stock} restants</span>
                </div>
              ))
            ) : (
              <div>Aucune alerte stock.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex items-center gap-2 text-blue-600">
            <AlertCircle size={18} />
            <h2 className="text-lg font-semibold">Dernieres commandes</h2>
          </div>
          <div className="p-4 space-y-3 text-sm text-gray-600">
            {loading ? (
              <div>Chargement...</div>
            ) : recentOrders.length ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between">
                  {order.numero_commande}
                  <span className="text-orange-500 font-semibold">{order.client?.nom ?? '-'}</span>
                </div>
              ))
            ) : (
              <div>Aucune commande recente.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

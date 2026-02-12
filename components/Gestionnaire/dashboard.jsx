import { useEffect, useMemo, useState } from 'react';
import { Package, Users, ShoppingCart, AlertCircle } from 'lucide-react';
import { getCommandes } from '@/services/commandes.service';
import { getArticles } from '@/services/articles.service';
import { getClients } from '@/services/clients.service';

export default function GestionnaireDashboard() {
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

  const stockAlerts = useMemo(
    () => articles.filter((a) => (a.quantite_stock ?? 0) <= criticalThreshold),
    [articles]
  );

  const recentOrders = commandes.slice(0, 3);

  const stats = [
    { id: 1, label: 'Commandes', value: loading ? '...' : commandes.length, icon: ShoppingCart },
    { id: 2, label: 'Clients actifs', value: loading ? '...' : clients.length, icon: Users },
    { id: 3, label: 'Articles en stock', value: loading ? '...' : articles.length, icon: Package },
    { id: 4, label: 'Alertes stock', value: loading ? '...' : stockAlerts.length, icon: AlertCircle },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-blue-700">Tableau de bord</h1>
        <p className="text-sm text-gray-500">Suivi rapide des activites de gestion.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600 font-medium">{stat.label}</span>
                <Icon size={18} className="text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-orange-500 mt-3">{stat.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50">
            <h2 className="text-lg font-semibold text-blue-600">Commandes recentes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Numero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-6 text-sm text-gray-500 text-center">
                      Chargement...
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((commande) => (
                    <tr key={commande.id} className="hover:bg-blue-50/40">
                      <td className="px-6 py-4 text-sm text-gray-900">{commande.numero_commande}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{commande.client?.nom ?? '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{commande.statut}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <h2 className="text-lg font-semibold text-blue-600">A faire</h2>
          <ul className="mt-4 space-y-3 text-sm text-gray-600">
            <li className="flex items-center justify-between">
              Relancer les clients en attente
              <span className="text-orange-500 font-semibold">{loading ? '...' : commandes.filter((c) => c.statut === 'en_attente').length}</span>
            </li>
            <li className="flex items-center justify-between">
              Reapprovisionnement urgent
              <span className="text-orange-500 font-semibold">{loading ? '...' : stockAlerts.length}</span>
            </li>
            <li className="flex items-center justify-between">
              Documents a generer
              <span className="text-orange-500 font-semibold">{loading ? '...' : Math.min(commandes.length, 5)}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

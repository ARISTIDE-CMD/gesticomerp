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
  const [range, setRange] = useState('year');
  const [showOrders, setShowOrders] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);
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

  const ordersByBucket = useMemo(() => {
    const now = new Date();
    const buckets = [];

    const makeDayKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const makeMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

    if (range === 'week' || range === 'month') {
      const days = range === 'week' ? 7 : 30;
      for (let i = 0; i < days; i += 1) {
        const date = new Date(now);
        date.setDate(now.getDate() - (days - 1 - i));
        buckets.push({
          key: makeDayKey(date),
          label: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
          count: 0,
          total: 0,
        });
      }

      commandes.forEach((cmd) => {
        if (!cmd.created_at) return;
        const date = new Date(cmd.created_at);
        const key = makeDayKey(date);
        const bucket = buckets.find((b) => b.key === key);
        if (bucket) {
          bucket.count += 1;
          bucket.total += Number(cmd.montant_total || 0);
        }
      });

      return buckets;
    }

    const months = range === 'six_months' ? 6 : 12;
    for (let i = 0; i < months; i += 1) {
      const date = new Date();
      date.setMonth(now.getMonth() - (months - 1 - i));
      buckets.push({
        key: makeMonthKey(date),
        label: date.toLocaleString('fr-FR', { month: 'short' }),
        count: 0,
        total: 0,
      });
    }

    commandes.forEach((cmd) => {
      if (!cmd.created_at) return;
      const date = new Date(cmd.created_at);
      const key = makeMonthKey(date);
      const bucket = buckets.find((b) => b.key === key);
      if (bucket) {
        bucket.count += 1;
        bucket.total += Number(cmd.montant_total || 0);
      }
    });

    return buckets;
  }, [commandes, range]);

  const maxOrders = Math.max(1, ...ordersByBucket.map((m) => m.count));
  const maxRevenue = Math.max(1, ...ordersByBucket.map((m) => m.total));

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
          <div className="p-4 border-b border-blue-50 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-blue-600">
              <BarChart3 size={18} />
              <h2 className="text-lg font-semibold">Analyse des commandes</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowOrders((value) => !value)}
                aria-pressed={showOrders}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  showOrders ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-blue-300 border-blue-100'
                }`}
              >
                Commandes
              </button>
              <button
                type="button"
                onClick={() => setShowRevenue((value) => !value)}
                aria-pressed={showRevenue}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  showRevenue ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-orange-300 border-orange-100'
                }`}
              >
                Montant
              </button>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="border border-blue-100 rounded-md px-3 py-2 text-sm text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">Semaine</option>
                <option value="month">Mois</option>
                <option value="six_months">6 mois</option>
                <option value="year">Annee</option>
              </select>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto max-w-full">
              {(() => {
                const chartHeight = 200;
                const padding = 24;
                const labelWidth = 40;
                const chartWidth = Math.max(600, ordersByBucket.length * labelWidth);
                const step = ordersByBucket.length > 1
                  ? (chartWidth - 2 * padding) / (ordersByBucket.length - 1)
                  : 0;

                const buildSmoothPath = (pts) => {
                  if (!pts.length) return '';
                  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
                  let d = `M ${pts[0].x} ${pts[0].y}`;
                  for (let i = 0; i < pts.length - 1; i += 1) {
                    const p0 = pts[i - 1] || pts[i];
                    const p1 = pts[i];
                    const p2 = pts[i + 1];
                    const p3 = pts[i + 2] || p2;
                    const cp1x = p1.x + (p2.x - p0.x) / 6;
                    const cp1y = p1.y + (p2.y - p0.y) / 6;
                    const cp2x = p2.x - (p3.x - p1.x) / 6;
                    const cp2y = p2.y - (p3.y - p1.y) / 6;
                    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
                  }
                  return d;
                };

                const baseline = chartHeight - padding;
                const toPoints = (getValue, maxValue) =>
                  ordersByBucket.map((bucket, index) => {
                    const ratio = maxValue ? getValue(bucket) / maxValue : 0;
                    const x = padding + index * step;
                    const y = chartHeight - padding - ratio * (chartHeight - 2 * padding);
                    return { x, y };
                  });

                const countPoints = toPoints((bucket) => bucket.count, maxOrders);
                const revenuePoints = toPoints((bucket) => bucket.total, maxRevenue);

                const countPath = buildSmoothPath(countPoints);
                const revenuePath = buildSmoothPath(revenuePoints);
                const areaPath = showOrders && countPoints.length
                  ? `${countPath} L ${countPoints[countPoints.length - 1].x} ${baseline} L ${countPoints[0].x} ${baseline} Z`
                  : '';

                const handleMove = (event) => {
                  if (!ordersByBucket.length) return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  const x = event.clientX - rect.left;
                  if (ordersByBucket.length === 1) {
                    setHoverIndex(0);
                    return;
                  }
                  const idx = Math.round((x - padding) / step);
                  if (idx >= 0 && idx < ordersByBucket.length) {
                    setHoverIndex(idx);
                  } else {
                    setHoverIndex(null);
                  }
                };

                const hovered = hoverIndex !== null ? ordersByBucket[hoverIndex] : null;
                const hoverPoint = hoverIndex !== null ? countPoints[hoverIndex] : null;
                const tooltipLeft = hoverPoint
                  ? Math.min(Math.max(hoverPoint.x, 80), chartWidth - 80)
                  : 80;
                const tooltipTop = hoverPoint ? Math.max(hoverPoint.y - 70, 8) : 8;

                return (
                  <div className="min-w-max relative">
                    <svg
                      width={chartWidth}
                      height={chartHeight}
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="block"
                      onMouseMove={handleMove}
                      onMouseLeave={() => setHoverIndex(null)}
                    >
                      {showOrders && <path d={areaPath} fill="rgba(59, 130, 246, 0.12)" />}
                      {showOrders && (
                        <path
                          d={countPath}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                      {showRevenue && (
                        <path
                          d={revenuePath}
                          fill="none"
                          stroke="#f97316"
                          strokeWidth="3"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                      {showOrders && countPoints.map((point, idx) => (
                        <circle key={`c-${idx}`} cx={point.x} cy={point.y} r="3" fill="#3b82f6" />
                      ))}
                      {showRevenue && revenuePoints.map((point, idx) => (
                        <circle key={`r-${idx}`} cx={point.x} cy={point.y} r="3" fill="#f97316" />
                      ))}
                    </svg>
                    {hovered && (
                      <div
                        className="absolute bg-white border border-blue-100 shadow-md rounded-md px-3 py-2 text-xs text-gray-700"
                        style={{ left: tooltipLeft, top: tooltipTop, transform: 'translateX(-50%)' }}
                      >
                        <div className="font-medium text-gray-900">{hovered.label}</div>
                        {showOrders && (
                          <div className="text-blue-600">Commandes: {hovered.count}</div>
                        )}
                        {showRevenue && (
                          <div className="text-orange-600">Montant: {hovered.total.toFixed(2)} €</div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-6 rounded-full ${showOrders ? 'bg-blue-500' : 'bg-blue-200'}`} />
                        Commandes
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-6 rounded-full ${showRevenue ? 'bg-orange-500' : 'bg-orange-200'}`} />
                        Montant
                      </div>
                    </div>
                    <div
                      className="flex text-[10px] text-gray-500 mt-2"
                      style={{ width: chartWidth, paddingLeft: padding, paddingRight: padding }}
                    >
                      {ordersByBucket.map((bucket) => (
                        <div
                          key={bucket.key}
                          className="text-center whitespace-nowrap"
                          style={{ width: labelWidth }}
                        >
                          {bucket.label}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 text-xs text-gray-500">
              Volume des commandes sur la periode selectionnee.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5">
          <div className="flex items-center gap-2 text-blue-600">
            <TrendingUp size={18} />
            <h2 className="text-lg font-semibold">Revenus mensuels</h2>
          </div>
          <div className="mt-6 space-y-3">
            {ordersByBucket.slice(-6).map((bucket) => (
              <div key={bucket.key} className="flex items-center gap-3">
                <div className="w-10 text-xs text-gray-500">{bucket.label}</div>
                <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-400"
                    style={{ width: `${(bucket.total / maxRevenue) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500">{bucket.total.toFixed(1)}€</div>
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

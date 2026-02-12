import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Package, Users, BarChart3 } from 'lucide-react';
import { getCommandes } from '@/services/commandes.service';
import { getArticles } from '@/services/articles.service';
import { getClients } from '@/services/clients.service';
import { formatFCFA } from '@/lib/format';
import { syncStockAlerts } from '@/lib/notifications';

const studyRangeOptions = [
  { value: '30', label: '30 jours' },
  { value: '90', label: '3 mois' },
  { value: '180', label: '6 mois' },
  { value: '365', label: '12 mois' },
  { value: 'all', label: 'Tout' },
];

const filterCommandesByRange = (items, rangeValue) => {
  if (rangeValue === 'all') return items;
  const days = Number(rangeValue);
  if (!Number.isFinite(days) || days <= 0) return items;
  const sinceTs = Date.now() - days * 24 * 60 * 60 * 1000;
  return items.filter((item) => {
    if (!item?.created_at) return false;
    const createdTs = new Date(item.created_at).getTime();
    return Number.isFinite(createdTs) && createdTs >= sinceTs;
  });
};

export default function MoligeERPDashboard() {
  const [commandes, setCommandes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('year');
  const [showOrders, setShowOrders] = useState(true);
  const [showRevenue, setShowRevenue] = useState(true);
  const [hoverIndex, setHoverIndex] = useState(null);
  const [productStudyRange, setProductStudyRange] = useState('180');
  const [productMetric, setProductMetric] = useState('qty');
  const [productTop, setProductTop] = useState(5);
  const [clientStudyRange, setClientStudyRange] = useState('180');
  const [clientMetric, setClientMetric] = useState('revenue');
  const [clientTop, setClientTop] = useState(5);
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
      syncStockAlerts(items, -5, 'ADMIN');
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

  const topProducts = useMemo(() => {
    const scopedOrders = filterCommandesByRange(commandes, productStudyRange);
    const map = new Map();

    scopedOrders.forEach((commande) => {
      (commande.lignes ?? []).forEach((line) => {
        const article = line.article ?? {};
        const productId =
          article.id ||
          line.article_id ||
          `${article.reference ?? 'ref'}-${article.designation ?? 'article'}`;
        const qty = Number(line.quantite || 0);
        const lineTotal = qty * Number(line.prix_unitaire || 0);

        if (!map.has(productId)) {
          map.set(productId, {
            id: productId,
            designation: article.designation ?? 'Article sans designation',
            reference: article.reference ?? '-',
            qty: 0,
            revenue: 0,
            orderRefs: new Set(),
          });
        }

        const current = map.get(productId);
        current.qty += qty;
        current.revenue += lineTotal;
        current.orderRefs.add(commande.id);
      });
    });

    const rows = Array.from(map.values()).map((item) => ({
      ...item,
      orderCount: item.orderRefs.size,
    }));

    rows.sort((a, b) => {
      if (productMetric === 'revenue') return b.revenue - a.revenue;
      if (productMetric === 'orders') return b.orderCount - a.orderCount;
      return b.qty - a.qty;
    });

    return rows.slice(0, productTop);
  }, [commandes, productStudyRange, productMetric, productTop]);

  const topClients = useMemo(() => {
    const scopedOrders = filterCommandesByRange(commandes, clientStudyRange);
    const map = new Map();

    scopedOrders.forEach((commande) => {
      const clientId = commande.client?.id || commande.client_id || commande.client?.nom || 'client-inconnu';
      if (!map.has(clientId)) {
        map.set(clientId, {
          id: clientId,
          name: commande.client?.nom || 'Client inconnu',
          orders: 0,
          revenue: 0,
        });
      }

      const current = map.get(clientId);
      current.orders += 1;
      current.revenue += Number(commande.montant_total || 0);
    });

    const rows = Array.from(map.values()).map((item) => ({
      ...item,
      avgTicket: item.orders > 0 ? item.revenue / item.orders : 0,
    }));

    rows.sort((a, b) => {
      if (clientMetric === 'orders') return b.orders - a.orders;
      if (clientMetric === 'avg') return b.avgTicket - a.avgTicket;
      return b.revenue - a.revenue;
    });

    return rows.slice(0, clientTop);
  }, [commandes, clientStudyRange, clientMetric, clientTop]);

  const marketInsights = useMemo(() => {
    const totalOrders = commandes.length;
    const pendingOrders = commandes.filter((item) => item.statut === 'en_attente').length;
    const pendingRate = totalOrders ? (pendingOrders / totalOrders) * 100 : 0;
    const topClientRevenue = topClients[0]?.revenue || 0;
    const topClientShare = revenue ? (topClientRevenue / revenue) * 100 : 0;
    const topProductRevenue = topProducts[0]?.revenue || 0;
    const topProductShare = revenue ? (topProductRevenue / revenue) * 100 : 0;

    return [
      {
        title: 'Concentration clients',
        value: `${topClientShare.toFixed(1)}%`,
        text:
          topClientShare >= 35
            ? 'Dependance elevee au meilleur client: activez une strategie de diversification.'
            : 'Portefeuille clients relativement equilibre. Continuez la segmentation B2B/B2C.',
      },
      {
        title: 'Concentration produits',
        value: `${topProductShare.toFixed(1)}%`,
        text:
          topProductShare >= 25
            ? 'Un produit domine les ventes. Creez des offres associees pour augmenter le panier.'
            : 'Ventes reparties sur plusieurs produits. Opportunite de packs thematiques.',
      },
      {
        title: 'Fluidite commerciale',
        value: `${pendingRate.toFixed(1)}%`,
        text:
          pendingRate >= 25
            ? "Beaucoup de commandes en attente. Priorisez la validation et le suivi client."
            : 'Cycle de traitement sain. Testez des campagnes de relance automatique.',
      },
    ];
  }, [commandes, topClients, topProducts, revenue]);

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
            {loading ? '...' : formatFCFA(revenue, 2)}
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
                          <div className="text-orange-600">Montant: {formatFCFA(hovered.total, 2)}</div>
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
                <div className="text-xs text-gray-500">{formatFCFA(bucket.total, 1)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Package size={18} />
              <h2 className="text-lg font-semibold">Produits les plus achetes</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={productStudyRange}
                onChange={(e) => setProductStudyRange(e.target.value)}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {studyRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={productMetric}
                onChange={(e) => setProductMetric(e.target.value)}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="qty">Par quantite</option>
                <option value="revenue">Par chiffre</option>
                <option value="orders">Par frequence</option>
              </select>
              <select
                value={productTop}
                onChange={(e) => setProductTop(Number(e.target.value))}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm text-gray-600">
            {loading ? (
              <div>Chargement...</div>
            ) : topProducts.length ? (
              topProducts.map((item, index) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {index + 1}. {item.designation}
                    </div>
                    <div className="text-xs text-gray-500">Ref: {item.reference}</div>
                    <div className="text-xs text-gray-500">
                      {item.qty} unites | {item.orderCount} commandes | {formatFCFA(item.revenue, 2)}
                    </div>
                  </div>
                  <span className="text-orange-500 font-semibold whitespace-nowrap">
                    {productMetric === 'revenue'
                      ? formatFCFA(item.revenue, 2)
                      : productMetric === 'orders'
                        ? `${item.orderCount} cmd`
                        : `${item.qty} u`}
                  </span>
                </div>
              ))
            ) : (
              <div>Aucune donnee de vente sur la periode.</div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-600">
              <Users size={18} />
              <h2 className="text-lg font-semibold">Meilleurs clients</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={clientStudyRange}
                onChange={(e) => setClientStudyRange(e.target.value)}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {studyRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={clientMetric}
                onChange={(e) => setClientMetric(e.target.value)}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="revenue">Par chiffre</option>
                <option value="orders">Par commandes</option>
                <option value="avg">Par panier moyen</option>
              </select>
              <select
                value={clientTop}
                onChange={(e) => setClientTop(Number(e.target.value))}
                className="border border-blue-100 rounded-md px-2.5 py-1.5 text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>Top 5</option>
                <option value={8}>Top 8</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          </div>
          <div className="p-4 space-y-3 text-sm text-gray-600">
            {loading ? (
              <div>Chargement...</div>
            ) : topClients.length ? (
              topClients.map((item, index) => (
                <div key={item.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {index + 1}. {item.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {item.orders} commandes | Panier moyen: {formatFCFA(item.avgTicket, 2)}
                    </div>
                  </div>
                  <span className="text-orange-500 font-semibold whitespace-nowrap">
                    {clientMetric === 'orders'
                      ? `${item.orders} cmd`
                      : clientMetric === 'avg'
                        ? formatFCFA(item.avgTicket, 2)
                        : formatFCFA(item.revenue, 2)}
                  </span>
                </div>
              ))
            ) : (
              <div>Aucune commande cliente sur la periode.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50 flex items-center gap-2 text-blue-600">
          <TrendingUp size={18} />
          <h2 className="text-lg font-semibold">Pistes d'analyse du marche</h2>
        </div>
        <div className="p-4 grid gap-3 md:grid-cols-3">
          {marketInsights.map((insight) => (
            <div key={insight.title} className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
              <div className="text-xs text-blue-500">{insight.title}</div>
              <div className="text-xl font-semibold text-orange-500 mt-1">{insight.value}</div>
              <div className="text-xs text-gray-600 mt-1">{insight.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

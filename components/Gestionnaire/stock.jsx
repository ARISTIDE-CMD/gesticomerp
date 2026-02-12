import { useEffect, useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { getArticles } from '@/services/articles.service';

export default function GestionStocks() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const criticalThreshold = 10;

  useEffect(() => {
    loadStocks();
  }, []);

  const loadStocks = async () => {
    setLoading(true);
    try {
      const data = await getArticles();
      setStocks(data);
    } finally {
      setLoading(false);
    }
  };

  const filteredStocks = stocks.filter((stock) =>
    (stock.reference || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (stock.designation || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getQuantiteStyle = (quantite) => {
    if (quantite <= criticalThreshold) {
      return 'text-orange-600 font-semibold';
    }
    return 'text-gray-900';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Gestion des stocks</h1>
          <p className="text-sm text-gray-500">Surveillez les niveaux de stock et les alertes critiques.</p>
        </div>
        <button className="flex items-center gap-2 text-orange-500 font-medium">
          <AlertTriangle size={18} />
          Stocks faibles
        </button>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher par article ou reference..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-500">
            {loading ? 'Chargement...' : `${filteredStocks.length} articles`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Article</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Quantite</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Seuil critique</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Chargement des stocks...
                  </td>
                </tr>
              ) : (
                filteredStocks.map((stock) => (
                  <tr key={stock.id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-gray-900">{stock.reference}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{stock.designation}</td>
                    <td className={`px-6 py-4 text-sm ${getQuantiteStyle(stock.quantite_stock ?? 0)}`}>
                      {stock.quantite_stock}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{criticalThreshold}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

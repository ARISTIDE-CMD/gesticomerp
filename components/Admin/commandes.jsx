import { useEffect, useMemo, useState } from 'react';
import { Search, Eye, QrCode } from 'lucide-react';
import { getCommandes } from '@/services/commandes.service';
import { formatFCFA } from '@/lib/format';
import QrCodeModal from '@/components/QrCodeModal';

export default function AdminCommandes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrContext, setQrContext] = useState(null);
  const [hoveredCommandeInfoId, setHoveredCommandeInfoId] = useState(null);

  useEffect(() => {
    loadCommandes();
  }, []);

  const loadCommandes = async () => {
    setLoading(true);
    try {
      const data = await getCommandes();
      setCommandes(data);
    } finally {
      setLoading(false);
    }
  };

  const getStatutStyle = (statut) => {
    switch (statut) {
      case 'validee':
        return 'bg-green-100 text-green-700';
      case 'en_attente':
        return 'bg-orange-100 text-orange-700';
      case 'annulee':
        return 'bg-red-100 text-red-700';
      case 'livree':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return commandes.filter((commande) => {
      const numero = String(commande.numero_commande ?? '').toLowerCase();
      const clientName = String(commande.client?.nom ?? '').toLowerCase();
      const statut = String(commande.statut ?? '');
      const matchesSearch = !query || numero.includes(query) || clientName.includes(query);
      const matchesStatus = statusFilter === 'all' || statut === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [commandes, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedCommandes = filtered.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const openCommandeQr = (commande) => {
    const payload = {
      type: 'COMMANDE',
      id: commande.id,
      numero_commande: commande.numero_commande,
      client: commande.client?.nom || '',
      statut: commande.statut || '',
      montant_total: Number(commande.montant_total || 0),
      created_at: commande.created_at || null,
    };
    setQrContext({
      title: `QR Commande ${commande.numero_commande || ''}`.trim(),
      value: JSON.stringify(payload),
    });
  };

  const renderCommandeInfo = (commande) => (
    <div className="w-max max-w-[290px] rounded-lg border border-blue-100 bg-white shadow-xl p-3 text-xs text-gray-700 space-y-1">
      <div><span className="font-semibold text-blue-700">Numero:</span> {commande?.numero_commande ?? '-'}</div>
      <div><span className="font-semibold text-blue-700">Client:</span> {commande?.client?.nom ?? '-'}</div>
      <div><span className="font-semibold text-blue-700">Date:</span> {commande?.created_at ? new Date(commande.created_at).toLocaleDateString() : '-'}</div>
      <div><span className="font-semibold text-blue-700">Statut:</span> {commande?.statut ?? '-'}</div>
      <div><span className="font-semibold text-blue-700">Montant:</span> {commande?.montant_total ? formatFCFA(commande.montant_total, 2) : formatFCFA(0, 2)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Suivi des commandes</h1>
          <p className="text-sm text-gray-500">
            Vue en lecture seule pour l'administration. Les commandes sont enregistrees par les gestionnaires.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-4">
          <div className="text-sm text-blue-600">Total commandes</div>
          <div className="text-2xl font-semibold text-orange-500 mt-2">{commandes.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-4">
          <div className="text-sm text-blue-600">En attente</div>
          <div className="text-2xl font-semibold text-orange-500 mt-2">
            {commandes.filter((c) => c.statut === 'en_attente').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-4">
          <div className="text-sm text-blue-600">Validees</div>
          <div className="text-2xl font-semibold text-orange-500 mt-2">
            {commandes.filter((c) => c.statut === 'validee').length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tous les statuts</option>
            <option value="en_attente">En attente</option>
            <option value="validee">Validee</option>
            <option value="livree">Livree</option>
            <option value="annulee">Annulee</option>
          </select>
          <div className="text-sm text-gray-500">{loading ? 'Chargement...' : `${filtered.length} resultat(s)`}</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Numero</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : paginatedCommandes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Aucune commande ne correspond au filtre.
                  </td>
                </tr>
              ) : (
                paginatedCommandes.map((commande) => (
                  <tr key={commande.id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-gray-900">{commande.numero_commande}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{commande.client?.nom ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {commande.created_at ? new Date(commande.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 inline-flex text-xs font-semibold rounded-full ${getStatutStyle(commande.statut)}`}>
                        {commande.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {commande.montant_total ? formatFCFA(commande.montant_total, 2) : formatFCFA(0, 2)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <button
                            className="text-blue-500 hover:text-blue-700"
                            title="Voir"
                            onMouseEnter={() => setHoveredCommandeInfoId(commande.id)}
                            onMouseLeave={() => setHoveredCommandeInfoId(null)}
                            onWheel={() => setHoveredCommandeInfoId(commande.id)}
                          >
                            <Eye size={18} />
                          </button>
                          {hoveredCommandeInfoId === commande.id && (
                            <div className="absolute right-0 top-full mt-2 z-30">
                              {renderCommandeInfo(commande)}
                            </div>
                          )}
                        </div>
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          title="QR code"
                          onClick={() => openCommandeQr(commande)}
                        >
                          <QrCode size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <div>
            Total: {filtered.length} commande{filtered.length > 1 ? 's' : ''} (page {safePage}/{totalPages})
          </div>
          <div className="flex items-center gap-2">
            <span>Par page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-blue-200 rounded-md px-2 py-1 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1 rounded-md border border-blue-200 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100"
            >
              Precedent
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1 rounded-md border border-blue-200 text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-100"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>

      <QrCodeModal
        open={Boolean(qrContext)}
        onClose={() => setQrContext(null)}
        title={qrContext?.title}
        qrValue={qrContext?.value}
      />
    </div>
  );
}

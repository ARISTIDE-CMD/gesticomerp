import { useEffect, useState } from 'react';
import { Search, Eye, QrCode } from 'lucide-react';
import { getCommandes } from '@/services/commandes.service';
import { formatFCFA } from '@/lib/format';
import QrCodeModal from '@/components/QrCodeModal';

export default function AdminCommandes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrContext, setQrContext] = useState(null);

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

  const filtered = commandes.filter((commande) =>
    commande.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    commande.client?.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              ) : (
                filtered.map((commande) => (
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
                        <button className="text-blue-500 hover:text-blue-700" title="Voir">
                          <Eye size={18} />
                        </button>
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

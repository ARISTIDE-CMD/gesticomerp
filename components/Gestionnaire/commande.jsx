import { useEffect, useMemo, useState } from 'react';
import { Edit, Trash2, Plus } from 'lucide-react';
import { getClients } from '@/services/clients.service';
import { getArticles } from '@/services/articles.service';
import { createCommande, getCommandes, deleteCommande } from '@/services/commandes.service';

const generateNumero = () => {
  const now = new Date();
  const y = now.getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CMD-${y}-${rand}`;
};

export default function GestionCommandes() {
  const [commandes, setCommandes] = useState([]);
  const [clients, setClients] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [newOrder, setNewOrder] = useState({
    client_id: '',
    lignes: [{ id: 1, article_id: '', prix: 0, quantite: 1 }],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clientsData, articlesData, commandesData] = await Promise.all([
        getClients(),
        getArticles(),
        getCommandes(),
      ]);
      setClients(clientsData);
      setArticles(articlesData);
      setCommandes(commandesData);
    } finally {
      setLoading(false);
    }
  };

  const total = useMemo(
    () => newOrder.lignes.reduce((sum, line) => sum + line.prix * line.quantite, 0),
    [newOrder]
  );

  const handleQty = (id, value) => {
    setNewOrder((prev) => ({
      ...prev,
      lignes: prev.lignes.map((line) =>
        line.id === id ? { ...line, quantite: Math.max(1, Number(value) || 1) } : line
      ),
    }));
  };

  const handleArticleChange = (id, articleId) => {
    const article = articles.find((a) => a.id === articleId);
    setNewOrder((prev) => ({
      ...prev,
      lignes: prev.lignes.map((line) =>
        line.id === id
          ? { ...line, article_id: articleId, prix: article?.prix_unitaire ?? 0 }
          : line
      ),
    }));
  };

  const addLine = () => {
    setNewOrder((prev) => ({
      ...prev,
      lignes: [...prev.lignes, { id: Date.now(), article_id: '', prix: 0, quantite: 1 }],
    }));
  };

  const removeLine = (id) => {
    setNewOrder((prev) => ({
      ...prev,
      lignes: prev.lignes.filter((line) => line.id !== id),
    }));
  };

  const handleCreate = async (statut) => {
    setSaving(true);
    setError('');
    try {
      if (!newOrder.client_id) {
        throw new Error('Veuillez selectionner un client.');
      }
      const lignes = newOrder.lignes
        .filter((l) => l.article_id)
        .map((l) => ({ article_id: l.article_id, quantite: l.quantite, prix: l.prix }));

      if (lignes.length === 0) {
        throw new Error('Ajoutez au moins un article.');
      }

      await createCommande(
        {
          numero_commande: generateNumero(),
          statut,
          client_id: newOrder.client_id,
        },
        lignes
      );

      await loadData();
      setNewOrder({ client_id: '', lignes: [{ id: Date.now(), article_id: '', prix: 0, quantite: 1 }] });
    } catch (e) {
      setError(e.message || 'Erreur lors de la creation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer cette commande ?')) {
      deleteCommande(id)
        .then(loadData)
        .catch((e) => setError(e.message || 'Erreur lors de la suppression.'));
    }
  };

  const getStatutStyle = (statut) => {
    switch (statut) {
      case 'validee':
        return 'bg-green-100 text-green-700';
      case 'en_attente':
        return 'bg-orange-100 text-orange-700';
      case 'livree':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Gestion des commandes</h1>
          <p className="text-sm text-gray-500">Creation et suivi des commandes clients.</p>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={() => handleCreate('en_attente')}
          disabled={saving}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle commande
        </button>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50">
          <h2 className="text-lg font-semibold text-blue-600">Creation d'une commande</h2>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client</label>
              <select
                value={newOrder.client_id}
                onChange={(e) => setNewOrder({ ...newOrder, client_id: e.target.value })}
                className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selectionner un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Article</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Prix</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Quantite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {newOrder.lignes.map((line) => (
                  <tr key={line.id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <select
                        value={line.article_id}
                        onChange={(e) => handleArticleChange(line.id, e.target.value)}
                        className="w-full border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selectionner</option>
                        {articles.map((article) => (
                          <option key={article.id} value={article.id}>
                            {article.designation}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{line.prix.toFixed(2)} €</td>
                    <td className="px-4 py-3 text-sm">
                      <input
                        type="number"
                        min="1"
                        value={line.quantite}
                        onChange={(e) => handleQty(line.id, e.target.value)}
                        className="w-20 border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {(line.prix * line.quantite).toFixed(2)} €
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-orange-500 hover:text-orange-600"
                        onClick={() => removeLine(line.id)}
                        title="Supprimer ligne"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="flex items-center gap-2 text-blue-600 text-sm font-medium"
            onClick={addLine}
          >
            <Plus size={16} /> Ajouter une ligne
          </button>

          <div className="flex items-center justify-between border-t border-blue-50 pt-4">
            <div className="text-sm text-gray-500">Total commande</div>
            <div className="text-xl font-semibold text-orange-500">{total.toFixed(2)} €</div>
          </div>

          {error && (
            <div className="text-sm text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-60"
              onClick={() => handleCreate('en_attente')}
              disabled={saving}
            >
              Enregistrer
            </button>
            <button
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-60"
              onClick={() => handleCreate('validee')}
              disabled={saving}
            >
              Valider
            </button>
            <button
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition-colors"
              onClick={() => setNewOrder({ client_id: '', lignes: [{ id: Date.now(), article_id: '', prix: 0, quantite: 1 }] })}
            >
              Annuler
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Numero</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Actions</th>
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
                commandes.map((commande) => (
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
                      {commande.montant_total ? Number(commande.montant_total).toFixed(2) : '0.00'} €
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-500 hover:text-blue-700" title="Modifier">
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-orange-500 hover:text-orange-600"
                          onClick={() => handleDelete(commande.id)}
                          title="Supprimer"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
}

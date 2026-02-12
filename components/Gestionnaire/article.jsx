import { useEffect, useState } from 'react';
import { Edit, Trash2, Package, X } from 'lucide-react';
import { getArticles, createArticle, updateArticle, deleteArticle } from '@/services/articles.service';

export default function GestionArticles() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [reference, setReference] = useState('');
  const [designation, setDesignation] = useState('');
  const [prixUnitaire, setPrixUnitaire] = useState('');
  const [quantiteStock, setQuantiteStock] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setLoading(true);
    try {
      const data = await getArticles();
      setArticles(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError('');
    setCreating(true);
    try {
      await createArticle({
        reference,
        designation,
        prix_unitaire: Number(prixUnitaire) || 0,
        quantite_stock: Number(quantiteStock) || 0,
      });
      await loadArticles();
      setShowModal(false);
      setReference('');
      setDesignation('');
      setPrixUnitaire('');
      setQuantiteStock('');
    } catch (e) {
      setError(e.message || 'Erreur lors de la creation.');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setReference(article.reference ?? article.ref ?? '');
    setDesignation(article.designation ?? article.nom ?? '');
    setPrixUnitaire(String(article.prix_unitaire ?? article.prix ?? ''));
    setQuantiteStock(String(article.quantite_stock ?? article.quantite ?? ''));
  };

  const handleUpdate = async () => {
    if (!editingArticle) return;
    setError('');
    setUpdating(true);
    try {
      await updateArticle(editingArticle.id, {
        reference,
        designation,
        prix_unitaire: Number(prixUnitaire) || 0,
        quantite_stock: Number(quantiteStock) || 0,
      });
      await loadArticles();
      setEditingArticle(null);
      setReference('');
      setDesignation('');
      setPrixUnitaire('');
      setQuantiteStock('');
    } catch (e) {
      setError(e.message || 'Erreur lors de la modification.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer cet article ?')) {
      deleteArticle(id)
        .then(loadArticles)
        .catch((e) => {
          setError(e.message || 'Erreur lors de la suppression.');
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Gestion des articles</h1>
          <p className="text-sm text-gray-500">Suivez vos references, prix et quantites en stock.</p>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={() => setShowModal(true)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un article
        </button>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50 flex items-center gap-2 text-blue-600">
          <Package size={20} />
          <span className="font-medium">Liste des articles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Prix</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Quantite</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Chargement des articles...
                  </td>
                </tr>
              ) : (
                articles.map((article) => (
                  <tr key={article.id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {article.reference ?? article.ref}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {article.designation ?? article.nom}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {Number(article.prix_unitaire ?? article.prix).toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {article.quantite_stock ?? article.quantite}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          title="Modifier"
                          onClick={() => handleEdit(article)}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-orange-500 hover:text-orange-600"
                          onClick={() => handleDelete(article.id)}
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

        <div className="px-6 py-4 bg-blue-50 border-t border-blue-100 text-sm text-gray-600">
          Total: {articles.length} article{articles.length > 1 ? 's' : ''}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50">
              <h2 className="text-lg font-semibold text-blue-700">Nouvel article</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="REF-0001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom de l'article"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantite</label>
                  <input
                    type="number"
                    min="0"
                    value={quantiteStock}
                    onChange={(e) => setQuantiteStock(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-blue-50 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md text-blue-600 border border-blue-200 hover:bg-blue-50"
                onClick={() => setShowModal(false)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                onClick={handleCreate}
                disabled={creating}
              >
                {creating ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingArticle && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50">
              <h2 className="text-lg font-semibold text-blue-700">Modifier l'article</h2>
              <button onClick={() => setEditingArticle(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference</label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Designation</label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix unitaire</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantite</label>
                  <input
                    type="number"
                    min="0"
                    value={quantiteStock}
                    onChange={(e) => setQuantiteStock(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-blue-50 flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md text-blue-600 border border-blue-200 hover:bg-blue-50"
                onClick={() => setEditingArticle(null)}
              >
                Annuler
              </button>
              <button
                className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-60"
                onClick={handleUpdate}
                disabled={updating}
              >
                {updating ? 'Mise a jour...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { FileText, Download, Eye, Upload, Trash2, X } from 'lucide-react';
import { getDocuments, createDocument, deleteDocument } from '@/services/documents.service';
import { getCommandes } from '@/services/commandes.service';

const typeLabel = (type) => {
  switch (type) {
    case 'facture':
      return 'Facture';
    case 'proforma':
      return 'Facture pro-forma';
    case 'bon_livraison':
      return 'Bon de livraison';
    default:
      return 'Document';
  }
};

export default function GestionDocuments() {
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [typeDocument, setTypeDocument] = useState('proforma');
  const [commandeId, setCommandeId] = useState('');
  const [fichierUrl, setFichierUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docs, orders] = await Promise.all([getDocuments(), getCommandes()]);
      setDocuments(docs);
      setCommandes(orders);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await createDocument({
        type_document: typeDocument,
        commande_id: commandeId || null,
        fichier_url: fichierUrl || null,
      });
      await loadData();
      setShowModal(false);
      setCommandeId('');
      setFichierUrl('');
      setTypeDocument('proforma');
    } catch (e) {
      setError(e.message || 'Erreur lors de la creation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce document ?')) {
      deleteDocument(id)
        .then(loadData)
        .catch((e) => setError(e.message || 'Erreur lors de la suppression.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Documents</h1>
          <p className="text-sm text-gray-500">Factures pro-forma et bons de livraison.</p>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Upload size={18} />
          Generer un document
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-lg border border-blue-50 shadow-sm">
          <div className="p-4 border-b border-blue-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-blue-600">Liste des documents</h2>
            <div className="text-sm text-gray-500">
              {loading ? 'Chargement...' : `${documents.length} documents`}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Reference</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-6 text-sm text-gray-500 text-center">
                      Chargement des documents...
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-blue-50/40 cursor-pointer ${selectedDocument?.id === doc.id ? 'bg-blue-50/60' : ''}`}
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText size={18} className="text-orange-500" />
                          <div>
                            <div className="text-sm font-medium text-orange-600">{typeLabel(doc.type_document)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.commande?.numero_commande ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{doc.commande?.client?.nom ?? '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-blue-600">
                        {doc.commande?.montant_total ? `${Number(doc.commande.montant_total).toFixed(2)} €` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button className="text-blue-500 hover:text-blue-700" title="Telecharger">
                            <Download size={18} />
                          </button>
                          <button className="text-blue-500 hover:text-blue-700" title="Voir">
                            <Eye size={18} />
                          </button>
                          <button
                            className="text-orange-500 hover:text-orange-600"
                            title="Supprimer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc.id);
                            }}
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

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-blue-600 mb-4">Apercu du document</h3>

          {selectedDocument ? (
            <div className="space-y-4">
              <div className="flex justify-center">
                <FileText size={80} className="text-blue-500" />
              </div>
              <div className="space-y-2 text-sm text-gray-700 bg-blue-50/50 p-4 rounded">
                <div><span className="font-semibold">Type:</span> {typeLabel(selectedDocument.type_document)}</div>
                <div><span className="font-semibold">Commande:</span> {selectedDocument.commande?.numero_commande ?? '-'}</div>
                <div><span className="font-semibold">Client:</span> {selectedDocument.commande?.client?.nom ?? '-'}</div>
                <div><span className="font-semibold">Montant:</span> {selectedDocument.commande?.montant_total ? `${Number(selectedDocument.commande.montant_total).toFixed(2)} €` : '-'}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText size={80} className="text-gray-300 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                Selectionnez un document pour afficher son apercu ici.
              </p>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50">
              <h2 className="text-lg font-semibold text-blue-700">Generer un document</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={typeDocument}
                  onChange={(e) => setTypeDocument(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="facture">Facture</option>
                  <option value="proforma">Facture pro-forma</option>
                  <option value="bon_livraison">Bon de livraison</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Commande</label>
                <select
                  value={commandeId}
                  onChange={(e) => setCommandeId(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectionner une commande</option>
                  {commandes.map((commande) => (
                    <option key={commande.id} value={commande.id}>
                      {commande.numero_commande} - {commande.client?.nom ?? 'Client'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL du fichier (optionnel)</label>
                <input
                  type="text"
                  value={fichierUrl}
                  onChange={(e) => setFichierUrl(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
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
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Generer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

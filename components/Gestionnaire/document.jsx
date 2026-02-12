import { useEffect, useRef, useState } from 'react';
import { FileText, Download, Eye, Upload, Trash2, X } from 'lucide-react';
import { createDocument, deleteDocument, getDocuments, uploadDocumentFile } from '@/services/documents.service';
import { getCommandes } from '@/services/commandes.service';
import { formatFCFA } from '@/lib/format';
import { generateOrderPdf } from '@/lib/document-pdf';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const localUrlsRef = useRef(new Set());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => () => {
    localUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    localUrlsRef.current.clear();
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
      if (!commandeId) {
        throw new Error('Veuillez selectionner une commande.');
      }

      const commande = commandes.find((item) => item.id === commandeId);
      if (!commande) {
        throw new Error('Commande introuvable.');
      }

      const { bytes, blob, fileName } = await generateOrderPdf({
        typeDocument,
        commande,
      });

      const localUrl = URL.createObjectURL(blob);
      localUrlsRef.current.add(localUrl);

      const localDoc = {
        id: `local-${Date.now()}`,
        type_document: typeDocument,
        commande_id: commande.id,
        commande,
        created_at: new Date().toISOString(),
        fichier_url: localUrl,
      };

      setDocuments((prev) => [localDoc, ...prev]);
      setSelectedDocument(localDoc);
      setShowModal(false);
      setCommandeId('');
      setTypeDocument('proforma');

      try {
        const filePath = `documents/${commande.id}/${Date.now()}-${fileName}`;
        const publicUrl = await uploadDocumentFile(filePath, bytes);
        const created = await createDocument({
          type_document: typeDocument,
          commande_id: commande.id,
          fichier_url: publicUrl,
        });

        const persistedDoc = { ...created, commande };
        setDocuments((prev) => [persistedDoc, ...prev.filter((doc) => doc.id !== localDoc.id)]);
        setSelectedDocument(persistedDoc);
        URL.revokeObjectURL(localUrl);
        localUrlsRef.current.delete(localUrl);
      } catch (persistError) {
        setError(`PDF genere localement. Synchronisation serveur impossible: ${persistError.message || 'Erreur inconnue.'}`);
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la creation.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (doc) => {
    if (window.confirm('Supprimer ce document ?')) {
      if (String(doc.id).startsWith('local-')) {
        if (doc.fichier_url) {
          URL.revokeObjectURL(doc.fichier_url);
          localUrlsRef.current.delete(doc.fichier_url);
        }
        setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
        if (selectedDocument?.id === doc.id) {
          setSelectedDocument(null);
        }
        return;
      }

      deleteDocument(doc.id)
        .then(async () => {
          if (selectedDocument?.id === doc.id) {
            setSelectedDocument(null);
          }
          await loadData();
        })
        .catch((e) => setError(e.message || 'Erreur lors de la suppression.'));
    }
  };

  const handleDownload = (doc) => {
    if (!doc?.fichier_url) return;
    const fileName = `${doc.type_document || 'document'}-${doc.commande?.numero_commande || 'commande'}.pdf`;
    const link = document.createElement('a');
    link.href = doc.fichier_url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.click();
  };

  const handlePreview = (doc) => {
    if (!doc?.fichier_url) return;
    window.open(doc.fichier_url, '_blank', 'noopener,noreferrer');
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

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="bg-white rounded-lg border border-blue-50 shadow-sm flex flex-col xl:h-[calc(100vh-220px)]">
          <div className="p-4 border-b border-blue-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-blue-600">Liste des documents</h2>
            <div className="text-sm text-gray-500">
              {loading ? 'Chargement...' : `${documents.length} documents`}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="bg-blue-50 sticky top-0 z-10">
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
                        {doc.commande?.montant_total != null ? formatFCFA(doc.commande.montant_total, 2) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            className="text-blue-500 hover:text-blue-700"
                            title="Telecharger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(doc);
                            }}
                          >
                            <Download size={18} />
                          </button>
                          <button
                            className="text-blue-500 hover:text-blue-700"
                            title="Voir"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDocument(doc);
                            }}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            className="text-orange-500 hover:text-orange-600"
                            title="Supprimer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(doc);
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

        <div className="bg-white rounded-lg border border-blue-50 shadow-sm p-5 xl:h-[calc(100vh-220px)] xl:sticky xl:top-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-blue-700">Visionneuse document</h3>
              <p className="text-xs text-gray-500">Cliquez sur une ligne pour afficher son contenu</p>
            </div>
            {selectedDocument && (
              <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
                {typeLabel(selectedDocument.type_document)}
              </span>
            )}
          </div>

          {selectedDocument ? (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-blue-50 p-2">
                  <div className="text-blue-500 font-medium">Commande</div>
                  <div className="text-gray-800">{selectedDocument.commande?.numero_commande ?? '-'}</div>
                </div>
                <div className="rounded-md bg-blue-50 p-2">
                  <div className="text-blue-500 font-medium">Client</div>
                  <div className="text-gray-800 truncate">{selectedDocument.commande?.client?.nom ?? '-'}</div>
                </div>
                <div className="rounded-md bg-blue-50 p-2">
                  <div className="text-blue-500 font-medium">Date</div>
                  <div className="text-gray-800">
                    {selectedDocument.created_at ? new Date(selectedDocument.created_at).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div className="rounded-md bg-orange-50 p-2">
                  <div className="text-orange-600 font-medium">Montant</div>
                  <div className="text-gray-800 font-semibold">
                    {selectedDocument.commande?.montant_total != null ? formatFCFA(selectedDocument.commande.montant_total, 2) : '-'}
                  </div>
                </div>
              </div>

              {selectedDocument.fichier_url ? (
                <>
                  <iframe
                    title="Apercu PDF"
                    src={selectedDocument.fichier_url}
                    className="w-full flex-1 min-h-[280px] border border-blue-100 rounded-lg bg-white"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => handlePreview(selectedDocument)}
                    >
                      <Eye size={16} />
                      Ouvrir
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-orange-500 text-white hover:bg-orange-600"
                      onClick={() => handleDownload(selectedDocument)}
                    >
                      <Download size={16} />
                      Telecharger
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-blue-200 text-sm text-gray-500">
                  Aucun PDF attache
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center rounded-lg border border-dashed border-blue-200 bg-blue-50/30">
              <FileText size={58} className="text-blue-300 mb-3" />
              <p className="text-sm text-gray-600">Selectionnez un document a gauche</p>
              <p className="text-xs text-gray-500 mt-1">Le contenu s'affichera ici</p>
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

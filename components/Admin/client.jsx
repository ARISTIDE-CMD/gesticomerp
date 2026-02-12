import { useEffect, useState } from 'react';
import { Edit, Trash2, Search, X } from 'lucide-react';
import { getClients, createClient, updateClient, deleteClient } from '@/services/clients.service';

export default function GestionClients() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [adresse, setAdresse] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await getClients();
      setClients(data);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Etes-vous sur de vouloir supprimer ce client ?')) {
      deleteClient(id)
        .then(loadClients)
        .catch((e) => setError(e.message || 'Erreur lors de la suppression.'));
    }
  };

  const openCreate = () => {
    setEditingClient(null);
    setNom('');
    setTelephone('');
    setAdresse('');
    setError('');
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setNom(client.nom || '');
    setTelephone(client.telephone || '');
    setAdresse(client.adresse || '');
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingClient) {
        await updateClient(editingClient.id, { nom, telephone, adresse });
      } else {
        await createClient({ nom, telephone, adresse });
      }
      await loadClients();
      setShowModal(false);
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.telephone?.includes(searchTerm) ||
    client.adresse?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Gestion des clients</h1>
          <p className="text-sm text-gray-500">Consultez et mettez a jour votre base clients.</p>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={openCreate}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Ajouter un client
        </button>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="p-4 border-b border-blue-50 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="text-sm text-gray-500">
            {loading ? 'Chargement...' : `${filteredClients.length} client${filteredClients.length > 1 ? 's' : ''}`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Telephone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Adresse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Chargement des clients...
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-gray-900">{client.nom}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.telephone}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{client.adresse}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          title="Modifier"
                          onClick={() => openEdit(client)}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-orange-500 hover:text-orange-600"
                          onClick={() => handleDelete(client.id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-blue-50">
              <h2 className="text-lg font-semibold text-blue-700">
                {editingClient ? 'Modifier le client' : 'Nouveau client'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom complet"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telephone</label>
                <input
                  type="text"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="06 00 00 00 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
                <textarea
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Adresse"
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
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

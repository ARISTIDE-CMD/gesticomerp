import { useEffect, useState } from 'react';
import { Edit, Trash2, UserPlus, X } from 'lucide-react';
import { getUsers, updateUser, deleteUser } from '@/services/users.service';

export default function GestionUtilisateurs() {
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('GESTIONNAIRE');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setFullName(user.full_name || '');
    setRole(user.role || 'GESTIONNAIRE');
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) {
      setError("Creation utilisateur indisponible ici. Utilisez le back-end Supabase Admin.");
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateUser(editingUser.id, { full_name: fullName, role });
      await loadUsers();
      setShowModal(false);
    } catch (e) {
      setError(e.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Supprimer ce profil utilisateur ?')) {
      deleteUser(id)
        .then(loadUsers)
        .catch((e) => setError(e.message || 'Erreur lors de la suppression.'));
    }
  };

  const roleBadge = (value) =>
    value === 'ADMIN'
      ? 'bg-blue-100 text-blue-700'
      : 'bg-orange-100 text-orange-700';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-700">Gestion des utilisateurs</h1>
          <p className="text-sm text-gray-500">Administrez les acces et roles de l'equipe.</p>
        </div>
        <button
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          onClick={() => {
            setEditingUser(null);
            setFullName('');
            setRole('GESTIONNAIRE');
            setError("Creation utilisateur indisponible ici. Utilisez le back-end Supabase Admin.");
            setShowModal(true);
          }}
        >
          <UserPlus size={18} />
          Ajouter un utilisateur
        </button>
      </div>

      <div className="bg-white rounded-lg border border-blue-50 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Nom</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-blue-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-6 text-sm text-gray-500 text-center">
                    Chargement des utilisateurs...
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.full_name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{user.id?.slice(0, 8)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          className="text-blue-500 hover:text-blue-700"
                          title="Modifier"
                          onClick={() => openEdit(user)}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-orange-500 hover:text-orange-600"
                          title="Supprimer"
                          onClick={() => handleDelete(user.id)}
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
                {editingUser ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
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
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nom complet"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="GESTIONNAIRE">GESTIONNAIRE</option>
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
                onClick={handleSave}
                disabled={saving || !editingUser}
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

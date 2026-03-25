import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Edit2, Trash2, Heart, Star, Loader2, Upload, X } from 'lucide-react';
import { buildApiUrl } from '../utils/apiBase';
import { formatCurrencyINR } from '../utils/currency';

const emptyForm = {
  name: '',
  description: '',
  logo_url: '',
  image_url: '',
  upcoming_events: '',
  is_spotlight: false,
  total_raised: 0,
};

export default function AdminCharityManager({ isDark }) {
  const { session } = useAuth();
  const [charities, setCharities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCharity, setEditingCharity] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState('');
  const [uploadingField, setUploadingField] = useState('');

  const fetchCharities = useCallback(async () => {
    try {
      const response = await fetch(buildApiUrl('/admin/charities'), {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      const data = await response.json();
      setCharities(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session) {
      fetchCharities();
    }
  }, [session, fetchCharities]);

  const uploadAsset = async (file, field) => {
    if (!file) {
      return;
    }

    setUploadingField(field);
    setError('');

    try {
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
      });

      const response = await fetch(buildApiUrl('/admin/storage/charity-assets/upload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          file_name: file.name,
          file_data: fileData,
          field,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setFormData((current) => ({
        ...current,
        [field]: data?.public_url || '',
      }));
    } catch (uploadError) {
      setError(uploadError.message || 'Failed to upload image');
    } finally {
      setUploadingField('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const method = editingCharity ? 'PUT' : 'POST';
    const url = editingCharity 
      ? buildApiUrl(`/admin/charities/${editingCharity.id}`)
      : buildApiUrl('/admin/charities');

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          total_raised: Number(formData.total_raised) || 0,
          upcoming_events: formData.upcoming_events,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save charity');
      }

      await fetchCharities();
      closeModal();
    } catch (error) {
      setError(error.message);
    }
  };

  const deleteCharity = async (id) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetch(buildApiUrl(`/admin/charities/${id}`), { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      setCharities(charities.filter(c => c.id !== id));
    } catch (error) {
      console.error(error);
    }
  };


  const openModal = (charity = null) => {
    if (charity) {
      setEditingCharity(charity);
      setFormData({
        name: charity.name,
        description: charity.description || '',
        logo_url: charity.logo_url || '',
        image_url: charity.image_url || '',
        upcoming_events: Array.isArray(charity.upcoming_events) ? charity.upcoming_events.join('\n') : '',
        is_spotlight: Boolean(charity.is_spotlight),
        total_raised: charity.total_raised || 0,
      });
    } else {
      setEditingCharity(null);
      setFormData(emptyForm);
    }
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCharity(null);
    setFormData(emptyForm);
    setError('');
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-500" size={40} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Charity Directory</h2>
        <button onClick={() => openModal()} className="btn-primary flex items-center gap-2 !py-2.5">
          <Plus size={18} /> Add Charity
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {charities.map((charity) => (
          <div key={charity.id} className={`glass-card p-6 rounded-2xl border flex flex-col ${isDark ? 'bg-dark-card border-dark-border' : 'bg-white border-light-border shadow-sm'}`}>
            {charity.image_url && (
              <div className="mb-4 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src={charity.image_url}
                  alt={charity.name}
                  className="h-40 w-full object-cover"
                />
              </div>
            )}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand-500/10 to-brand-500/20 flex items-center justify-center shrink-0 border border-brand-500/10">
                {charity.logo_url ? (
                  <img src={charity.logo_url} alt={charity.name} className="w-10 h-10 object-contain" />
                ) : (
                  <Heart className="text-brand-500" size={24} />
                )}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg">{charity.name}</h3>
                  {charity.is_spotlight && (
                    <span className="p-1 rounded bg-amber-500/10 text-amber-500" title="Spotlight Charity">
                      <Star size={14} fill="currentColor" />
                    </span>
                  )}
                </div>
                <p className={`text-sm line-clamp-2 ${isDark ? 'text-gray-400' : 'text-light-subtext'}`}>
                  {charity.description}
                </p>
              </div>
            </div>

            {Array.isArray(charity.upcoming_events) && charity.upcoming_events.length > 0 && (
              <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isDark ? 'border-dark-border bg-dark-bg/60 text-gray-300' : 'border-light-border bg-gray-50 text-light-text'}`}>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-brand-500">Upcoming Events</div>
                <ul className="space-y-1">
                  {charity.upcoming_events.slice(0, 3).map((event) => (
                    <li key={event} className="truncate">{event}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs font-medium text-brand-500 flex items-center gap-1">
                Raised: {formatCurrencyINR(charity.total_raised || 0)}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => openModal(charity)} className="p-2 rounded-lg hover:bg-white/5 text-gray-400 transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => deleteCharity(charity.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500/60 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-3xl max-h-[88vh] overflow-hidden rounded-3xl border shadow-2xl ${isDark ? 'bg-dark-bg border-dark-border' : 'bg-white border-light-border'}`}>
            <div className={`flex justify-between items-center px-6 py-5 border-b ${isDark ? 'border-dark-border' : 'border-light-border'}`}>
              <h3 className="text-2xl font-bold">{editingCharity ? 'Edit Charity' : 'Add New Charity'}</h3>
              <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/10"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex max-h-[calc(88vh-84px)] flex-col">
              <div className="overflow-y-auto px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Charity Name</label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Description</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Logo URL</label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                        isDark ? 'bg-dark-card border border-dark-border hover:bg-dark-hover' : 'bg-gray-100 border border-light-border hover:bg-gray-200'
                      }`}>
                        {uploadingField === 'logo_url' ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        Upload Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField === 'logo_url'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadAsset(file, 'logo_url');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {formData.logo_url && (
                        <img
                          src={formData.logo_url}
                          alt="Logo preview"
                          className="h-12 w-12 rounded-xl border border-white/10 object-contain bg-white/5 p-1"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Banner Image URL</label>
                    <input
                      type="url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                    <div className="mt-3 flex items-center gap-3">
                      <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition-colors ${
                        isDark ? 'bg-dark-card border border-dark-border hover:bg-dark-hover' : 'bg-gray-100 border border-light-border hover:bg-gray-200'
                      }`}>
                        {uploadingField === 'image_url' ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                        Upload Banner
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField === 'image_url'}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadAsset(file, 'image_url');
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    {formData.image_url && (
                      <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                        <img
                          src={formData.image_url}
                          alt="Banner preview"
                          className="h-28 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Upcoming Events</label>
                    <textarea
                      rows={4}
                      value={formData.upcoming_events}
                      onChange={(e) => setFormData({ ...formData, upcoming_events: e.target.value })}
                      placeholder="One event per line"
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 opacity-70">Total Raised</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.total_raised}
                      onChange={(e) => setFormData({ ...formData, total_raised: e.target.value })}
                      className={`w-full px-4 py-2.5 rounded-xl border ${isDark ? 'bg-dark-card border-dark-border' : 'bg-gray-50 border-light-border'}`}
                    />
                  </div>
                  <div className="flex items-center gap-3 py-2 md:self-end">
                    <input
                      type="checkbox"
                      id="spotlight"
                      checked={formData.is_spotlight}
                      onChange={(e) => setFormData({ ...formData, is_spotlight: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="spotlight" className="text-sm font-medium">Set as Spotlight Charity</label>
                  </div>
                </div>
              </div>

              <div className={`px-6 py-4 border-t space-y-4 ${isDark ? 'border-dark-border bg-dark-bg/95' : 'border-light-border bg-white/95'}`}>
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                    {error}
                  </div>
                )}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className={`px-5 py-3 rounded-xl font-semibold transition-colors ${
                      isDark ? 'bg-dark-card border border-dark-border hover:bg-dark-hover' : 'bg-gray-100 border border-light-border hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary px-6 py-3">
                    {editingCharity ? 'Save Changes' : 'Create Charity'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

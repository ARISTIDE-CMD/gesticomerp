import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { toQrDataUrl } from '@/lib/qr';

export default function QrCodeModal({ open, onClose, title, qrValue }) {
  const [qrUrl, setQrUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !qrValue) return;
    let active = true;
    setLoading(true);
    setError('');
    setQrUrl('');

    toQrDataUrl(qrValue)
      .then((url) => {
        if (active) setQrUrl(url);
      })
      .catch((e) => {
        if (active) setError(e.message || 'Impossible de generer le QR code.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, qrValue]);

  if (!open) return null;

  const handleDownload = () => {
    if (!qrUrl) return;
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `${String(title || 'qrcode').toLowerCase().replace(/[^a-z0-9_-]/g, '-')}.png`;
    link.click();
  };

  return (
    <div className="fixed inset-0 bg-black/35 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-blue-50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-blue-700">{title || 'QR code'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="text-sm text-gray-500 text-center py-10">Generation du QR code...</div>
          ) : error ? (
            <div className="text-sm text-orange-600 bg-orange-50 border border-orange-100 rounded-md px-3 py-2">
              {error}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-blue-50 rounded-lg p-4 flex justify-center">
                {qrUrl && <img src={qrUrl} alt="QR code" className="h-56 w-56 rounded bg-white p-2" />}
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Download size={16} />
                Telecharger le QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

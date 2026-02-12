let qrCodeLibPromise;

const getQrCodeLib = async () => {
  if (!qrCodeLibPromise) {
    qrCodeLibPromise = import(/* @vite-ignore */ 'https://esm.sh/qrcode@1.5.4');
  }
  const mod = await qrCodeLibPromise;
  return mod.default || mod;
};

export async function toQrDataUrl(value, options = {}) {
  const QRCode = await getQrCodeLib();
  return QRCode.toDataURL(String(value || ''), {
    width: 300,
    margin: 1,
    color: {
      dark: '#0f2f7a',
      light: '#ffffff',
    },
    ...options,
  });
}

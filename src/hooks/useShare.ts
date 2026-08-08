import { track } from '@/firebase/analytics';

function dataUriToFile(dataUri: string, filename: string): File {
  const [header, data] = dataUri.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mimeType });
}

function downloadDataUri(dataUri: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUri;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function useShare() {
  const shareText = async (title: string, text: string): Promise<void> => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        track('share', { platform: 'native', type: 'text' });
        return;
      }
    } catch (e) {
      // User cancelled or API unavailable — fall through
      if ((e as DOMException).name === 'AbortError') return;
    }
    // Fallback: open WhatsApp with pre-filled text
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    track('share', { platform: 'whatsapp-link', type: 'text' });
  };

  const shareImageUrl = async (url: string, filename: string, caption?: string): Promise<void> => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hukumnama AI Studio', text: caption ?? '' });
        track('share', { platform: 'native', type: 'image' });
        return;
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
    window.open(url, '_blank');
    track('share', { platform: 'open-url', type: 'image' });
  };

  const shareImage = async (dataUri: string, filename: string, caption?: string): Promise<void> => {
    try {
      const file = dataUriToFile(dataUri, filename);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Hukumnama AI Studio', text: caption ?? '' });
        track('share', { platform: 'native', type: 'image' });
        return;
      }
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
      // Fall through to download fallback
    }
    // Fallback: download the image
    downloadDataUri(dataUri, filename);
    track('share', { platform: 'download-fallback', type: 'image' });
  };

  return { shareText, shareImage, shareImageUrl };
}

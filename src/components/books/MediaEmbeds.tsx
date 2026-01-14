import { useLanguage } from '@/contexts/LanguageContext';
import { getLanguageFlag, getLanguageName } from '@/hooks/useBooks';

interface MediaEmbedsProps {
  media: {
    spotify?: Record<string, string>;
    apple_music?: Record<string, string>;
    youtube?: Record<string, string>;
  };
}

export function MediaEmbeds({ media }: MediaEmbedsProps) {
  const { t } = useLanguage();

  const hasSpotify = media.spotify && Object.keys(media.spotify).length > 0;
  const hasAppleMusic = media.apple_music && Object.keys(media.apple_music).length > 0;
  const hasYouTube = media.youtube && Object.keys(media.youtube).length > 0;

  if (!hasSpotify && !hasAppleMusic && !hasYouTube) {
    return null;
  }

  // Convert Spotify URL to embed format
  const getSpotifyEmbedUrl = (url: string) => {
    return url.replace('open.spotify.com/', 'open.spotify.com/embed/');
  };

  // Convert YouTube URL to embed format
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  };

  return (
    <div className="space-y-6">
      {/* Spotify */}
      {hasSpotify && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
            <span aria-hidden="true">🎵</span>
            {t.product.listen}
          </h3>
          <div className="grid gap-3">
            {Object.entries(media.spotify!).map(([langCode, url]) => (
              <div key={langCode} className="space-y-1">
                {Object.keys(media.spotify!).length > 1 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                    {langCode === 'mixed' ? 'All Languages' : getLanguageName(langCode)}
                  </p>
                )}
                <iframe
                  title={`Spotify player - ${langCode === 'mixed' ? 'All Languages' : getLanguageName(langCode)}`}
                  src={getSpotifyEmbedUrl(url)}
                  width="100%"
                  height="152"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="rounded-lg"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Apple Music */}
      {hasAppleMusic && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
            <span aria-hidden="true">🎧</span>
            Apple Music
          </h3>
          <div className="grid gap-3">
            {Object.entries(media.apple_music!).map(([langCode, url]) => (
              <div key={langCode}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent hover:underline"
                >
                  <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                  Listen on Apple Music ({getLanguageName(langCode)})
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YouTube */}
      {hasYouTube && (
        <div className="space-y-3">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
            <span aria-hidden="true">🎬</span>
            {t.product.watch}
          </h3>
          <div className="grid gap-4">
            {Object.entries(media.youtube!).map(([langCode, url]) => (
              <div key={langCode} className="space-y-1">
                {Object.keys(media.youtube!).length > 1 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                    {getLanguageName(langCode)}
                  </p>
                )}
                <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <iframe
                    title={`YouTube video - ${getLanguageName(langCode)}`}
                    src={getYouTubeEmbedUrl(url)}
                    width="100%"
                    height="100%"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                    className="absolute inset-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

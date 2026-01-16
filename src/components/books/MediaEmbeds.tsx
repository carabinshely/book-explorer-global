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

  const filterMixed = <T extends Record<string, string> | undefined>(entries: T) =>
    entries ? Object.entries(entries).filter(([langCode]) => langCode !== 'mixed') : [];

  const spotifyEntries = filterMixed(media.spotify);
  const appleMusicEntries = filterMixed(media.apple_music);
  const youtubeEntries = filterMixed(media.youtube);

  const hasSpotify = spotifyEntries.length > 0;
  const hasAppleMusic = appleMusicEntries.length > 0;
  const hasYouTube = youtubeEntries.length > 0;
  const hasListen = hasSpotify || hasAppleMusic;

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

  const getAppleMusicEmbedUrl = (url: string) => {
    return url.replace('https://music.apple.com/', 'https://embed.music.apple.com/');
  };

  return (
    <div className="space-y-6">
      {/* Listen */}
      {hasListen && (
        <div className="space-y-4">
          <h3 className="font-display text-lg font-medium text-foreground flex items-center gap-2">
            <span aria-hidden="true">🎵</span>
            {t.product.listen}
          </h3>

          {hasSpotify && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span aria-hidden="true">Spotify</span>
              </p>
              <div className="grid gap-3">
                {spotifyEntries.map(([langCode, url]) => (
                  <div key={langCode} className="space-y-1">
                    {spotifyEntries.length > 1 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                        {getLanguageName(langCode)}
                      </p>
                    )}
                    <iframe
                      title={`Spotify player - ${getLanguageName(langCode)}`}
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

          {hasAppleMusic && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground flex items-center gap-2">
                <span aria-hidden="true">Apple Music</span>
              </p>
              <div className="grid gap-3">
                {appleMusicEntries.map(([langCode, url]) => (
                  <div key={langCode} className="space-y-1">
                    {appleMusicEntries.length > 1 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span aria-hidden="true">{getLanguageFlag(langCode)}</span>
                        {getLanguageName(langCode)}
                      </p>
                    )}
                    <iframe
                      title={`Apple Music player - ${getLanguageName(langCode)}`}
                      src={getAppleMusicEmbedUrl(url)}
                      width="100%"
                      height="175"
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
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
            {youtubeEntries.map(([langCode, url]) => (
              <div key={langCode} className="space-y-1">
                {youtubeEntries.length > 1 && (
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

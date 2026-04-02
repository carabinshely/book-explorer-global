import { getLanguageName } from '@/hooks/useBooks';

interface LanguageIconProps {
  langCode: string;
  className?: string;
  decorative?: boolean;
}

export function LanguageIcon({ langCode, className = 'h-4 w-6', decorative = false }: LanguageIconProps) {
  const baseUrl = import.meta.env.BASE_URL;
  const name = getLanguageName(langCode);
  const src = `${baseUrl}assets/flags/${langCode}.svg`;

  return (
    <img
      src={src}
      alt={decorative ? '' : `${name} flag`}
      aria-hidden={decorative ? 'true' : undefined}
      className={className}
      loading="lazy"
    />
  );
}

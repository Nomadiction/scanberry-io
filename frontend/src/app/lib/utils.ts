import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string, locale: string = 'en'): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const localeMap: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    es: 'es-ES',
    de: 'de-DE',
  };

  const l = localeMap[locale] || 'en-US';

  if (days > 7) {
    return d.toLocaleDateString(l, { month: 'short', day: 'numeric', year: 'numeric' });
  } else if (days > 0) {
    const dayText = {
      en: `${days}d ago`,
      ru: `${days} ${getDayForm(days, ['день', 'дня', 'дней'])} назад`,
      es: `hace ${days} ${getDayForm(days, ['día', 'día', 'días'])}`,
      de: `vor ${days} ${getDayForm(days, ['Tag', 'Tag', 'Tagen'])}`,
    } as const;
    return (dayText[locale as keyof typeof dayText] || dayText.en) as string;
  } else if (hours > 0) {
    const hourText = {
      en: `${hours}h ago`,
      ru: `${hours} ${getHourForm(hours, ['час', 'часа', 'часов'])} назад`,
      es: `hace ${hours} ${getHourForm(hours, ['hora', 'hora', 'horas'])}`,
      de: `vor ${hours} ${getHourForm(hours, ['Stunde', 'Stunde', 'Stunden'])}`,
    } as const;
    return (hourText[locale as keyof typeof hourText] || hourText.en) as string;
  } else if (minutes > 0) {
    const minText = {
      en: `${minutes}m ago`,
      ru: `${minutes} ${getMinuteForm(minutes, ['минуту', 'минуты', 'минут'])} назад`,
      es: `hace ${minutes} ${getMinuteForm(minutes, ['minuto', 'minuto', 'minutos'])}`,
      de: `vor ${minutes} ${getMinuteForm(minutes, ['Minute', 'Minute', 'Minuten'])}`,
    } as const;
    return (minText[locale as keyof typeof minText] || minText.en) as string;
  } else {
    const justNowText = {
      en: 'Just now',
      ru: 'Только что',
      es: 'Justo ahora',
      de: 'Gerade eben',
    } as const;
    return (justNowText[locale as keyof typeof justNowText] || justNowText.en) as string;
  }
}

// Russian plural forms helper
function getDayForm(n: number, forms: string[]): string {
  if (n % 10 === 1 && n % 100 !== 11) return forms[0] || '';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1] || '';
  return forms[2] || '';
}

function getHourForm(n: number, forms: string[]): string {
  if (n % 10 === 1 && n % 100 !== 11) return forms[0] || '';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1] || '';
  return forms[2] || '';
}

function getMinuteForm(n: number, forms: string[]): string {
  if (n % 10 === 1 && n % 100 !== 11) return forms[0] || '';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return forms[1] || '';
  return forms[2] || '';
}

export function formatDuration(ms: number, locale: string = 'en'): string {
  if (ms < 1000) {
    const unit = {
      en: 'ms',
      ru: 'мс',
      es: 'ms',
      de: 'ms',
    } as const;
    return `${ms}${(unit[locale as keyof typeof unit] || unit.en) as string}`;
  }
  const seconds = (ms / 1000).toFixed(1);
  const unit = {
    en: 's',
    ru: 'с',
    es: 's',
    de: 's',
  } as const;
  return `${seconds}${(unit[locale as keyof typeof unit] || unit.en) as string}`;
}

export function formatNumber(num: number, locale: string = 'en'): string {
  const localeMap: Record<string, string> = {
    en: 'en-US',
    ru: 'ru-RU',
    es: 'es-ES',
    de: 'de-DE',
  };
  const l = localeMap[locale] || 'en-US';
  return num.toLocaleString(l);
}

export function formatPixels(pixels: number, locale: string = 'en'): string {
  return `${formatNumber(pixels, locale)} px`;
}

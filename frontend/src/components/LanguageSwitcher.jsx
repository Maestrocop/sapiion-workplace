import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'nl', label: 'Nederlands' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  return (
    <select
      value={i18n.language}
      onChange={(e) => setLanguage(e.target.value)}
      className="text-sm text-slate-500 border border-slate-200 rounded-lg px-2 py-1 bg-white"
      aria-label="Language"
    >
      {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
    </select>
  );
}

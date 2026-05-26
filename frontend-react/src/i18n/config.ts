import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'

/**
 * i18n · 轻量壳子
 * 后续将与 frontend Vue 侧 i18n key 结构对齐
 */
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { translation: zhCN },
      'en-US': { translation: enUS },
    },
    fallbackLng: 'zh-CN',
    interpolation: { escapeValue: false },
  })

export default i18n

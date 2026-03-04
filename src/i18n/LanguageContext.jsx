/**
 * 言語コンテキスト
 * アプリ全体の表示言語（ja / en）を管理する
 */
import { createContext, useContext, useState } from 'react'

const LanguageContext = createContext({ lang: 'ja', setLang: () => { } })

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState(() => {
        // ブラウザの優先言語が英語系なら自動的にenに
        const saved = localStorage.getItem('sl-analytics-lang')
        if (saved) return saved
        return navigator.language?.startsWith('ja') ? 'ja' : 'en'
    })

    const toggle = () => {
        const next = lang === 'ja' ? 'en' : 'ja'
        setLang(next)
        localStorage.setItem('sl-analytics-lang', next)
    }

    return (
        <LanguageContext.Provider value={{ lang, toggle }}>
            {children}
        </LanguageContext.Provider>
    )
}

/** 現在の言語と切り替え関数を返すフック */
export function useLang() {
    return useContext(LanguageContext)
}

/** 翻訳文字列オブジェクトから現在言語の文字列を取得するフック */
export function useT(strings) {
    const { lang } = useLang()
    return (key) => strings[lang]?.[key] ?? strings['ja']?.[key] ?? key
}

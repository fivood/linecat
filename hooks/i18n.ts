// The language the mod's words are drawn in: the narration, the sheets' names and intros, the
// /lineland replies. The status labels (EXECUTE, ANALYZING…) stay in English on purpose: they are
// part of the retro menu look.
//
// `language` in the plugin's settings picks one, or `auto`: Claude Code's own response-language
// setting when it has one, else the script of the person's first prompt, else English.

import type { Lang } from '../types'

export type { Lang }
export type Words = Record<Lang, string>

let lang: Lang = 'en'
export const getLang = () => lang
export const setLang = (l: Lang) => { lang = l }
export const tr = (w: Words) => w[lang]

// a picked setting, as the config row or the person spells it
export function fromSetting(v: unknown): Lang | null {
  if (typeof v !== 'string' || !v.trim()) return null
  const s = v.trim().toLowerCase()
  if (/^(zh|cn|chinese|中文|简体|繁體|汉语|漢語)/.test(s)) return 'zh'
  if (/^(ja|jp|japanese|日本語|にほんご)/.test(s)) return 'ja'
  if (/^(en|english|英语|英語)/.test(s)) return 'en'
  return null
}

// the script a piece of the person's own writing is in; kana before han, since Japanese uses both
export function fromText(text: string): Lang | null {
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[一-鿿]/.test(text)) return 'zh'
  if (/[A-Za-z]{3}/.test(text)) return 'en'
  return null
}

// the words that are not a sheet's own
export const W = {
  grow: {
    read: { zh: '看过的地方积成了水。', ja: '見たところに水がたまった。', en: 'Where something was read, water pooled.' },
    run: { zh: '线上推起了一座山。', ja: '線の上に山が押し上がった。', en: 'A mountain was pushed up on the line.' },
    edit: { zh: '改写过的地方长出了树。', ja: '書き換えたところに木が生えた。', en: 'Trees grew where something was rewritten.' },
    error: { zh: '出错了。线被划破了一道。', ja: 'エラー。線に裂け目ができた。', en: 'An error. The line tore.' },
    other: { zh: '线上落了一层沙。', ja: '線の上に砂が積もった。', en: 'Sand settled on the line.' },
  },
  command: {
    description: {
      zh: '给线国换一张纸：不带参数随机换，或指定地貌名',
      ja: '線国の紙を替える：引数なしでランダム、または地形の名前を指定',
      en: 'Redraw Lineland on another sheet: at random, or name one',
    },
    switched: { zh: '线国换成了「{name}」。', ja: '線国を「{name}」に替えた。', en: 'Lineland is now drawn on {name}.' },
    unknown: { zh: '没有「{want}」这张纸。可选：{all}', ja: '「{want}」という紙はない。選べるのは：{all}', en: 'No sheet called "{want}". Choose from: {all}' },
  },
} satisfies Record<string, Record<string, Words>>

export const fill = (w: Words, vars: Record<string, string>) => tr(w).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')

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
      zh: '给线国换一张纸（随机，或指定地貌名）；lang 切换语言；monitor / panels on|off 开关用量监视和复古面板',
      ja: '線国の紙を替える（ランダム、または地形名を指定）；lang で言語を切り替え；monitor / panels on|off でモニターとパネルを切り替え',
      en: 'Redraw Lineland on another sheet (at random, or name one); lang switches language; monitor / panels on|off toggle the usage monitor and retro panels',
    },
    switched: { zh: '线国换成了「{name}」。', ja: '線国を「{name}」に替えた。', en: 'Lineland is now drawn on {name}.' },
    unknown: { zh: '没有「{want}」这张纸。可选：{all}', ja: '「{want}」という紙はない。選べるのは：{all}', en: 'No sheet called "{want}". Choose from: {all}' },
  },
  // /lineland monitor on|off, /lineland panels on|off
  toggle: {
    monitorOn: { zh: '用量监视已打开。', ja: 'リソースモニターをオンにした。', en: 'Resource monitor on.' },
    monitorOff: {
      zh: '用量监视已关闭，线国占满整条。',
      ja: 'リソースモニターをオフにした。線国が帯いっぱいに広がる。',
      en: 'Resource monitor off; Lineland takes the whole band.',
    },
    panelsOn: { zh: '复古面板已打开。', ja: 'レトロパネルをオンにした。', en: 'Retro panels on.' },
    panelsOff: {
      zh: '复古面板已关闭，消息交还给 App 自己画。',
      ja: 'レトロパネルをオフにした。メッセージはアプリ本来の表示に戻る。',
      en: 'Retro panels off; the app draws messages its own way again.',
    },
    which: { zh: '用 on 或 off，例如 /lineland {what} off', ja: 'on か off を指定する。例：/lineland {what} off', en: 'Use on or off, as in /lineland {what} off' },
    settings: {
      zh: '（设置里已关闭这一项，要先在 /config 里打开。）',
      ja: '（設定でオフになっている。先に /config でオンにする必要がある。）',
      en: '(It is off in the settings; turn it on in /config first.)',
    },
  },
  // /lineland place band|pane: where the line is drawn
  place: {
    band: { zh: '线国回到输入框上方的横栏。', ja: '線国を入力欄の上の帯に戻した。', en: 'Lineland is back in the band above the prompt.' },
    pane: {
      zh: '线国挪到了侧边面板，横栏留给别的插件。',
      ja: '線国をサイドパネルに移した。帯はほかのプラグインに譲る。',
      en: 'Lineland moved to a side pane, leaving the band to other plugins.',
    },
    which: { zh: '用 band 或 pane，例如 /lineland place pane', ja: 'band か pane を指定する。例：/lineland place pane', en: 'Use band or pane, as in /lineland place pane' },
    pinned: {
      zh: '（设置里固定在侧边面板，要先在 /config 里改回 band。）',
      ja: '（設定でサイドパネルに固定されている。先に /config で band に戻す必要がある。）',
      en: '(The settings pin it to the pane; set it back to band in /config first.)',
    },
    desktopOnly: { zh: '线国只画在桌面版里。', ja: '線国はデスクトップ版にだけ描かれる。', en: 'Lineland is drawn in the desktop app only.' },
  },
  // /lineland lang …; each reply is drawn in the language just picked
  lang: {
    set: { zh: '线国猫现在说中文。', ja: '線国猫は日本語で話すようになった。', en: 'Linecat now speaks English.' },
    auto: {
      zh: '语言改回自动：跟随 Claude Code 的语言设置，没有的话看你的第一条消息。',
      ja: '言語を自動に戻した：Claude Code の言語設定に従い、なければ最初のメッセージで判断する。',
      en: 'Language is back to auto: Claude Code’s language setting if it has one, otherwise your first message.',
    },
    unsaved: {
      zh: '（只对这次会话有效：没能写进设置。）',
      ja: '（このセッションだけ：設定には保存できなかった。）',
      en: '(This session only: it could not be saved to the settings.)',
    },
    unknown: {
      zh: '没有「{want}」这种语言。可选：zh、ja、en、auto',
      ja: '「{want}」という言語はない。選べるのは：zh、ja、en、auto',
      en: 'No language "{want}". Choose from: zh, ja, en, auto',
    },
  },
} satisfies Record<string, Record<string, Words>>

export const fill = (w: Words, vars: Record<string, string>) => tr(w).replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '')

/**
 * Quest2Resume
 * Client-side resume generator. There is no application server.
 *
 * Unified experience record. Manual entry and Steam import both write this
 * shape into `state.experiences`, and the prompt builder reads only that list.
 *
 * {
 *   id: string,
 *   source: "manual" | "steam",
 *   appId: number | null,
 *   title: string,
 *   role: string,
 *   startDate: string,       // yyyy-mm or ""
 *   endDate: string,
 *   current: boolean,
 *   hours: number | null,
 *   achievements: string,      // responsibilities the applicant wrote
 *   achievementItems: Array,  // { name, when, detail, selected }
 *   notes: string,
 *   iconUrl: string,
 *   draft: boolean           // unsaved manual card, not persisted
 * }
 */

const STORAGE_KEYS = {
  settings: "quest2resume.settings.v1",
  experiences: "quest2resume.experiences.v1",
  ui: "quest2resume.ui.v1"
};

const DEFAULT_MODELS = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  glm: "glm-4-flash-250414",
  kimi: "kimi-k3.1-pro",
  deepseek: "deepseek-chat",
  qwen: "qwen-plus",
  ollama: "llama3.2"
};

// OpenAI-style POST {base}/chat/completions. Defaults follow each vendor's China endpoint.
const CHAT_PROVIDERS = {
  openai: { base: "https://api.openai.com/v1" },
  glm: { base: "https://open.bigmodel.cn/api/paas/v4" },
  kimi: { base: "https://api.moonshot.cn/v1" },
  deepseek: { base: "https://api.deepseek.com/v1" },
  qwen: { base: "https://dashscope.aliyuncs.com/compatible-mode/v1" }
};

const I18N = {
  en: {
    "meta.title": "Quest2Resume — Game-to-corporate resume generator",
    "meta.description": "Quest2Resume turns video game roles, playtime, and achievements into corporate-ready resume language. Your API key stays in this browser.",
    skip: "Skip to content",
    kicker: "Applicant workspace",
    settings: "Settings",
    "aria.language": "Language",
    "aria.inputMethod": "Input method",
    "aria.close": "Close settings",
    "storage.warning": "This browser blocked local storage. You can use the page, but keys and entries will disappear when you close the tab.",
    "intro.title": "Translate play into professional experience.",
    "intro.lede": "Record a game the way an application form records a role, or import public Steam playtime and achievements. Both paths fill one ledger. Generation runs in this browser with the provider key you save.",
    "step.1": "Save a provider",
    "step.2": "Add experience",
    "step.3": "Generate and export",
    "input.heading": "Experience input",
    "tab.manual": "Manual Entry",
    "tab.steam": "Steam ID Import",
    "manual.copy": "Add each game as a role: organization, title, dates, hours, and the work you actually did. Use notes for anything a recruiter must not misunderstand, such as a volunteer community role.",
    addGame: "Add Another Game",
    loadSample: "Load sample entries",
    "steam.callout1": "Steam’s Web API does not accept calls from a website. Start this folder with py -3 serve.py and open http://localhost:8080. That program runs on this computer, asks Steam for your games, and sends nothing to a third party. Leave the CORS proxy field blank.",
    "steam.callout2": "The profile must expose game details. In Steam: Edit Profile, then Privacy Settings, then set <strong>Game details</strong> to Public. Achievement history also has to be public, and some games publish no stats.",
    "steam.id": "SteamID64, vanity name, or profile URL",
    "steam.idPlaceholder": "76561198000000000 or https://steamcommunity.com/id/name",
    "steam.limit": "Games to import",
    "steam.limitHint": "Highest playtime first. There is no maximum.",
    "steam.minHours": "Minimum hours",
    "steam.minHint": "Games under this playtime are skipped.",
    fetchSteam: "Fetch Steam Data",
    "ledger.heading": "Experience ledger",
    clearAll: "Clear all",
    "ledger.copy": "Steam imports and manual cards share this list. Order here is the order sent to the model. A Steam card starts on the first month in Steam Replay and ends on the last month Replay recorded, or the last day played when that is later. Add the role Steam does not provide.",
    "generate.heading": "Resume generator",
    targetRole: "Target role",
    optional: "optional",
    targetPlaceholder: "IT project coordinator",
    targetHint: "Aims the wording. The draft will not invent a job the ledger does not support.",
    generate: "Generate Professional Resume",
    "generate.languageHint": "The draft is written in the language selected in the header.",
    "brief.heading": "Writing brief",
    "brief.reset": "Reset",
    "brief.copy": "This text is sent with every draft. Edits stay in this browser. Reset reloads writing-brief.md. The organization stays the game or the in-game group. A publisher is not filled in as the employer.",
    "brief.label": "Instructions for the draft",
    "profile.legend": "Resume heading",
    "profile.hint": "Checked lines appear on the resume. If full name is off, the heading uses your current Steam username.",
    "profile.name": "Full name",
    "profile.namePh": "Ada Lovelace",
    "profile.email": "Email",
    "profile.emailPh": "ada@example.com",
    "profile.phone": "Phone",
    "profile.phonePh": "+1 555 0100",
    "profile.location": "Location",
    "profile.locationPh": "Shanghai",
    "profile.website": "Website",
    "profile.websitePh": "https://example.com",
    "profile.linkedin": "LinkedIn",
    "profile.linkedinPh": "https://www.linkedin.com/in/name",
    "profile.summary": "Professional summary",
    "profile.skills": "Skills",
    "profile.education": "Education",
    "profile.educationPh": "B.A. History, Example University, 2020",
    "profile.educationHint": "Only the text you type here is used. The draft will not invent a school or degree.",
    "profile.steamMissing": "Steam ID not set",
    "profile.nameFallback": "Heading will use the Steam username {id}.",
    "profile.nameIdFallback": "Steam did not return a username, so the heading will use {id}.",
    "profile.nameLookup": "Looking up the Steam username…",
    "section.summary": "Professional Summary",
    "section.experience": "Experience",
    "section.skills": "Skills",
    "section.education": "Education",
    "output.heading": "Resume draft",
    copy: "Copy to Clipboard",
    exportTxt: "Export as TXT",
    exportHtml: "Export as HTML",
    footer: "Keys and entries stay in localStorage on this device. Resume text is sent only to the provider you select. Steam calls go to serve.py on this computer, and that program calls Steam. No third party sits in between.",
    "settings.kicker": "Configuration",
    "settings.title": "API key manager",
    "section.model": "Language model",
    provider: "Provider",
    "provider.gemini": "Google Gemini",
    "provider.openai": "OpenAI",
    "provider.anthropic": "Anthropic Claude",
    "provider.glm": "Zhipu GLM",
    "provider.kimi": "Moonshot Kimi",
    "provider.deepseek": "DeepSeek",
    "provider.qwen": "Alibaba Qwen",
    "provider.ollama": "Local Ollama",
    apiKey: "API key",
    apiKeyPlaceholder: "Paste your key",
    apiKeyHint: "Saved in this browser’s localStorage, one key per provider. Anyone who can open this profile can read it.",
    model: "Model",
    modelHint: "Editable. If the provider says the model is missing, replace it with one your account can call.",
    apiBase: "API base URL",
    "baseHint.openai": "Include /v1. Point this at a proxy you run if you need one.",
    "baseHint.glm": "Default is https://open.bigmodel.cn/api/paas/v4. Do not add /v1 or /chat/completions.",
    "baseHint.kimi": "Default is https://api.moonshot.cn/v1. An international key uses https://api.moonshot.ai/v1 instead.",
    "baseHint.deepseek": "Default is https://api.deepseek.com/v1.",
    "baseHint.qwen": "Default is https://dashscope.aliyuncs.com/compatible-mode/v1.",
    ollamaBase: "Ollama base URL",
    "section.steam": "Steam import",
    steamKey: "Steam Web API key",
    steamKeyPlaceholder: "From steamcommunity.com/dev/apikey",
    steamKeyHint: "Used only for IPlayerService and ISteamUserStats. Create one at <a href=\"https://steamcommunity.com/dev/apikey\" target=\"_blank\" rel=\"noopener noreferrer\">steamcommunity.com/dev/apikey</a>.",
    proxy: "CORS proxy prefix",
    proxyHint: "Leave this blank when you use serve.py. Fill it only for a proxy you run yourself. That proxy receives the full Steam URL, including your Steam key. Templates may contain {url} or {raw}.",
    removeKeys: "Remove saved keys",
    cancel: "Cancel",
    saveSettings: "Save settings",
    saved: "Saved",
    show: "Show",
    hide: "Hide",
    "help.gemini": "Calls generativelanguage.googleapis.com from this page. Create a key in Google AI Studio. If a new key is refused for the default model, try gemini-3.5-flash-lite. Referrer-restricted keys must allow this site.",
    "help.openai": "Calls the Chat Completions endpoint from this page. A rejected key can look like a network error because some error responses omit CORS headers. Change the base URL if you use a proxy or an OpenAI-compatible host.",
    "help.anthropic": "Calls api.anthropic.com with the browser-access header Anthropic requires. Some organizations disable browser calls and return 401 even when the key is valid.",
    "help.glm": "Calls Zhipu at open.bigmodel.cn with the Chat Completions format. Create a key on the Zhipu open platform. Default model: glm-4-flash-250414. The base URL does not use /v1.",
    "help.kimi": "Calls Moonshot at api.moonshot.cn. Create a key on platform.kimi.com. Default model: kimi-k3.1-pro. A key from platform.kimi.ai does not work on this China endpoint; change the base URL if you use that key.",
    "help.deepseek": "Calls api.deepseek.com with the Chat Completions format. Create a key on platform.deepseek.com. Default model: deepseek-chat.",
    "help.qwen": "Calls Alibaba DashScope compatible mode. Create a key in Alibaba Model Studio (Bailian). Default model: qwen-plus. Thinking is turned off so the reply is the resume.",
    "help.ollama": "Calls a local Ollama server. No API key. Open this page over http://localhost (a hosted https page cannot call http://localhost) and start Ollama with OLLAMA_ORIGINS set to this origin.",
    "empty.ledger": "Nothing in the ledger yet. Add a game, load the samples, or import from Steam. Both paths land here.",
    "empty.resume": "Your resume will appear here. Copy it, or export TXT, HTML, or a LaTeX PDF.",
    "badge.manual": "Manual",
    "badge.steam": "Steam",
    untitled: "Untitled game",
    roleMissing: "Role not set",
    achievementsMissing: "No achievements or responsibilities yet.",
    up: "Up",
    down: "Down",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    "field.title": "Game title / organization",
    "field.role": "Role / position title",
    "field.start": "Start date",
    "field.end": "End date",
    "field.current": "Current role",
    "field.hours": "Total hours played",
    "field.achievements": "Responsibilities you want included",
    "field.achievementPicks": "Steam achievements",
    "achieve.hint": "Checked boxes are the only achievements sent. Leave them all off and the draft uses the game's iconic projects instead.",
    "achieve.all": "Select all",
    "achieve.none": "Use none",
    "achieve.noneSelected": "No achievements selected. The draft will use iconic projects from the game.",
    "draft.edit": "Edit the draft",
    "draft.hint": "Change the text here. The preview, copy, and exports use this version.",
    "field.notes": "Custom notes",
    "ph.title": "Final Fantasy XIV",
    "ph.role": "Guild master, raid leader, officer",
    "ph.achievements": "What you organized, coached, built, or were responsible for. Include team size and cadence if you know them.",
    "ph.notes": "Context a recruiter should not miss. Example: volunteer role, not employment.",
    present: "Present",
    datesMissing: "Dates not set",
    hoursMissing: "Hours not set",
    hours: "{n} hours",
    writing: "Writing resume…",
    fetching: "Fetching Steam data…",
    contacting: "Contacting Steam…",
    "chip.ready": "{label} ready",
    "chip.needed": "{label} · key needed",
    "meta.ready": "{n} entries ready for {label}.",
    "meta.readyOne": "{n} entry ready for {label}.",
    "meta.empty": "Add a titled entry to generate with {label}.",
    "toast.storage": "Could not save. Browser storage is full or blocked.",
    "toast.savedGame": "Game saved.",
    "toast.removed": "Game removed.",
    "toast.samplesOne": "Sample entry added.",
    "toast.samples": "Sample entries added.",
    "toast.samplesExist": "Sample entries are already in the ledger.",
    "toast.cleared": "Ledger cleared.",
    "toast.settings": "Settings saved in this browser.",
    "toast.keysRemoved": "Saved keys removed.",
    "toast.steam": "Steam games added to the ledger.",
    "toast.resume": "Resume draft ready.",
    "toast.copied": "Markdown copied.",
    "toast.languageDraft": "Language updated. The draft already on screen stays as generated. Generate again to rewrite it.",
    "confirm.delete": "Remove {label} from the ledger?",
    "confirm.game": "this game",
    "confirm.clear": "Remove every game from the ledger on this browser?",
    "confirm.keys": "Remove every saved model key and the Steam key from this browser?",
    "error.title": "Add a game title.",
    "error.hours": "Enter hours as a number, or leave the field blank.",
    "error.dates": "End date is before the start date.",
    "error.invalidUrl": "{label} must be a valid URL.",
    "error.httpUrl": "{label} must start with http:// or https://.",
    "error.steamKey": "Add a Steam Web API key in Settings before fetching.",
    "error.steamId": "Enter a SteamID64, a vanity name, or a steamcommunity.com profile URL.",
    "error.vanity": "Steam could not find that vanity name. Try the 17-digit SteamID64 from the profile URL.",
    "error.private": "Steam returned no game list. The profile is likely private, or Game details is not Public. In Steam, open Edit Profile, then Privacy Settings, and set Game details to Public.",
    "error.noGames": "The profile is public but has no games to import.",
    "error.noneQualified": "Found {count} games. None have at least {hours} hours. Lower the minimum and fetch again.",
    "error.steamProxy": "The Steam request did not complete. The proxy may be down, blocking the call, or rewriting the response. Try another proxy you trust, or enter the games manually.",
    "error.steamCors": "The browser blocked the Steam request. Steam does not answer websites directly. Stop the current server, run py -3 serve.py in this folder, and open http://localhost:8080. Leave the CORS proxy field blank.",
    "error.steamAuth": "Steam refused the key (HTTP {status}). Check the Steam Web API key in Settings.",
    "error.steamFailed": "Steam import failed.",
    "error.achievements": "Achievement history could not be read ({reason}).",
    "error.achievementsGeneric": "Achievement history could not be read (profile restrictions or this game has no Steam stats).",
    "error.noStats": "no public stats",
    "error.needTitle": "Add at least one game with a title.",
    "error.needKey": "Save a provider API key in Settings, then generate again. Ollama does not need a key.",
    "error.emptyDraft": "The model returned an empty draft.",
    "error.modelChars": "The model name is empty or contains unsupported characters.",
    "error.chooseProvider": "Choose a provider in Settings.",
    "error.timeout": "The provider took too long to answer. Try again, or choose a faster model in Settings.",
    "error.ollamaNet": "Could not reach Ollama. Start it on this computer, set OLLAMA_ORIGINS to this page origin, and open Quest2Resume over http://localhost rather than a hosted https page.",
    "error.chatNet": "The browser could not read this provider’s response. A rejected key can look like a network failure, and some providers block calls from a web page. Check the key, the model name, and the base URL.",
    "error.claudeNet": "The browser could not reach Claude. Check the key and model. Some Anthropic organizations block browser calls.",
    "error.geminiNet": "The browser could not reach Gemini. Check the key, the model name, and any website restriction on the key.",
    "error.gemini403": "{message} If this key is limited by website, add this page URL in Google AI Studio.",
    "error.claudeCors": "Claude refused a browser call for this organization. The key can still be valid. Try Gemini, OpenAI, or local Ollama.",
    "error.ollamaMissing": "{message} Pull it with ollama pull {model}, or change the model in Settings.",
    "error.request": "The request failed.",
    "error.notJson": "The response was not JSON.",
    "error.geminiBlocked": "Gemini blocked the request ({reason}).",
    "error.geminiEmpty": "Gemini returned no text.",
    "error.geminiEmptyReason": "Gemini returned no text ({reason}).",
    "error.openaiEmpty": "The provider returned no text.",
    "error.claudeEmpty": "Claude returned no text.",
    "error.claudeEmptyReason": "Claude returned no text ({reason}).",
    "error.ollamaEmpty": "Ollama returned no text. Check that the model is pulled.",
    "steam.reading": "Reading achievements ({done} of {total})…",
    "steam.unlocked": "{unlocked} of {total} achievements unlocked.",
    "steam.lastPlayed": " Last played {date}.",
    "steam.notes": "Imported from Steam. App {appid}.{lastPlayed} Steam Replay had no months for this game, so the start month is the first achievement and the end month is the last day played. Add the role Steam does not provide.",
    "steam.notesReplay": "Imported from Steam Replay. App {appid}.{lastPlayed} The start month is the first month Replay recorded. The end month is the last Replay month, or the last day played when that is later. Add the role Steam does not provide.",
    "steam.replay": "Steam Replay supplied dates from {years} year(s).",
    "steam.replayMissing": "Steam Replay returned no play months. Dates use the first achievement and the last day played. On the Replay page, set each year to Public.",
    "steam.app": "Steam app {appid}",
    "steam.imported": "Imported {count} {unit}{persona}.",
    "steam.game": "game",
    "steam.games": "games",
    "steam.for": " for {name}",
    "steam.updated": "Updated {count} already in the ledger.",
    "steam.addRole": "Add a role on each card before you generate.",
    "steam.privacy": "The profile is not fully public. If games are missing, set Game details to Public.",
    "export.title": "Resume",
    "export.foot": "Review every line before you send this resume.",
    "exportPdf": "Export LaTeX PDF",
    "toast.pdf": "LaTeX PDF downloaded.",
    "toast.pdfComposed": "No LaTeX engine is installed, so this PDF was composed from the same resume. resume.tex was downloaded as well.",
    "toast.tex": "resume.tex downloaded. Install TeX Live or MiKTeX, then export again to compile it.",
    "error.pdf": "The PDF could not be built.",
  },
  zh: {
    "meta.title": "Quest2Resume — 游戏经历转职场简历",
    "meta.description": "Quest2Resume 把游戏角色、游玩时长和成就写成可用于求职的简历语言。API 密钥只保存在这台浏览器里。",
    skip: "跳到主要内容",
    kicker: "申请工作台",
    settings: "设置",
    "aria.language": "语言",
    "aria.inputMethod": "录入方式",
    "aria.close": "关闭设置",
    "storage.warning": "此浏览器阻止了本地存储。页面仍可使用，但关闭标签页后密钥和经历会消失。",
    "intro.title": "把游戏经历写成职业表述。",
    "intro.lede": "像填写申请表一样记录一款游戏，或导入公开的 Steam 时长与成就。两种方式进入同一份账本。生成在这台浏览器中进行，使用你保存的密钥。",
    "step.1": "保存模型服务",
    "step.2": "添加经历",
    "step.3": "生成并导出",
    "input.heading": "经历录入",
    "tab.manual": "手动填写",
    "tab.steam": "Steam ID 导入",
    "manual.copy": "把每款游戏写成一段任职：组织、职位、日期、时长，以及你实际做过的事。备注用来写招聘方不能误解的信息，例如这是志愿者社区职务。",
    addGame: "再添加一款游戏",
    loadSample: "载入示例",
    "steam.callout1": "Steam 的 Web API 不接受来自网站的直接调用。请在本文件夹运行 py -3 serve.py，并打开 http://localhost:8080。这个程序只在这台电脑上运行，替你向 Steam 请求游戏数据，不会把密钥发给第三方。CORS 代理一栏留空。",
    "steam.callout2": "个人资料必须公开游戏详情。在 Steam 中打开“编辑个人资料”，进入“隐私设置”，将<strong>游戏详情</strong>设为“公开”。成就记录也需要公开，部分游戏不提供统计数据。",
    "steam.id": "SteamID64、个性网址或个人资料链接",
    "steam.idPlaceholder": "76561198000000000 或 https://steamcommunity.com/id/name",
    "steam.limit": "导入游戏数量",
    "steam.limitHint": "按时长从高到低。没有数量上限。",
    "steam.minHours": "最少时长",
    "steam.minHint": "低于此时长的游戏会被跳过。",
    fetchSteam: "获取 Steam 数据",
    "ledger.heading": "经历账本",
    clearAll: "全部清除",
    "ledger.copy": "Steam 导入和手动卡片共用这份列表。这里的顺序就是发给模型的顺序。Steam 卡片的开始月份是 Steam Replay 中最早的游玩月，结束月份是 Replay 记录的最后一月；若最近游玩更晚，则用最近游玩。请补上 Steam 无法提供的职位。",
    "generate.heading": "简历生成",
    targetRole: "目标职位",
    optional: "可选",
    targetPlaceholder: "信息技术项目协调员",
    targetHint: "用来调整措辞。草稿不会编造账本里没有的工作。",
    generate: "生成专业简历",
    "generate.languageHint": "简历正文使用页眉所选的语言。",
    "brief.heading": "写作说明",
    "brief.reset": "恢复",
    "brief.copy": "这段文字会随每次生成发给模型。修改保存在这台浏览器里。恢复会重新载入 writing-brief.md。组织名称仍是游戏或游戏内团体，不会把发行商写成雇主。",
    "brief.label": "发给模型的说明",
    "profile.legend": "简历抬头",
    "profile.hint": "勾选的内容会出现在简历上。关闭姓名时，抬头改用你当前的 Steam 用户名。",
    "profile.name": "真实姓名",
    "profile.namePh": "张三",
    "profile.email": "邮箱",
    "profile.emailPh": "ada@example.com",
    "profile.phone": "电话",
    "profile.phonePh": "+86 138 0000 0000",
    "profile.location": "所在地",
    "profile.locationPh": "上海",
    "profile.website": "个人网站",
    "profile.websitePh": "https://example.com",
    "profile.linkedin": "LinkedIn",
    "profile.linkedinPh": "https://www.linkedin.com/in/name",
    "profile.summary": "专业概述",
    "profile.skills": "专业技能",
    "profile.education": "教育背景",
    "profile.educationPh": "某某大学 历史学学士，2020",
    "profile.educationHint": "这里只使用你自己填写的文字。草稿不会编造学校或学位。",
    "profile.steamMissing": "未填写 Steam ID",
    "profile.nameFallback": "抬头将使用 Steam 用户名 {id}。",
    "profile.nameIdFallback": "没有读到 Steam 用户名，抬头将使用 {id}。",
    "profile.nameLookup": "正在读取 Steam 用户名…",
    "section.summary": "专业概述",
    "section.experience": "工作经历",
    "section.skills": "专业技能",
    "section.education": "教育背景",
    "output.heading": "简历草稿",
    copy: "复制到剪贴板",
    exportTxt: "导出为 TXT",
    exportHtml: "导出为 HTML",
    footer: "密钥和经历保存在这台设备的 localStorage 中。简历文本只发给你选择的模型服务。Steam 请求先到这台电脑上的 serve.py，再由它请求 Steam，中间没有第三方。",
    "settings.kicker": "配置",
    "settings.title": "API 密钥管理",
    "section.model": "语言模型",
    provider: "服务商",
    "provider.gemini": "Google Gemini",
    "provider.openai": "OpenAI",
    "provider.anthropic": "Anthropic Claude",
    "provider.glm": "智谱 GLM",
    "provider.kimi": "月之暗面 Kimi",
    "provider.deepseek": "DeepSeek",
    "provider.qwen": "阿里云通义千问",
    "provider.ollama": "本地 Ollama",
    apiKey: "API 密钥",
    apiKeyPlaceholder: "粘贴你的密钥",
    apiKeyHint: "按服务商分别保存在此浏览器的 localStorage 中。能打开此配置文件的人都能读取它。",
    model: "模型",
    modelHint: "可以修改。如果服务商提示找不到模型，请换成你的账号可以调用的名称。",
    apiBase: "接口基础地址",
    "baseHint.openai": "需要包含 /v1。如果使用自己的代理，把地址指到那里。",
    "baseHint.glm": "默认是 https://open.bigmodel.cn/api/paas/v4。不要再加 /v1 或 /chat/completions。",
    "baseHint.kimi": "默认是 https://api.moonshot.cn/v1。国际站密钥请改用 https://api.moonshot.ai/v1。",
    "baseHint.deepseek": "默认是 https://api.deepseek.com/v1。",
    "baseHint.qwen": "默认是 https://dashscope.aliyuncs.com/compatible-mode/v1。",
    ollamaBase: "Ollama 基础地址",
    "section.steam": "Steam 导入",
    steamKey: "Steam Web API 密钥",
    steamKeyPlaceholder: "来自 steamcommunity.com/dev/apikey",
    steamKeyHint: "仅用于 IPlayerService 和 ISteamUserStats。在 <a href=\"https://steamcommunity.com/dev/apikey\" target=\"_blank\" rel=\"noopener noreferrer\">steamcommunity.com/dev/apikey</a> 创建。",
    proxy: "CORS 代理前缀",
    proxyHint: "使用 serve.py 时请留空。只有在你自己运行代理时才填写。该代理会收到完整的 Steam 地址，包括你的 Steam 密钥。模板可包含 {url} 或 {raw}。",
    removeKeys: "移除已存密钥",
    cancel: "取消",
    saveSettings: "保存设置",
    saved: "已保存",
    show: "显示",
    hide: "隐藏",
    "help.gemini": "从此页面调用 generativelanguage.googleapis.com。在 Google AI Studio 创建密钥。如果新密钥拒绝默认模型，可尝试 gemini-3.5-flash-lite。设了引用来源限制的密钥必须允许本站。",
    "help.openai": "从此页面调用 Chat Completions 接口。被拒绝的密钥有时看起来像网络错误，因为部分错误响应没有 CORS 头。使用代理或兼容接口时，请修改基础地址。",
    "help.anthropic": "调用 api.anthropic.com，并带上 Anthropic 要求的浏览器访问头。部分组织会禁止浏览器调用，即使密钥有效也会返回 401。",
    "help.glm": "从此页面以 Chat Completions 格式调用智谱 open.bigmodel.cn。在智谱开放平台创建密钥。默认模型 glm-4-flash-250414。基础地址不要加 /v1。",
    "help.kimi": "调用月之暗面 api.moonshot.cn。在 platform.kimi.com 创建密钥。默认模型 kimi-k3.1-pro。platform.kimi.ai 的国际站密钥不能用于这个国内地址，使用国际站密钥时请修改基础地址。",
    "help.deepseek": "从此页面以 Chat Completions 格式调用 api.deepseek.com。在 platform.deepseek.com 创建密钥。默认模型 deepseek-chat。",
    "help.qwen": "调用阿里云百炼的 DashScope 兼容模式。在阿里云百炼创建密钥。默认模型 qwen-plus。已关闭思考模式，以便直接返回简历正文。",
    "help.ollama": "调用本机 Ollama，不需要密钥。请通过 http://localhost 打开本页（托管的 https 页面无法访问 http://localhost），并在启动 Ollama 时把 OLLAMA_ORIGINS 设为本页来源。",
    "empty.ledger": "账本还是空的。添加一款游戏、载入示例，或从 Steam 导入。两条路径都会到这里。",
    "empty.resume": "简历会显示在这里。可以复制，或导出 TXT、HTML 和 LaTeX PDF。",
    "badge.manual": "手动",
    "badge.steam": "Steam",
    untitled: "未命名游戏",
    roleMissing: "未填写职位",
    achievementsMissing: "还没有成就或职责。",
    up: "上移",
    down: "下移",
    edit: "编辑",
    delete: "删除",
    save: "保存",
    "field.title": "游戏名称 / 组织",
    "field.role": "角色 / 职位",
    "field.start": "开始日期",
    "field.end": "结束日期",
    "field.current": "目前仍在进行",
    "field.hours": "总游玩时长（小时）",
    "field.achievements": "希望写进简历的职责",
    "field.achievementPicks": "Steam 成就",
    "achieve.hint": "只有勾选的成就会发给模型。全部不选时，草稿改用这款游戏里为人熟知的事迹。",
    "achieve.all": "全选",
    "achieve.none": "全不选",
    "achieve.noneSelected": "没有选择成就。草稿将使用游戏中的标志性事迹。",
    "draft.edit": "编辑草稿",
    "draft.hint": "在这里改文字。预览、复制和导出会使用这一版。",
    "field.notes": "补充说明",
    "ph.title": "最终幻想14",
    "ph.role": "部队会长、突袭指挥、官员",
    "ph.achievements": "写你组织、指导、搭建或负责过的事。如果知道人数和频率，请一并写上。",
    "ph.notes": "招聘方不能误解的背景。例如：志愿者职务，不是雇佣关系。",
    present: "至今",
    datesMissing: "未填写日期",
    hoursMissing: "未填写时长",
    hours: "{n} 小时",
    writing: "正在撰写简历…",
    fetching: "正在获取 Steam 数据…",
    contacting: "正在连接 Steam…",
    "chip.ready": "{label} 已就绪",
    "chip.needed": "{label} · 需要密钥",
    "meta.ready": "{n} 条经历可发送给 {label}。",
    "meta.readyOne": "{n} 条经历可发送给 {label}。",
    "meta.empty": "添加一条带名称的经历后，即可用 {label} 生成。",
    "toast.storage": "无法保存。浏览器存储已满或被阻止。",
    "toast.savedGame": "游戏已保存。",
    "toast.removed": "已移除该游戏。",
    "toast.samplesOne": "已添加一条示例。",
    "toast.samples": "已添加示例。",
    "toast.samplesExist": "示例已经在账本中。",
    "toast.cleared": "账本已清空。",
    "toast.settings": "设置已保存在此浏览器。",
    "toast.keysRemoved": "已移除保存的密钥。",
    "toast.steam": "Steam 游戏已加入账本。",
    "toast.resume": "简历草稿已生成。",
    "toast.copied": "已复制 Markdown。",
    "toast.languageDraft": "语言已切换。屏幕上的草稿仍是生成时的语言，再次生成才会改写。",
    "confirm.delete": "从账本中移除{label}？",
    "confirm.game": "这款游戏",
    "confirm.clear": "从这台浏览器的账本中移除全部游戏？",
    "confirm.keys": "从这台浏览器中移除所有模型密钥和 Steam 密钥？",
    "error.title": "请填写游戏名称。",
    "error.hours": "时长请填写数字，或留空。",
    "error.dates": "结束日期早于开始日期。",
    "error.invalidUrl": "{label}必须是有效的网址。",
    "error.httpUrl": "{label}必须以 http:// 或 https:// 开头。",
    "error.steamKey": "获取前请先在设置中填写 Steam Web API 密钥。",
    "error.steamId": "请输入 SteamID64、个性网址，或 steamcommunity.com 个人资料链接。",
    "error.vanity": "Steam 找不到这个个性网址。请改用个人资料链接中的 17 位 SteamID64。",
    "error.private": "Steam 没有返回游戏列表。个人资料很可能是私密的，或游戏详情未设为公开。请在 Steam 中打开“编辑个人资料”，进入“隐私设置”，将游戏详情设为公开。",
    "error.noGames": "个人资料是公开的，但没有可导入的游戏。",
    "error.noneQualified": "找到 {count} 款游戏。没有一款达到 {hours} 小时。请降低最少时长后再获取。",
    "error.steamProxy": "Steam 请求没有完成。代理可能不可用、拦截了请求，或改写了响应。请换一个你信任的代理，或改为手动填写。",
    "error.steamCors": "浏览器拦截了 Steam 请求。Steam 不直接回应网站。请停掉当前服务器，在本文件夹运行 py -3 serve.py，然后打开 http://localhost:8080。CORS 代理一栏留空。",
    "error.steamAuth": "Steam 拒绝了密钥（HTTP {status}）。请检查设置中的 Steam Web API 密钥。",
    "error.steamFailed": "Steam 导入失败。",
    "error.achievements": "无法读取成就记录（{reason}）。",
    "error.achievementsGeneric": "无法读取成就记录（个人资料限制，或该游戏没有 Steam 统计数据）。",
    "error.noStats": "没有公开统计",
    "error.needTitle": "请至少添加一款写了名称的游戏。",
    "error.needKey": "请先在设置中保存模型 API 密钥，然后再生成。Ollama 不需要密钥。",
    "error.emptyDraft": "模型返回了空草稿。",
    "error.modelChars": "模型名称为空，或包含不支持的字符。",
    "error.chooseProvider": "请在设置中选择服务商。",
    "error.timeout": "服务商响应超时。请重试，或在设置中改用更快的模型。",
    "error.ollamaNet": "无法连接 Ollama。请在这台电脑上启动它，把 OLLAMA_ORIGINS 设为本页来源，并通过 http://localhost 打开 Quest2Resume，不要用托管的 https 页面。",
    "error.chatNet": "浏览器无法读取该服务商的响应。被拒绝的密钥有时会表现为网络失败，部分服务商也会拦截网页直接调用。请检查密钥、模型名称和基础地址。",
    "error.claudeNet": "浏览器无法连接 Claude。请检查密钥和模型。部分 Anthropic 组织会禁止浏览器调用。",
    "error.geminiNet": "浏览器无法连接 Gemini。请检查密钥、模型名称，以及密钥上的网站限制。",
    "error.gemini403": "{message} 如果此密钥限制了网站，请在 Google AI Studio 中加入本页地址。",
    "error.claudeCors": "Claude 拒绝了该组织的浏览器调用。密钥仍可能有效。可改用 Gemini、OpenAI 或本地 Ollama。",
    "error.ollamaMissing": "{message} 请先执行 ollama pull {model}，或在设置中更换模型。",
    "error.request": "请求失败。",
    "error.notJson": "响应不是 JSON。",
    "error.geminiBlocked": "Gemini 拦截了请求（{reason}）。",
    "error.geminiEmpty": "Gemini 没有返回文本。",
    "error.geminiEmptyReason": "Gemini 没有返回文本（{reason}）。",
    "error.openaiEmpty": "服务商没有返回文本。",
    "error.claudeEmpty": "Claude 没有返回文本。",
    "error.claudeEmptyReason": "Claude 没有返回文本（{reason}）。",
    "error.ollamaEmpty": "Ollama 没有返回文本。请确认已经拉取该模型。",
    "steam.reading": "正在读取成就（{done} / {total}）…",
    "steam.unlocked": "已解锁 {unlocked} / {total} 项成就。",
    "steam.lastPlayed": "最近游玩 {date}。",
    "steam.notes": "从 Steam 导入。应用 {appid}。{lastPlayed}Steam Replay 没有这个游戏的月份，因此开始月份是首次成就，结束月份是最近游玩。请补上 Steam 无法提供的职位。",
    "steam.notesReplay": "从 Steam Replay 导入。应用 {appid}。{lastPlayed}开始月份是 Replay 记录的最早游玩月。结束月份是 Replay 的最后一月；若最近游玩更晚，则用最近游玩。请补上 Steam 无法提供的职位。",
    "steam.replay": "Steam Replay 提供了 {years} 个年份的日期。",
    "steam.replayMissing": "Steam Replay 没有返回游玩月份。日期改用首次成就和最近游玩。请在 Replay 页面把每一年设为公开。",
    "steam.app": "Steam 应用 {appid}",
    "steam.imported": "已导入 {count} 款游戏{persona}。",
    "steam.game": "款",
    "steam.games": "款",
    "steam.for": "（{name}）",
    "steam.updated": "已更新账本中的 {count} 款。",
    "steam.addRole": "生成前请为每张卡片补上职位。",
    "steam.privacy": "该资料并非完全公开。如果游戏缺失，请将游戏详情设为公开。",
    "export.title": "简历",
    "export.foot": "发出之前请逐句核对。",
    "exportPdf": "导出 LaTeX PDF",
    "toast.pdf": "已下载 LaTeX PDF。",
    "toast.pdfComposed": "这台电脑没有安装 LaTeX，因此这份 PDF 按同一份简历排版，并同时下载了 resume.tex。",
    "toast.tex": "已下载 resume.tex。安装 TeX Live 或 MiKTeX 后可再次导出并编译。",
    "error.pdf": "无法生成 PDF。",
  }
};

function currentLanguage() {
  return state.ui?.language === "zh" ? "zh" : "en";
}

function t(key, vars) {
  const lang = currentLanguage();
  let text = I18N[lang][key] ?? I18N.en[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.split(`{${name}}`).join(String(value));
    });
  }
  return text;
}

function applyI18n() {
  const lang = currentLanguage();
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  document.documentElement.classList.toggle("lang-zh", lang === "zh");
  document.title = t("meta.title");
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute("content", t("meta.description"));
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => {
    node.innerHTML = t(node.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAria));
  });
  document.querySelectorAll(".lang-btn").forEach((button) => {
    const selected = button.dataset.lang === lang;
    button.setAttribute("aria-pressed", selected ? "true" : "false");
  });
  syncSecretLabels();
}

function syncSecretLabels() {
  [["toggle-api-key", "api-key"], ["toggle-steam-key", "steam-api-key"]].forEach(([buttonId, inputId]) => {
    const input = $(inputId);
    const button = $(buttonId);
    if (!input || !button) return;
    const shown = input.type === "text";
    button.textContent = t(shown ? "hide" : "show");
    button.setAttribute("aria-pressed", shown ? "true" : "false");
  });
}

function stashOpenEditor() {
  if (!state.editingId) return;
  const exp = findExperience(state.editingId);
  const next = readEditor(state.editingId);
  if (!exp || !next) return;
  const hours = Number.isNaN(next.hours) ? exp.hours : next.hours;
  Object.assign(exp, next, { hours, draft: exp.draft });
}

function setLanguage(lang) {
  const next = lang === "zh" ? "zh" : "en";
  const hadDraft = Boolean(state.ui.resumeMarkdown);
  const changed = state.ui.language !== next;
  stashOpenEditor();
  state.ui.language = next;
  saveUi();
  applyI18n();
  if ($("provider")) syncProviderFields();
  renderChrome();
  renderExperiences();
  renderOutput();
  if (changed && hadDraft) toast(t("toast.languageDraft"));
}

const PROMPT_RULES = [
  "You write resume content for a job applicant.",
  "The source is video game participation: a game, a role inside it, playtime, achievement unlocks, and the applicant's own notes.",
  "Turn each game role into entries a hiring manager can skim: the position, the projects led, the problems solved, and the outcome.",
  "Follow the writing method in the user message. It is the STAR method in the compressed form career offices recommend: action verb, named project or problem, the skill or technique used, and the result. Situation and task belong in the duty line, not as a four-part label.",
  "The organization is the game or the in-game faction. Never name a studio, and never name a real employer the source does not name.",
  "When the applicant names a story game and does not list projects, use that game's widely known missions, factions, and in-game outcomes, and name them.",
  "Prefer those iconic projects over achievement names. If the source says no achievements were selected, do not mention achievements or unlocks.",
  "Never write how many achievements were unlocked, earned, or completed. Do not write ratios such as 12 of 40 or 已解锁 12/40.",
  "Notes, the role title, and numbers the applicant wrote override that canon. Do not replace a story they wrote with a different plot.",
  "In-game payouts, ranks, and quest results may be stated as in-game outcomes. Do not convert them into salary, revenue, or employment.",
  "Do not invent a school, degree, certification, real employer, team size, or personal metric that is not in the source.",
  "Do not add a programming language, a spoken language, or a software tool unless the source shows that work or the matching activity in the target role.",
  "Name the professional skill the work actually used, such as planning, crew coordination, negotiation, incident response, documentation, resource planning, or onboarding.",
  "Hours belong on the date line. They are not proof of leadership.",
  "If a note says the role was volunteer or player-run, keep that frame in the duty line.",
  "No slang and no emoji. Keep game titles as proper nouns, and explain a game-specific term the first time it appears.",
  "Output GitHub-flavored Markdown and nothing else. Do not wrap the document in a code fence."
].join(" ");

const BRIEF_LIMIT = 20000;
const FALLBACK_BRIEF = "WRITING METHOD\nWrite each role with the game or the in-game group as the organization. Use a duty line, then four or five bullets that name the project, the skill, the problem, and the in-game outcome. Do not name a studio or any employer the source does not name.";
let fileBrief = "";

function currentWritingBrief() {
  const custom = state.ui.writingBrief;
  if (typeof custom === "string") return custom.trim().slice(0, BRIEF_LIMIT);
  return (fileBrief || FALLBACK_BRIEF).trim();
}

async function loadWritingBriefFile() {
  try {
    const response = await fetch("writing-brief.md", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    fileBrief = (await response.text()).replace(/^\uFEFF/, "").trim();
  } catch {
    fileBrief = FALLBACK_BRIEF;
  }
  const box = $("writing-brief");
  if (!box || document.activeElement === box) return;
  box.value = typeof state.ui.writingBrief === "string" ? state.ui.writingBrief : fileBrief;
}

function buildSystemPrompt() {
  if (currentLanguage() === "zh") {
    return `${PROMPT_RULES} Write a formal job resume in Simplified Chinese (简体中文). Every heading, sentence, bullet, and duty line must be Simplified Chinese. The duty line starts with 负责, never with "Responsible for". Translate English labels in the writing method, including Present as 至今 and hours as 小时. Keep game titles and other proper nouns in their original form. Do not add an English translation or bilingual lines. Do not state how many achievements were unlocked. Use wording suitable for a corporate job application in mainland China. Do not include the applicant's name, email, phone, or other contact details.`;
  }
  return `${PROMPT_RULES} Write a formal job resume in plain English. Do not include the applicant's name, email, phone, or other contact details.`;
}

function defaultProfile() {
  return {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    linkedin: "",
    education: "",
    includeName: true,
    includeEmail: true,
    includePhone: false,
    includeLocation: true,
    includeWebsite: false,
    includeLinkedin: false,
    includeSummary: true,
    includeSkills: true,
    includeEducation: false
  };
}

function normalizeProfile(raw) {
  const profile = defaultProfile();
  const source = raw && typeof raw === "object" ? raw : {};
  ["fullName", "email", "phone", "location", "website", "linkedin", "education"].forEach((key) => {
    profile[key] = String(source[key] || "").slice(0, key === "education" ? 800 : 160);
  });
  Object.keys(profile).forEach((key) => {
    if (key.startsWith("include") && typeof source[key] === "boolean") profile[key] = source[key];
  });
  return profile;
}

const SAMPLE_ENTRIES = {
  en: [
  {
    title: "Final Fantasy XIV",
    role: "Free Company Officer",
    startDate: "2022-03",
    endDate: "",
    current: true,
    hours: 2100,
    achievements: "Led a volunteer raid group of about 40 players on three scheduled nights a week.\nWrote the weekly strategy notes new members used before a fight.\nReplaced callers when attendance dropped and kept the roster through two expansion launches.\nReviewed wipes after each session and changed assignments for the next pull.",
    notes: "Volunteer community role, not employment. Team size and schedule are the applicant's own figures."
  },
  {
    title: "EVE Online",
    role: "Corporation Logistics Lead",
    startDate: "2021-06",
    endDate: "2023-11",
    current: false,
    hours: 900,
    achievements: "Coordinated hauling schedules for about 25 pilots moving materials between three trade hubs.\nKept a shared sheet of build costs and adjusted buy orders when prices moved.\nWrote a one-page handoff so the next director could run the same routes.",
    notes: "Player-run corporation. Figures are estimates supplied by the applicant, not audited records."
  }
  ],
  zh: [
  {
    title: "Final Fantasy XIV",
    role: "部队官员",
    startDate: "2022-03",
    endDate: "",
    current: true,
    hours: 2100,
    achievements: "带领约 40 人的志愿者突袭小队，每周固定三个晚上活动。\n为新成员撰写每周作战笔记，供开打前阅读。\n出勤下降时补上指挥，并在两个资料片上线期间维持名册。\n每次团灭后复盘，并调整下一次尝试的分工。",
    notes: "志愿者社区职务，不是雇佣关系。人数和排期是申请者自己的记录。"
  },
  {
    title: "EVE Online",
    role: "军团物流负责人",
    startDate: "2021-06",
    endDate: "2023-11",
    current: false,
    hours: 900,
    achievements: "协调约 25 名飞行员在三个贸易枢纽之间的运输排期。\n维护共享的建造成本表，并在价格变动时调整买单。\n写了一页交接说明，让下一任负责人可以沿用同样的航线。",
    notes: "玩家运营的军团。数字是申请者的估计，不是审计记录。"
  }
  ]
};

const state = {
  settings: null,
  experiences: [],
  ui: {
    tab: "manual",
    language: "en",
    targetRole: "",
    steamId: "",
    steamPersona: "",
    steamPersonaKey: "",
    steamLimit: 6,
    steamMinHours: 5,
    resumeMarkdown: "",
    profile: null
  },
  editingId: null,
  generating: false,
  fetchingSteam: false,
  exportingPdf: false,
  storageOk: true
};

let toastTimer = 0;
let modelDraft = {};
let baseDraft = {};
let keyDraft = {};
let settingsFormProvider = "gemini";

function $(id) {
  return document.getElementById(id);
}

function uid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "class") node.className = value || "";
    else if (key === "text") node.textContent = value == null ? "" : String(value);
    else if (key === "value") node.value = value == null ? "" : String(value);
    else if (key === "checked") node.checked = Boolean(value);
    else if (key === "disabled") node.disabled = Boolean(value);
    else if (value == null || value === false) return;
    else node.setAttribute(key, value === true ? "" : String(value));
  });
  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    if (child == null || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function redact(text) {
  let output = String(text ?? "");
  const secrets = [state.settings?.apiKey, state.settings?.steamApiKey, ...Object.values(state.settings?.apiKeys || {})];
  secrets.forEach((secret) => {
    const value = (secret || "").trim();
    if (value.length >= 8) output = output.split(value).join("[redacted]");
  });
  return output;
}

function toast(message) {
  const node = $("toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove("show"), 3200);
}

function storageAvailable() {
  try {
    localStorage.setItem("__quest2resume", "1");
    localStorage.removeItem("__quest2resume");
    return true;
  } catch {
    return false;
  }
}

function readJson(key, fallback) {
  if (!state.storageOk) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!state.storageOk) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    toast(t("toast.storage"));
  }
}

function defaultBaseUrls() {
  return Object.fromEntries(Object.entries(CHAT_PROVIDERS).map(([id, spec]) => [id, spec.base]));
}

function emptyApiKeys() {
  return Object.fromEntries(Object.keys(DEFAULT_MODELS).filter((id) => id !== "ollama").map((id) => [id, ""]));
}

function defaultSettings() {
  const baseUrls = defaultBaseUrls();
  return {
    provider: "gemini",
    apiKey: "",
    apiKeys: emptyApiKeys(),
    models: { ...DEFAULT_MODELS },
    baseUrls,
    openaiBaseUrl: baseUrls.openai,
    ollamaBaseUrl: "http://localhost:11434",
    steamApiKey: "",
    steamProxy: ""
  };
}

function loadSettings() {
  const saved = readJson(STORAGE_KEYS.settings, {});
  const defaults = defaultSettings();
  const provider = DEFAULT_MODELS[saved.provider] ? saved.provider : defaults.provider;
  const baseUrls = { ...defaults.baseUrls, ...(saved.baseUrls || {}) };
  if (saved.openaiBaseUrl && !saved.baseUrls?.openai) {
    baseUrls.openai = String(saved.openaiBaseUrl).replace(/\/$/, "");
  }
  const apiKeys = { ...defaults.apiKeys, ...(saved.apiKeys || {}) };
  if (saved.apiKey && !saved.apiKeys && provider !== "ollama") {
    apiKeys[provider] = String(saved.apiKey);
  }
  return {
    ...defaults,
    ...saved,
    provider,
    models: { ...defaults.models, ...(saved.models || {}) },
    baseUrls,
    apiKeys,
    apiKey: provider === "ollama" ? "" : (apiKeys[provider] || ""),
    openaiBaseUrl: baseUrls.openai
  };
}

function loadExperiences() {
  const saved = readJson(STORAGE_KEYS.experiences, []);
  if (!Array.isArray(saved)) return [];
  return saved.map(normalizeExperience).filter(Boolean);
}

function normalizeAchievementItem(raw, selectedDefault) {
  if (!raw || typeof raw !== "object") return null;
  const name = String(raw.name || "").trim().slice(0, 160);
  if (!name) return null;
  return {
    name,
    when: String(raw.when || "").trim().slice(0, 40),
    detail: String(raw.detail || "").trim().slice(0, 300),
    selected: typeof raw.selected === "boolean" ? raw.selected : Boolean(selectedDefault)
  };
}

function achievementItemsFromText(text) {
  const items = [];
  String(text || "").split("\n").forEach((line) => {
    const match = line.trim().match(/^-\s+(.+)$/);
    if (!match) return;
    const body = match[1].trim();
    const dated = body.match(/^(.*?)\s+\(([^)]+)\)\s*(?:[—–-]\s*(.*))?$/);
    if (dated && dated[1].trim()) {
      items.push({ name: dated[1].trim(), when: dated[2].trim(), detail: (dated[3] || "").trim(), selected: true });
      return;
    }
    const plain = body.match(/^(.*?)\s+[—–-]\s+(.*)$/);
    if (plain && plain[1].trim()) items.push({ name: plain[1].trim(), when: "", detail: plain[2].trim(), selected: true });
    else items.push({ name: body, when: "", detail: "", selected: true });
  });
  return items.map((item) => normalizeAchievementItem(item, true)).filter(Boolean);
}

function normalizeAchievementItems(raw) {
  const source = Array.isArray(raw.achievementItems) ? raw.achievementItems : achievementItemsFromText(raw.achievements);
  const seen = new Set();
  return source.map((item) => normalizeAchievementItem(item, false)).filter((item) => {
    if (!item || seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  }).slice(0, 60);
}

function responsibilityText(exp) {
  const text = String(exp?.achievements || "").trim();
  if (!(exp?.achievementItems || []).length) return text;
  return text.split("\n").map((line) => line.trim()).filter((line) => line && !/^-\s+/.test(line)).join("\n");
}

function selectedAchievements(exp) {
  return (exp?.achievementItems || []).filter((item) => item.selected);
}

function normalizeExperience(raw) {
  if (!raw || typeof raw !== "object") return null;
  const hours = raw.hours === "" || raw.hours == null ? null : Number(raw.hours);
  return {
    id: String(raw.id || uid()),
    source: raw.source === "steam" ? "steam" : "manual",
    appId: Number.isFinite(Number(raw.appId)) ? Number(raw.appId) : null,
    title: String(raw.title || "").trim(),
    role: String(raw.role || "").trim(),
    startDate: /^\d{4}-\d{2}$/.test(raw.startDate || "") ? raw.startDate : "",
    endDate: /^\d{4}-\d{2}$/.test(raw.endDate || "") ? raw.endDate : "",
    current: Boolean(raw.current),
    hours: Number.isFinite(hours) && hours >= 0 ? Math.round(hours * 10) / 10 : null,
    achievements: String(raw.achievements || "").trim(),
    achievementItems: normalizeAchievementItems(raw),
    notes: String(raw.notes || "").trim(),
    iconUrl: typeof raw.iconUrl === "string" && raw.iconUrl.startsWith("https://") ? raw.iconUrl : "",
    draft: false
  };
}

function saveExperiences() {
  writeJson(STORAGE_KEYS.experiences, state.experiences.filter((item) => !item.draft).map(normalizeExperience));
}

function saveUi() {
  writeJson(STORAGE_KEYS.ui, {
    tab: state.ui.tab,
    language: state.ui.language,
    targetRole: state.ui.targetRole,
    steamId: state.ui.steamId,
    steamPersona: state.ui.steamPersona || "",
    steamPersonaKey: state.ui.steamPersonaKey || "",
    steamLimit: state.ui.steamLimit,
    steamMinHours: state.ui.steamMinHours,
    resumeMarkdown: state.ui.resumeMarkdown,
    writingBrief: typeof state.ui.writingBrief === "string" ? state.ui.writingBrief : null,
    profile: state.ui.profile
  });
}

function createExperience(partial = {}) {
  return normalizeExperience({
    id: uid(),
    source: "manual",
    ...partial,
    draft: false
  });
}

function timeoutSignal(ms) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  return undefined;
}

async function fetchJson(url, options = {}) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError") throw err;
    const wrapped = new Error("Failed to fetch");
    wrapped.isNetwork = true;
    wrapped.cause = err;
    throw wrapped;
  }
  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = null;
    }
  }
  if (!response.ok) {
    const nested = data?.error;
    const message = nested?.message
      || (typeof nested === "string" ? nested : "")
      || data?.message
      || `HTTP ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  if (data == null) throw new Error(t("error.notJson"));
  return data;
}

function setBanner(id, message, kind) {
  const node = $(id);
  if (!message) {
    node.hidden = true;
    node.textContent = "";
    return;
  }
  node.hidden = false;
  node.className = `banner ${kind || "info"}`;
  node.textContent = redact(message);
}

function setBusy(button, busy, busyLabel, idleLabel) {
  button.disabled = busy;
  button.replaceChildren();
  if (busy) {
    button.append(el("span", { class: "spinner", "aria-hidden": "true" }), document.createTextNode(busyLabel));
    button.setAttribute("aria-busy", "true");
  } else {
    button.textContent = idleLabel;
    button.removeAttribute("aria-busy");
  }
}

function formatMonth(value) {
  if (!value) return "";
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return value;
  const locale = currentLanguage() === "zh" ? "zh-CN" : undefined;
  return date.toLocaleString(locale, { month: "short", year: "numeric" });
}

function formatDateRange(exp) {
  const start = formatMonth(exp.startDate);
  const end = exp.current ? t("present") : formatMonth(exp.endDate);
  if (!start && !end) return t("datesMissing");
  if (start && end) return `${start} – ${end}`;
  return start ? `${start} –` : end;
}

function formatHours(hours) {
  if (hours == null || Number.isNaN(Number(hours))) return t("hoursMissing");
  const shown = Number.isInteger(Number(hours)) ? String(hours) : Number(hours).toFixed(1);
  return t("hours", { n: shown });
}

function providerReady() {
  if (state.settings.provider === "ollama") return true;
  return Boolean(state.settings.apiKey.trim());
}

function providerLabel(id) {
  const key = `provider.${id}`;
  const text = t(key);
  return text === key ? t("provider") : text;
}

function renderChip() {
  const chip = $("provider-chip");
  const label = providerLabel(state.settings.provider);
  const ready = providerReady();
  chip.textContent = t(ready ? "chip.ready" : "chip.needed", { label });
  chip.classList.toggle("chip-ready", ready);
}

function renderChrome() {
  $("exp-count").textContent = String(state.experiences.length);
  $("clear-all").disabled = state.experiences.length === 0;
  renderChip();
  renderGenerateState();
}

function renderGenerateState() {
  const button = $("generate");
  setBusy(button, state.generating, t("writing"), t("generate"));
  const ready = state.experiences.filter((item) => !item.draft && item.title).length;
  const label = providerLabel(state.settings.provider);
  const key = ready ? (ready === 1 ? "meta.readyOne" : "meta.ready") : "meta.empty";
  $("generate-meta").textContent = t(key, { n: ready, label });
}

function personaCacheKey() {
  return (state.ui.steamId || "").trim().toLowerCase();
}

function steamDisplayName() {
  const key = personaCacheKey();
  if (key && state.ui.steamPersonaKey === key && state.ui.steamPersona) return state.ui.steamPersona;
  const parsed = parseSteamInput(state.ui.steamId || "");
  if (!parsed || parsed.kind === "invalid") return t("profile.steamMissing");
  return parsed.value;
}

function rememberSteamPersona(name) {
  const persona = String(name || "").trim().slice(0, 80);
  const key = personaCacheKey();
  if (!persona || !key) return;
  if (state.ui.steamPersona === persona && state.ui.steamPersonaKey === key) return;
  state.ui.steamPersona = persona;
  state.ui.steamPersonaKey = key;
  saveUi();
  syncProfileNote();
  const profile = state.ui.profile || defaultProfile();
  if (state.ui.resumeMarkdown && !profile.includeName) renderOutput();
}

async function resolveSteamId64(parsed) {
  if (parsed.kind !== "vanity") return parsed.value;
  const resolved = await steamFetch(`ISteamUser/ResolveVanityURL/v0001/?${steamQuery({ vanityurl: parsed.value })}`);
  if (resolved?.response?.success !== 1 || !resolved.response.steamid) {
    throw new Error(t("error.vanity"));
  }
  return resolved.response.steamid;
}

async function refreshSteamPersona() {
  const profile = state.ui.profile || defaultProfile();
  if (profile.includeName) return;
  if (!state.settings?.steamApiKey?.trim()) return;
  const parsed = parseSteamInput(state.ui.steamId || "");
  if (!parsed || parsed.kind === "invalid") return;
  const key = personaCacheKey();
  if (state.ui.steamPersonaKey === key && state.ui.steamPersona) return;
  if (state.personaLookup === key) return;
  state.personaLookup = key;
  syncProfileNote();
  try {
    const steamId = await resolveSteamId64(parsed);
    const summary = await steamFetch(`ISteamUser/GetPlayerSummaries/v0002/?${steamQuery({ steamids: steamId })}`);
    const name = summary?.response?.players?.[0]?.personaname;
    if (personaCacheKey() !== key) return;
    rememberSteamPersona(name);
  } catch {
    // The heading keeps the Steam ID when the profile name cannot be read.
  } finally {
    if (state.personaLookup === key) state.personaLookup = "";
    syncProfileNote();
  }
}

function resumeName() {
  const profile = state.ui.profile || defaultProfile();
  if (profile.includeName && profile.fullName.trim()) return profile.fullName.trim();
  return steamDisplayName();
}

function resumeContacts() {
  const profile = state.ui.profile || defaultProfile();
  const pairs = [
    ["includeEmail", "email"],
    ["includePhone", "phone"],
    ["includeLocation", "location"],
    ["includeWebsite", "website"],
    ["includeLinkedin", "linkedin"]
  ];
  return pairs
    .filter(([flag, key]) => profile[flag] && profile[key].trim())
    .map(([, key]) => profile[key].trim());
}

function sectionKind(title) {
  const key = String(title || "").toLowerCase();
  if (/placement|放置/.test(key)) return "skip";
  if (/summary|概述|简介/.test(key)) return "summary";
  if (/skill|技能|能力/.test(key)) return "skills";
  if (/experience|经历/.test(key)) return "experience";
  return "extra";
}

function proseLines(body) {
  return String(body || "").split("\n").map((line) => line.trim()).filter((line) => line && !/^[-*]\s+/.test(line) && !/^\d+\.\s+/.test(line));
}

function bulletLines(body) {
  return String(body || "").split("\n").map((line) => {
    const match = line.match(/^\s*(?:[-*]|\d+\.)\s+(.*)$/);
    return match ? match[1].trim() : "";
  }).filter(Boolean);
}

function parseJobs(body) {
  return String(body || "").split(/\n(?=###\s+)/).map((chunk) => {
    const lines = chunk.split("\n");
    const head = lines[0].match(/^###\s+(.*)$/);
    if (!head) return null;
    const rest = lines.slice(1).join("\n");
    const paragraphs = proseLines(rest);
    return {
      title: head[1].trim(),
      meta: paragraphs[0] || "",
      details: paragraphs.slice(1),
      bullets: bulletLines(rest)
    };
  }).filter(Boolean);
}

function parseResume(markdown) {
  const text = String(markdown || "").replace(/\r\n/g, "\n").trim();
  const parsed = { summary: [], jobs: [], skills: [], extra: [] };
  if (!text) return parsed;
  text.split(/\n(?=##\s+)/).forEach((part) => {
    const lines = part.split("\n");
    const heading = lines[0].match(/^##\s+(.*)$/);
    const body = (heading ? lines.slice(1) : lines).join("\n").trim();
    const title = heading ? heading[1].trim() : "";
    const kind = sectionKind(title);
    if (kind === "summary") parsed.summary = proseLines(body);
    else if (kind === "skills") parsed.skills = bulletLines(body);
    else if (kind === "experience") parsed.jobs = parseJobs(body);
    else if (kind !== "skip" && body) {
      parsed.extra.push({ title: title || "Additional", paragraphs: proseLines(body), bullets: bulletLines(body) });
    }
  });
  return parsed;
}

function splitRole(title) {
  const parts = String(title || "").split(/\s+[—–-]\s+/);
  if (parts.length < 2) return { role: title || "", org: "" };
  return { role: parts[0], org: parts.slice(1).join(" — ") };
}

function buildResumeModel() {
  const profile = state.ui.profile || defaultProfile();
  const parsed = parseResume(state.ui.resumeMarkdown || "");
  const sections = [];
  if (profile.includeSummary && parsed.summary.length) {
    sections.push({ kind: "prose", title: t("section.summary"), paragraphs: parsed.summary });
  }
  if (parsed.jobs.length) {
    sections.push({ kind: "jobs", title: t("section.experience"), jobs: parsed.jobs });
  }
  if (profile.includeSkills && parsed.skills.length) {
    sections.push({ kind: "list", title: t("section.skills"), items: parsed.skills });
  }
  parsed.extra.forEach((section) => {
    sections.push({
      kind: section.bullets.length && !section.paragraphs.length ? "list" : "prose",
      title: section.title,
      paragraphs: section.paragraphs,
      items: section.bullets
    });
  });
  if (profile.includeEducation && profile.education.trim()) {
    sections.push({
      kind: "prose",
      title: t("section.education"),
      paragraphs: profile.education.trim().split(/\n+/).map((line) => line.trim()).filter(Boolean)
    });
  }
  return {
    name: resumeName(),
    headline: state.ui.targetRole.trim(),
    contacts: resumeContacts(),
    sections
  };
}

function renderResumeElement(model) {
  const body = el("div", { class: "resume-body" });
  const head = el("header", { class: "resume-head" }, [
    el("div", { class: "resume-id" }, [
      el("h1", { text: model.name }),
      model.headline ? el("p", { class: "resume-headline", text: model.headline }) : null
    ]),
    model.contacts.length
      ? el("ul", { class: "resume-contact" }, model.contacts.map((item) => el("li", { text: item })))
      : null
  ]);
  body.append(head);
  model.sections.forEach((section) => {
    const skills = section.kind === "list";
    const block = el("section", { class: skills ? "resume-section resume-skills" : "resume-section" }, [
      el("h2", { text: section.title })
    ]);
    if (section.kind === "jobs") {
      section.jobs.forEach((job) => {
        const parts = splitRole(job.title);
        const row = el("div", { class: "resume-job" }, [
          el("div", {}, [
            el("h3", { text: parts.role || job.title }),
            parts.org ? el("p", { class: "resume-org", text: parts.org }) : null
          ]),
          job.meta ? el("p", { class: "resume-when", text: job.meta }) : null
        ]);
        block.append(row);
        job.details.forEach((paragraph) => block.append(el("p", { class: "resume-duty", text: paragraph })));
        if (job.bullets.length) {
          block.append(el("ul", { class: "resume-points" }, job.bullets.map((item) => el("li", { text: item }))));
        }
      });
    } else if (section.kind === "list") {
      block.append(el("div", { class: "resume-chips" }, (section.items || []).map((item) => el("span", { class: "resume-chip", text: item }))));
    } else {
      (section.paragraphs || []).forEach((paragraph) => block.append(el("p", { class: "resume-lead", text: paragraph })));
      if ((section.items || []).length) {
        block.append(el("ul", { class: "resume-points" }, section.items.map((item) => el("li", { text: item }))));
      }
    }
    body.append(block);
  });
  return body;
}

function resumePlainText(model) {
  const lines = [model.name];
  if (model.headline) lines.push(model.headline);
  if (model.contacts.length) lines.push(model.contacts.join(" · "));
  lines.push("");
  model.sections.forEach((section) => {
    lines.push(section.title.toUpperCase());
    if (section.kind === "jobs") {
      section.jobs.forEach((job) => {
        lines.push(job.title);
        if (job.meta) lines.push(job.meta);
        job.details.forEach((paragraph) => lines.push(paragraph));
        job.bullets.forEach((item) => lines.push(`- ${item}`));
        lines.push("");
      });
    } else if (section.kind === "list") {
      (section.items || []).forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    } else {
      (section.paragraphs || []).forEach((paragraph) => lines.push(paragraph));
      (section.items || []).forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
  });
  return lines.join("\n").trim();
}

function syncProfileNote() {
  const note = $("profile-name-note");
  const include = $("include-name");
  const name = $("profile-name");
  if (!note || !include || !name) return;
  const hidden = include.checked;
  note.hidden = hidden;
  name.disabled = !include.checked;
  if (!hidden) {
    const key = personaCacheKey();
    const cached = key && state.ui.steamPersonaKey === key && state.ui.steamPersona;
    const looking = state.personaLookup && state.personaLookup === key && !cached;
    const label = cached ? "profile.nameFallback" : "profile.nameIdFallback";
    note.textContent = looking ? t("profile.nameLookup") : t(label, { id: steamDisplayName() });
  }
}

function readProfileForm() {
  const profile = state.ui.profile || defaultProfile();
  const text = (id, key) => {
    const node = $(id);
    if (node) profile[key] = node.value;
  };
  const flag = (id, key) => {
    const node = $(id);
    if (node) profile[key] = node.checked;
  };
  text("profile-name", "fullName");
  text("profile-email", "email");
  text("profile-phone", "phone");
  text("profile-location", "location");
  text("profile-website", "website");
  text("profile-linkedin", "linkedin");
  text("profile-education", "education");
  flag("include-name", "includeName");
  flag("include-email", "includeEmail");
  flag("include-phone", "includePhone");
  flag("include-location", "includeLocation");
  flag("include-website", "includeWebsite");
  flag("include-linkedin", "includeLinkedin");
  flag("include-summary", "includeSummary");
  flag("include-skills", "includeSkills");
  flag("include-education", "includeEducation");
  state.ui.profile = normalizeProfile(profile);
}

function fillProfileForm() {
  const profile = state.ui.profile || defaultProfile();
  const text = (id, value) => {
    const node = $(id);
    if (node) node.value = value;
  };
  const flag = (id, value) => {
    const node = $(id);
    if (node) node.checked = value;
  };
  text("profile-name", profile.fullName);
  text("profile-email", profile.email);
  text("profile-phone", profile.phone);
  text("profile-location", profile.location);
  text("profile-website", profile.website);
  text("profile-linkedin", profile.linkedin);
  text("profile-education", profile.education);
  flag("include-name", profile.includeName);
  flag("include-email", profile.includeEmail);
  flag("include-phone", profile.includePhone);
  flag("include-location", profile.includeLocation);
  flag("include-website", profile.includeWebsite);
  flag("include-linkedin", profile.includeLinkedin);
  flag("include-summary", profile.includeSummary);
  flag("include-skills", profile.includeSkills);
  flag("include-education", profile.includeEducation);
  syncProfileNote();
}

function renderOutput() {
  const paper = $("resume-paper");
  const markdown = state.ui.resumeMarkdown;
  ["copy-resume", "export-txt", "export-html", "export-pdf"].forEach((id) => {
    const node = $(id);
    if (node) node.disabled = !markdown;
  });
  syncProfileNote();
  paper.replaceChildren();
  const source = $("resume-source");
  const sourceField = $("resume-source-field");
  if (source && sourceField) {
    const editing = document.activeElement === source;
    sourceField.hidden = !markdown && !editing;
    if (!editing) source.value = markdown;
  }
  if (!markdown) {
    paper.append(el("p", {
      class: "resume-empty",
      text: t("empty.resume")
    }));
    return;
  }
  paper.append(renderResumeElement(buildResumeModel()));
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  const parts = [];
  let listType = null;
  const closeList = () => {
    if (!listType) return;
    parts.push(listType === "ol" ? "</ol>" : "</ul>");
    listType = null;
  };
  lines.forEach((line) => {
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const type = ul ? "ul" : "ol";
      if (listType !== type) {
        closeList();
        parts.push(type === "ol" ? "<ol>" : "<ul>");
        listType = type;
      }
      parts.push(`<li>${inlineMarkdown(ul ? ul[1] : ol[1])}</li>`);
      return;
    }
    closeList();
    if (/^###\s+/.test(line)) parts.push(`<h3>${inlineMarkdown(line.replace(/^###\s+/, ""))}</h3>`);
    else if (/^##\s+/.test(line)) parts.push(`<h2>${inlineMarkdown(line.replace(/^##\s+/, ""))}</h2>`);
    else if (/^#\s+/.test(line)) parts.push(`<h1>${inlineMarkdown(line.replace(/^#\s+/, ""))}</h1>`);
    else if (/^(-{3,}|\*{3,})$/.test(line.trim())) parts.push("<hr>");
    else if (line.trim()) parts.push(`<p>${inlineMarkdown(line)}</p>`);
  });
  closeList();
  return parts.join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

function renderExperiences() {
  const list = $("experience-list");
  list.replaceChildren();
  if (!state.experiences.length) {
    list.append(el("div", {
      class: "empty",
      text: t("empty.ledger")
    }));
    renderChrome();
    return;
  }
  state.experiences.forEach((exp, index) => {
    list.append(exp.id === state.editingId ? editCard(exp) : viewCard(exp, index));
  });
  renderChrome();
}

function viewCard(exp, index) {
  const picked = selectedAchievements(exp);
  const responsibilities = responsibilityText(exp);
  const achievements = picked.length
    ? picked.map((item) => item.name).join(", ")
    : (exp.achievementItems || []).length
      ? t("achieve.noneSelected")
      : (responsibilities || t("achievementsMissing"));
  const icon = exp.iconUrl
    ? el("img", { class: "exp-icon", src: exp.iconUrl, alt: "" })
    : null;
  if (icon) icon.addEventListener("error", () => icon.remove());
  return el("article", { class: "exp-card", "data-id": exp.id }, [
    el("div", { class: "exp-top" }, [
      icon,
      el("div", { class: "exp-main" }, [
        el("h3", { class: "exp-title", text: exp.title || t("untitled") }),
        el("span", {
          class: exp.source === "steam" ? "badge badge-steam" : "badge badge-manual",
          text: exp.source === "steam" ? t("badge.steam") : t("badge.manual")
        }),
        el("p", { class: "exp-role", text: exp.role || t("roleMissing") }),
        el("p", { class: "exp-meta", text: `${formatDateRange(exp)} · ${formatHours(exp.hours)}` }),
        el("p", { class: "exp-preview", text: achievements }),
        exp.notes ? el("p", { class: "exp-notes", text: exp.notes }) : null
      ]),
      el("div", { class: "exp-actions" }, [
        el("button", { type: "button", class: "btn", "data-action": "up", disabled: index === 0, text: t("up") }),
        el("button", {
          type: "button",
          class: "btn",
          "data-action": "down",
          disabled: index === state.experiences.length - 1,
          text: t("down")
        }),
        el("button", { type: "button", class: "btn", "data-action": "edit", text: t("edit") }),
        el("button", { type: "button", class: "btn danger", "data-action": "delete", text: t("delete") })
      ])
    ])
  ]);
}

function editCard(exp) {
  return el("form", { class: "exp-card exp-form", "data-id": exp.id }, [
    field(t("field.title"), el("input", {
      name: "title",
      type: "text",
      required: true,
      value: exp.title,
      placeholder: t("ph.title"),
      maxlength: "160"
    })),
    field(t("field.role"), el("input", {
      name: "role",
      type: "text",
      value: exp.role,
      placeholder: t("ph.role"),
      maxlength: "160"
    })),
    el("div", { class: "grid-2" }, [
      field(t("field.start"), el("input", { name: "startDate", type: "month", value: exp.startDate })),
      field(t("field.end"), el("input", {
        name: "endDate",
        type: "month",
        value: exp.endDate,
        disabled: exp.current
      }))
    ]),
    el("label", { class: "check" }, [
      el("input", { type: "checkbox", name: "current", checked: exp.current }),
      t("field.current")
    ]),
    field(t("field.hours"), el("input", {
      name: "hours",
      type: "number",
      min: "0",
      step: "0.1",
      value: exp.hours == null ? "" : String(exp.hours),
      placeholder: "120"
    })),
    achievementPicker(exp),
    field(t("field.achievements"), el("textarea", {
      name: "achievements",
      rows: "4",
      value: responsibilityText(exp),
      placeholder: t("ph.achievements")
    })),
    field(t("field.notes"), el("textarea", {
      name: "notes",
      rows: "3",
      value: exp.notes,
      placeholder: t("ph.notes")
    })),
    el("div", { class: "form-actions" }, [
      el("button", { type: "button", class: "btn", "data-action": "cancel", text: t("cancel") }),
      el("button", { type: "submit", class: "btn primary", text: t("save") })
    ])
  ]);
}

function achievementPicker(exp) {
  const items = exp.achievementItems || [];
  if (!items.length) return null;
  return el("div", { class: "achieve-block" }, [
    el("div", { class: "achieve-head" }, [
      el("span", { class: "field-label", text: t("field.achievementPicks") }),
      el("span", { class: "achieve-tools" }, [
        el("button", { type: "button", class: "btn", "data-action": "achieve-all", text: t("achieve.all") }),
        el("button", { type: "button", class: "btn", "data-action": "achieve-none", text: t("achieve.none") })
      ])
    ]),
    el("p", { class: "field-hint", text: t("achieve.hint") }),
    el("div", { class: "achieve-list" }, items.map((item, index) => el("label", { class: "achieve-box" }, [
      el("input", { type: "checkbox", name: "achievement-selected", value: String(index), checked: item.selected }),
      el("span", { class: "achieve-copy" }, [
        el("span", { class: "achieve-name", text: item.name }),
        item.when ? el("span", { class: "achieve-when", text: item.when }) : null,
        item.detail ? el("span", { class: "achieve-detail", text: item.detail }) : null
      ])
    ])))
  ]);
}

function field(label, control) {
  return el("label", { class: "field" }, [
    el("span", { class: "field-label", text: label }),
    control
  ]);
}

function findExperience(id) {
  return state.experiences.find((item) => item.id === id) || null;
}

function editorForm(id) {
  return document.querySelector(`.exp-form[data-id="${CSS.escape(id)}"]`);
}

function showFormError(form, message) {
  let box = form.querySelector(".form-error");
  if (!box) {
    box = el("p", { class: "form-error", role: "alert" });
    form.prepend(box);
  }
  box.textContent = message;
}

function readEditor(id) {
  const form = editorForm(id);
  if (!form) return null;
  const data = new FormData(form);
  const hoursText = String(data.get("hours") ?? "").trim();
  let hours = null;
  if (hoursText) {
    hours = Number(hoursText);
    if (!Number.isFinite(hours) || hours < 0) hours = NaN;
    else hours = Math.round(hours * 10) / 10;
  }
  return {
    title: String(data.get("title") || "").trim(),
    role: String(data.get("role") || "").trim(),
    startDate: String(data.get("startDate") || ""),
    endDate: data.get("current") ? "" : String(data.get("endDate") || ""),
    current: Boolean(data.get("current")),
    hours,
    achievements: String(data.get("achievements") || "").trim(),
    achievementItems: readAchievementItems(form, findExperience(id)),
    notes: String(data.get("notes") || "").trim()
  };
}

function readAchievementItems(form, exp) {
  const items = exp?.achievementItems || [];
  const boxes = [...form.querySelectorAll('input[name="achievement-selected"]')];
  return items.map((item, index) => ({
    ...item,
    selected: boxes[index] ? boxes[index].checked : item.selected
  }));
}

function saveEditor(id, options = {}) {
  const form = editorForm(id);
  const exp = findExperience(id);
  if (!form || !exp) return false;
  const next = readEditor(id);
  if (!next.title) {
    showFormError(form, t("error.title"));
    form.elements.title.focus();
    return false;
  }
  if (Number.isNaN(next.hours)) {
    showFormError(form, t("error.hours"));
    form.elements.hours.focus();
    return false;
  }
  if (next.startDate && next.endDate && next.endDate < next.startDate) {
    showFormError(form, t("error.dates"));
    form.elements.endDate.focus();
    return false;
  }
  Object.assign(exp, next, { draft: false });
  state.editingId = null;
  saveExperiences();
  renderExperiences();
  if (!options.silent) toast(t("toast.savedGame"));
  return true;
}

function editorHasContent(id) {
  const next = readEditor(id);
  if (!next) return false;
  return Boolean(next.title || next.role || next.startDate || next.endDate || next.achievements || next.notes || next.hours != null);
}

function closeEditorForExternalChange() {
  if (!state.editingId) return true;
  const exp = findExperience(state.editingId);
  if (!exp) {
    state.editingId = null;
    return true;
  }
  if (exp.draft && !editorHasContent(exp.id)) {
    state.experiences = state.experiences.filter((item) => item.id !== exp.id);
    state.editingId = null;
    return true;
  }
  return saveEditor(exp.id, { silent: true });
}

function addExperience() {
  if (!closeEditorForExternalChange()) return;
  const exp = createExperience({ draft: true, title: "" });
  exp.draft = true;
  state.experiences.unshift(exp);
  state.editingId = exp.id;
  renderExperiences();
  editorForm(exp.id)?.elements.title.focus();
}

function cancelEditor(id) {
  const exp = findExperience(id);
  if (exp?.draft) {
    state.experiences = state.experiences.filter((item) => item.id !== id);
  }
  state.editingId = null;
  renderExperiences();
}

function deleteExperience(id) {
  const exp = findExperience(id);
  if (!exp) return;
  const label = exp.title || t("confirm.game");
  if (!window.confirm(t("confirm.delete", { label }))) return;
  state.experiences = state.experiences.filter((item) => item.id !== id);
  if (state.editingId === id) state.editingId = null;
  saveExperiences();
  renderExperiences();
  toast(t("toast.removed"));
}

function moveExperience(id, direction) {
  if (!closeEditorForExternalChange()) return;
  const index = state.experiences.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= state.experiences.length) return;
  const [item] = state.experiences.splice(index, 1);
  state.experiences.splice(target, 0, item);
  saveExperiences();
  renderExperiences();
}

function loadSamples() {
  if (!closeEditorForExternalChange()) return;
  let added = 0;
  SAMPLE_ENTRIES[currentLanguage()].forEach((sample) => {
    const exists = state.experiences.some((item) => item.title.toLowerCase() === sample.title.toLowerCase() && !item.draft);
    if (exists) return;
    state.experiences.push(createExperience({ ...sample, source: "manual" }));
    added += 1;
  });
  if (!added) {
    toast(t("toast.samplesExist"));
    return;
  }
  saveExperiences();
  renderExperiences();
  toast(t(added === 1 ? "toast.samplesOne" : "toast.samples"));
}

function clearAll() {
  if (!state.experiences.length) return;
  if (!window.confirm(t("confirm.clear"))) return;
  state.experiences = [];
  state.editingId = null;
  saveExperiences();
  renderExperiences();
  toast(t("toast.cleared"));
}

function selectTab(tab) {
  state.ui.tab = tab === "steam" ? "steam" : "manual";
  const manual = tab !== "steam";
  $("tab-manual").setAttribute("aria-selected", manual ? "true" : "false");
  $("tab-steam").setAttribute("aria-selected", manual ? "false" : "true");
  $("tab-manual").tabIndex = manual ? 0 : -1;
  $("tab-steam").tabIndex = manual ? -1 : 0;
  $("panel-manual").hidden = !manual;
  $("panel-steam").hidden = manual;
  saveUi();
}

function syncProviderFields() {
  const provider = $("provider").value;
  $("provider-help").textContent = t(`help.${provider}`);
  $("api-key-field").hidden = provider === "ollama";
  const chat = CHAT_PROVIDERS[provider];
  $("openai-base-field").hidden = !chat;
  $("ollama-base-field").hidden = provider !== "ollama";
  if (chat) {
    $("openai-base-url").placeholder = chat.base;
    $("api-base-hint").textContent = t(`baseHint.${provider}`);
  }
  const model = $("model");
  if (!model.value.trim()) model.placeholder = DEFAULT_MODELS[provider];
}

function stashProviderForm(provider, form) {
  modelDraft[provider] = form.elements.model.value.trim() || DEFAULT_MODELS[provider];
  if (provider !== "ollama") keyDraft[provider] = form.elements.apiKey.value.trim();
  if (CHAT_PROVIDERS[provider]) {
    baseDraft[provider] = form.elements.openaiBaseUrl.value.trim() || CHAT_PROVIDERS[provider].base;
  }
}

function openSettings(focusId) {
  const form = $("settings-form");
  const settings = state.settings;
  modelDraft = { ...settings.models };
  baseDraft = { ...settings.baseUrls };
  keyDraft = { ...settings.apiKeys };
  settingsFormProvider = settings.provider;
  form.elements.provider.value = settings.provider;
  resetSecretField("api-key", "toggle-api-key");
  resetSecretField("steam-api-key", "toggle-steam-key");
  $("save-settings").textContent = t("saveSettings");
  form.elements.apiKey.value = keyDraft[settings.provider] || "";
  form.elements.model.value = settings.models[settings.provider] || DEFAULT_MODELS[settings.provider];
  form.elements.openaiBaseUrl.value = baseDraft[settings.provider] || settings.openaiBaseUrl;
  form.elements.ollamaBaseUrl.value = settings.ollamaBaseUrl;
  form.elements.steamApiKey.value = settings.steamApiKey;
  form.elements.steamProxy.value = settings.steamProxy;
  setBanner("settings-error", "", "error");
  syncProviderFields();
  const dialog = $("settings-dialog");
  if (!dialog.open) dialog.showModal();
  window.setTimeout(() => {
    const target = focusId ? $(focusId) : form.elements.provider;
    target?.focus();
  }, 30);
}

function closeSettings() {
  const dialog = $("settings-dialog");
  if (dialog.open) dialog.close();
}

function assertHttpUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t("error.invalidUrl", { label }));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(t("error.httpUrl", { label }));
  }
  return url.toString().replace(/\/$/, "");
}

function saveSettingsFromForm() {
  const form = $("settings-form");
  const provider = form.elements.provider.value;
  stashProviderForm(provider, form);
  let ollamaBaseUrl = form.elements.ollamaBaseUrl.value.trim() || "http://localhost:11434";
  const steamProxy = form.elements.steamProxy.value.trim();
  const baseUrls = {};
  const apiKeys = emptyApiKeys();
  try {
    Object.entries(CHAT_PROVIDERS).forEach(([id, spec]) => {
      baseUrls[id] = assertHttpUrl((baseDraft[id] || spec.base).trim() || spec.base, t("apiBase"));
    });
    ollamaBaseUrl = assertHttpUrl(ollamaBaseUrl, t("ollamaBase"));
    if (steamProxy && !steamProxy.includes("{url}") && !steamProxy.includes("{raw}")) {
      assertHttpUrl(steamProxy, t("proxy"));
    }
  } catch (err) {
    setBanner("settings-error", err.message, "error");
    return false;
  }
  Object.keys(apiKeys).forEach((id) => {
    apiKeys[id] = (keyDraft[id] || "").trim();
  });
  state.settings = {
    provider,
    apiKey: provider === "ollama" ? "" : (apiKeys[provider] || ""),
    apiKeys,
    models: { ...DEFAULT_MODELS, ...modelDraft },
    baseUrls,
    openaiBaseUrl: baseUrls.openai,
    ollamaBaseUrl,
    steamApiKey: form.elements.steamApiKey.value.trim(),
    steamProxy
  };
  writeJson(STORAGE_KEYS.settings, state.settings);
  renderChrome();
  setBanner("settings-error", "", "error");
  closeSettings();
  toast(t("toast.settings"));
  const saveButton = $("save-settings");
  saveButton.textContent = t("saved");
  window.setTimeout(() => {
    saveButton.textContent = t("saveSettings");
  }, 1600);
  return true;
}

function clearSavedKeys() {
  if (!window.confirm(t("confirm.keys"))) return;
  state.settings.apiKey = "";
  state.settings.apiKeys = emptyApiKeys();
  state.settings.steamApiKey = "";
  keyDraft = { ...state.settings.apiKeys };
  writeJson(STORAGE_KEYS.settings, state.settings);
  $("settings-form").elements.apiKey.value = "";
  $("settings-form").elements.steamApiKey.value = "";
  renderChip();
  toast(t("toast.keysRemoved"));
}

function bindSecretToggle(buttonId, inputId) {
  $(buttonId).addEventListener("click", () => {
    const input = $(inputId);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    const button = $(buttonId);
    button.textContent = t(show ? "hide" : "show");
    button.setAttribute("aria-pressed", show ? "true" : "false");
  });
}

function resetSecretField(inputId, buttonId) {
  $(inputId).type = "password";
  $(buttonId).textContent = t("show");
  $(buttonId).setAttribute("aria-pressed", "false");
}

function parseSteamInput(raw) {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "profiles" && parts[1]) {
        return /^\d{17}$/.test(parts[1]) ? { kind: "id", value: parts[1] } : { kind: "invalid", value };
      }
      if (parts[0] === "id" && parts[1]) return { kind: "vanity", value: decodeURIComponent(parts[1]) };
    } catch {
      return { kind: "invalid", value };
    }
  }
  if (/^\d{17}$/.test(value)) return { kind: "id", value };
  if (/^[A-Za-z0-9_-]{2,64}$/.test(value)) return { kind: "vanity", value };
  return { kind: "invalid", value };
}

function applyProxy(directUrl, proxy) {
  const template = (proxy || "").trim();
  if (!template) return directUrl;
  if (template.includes("{url}")) return template.replaceAll("{url}", encodeURIComponent(directUrl));
  if (template.includes("{raw}")) return template.replaceAll("{raw}", directUrl);
  return template + encodeURIComponent(directUrl);
}

function pageUsesLocalSteamHelper() {
  if (location.protocol !== "http:" && location.protocol !== "https:") return false;
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
}

function localSteamHelperUrl(directUrl) {
  return `${location.origin}/steam?url=${encodeURIComponent(directUrl)}`;
}

async function readSteamDocument(url, via) {
  try {
    return await fetchJson(url, { signal: timeoutSignal(20000) });
  } catch (err) {
    if (via === "local" && err?.status === 404) throw err;
    if (err?.isNetwork) {
      const error = new Error(via === "custom" ? t("error.steamProxy") : t("error.steamCors"));
      error.isNetwork = true;
      throw error;
    }
    if (err.status === 401 || err.status === 403) {
      throw new Error(t("error.steamAuth", { status: err.status }));
    }
    throw err;
  }
}

async function steamFetch(pathAndQuery) {
  const direct = `https://api.steampowered.com/${pathAndQuery}`;
  const custom = state.settings.steamProxy.trim();
  if (pageUsesLocalSteamHelper()) {
    try {
      return await readSteamDocument(localSteamHelperUrl(direct), "local");
    } catch (err) {
      if (err?.status !== 404) throw err;
    }
  }
  if (custom) return readSteamDocument(applyProxy(direct, custom), "custom");
  return readSteamDocument(direct, "direct");
}

function steamQuery(params) {
  const search = new URLSearchParams();
  search.set("key", state.settings.steamApiKey.trim());
  Object.entries(params).forEach(([key, value]) => search.set(key, String(value)));
  return search.toString();
}

async function mapPool(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

function localDateParts(unixSeconds) {
  const stamp = Number(unixSeconds);
  if (!stamp) return null;
  const date = new Date(stamp * 1000);
  if (Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };
}

function formatUnlockDate(unixSeconds) {
  const parts = localDateParts(unixSeconds);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function formatMonthValue(unixSeconds) {
  const parts = localDateParts(unixSeconds);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month).padStart(2, "0")}`;
}

function earliestUnlock(achievements) {
  let earliest = 0;
  (achievements || []).forEach((item) => {
    if (item.achieved !== 1) return;
    const when = Number(item.unlocktime) || 0;
    if (!when) return;
    if (!earliest || when < earliest) earliest = when;
  });
  return earliest;
}

async function loadAchievementText(steamId, game) {
  try {
    const [stats, schema] = await Promise.all([
      steamFetch(`ISteamUserStats/GetPlayerAchievements/v0001/?${steamQuery({ steamid: steamId, appid: game.appid })}`),
      steamFetch(`ISteamUserStats/GetSchemaForGame/v2/?${steamQuery({ appid: game.appid })}`).catch(() => null)
    ]);
    const payload = stats?.playerstats;
    if (!payload?.success) return { items: [], firstUnlock: 0 };
    const names = new Map();
    (schema?.game?.availableGameStats?.achievements || []).forEach((item) => {
      names.set(item.name, item);
    });
    const unlocked = (payload.achievements || []).filter((item) => item.achieved === 1);
    const firstUnlock = earliestUnlock(unlocked);
    const recent = unlocked.slice().sort((a, b) => (b.unlocktime || 0) - (a.unlocktime || 0)).slice(0, 60);
    const items = recent.map((item) => {
      const meta = names.get(item.apiname);
      return normalizeAchievementItem({
        name: meta?.displayName || item.apiname,
        when: formatUnlockDate(item.unlocktime),
        detail: meta?.description || "",
        selected: false
      }, false);
    }).filter(Boolean);
    return { items, firstUnlock };
  } catch (err) {
    if (err?.isNetwork) throw err;
    return { items: [], firstUnlock: 0 };
  }
}

function earlierMonth(left, right) {
  if (!left) return right || "";
  if (!right) return left;
  return left < right ? left : right;
}

function laterMonth(left, right) {
  if (!left) return right || "";
  if (!right) return left;
  return left > right ? left : right;
}

function monthFromUnix(unixSeconds, utc) {
  const stamp = Number(unixSeconds);
  if (!stamp) return "";
  const date = new Date(stamp * 1000);
  if (Number.isNaN(date.getTime())) return "";
  const year = utc ? date.getUTCFullYear() : date.getFullYear();
  const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function noteReplayMonth(spans, appId, month, which) {
  if (!/^\d{4}-\d{2}$/.test(month || "")) return;
  const id = Number(appId);
  if (!id) return;
  const current = spans.get(id) || { start: "", end: "" };
  if (which === "start") current.start = earlierMonth(current.start, month);
  else current.end = laterMonth(current.end, month);
  spans.set(id, current);
}

function absorbReplayYear(spans, payload) {
  const stats = payload?.response?.stats?.playtime_stats;
  if (!stats) return false;
  let saw = false;
  (stats.game_summary || []).forEach((game) => {
    const month = monthFromUnix(game.rtime_first_played_lifetime, false);
    if (!month) return;
    saw = true;
    noteReplayMonth(spans, game.appid, month, "start");
  });
  (stats.games || []).forEach((game) => {
    const month = monthFromUnix(game.rtime_first_played, false);
    if (!month) return;
    saw = true;
    noteReplayMonth(spans, game.appid, month, "start");
  });
  (stats.months || []).forEach((month) => {
    const label = monthFromUnix(month.rtime_month, true);
    (month.appid || []).forEach((game) => {
      const seconds = Number(game?.stats?.total_playtime_seconds) || 0;
      if (!seconds || !label) return;
      saw = true;
      noteReplayMonth(spans, game.appid, label, "start");
      noteReplayMonth(spans, game.appid, label, "end");
    });
  });
  return saw;
}

async function loadReplaySpans(steamId) {
  const spans = new Map();
  const current = new Date().getFullYear();
  const years = [];
  for (let year = 2022; year <= current; year += 1) years.push(year);
  let yearsRead = 0;
  await mapPool(years, 2, async (year) => {
    try {
      const payload = await steamFetch(`ISaleFeatureService/GetUserYearInReview/v1/?${steamQuery({ steamid: steamId, year })}`);
      if (absorbReplayYear(spans, payload)) yearsRead += 1;
    } catch (err) {
      if (err?.isNetwork) throw err;
    }
  });
  return { spans, yearsRead };
}

function experienceFromSteam(game, achievementRecord, replay) {
  const minutes = Number(game.playtime_forever) || 0;
  const hours = Math.round((minutes / 60) * 10) / 10;
  const lastPlayed = Number(game.rtime_last_played)
    ? t("steam.lastPlayed", { date: formatUnlockDate(game.rtime_last_played) })
    : "";
  const icon = game.img_icon_url
    ? `https://media.steampowered.com/steamcommunity/public/images/apps/${game.appid}/${game.img_icon_url}.jpg`
    : "";
  const fromReplay = Boolean(replay?.start || replay?.end);
  const startDate = replay?.start || formatMonthValue(achievementRecord?.firstUnlock);
  const endDate = laterMonth(replay?.end, formatMonthValue(game.rtime_last_played));
  return createExperience({
    source: "steam",
    appId: game.appid,
    title: game.name || t("steam.app", { appid: game.appid }),
    role: "",
    startDate,
    endDate,
    current: false,
    hours,
    achievements: "",
    achievementItems: achievementRecord?.items || [],
    notes: t(fromReplay ? "steam.notesReplay" : "steam.notes", { appid: game.appid, lastPlayed }),
    iconUrl: icon
  });
}

// Steam order: ResolveVanityURL, GetPlayerSummaries, GetOwnedGames,
// GetUserYearInReview for each Replay year, then GetPlayerAchievements and
// GetSchemaForGame for the chosen number of games, highest playtime first.
// The Web API sends no CORS headers, so a direct browser call often fails.
async function fetchSteam(event) {
  event.preventDefault();
  if (state.fetchingSteam) return;
  if (!state.settings.steamApiKey.trim()) {
    setBanner("steam-status", t("error.steamKey"), "error");
    openSettings("steam-api-key");
    return;
  }
  const parsed = parseSteamInput($("steam-id").value);
  if (!parsed || parsed.kind === "invalid") {
    setBanner("steam-status", t("error.steamId"), "error");
    $("steam-id").focus();
    return;
  }
  if (!closeEditorForExternalChange()) return;

  const limit = countAtLeast($("steam-limit").value, 1, 6);
  const minHours = clampNumber($("steam-min-hours").value, 0, 100000, 5);
  state.ui.steamId = $("steam-id").value.trim();
  state.ui.steamLimit = limit;
  state.ui.steamMinHours = minHours;
  saveUi();

  state.fetchingSteam = true;
  setBusy($("fetch-steam"), true, t("fetching"), t("fetchSteam"));
  setBanner("steam-status", t("contacting"), "info");
  try {
    const steamId = await resolveSteamId64(parsed);

    const summary = await steamFetch(`ISteamUser/GetPlayerSummaries/v0002/?${steamQuery({ steamids: steamId })}`);
    const player = summary?.response?.players?.[0];
    rememberSteamPersona(player?.personaname);

    const owned = await steamFetch(`IPlayerService/GetOwnedGames/v0001/?${steamQuery({
      steamid: steamId,
      include_appinfo: 1,
      include_played_free_games: 1
    })}`);
    const response = owned?.response || {};
    const games = Array.isArray(response.games) ? response.games : null;
    if (!games) {
      throw new Error(t("error.private"));
    }

    const qualified = games
      .filter((game) => (Number(game.playtime_forever) || 0) / 60 >= minHours)
      .sort((a, b) => (b.playtime_forever || 0) - (a.playtime_forever || 0))
      .slice(0, limit);

    if (!qualified.length) {
      throw new Error(games.length
        ? t("error.noneQualified", { count: games.length, hours: minHours })
        : t("error.noGames"));
    }

    let done = 0;
    setBanner("steam-status", t("steam.reading", { done: 0, total: qualified.length }), "info");
    const replayPromise = loadReplaySpans(steamId);
    const texts = await mapPool(qualified, 3, async (game) => {
      const text = await loadAchievementText(steamId, game);
      done += 1;
      setBanner("steam-status", t("steam.reading", { done, total: qualified.length }), "info");
      return text;
    });
    const replay = await replayPromise;

    let added = 0;
    let updated = 0;
    qualified.forEach((game, index) => {
      const mapped = experienceFromSteam(game, texts[index], replay.spans.get(Number(game.appid)));
      const existing = state.experiences.find((item) => item.source === "steam" && item.appId === mapped.appId);
      if (!existing) {
        state.experiences.push(mapped);
        added += 1;
        return;
      }
      existing.title = mapped.title;
      existing.hours = mapped.hours;
      existing.iconUrl = mapped.iconUrl;
      existing.achievementItems = mergeAchievementSelection(existing.achievementItems, mapped.achievementItems);
      if (mapped.startDate) existing.startDate = mapped.startDate;
      if (mapped.endDate) {
        existing.endDate = mapped.endDate;
        existing.current = false;
      }
      if (!existing.notes) existing.notes = mapped.notes;
      updated += 1;
    });

    saveExperiences();
    renderExperiences();
    const persona = player?.personaname ? t("steam.for", { name: player.personaname }) : "";
    const parts = [t("steam.imported", {
      count: added,
      unit: t(added === 1 ? "steam.game" : "steam.games"),
      persona
    })];
    if (updated) parts.push(t("steam.updated", { count: updated }));
    parts.push(t("steam.addRole"));
    parts.push(t(replay.yearsRead ? "steam.replay" : "steam.replayMissing", { years: replay.yearsRead }));
    if (player && player.communityvisibilitystate !== 3) parts.push(t("steam.privacy"));
    setBanner("steam-status", parts.join(" "), "success");
    toast(t("toast.steam"));
  } catch (err) {
    setBanner("steam-status", err?.message || t("error.steamFailed"), "error");
  } finally {
    state.fetchingSteam = false;
    setBusy($("fetch-steam"), false, t("fetching"), t("fetchSteam"));
  }
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function countAtLeast(value, min, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.round(number));
}

function achievementPrompt(exp) {
  const picked = selectedAchievements(exp);
  if (!picked.length) {
    return [
      "Achievements: none selected.",
      "Do not mention achievements, unlocks, unlock counts, or Steam stats.",
      "Write the iconic projects, duties, problems, and outcomes this game is known for, as you would for a game with no achievement system."
    ].join("\n");
  }
  const lines = picked.map((item) => {
    const when = item.when ? ` (${item.when})` : "";
    const detail = item.detail ? ` — ${item.detail}` : "";
    return `- ${item.name}${when}${detail}`;
  });
  return [
    "Selected achievements are supporting evidence only. Do not build the bullets as a list of these names. Do not state how many were unlocked.",
    "The projects in the bullets are the iconic missions, roles, and outcomes this game is known for. Mention a selected achievement only when it matches one of those projects.",
    ...lines
  ].join("\n");
}

function mergeAchievementSelection(previous, incoming) {
  const chosen = new Map((previous || []).map((item) => [item.name, item.selected]));
  return (incoming || []).map((item) => ({
    ...item,
    selected: chosen.has(item.name) ? chosen.get(item.name) : item.selected
  }));
}

function buildUserPrompt(entries, targetRole) {
  const blocks = entries.map((exp, index) => {
    const lines = [
      `ENTRY ${index + 1}`,
      `Source: ${exp.source}`,
      `Game / organization: ${exp.title}`,
      `Role: ${exp.role || "(not provided)"}`,
      `Start: ${exp.startDate || "(not provided)"}`,
      `End: ${exp.current ? "current" : (exp.endDate || "(not provided)")}`,
      `Hours played: ${exp.hours == null ? "(not provided)" : exp.hours}`,
      achievementPrompt(exp),
      "Responsibilities the applicant wrote:",
      responsibilityText(exp) || "(none)",
      "Notes:",
      exp.notes || "(not provided)"
    ];
    return lines.join("\n");
  }).join("\n\n");

  const zh = currentLanguage() === "zh";
  const profile = state.ui.profile || defaultProfile();
  const headings = [];
  if (profile.includeSummary) headings.push(zh ? "## 专业概述" : "## Professional Summary");
  headings.push(zh ? "## 工作经历" : "## Experience");
  if (profile.includeSkills) headings.push(zh ? "## 专业技能" : "## Skills");
  const outputLanguage = zh
    ? [
      "OUTPUT LANGUAGE: Simplified Chinese (简体中文).",
      "Every heading, sentence, bullet, and duty line must be Simplified Chinese.",
      "The writing method's English examples are patterns. Translate them. Do not copy English words such as Responsible for, Present, or hours.",
      "The duty line starts with 负责. A current end date is 至今. Hours are written as 小时.",
      "Do not write how many achievements were unlocked, and do not write phrases such as 已解锁 or 12/40.",
      "Keep game titles, product names, and numbers as written in the source.",
      "Do not add an English translation."
    ]
    : [
      "OUTPUT LANGUAGE: English.",
      "Write every heading, sentence, and bullet in English."
    ];
  const sectionNotes = [
    "Write a formal job resume in Markdown. Do not include a name, email, phone, location, or links. The page adds that heading.",
    "Do not include an education section. Do not invent a school, degree, certification, or real-world employer.",
    "Use only these level-two headings, in this order:",
    ...headings,
    profile.includeSummary
      ? "Include the summary described in the writing method."
      : "Do not write a summary section.",
    "Write every experience entry in the shape the writing method describes. Skip an entry only when the title has no canon and no notes to write from, and then say why in one short line.",
    profile.includeSkills
      ? "Include the skills list described in the writing method."
      : "Do not write a skills section."
  ];
  return [
    outputLanguage.join("\n"),
    sectionNotes.join("\n"),
    targetRole.trim()
      ? `Target role the applicant is writing toward: ${targetRole.trim()}. Prefer skill words that role is hired for when the game work supports them. Do not invent duties of that job.`
      : "No target role was provided. Use broadly hired skills: planning, coordination, problem solving, and communication.",
    currentWritingBrief(),
    "",
    "SOURCE ENTRIES",
    blocks
  ].join("\n");
}

function resolvedModel() {
  const provider = state.settings.provider;
  return (state.settings.models?.[provider] || DEFAULT_MODELS[provider] || "").trim();
}

function assertModel(model) {
  if (!model || !/^[\w.:/-]+$/.test(model)) {
    throw new Error(t("error.modelChars"));
  }
}

function stripFence(text) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:markdown|md)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}

async function callModel(system, user) {
  const provider = state.settings.provider;
  if (provider === "gemini") return callGemini(system, user);
  if (CHAT_PROVIDERS[provider]) return callChat(system, user);
  if (provider === "anthropic") return callAnthropic(system, user);
  if (provider === "ollama") return callOllama(system, user);
  throw new Error(t("error.chooseProvider"));
}

async function callGemini(system, user) {
  const model = resolvedModel();
  assertModel(model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const headers = {
    "Content-Type": "application/json",
    "x-goog-api-key": state.settings.apiKey.trim()
  };
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature: 0.5, maxOutputTokens: 8192 }
  };
  try {
    return extractGemini(await fetchJson(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: timeoutSignal(60000)
    }));
  } catch (err) {
    if (err.status !== 400) throw err;
    const retry = {
      contents: [{ role: "user", parts: [{ text: `${system}\n\n${user}` }] }],
      generationConfig: body.generationConfig
    };
    return extractGemini(await fetchJson(url, {
      method: "POST",
      headers,
      body: JSON.stringify(retry),
      signal: timeoutSignal(60000)
    }));
  }
}

function extractGemini(data) {
  if (data.promptFeedback?.blockReason) {
    throw new Error(t("error.geminiBlocked", { reason: data.promptFeedback.blockReason }));
  }
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.filter((part) => !part.thought && part.text).map((part) => part.text).join("");
  if (!text.trim()) {
    const reason = data.candidates?.[0]?.finishReason;
    throw new Error(reason ? t("error.geminiEmptyReason", { reason }) : t("error.geminiEmpty"));
  }
  return text;
}

async function callChat(system, user) {
  const provider = state.settings.provider;
  const model = resolvedModel();
  assertModel(model);
  const spec = CHAT_PROVIDERS[provider];
  const base = (state.settings.baseUrls?.[provider] || spec.base).replace(/\/$/, "");
  const body = {
    model,
    temperature: 0.5,
    max_tokens: 8192,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  };
  if (provider === "qwen") body.enable_thinking = false;
  if (provider === "glm" && /^glm-(4\.[5-9]|5)/.test(model)) body.thinking = { type: "disabled" };
  const data = await fetchJson(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.settings.apiKey.trim()}`
    },
    body: JSON.stringify(body),
    signal: timeoutSignal(60000)
  });
  const content = data.choices?.[0]?.message?.content;
  if (typeof content === "string" && content.trim()) return content;
  if (Array.isArray(content)) {
    const text = content.map((part) => part.text || part.content || "").join("");
    if (text.trim()) return text;
  }
  throw new Error(t("error.openaiEmpty"));
}

async function callAnthropic(system, user) {
  const model = resolvedModel();
  assertModel(model);
  const data = await fetchJson("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": state.settings.apiKey.trim(),
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      temperature: 0.5,
      system,
      messages: [{ role: "user", content: user }]
    }),
    signal: timeoutSignal(60000)
  });
  const text = (data.content || []).filter((block) => block.type === "text").map((block) => block.text).join("\n");
  if (!text.trim()) {
    throw new Error(data.stop_reason ? t("error.claudeEmptyReason", { reason: data.stop_reason }) : t("error.claudeEmpty"));
  }
  return text;
}

async function callOllama(system, user) {
  const model = resolvedModel();
  assertModel(model);
  const root = state.settings.ollamaBaseUrl.replace(/\/$/, "").replace(/\/api$/, "");
  const data = await fetchJson(`${root}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    }),
    signal: timeoutSignal(120000)
  });
  const text = data.message?.content || "";
  if (!text.trim()) throw new Error(t("error.ollamaEmpty"));
  return text;
}

function humanizeModelError(err) {
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return t("error.timeout");
  if (err?.isNetwork) {
    if (state.settings.provider === "ollama") return t("error.ollamaNet");
    if (state.settings.provider === "anthropic") return t("error.claudeNet");
    if (CHAT_PROVIDERS[state.settings.provider]) return t("error.chatNet");
    return t("error.geminiNet");
  }
  if (state.settings.provider === "gemini" && err?.status === 403) {
    return t("error.gemini403", { message: err.message });
  }
  if (state.settings.provider === "anthropic" && err?.status === 401 && /cors/i.test(err.message || "")) {
    return t("error.claudeCors");
  }
  if (state.settings.provider === "ollama" && /not found/i.test(err.message || "")) {
    return t("error.ollamaMissing", { message: err.message, model: resolvedModel() });
  }
  return err?.message || t("error.request");
}

async function generateResume() {
  if (state.generating) return;
  setBanner("generate-error", "", "error");
  if (!closeEditorForExternalChange()) return;
  const entries = state.experiences.filter((item) => !item.draft && item.title);
  if (!entries.length) {
    setBanner("generate-error", t("error.needTitle"), "error");
    return;
  }
  if (!providerReady()) {
    setBanner("generate-error", t("error.needKey"), "error");
    openSettings("api-key");
    return;
  }
  state.generating = true;
  renderGenerateState();
  try {
    const text = stripFence(await callModel(buildSystemPrompt(), buildUserPrompt(entries, state.ui.targetRole)));
    if (!text) throw new Error(t("error.emptyDraft"));
    state.ui.resumeMarkdown = text;
    saveUi();
    renderOutput();
    toast(t("toast.resume"));
    $("resume-paper").scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (err) {
    setBanner("generate-error", humanizeModelError(err), "error");
  } finally {
    state.generating = false;
    renderGenerateState();
  }
}

function exportHtmlDocument() {
  const model = buildResumeModel();
  const sections = model.sections.map((section) => {
    let inner = "";
    if (section.kind === "jobs") {
      inner = section.jobs.map((job) => {
        const parts = splitRole(job.title);
        const bullets = job.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
        const details = job.details.map((paragraph) => `<p class="duty">${escapeHtml(paragraph)}</p>`).join("");
        return `<article class="role">
          <div class="job"><div><h3>${escapeHtml(parts.role || job.title)}</h3>${parts.org ? `<p class="org">${escapeHtml(parts.org)}</p>` : ""}</div>${job.meta ? `<p class="when">${escapeHtml(job.meta)}</p>` : ""}</div>
          ${details}
          ${bullets ? `<ul class="points">${bullets}</ul>` : ""}
        </article>`;
      }).join("");
    } else if (section.kind === "list") {
      inner = `<div class="chips">${(section.items || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
    } else {
      inner = `${(section.paragraphs || []).map((paragraph) => `<p class="lead">${escapeHtml(paragraph)}</p>`).join("")}${(section.items || []).length ? `<ul class="points">${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}`;
    }
    return `<section><h2>${escapeHtml(section.title)}</h2>${inner}</section>`;
  }).join("");
  return `<!DOCTYPE html>
<html lang="${currentLanguage() === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(model.name)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; max-width: 800px; margin: 1.25rem auto; color: #1c2430; line-height: 1.45; background: #eef2f5; }
    main { background: #fff; border: 1px solid #d7e0e8; border-left: 7px solid #146c43; padding: 1.4rem 1.5rem 1.6rem; }
    header { border-bottom: 2px solid #146c43; padding-bottom: 0.7rem; margin-bottom: 0.2rem; }
    h1 { font-size: 2rem; margin: 0; letter-spacing: -0.03em; }
    .headline { font-family: "Segoe UI", sans-serif; color: #146c43; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; font-size: 0.78rem; margin: 0.3rem 0 0; }
    .contact { display: flex; flex-wrap: wrap; gap: 0.35rem 0.9rem; list-style: none; padding: 0; margin: 0.5rem 0 0; font-family: "Segoe UI", sans-serif; font-size: 0.88rem; color: #3d4a57; }
    .contact li { display: flex; align-items: center; gap: 0.4rem; }
    .contact li::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #146c43; }
    h2 { font-family: "Segoe UI", sans-serif; font-size: 0.76rem; letter-spacing: 0.12em; text-transform: uppercase; color: #0d5a38; border-bottom: 1px solid #d7e0e8; padding-bottom: 0.28rem; margin: 1.15rem 0 0.45rem; }
    h3 { font-size: 1.08rem; margin: 0; }
    .job { display: flex; justify-content: space-between; gap: 1rem; align-items: baseline; flex-wrap: wrap; margin-top: 0.85rem; }
    .org { font-family: "Segoe UI", sans-serif; color: #146c43; font-weight: 700; margin: 0.12rem 0 0; }
    .when { font-family: "Segoe UI", sans-serif; color: #0d5a38; background: #eef6f1; border-radius: 999px; padding: 0.12rem 0.55rem; margin: 0; white-space: nowrap; }
    .duty, .lead { margin: 0.35rem 0 0; }
    .duty { font-family: "Segoe UI", sans-serif; }
    .points { list-style: none; margin: 0.35rem 0 0.2rem; padding: 0; }
    .points li { position: relative; padding-left: 0.95rem; margin: 0.28rem 0; }
    .points li::before { content: ""; position: absolute; left: 0; top: 0.55em; width: 0.42rem; height: 2px; background: #146c43; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chips span { font-family: "Segoe UI", sans-serif; font-size: 0.84rem; color: #0d5a38; background: #eef6f1; border: 1px solid #c9e6d6; border-radius: 999px; padding: 0.18rem 0.65rem; }
    .foot { margin: 1rem 0 0; font-family: "Segoe UI", sans-serif; font-size: 0.78rem; color: #5c6770; }
  </style>
</head>
<body>
<main>
<header>
  <h1>${escapeHtml(model.name)}</h1>
  ${model.headline ? `<p class="headline">${escapeHtml(model.headline)}</p>` : ""}
  ${model.contacts.length ? `<ul class="contact">${model.contacts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
</header>
${sections}
<p class="foot">${escapeHtml(t("export.foot"))}</p>
</main>
</body>
</html>`;
}

function latexEscape(value) {
  return String(value)
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([&%$#_{}])/g, "\\$1")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function needsCjk(value) {
  return /[^\u0000-\u00ff]/.test(String(value));
}

function buildLatex(model) {
  const cjk = needsCjk(JSON.stringify(model));
  const lines = [
    "\\documentclass[11pt]{article}",
    "\\usepackage[margin=0.72in]{geometry}",
    cjk ? "\\usepackage{xeCJK}" : "",
    cjk ? "\\setCJKmainfont{SimHei}" : "",
    "\\usepackage[hidelinks]{hyperref}",
    "\\usepackage{xcolor}",
    "\\definecolor{accent}{RGB}{20,108,67}",
    "\\pagestyle{empty}",
    "\\setlength{\\parindent}{0pt}",
    "\\setlength{\\parskip}{0.3em}",
    "\\begin{document}",
    `{\\LARGE\\bfseries\\textcolor{accent}{${latexEscape(model.name)}}}\\\\[0.35em]`
  ];
  if (model.headline) lines.push(`{\\small\\bfseries\\textcolor{accent}{${latexEscape(model.headline.toUpperCase())}}}\\\\[0.25em]`);
  if (model.contacts.length) lines.push(model.contacts.map(latexEscape).join(" \\quad{\\textcolor{accent}{\\textbullet}}\\quad "));
  lines.push("\\par\\vspace{0.35em}\\noindent\\textcolor{accent}{\\rule{\\linewidth}{1.2pt}}");
  model.sections.forEach((section) => {
    lines.push("\\vspace{0.7em}");
    lines.push(`{\\small\\bfseries\\textcolor{accent}{${latexEscape(section.title.toUpperCase())}}}\\\\[-0.2em]`);
    lines.push("\\noindent\\textcolor{accent}{\\rule{\\linewidth}{0.4pt}}");
    if (section.kind === "jobs") {
      section.jobs.forEach((job) => {
        const parts = splitRole(job.title);
        lines.push("\\vspace{0.4em}");
        const org = parts.org ? `\\hfill \\textcolor{accent}{${latexEscape(parts.org)}}` : "";
        lines.push(`{\\bfseries ${latexEscape(parts.role || job.title)}}${org}\\\\`);
        if (job.meta) lines.push(`{\\itshape ${latexEscape(job.meta)}}\\\\`);
        job.details.forEach((paragraph) => lines.push(`${latexEscape(paragraph)}\\par`));
        if (job.bullets.length) {
          lines.push("\\begin{itemize}\\setlength{\\itemsep}{0.15em}");
          job.bullets.forEach((item) => lines.push(`\\item ${latexEscape(item)}`));
          lines.push("\\end{itemize}");
        }
      });
    } else if (section.kind === "list") {
      const chips = (section.items || []).map((item) => `\\textcolor{accent}{${latexEscape(item)}}`);
      if (chips.length) lines.push(chips.join(" \\quad{\\textbullet}\\quad "));
    } else {
      (section.paragraphs || []).forEach((paragraph) => lines.push(`${latexEscape(paragraph)}\\par`));
      if ((section.items || []).length) {
        lines.push("\\begin{itemize}\\setlength{\\itemsep}{0.15em}");
        section.items.forEach((item) => lines.push(`\\item ${latexEscape(item)}`));
        lines.push("\\end{itemize}");
      }
    }
  });
  lines.push("\\end{document}");
  return lines.filter((line) => line !== "").join("\n");
}

function downloadBlob(filename, blob) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportLatexPdf() {
  if (!state.ui.resumeMarkdown || state.exportingPdf) return;
  const model = buildResumeModel();
  const tex = buildLatex(model);
  const button = $("export-pdf");
  state.exportingPdf = true;
  setBusy(button, true, t("writing"), t("exportPdf"));
  try {
    const response = await fetch("/latex", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tex,
        engine: needsCjk(tex) ? "xelatex" : "pdflatex",
        resume: model
      })
    });
    const type = response.headers.get("content-type") || "";
    if (response.ok && type.includes("pdf")) {
      const engine = response.headers.get("X-Resume-Engine") || "";
      downloadBlob("resume.pdf", await response.blob());
      if (engine === "composed") downloadFile("resume.tex", tex, "application/x-tex;charset=utf-8");
      toast(t(engine === "composed" ? "toast.pdfComposed" : "toast.pdf"));
      return;
    }
    let message = t("error.pdf");
    try {
      const payload = await response.json();
      if (payload?.error) message = payload.error;
    } catch {
      message = t("error.pdf");
    }
    downloadFile("resume.tex", tex, "application/x-tex;charset=utf-8");
    toast(message || t("toast.tex"));
  } catch {
    downloadFile("resume.tex", tex, "application/x-tex;charset=utf-8");
    toast(t("toast.tex"));
  } finally {
    state.exportingPdf = false;
    setBusy(button, false, t("writing"), t("exportPdf"));
  }
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyResume() {
  const text = state.ui.resumeMarkdown ? resumePlainText(buildResumeModel()) : "";
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast(t("toast.copied"));
}

function initialLanguage(saved) {
  if (saved === "zh" || saved === "en") return saved;
  return /^zh/i.test(navigator.language || "") ? "zh" : "en";
}

function bindEvents() {
  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.lang));
  });
  $("open-settings").addEventListener("click", () => openSettings());
  $("close-settings").addEventListener("click", closeSettings);
  $("cancel-settings").addEventListener("click", closeSettings);
  $("settings-dialog").addEventListener("click", (event) => {
    if (event.target === $("settings-dialog")) closeSettings();
  });
  $("settings-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettingsFromForm();
  });
  $("clear-keys").addEventListener("click", clearSavedKeys);
  $("provider").addEventListener("change", () => {
    const form = $("settings-form");
    stashProviderForm(settingsFormProvider, form);
    settingsFormProvider = form.elements.provider.value;
    form.elements.model.value = modelDraft[settingsFormProvider] || DEFAULT_MODELS[settingsFormProvider];
    form.elements.apiKey.value = keyDraft[settingsFormProvider] || "";
    if (CHAT_PROVIDERS[settingsFormProvider]) {
      form.elements.openaiBaseUrl.value = baseDraft[settingsFormProvider] || CHAT_PROVIDERS[settingsFormProvider].base;
    }
    syncProviderFields();
  });
  bindSecretToggle("toggle-api-key", "api-key");
  bindSecretToggle("toggle-steam-key", "steam-api-key");

  $("tab-manual").addEventListener("click", () => selectTab("manual"));
  $("tab-steam").addEventListener("click", () => selectTab("steam"));
  document.querySelector(".tabs").addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    selectTab(state.ui.tab === "manual" ? "steam" : "manual");
    (state.ui.tab === "steam" ? $("tab-steam") : $("tab-manual")).focus();
  });

  $("add-experience").addEventListener("click", addExperience);
  $("load-sample").addEventListener("click", loadSamples);
  $("clear-all").addEventListener("click", clearAll);
  $("steam-form").addEventListener("submit", fetchSteam);
  ["steam-id", "steam-limit", "steam-min-hours"].forEach((id) => {
    $(id).addEventListener("change", () => {
      state.ui.steamId = $("steam-id").value.trim();
      state.ui.steamLimit = countAtLeast($("steam-limit").value, 1, 6);
      state.ui.steamMinHours = clampNumber($("steam-min-hours").value, 0, 100000, 5);
      saveUi();
      refreshSteamPersona();
    });
  });

  $("experience-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const card = button.closest("[data-id]");
    if (!card) return;
    const id = card.dataset.id;
    const action = button.dataset.action;
    if (action === "achieve-all" || action === "achieve-none") {
      card.querySelectorAll('input[name="achievement-selected"]').forEach((box) => {
        box.checked = action === "achieve-all";
      });
      return;
    }
    if (action === "edit") {
      if (!closeEditorForExternalChange()) return;
      state.editingId = id;
      renderExperiences();
      editorForm(id)?.elements.title.focus();
    } else if (action === "delete") deleteExperience(id);
    else if (action === "cancel") cancelEditor(id);
    else if (action === "up") moveExperience(id, -1);
    else if (action === "down") moveExperience(id, 1);
  });
  $("experience-list").addEventListener("submit", (event) => {
    const form = event.target.closest(".exp-form");
    if (!form) return;
    event.preventDefault();
    saveEditor(form.dataset.id);
  });
  $("experience-list").addEventListener("change", (event) => {
    if (event.target.name !== "current") return;
    const end = event.target.form.elements.endDate;
    end.disabled = event.target.checked;
    if (event.target.checked) end.value = "";
  });

  $("target-role").addEventListener("input", () => {
    state.ui.targetRole = $("target-role").value;
    saveUi();
    if (state.ui.resumeMarkdown) renderOutput();
  });
  $("resume-profile").addEventListener("input", () => {
    readProfileForm();
    saveUi();
    syncProfileNote();
    if (state.ui.resumeMarkdown) renderOutput();
  });
  $("resume-profile").addEventListener("change", () => {
    readProfileForm();
    saveUi();
    renderOutput();
    refreshSteamPersona();
  });
  $("writing-brief").addEventListener("input", () => {
    state.ui.writingBrief = $("writing-brief").value.slice(0, BRIEF_LIMIT);
    saveUi();
  });
  $("reset-brief").addEventListener("click", () => {
    state.ui.writingBrief = null;
    saveUi();
    loadWritingBriefFile();
  });
  $("generate").addEventListener("click", generateResume);
  $("resume-source").addEventListener("input", () => {
    state.ui.resumeMarkdown = $("resume-source").value;
    saveUi();
    renderOutput();
  });
  $("copy-resume").addEventListener("click", copyResume);
  $("export-txt").addEventListener("click", () => {
    if (!state.ui.resumeMarkdown) return;
    downloadFile("resume.txt", resumePlainText(buildResumeModel()), "text/plain;charset=utf-8");
  });
  $("export-html").addEventListener("click", () => {
    if (!state.ui.resumeMarkdown) return;
    downloadFile("resume.html", exportHtmlDocument(), "text/html;charset=utf-8");
  });
  $("export-pdf").addEventListener("click", exportLatexPdf);
}

function init() {
  state.storageOk = storageAvailable();
  $("storage-warning").hidden = state.storageOk;
  state.settings = loadSettings();
  state.experiences = loadExperiences();
  const ui = readJson(STORAGE_KEYS.ui, {});
  state.ui = {
    tab: ui.tab === "steam" ? "steam" : "manual",
    language: initialLanguage(ui.language),
    targetRole: typeof ui.targetRole === "string" ? ui.targetRole : "",
    steamId: typeof ui.steamId === "string" ? ui.steamId : "",
    steamPersona: typeof ui.steamPersona === "string" ? ui.steamPersona.slice(0, 80) : "",
    steamPersonaKey: typeof ui.steamPersonaKey === "string" ? ui.steamPersonaKey : "",
    steamLimit: countAtLeast(ui.steamLimit, 1, 6),
    steamMinHours: clampNumber(ui.steamMinHours, 0, 100000, 5),
    resumeMarkdown: typeof ui.resumeMarkdown === "string" ? ui.resumeMarkdown : "",
    writingBrief: typeof ui.writingBrief === "string" ? ui.writingBrief.slice(0, BRIEF_LIMIT) : null,
    profile: normalizeProfile(ui.profile)
  };
  $("target-role").value = state.ui.targetRole;
  $("steam-id").value = state.ui.steamId;
  $("steam-limit").value = String(state.ui.steamLimit);
  $("steam-min-hours").value = String(state.ui.steamMinHours);
  applyI18n();
  fillProfileForm();
  loadWritingBriefFile();
  refreshSteamPersona();
  bindEvents();
  selectTab(state.ui.tab);
  renderExperiences();
  renderOutput();
}

init();

# Quest2Resume

Quest2Resume is a static, client-side page that turns video game roles, playtime, and achievements into corporate-ready resume language. Manual cards and Steam imports share one experience list. A provider you choose writes the draft. The page stores nothing of its own. `serve.py` only forwards Steam Web API calls from this computer.

Keys and entries stay in `localStorage` on this browser. They are not encrypted. Anyone who can open this browser profile can read them. Resume text is sent only to the provider you select. Steam requests go to `serve.py` on this computer, which then calls Steam. A CORS proxy is optional and only needed if you run one yourself.

Review every line before you put it on a resume. The draft is a writing aid. It is supposed to rephrase what you entered, not invent a job.

The header language switch chooses English or 中文. It changes the interface and the language of the next generated draft. A draft that is already on screen stays as it was until you generate again. The choice is saved in this browser.

## Run it locally

Double-click `serve.py`. A window stays open, the server starts, and the browser opens [http://localhost:8080](http://localhost:8080). Close that window to stop the server. Use `localhost`, not `127.0.0.1`. The browser keeps your saved key and ledger separately for each host.

From a terminal, the same command is:

```powershell
py -3 serve.py
```

`serve.py` serves the page and forwards Steam Web API calls. It listens only on this computer, and it only accepts `https://api.steampowered.com`. The Steam key stays in the request from the browser to that local program. It is not sent to a third party, and the server does not print the key.

`python -m http.server` and `npx serve` can open the page, but Steam import will be blocked by the browser. Use `serve.py` when you want your Steam library.

Opening `index.html` directly from the file explorer can break clipboard export, local model calls, and Steam import.

## Deploy on GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/ (root)` folder. Save.
5. After the first deploy, the site is at `https://<username>.github.io/Game_Resume/`.

No build step is required. The site is `index.html`, `style.css`, and `app.js`.

GitHub Pages is served over HTTPS. A page on HTTPS cannot call `http://localhost:11434`. Use a hosted provider on the hosted site. Use Ollama from the local server above.

## Configure a model

Open **Settings**.

| Provider | What to paste | Notes |
| --- | --- | --- |
| Google Gemini | API key from [Google AI Studio](https://aistudio.google.com/apikey) | Works from the browser. Default model: `gemini-2.5-flash`. If a new key rejects that model, try `gemini-3.5-flash-lite`. A referrer-restricted key must allow this site. |
| OpenAI | API key from [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Calls `/v1/chat/completions`. Default model: `gpt-4.1-mini`. Change the base URL for a proxy or an OpenAI-compatible host. A rejected key can look like a network error. |
| Anthropic Claude | API key from [console.anthropic.com](https://console.anthropic.com/settings/keys) | Sends the header Anthropic requires for browser calls. Some organizations block those calls and return 401 even with a valid key. Default model: `claude-sonnet-4-5`. |
| Zhipu GLM | API key from the [Zhipu open platform](https://open.bigmodel.cn/) | Chat Completions at `https://open.bigmodel.cn/api/paas/v4`. Default model: `glm-4-flash-250414`. The base URL does not use `/v1`. |
| Moonshot Kimi | API key from [platform.kimi.com](https://platform.kimi.com/) | Chat Completions at `https://api.moonshot.cn/v1`. Default model: `kimi-k3.1-pro`. A key from platform.kimi.ai needs `https://api.moonshot.ai/v1` instead. |
| DeepSeek | API key from [platform.deepseek.com](https://platform.deepseek.com/) | Chat Completions at `https://api.deepseek.com/v1`. Default model: `deepseek-chat`. |
| Alibaba Qwen | API key from [Alibaba Model Studio](https://bailian.console.aliyun.com/) | DashScope compatible mode at `https://dashscope.aliyuncs.com/compatible-mode/v1`. Default model: `qwen-plus`. Thinking is turned off for this call. |
| Local Ollama | No key | Base URL defaults to `http://localhost:11434`. Pull the model first, for example `ollama pull llama3.2`. |

Model names change. The model field is editable. If the provider says the model is missing, replace it with one your account can call.

**Save settings** writes the form to `localStorage` and confirms in a toast. Each provider keeps its own key. **Show** reveals a key. **Remove saved keys** deletes every model key and the Steam key.

GLM, Kimi, DeepSeek, and Qwen use the same Chat Completions request as OpenAI. If the browser cannot read a response, that provider is blocking this page. Point that provider’s base URL at a proxy you run.

Ollama has to allow this page’s origin. In PowerShell, from the environment where you start Ollama:

```powershell
$env:OLLAMA_ORIGINS = "http://localhost:8080"
ollama serve
```

Use the origin you actually opened, including the port.

## Add experience

The ledger at the center of the page is the only list the generator reads. Both input modes write the same record: game title, role, start, end or current, hours, achievements, and notes.

### Manual Entry

**Add Another Game** opens a card. **Save** checks that the title is present, hours are a number or blank, and the end month is not before the start month. **Edit**, **Delete**, **Up**, and **Down** change the ledger. Order is the order sent to the model.

**Load sample entries** adds two fictional examples so you can try generation before you import anything. Delete them before you use a draft for a real application.

### Steam ID Import

1. Create a Steam Web API key at [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) and paste it in Settings.
2. In Steam, open **Edit Profile → Privacy Settings** and set **Game details** to **Public**. Achievement history has to be public as well. Some games publish no stats.
3. Paste a SteamID64, a vanity name, or a profile URL (`https://steamcommunity.com/id/name` or `https://steamcommunity.com/profiles/7656…`).
4. Choose how many games to import, highest playtime first, and a minimum hours filter. There is no upper limit on the count.
5. **Fetch Steam Data**.

The page calls, in order:

- `ISteamUser/ResolveVanityURL` when the input is a vanity name
- `ISteamUser/GetPlayerSummaries`
- `IPlayerService/GetOwnedGames` with playtime and game names
- `ISaleFeatureService/GetUserYearInReview` for each Replay year from 2022 through the current year
- `ISteamUserStats/GetPlayerAchievements` and `ISteamUserStats/GetSchemaForGame` for the games that pass the filter

Steam does not send CORS headers, so the browser cannot call those endpoints itself. `serve.py` makes the call from this computer and returns the JSON to the page. Leave **CORS proxy prefix** blank.

The proxy field remains for a forwarder you run yourself. A proxy receives the full Steam URL, including your Steam key. Two template forms work:

- `https://your-proxy.example/?` appends the encoded Steam URL
- `https://your-proxy.example/?u={url}` replaces `{url}` with the encoded URL
- `{raw}` is replaced with the URL unencoded

A private profile, or Game details left on Friends Only, comes back as an empty game list. The page says that instead of showing a blank success. Re-importing the same app updates hours, achievements, and dates, and keeps the role and notes you already typed.

Edit a fetched card to see each unlocked achievement in its own box. Checked boxes are the only ones sent. Leave them all off and the draft is written from the game's iconic projects, the same way it treats a game with no achievements. After a draft is generated, edit the text under the preview. Copy and export use that edited text.

The start month comes from Steam Replay: the earliest `rtime_first_played_lifetime`, or the first month that year’s Replay shows playtime for that game. The end month is the last Replay month with playtime. If Steam’s last-played day is later, because the current year has no Replay yet or play happened after the December 14 cutoff, the end month uses that later day. Replay is private until you set each year to Public on the Replay page. When a game has no Replay months, the start month falls back to the earliest achievement unlock and the end month to the last day played. Steam does not know your role. Add that on each card before you generate.

## Generate and export

Optional **Target role** (for example, “IT project coordinator”) steers wording. It does not add a job the ledger does not support.

The heading fields choose what a recruiter sees: full name, email, phone, location, website, and LinkedIn. Clear a checkbox to leave that line off. If full name is off, the heading uses the current Steam username from the Web API. The Steam ID is used only when that name cannot be read. Summary and skills can be left out of the next draft. Education is included only when you type it and check the box. The model is told not to invent a school or degree.

The writing brief lives in `writing-brief.md` and in the **Writing brief** section on the page. Edits in that box are saved in this browser and sent with the next draft. **Reset** loads the file again.

**Generate Professional Resume** sends the saved ledger plus that writing brief. Each role is written with the STAR shape career offices teach: the duty of the position, then bullets that name the project, the skill used, the problem, and the outcome. For a story game with few notes, the brief tells the model to use that game's known missions and in-game results (a heist and its take, a main quest, a guild the role led) and to keep your own notes when you wrote them. It does not turn those results into a real employer, salary, or degree. The preview, HTML export, and PDF use the same headed layout: a rule under the name, a date chip on each role, and skills as tags.

From the finished resume:

- **Copy to Clipboard** copies the formatted resume
- **Export as TXT** downloads `resume.txt`
- **Export as HTML** downloads a printable `resume.html`
- **Export LaTeX PDF** builds `resume.tex` and asks `serve.py` to compile it with `pdflatex` or `xelatex` when one is installed. If neither is installed, `serve.py` still returns a PDF laid out from the same resume and the page also downloads `resume.tex`. Install TeX Live or MiKTeX if you want the PDF to come from the LaTeX compiler. Chinese text in the fallback PDF uses SimHei.

The last draft is kept in this browser with the ledger.

## Files

| File | Role |
| --- | --- |
| `index.html` | Layout, tabs, settings dialog, ledger, and draft |
| `style.css` | Applicant-portal styling, cards, dialog, and print rules |
| `app.js` | Ledger state, Steam client, prompt builder, and provider calls |
| `serve.py` | Local page server, Steam forwarder, and LaTeX PDF export. Listens on this computer only |
| `README.md` | This guide |

`state.experiences` in `app.js` is the shared list. A manual card and a Steam import are the same object shape before the prompt is built.

## Troubleshooting

- **Settings saved, then “key needed”.** Ollama is ready without a key. Every other provider needs a key. Reopen Settings and save again.
- **Steam fails immediately.** The profile’s game details are private, the key is wrong, or the page was not opened through `serve.py`. The status line names which case it hit.
- **Achievements say they could not be read.** That game has no public stats, or achievement visibility is off. The game still imports with its hours.
- **Generation looks like a network error.** Check the key and model. OpenAI sometimes hides error details from the browser. Claude organizations can forbid browser calls. Ollama must be running with `OLLAMA_ORIGINS` set, and the page must be opened over `http://localhost`.
- **The model invented a metric.** Delete that line. The instructions forbid it, and you still need to read the draft.

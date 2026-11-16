"""Serve Quest2Resume and forward Steam Web API calls from this computer.

The browser cannot read api.steampowered.com because Steam sends no CORS headers.
This process listens on localhost, accepts only that host, and returns the response
to the page. It does not log query strings, so the Steam key is not printed.
"""

import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, parse_qs
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parent
STEAM_HOST = "api.steampowered.com"
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class RefuseRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise HTTPError(req.full_url, code, "Steam redirect was not followed", headers, fp)


OPENER = build_opener(RefuseRedirects)
LATEX_ENGINES = ("pdflatex", "xelatex")
LATEX_BANNED = ("\\input", "\\include", "\\openin", "\\openout", "\\write18", "\\catcode")


def find_engine(preferred):
    order = [preferred] + [name for name in LATEX_ENGINES if name != preferred]
    for name in order:
        if name not in LATEX_ENGINES:
            continue
        found = shutil.which(name)
        if found:
            return found
    return ""


def compile_tex(tex, preferred):
    engine = find_engine(preferred)
    if not engine:
        return None, ""
    with tempfile.TemporaryDirectory(prefix="quest2resume-") as folder:
        (Path(folder) / "resume.tex").write_text(tex, encoding="utf-8")
        env = os.environ.copy()
        env["openin_any"] = "p"
        env["openout_any"] = "p"
        result = subprocess.run(
            [engine, "-no-shell-escape", "-interaction=nonstopmode", "-halt-on-error", "resume.tex"],
            cwd=folder,
            env=env,
            capture_output=True,
            timeout=60,
        )
        pdf = Path(folder) / "resume.pdf"
        if result.returncode == 0 and pdf.exists():
            return pdf.read_bytes(), Path(engine).stem
        return None, ""


def resume_text(resume):
    chunks = [resume.get("name") or "", resume.get("headline") or ""]
    chunks.extend(resume.get("contacts") or [])
    for section in resume.get("sections") or []:
        chunks.append(section.get("title") or "")
        chunks.extend(section.get("paragraphs") or [])
        chunks.extend(section.get("items") or [])
        for job in section.get("jobs") or []:
            chunks.extend([job.get("title") or "", job.get("meta") or ""])
            chunks.extend(job.get("details") or [])
            chunks.extend(job.get("bullets") or [])
    return "\n".join(chunks)


def needs_cjk(text):
    return any("\u3400" <= char <= "\u9fff" or "\uff00" <= char <= "\uffef" for char in text)


def pdf_line(value, cjk):
    text = str(value or "")
    if cjk:
        return text.replace("\u2022", "-")
    return (
        text.replace("\u2014", " - ")
        .replace("\u2013", " - ")
        .replace("\u2012", "-")
        .replace("\u00b7", " | ")
        .replace("\u2022", "-")
    )


def subset_cjk_font(text, destination):
    from fontTools.subset import Options, Subsetter
    from fontTools.ttLib import TTFont

    source = Path(os.environ.get("WINDIR", r"C:\Windows")) / "Fonts" / "simhei.ttf"
    font = TTFont(str(source))
    options = Options()
    options.layout_features = []
    options.recommended_glyphs = True
    options.notdef_outline = True
    subsetter = Subsetter(options=options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.save(str(destination))


def compose_pdf(resume):
    from fpdf import FPDF

    text = resume_text(resume)
    cjk = needs_cjk(text)
    pdf = FPDF(format="A4")
    pdf.set_margins(16, 14, 16)
    pdf.set_auto_page_break(auto=True, margin=14)
    pdf.add_page()
    font_file = None
    if cjk:
        font_file = Path(tempfile.gettempdir()) / "quest2resume-simhei-subset.ttf"
        subset_cjk_font(text + " -|", font_file)
        pdf.add_font("Resume", "", str(font_file))
        family = "Resume"
    else:
        family = "Times"

    def use(style, size):
        pdf.set_font(family, "" if cjk else style, size)

    accent = (20, 108, 67)
    ink = (28, 36, 48)
    width = pdf.epw
    pdf.set_fill_color(*accent)
    pdf.rect(0, 0, 4.2, pdf.h, "F")
    pdf.set_text_color(*accent)
    use("B", 20)
    pdf.multi_cell(width, 9, pdf_line(resume.get("name"), cjk), new_x="LMARGIN", new_y="NEXT")
    if resume.get("headline"):
        use("B", 10)
        pdf.multi_cell(width, 6, pdf_line(str(resume["headline"]).upper(), cjk), new_x="LMARGIN", new_y="NEXT")
    contacts = [pdf_line(item, cjk) for item in (resume.get("contacts") or [])]
    if contacts:
        pdf.set_text_color(*ink)
        use("", 10)
        pdf.multi_cell(width, 6, "   |   ".join(contacts), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(1)
    pdf.set_draw_color(*accent)
    pdf.set_line_width(0.6)
    y = pdf.get_y()
    pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
    pdf.ln(3)
    for section in resume.get("sections") or []:
        pdf.set_text_color(*accent)
        use("B", 11)
        pdf.multi_cell(width, 6, pdf_line(str(section.get("title") or "").upper(), cjk), new_x="LMARGIN", new_y="NEXT")
        y = pdf.get_y()
        pdf.set_line_width(0.25)
        pdf.line(pdf.l_margin, y, pdf.w - pdf.r_margin, y)
        pdf.ln(2)
        pdf.set_text_color(*ink)
        if section.get("kind") == "jobs":
            for job in section.get("jobs") or []:
                title = job.get("title") or ""
                parts = [part.strip() for part in __import__("re").split(r"\s+[—–-]\s+", title, maxsplit=1)]
                role = parts[0] if parts else title
                org = parts[1] if len(parts) > 1 else ""
                use("B", 12)
                pdf.multi_cell(width, 6, pdf_line(role, cjk), new_x="LMARGIN", new_y="NEXT")
                if org:
                    pdf.set_text_color(*accent)
                    use("B", 10)
                    pdf.multi_cell(width, 5, pdf_line(org, cjk), new_x="LMARGIN", new_y="NEXT")
                    pdf.set_text_color(*ink)
                if job.get("meta"):
                    use("I", 10)
                    pdf.multi_cell(width, 5, pdf_line(job["meta"], cjk), new_x="LMARGIN", new_y="NEXT")
                use("", 11)
                for paragraph in job.get("details") or []:
                    pdf.multi_cell(width, 5.5, pdf_line(paragraph, cjk), new_x="LMARGIN", new_y="NEXT")
                for bullet in job.get("bullets") or []:
                    pdf.multi_cell(width, 5.5, pdf_line("- " + bullet, cjk), new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1.5)
        elif section.get("kind") == "list":
            use("", 11)
            pdf.set_text_color(*accent)
            items = [pdf_line(item, cjk) for item in (section.get("items") or [])]
            if items:
                pdf.multi_cell(width, 6, "    ".join(items), new_x="LMARGIN", new_y="NEXT")
            pdf.set_text_color(*ink)
        else:
            use("", 11)
            for paragraph in section.get("paragraphs") or []:
                pdf.multi_cell(width, 5.5, pdf_line(paragraph, cjk), new_x="LMARGIN", new_y="NEXT")
            for item in section.get("items") or []:
                pdf.multi_cell(width, 5.5, pdf_line("- " + item, cjk), new_x="LMARGIN", new_y="NEXT")
        pdf.ln(1)
    return bytes(pdf.output())


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/steam":
            self.forward_steam(parsed)
            return
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/latex":
            self.send_json(404, {"error": "Not found."})
            return
        self.build_pdf()

    def build_pdf(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > 500000:
            self.send_json(400, {"error": "The resume was too large to export."})
            return
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
        except (UnicodeError, json.JSONDecodeError):
            self.send_json(400, {"error": "The export request was not valid JSON."})
            return
        tex = payload.get("tex") if isinstance(payload.get("tex"), str) else ""
        resume = payload.get("resume") if isinstance(payload.get("resume"), dict) else None
        if any(token in tex for token in LATEX_BANNED):
            self.send_json(400, {"error": "The LaTeX document contained a command this server will not run."})
            return
        engine = payload.get("engine") if payload.get("engine") in LATEX_ENGINES else "pdflatex"
        pdf = None
        used = ""
        if tex:
            try:
                pdf, used = compile_tex(tex, engine)
            except (OSError, subprocess.TimeoutExpired):
                pdf, used = None, ""
        if pdf:
            self.send_pdf(pdf, used)
            return
        if not resume:
            self.send_json(501, {"error": "No LaTeX engine is installed, and there was no resume to compose."})
            return
        try:
            composed = compose_pdf(resume)
        except Exception:
            self.send_json(501, {"error": "No LaTeX engine is installed, and the fallback PDF could not be built."})
            return
        self.send_pdf(composed, "composed")

    def send_pdf(self, payload, engine):
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("X-Resume-Engine", engine)
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def forward_steam(self, parsed):
        raw = parse_qs(parsed.query).get("url", [""])[0]
        target = urlparse(raw)
        if target.scheme != "https" or (target.hostname or "").lower() != STEAM_HOST or target.username or target.password:
            self.send_json(400, {"error": "Only https://api.steampowered.com is allowed."})
            return
        request = Request(raw, headers={"Accept": "application/json", "User-Agent": "Quest2Resume"})
        try:
            with OPENER.open(request, timeout=20) as response:
                body = response.read()
                status = response.status
                content_type = response.headers.get("Content-Type", "application/json")
        except HTTPError as err:
            body = err.read()
            status = err.code
            content_type = err.headers.get("Content-Type", "application/json") if err.headers else "application/json"
        except (URLError, TimeoutError, OSError):
            self.send_json(502, {"error": "Could not reach Steam from this computer."})
            return
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_request(self, code="-", size="-"):
        path = urlparse(self.path).path
        sys.stderr.write("%s %s %s\n" % (self.command, path, code))

    def log_message(self, fmt, *args):
        return


class IPv4Server(ThreadingHTTPServer):
    address_family = socket.AF_INET
    # Windows SO_REUSEADDR lets a second copy bind the same port and then
    # drop the browser's request. One listener only.
    allow_reuse_address = False


class IPv6Server(ThreadingHTTPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = False

    def server_bind(self):
        # Without this, Windows treats the IPv6 socket as IPv4 too and the
        # browser's localhost connection is accepted and then dropped.
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        super().server_bind()


def page_url(port):
    import urllib.request

    for host in ("localhost", "127.0.0.1"):
        url = "http://%s:%s/" % (host, port)
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200 and b"Quest2Resume" in response.read(4000):
                    return url
        except (OSError, ValueError):
            continue
    return ""


def open_browser(port):
    import time
    import webbrowser

    time.sleep(0.4)
    webbrowser.open("http://localhost:%s/" % port)


def hold_window():
    print(flush=True)
    try:
        input("Press Enter to close this window...")
    except EOFError:
        pass


def listen(port):
    servers = []
    try:
        servers.append(IPv4Server(("127.0.0.1", port), Handler))
    except OSError as err:
        return [], err
    try:
        servers.append(IPv6Server(("::1", port), Handler))
    except OSError:
        pass
    return servers, None


def main():
    os.chdir(ROOT)
    servers, err = listen(PORT)
    if err:
        already = page_url(PORT)
        if already:
            print("Quest2Resume is already running at %s" % already, flush=True)
            print("Opening the page.", flush=True)
            import webbrowser
            webbrowser.open(already)
        else:
            print("Port %s is already in use (%s)." % (PORT, err), flush=True)
            print("Close the other window running this file, then double-click it again.", flush=True)
        hold_window()
        sys.exit(0 if already else 1)
    for extra in servers[1:]:
        threading.Thread(target=extra.serve_forever, name="quest2resume-ipv6", daemon=True).start()
    threading.Thread(target=open_browser, args=(PORT,), name="quest2resume-browser", daemon=True).start()
    print("Quest2Resume at http://localhost:%s" % PORT, flush=True)
    print("The page opens in your browser. Close this window to stop the server.", flush=True)
    try:
        servers[0].serve_forever()
    except KeyboardInterrupt:
        print()
    finally:
        for extra in servers[1:]:
            extra.shutdown()
            extra.server_close()
        servers[0].server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print("Could not start Quest2Resume: %s" % err, flush=True)
        hold_window()
        sys.exit(1)

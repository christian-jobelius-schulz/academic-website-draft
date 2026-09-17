# Academic website

A lightweight academic site inspired by the clarity of Matthias Meier's site, with its own visual identity and an automatic document-to-website workflow.

## Add your content

1. Put your CV PDF in `sources/cv/`.
2. Put research-paper PDFs in `sources/papers/`.
3. Run `python -m pip install pypdf`, then `python scripts/sync_content.py`.
4. Preview with `python -m http.server 8000` and open `http://localhost:8000`.

The importer extracts basic profile information and each paper's abstract. Optional same-named JSON sidecars give you exact control over titles, coauthors, categories, journal details, links, and profile wording; examples are in each source folder.

## Automatic updates

On GitHub, any push that changes `sources/` runs the included workflow, rebuilds `content/site.json`, and commits the generated content. Enable GitHub Pages for the repository's main branch to publish it.

The site itself has no framework or build dependency: it is plain HTML, CSS, and JavaScript and works directly on GitHub Pages.

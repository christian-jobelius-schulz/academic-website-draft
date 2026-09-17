const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function fillText(field, value) {
  if (value === undefined || value === null) return;
  $$(`[data-field="${field}"]`).forEach((node) => { node.textContent = value; });
}

function renderProfile(profile) {
  ["name", "role", "affiliation", "tagline", "bio"].forEach((key) => fillText(key, profile[key]));
  if (profile.bioHtml) {
    const bio = $('[data-field="bio"]');
    if (bio) bio.innerHTML = profile.bioHtml;
  }
  if (profile.affiliationUrl) {
    $$('[data-field="affiliation"]').forEach((node) => {
      const link = document.createElement("a");
      link.href = profile.affiliationUrl;
      link.textContent = node.textContent;
      link.target = "_blank";
      link.rel = "noreferrer";
      node.replaceChildren(link);
    });
  }
  document.title = profile.seoTitle || `${profile.name || "Academic profile"} - ${profile.role || "Economist"}`;
  $("#year").textContent = new Date().getFullYear();
  $("#monogram").textContent = (profile.name || "Your Name").split(/\s+/).map((part) => part[0]).slice(0, 2).join("");

  if (profile.photo) {
    const image = $("#portrait");
    image.src = profile.photo;
    image.alt = `Portrait of ${profile.name}`;
    image.hidden = false;
    $("#monogram").hidden = true;
  }
  if (profile.cv) $("#cv-link").href = profile.cv;

  const contacts = [["Email", profile.email], ["Office", profile.office], ["Location", profile.location]];
  $("#contact-list").replaceChildren(...contacts.filter(([, value]) => value).flatMap(([label, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    if (label === "Email") {
      const a = document.createElement("a"); a.href = `mailto:${value}`; a.textContent = profile.emailDisplay || value; dd.append(a);
    } else dd.textContent = value;
    return [dt, dd];
  }));
  Object.entries(profile.links || {}).forEach(([label, href]) => {
    const a = document.createElement("a"); a.href = href; a.textContent = label; a.target = "_blank"; a.rel = "noreferrer";
    $("#social-links").append(a);
  });
}

function paperLink(label, href) {
  const a = document.createElement("a"); a.href = href; a.textContent = `[${label}]`; a.target = "_blank"; a.rel = "noreferrer"; return a;
}

function renderAuthors(container, authors = [], date = "") {
  container.replaceChildren();
  if (!authors.length && !date) return;
  container.append("(");
  if (authors.length) container.append("with ");
  authors.forEach((author, index) => {
    if (index) container.append(index === authors.length - 1 ? " and " : ", ");
    const item = typeof author === "string" ? { name: author } : author;
    if (item.url) {
      const link = document.createElement("a");
      link.href = item.url; link.textContent = item.name; link.target = "_blank"; link.rel = "noreferrer";
      container.append(link);
    } else container.append(item.name);
  });
  if (date) container.append(`${authors.length ? ", " : ""}${date}`);
  container.append(")");
}

function renderPaperStatus(container, paper) {
  container.replaceChildren();
  if (!paper.status) return;
  const url = paper.links?.["Working Paper"];
  if (url) {
    const link = document.createElement("a");
    link.href = url; link.textContent = `[${paper.status}]`; link.target = "_blank"; link.rel = "noreferrer";
    container.append(link);
  } else container.textContent = paper.status;
}

function renderPapers(papers) {
  const list = $("#paper-list"); list.replaceChildren();
  const order = ["Published and Accepted Papers", "Working Papers", "Work in Progress"];
  order.forEach((category) => {
    const matches = papers.filter((paper) => paper.category === category);
    if (!matches.length) return;
    const section = document.createElement("section");
    section.className = "paper-group";
    const heading = document.createElement("h2");
    heading.textContent = category;
    section.append(heading);
    matches.forEach((paper, index) => {
      const fragment = $("#paper-template").content.cloneNode(true);
      $(".paper-number", fragment).textContent = String(index + 1).padStart(2, "0");
      $(".paper-title", fragment).textContent = paper.title;
      renderAuthors($(".paper-authors", fragment), paper.authors, paper.date);
      renderPaperStatus($(".paper-venue", fragment), paper);
      $(".paper-abstract", fragment).textContent = paper.abstract || "Abstract forthcoming.";
      Object.entries(paper.links || {}).filter(([label]) => label !== "Working Paper").forEach(([label, href]) => $(".paper-links", fragment).append(paperLink(label, href)));
      const button = $(".abstract-button", fragment); const detail = $(".paper-detail", fragment);
      if (category === "Work in Progress" && !paper.abstract) {
        button.remove();
        detail.remove();
      } else {
        button.addEventListener("click", () => { const open = button.getAttribute("aria-expanded") === "true"; button.setAttribute("aria-expanded", String(!open)); detail.hidden = open; });
      }
      section.append(fragment);
    });
    list.append(section);
  });
}

fetch("content/site.json")
  .then((response) => { if (!response.ok) throw new Error("Content not found"); return response.json(); })
  .then((data) => {
    renderProfile(data.profile || {});
    renderPapers(data.papers || []);
  })
  .catch(() => { $("#paper-list").innerHTML = '<p class="intro">Add your source documents, then run the content sync.</p>'; });

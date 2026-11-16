// The demo page's review picker (CC-20261116-01, #172): hold Option (Alt) and click anything to copy a
// one-line reference to it, for review notes. The click never reaches the screen. Only the demo entry
// imports this, so it does nothing in `npm run play`.

const MEANINGFUL = "[data-hint], [aria-label], aside, section, header, dialog, .modal";
const cut = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);
const squash = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();

/** An element's name: its hint key, its label, or its tag and classes. */
function nameOf(el: Element): string {
  const hint = el.getAttribute("data-hint");
  if (hint) return `hint:${hint}`;
  const label = el.getAttribute("aria-label");
  if (label) return `"${cut(squash(label), 40)}"`;
  return [el.tagName.toLowerCase(), ...el.classList].join(".");
}

/** The reference for a clicked element: what it is, its text, where it sits, and the current stage. */
export function reference(target: Element): string {
  let el = target;
  while (el.parentElement && !el.hasAttribute("data-hint") && !el.hasAttribute("aria-label") && !el.classList.length) el = el.parentElement;
  const text = cut(squash(el.textContent), 60);
  const ancestors: string[] = [];
  for (let a = el.parentElement; a && a !== document.body && ancestors.length < 3; a = a.parentElement) if (a.matches(MEANINGFUL)) ancestors.unshift(nameOf(a));
  const stage = squash(document.querySelector(".stage-name")?.textContent);
  return `[${[nameOf(el) + (text ? ` "${text}"` : ""), ...(ancestors.length ? [`in ${ancestors.join(" › ")}`] : []), ...(stage ? [`stage: ${stage}`] : [])].join(" · ")}]`;
}

let toast: HTMLDivElement | null = null;
let hide: ReturnType<typeof setTimeout> | undefined;

/** A small toast at the top: `lead`, then the reference (selectable when the clipboard refused). */
function show(lead: string, ref: string | null, ms: number, selectable = false): void {
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "demo-toast";
    toast.setAttribute("role", "status");
    Object.assign(toast.style, {
      position: "fixed",
      top: "var(--space-2, 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
      maxWidth: "80vw",
      padding: "var(--space-2, 8px) var(--space-3, 12px)",
      borderRadius: "var(--radius-md, 8px)",
      background: "rgba(20, 20, 18, 0.92)",
      color: "#fff",
      font: "var(--text-sm, 13px) / var(--line-height, 1.45) var(--font-body, sans-serif)",
      boxShadow: "var(--shadow-raised, 0 2px 8px rgba(20, 20, 18, 0.18))",
    });
    document.body.append(toast);
  }
  toast.replaceChildren(lead);
  if (ref !== null) {
    const span = document.createElement("span");
    span.className = "demo-toast-ref";
    span.textContent = ref;
    toast.append(span);
  }
  toast.style.userSelect = selectable ? "text" : "none";
  toast.style.pointerEvents = selectable ? "auto" : "none";
  toast.hidden = false;
  clearTimeout(hide);
  hide = setTimeout(() => toast && (toast.hidden = true), ms);
}

/** Outlines the element for a moment, then puts its own outline back. */
function outline(el: HTMLElement | SVGElement): void {
  const { outline: was, outlineOffset: wasOffset } = el.style;
  el.style.outline = "2px solid #e0457b";
  el.style.outlineOffset = "2px";
  setTimeout(() => {
    el.style.outline = was;
    el.style.outlineOffset = wasOffset;
  }, 1500);
}

window.addEventListener(
  "click",
  (e) => {
    if (!e.altKey || !(e.target instanceof Element) || toast?.contains(e.target)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const ref = reference(e.target);
    if (e.target instanceof HTMLElement || e.target instanceof SVGElement) outline(e.target);
    // Inside the click, so the browser allows it.
    let copied: Promise<void>;
    try {
      copied = navigator.clipboard.writeText(ref);
    } catch (err) {
      copied = Promise.reject(err);
    }
    copied.then(
      () => show("Copied: ", ref, 4000),
      () => show("Select and copy: ", ref, 12_000, true),
    );
  },
  true,
);

window.addEventListener("load", () => show("Demo: hold Option (Alt) and click anything to copy a reference to it", null, 8000), { once: true });

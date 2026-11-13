/** Colour icons from Microsoft Fluent Emoji (Flat), MIT licence; files in public/icons with LICENSE.txt. */
const ART: Record<string, string> = {
  // QR types
  link: "link",
  text: "memo",
  wifi: "antenna-bars",
  contact: "identification-card",
  books: "books",
  questions: "red-question-mark",
  image: "framed-picture",
  pdf: "page-facing-up",
  video: "clapper-board",
  whatsapp: "speech-balloon",
  location: "round-pushpin",
  social: "globe-with-meridians",
  app: "mobile-phone",
  menu: "fork-and-knife-with-plate",
  review: "star",
  csv: "clipboard",
  // Panel pages
  overview: "house",
  codes: "card-file-box",
  analytics: "chart-increasing",
  systems: "file-cabinet",
  tags: "label",
  webhooks: "electric-plug",
  apiKeys: "key",
  team: "busts-in-silhouette",
  panels: "card-index-dividers",
  billing: "credit-card",
  activity: "scroll",
  settings: "gear",
  help: "ring-buoy",
  clients: "office-building",
  payments: "money-bag",
  plans: "gem-stone",
  website: "globe-with-meridians",
  configuration: "hammer-and-wrench",
};

export const hasArt = (id: string) => id in ART;

/** The colour icon for a QR type or panel page; decorative, so screen readers skip it. */
export function Art({ id, size = 18 }: { id: string; size?: number }) {
  return <img className="art-icon" src={`/icons/${ART[id]}.svg`} width={size} height={size} alt="" aria-hidden="true" draggable={false} />;
}

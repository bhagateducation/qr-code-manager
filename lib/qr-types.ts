import { BookOpen, CircleHelp, Contact, FileSpreadsheet, FileText, Image, Link2, MapPin, MessageCircle, Share2, Smartphone, Star, Type, UtensilsCrossed, Video, Wifi, type LucideIcon } from "lucide-react";

type Field = { key: string; label: string; placeholder: string; type?: "tel" | "text"; required?: boolean };
export type QrTool = {
  id: string;
  icon: LucideIcon;
  tone: string;
  name: string;
  text: string;
  /** What the panel opens: a studio type, the Book QR tool, or the CSV import on the codes list. */
  base: "dynamic_url" | "text" | "wifi" | "vcard" | "books" | "csv";
  urlLabel?: string;
  placeholder?: string;
  /** Simple inputs that are turned into the destination link by build(). */
  fields?: Field[];
  build?: (values: Record<string, string>) => string;
};

/** QR code types shown on the home page and in the panel sidebar. Each one is something the app really makes:
 *  a built-in type (link, text, Wi-Fi, contact), the Book QR tool, or a link QR pointing at a page. */
export const QR_TYPES: QrTool[] = [
  { id: "link", icon: Link2, tone: "var(--c-blue)", name: "Link to QR Code", base: "dynamic_url", text: "Turn any website link into a dynamic QR code. Change the link later without reprinting." },
  { id: "text", icon: Type, tone: "var(--c-slate)", name: "Text to QR Code", base: "text", text: "Put a short message, note or code straight into the QR. Works without internet." },
  { id: "wifi", icon: Wifi, tone: "var(--c-sky)", name: "Wi-Fi QR Code", base: "wifi", text: "Guests scan once and join your Wi-Fi network. No typing passwords." },
  { id: "contact", icon: Contact, tone: "var(--c-violet)", name: "Contact Card QR Code", base: "vcard", text: "Share your name, phone, email and website as a vCard that saves to the phone." },
  { id: "books", icon: BookOpen, tone: "var(--c-amber)", name: "Books QR Code", base: "books", text: "Make a folder for a book, one for each chapter, and codes for every page in one step." },
  { id: "questions", icon: CircleHelp, tone: "var(--c-orange)", name: "Questions QR Code", base: "books", text: "Give every question in a book or worksheet its own code that opens the answer or video." },
  { id: "image", icon: Image, tone: "var(--c-pink)", name: "Image to QR Code", base: "dynamic_url", urlLabel: "Image link", placeholder: "https://your-site.com/poster.jpg", text: "Link a photo or poster that is already online. Swap the image any time." },
  { id: "pdf", icon: FileText, tone: "var(--c-teal)", name: "PDF to QR Code", base: "dynamic_url", urlLabel: "PDF link", placeholder: "https://your-site.com/brochure.pdf", text: "Link a brochure, notes or a price list in PDF. Update the file without a new code." },
  { id: "video", icon: Video, tone: "var(--c-pink)", name: "Video & YouTube QR Code", base: "dynamic_url", urlLabel: "Video link", placeholder: "https://youtube.com/watch?v=…", text: "Open a YouTube video, a lesson or a product demo with one scan." },
  {
    id: "whatsapp", icon: MessageCircle, tone: "var(--c-green)", name: "WhatsApp QR Code", base: "dynamic_url", urlLabel: "WhatsApp link", text: "Start a WhatsApp chat with your business using a wa.me link.",
    fields: [
      { key: "phone", label: "WhatsApp number with country code", placeholder: "+91 98765 43210", type: "tel", required: true },
      { key: "message", label: "Message to start with (optional)", placeholder: "Hello, I scanned your QR code" },
    ],
    build: (v) => {
      const phone = (v.phone || "").replace(/\D/g, "");
      return phone ? `https://wa.me/${phone}${v.message?.trim() ? `?text=${encodeURIComponent(v.message.trim())}` : ""}` : "";
    },
  },
  {
    id: "location", icon: MapPin, tone: "var(--c-orange)", name: "Location QR Code", base: "dynamic_url", urlLabel: "Google Maps link", text: "Open your shop, office or event on Google Maps.",
    fields: [{ key: "place", label: "Place name or full address", placeholder: "Bhagat Education, Jaipur", required: true }],
    build: (v) => (v.place?.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.place.trim())}` : ""),
  },
  { id: "social", icon: Share2, tone: "var(--c-violet)", name: "Social Media QR Code", base: "dynamic_url", urlLabel: "Profile link", placeholder: "https://instagram.com/yourpage", text: "Send people to your Instagram, Facebook, LinkedIn or YouTube page." },
  { id: "app", icon: Smartphone, tone: "var(--c-blue)", name: "App Download QR Code", base: "dynamic_url", urlLabel: "Link for everyone else (your website)", placeholder: "https://your-app.com", text: "One code: iPhones go to the App Store and Android phones to Google Play. Add the two store links in the device section further down the form." },
  { id: "menu", icon: UtensilsCrossed, tone: "var(--c-amber)", name: "Restaurant Menu QR Code", base: "dynamic_url", urlLabel: "Menu link", placeholder: "https://your-restaurant.com/menu", text: "Put your menu on every table and update dishes and prices whenever you like." },
  {
    id: "review", icon: Star, tone: "var(--c-amber)", name: "Google Review QR Code", base: "dynamic_url", urlLabel: "Review link", text: "Ask happy customers for a Google review with a single scan.",
    fields: [{ key: "placeId", label: "Google Place ID of your business", placeholder: "ChIJN1t_tDeuEmsRUsoyG83frY4", required: true }],
    build: (v) => (v.placeId?.trim() ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(v.placeId.trim())}` : ""),
  },
  { id: "csv", icon: FileSpreadsheet, tone: "var(--c-green)", name: "Bulk QR Codes from CSV", base: "csv", text: "Upload a spreadsheet and make hundreds of numbered codes at once." },
];

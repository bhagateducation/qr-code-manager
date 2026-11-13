import { BookOpen, CircleHelp, Contact, FileSpreadsheet, FileText, Image, Link2, MapPin, MessageCircle, Share2, Smartphone, Star, Type, UtensilsCrossed, Video, Wifi } from "lucide-react";

/** QR code types shown on the home page. Each one is something the app really makes:
 *  a built-in type (link, text, Wi-Fi, contact), the Book QR tool, or a link QR pointing at a page. */
export const QR_TYPES = [
  { icon: Link2, tone: "var(--c-blue)", name: "Link to QR Code", text: "Turn any website link into a dynamic QR code. Change the link later without reprinting." },
  { icon: Type, tone: "var(--c-slate)", name: "Text to QR Code", text: "Put a short message, note or code straight into the QR. Works without internet." },
  { icon: Wifi, tone: "var(--c-sky)", name: "Wi-Fi QR Code", text: "Guests scan once and join your Wi-Fi network. No typing passwords." },
  { icon: Contact, tone: "var(--c-violet)", name: "Contact Card QR Code", text: "Share your name, phone, email and website as a vCard that saves to the phone." },
  { icon: BookOpen, tone: "var(--c-amber)", name: "Books QR Code", text: "Make a folder for a book, one for each chapter, and codes for every page in one step." },
  { icon: CircleHelp, tone: "var(--c-orange)", name: "Questions QR Code", text: "Give every question in a book or worksheet its own code that opens the answer or video." },
  { icon: Image, tone: "var(--c-pink)", name: "Image to QR Code", text: "Link a photo or poster that is already online. Swap the image any time." },
  { icon: FileText, tone: "var(--c-teal)", name: "PDF to QR Code", text: "Link a brochure, notes or a price list in PDF. Update the file without a new code." },
  { icon: Video, tone: "var(--c-pink)", name: "Video & YouTube QR Code", text: "Open a YouTube video, a lesson or a product demo with one scan." },
  { icon: MessageCircle, tone: "var(--c-green)", name: "WhatsApp QR Code", text: "Start a WhatsApp chat with your business using a wa.me link." },
  { icon: MapPin, tone: "var(--c-orange)", name: "Location QR Code", text: "Open your shop, office or event on Google Maps." },
  { icon: Share2, tone: "var(--c-violet)", name: "Social Media QR Code", text: "Send people to your Instagram, Facebook, LinkedIn or YouTube page." },
  { icon: Smartphone, tone: "var(--c-blue)", name: "App Download QR Code", text: "One code: iPhones go to the App Store and Android phones to Google Play." },
  { icon: UtensilsCrossed, tone: "var(--c-amber)", name: "Restaurant Menu QR Code", text: "Put your menu on every table and update dishes and prices whenever you like." },
  { icon: Star, tone: "var(--c-amber)", name: "Google Review QR Code", text: "Ask happy customers for a Google review with a single scan." },
  { icon: FileSpreadsheet, tone: "var(--c-green)", name: "Bulk QR Codes from CSV", text: "Upload a spreadsheet and make hundreds of numbered codes at once." },
];

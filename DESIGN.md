# Design: white studio

A white work surface, one brand colour for actions, and a fixed hue per module so a colour always means the same place.

## Colour
- **Surfaces:** `--bg` white for content, `--side` cool grey for the sidebar, `--sunk` for table headers and wells, `--line` hairlines.
- **Brand** (`--brand`, violet by default; blue, emerald and rose themes) is used only for the primary action, the current selection and focus.
- **Module hues** never change with the theme: QR codes blue, analytics green, systems violet, campaigns pink, tags amber, webhooks teal, API keys orange, team sky, admin pages slate. A hue appears as a tinted icon chip (`--tone` at 11% on the surface), never as a large fill in the panel.
- **State:** `--ok`, `--warn`, `--danger`, each with a wash.
- **Dark mode** redefines the tokens only; no component has its own dark rule except toned chips and the error toast.

## Type
- Panel: system UI sans (Inter where installed), 14px body, fixed sizes: 20 / 15 / 14 / 13 / 12. Numbers use tabular figures.
- Marketing and sign-in headings: Bricolage Grotesque Variable (self-hosted), weight 700, tracking -0.035em.

## Shape and depth
- Radius 8 (controls), 12 (panels), 16 to 28 (dialogs, marketing tiles).
- Three shadows, all with an offset: `--shadow-1` controls, `--shadow-2` menus and previews, `--shadow-3` dialogs.

## Layout
- Panel: 252px labelled sidebar, 56px header, content capped at 1180px. Under 960px the sidebar is a drawer; under 640px a bottom tab bar carries Home, QR codes, New, Analytics and More, and tables become stacked cards.
- One button shape. Filled means the main action; there is one per view.

## Motion
150 to 250ms, ease `cubic-bezier(0.22, 1, 0.36, 1)`. Motion marks a state change: the sliding nav selection, view changes, menus, toasts, growing meters and bars. The one authored moment is the destination swap on the home page. Everything respects reduced motion.

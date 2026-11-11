# Design

## Direction

Use Grimoria's existing Inter font and screen architecture. Move the shared palette toward the supplied near-black blue, charcoal, cyan and quiet semantic colors. Use tinted dark surfaces, soft borders and restrained elevation; keep glow, blur and animation secondary to information. Apply the same surface hierarchy to native React and legacy screens through the existing CSS tokens.

The village artwork belongs behind the interface at low contrast with a dark overlay. Scenario art should be cropped inside their existing selection cards. Architectural silhouettes are decorative and must not replace role art or status labels. This art step depends on an available image-generation output; no placeholder art should ship in its place.

## Boundaries

- Do not change layout behavior, commands, game state, or responsive navigation.
- Preserve 44px targets, visible focus, reduced-motion behavior, text labels for status, and existing privacy projections.
- Keep `css/app.css` and `src/ui/styles/tokens.css` token values synchronized.
- Keep enough opaque fill behind text and controls to maintain contrast over the backdrop.

## Validation

- A focused token contract test protects the selected palette and native/legacy token parity.
- Run the browser and repository checks from the project instructions, inspect the table and setup at desktop and 390px, and confirm routes and privacy behavior remain unchanged.

# Design

## Decisions

- **One DOM order, two layouts.** The bag header and the picker body become
  separate siblings inside the left column. Below 900 CSS pixels the column is
  `display: contents`, so the header, the aside rail and the picker body join the
  page grid and take `order` values: header 1, rail 2, pickers 3. At 900 CSS
  pixels and above the column keeps its padding and holds both children, and the
  existing `min-[901px]:order-first` on the rail keeps it left.
- **The rail stays one component.** The scenario picker, the composition summary
  and the scenario secrets move together; splitting the rail would duplicate the
  composition projection and break the single read model.
- **Mobile padding moves to the split children.** The column's padding does not
  apply under `display: contents`, so the header and the picker body carry their
  own phone padding; the desktop padding is unchanged.
- **Accessible name.** The picker body keeps `aria-labelledby="bag-composition"`
  and resolves the heading in the sibling header. The heading id is unique.

## Risks

- The aside's top border is replaced by the header's bottom border on a phone,
  so the split does not double the rule.
- The browser check measures element tops, not CSS declarations; it fails when a
  future restyle changes the visual order without changing the DOM.

Agent rules for this repo:

- You will only edit files in `app/src/app_x` or the `public` folder.
- The canonical visual style is defined in
  `../multisport420/app/src/app_x/styles/multisport.css`
  (relative to this repository's root).
- Before creating or changing UI, read that file and follow its
  typography, title styling, colors, backgrounds, borders, and surfaces.
  This includes its Comic Sans title font and pink title color.
- Do not substitute a different visual theme. If the reference is
  unavailable, report that before making visual changes.
- The app should generally be night mode, modular, with good organization, and files not too big.
- For CSS sizing, prefer `rem` for layout, spacing, widths, heights, radii, and other app-level scale decisions so global resizing stays predictable from the root font size.
- Use `em` for element-local sizing that should track the component's own text, such as icon size, inline spacing, or typography-relative padding.
- Avoid defaulting to `px` unless exact fixed geometry is intentionally required.

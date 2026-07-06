# UXCheck Extension

UXCheck is a Chrome extension that instantly audits any live website for UX and accessibility issues.

## Features

- **WCAG Contrast Audit**: Calculates relative luminance and contrast ratios using actual WCAG 2.x formulas.
- **Heading Hierarchy**: Checks for skipped heading levels and proper H1 usage.
- **Landmark Detection**: Ensures presence of `<main>` and other essential landmarks.
- **ARIA & Accessibility**: Scans for missing alt tags, form labels, and duplicate IDs.
- **Keyboard Access**: Identifies interactive elements missing focusability and improper `tabindex` usage.
- **UX Heuristics**: Flags small font sizes and other usability concerns.

## Directory Structure

- `manifest.json`: Extension configuration (V3).
- `popup.html/js`: Polished user interface for viewing audit results.
- `content_script.js`: Orchestrates the audit on the page.
- `engine/`: Core audit logic split into modular files.
  - `contrast.js`: Contrast calculations.
  - `headings.js`: Hierarchy checks.
  - `landmarks.js`: Structural checks.
  - `aria.js`: Accessibility relationships.
  - `keyboard.js`: Interactive access.
  - `heuristics.js`: General UX rules.
- `icons/`: Extension icons.

## Development

### Loading the Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" in the top right.
3. Click "Load unpacked" and select the `/home/team/shared/uxcheck/extension/` directory.

### Running Audits

1. Navigate to any website.
2. Click the UXCheck icon in the browser toolbar.
3. Click "Scan Current Page".
4. Review the results in the popup.

### Adding New Checks

1. Create a new file in `engine/` or update an existing one.
2. Ensure the check is assigned to `window.UXCheckEngine`.
3. Add the file to the `js` array in `manifest.json` under `content_scripts`.
4. Call the check in `content_script.js`.

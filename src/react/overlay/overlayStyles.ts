/**
 * Stylesheet injected into the closed ShadowRoot. Selectors cannot leak in
 * or out of the shadow boundary; `:host { all: initial }` additionally
 * resets inherited properties from the host page.
 */
export const overlayStyleText = `
:host {
  all: initial;
}

.fhg-ov-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--fhg-backdrop);
  font-family: var(--fhg-font-family);
  font-size: var(--fhg-font-size);
  color: var(--fhg-text);
}

.fhg-ov-dialog {
  box-sizing: border-box;
  width: min(92vw, 23rem);
  display: flex;
  flex-direction: column;
  gap: calc(var(--fhg-spacing) * 2);
  padding: calc(var(--fhg-spacing) * 3);
  background: var(--fhg-surface);
  -webkit-backdrop-filter: blur(var(--fhg-surface-blur));
  backdrop-filter: blur(var(--fhg-surface-blur));
  border: 1px solid var(--fhg-border);
  border-radius: var(--fhg-radius);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.fhg-ov-title {
  margin: 0;
  font-size: 1.125em;
  font-weight: 600;
}

.fhg-ov-desc {
  margin: 0;
  color: var(--fhg-text-muted);
  line-height: 1.45;
}

.fhg-ov-stage {
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  gap: calc(var(--fhg-spacing) * 2);
  padding: var(--fhg-spacing) 0;
}

.fhg-ov-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: calc(var(--fhg-spacing) / 2);
}

.fhg-ov-arrow-label {
  font-size: 0.8em;
  color: var(--fhg-text-muted);
}

.fhg-ov-current {
  color: var(--fhg-accent);
}

.fhg-ov-target {
  color: var(--fhg-text);
}

.fhg-ov-controls {
  display: flex;
  justify-content: center;
  gap: var(--fhg-spacing);
}

.fhg-ov-btn {
  box-sizing: border-box;
  min-width: var(--fhg-control-size);
  min-height: var(--fhg-control-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 calc(var(--fhg-spacing) * 1.5);
  font: inherit;
  color: var(--fhg-text);
  background: transparent;
  border: 1px solid var(--fhg-border);
  border-radius: calc(var(--fhg-radius) * 0.75);
  cursor: pointer;
}

.fhg-ov-btn:hover:not(:disabled) {
  border-color: var(--fhg-accent);
}

.fhg-ov-btn:focus-visible {
  outline: 2px solid var(--fhg-accent);
  outline-offset: 2px;
}

.fhg-ov-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.fhg-ov-btn--primary {
  background: var(--fhg-accent);
  color: var(--fhg-accent-text);
  border-color: var(--fhg-accent);
}

.fhg-ov-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--fhg-spacing);
}

.fhg-ov-status {
  margin: 0;
  min-height: 1.3em;
  color: var(--fhg-text-muted);
}
`;

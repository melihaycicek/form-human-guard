export interface GuardOverlayHost {
  /** The element appended to document.body. Its shadow root is closed. */
  host: HTMLElement;
  /** Render target inside the closed shadow root. */
  container: HTMLElement;
  dispose: () => void;
}

/**
 * Create the overlay host with a CLOSED shadow root. The ShadowRoot
 * reference stays inside this closure — `host.shadowRoot` is null for the
 * host page, which is the point: the overlay is isolated from page CSS and
 * scripts as far as the platform allows. Theme CSS variables are set inline
 * on the container, inside the boundary, so theming keeps working.
 */
export function createGuardOverlayHost(
  themeVariables: Record<string, string>,
  styleText: string
): GuardOverlayHost {
  const host = document.createElement("div");
  host.setAttribute("data-fhg-overlay", "");
  const shadowRoot = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = styleText;
  shadowRoot.appendChild(style);

  const container = document.createElement("div");
  for (const [name, value] of Object.entries(themeVariables)) {
    container.style.setProperty(name, value);
  }
  shadowRoot.appendChild(container);

  document.body.appendChild(host);

  return {
    host,
    container,
    dispose: () => {
      host.remove();
    },
  };
}

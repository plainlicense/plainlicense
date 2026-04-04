/**
 * Client-side mapping viewer for interactive comparison.
 * Implements hover highlighting and SVG connectors between plain and original sections.
 */

type ClauseRef = { id: string; content: string };

type LicenseMapping = {
  id: string;
  type: string;
  plain_clause?: ClauseRef | ClauseRef[] | null;
  original_clause?: ClauseRef | ClauseRef[] | null;
};

type LicenseMappings = {
  license_id: string;
  mappings: LicenseMapping[];
};
export function initMappingViewer(mappingData: LicenseMappings) {
  console.log("Initializing Mapping Viewer for:", mappingData.license_id);

  const container =
    (document.querySelector(".mapping-viewer") as HTMLElement) ?? document.body;

  // Use existing SVG if present, or create new one
  let svg = document.querySelector("svg.mapping-connections") as SVGSVGElement;
  if (!svg) {
    svg = createSVGOverlay(container);
  }

  const mappings = mappingData.mappings || [];

  // Track active elements to redraw on resize/scroll
  // token identifies which mapping group is currently active, guarding against
  // stale blur-deferred deactivations racing with a newly focused group.
  let activeMapping: {
    sources: HTMLElement[];
    targets: HTMLElement[];
    token: HTMLElement[];
  } | null = null;

  mappings.forEach((mapping: LicenseMapping) => {
    const plainClauses = Array.isArray(mapping.plain_clause)
      ? mapping.plain_clause
      : mapping.plain_clause
        ? [mapping.plain_clause]
        : [];
    const originalClauses = Array.isArray(mapping.original_clause)
      ? mapping.original_clause
      : mapping.original_clause
        ? [mapping.original_clause]
        : [];

    const plainEls = plainClauses
      .map((c: { id: string; content: string }) =>
        document.getElementById(c.id),
      )
      .filter((el): el is HTMLElement => el !== null);
    const originalEls = originalClauses
      .map((c: { id: string; content: string }) =>
        document.getElementById(c.id),
      )
      .filter((el): el is HTMLElement => el !== null);

    if (plainEls.length > 0 && originalEls.length > 0) {
      // Cache the combined array once to avoid repeated allocations during events
      const allMappedEls = [...plainEls, ...originalEls];

      // Clear any previously active mapping group's highlights and SVG connections
      const clearPreviousActiveMapping = () => {
        if (!activeMapping) return;
        activeMapping.sources.forEach((el: HTMLElement) => {
          el.classList.remove("highlight-match", "highlight-active");
        });
        activeMapping.targets.forEach((el: HTMLElement) => {
          el.classList.remove("highlight-match", "highlight-active");
        });
        clearConnections(svg);
        activeMapping = null;
      };

      // Shared helpers for activating/deactivating this mapping
      const activateFromPlain = () => {
        clearPreviousActiveMapping();
        originalEls.forEach((o: HTMLElement | null) => {
          if (o) o.classList.add("highlight-match");
        });
        plainEls.forEach((p: HTMLElement | null) => {
          if (p) p.classList.add("highlight-active");
        });
        if (plainEls.length === 0 || originalEls.length === 0) return;
        activeMapping = {
          sources: plainEls as HTMLElement[],
          targets: originalEls as HTMLElement[],
          token: plainEls as HTMLElement[],
        };
        drawConnections(
          svg,
          plainEls as HTMLElement[],
          originalEls as HTMLElement[],
        );
      };

      const activateFromOriginal = () => {
        clearPreviousActiveMapping();
        plainEls.forEach((p: HTMLElement | null) => {
          if (p) p.classList.add("highlight-match");
        });
        originalEls.forEach((o: HTMLElement | null) => {
          if (o) o.classList.add("highlight-active");
        });
        if (plainEls.length === 0 || originalEls.length === 0) return;
        activeMapping = {
          sources: plainEls as HTMLElement[],
          targets: originalEls as HTMLElement[],
          token: plainEls as HTMLElement[],
        };
        drawConnections(
          svg,
          plainEls as HTMLElement[],
          originalEls as HTMLElement[],
        );
      };

      // Removes highlight classes and clears global state, but only if this
      // mapping group is still the active one. Guards against stale blur events
      // firing after focus has already moved to a different mapping group whose
      // focus handler ran first and set a new activeMapping.
      const deactivate = () => {
        if (activeMapping?.token !== plainEls) return;
        allMappedEls.forEach((el: HTMLElement | null) => {
          if (el) el.classList.remove("highlight-match", "highlight-active");
        });
        activeMapping = null;
        clearConnections(svg);
      };

      const handleBlur = () => {
        // Delay until focus has settled so tabbing between mapped elements stays highlighted
        requestAnimationFrame(() => {
          const focused = document.activeElement;
          const isInMapping = allMappedEls.some(
            (el) => el === focused || el?.contains(focused),
          );
          if (!isInMapping) deactivate();
        });
      };

      plainEls.forEach((plainEl: HTMLElement | null) => {
        if (!plainEl) return;

        // Make element focusable for keyboard users
        if (!plainEl.getAttribute("tabindex")) {
          plainEl.setAttribute("tabindex", "0");
        }

        // Keyboard focus equivalents (desktop)
        plainEl.addEventListener("focus", () => {
          if (
            window.innerWidth < 1024 ||
            !container.classList.contains("comparison-active")
          )
            return;
          activateFromPlain();
        });

        plainEl.addEventListener("blur", () => {
          if (window.innerWidth < 1024) return;
          handleBlur();
        });

        plainEl.addEventListener("keydown", (e: KeyboardEvent) => {
          if (
            (e.key === "Enter" || e.key === " ") &&
            window.innerWidth < 1024 &&
            container.classList.contains("comparison-active")
          ) {
            e.preventDefault();
            showMobileModal(originalEls, plainEl);
          }
        });

        // Desktop Hover Effects
        plainEl.addEventListener("mouseenter", () => {
          if (
            window.innerWidth < 1024 ||
            !container.classList.contains("comparison-active")
          )
            return;
          activateFromPlain();
        });

        plainEl.addEventListener("mouseleave", () => {
          if (window.innerWidth < 1024) return;
          const activeEl = document.activeElement as HTMLElement | null;
          if (activeEl && allMappedEls.includes(activeEl)) {
            return;
          }
          deactivate();
        });

        // Mobile/Tablet Click + keyboard activate (Overlay)
        plainEl.addEventListener("click", (e) => {
          if (
            window.innerWidth >= 1024 ||
            !container.classList.contains("comparison-active")
          )
            return;
          showMobileModal(originalEls, e.currentTarget as HTMLElement);
        });
      });

      // Original elements hover (Desktop only)
      originalEls.forEach((originalEl: HTMLElement) => {
        // Make element focusable for keyboard users
        if (!originalEl.getAttribute("tabindex")) {
          originalEl.setAttribute("tabindex", "0");
        }

        originalEl.addEventListener("mouseenter", () => {
          if (
            window.innerWidth < 1024 ||
            !container.classList.contains("comparison-active")
          )
            return;
          activateFromOriginal();
        });

        originalEl.addEventListener("mouseleave", () => {
          if (window.innerWidth < 1024) return;
          const activeEl = document.activeElement as HTMLElement | null;
          if (activeEl && allMappedEls.includes(activeEl)) {
            return;
          }
          deactivate();
        });

        // Keyboard focus equivalents (desktop)
        originalEl.addEventListener("focus", () => {
          if (
            window.innerWidth < 1024 ||
            !container.classList.contains("comparison-active")
          )
            return;
          activateFromOriginal();
        });

        originalEl.addEventListener("blur", () => {
          if (window.innerWidth < 1024) return;
          handleBlur();
        });
      });
    }
  });

  // Update SVG on resize or scroll
  const handleUpdate = () => {
    if (activeMapping) {
      drawConnections(svg, activeMapping.sources, activeMapping.targets);
    } else {
      clearConnections(svg);
    }
  };

  window.addEventListener("resize", handleUpdate);
  window.addEventListener("scroll", handleUpdate);
}

function showMobileModal(originalEls: HTMLElement[], trigger?: HTMLElement) {
  const modalBody = document.getElementById("modal-body");

  if (!modalBody) return;

  // Clone content from original elements to preserve formatting
  modalBody.innerHTML = "";
  originalEls.forEach((el) => {
    const clone = el.cloneNode(true) as HTMLElement;
    // Remove IDs to prevent duplicate ID issues
    clone.removeAttribute("id");
    modalBody.appendChild(clone);
  });

  // Use the exposed openModal function so focus management (trap + restore) runs
  const openModal = (
    window as Window & {
      __openComparisonModal?: (trigger?: HTMLElement) => void;
    }
  ).__openComparisonModal;

  if (typeof openModal === "function") {
    openModal(trigger);
  } else {
    // Fallback: direct DOM manipulation if the function isn't available yet
    const modal = document.getElementById("comparison-modal");
    if (!modal) return;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
}

function createSVGOverlay(_container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("mapping-connections"); // Added class for testing/reference
  svg.style.position = "fixed";
  svg.style.top = "0";
  svg.style.left = "0";
  svg.style.width = "100%";
  svg.style.height = "100%";
  svg.style.pointerEvents = "none";
  svg.style.zIndex = "1000";
  document.body.appendChild(svg);
  return svg;
}

function drawConnections(
  svg: SVGSVGElement,
  sources: HTMLElement[],
  targets: HTMLElement[],
) {
  clearConnections(svg);

  // Do not draw connections on smaller screens where layout is single column
  if (window.innerWidth < 1024) return;

  sources.forEach((source) => {
    targets.forEach((target) => {
      const srcRect = source.getBoundingClientRect();
      const tgtRect = target.getBoundingClientRect();

      // Simple case: line from right of source to left of target
      const x1 = srcRect.right;
      const y1 = srcRect.top + srcRect.height / 2;
      const x2 = tgtRect.left;
      const y2 = tgtRect.top + tgtRect.height / 2;

      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      const d = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;

      path.setAttribute("d", d);
      path.setAttribute("stroke", "var(--sl-color-accent)");
      path.setAttribute("stroke-width", "2");
      path.setAttribute("fill", "none");
      path.setAttribute("opacity", "0.6");
      path.style.transition = "opacity 0.2s";

      svg.appendChild(path);
    });
  });
}

function clearConnections(svg: SVGSVGElement) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

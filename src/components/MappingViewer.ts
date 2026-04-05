/**
 * Client-side mapping viewer for interactive comparison.
 * Implements hover/focus dim+highlight interaction between plain and original sections.
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
  const container =
    (document.querySelector(".license-container") as HTMLElement) ??
    document.body;

  const mappings = mappingData.mappings || [];

  // Track active elements for deactivation guards.
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

      // Clear any previously active mapping group's highlights
      const clearPreviousActiveMapping = () => {
        if (!activeMapping) return;
        const origColumn = container.querySelector(
          ".original-version",
        ) as HTMLElement | null;
        if (origColumn) origColumn.classList.remove("mapping-dim");
        activeMapping.sources.forEach((el) => {
          el.classList.remove("mapping-source");
        });
        activeMapping.targets.forEach((el) => {
          el.classList.remove("mapping-target", "mapping-cutout");
        });
        activeMapping = null;
      };

      // Shared helpers for activating/deactivating this mapping
      const activateFromPlain = () => {
        clearPreviousActiveMapping();
        const origColumn = container.querySelector(
          ".original-version",
        ) as HTMLElement | null;
        if (origColumn) origColumn.classList.add("mapping-dim");

        plainEls.forEach((p) => p.classList.add("mapping-source"));
        originalEls.forEach((o) => {
          o.classList.add("mapping-target");
          if (originalEls.length > 1) o.classList.add("mapping-cutout");
        });

        activeMapping = {
          sources: plainEls,
          targets: originalEls,
          token: plainEls,
        };

        // Smooth-scroll first matching original into view within its scrollable column
        if (originalEls.length > 0 && window.innerWidth >= 1024) {
          originalEls[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      };

      const activateFromOriginal = () => {
        clearPreviousActiveMapping();
        const origColumn = container.querySelector(
          ".original-version",
        ) as HTMLElement | null;
        if (origColumn) origColumn.classList.add("mapping-dim");

        originalEls.forEach((o) => {
          o.classList.add("mapping-target");
          if (originalEls.length > 1) o.classList.add("mapping-cutout");
        });
        plainEls.forEach((p) => p.classList.add("mapping-source"));

        activeMapping = {
          sources: plainEls,
          targets: originalEls,
          token: plainEls,
        };

        // Scroll the plain source into view for context
        if (plainEls.length > 0 && window.innerWidth >= 1024) {
          plainEls[0].scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      };

      // Removes highlight classes and clears global state, but only if this
      // mapping group is still the active one. Guards against stale blur events
      // firing after focus has already moved to a different mapping group whose
      // focus handler ran first and set a new activeMapping.
      const deactivate = () => {
        if (activeMapping?.token !== plainEls) return;
        const origColumn = container.querySelector(
          ".original-version",
        ) as HTMLElement | null;
        if (origColumn) origColumn.classList.remove("mapping-dim");
        allMappedEls.forEach((el) => {
          el.classList.remove("mapping-source", "mapping-target", "mapping-cutout");
        });
        activeMapping = null;
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

      plainEls.forEach((plainEl: HTMLElement) => {
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
}

function showMobileModal(originalEls: HTMLElement[], trigger?: HTMLElement) {
  const modalBody = document.getElementById("modal-body");

  if (!modalBody) return;

  // Clone content from original elements to preserve formatting
  modalBody.textContent = "";
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

/**
 * Client-side mapping viewer for interactive comparison.
 * Implements hover highlighting and SVG connectors between plain and original sections.
 */

export function initMappingViewer(container: HTMLElement, mappingData: any) {
  console.log('Initializing Mapping Viewer for:', mappingData.license_id);

  // Use existing SVG if present, or create new one
  let svg = document.querySelector('svg.mapping-connections') as SVGSVGElement;
  if (!svg) {
    svg = createSVGOverlay(container);
  }
  
  const mappings = mappingData.mappings || [];
  
  // Track active elements to redraw on resize/scroll
  let activeMapping: { sources: HTMLElement[], targets: HTMLElement[] } | null = null;

  mappings.forEach((mapping: any) => {
    // ... support both old and new mapping structure ...
    const plainClauses = mapping.plain_clauses || (mapping.plain_clause ? [mapping.plain_clause] : []);
    const originalClauses = mapping.original_clauses || (mapping.original_clause ? [mapping.original_clause] : []);

    const plainEls = plainClauses.map((c: any) => document.getElementById(c.id)).filter(Boolean);
    const originalEls = originalClauses.map((c: any) => document.getElementById(c.id)).filter(Boolean);

    if (plainEls.length > 0 && originalEls.length > 0) {
      // Add interaction logic for mapped elements
      plainEls.forEach((plainEl: HTMLElement) => {
        // Desktop Hover Effects
        plainEl.addEventListener('mouseenter', () => {
          if (window.innerWidth < 1024 || !container.classList.contains('comparison-active')) return;
          originalEls.forEach((o: HTMLElement) => o.classList.add('highlight-match'));
          plainEls.forEach((p: HTMLElement) => p.classList.add('highlight-active'));
          activeMapping = { sources: plainEls, targets: originalEls };
          drawConnections(svg, plainEls, originalEls);
        });
        
        plainEl.addEventListener('mouseleave', () => {
          if (window.innerWidth < 1024) return;
          originalEls.forEach((o: HTMLElement) => o.classList.remove('highlight-match'));
          plainEls.forEach((p: HTMLElement) => p.classList.remove('highlight-active'));
          activeMapping = null;
          clearConnections(svg);
        });

        // Mobile/Tablet Click Logic (Overlay)
        plainEl.addEventListener('click', () => {
          if (window.innerWidth >= 1024 || !container.classList.contains('comparison-active')) return;
          showMobileModal(originalEls);
        });
      });

      // Original elements hover (Desktop only)
      originalEls.forEach((originalEl: HTMLElement) => {
        originalEl.addEventListener('mouseenter', () => {
          if (window.innerWidth < 1024 || !container.classList.contains('comparison-active')) return;
          plainEls.forEach((p: HTMLElement) => p.classList.add('highlight-match'));
          originalEls.forEach((o: HTMLElement) => o.classList.add('highlight-active'));
          activeMapping = { sources: plainEls, targets: originalEls };
          drawConnections(svg, plainEls, originalEls);
        });
        originalEl.addEventListener('mouseleave', () => {
          if (window.innerWidth < 1024) return;
          originalEls.forEach((o: HTMLElement) => o.classList.remove('highlight-match'));
          plainEls.forEach((p: HTMLElement) => p.classList.remove('highlight-active'));
          activeMapping = null;
          clearConnections(svg);
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

  window.addEventListener('resize', handleUpdate);
  window.addEventListener('scroll', handleUpdate);
}

function showMobileModal(originalEls: HTMLElement[]) {
  const modal = document.getElementById('comparison-modal');
  const modalBody = document.getElementById('modal-body');
  
  if (!modal || !modalBody) return;

  // Clone content from original elements to preserve formatting
  modalBody.innerHTML = '';
  originalEls.forEach(el => {
    const clone = el.cloneNode(true) as HTMLElement;
    // Remove IDs to prevent duplicate ID issues
    clone.removeAttribute('id');
    modalBody.appendChild(clone);
  });

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function createSVGOverlay(container: HTMLElement): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('mapping-connections'); // Added class for testing/reference
  svg.style.position = 'fixed';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '1000';
  document.body.appendChild(svg);
  return svg;
}

function drawConnections(svg: SVGSVGElement, sources: HTMLElement[], targets: HTMLElement[]) {
  clearConnections(svg);
  
  // Do not draw connections on smaller screens where layout is single column
  if (window.innerWidth < 1024) return;
  
  sources.forEach(source => {
    targets.forEach(target => {
      const srcRect = source.getBoundingClientRect();
      const tgtRect = target.getBoundingClientRect();

      // Simple case: line from right of source to left of target
      const x1 = srcRect.right;
      const y1 = srcRect.top + srcRect.height / 2;
      const x2 = tgtRect.left;
      const y2 = tgtRect.top + tgtRect.height / 2;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`;
      
      path.setAttribute('d', d);
      path.setAttribute('stroke', 'var(--sl-color-accent)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');
      path.setAttribute('opacity', '0.6');
      path.style.transition = 'opacity 0.2s';
      
      svg.appendChild(path);
    });
  });
}

function clearConnections(svg: SVGSVGElement) {
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }
}

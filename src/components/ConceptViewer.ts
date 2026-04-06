import type {
	ResolvedMappingFile,
	ResolvedConcept,
} from "../types/concept-mapping";

const FILLER_TOOLTIP = "Legal filler \u2014 adds no meaning";

type ConceptEntry = {
	id: string;
	original: string;
	kind: "concept" | "filler";
};

/**
 * Initialize the concept comparison viewer.
 * Wraps original text content in interactive spans and wires up
 * hover/focus/click handlers for the teleprompter and mobile modal.
 */
export function initConceptViewer(data: ResolvedMappingFile) {
	const originalEl = document.getElementById("compare-original-text");
	const teleprompterEl = document.getElementById("teleprompter-content");
	const modalEl = document.getElementById("concept-modal");
	const modalBody = document.getElementById("concept-modal-body");

	if (!originalEl || !teleprompterEl) return;

	// Build ordered list of concepts + filler for wrapping
	const entries: ConceptEntry[] = [
		...data.concepts.map((c) => ({
			id: c.id,
			original: c.original,
			kind: "concept" as const,
		})),
		...data.filler.map((f) => ({
			id: f.id,
			original: f.original,
			kind: "filler" as const,
		})),
	].sort((a, b) => {
		const aPos =
			data.concepts.find((c) => c.id === a.id)?.start ??
			data.filler.find((f) => f.id === a.id)?.start ??
			0;
		const bPos =
			data.concepts.find((c) => c.id === b.id)?.start ??
			data.filler.find((f) => f.id === b.id)?.start ??
			0;
		return aPos - bPos;
	});

	// Wrap text in the DOM
	wrapConceptsInDom(originalEl, entries);

	// Set up interaction handlers
	setupInteraction(originalEl, teleprompterEl, modalEl, modalBody, data);
}

type TextNodeEntry = { node: Text; globalStart: number };

/**
 * Walk text nodes and wrap concept/filler text in <span> elements.
 *
 * Uses TreeWalker to collect text nodes, builds a concatenated string with
 * character-to-node mappings, then wraps each concept's text using Range.
 * The text node map is rebuilt after every wrap because surroundContents
 * splits text nodes.
 */
function wrapConceptsInDom(container: HTMLElement, entries: ConceptEntry[]) {
	let { textNodes, nodeMap, fullText } = buildTextNodeMap(container);

	let scanPos = 0;

	for (const entry of entries) {
		// Filler may overlap with concepts, so always search from 0 for filler
		const searchFrom = entry.kind === "filler" ? 0 : scanPos;
		const idx = fullText.indexOf(entry.original, searchFrom);
		if (idx === -1) continue;

		const endIdx = idx + entry.original.length;

		// Find which text nodes contain this range
		const segments = getTextNodeSegments(nodeMap, idx, endIdx);
		if (segments.length === 0) continue;

		// Wrap each segment
		for (const seg of segments) {
			try {
				const range = document.createRange();
				range.setStart(seg.node, seg.startOffset);
				range.setEnd(seg.node, seg.endOffset);

				const span = document.createElement("span");
				span.className =
					entry.kind === "filler"
						? "concept-span concept-filler"
						: "concept-span";
				span.dataset.conceptId = entry.id;
				if (entry.kind === "filler") {
					span.dataset.tooltip = FILLER_TOOLTIP;
					span.setAttribute("aria-label", FILLER_TOOLTIP);
				} else {
					span.setAttribute("role", "button");
				}
				span.setAttribute("tabindex", "0");

				const extracted = range.extractContents();
				span.appendChild(extracted);
				range.insertNode(span);
			} catch {
				console.warn(`Could not wrap concept "${entry.id}" segment`);
			}
		}

		// Rebuild text node map after DOM mutation (wrapping splits text nodes)
		({ textNodes, nodeMap, fullText } = buildTextNodeMap(container));

		// Advance scan position for non-filler entries
		if (entry.kind !== "filler") {
			const newIdx = fullText.indexOf(entry.original, scanPos);
			if (newIdx !== -1) {
				scanPos = newIdx + 1;
			}
		}
	}
}

/**
 * Collect all text nodes in a container and build a concatenated string
 * with character-to-node position mapping.
 */
function buildTextNodeMap(container: HTMLElement): {
	textNodes: Text[];
	nodeMap: TextNodeEntry[];
	fullText: string;
} {
	const textNodes: Text[] = [];
	const walker = document.createTreeWalker(
		container,
		NodeFilter.SHOW_TEXT,
	);
	let node: Node | null;
	while ((node = walker.nextNode())) {
		textNodes.push(node as Text);
	}

	let fullText = "";
	const nodeMap: TextNodeEntry[] = [];
	for (const tn of textNodes) {
		nodeMap.push({ node: tn, globalStart: fullText.length });
		fullText += tn.textContent ?? "";
	}

	return { textNodes, nodeMap, fullText };
}

type TextNodeSegment = {
	node: Text;
	startOffset: number;
	endOffset: number;
};

/**
 * Find which text node(s) contain the character range [globalStart, globalEnd).
 * Returns segments with per-node offsets for Range creation.
 */
function getTextNodeSegments(
	nodeMap: TextNodeEntry[],
	globalStart: number,
	globalEnd: number,
): TextNodeSegment[] {
	const segments: TextNodeSegment[] = [];

	for (const { node, globalStart: nodeStart } of nodeMap) {
		const nodeEnd = nodeStart + (node.textContent?.length ?? 0);

		// Skip nodes entirely before or after the range
		if (nodeEnd <= globalStart || nodeStart >= globalEnd) continue;

		const startOffset = Math.max(0, globalStart - nodeStart);
		const endOffset = Math.min(
			node.textContent?.length ?? 0,
			globalEnd - nodeStart,
		);

		segments.push({ node, startOffset, endOffset });
	}

	return segments;
}

/**
 * Set up hover/focus/click handlers for concept interaction.
 */
function setupInteraction(
	originalEl: HTMLElement,
	teleprompterEl: HTMLElement,
	modalEl: HTMLElement | null,
	modalBody: HTMLElement | null,
	data: ResolvedMappingFile,
) {
	const conceptSpans = originalEl.querySelectorAll<HTMLElement>(
		".concept-span:not(.concept-filler)",
	);
	let interactionCount = 0;
	let activeConcept: string | null = null;

	const instructionEl = teleprompterEl.querySelector<HTMLElement>(
		".teleprompter-instruction",
	);

	for (const span of conceptSpans) {
		const conceptId = span.dataset.conceptId;
		if (!conceptId) continue;

		const activate = () => {
			if (activeConcept === conceptId) return;
			activeConcept = conceptId;
			interactionCount++;

			// Clear all active states
			for (const el of originalEl.querySelectorAll(
				".concept-active, .concept-child-active",
			)) {
				el.classList.remove("concept-active", "concept-child-active");
			}

			// Activate all spans with this concept ID (may be split across nodes)
			for (const el of originalEl.querySelectorAll<HTMLElement>(
				`[data-concept-id="${conceptId}"]`,
			)) {
				el.classList.add("concept-active");
			}

			// Find concept data
			const concept = data.concepts.find((c) => c.id === conceptId);
			if (!concept) return;

			// If parent, highlight children too
			if (concept.type === "parent") {
				const children = data.concepts.filter(
					(c) => c.parent === conceptId,
				);
				for (const child of children) {
					for (const el of originalEl.querySelectorAll<HTMLElement>(
						`[data-concept-id="${child.id}"]`,
					)) {
						el.classList.add("concept-child-active");
					}
				}
			}

			// Update teleprompter
			updateTeleprompter(
				teleprompterEl,
				concept,
				interactionCount > 2,
				instructionEl,
			);
		};

		const deactivate = () => {
			requestAnimationFrame(() => {
				const focused = document.activeElement;
				if (
					focused &&
					originalEl.contains(focused) &&
					focused.classList.contains("concept-span")
				) {
					return; // Focus moved to another concept span
				}
				originalEl.classList.remove("concept-dimmed");
				for (const el of originalEl.querySelectorAll(
					".concept-active, .concept-child-active",
				)) {
					el.classList.remove(
						"concept-active",
						"concept-child-active",
					);
				}
				activeConcept = null;
			});
		};

		// Desktop hover
		span.addEventListener("mouseenter", activate);
		span.addEventListener("mouseleave", deactivate);

		// Keyboard
		span.addEventListener("focus", activate);
		span.addEventListener("blur", deactivate);

		// Mobile tap — open modal instead of teleprompter
		span.addEventListener("click", (e) => {
			if (window.innerWidth >= 1024) return;
			e.preventDefault();
			const concept = data.concepts.find((c) => c.id === conceptId);
			if (concept && modalEl && modalBody) {
				showConceptModal(modalEl, modalBody, concept);
			}
		});
	}

	// Escape key clears active highlighting on desktop
	document.addEventListener("keydown", (e: KeyboardEvent) => {
		if (e.key === "Escape" && activeConcept) {
			for (const el of originalEl.querySelectorAll(
				".concept-active, .concept-child-active",
			)) {
				el.classList.remove("concept-active", "concept-child-active");
			}
			activeConcept = null;
			// Remove focus from concept span
			if (
				document.activeElement instanceof HTMLElement &&
				document.activeElement.classList.contains("concept-span")
			) {
				document.activeElement.blur();
			}
		}
	});

	// Modal close handlers
	const modalClose = modalEl?.querySelector(".concept-modal-close");
	const modalOverlay = modalEl?.querySelector(".concept-modal-overlay");
	modalClose?.addEventListener("click", () => {
		if (modalEl) closeConceptModal(modalEl);
	});
	modalOverlay?.addEventListener("click", () => {
		if (modalEl) closeConceptModal(modalEl);
	});
	modalEl?.addEventListener("keydown", (e: Event) => {
		const ke = e as KeyboardEvent;
		if (ke.key === "Escape" && modalEl) {
			closeConceptModal(modalEl);
			return;
		}
		// Focus trap: keep Tab cycling within modal
		if (ke.key === "Tab" && modalEl) {
			trapFocus(modalEl, ke);
		}
	});
}

/**
 * Trap keyboard focus inside a modal element.
 * Cycles Tab / Shift+Tab between focusable children.
 */
function trapFocus(modal: HTMLElement, e: KeyboardEvent) {
	const focusable = modal.querySelectorAll<HTMLElement>(
		'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
	);
	if (focusable.length === 0) return;

	const first = focusable[0];
	const last = focusable[focusable.length - 1];

	if (e.shiftKey && document.activeElement === first) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && document.activeElement === last) {
		e.preventDefault();
		first.focus();
	}
}

/**
 * Update the teleprompter panel with the plain language text for a concept.
 */
function updateTeleprompter(
	teleprompterEl: HTMLElement,
	concept: ResolvedConcept,
	hideInstruction: boolean,
	instructionEl: HTMLElement | null,
) {
	// Hide instruction after a few interactions
	if (hideInstruction && instructionEl) {
		instructionEl.style.display = "none";
	}

	// Remove previous plain text entries
	for (const el of teleprompterEl.querySelectorAll(
		".teleprompter-plain-text",
	)) {
		el.remove();
	}

	if (concept.plain_matches.length === 0) {
		const p = document.createElement("p");
		p.className = "teleprompter-plain-text";
		p.style.color = "var(--sl-color-gray-4)";
		p.textContent = "No plain language equivalent mapped";
		teleprompterEl.appendChild(p);
		return;
	}

	for (const match of concept.plain_matches) {
		const p = document.createElement("p");
		p.className = "teleprompter-plain-text";
		p.textContent = match.text;
		teleprompterEl.appendChild(p);
	}
}

/**
 * The element that had focus before the modal opened. Used to restore
 * focus after closing the modal.
 */
let previouslyFocused: HTMLElement | null = null;

/**
 * Show the mobile concept modal with plain language text.
 */
function showConceptModal(
	modal: HTMLElement,
	body: HTMLElement,
	concept: ResolvedConcept,
) {
	previouslyFocused = document.activeElement as HTMLElement | null;

	body.textContent = "";

	if (concept.plain_matches.length === 0) {
		const p = document.createElement("p");
		p.textContent = "No plain language equivalent mapped";
		p.style.color = "var(--sl-color-gray-4)";
		body.appendChild(p);
	} else {
		for (const match of concept.plain_matches) {
			const p = document.createElement("p");
			p.textContent = match.text;
			p.style.marginBottom = "0.75rem";
			body.appendChild(p);
		}
	}

	modal.classList.add("open");
	modal.setAttribute("aria-hidden", "false");
	document.body.style.overflow = "hidden";

	const closeBtn = modal.querySelector<HTMLElement>(".concept-modal-close");
	closeBtn?.focus();
}

/**
 * Close the mobile concept modal.
 */
function closeConceptModal(modal: HTMLElement) {
	modal.classList.remove("open");
	modal.setAttribute("aria-hidden", "true");
	document.body.style.overflow = "";

	// Restore focus to the element that triggered the modal
	if (previouslyFocused && typeof previouslyFocused.focus === "function") {
		previouslyFocused.focus();
		previouslyFocused = null;
	}
}

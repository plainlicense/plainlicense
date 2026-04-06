import { useCallback, useMemo, useState } from "preact/hooks";
import { FINDER_AXES } from "../../data/finderQuestions";
import { rankLicenses } from "../../data/finderScoring";
import type {
  FinderAxis,
  FinderOption,
  LicenseCandidate,
} from "../../data/finderTypes";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  id?: string;
  licenses: LicenseCandidate[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((current / total) * 100);
  return (
    <div
      class="lf-progress"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div class="lf-progress__bar" style={{ width: `${pct}%` }} />
      <span class="lf-progress__label">
        Question {Math.min(current + 1, total)} of {total}
      </span>
    </div>
  );
}

function QuestionCard({
  axis,
  onAnswer,
  onSkip,
}: {
  axis: FinderAxis;
  onAnswer: (option: FinderOption) => void;
  onSkip: () => void;
}) {
  const [showExplainer, setShowExplainer] = useState(false);

  return (
    <div class="lf-question">
      <h4 class="lf-question__text" id={`lf-q-${axis.id}`}>
        {axis.question}
      </h4>
      <p class="lf-question__hint">{axis.hint}</p>

      <fieldset class="lf-options" aria-labelledby={`lf-q-${axis.id}`}>
        <legend class="sr-only">{axis.question}</legend>

        {axis.options.map((option) => (
          <button
            key={option.label}
            type="button"
            class="lf-option-btn"
            onClick={() => onAnswer(option)}
          >
            {option.label}
          </button>
        ))}

        <div class="lf-secondary-actions">
          <button type="button" class="lf-skip-btn" onClick={onSkip}>
            I don't care
          </button>
          <button
            type="button"
            class="lf-explain-btn"
            onClick={() => setShowExplainer(!showExplainer)}
            aria-expanded={showExplainer}
            aria-controls={`lf-explainer-${axis.id}`}
          >
            {showExplainer ? "Got it" : "I'm not sure \u2014 tell me more"}
          </button>
        </div>
      </fieldset>

      {showExplainer && (
        <div id={`lf-explainer-${axis.id}`} class="lf-explainer" role="note">
          {axis.explainer}
        </div>
      )}
    </div>
  );
}

function AllQuestionsForm({
  axes,
  onComplete,
}: {
  axes: FinderAxis[];
  onComplete: (answers: Map<string, FinderOption>) => void;
}) {
  const [selections, setSelections] = useState<
    Map<string, FinderOption | null>
  >(() => new Map(axes.map((a) => [a.id, null])));

  const handleSelect = (axisId: string, option: FinderOption | null) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(axisId, option);
      return next;
    });
  };

  const handleSubmit = () => {
    const answers = new Map<string, FinderOption>();
    for (const [id, opt] of selections) {
      if (opt) answers.set(id, opt);
    }
    onComplete(answers);
  };

  return (
    <div class="lf-form">
      {axes.map((axis) => (
        <div key={axis.id} class="lf-form-group">
          <h4 class="lf-question__text">{axis.question}</h4>
          <p class="lf-question__hint">{axis.hint}</p>
          <div class="lf-form-options">
            {axis.options.map((option) => {
              const selected = selections.get(axis.id) === option;
              return (
                <button
                  key={option.label}
                  type="button"
                  class={`lf-option-btn ${selected ? "lf-option-btn--selected" : ""}`}
                  onClick={() => handleSelect(axis.id, option)}
                  aria-pressed={selected}
                >
                  {option.label}
                </button>
              );
            })}
            <button
              type="button"
              class={`lf-skip-btn ${selections.get(axis.id) === null ? "lf-skip-btn--selected" : ""}`}
              onClick={() => handleSelect(axis.id, null)}
            >
              I don't care
            </button>
          </div>
        </div>
      ))}

      <button type="button" class="lf-submit-btn" onClick={handleSubmit}>
        Find my license
      </button>
    </div>
  );
}

function ResultCard({
  license,
  rank,
  contrastText,
}: {
  license: LicenseCandidate;
  rank: "best" | "also";
  contrastText?: string;
}) {
  const familyLabels: Record<string, string> = {
    permissive: "Permissive",
    copyleft: "Copyleft",
    "public-domain": "Public Domain",
    "source-available": "Source Available",
    proprietary: "Proprietary",
  };

  return (
    <div
      class={`lf-result cat-${license.license_family} ${rank === "best" ? "lf-result--best" : "lf-result--also"}`}
    >
      <div class="lf-result__top">
        <span class="lf-result__spdx">{license.spdx_id}</span>
        {rank === "best" && <span class="lf-result__badge">Best match</span>}
      </div>
      <h4 class="lf-result__name">{license.plain_name}</h4>
      <p class="lf-result__pitch">
        {rank === "also" && contrastText ? contrastText : license.maker_pitch}
      </p>
      <div class="lf-result__footer">
        <span class="lf-result__family">
          {familyLabels[license.license_family] ?? license.license_family}
        </span>
        <a href={license.url} class="lf-result__link">
          Read this license &rarr;
        </a>
      </div>
    </div>
  );
}

function Results({
  licenses,
  answers,
  onReset,
}: {
  licenses: LicenseCandidate[];
  answers: Map<string, FinderOption>;
  onReset: () => void;
}) {
  const ranked = useMemo(
    () => rankLicenses(licenses, answers),
    [licenses, answers],
  );

  const best = ranked[0];
  const alsoConsider = ranked.slice(1, 3);

  // Look up contrast text from the best match's compare_to
  const getContrast = (candidate: LicenseCandidate): string | undefined =>
    best.compare_to.find((c) => c.spdx_id === candidate.spdx_id)?.contrast;

  return (
    <section class="lf-results" aria-label="License recommendations">
      <span aria-live="assertive" aria-atomic="true" class="sr-only">
        Recommended license: {best.plain_name}
      </span>

      <ResultCard license={best} rank="best" />

      {alsoConsider.length > 0 && (
        <div class="lf-also">
          <h4 class="lf-also__heading">Also consider</h4>
          {alsoConsider.map((l) => (
            <ResultCard
              key={l.spdx_id}
              license={l}
              rank="also"
              contrastText={getContrast(l)}
            />
          ))}
        </div>
      )}

      <button type="button" class="lf-reset-btn" onClick={onReset}>
        Start over
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function LicenseFinder({ id, licenses }: Props) {
  const [mode, setMode] = useState<"wizard" | "form">("wizard");
  const [wizardIndex, setWizardIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, FinderOption>>(new Map());
  const [done, setDone] = useState(false);

  // Filter axes to only those relevant for the current license set
  const relevantAxes = useMemo(
    () => FINDER_AXES.filter((a) => a.isRelevant(licenses)),
    [licenses],
  );

  const currentAxis = relevantAxes[wizardIndex] as FinderAxis | undefined;

  const handleWizardAnswer = useCallback(
    (option: FinderOption) => {
      setAnswers((prev) => {
        const next = new Map(prev);
        next.set(relevantAxes[wizardIndex].id, option);
        return next;
      });
      if (wizardIndex + 1 >= relevantAxes.length) {
        setDone(true);
      } else {
        setWizardIndex((i) => i + 1);
      }
    },
    [wizardIndex, relevantAxes],
  );

  const handleWizardSkip = useCallback(() => {
    // "I don't care" — no entry in answers map, advance
    if (wizardIndex + 1 >= relevantAxes.length) {
      setDone(true);
    } else {
      setWizardIndex((i) => i + 1);
    }
  }, [wizardIndex, relevantAxes]);

  const handleFormComplete = useCallback(
    (formAnswers: Map<string, FinderOption>) => {
      setAnswers(formAnswers);
      setDone(true);
    },
    [],
  );

  const handleBack = useCallback(() => {
    if (done) {
      setDone(false);
      if (mode === "wizard") {
        setWizardIndex(relevantAxes.length - 1);
      }
      return;
    }
    if (wizardIndex > 0) {
      setWizardIndex((i) => i - 1);
      setAnswers((prev) => {
        const next = new Map(prev);
        next.delete(relevantAxes[wizardIndex - 1].id);
        return next;
      });
    }
  }, [done, wizardIndex, relevantAxes, mode]);

  const handleReset = useCallback(() => {
    setAnswers(new Map());
    setWizardIndex(0);
    setDone(false);
  }, []);

  if (licenses.length === 0) {
    return <p>No licenses available yet. Check back soon.</p>;
  }

  return (
    <div class="license-finder" id={id}>
      {/* Mode toggle */}
      {!done && (
        <div class="lf-mode-toggle">
          <button
            type="button"
            class={`lf-mode-btn ${mode === "wizard" ? "lf-mode-btn--active" : ""}`}
            aria-pressed={mode === "wizard"}
            onClick={() => {
              setMode("wizard");
              handleReset();
            }}
          >
            Guided
          </button>
          <button
            type="button"
            class={`lf-mode-btn ${mode === "form" ? "lf-mode-btn--active" : ""}`}
            aria-pressed={mode === "form"}
            onClick={() => {
              setMode("form");
              handleReset();
            }}
          >
            All at once
          </button>
        </div>
      )}

      {/* Wizard mode */}
      {mode === "wizard" && !done && currentAxis && (
        <>
          <ProgressBar current={wizardIndex} total={relevantAxes.length} />
          {wizardIndex > 0 && (
            <button
              type="button"
              class="lf-back-btn"
              onClick={handleBack}
              aria-label="Go back to previous question"
            >
              &larr; Back
            </button>
          )}
          <QuestionCard
            axis={currentAxis}
            onAnswer={handleWizardAnswer}
            onSkip={handleWizardSkip}
          />
        </>
      )}

      {/* Form mode */}
      {mode === "form" && !done && (
        <AllQuestionsForm axes={relevantAxes} onComplete={handleFormComplete} />
      )}

      {/* Results */}
      {done && (
        <Results licenses={licenses} answers={answers} onReset={handleReset} />
      )}

      <style>{`
        .license-finder {
          margin: 2rem 0;
          padding: 2rem;
          background: var(--pl-surface, #161923);
          border: 1px solid var(--pl-border, #242836);
          border-radius: var(--pl-radius-lg, 12px);
          color: var(--pl-text, #e8eaf0);
        }

        /* Mode toggle */
        .lf-mode-toggle {
          display: flex;
          gap: 0.25rem;
          margin-bottom: 1.5rem;
          justify-content: center;
        }
        .lf-mode-btn {
          padding: 0.5rem 1.15rem;
          background: transparent;
          border: 1px solid var(--pl-border, #242836);
          color: var(--pl-text-muted, #8b90a0);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          border-radius: var(--pl-radius-md, 8px);
          font-family: inherit;
          transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
        }
        .lf-mode-btn--active {
          background: var(--pl-accent, #15db95);
          color: var(--pl-on-accent, #0d0f15);
          border-color: var(--pl-accent, #15db95);
          font-weight: 600;
        }
        .lf-mode-btn:not(.lf-mode-btn--active):hover {
          border-color: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.5);
          color: var(--pl-accent, #15db95);
          background: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.08);
        }
        .lf-mode-btn:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }

        /* Progress bar */
        .lf-progress {
          margin-bottom: 1.5rem;
          position: relative;
          height: 4px;
          background: var(--pl-border, #242836);
          border-radius: 2px;
          overflow: hidden;
        }
        .lf-progress__bar {
          height: 100%;
          background: var(--pl-accent, #15db95);
          transition: width 0.3s ease;
        }
        .lf-progress__label {
          display: block;
          text-align: center;
          font-size: 0.75rem;
          color: var(--pl-text-muted, #8b90a0);
          margin-top: 0.5rem;
        }

        /* Back button — ghost style */
        .lf-back-btn {
          background: transparent;
          border: none;
          color: var(--pl-text-muted, #8b90a0);
          cursor: pointer;
          margin-bottom: 1rem;
          font-size: 0.875rem;
          font-family: inherit;
          padding: 0.4rem 0.75rem;
          border-radius: var(--pl-radius-md, 8px);
          transition: color 0.15s ease, background 0.15s ease;
        }
        .lf-back-btn:hover {
          color: var(--pl-accent, #15db95);
          background: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.08);
        }
        .lf-back-btn:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }

        /* Question */
        .lf-question {
          text-align: center;
        }
        .lf-question__text {
          font-size: 1.25rem;
          margin: 0 0 0.5rem;
        }
        .lf-question__hint {
          font-size: 0.875rem;
          color: var(--pl-text-muted, #8b90a0);
          margin: 0 0 1.5rem;
        }

        /* Options */
        .lf-options {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          flex-wrap: wrap;
          border: none;
          padding: 0;
          margin: 0 0 1rem;
        }
        .lf-option-btn {
          padding: 0.85rem 1.5rem;
          background: var(--pl-accent, #15db95);
          color: var(--pl-on-accent, #0d0f15);
          border: 2px solid transparent;
          border-radius: var(--pl-radius-md, 8px);
          font-weight: 600;
          cursor: pointer;
          transition: background var(--pl-transition, 0.2s ease), border-color var(--pl-transition, 0.2s ease), transform var(--pl-transition, 0.2s ease), box-shadow var(--pl-transition, 0.2s ease);
          font-size: 1rem;
        }
        .lf-option-btn:hover {
          background: var(--pl-accent-hover, #6af1c2);
          color: var(--pl-on-accent, #0d0f15);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(var(--pl-accent-rgb, 21, 219, 149), 0.25);
        }
        .lf-option-btn:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }
        .lf-option-btn--selected {
          border-color: var(--pl-on-accent, #0d0f15);
          background: var(--pl-accent-hover, #6af1c2);
          color: var(--pl-on-accent, #0d0f15);
        }

        /* Secondary actions (I don't care / tell me more) */
        .lf-secondary-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          width: 100%;
          margin-top: 0.5rem;
        }
        .lf-skip-btn,
        .lf-explain-btn {
          background: none;
          border: none;
          color: var(--pl-text-faint, #5a5f70);
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: underline;
          text-decoration-style: dotted;
          text-underline-offset: 3px;
          padding: 0.25rem 0.5rem;
          transition: color var(--pl-transition-fast, 0.15s ease);
        }
        .lf-skip-btn:hover,
        .lf-skip-btn:focus-visible,
        .lf-explain-btn:hover,
        .lf-explain-btn:focus-visible {
          color: var(--pl-text, #e8eaf0);
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
          border-radius: var(--pl-radius-sm, 4px);
        }
        .lf-skip-btn--selected {
          color: var(--pl-text, #e8eaf0);
        }

        /* Explainer panel */
        .lf-explainer {
          margin: 1rem auto 0;
          max-width: 36rem;
          padding: 1rem 1.25rem;
          background: var(--pl-border, #242836);
          border-radius: var(--pl-radius-md, 8px);
          font-size: 0.875rem;
          color: var(--pl-text, #e8eaf0);
          line-height: 1.6;
          text-align: left;
        }

        /* Form mode */
        .lf-form {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .lf-form-group {
          text-align: center;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--pl-border, #242836);
        }
        .lf-form-group:last-of-type {
          border-bottom: none;
        }
        .lf-form-options {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .lf-submit-btn {
          display: block;
          margin: 0 auto;
          padding: 0.85rem 2rem;
          background: var(--pl-accent, #15db95);
          color: var(--pl-on-accent, #0d0f15);
          border: none;
          border-radius: var(--pl-radius-md, 8px);
          font-weight: 600;
          cursor: pointer;
          font-size: 1rem;
          transition: background var(--pl-transition, 0.2s ease), transform var(--pl-transition, 0.2s ease), box-shadow var(--pl-transition, 0.2s ease);
        }
        .lf-submit-btn:hover {
          background: var(--pl-accent-hover, #6af1c2);
          color: var(--pl-on-accent, #0d0f15);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(var(--pl-accent-rgb, 21, 219, 149), 0.25);
        }
        .lf-submit-btn:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }

        /* Results */
        .lf-results {
          text-align: center;
        }

        /* Result card — matches license card pattern from /licenses/ */
        .lf-result {
          position: relative;
          display: flex;
          flex-direction: column;
          padding: 1.5rem;
          padding-left: 1.75rem;
          background: var(--pl-surface, #161923);
          border: 1px solid var(--pl-border, #242836);
          border-left: 3px solid var(--cat-color, var(--pl-accent, #15db95));
          border-radius: 10px;
          text-align: left;
          margin-bottom: 1rem;
          transition:
            border-color 0.2s ease,
            transform 0.2s ease,
            box-shadow 0.2s ease,
            background 0.2s ease;
        }
        .lf-result:hover {
          border-color: rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.3);
          border-left-width: 4px;
          padding-left: calc(1.75rem - 1px);
          transform: translateY(-2px);
          box-shadow:
            0 6px 24px rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.12),
            0 0 0 1px rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.08);
          background:
            radial-gradient(ellipse at top left, rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.04), transparent 70%),
            var(--pl-surface, #161923);
        }
        .lf-result--best {
          border-left-width: 4px;
          padding-left: calc(1.75rem - 1px);
        }

        .lf-result__top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }
        .lf-result__spdx {
          font-family: var(--sl-font-mono, "JetBrains Mono", monospace);
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.12);
          color: var(--cat-color, var(--pl-accent, #15db95));
          border: 1px solid rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.3);
          border-radius: 4px;
          padding: 0.15em 0.5em;
        }
        .lf-result__badge {
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--pl-accent, #15db95);
          background: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.1);
          border: 1px solid rgba(var(--pl-accent-rgb, 21, 219, 149), 0.3);
          border-radius: 4px;
          padding: 0.15em 0.5em;
        }
        .lf-result__name {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0 0 0.5rem;
          color: var(--cat-color, var(--pl-accent, #15db95));
        }
        .lf-result__pitch {
          margin: 0 0 1rem;
          color: var(--pl-text-muted, #8b90a0);
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .lf-result__footer {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: auto;
        }
        .lf-result__family {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--cat-color, var(--pl-accent, #15db95));
          background: rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.1);
          border: 1px solid rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.25);
          border-radius: 6px;
          padding: 0.25em 0.65em;
        }
        .lf-result__link {
          display: inline-flex;
          align-items: center;
          gap: 0.3em;
          margin-left: auto;
          padding: 0.45rem 1rem;
          background: transparent;
          color: var(--cat-color, var(--pl-accent, #15db95));
          border: 1px solid rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.35);
          text-decoration: none;
          border-radius: var(--pl-radius-md, 8px);
          font-weight: 600;
          font-size: 0.875rem;
          transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
        }
        .lf-result__link:hover {
          background: rgba(var(--cat-color-rgb, var(--pl-accent-rgb, 21, 219, 149)), 0.08);
          border-color: var(--cat-color, var(--pl-accent, #15db95));
          color: var(--cat-color, var(--pl-accent, #15db95));
        }
        .lf-result__link:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }

        /* Also consider section */
        .lf-also {
          margin-top: 1.5rem;
        }
        .lf-also__heading {
          font-size: 0.8rem;
          color: var(--pl-text-faint, #5a5f70);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin: 0 0 0.75rem;
          text-align: left;
          font-weight: 600;
        }

        /* Reset button — matches btn-secondary pattern */
        .lf-reset-btn {
          margin-top: 1.5rem;
          background: transparent;
          border: 1px solid var(--pl-border, #242836);
          color: var(--pl-text-muted, #8b90a0);
          cursor: pointer;
          padding: 0.55rem 1.25rem;
          border-radius: var(--pl-radius-md, 8px);
          font-size: 0.9rem;
          font-weight: 500;
          font-family: inherit;
          transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
        }
        .lf-reset-btn:hover {
          border-color: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.5);
          color: var(--pl-accent, #15db95);
          background: rgba(var(--pl-accent-rgb, 21, 219, 149), 0.08);
          transform: translateY(-2px);
        }
        .lf-reset-btn:focus-visible {
          outline: var(--pl-focus-ring, 2px solid #15db95);
          outline-offset: var(--pl-focus-offset, 2px);
        }

        /* Utility */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}

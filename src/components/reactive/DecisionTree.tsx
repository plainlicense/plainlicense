import { useState } from "preact/hooks";

interface Step {
  id: string;
  question: string;
  options: {
    label: string;
    next: string | null; // ID of next step or license ID
    result?: string;
  }[];
}

interface Props {
  id?: string;
  initialStep?: string;
  steps?: Record<string, Step>;
}

export default function DecisionTree({
  id,
  initialStep = "start",
  steps,
}: Props) {
  // Default steps for the prototype if none provided
  const treeSteps: Record<string, Step> = steps || {
    start: {
      id: "start",
      question:
        "Do you want to require users to share their changes under the same license?",
      options: [
        { label: "Yes (Copyleft)", next: "copyleft" },
        { label: "No (Permissive)", next: "permissive" },
      ],
    },
    copyleft: {
      id: "copyleft",
      question: "Is it for a library or an application?",
      options: [
        { label: "Library", next: null, result: "LGPL-3.0" },
        { label: "Application", next: null, result: "GPL-3.0" },
      ],
    },
    permissive: {
      id: "permissive",
      question: "Do you care about patent grants?",
      options: [
        { label: "Yes", next: null, result: "Apache-2.0" },
        { label: "No", next: null, result: "MIT" },
      ],
    },
  };

  const [currentStepId, setCurrentStepId] = useState(initialStep);
  const currentStep = treeSteps[currentStepId];
  const [history, setHistory] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const handleOption = (next: string | null, optionResult?: string) => {
    if (optionResult) {
      setResult(optionResult);
    } else if (next) {
      setHistory([...history, currentStepId]);
      setCurrentStepId(next);
    }
  };

  const goBack = () => {
    if (result) {
      setResult(null);
      return;
    }
    const newHistory = [...history];
    const prev = newHistory.pop();
    if (prev) {
      setHistory(newHistory);
      setCurrentStepId(prev);
    }
  };

  if (!currentStep && !result) return <p role="alert">Error: Step not found</p>;

  return (
    <div class="decision-tree" id={id}>
      {/* Live region announces result changes to screen readers */}
      <span aria-live="assertive" aria-atomic="true" class="sr-only">
        {result ? `Recommended license: ${result}` : ""}
      </span>

      <div class="step-container">
        {result ? (
          <section class="result-panel" aria-label="License recommendation">
            <p class="result-label">Recommended License</p>
            <p class="result-value">{result}</p>
            <a href={`/licenses/${result.toLowerCase()}/`} class="result-link">
              View {result} on Plain License
            </a>
            <p class="result-actions">
              <button
                type="button"
                class="back-btn"
                onClick={() => {
                  setResult(null);
                  setHistory([]);
                  setCurrentStepId(initialStep);
                }}
              >
                ← Start over
              </button>
            </p>
          </section>
        ) : (
          <>
            {history.length > 0 && (
              <button
                type="button"
                class="back-btn"
                onClick={goBack}
                aria-label="Go back to previous question"
              >
                ← Back
              </button>
            )}
            <h4 class="question" id={`${id || "tree"}-question`}>
              {currentStep?.question}
            </h4>
            <fieldset
              class="options"
              aria-labelledby={`${id || "tree"}-question`}
            >
              <legend class="sr-only">{currentStep?.question}</legend>
              {currentStep?.options.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  class="option-btn"
                  onClick={() => handleOption(option.next, option.result)}
                >
                  {option.label}
                </button>
              ))}
            </fieldset>
          </>
        )}
      </div>

      <style>{`
        .decision-tree {
          margin: 2rem 0;
          padding: 2rem;
          background: #1a1c23;
          border: 1px solid #883aea;
          border-radius: 12px;
          color: white;
        }
        .step-container {
          text-align: center;
        }
        .back-btn {
          background: none;
          border: 1px solid #555;
          color: #888;
          cursor: pointer;
          margin-bottom: 1rem;
          font-size: 0.8rem;
          padding: 0.35rem 0.75rem;
          border-radius: 4px;
        }
        .back-btn:hover,
        .back-btn:focus-visible {
          color: white;
          border-color: white;
          outline: 2px solid white;
          outline-offset: 2px;
        }
        .question {
          font-size: 1.25rem;
          margin-bottom: 2rem;
        }
        .options {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          border: none;
          padding: 0;
          margin: 0;
        }
        .option-btn {
          padding: 1rem 2rem;
          background: #883aea;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .option-btn:hover,
        .option-btn:focus-visible {
          background: #6c2ecb;
          outline: 2px solid white;
          outline-offset: 2px;
        }
        .result-panel {
          padding: 1.5rem;
          border: 1px solid #883aea;
          border-radius: 8px;
          background: rgba(136, 58, 234, 0.1);
        }
        .result-label {
          margin: 0 0 0.5rem;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #aaa;
        }
        .result-value {
          font-size: 1.75rem;
          font-weight: bold;
          margin: 0 0 1rem;
          color: #883aea;
        }
        .result-link {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #883aea;
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          margin-bottom: 1rem;
        }
        .result-link:hover,
        .result-link:focus-visible {
          background: #6c2ecb;
          outline: 2px solid white;
          outline-offset: 2px;
        }
        .result-actions {
          margin-top: 1rem;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0,0,0,0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </div>
  );
}

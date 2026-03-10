import { useState } from 'preact/hooks';

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

export default function DecisionTree({ id, initialStep = 'start', steps }: Props) {
  // Default steps for the prototype if none provided
  const treeSteps: Record<string, Step> = steps || {
    'start': {
      id: 'start',
      question: 'Do you want to require users to share their changes under the same license?',
      options: [
        { label: 'Yes (Copyleft)', next: 'copyleft' },
        { label: 'No (Permissive)', next: 'permissive' }
      ]
    },
    'copyleft': {
      id: 'copyleft',
      question: 'Is it for a library or an application?',
      options: [
        { label: 'Library', next: null, result: 'LGPL-3.0' },
        { label: 'Application', next: null, result: 'GPL-3.0' }
      ]
    },
    'permissive': {
      id: 'permissive',
      question: 'Do you care about patent grants?',
      options: [
        { label: 'Yes', next: null, result: 'Apache-2.0' },
        { label: 'No', next: null, result: 'MIT' }
      ]
    }
  };

  const [currentStepId, setCurrentStepId] = useState(initialStep);
  const currentStep = treeSteps[currentStepId];
  const [history, setHistory] = useState<string[]>([]);

  const handleOption = (next: string | null, result?: string) => {
    if (result) {
      alert(`Recommendation: ${result}`);
      // In a real app, we might redirect to the license page
      // window.location.href = `/licenses/${result.toLowerCase()}/`;
    } else if (next) {
      setHistory([...history, currentStepId]);
      setCurrentStepId(next);
    }
  };

  const goBack = () => {
    const newHistory = [...history];
    const prev = newHistory.pop();
    if (prev) {
      setHistory(newHistory);
      setCurrentStepId(prev);
    }
  };

  if (!currentStep) return <div>Error: Step not found</div>;

  return (
    <div class="decision-tree" id={id}>
      <div class="step-container">
        {history.length > 0 && (
          <button class="back-btn" onClick={goBack}>← Back</button>
        )}
        <h4 class="question">{currentStep.question}</h4>
        <div class="options">
          {currentStep.options.map(option => (
            <button 
              class="option-btn" 
              onClick={() => handleOption(option.next, option.result)}
            >
              {option.label}
            </button>
          ))}
        </div>
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
          border: none;
          color: #888;
          cursor: pointer;
          margin-bottom: 1rem;
          font-size: 0.8rem;
        }
        .back-btn:hover {
          color: white;
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
        .option-btn:hover {
          background: #6c2ecb;
        }
      `}</style>
    </div>
  );
}

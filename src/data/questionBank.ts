import type { Question } from '../types';

export const QUESTION_BANK: Question[] = [
  // ===== MATHEMATICS =====
  // Beginner
  { id: 'math-b1', domain: 'mathematics', difficulty: 'Beginner', concept: 'Basic Arithmetic', prompt: 'What is 7 × 8?', choices: ['54', '56', '64', '48'], correctIndex: 1, explanation: '7 × 8 = 56. A useful mnemonic: 5, 6, 7, 8 → 56 = 7×8.' },
  { id: 'math-b2', domain: 'mathematics', difficulty: 'Beginner', concept: 'Fractions', prompt: 'What is 1/2 + 1/4?', choices: ['2/6', '3/4', '2/4', '1/8'], correctIndex: 1, explanation: 'Convert to common denominator: 2/4 + 1/4 = 3/4.' },
  { id: 'math-b3', domain: 'mathematics', difficulty: 'Beginner', concept: 'Order of Operations', prompt: 'Evaluate: 2 + 3 × 4', choices: ['20', '14', '24', '11'], correctIndex: 1, explanation: 'Multiplication first: 3×4=12, then 2+12=14 (PEMDAS).' },
  // Novice
  { id: 'math-n1', domain: 'mathematics', difficulty: 'Novice', concept: 'Linear Equations', prompt: 'Solve for x: 2x + 5 = 13', choices: ['x=4', 'x=3', 'x=9', 'x=6'], correctIndex: 0, explanation: '2x = 13−5 = 8, so x = 4.' },
  { id: 'math-n2', domain: 'mathematics', difficulty: 'Novice', concept: 'Percentages', prompt: 'What is 15% of 200?', choices: ['15', '30', '45', '300'], correctIndex: 1, explanation: '15% × 200 = 0.15 × 200 = 30.' },
  { id: 'math-n3', domain: 'mathematics', difficulty: 'Novice', concept: 'Exponents', prompt: 'Simplify: 2³ × 2²', choices: ['2⁵', '2⁶', '4⁵', '2¹'], correctIndex: 0, explanation: 'Same base: add exponents. 2^(3+2) = 2⁵ = 32.' },
  // Intermediate
  { id: 'math-i1', domain: 'mathematics', difficulty: 'Intermediate', concept: 'Quadratic Equations', prompt: 'Find the roots of x² − 5x + 6 = 0', choices: ['x=1, x=6', 'x=2, x=3', 'x=−2, x=−3', 'x=5, x=1'], correctIndex: 1, explanation: 'Factor: (x−2)(x−3)=0, so x=2 and x=3.' },
  { id: 'math-i2', domain: 'mathematics', difficulty: 'Intermediate', concept: 'Logarithms', prompt: 'Evaluate: log₂(32)', choices: ['4', '5', '6', '16'], correctIndex: 1, explanation: '2⁵ = 32, so log₂(32) = 5.' },
  { id: 'math-i3', domain: 'mathematics', difficulty: 'Intermediate', concept: 'Trigonometry', prompt: 'What is sin(30°)?', choices: ['1/2', '√2/2', '√3/2', '1'], correctIndex: 0, explanation: 'sin(30°) = 1/2, a standard angle value.' },
  // Advanced
  { id: 'math-a1', domain: 'mathematics', difficulty: 'Advanced', concept: 'Derivatives', prompt: 'What is the derivative of f(x) = 3x³ − 2x² + 5x − 7?', choices: ['9x² − 4x + 5', '3x² − 2x + 5', '9x² − 4x − 7', '3x³ − 4x + 5'], correctIndex: 0, explanation: 'Power rule term by term: 9x² − 4x + 5.' },
  { id: 'math-a2', domain: 'mathematics', difficulty: 'Advanced', concept: 'Integration', prompt: 'Evaluate: ∫(2x + 3) dx', choices: ['x² + 3x + C', '2 + C', 'x² + 3x', '2x² + 3x + C'], correctIndex: 0, explanation: 'Integrate term by term: x² + 3x + C.' },
  { id: 'math-a3', domain: 'mathematics', difficulty: 'Advanced', concept: 'Limits', prompt: 'What is lim(x→0) sin(x)/x?', choices: ['0', '1', '∞', 'Undefined'], correctIndex: 1, explanation: 'This is a fundamental limit: lim(x→0) sin(x)/x = 1.' },
  // Mastery
  { id: 'math-m1', domain: 'mathematics', difficulty: 'Mastery', concept: 'Multivariable Calculus', prompt: 'For f(x,y) = x²y + sin(xy), what is ∂f/∂x?', choices: ['2xy + y·cos(xy)', 'x² + x·cos(xy)', '2xy + cos(xy)', '2x + sin(xy)'], correctIndex: 0, explanation: 'Treat y as constant: ∂/∂x(x²y) = 2xy, ∂/∂x sin(xy) = y·cos(xy).' },
  { id: 'math-m2', domain: 'mathematics', difficulty: 'Mastery', concept: 'Linear Algebra', prompt: 'If A is a 3×3 matrix with det(A) = 2, what is det(2A)?', choices: ['4', '16', '8', '6'], correctIndex: 1, explanation: 'det(kA) = kⁿ · det(A) for an n×n matrix. Here n=3, k=2: 2³ · 2 = 8 · 2 = 16.' },
  { id: 'math-m3', domain: 'mathematics', difficulty: 'Mastery', concept: 'Probability Theory', prompt: 'A continuous random variable X has PDF f(x)=2x on [0,1]. What is E[X]?', choices: ['1/2', '2/3', '1/3', '3/4'], correctIndex: 1, explanation: 'E[X] = ∫₀¹ x·2x dx = 2∫₀¹ x² dx = 2/3.' },

  // ===== PYTHON PROGRAMMING =====
  // Beginner
  { id: 'py-b1', domain: 'python', difficulty: 'Beginner', concept: 'Variables & Print', prompt: 'What does print(type(42)) output in Python?', choices: ["<class 'int'>", "<class 'number'>", "<class 'integer'>", "'int'"], correctIndex: 0, explanation: 'type() returns the class object: <class \'int\'>.' },
  { id: 'py-b2', domain: 'python', difficulty: 'Beginner', concept: 'Strings', prompt: 'What does "Hello" + " " + "World" produce?', choices: ['HelloWorld', 'Hello World', 'Hello  World', 'Error'], correctIndex: 1, explanation: 'String concatenation joins them: "Hello World".' },
  { id: 'py-b3', domain: 'python', difficulty: 'Beginner', concept: 'Lists', prompt: 'What is the result of len([1, 2, 3, 4])?', choices: ['3', '4', '5', 'Error'], correctIndex: 1, explanation: 'The list has 4 elements, so len() returns 4.' },
  // Novice
  { id: 'py-n1', domain: 'python', difficulty: 'Novice', concept: 'List Indexing', prompt: 'What does [10, 20, 30, 40][−1] return?', choices: ['10', '40', 'Error', '−1'], correctIndex: 1, explanation: 'Negative index −1 refers to the last element: 40.' },
  { id: 'py-n2', domain: 'python', difficulty: 'Novice', concept: 'Dictionaries', prompt: 'What does {"a": 1, "b": 2}.get("c", 0) return?', choices: ['None', '0', 'Error', '"c"'], correctIndex: 1, explanation: 'get() returns the default value 0 since "c" doesn\'t exist.' },
  { id: 'py-n3', domain: 'python', difficulty: 'Novice', concept: 'Loops', prompt: 'What does [x*2 for x in range(3)] produce?', choices: ['[0, 1, 2]', '[0, 2, 4]', '[2, 4, 6]', '[1, 2, 3]'], correctIndex: 1, explanation: 'range(3) = 0,1,2; doubled: [0, 2, 4].' },
  // Intermediate
  { id: 'py-i1', domain: 'python', difficulty: 'Intermediate', concept: 'Functions', prompt: 'What does the following return?\n\ndef f(a, b=[]):\n  b.append(a)\n  return b\n\nf(1); f(2)', choices: ['[1, 2]', '[2]', '[1]', 'Error'], correctIndex: 0, explanation: 'Mutable default arguments persist across calls: [1] then [1, 2].' },
  { id: 'py-i2', domain: 'python', difficulty: 'Intermediate', concept: 'Decorators', prompt: 'A decorator wraps a function to:', choices: ['Rename it', 'Modify its behavior without changing its code', 'Delete it after one call', 'Make it asynchronous'], correctIndex: 1, explanation: 'Decorators wrap a function to extend or modify behavior without altering the original code.' },
  { id: 'py-i3', domain: 'python', difficulty: 'Intermediate', concept: 'Exception Handling', prompt: 'What is printed?\n\ntry:\n  1/0\nexcept ZeroDivisionError:\n  print("A")\nexcept Exception:\n  print("B")', choices: ['A', 'B', 'A then B', 'Nothing'], correctIndex: 0, explanation: 'ZeroDivisionError is caught by the first specific except clause, printing "A".' },
  // Advanced
  { id: 'py-a1', domain: 'python', difficulty: 'Advanced', concept: 'Generators', prompt: 'What does the following produce?\n\ngen = (x**2 for x in range(3))\nlist(gen)', choices: ['[0, 1, 4]', '[0, 1, 2]', '<generator object>', 'Error'], correctIndex: 0, explanation: 'Generator expression squares 0,1,2 → [0, 1, 4].' },
  { id: 'py-a2', domain: 'python', difficulty: 'Advanced', concept: 'OOP/Inheritance', prompt: 'In Python, what does super().__init__() do?', choices: ['Creates a new object', 'Calls the parent class constructor', 'Deletes the current instance', 'Returns the class name'], correctIndex: 1, explanation: 'super() returns a proxy that delegates method calls to the parent class.' },
  { id: 'py-a3', domain: 'python', difficulty: 'Advanced', concept: 'Context Managers', prompt: 'What is the purpose of the `with` statement?', choices: ['Loop iteration', 'Resource management with cleanup', 'Variable scoping', 'Thread synchronization only'], correctIndex: 1, explanation: 'The with statement ensures resources are properly cleaned up via __enter__ and __exit__.' },
  // Mastery
  { id: 'py-m1', domain: 'python', difficulty: 'Mastery', concept: 'Metaclasses', prompt: 'What does `type("Foo", (), {})` create?', choices: ['A new function', 'A new class dynamically', 'A module', 'A string "Foo"'], correctIndex: 1, explanation: 'type() with three args dynamically creates a new class named "Foo" with no bases or attributes.' },
  { id: 'py-m2', domain: 'python', difficulty: 'Mastery', concept: 'GIL & Concurrency', prompt: 'The Python GIL (Global Interpreter Lock) means:', choices: ['Python cannot use multiple threads at all', 'Only one thread executes Python bytecode at a time', 'Python cannot do multiprocessing', 'All threads share the same memory stack'], correctIndex: 1, explanation: 'The GIL allows only one thread to execute Python bytecode at a time, limiting CPU-bound multithreading.' },
  { id: 'py-m3', domain: 'python', difficulty: 'Mastery', concept: 'Descriptors', prompt: 'A descriptor class must define at least which method?', choices: ['__init__', '__get__ (and optionally __set__, __delete__)', '__call__', '__new__'], correctIndex: 1, explanation: 'A descriptor implements __get__, and optionally __set__ and/or __delete__.' },

  // ===== DATA SCIENCE =====
  // Beginner
  { id: 'ds-b1', domain: 'data-science', difficulty: 'Beginner', concept: 'Data Types', prompt: 'Which of these is a categorical/qualitative variable?', choices: ['Temperature in °C', 'Age in years', 'Blood type (A, B, AB, O)', 'Salary in dollars'], correctIndex: 2, explanation: 'Blood type is categorical (qualitative), the others are numerical (quantitative).' },
  { id: 'ds-b2', domain: 'data-science', difficulty: 'Beginner', concept: 'Mean vs Median', prompt: 'Which is more robust to outliers?', choices: ['Mean', 'Median', 'Mode', 'Range'], correctIndex: 1, explanation: 'The median is not affected by extreme values, making it robust to outliers.' },
  { id: 'ds-b3', domain: 'data-science', difficulty: 'Beginner', concept: 'Data Visualization', prompt: 'A histogram is best used to show:', choices: ['Part-to-whole relationships', 'Distribution of a continuous variable', 'Correlation between two variables', 'Ranking of categories'], correctIndex: 1, explanation: 'Histograms show the frequency distribution of a continuous variable via bins.' },
  // Novice
  { id: 'ds-n1', domain: 'data-science', difficulty: 'Novice', concept: 'Pandas Basics', prompt: 'In pandas, what does df.head() return?', choices: ['The last 5 rows', 'The first 5 rows', 'Column names', 'Row indices'], correctIndex: 1, explanation: 'head() returns the first n rows (default 5) of a DataFrame.' },
  { id: 'ds-n2', domain: 'data-science', difficulty: 'Novice', concept: 'Standard Deviation', prompt: 'A standard deviation of 0 means:', choices: ['The data is perfectly normal', 'All values are the same', 'The mean is 0', 'The data has no mode'], correctIndex: 1, explanation: 'σ=0 means every data point equals the mean — no spread.' },
  { id: 'ds-n3', domain: 'data-science', difficulty: 'Novice', concept: 'Correlation', prompt: 'A correlation coefficient of −1 indicates:', choices: ['No relationship', 'A perfect positive linear relationship', 'A perfect negative linear relationship', 'A weak relationship'], correctIndex: 2, explanation: '−1 means a perfect negative linear correlation: as one variable increases, the other decreases proportionally.' },
  // Intermediate
  { id: 'ds-i1', domain: 'data-science', difficulty: 'Intermediate', concept: 'Train/Test Split', prompt: 'Why do we split data into training and testing sets?', choices: ['To increase dataset size', 'To evaluate model generalization on unseen data', 'To speed up training', 'To reduce feature count'], correctIndex: 1, explanation: 'The test set simulates unseen data to evaluate how well the model generalizes.' },
  { id: 'ds-i2', domain: 'data-science', difficulty: 'Intermediate', concept: 'Overfitting', prompt: 'Which is a sign of overfitting?', choices: ['Low training error, high test error', 'High training error, high test error', 'Low training error, low test error', 'Equal training and test error'], correctIndex: 0, explanation: 'Overfitting: the model memorizes training data (low train error) but fails to generalize (high test error).' },
  { id: 'ds-i3', domain: 'data-science', difficulty: 'Intermediate', concept: 'Normalization', prompt: 'Min-Max normalization transforms data to which range?', choices: ['[−1, 1]', '[0, 1]', '[0, 100]', '(−∞, ∞)'], correctIndex: 1, explanation: 'Min-Max scaling maps values to [0, 1] via (x−min)/(max−min).' },
  // Advanced
  { id: 'ds-a1', domain: 'data-science', difficulty: 'Advanced', concept: 'Gradient Descent', prompt: 'In gradient descent, the learning rate controls:', choices: ['The number of features', 'The step size of each update', 'The batch size', 'The number of epochs'], correctIndex: 1, explanation: 'The learning rate determines how large each parameter update step is.' },
  { id: 'ds-a2', domain: 'data-science', difficulty: 'Advanced', concept: 'Cross-Validation', prompt: 'In k-fold cross-validation, if k=5, each fold serves as the test set:', choices: ['Once', '5 times', 'Never', '10 times'], correctIndex: 0, explanation: 'Each of the 5 folds is used as the test set exactly once, with the other 4 as training.' },
  { id: 'ds-a3', domain: 'data-science', difficulty: 'Advanced', concept: 'Classification Metrics', prompt: 'Precision is defined as:', choices: ['TP / (TP + FN)', 'TP / (TP + FP)', '(TP + TN) / Total', '2·(Precision·Recall)/(Precision+Recall)'], correctIndex: 1, explanation: 'Precision = TP/(TP+FP): of all predicted positives, how many were actually positive.' },
  // Mastery
  { id: 'ds-m1', domain: 'data-science', difficulty: 'Mastery', concept: 'Bias-Variance Tradeoff', prompt: 'A model with high bias and low variance is typically:', choices: ['Overfitting', 'Underfitting', 'Perfectly balanced', 'Ensemble model'], correctIndex: 1, explanation: 'High bias (too simple) → underfitting; low variance → consistent but inaccurate predictions.' },
  { id: 'ds-m2', domain: 'data-science', difficulty: 'Mastery', concept: 'PCA', prompt: 'PCA (Principal Component Analysis) is primarily used for:', choices: ['Classification', 'Dimensionality reduction', 'Time series forecasting', 'Data imputation'], correctIndex: 1, explanation: 'PCA reduces dimensionality by projecting data onto principal components that maximize variance.' },
  { id: 'ds-m3', domain: 'data-science', difficulty: 'Mastery', concept: 'Bayesian Inference', prompt: 'In Bayes\' theorem, P(H|E) represents:', choices: ['The prior probability', 'The posterior probability', 'The likelihood', 'The marginal probability'], correctIndex: 1, explanation: 'P(H|E) is the posterior: probability of hypothesis H given evidence E.' },
];

// Fix the problematic math-m2 entry (had duplicate keys)
QUESTION_BANK[QUESTION_BANK.findIndex(q => q.id === 'math-m2')] = {
  id: 'math-m2',
  domain: 'mathematics',
  difficulty: 'Mastery',
  concept: 'Linear Algebra',
  prompt: 'If A is a 3×3 matrix with det(A) = 2, what is det(2A)?',
  choices: ['4', '16', '8', '6'],
  correctIndex: 1,
  explanation: 'det(kA) = kⁿ · det(A) for an n×n matrix. Here n=3, k=2: 2³ · 2 = 8 · 2 = 16.',
};

export function getQuestionsByDomainAndDifficulty(domain: string, difficulty: string): Question[] {
  return QUESTION_BANK.filter(q => q.domain === domain && q.difficulty === difficulty);
}

export function getQuestionsByDomain(domain: string): Question[] {
  return QUESTION_BANK.filter(q => q.domain === domain);
}

export function getReviewQueueQuestions(domain: string, count: number = 5): Question[] {
  return QUESTION_BANK.filter(q => q.domain === domain).slice(0, count);
}

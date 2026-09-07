import type { Difficulty, Domain } from '../types';
import { CORE_DIFFICULTIES } from '../types';

export const DOMAINS: {
  id: Domain;
  label: string;
  icon: string;
  category: 'Core' | 'CSE' | 'Math & Data';
  description: string;
  color: string;
}[] = [
  { id: 'mathematics', label: 'Mathematics', icon: 'Calculator', category: 'Math & Data', description: 'Algebra, calculus, linear algebra, statistics & probability', color: 'primary' },
  { id: 'python', label: 'Python Programming', icon: 'Code2', category: 'CSE', description: 'Python syntax, stdlib, data structures, OOP, decorators', color: 'accent' },
  { id: 'data-science', label: 'Data Science', icon: 'BarChart3', category: 'Math & Data', description: 'Pandas, NumPy, EDA, visualization, statistical inference', color: 'success' },

  { id: 'data-structures', label: 'Data Structures', icon: 'Binary', category: 'CSE', description: 'Arrays, linked lists, stacks, queues, trees, tries, heaps, hash tables, graphs', color: 'primary' },
  { id: 'algorithms', label: 'Algorithms & DAA', icon: 'GitBranch', category: 'CSE', description: 'Sorting, searching, DP, greedy, backtracking, graph, string matching', color: 'error' },
  { id: 'operating-systems', label: 'Operating Systems', icon: 'Cpu', category: 'CSE', description: 'Processes, threads, scheduling, synchronization, memory management, file systems', color: 'warning' },
  { id: 'dbms', label: 'DBMS & SQL', icon: 'Database', category: 'CSE', description: 'Normalization, SQL, transactions, isolation levels, indexing, NoSQL basics', color: 'accent' },
  { id: 'computer-networks', label: 'Computer Networks', icon: 'Network', category: 'CSE', description: 'OSI/TCP layers, routing, switching, TCP/UDP, DNS, TLS, HTTP, network security', color: 'success' },
  { id: 'object-oriented-programming', label: 'OOP Fundamentals', icon: 'Boxes', category: 'CSE', description: 'Classes, inheritance, polymorphism, encapsulation, abstraction, SOLID, design patterns basics', color: 'primary' },
  { id: 'web-development', label: 'Web Development', icon: 'Globe', category: 'CSE', description: 'HTML/CSS/JS, React, Node.js, REST vs GraphQL, perf, a11y, deployment', color: 'accent' },
  { id: 'machine-learning', label: 'Machine Learning', icon: 'BrainCircuit', category: 'CSE', description: 'Supervised/unsupervised learning, regression, trees, ensembles, NN basics, evaluation', color: 'error' },
  { id: 'cyber-security', label: 'Cyber Security', icon: 'ShieldAlert', category: 'CSE', description: 'CIA triad, threats, attacks, cryptography, auth, OWASP Top 10, secure coding', color: 'warning' },
  { id: 'compiler-design', label: 'Compiler Design', icon: 'FileCode', category: 'CSE', description: 'Lexing, parsing, semantic analysis, IR, code generation, optimization, linkers & loaders', color: 'success' },
  { id: 'software-engineering', label: 'Software Engineering', icon: 'Workflow', category: 'CSE', description: 'SDLC, requirements, Agile/Scrum, testing strategies, CI/CD, code reviews, architecture patterns', color: 'primary' },
];

export const DIFFICULTIES: Difficulty[] = ['Beginner', 'Intermediate', 'Expert'];

export const DIFFICULTY_META: Record<Difficulty, { color: string; level: number; description: string }> = {
  Beginner: { color: 'success', level: 1, description: 'Foundational recall & comprehension' },
  Intermediate: { color: 'primary', level: 2, description: 'Applied problem-solving & analysis' },
  Expert: { color: 'error', level: 3, description: 'Synthesis, edge cases & advanced systems' },
};

export function difficultyFromLevel(level: number): Difficulty {
  if (level <= 1) return 'Beginner';
  if (level === 2) return 'Intermediate';
  return 'Expert';
}

export function levelFromDifficulty(d: Difficulty): number {
  if (d === 'Beginner') return 1;
  if (d === 'Intermediate') return 2;
  return 3;
}

export { CORE_DIFFICULTIES };

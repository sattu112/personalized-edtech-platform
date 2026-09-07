import { useState, useRef, useEffect, useCallback, memo } from 'react';
import {
  Brain, Send, FileText, Sparkles, Loader2, Trash2, MessageSquare, GraduationCap, Lightbulb,
  Upload, ClipboardPaste, File, X, ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
  Globe, ExternalLink, Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  generateSocraticResponse, generatePracticeQA, hasGroqApiKey, getApiStatus, summarizeDocument, sanitizeInput,
  type WebSearchResult,
} from '../utils/groqService';
import {
  processFile, readClipboardText, getAcceptedFileTypes, validateFile, formatFileSize,
  type ProcessedDocument,
} from '../utils/documentProcessor';
import { ChatMessageSkeleton } from '../components/Skeleton';
import type { ChatMessage, GeneratedQA } from '../types';

type RightPanelTab = 'notes' | 'documents' | 'summary';

export const TutorView = memo(function TutorView() {
  const { chatHistory, addChatMessage, clearChat } = useApp();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [sourcesByMsg, setSourcesByMsg] = useState<Record<string, WebSearchResult[]>>({});
  const [notesInput, setNotesInput] = useState('');
  const [generatingQA, setGeneratingQA] = useState(false);
  const [generatedQA, setGeneratedQA] = useState<GeneratedQA[]>([]);
  const [expandedQA, setExpandedQA] = useState<number | null>(null);
  const [rightTab, setRightTab] = useState<RightPanelTab>('notes');

  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, sending]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    const safe = sanitizeInput(trimmed);
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: safe,
      timestamp: Date.now(),
    };
    addChatMessage(userMsg);
    setInput('');
    setSending(true);
    if (useWebSearch) setSearchingWeb(true);

    try {
      const result = await generateSocraticResponse(safe, [...chatHistory, userMsg], useWebSearch);
      const asstId = `msg-${Date.now() + 1}`;
      addChatMessage({
        id: asstId,
        role: 'assistant',
        content: result.content,
        timestamp: Date.now(),
      });
      if (result.sources.length > 0) {
        setSourcesByMsg(prev => ({ ...prev, [asstId]: result.sources }));
      }
    } catch {
      addChatMessage({
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: "I'm having trouble responding right now. Please try again in a moment.",
        timestamp: Date.now(),
      });
    } finally {
      setSearchingWeb(false);
      setSending(false);
    }
  }, [input, sending, chatHistory, addChatMessage, useWebSearch]);

  const handleGenerateQA = useCallback(async () => {
    const trimmed = notesInput.trim();
    if (!trimmed || generatingQA) return;
    setGeneratingQA(true);
    try {
      const qa = await generatePracticeQA(trimmed);
      setGeneratedQA(qa);
    } catch {
      setGeneratedQA([]);
    } finally {
      setGeneratingQA(false);
    }
  }, [notesInput, generatingQA]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await readClipboardText();
      if (text && text.length > 0) {
        setRightTab('notes');
        setNotesInput(prev => prev ? prev + '\n\n' + text : text);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Clipboard access failed');
      setTimeout(() => setUploadError(null), 3000);
    }
  }, []);

  const handleFileSelect = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];
    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.error ?? 'Invalid file');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);
    setUploadProgress(0);
    setUploadStage('Preparing...');

    try {
      const doc = await processFile(file, {
        onProgress: (stage, pct) => {
          setUploadStage(stage);
          setUploadProgress(pct);
        },
      });
      setDocuments(prev => [doc, ...prev].slice(0, 5));
      if (doc.text && doc.text.length > 50) {
        setRightTab('documents');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'File processing failed');
    } finally {
      setUploadingDoc(false);
      setUploadProgress(0);
      setUploadStage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUseDocumentAsNotes = useCallback((doc: ProcessedDocument) => {
    setNotesInput(prev => {
      const existing = prev ? prev + '\n\n' : '';
      return existing + `=== ${doc.filename} ===\n` + doc.text.slice(0, 20000);
    });
    setRightTab('notes');
  }, []);

  const handleSummarizeDocument = useCallback(async (doc: ProcessedDocument) => {
    if (!doc.text || doc.text.trim().length < 50) return;
    setSummarizing(true);
    setSummary(null);
    setRightTab('summary');
    try {
      const result = await summarizeDocument(doc.text);
      setSummary(result);
    } catch {
      setSummary('Could not generate summary. Please try again.');
    } finally {
      setSummarizing(false);
    }
  }, []);

  const handleRemoveDocument = useCallback((idx: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const apiStatus = getApiStatus();

  return (
    <div className="space-y-6 animate-fade-in" role="main" aria-label="AI Tutor workspace">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-sm"
            aria-hidden="true"
          >
            <GraduationCap size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink-900 dark:text-ink-100">Socratic AI Tutor</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">Guides you with questions, not just answers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ${
              apiStatus.configured
                ? 'bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                : 'bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
            }`}
            role="status"
            aria-live="polite"
          >
            <span
              className={`w-2 h-2 rounded-full ${apiStatus.configured ? 'bg-success-500' : 'bg-warning-500'}`}
              aria-hidden="true"
            />
            <span>{apiStatus.configured ? `Live · ${apiStatus.model.split('-')[0]}-${apiStatus.model.split('-')[1]}` : 'Demo mode'}</span>
          </div>
          {chatHistory.length > 0 && (
            <button
              onClick={clearChat}
              className="btn-ghost text-xs !px-3 !py-2"
              aria-label="Clear chat history"
            >
              <Trash2 size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section
          className="lg:col-span-2 card flex flex-col"
          style={{ minHeight: '520px', maxHeight: 'calc(100vh - 240px)' }}
          aria-label="Chat conversation"
        >
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
            role="log"
            aria-live="polite"
          >
            {chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 px-4">
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-500 mb-4"
                  aria-hidden="true"
                >
                  <MessageSquare size={28} />
                </div>
                <h2 className="font-semibold text-ink-900 dark:text-ink-100 text-lg">Start a conversation</h2>
                <p className="text-sm text-ink-500 dark:text-ink-400 mt-1 max-w-xs">
                  Ask me anything about math, Python, or data science. I'll guide you to the answer through questions.
                </p>
                <div className="flex flex-wrap gap-2 mt-5 justify-center max-w-md" role="group" aria-label="Suggested questions">
                  {[
                    "I'm confused about derivatives",
                    'How do Python lists work?',
                    'What is overfitting?',
                  ].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="rounded-full border border-ink-200 dark:border-ink-700 px-3 py-1.5 text-xs text-ink-600 dark:text-ink-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      aria-label={`Ask: ${suggestion}`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatHistory.map(msg => (
                <ChatBubble key={msg.id} msg={msg} sources={sourcesByMsg[msg.id] ?? []} />
              ))
            )}
            {sending && (
              <div className="flex flex-col gap-2">
                <ChatMessageSkeleton />
                {searchingWeb && (
                  <div className="flex items-center gap-2 text-xs text-accent-600 dark:text-accent-400 pl-2">
                    <Search size={12} className="animate-pulse" />
                    Searching the web for references…
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-ink-200 dark:border-ink-800 p-3 sm:p-4 space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                role="switch"
                aria-checked={useWebSearch}
                onClick={() => setUseWebSearch(v => !v)}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all border ${
                  useWebSearch
                    ? 'bg-accent-50 border-accent-200 text-accent-700 dark:bg-accent-900/30 dark:border-accent-800 dark:text-accent-300'
                    : 'bg-white border-ink-200 text-ink-500 dark:bg-ink-900 dark:border-ink-800 dark:text-ink-400'
                }`}
              >
                <Globe size={13} aria-hidden="true" />
                {useWebSearch ? 'Web search ON' : 'Web search OFF'}
              </button>
              <p id="chat-hint" className="text-[10px] text-ink-400 hidden sm:block">
                Press Enter to send, Shift+Enter for newline
              </p>
            </div>
            <label htmlFor="chat-input" className="sr-only">Type your message</label>
            <div className="flex items-end gap-2">
              <textarea
                id="chat-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your question..."
                rows={1}
                className="input-field resize-none flex-1 max-h-32"
                style={{ minHeight: '42px' }}
                aria-describedby="chat-hint"
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                className="btn-primary !px-3 !py-2.5"
                aria-label="Send message"
              >
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>

        <aside
          className="card p-5 space-y-4"
          style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}
          aria-label="Study tools panel"
        >
          <div
            role="tablist"
            aria-label="Study tools"
            className="flex items-center gap-1 rounded-xl border border-ink-200 dark:border-ink-800 p-1 bg-white dark:bg-ink-900"
          >
            {([
              { id: 'notes', label: 'Q&A', icon: FileText },
              { id: 'documents', label: 'Docs', icon: File },
              { id: 'summary', label: 'Summary', icon: Sparkles },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={rightTab === id}
                onClick={() => setRightTab(id as RightPanelTab)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  rightTab === id
                    ? 'bg-primary-600 text-white'
                    : 'text-ink-500 dark:text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800'
                }`}
              >
                <Icon size={12} aria-hidden="true" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>

          {rightTab === 'notes' && (
            <div className="space-y-3 animate-fade-in" role="tabpanel" aria-label="Practice Q&A generation">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-accent-500" aria-hidden="true" />
                <h2 className="font-bold text-ink-900 dark:text-ink-100 text-sm">Study Notes → Practice Q&A</h2>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Paste notes and the AI generates 3 targeted practice questions.
              </p>

              <textarea
                value={notesInput}
                onChange={e => setNotesInput(sanitizeInput(e.target.value))}
                placeholder="Paste your study notes here..."
                rows={6}
                className="input-field resize-none text-xs"
                aria-label="Study notes input"
              />

              <div className="flex gap-2">
                <button
                  onClick={handlePasteFromClipboard}
                  className="btn-outline text-xs !px-3 !py-2 flex-1"
                  aria-label="Paste from clipboard"
                >
                  <ClipboardPaste size={13} aria-hidden="true" /> Paste
                </button>
                <button
                  onClick={handleGenerateQA}
                  disabled={!notesInput.trim() || generatingQA}
                  className="btn-primary text-xs !px-3 !py-2 flex-1"
                >
                  {generatingQA
                    ? <><Loader2 size={13} className="animate-spin mr-1" /> Working</>
                    : <><Sparkles size={13} className="mr-1" /> Generate</>}
                </button>
              </div>

              {generatedQA.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-ink-200 dark:border-ink-800" aria-label="Generated questions">
                  <p className="text-xs font-semibold text-ink-500 dark:text-ink-400 uppercase tracking-wide">Generated Questions</p>
                  {generatedQA.map((qa, i) => (
                    <details
                      key={i}
                      className="rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden group"
                      open={expandedQA === i}
                      onToggle={e => {
                        if ((e.target as HTMLDetailsElement).open) setExpandedQA(i);
                        else if (expandedQA === i) setExpandedQA(null);
                      }}
                    >
                      <summary className="w-full text-left p-3 hover:bg-ink-50 dark:hover:bg-ink-800/50 transition-colors cursor-pointer list-none">
                        <div className="flex items-start gap-2">
                          <span className="badge bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400 flex-shrink-0">
                            Q{i + 1}
                          </span>
                          <span className="text-sm font-medium text-ink-900 dark:text-ink-100 flex-1">{qa.question}</span>
                          {expandedQA === i
                            ? <ChevronUp size={14} className="text-ink-400 flex-shrink-0 mt-1" aria-hidden="true" />
                            : <ChevronDown size={14} className="text-ink-400 flex-shrink-0 mt-1" aria-hidden="true" />}
                        </div>
                      </summary>
                      <div className="p-3 bg-accent-50 dark:bg-accent-900/15 border-t border-ink-200 dark:border-ink-800">
                        <div className="flex items-start gap-2">
                          <Lightbulb size={14} className="text-accent-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
                          <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed whitespace-pre-line">{qa.answer}</p>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightTab === 'documents' && (
            <div className="space-y-3 animate-fade-in" role="tabpanel" aria-label="Document upload and processing">
              <div className="flex items-center gap-2">
                <Upload size={16} className="text-primary-500" aria-hidden="true" />
                <h2 className="font-bold text-ink-900 dark:text-ink-100 text-sm">Upload Textbook / Document</h2>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Processed locally in your browser. No file uploads to any server.
              </p>

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-ink-300 dark:border-ink-700 hover:border-primary-400 hover:bg-ink-50 dark:hover:bg-ink-800/50'
                }`}
                role="button"
                tabIndex={0}
                aria-label="Drag and drop files or click to upload"
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                {uploadingDoc ? (
                  <div className="space-y-2 py-1">
                    <Loader2 size={22} className="animate-spin mx-auto text-primary-500" />
                    <p className="text-xs font-medium text-ink-700 dark:text-ink-300">{uploadStage}</p>
                    <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-ink-400">{uploadProgress}%</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <FileText size={20} className="mx-auto text-ink-400" aria-hidden="true" />
                    <p className="text-xs font-medium text-ink-700 dark:text-ink-300">Click or drag file here</p>
                    <p className="text-[10px] text-ink-400">
                      PDF, TXT, MD, PNG, JPG, WEBP · Max 25MB
                    </p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptedFileTypes().join(',')}
                className="hidden"
                onChange={e => handleFileSelect(e.target.files)}
                aria-hidden="true"
              />

              {uploadError && (
                <div
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800/50"
                  role="alert"
                >
                  <AlertCircle size={14} className="text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-xs text-error-700 dark:text-error-400">{uploadError}</p>
                </div>
              )}

              {documents.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-ink-200 dark:border-ink-800" aria-label="Processed documents">
                  {documents.map((doc, idx) => (
                    <div
                      key={`${doc.filename}-${idx}`}
                      className="rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden animate-slide-up"
                    >
                      <div className="p-3">
                        <div className="flex items-start gap-2">
                          <div
                            className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex-shrink-0"
                            aria-hidden="true"
                          >
                            {doc.fileType.startsWith('image') ? <Upload size={16} /> : <File size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-ink-900 dark:text-ink-100 truncate">{doc.filename}</p>
                            <p className="text-[10px] text-ink-400 mt-0.5">
                              {formatFileSize(doc.fileSizeKB)} · {doc.wordCount.toLocaleString()} words
                              {doc.pageCount ? ` · ${doc.pageCount}p` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveDocument(idx)}
                            className="text-ink-400 hover:text-error-500 transition-colors p-1"
                            aria-label={`Remove ${doc.filename}`}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <div className="flex gap-1.5 mt-3">
                          <button
                            onClick={() => handleUseDocumentAsNotes(doc)}
                            className="btn-outline text-[10px] !px-2 !py-1 flex-1"
                            disabled={!doc.text || doc.text.length < 5}
                          >
                            Use as Notes
                          </button>
                          <button
                            onClick={() => handleSummarizeDocument(doc)}
                            className="btn-primary text-[10px] !px-2 !py-1 flex-1"
                            disabled={!doc.text || doc.text.length < 50 || summarizing}
                          >
                            {summarizing ? <Loader2 size={11} className="animate-spin" aria-hidden="true" /> : <Sparkles size={11} aria-hidden="true" />}
                            <span className="ml-1">Summarize</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {rightTab === 'summary' && (
            <div className="space-y-3 animate-fade-in" role="tabpanel" aria-label="Document summary results">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-warning-500" aria-hidden="true" />
                <h2 className="font-bold text-ink-900 dark:text-ink-100 text-sm">AI Document Summary</h2>
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                Upload a document in the Docs tab, then summarize it here.
              </p>

              {summarizing ? (
                <div className="card p-5 space-y-3 border border-warning-200 dark:border-warning-800/50">
                  <div className="flex items-center gap-2">
                    <Loader2 size={18} className="animate-spin text-warning-500" aria-hidden="true" />
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-300">Analyzing document...</p>
                  </div>
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="h-3 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-warning-400 to-accent-400 animate-shimmer"
                        style={{ width: `${25 + i * 15}%` }}
                      />
                    </div>
                  ))}
                </div>
              ) : summary ? (
                <div className="rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden">
                  <div className="p-4 bg-gradient-to-br from-warning-50 to-accent-50 dark:from-warning-900/10 dark:to-accent-900/10">
                    <div className="flex items-center gap-1.5 mb-2">
                      <CheckCircle2 size={14} className="text-success-600 dark:text-success-400" aria-hidden="true" />
                      <p className="text-xs font-semibold text-success-700 dark:text-success-400">Summary ready</p>
                    </div>
                    <div
                      className="text-xs text-ink-800 dark:text-ink-200 leading-relaxed whitespace-pre-line max-h-96 overflow-y-auto pr-1"
                      aria-label="Document summary content"
                    >
                      {summary}
                    </div>
                  </div>
                  <div className="p-3 border-t border-ink-200 dark:border-ink-800 flex gap-2">
                    <button
                      onClick={() => {
                        setNotesInput(prev => prev ? prev + '\n\n=== Document Summary ===\n' + summary : summary);
                        setRightTab('notes');
                      }}
                      className="btn-outline text-[10px] !px-2.5 !py-1.5 flex-1"
                    >
                      <FileText size={11} className="mr-1" aria-hidden="true" /> Send to Notes
                    </button>
                    <button
                      onClick={() => addChatMessage({
                        id: `msg-${Date.now()}`,
                        role: 'user',
                        content: 'Let\'s discuss my document summary: ' + summary.slice(0, 1500),
                        timestamp: Date.now(),
                      })}
                      className="btn-primary text-[10px] !px-2.5 !py-1.5 flex-1"
                    >
                      <MessageSquare size={11} className="mr-1" aria-hidden="true" /> Discuss
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card p-6 text-center border-dashed">
                  <Sparkles size={24} className="mx-auto text-ink-300 dark:text-ink-600 mb-2" aria-hidden="true" />
                  <p className="text-xs text-ink-500 dark:text-ink-400">
                    No summary yet. Upload a document in the Docs tab, then click Summarize.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-ink-200 dark:border-ink-800 mt-auto">
            <div className="flex items-center gap-2 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${apiStatus.configured ? 'bg-success-500' : 'bg-warning-500'}`}
                aria-hidden="true"
              />
              <span className="text-ink-500 dark:text-ink-400">
                {apiStatus.configured ? `Live AI · ${apiStatus.provider}` : 'Demo mode · intelligent mock responses'}
              </span>
            </div>
            <p className="text-[10px] text-ink-400 mt-1.5">
              🔒 All files processed locally in your browser
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
});

const ChatBubble = memo(function ChatBubble({
  msg,
  sources = [],
}: {
  msg: ChatMessage;
  sources?: WebSearchResult[];
}) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      <div className={`flex gap-2.5 max-w-[90%] sm:max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${
            isUser
              ? 'bg-ink-200 dark:bg-ink-700 text-ink-500 dark:text-ink-400'
              : 'bg-gradient-to-br from-primary-500 to-accent-500 text-white'
          }`}
          aria-hidden="true"
        >
          {isUser
            ? <span className="text-xs font-bold">You</span>
            : <Brain size={16} />}
        </div>
        <div className="flex flex-col gap-1.5">
          <div
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-ink-100 dark:bg-ink-800 text-ink-800 dark:text-ink-200 rounded-tl-sm'
          }`}
            role={isUser ? undefined : 'article'}
            aria-label={isUser ? undefined : 'Tutor response'}
          >
            {msg.content}
          </div>
          {!isUser && sources.length > 0 && (
            <div className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white/60 dark:bg-ink-900/60 px-3 py-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-600 dark:text-accent-400">
                <Globe size={12} aria-hidden="true" />
                Web references
              </div>
              <ul className="space-y-1">
                {sources.map((src, idx) => (
                  <li key={`${msg.id}-src-${idx}`} className="text-[11px] leading-snug">
                    <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-start gap-1.5 text-ink-700 dark:text-ink-300 hover:text-primary-700 dark:hover:text-primary-300"
                  >
                    <span className="font-medium">
                      [{idx + 1}] {src.title}
                    </span>
                    <ExternalLink size={11} className="mt-0.5 opacity-70 group-hover:opacity-100" />
                  </a>
                  {src.snippet && (
                    <p className="text-ink-500 dark:text-ink-400 line-clamp-2">{src.snippet}</p>
                  )}
                </li>
              ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

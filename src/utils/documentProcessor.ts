import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import DOMPurify from 'dompurify';
import { sanitizeInput } from './groqService';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;

export interface ProcessedDocument {
  filename: string;
  fileType: string;
  fileSizeKB: number;
  pageCount?: number;
  text: string;
  wordCount: number;
  processedAt: number;
}

interface ProcessingOptions {
  onProgress?: (stage: string, percent: number) => void;
  maxPages?: number;
  ocrLanguage?: string;
}

const MAX_FILE_SIZE_MB = 25;
const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
];

export function getAcceptedFileTypes(): string[] {
  return ACCEPTED_TYPES;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const sizeMB = file.size / (1024 * 1024);
  if (sizeMB > MAX_FILE_SIZE_MB) {
    return { valid: false, error: `File too large (${sizeMB.toFixed(1)}MB). Max is ${MAX_FILE_SIZE_MB}MB.` };
  }
  if (!ACCEPTED_TYPES.includes(file.type)) {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const acceptedExts = ['pdf', 'txt', 'md', 'csv', 'png', 'jpg', 'jpeg', 'webp'];
    if (!acceptedExts.includes(ext)) {
      return {
        valid: false,
        error: `Unsupported file type. Accepts: PDF, TXT, MD, CSV, PNG, JPG, WEBP.`,
      };
    }
  }
  return { valid: true };
}

export function sanitizeDocumentText(text: string): string {
  if (!text) return '';
  const purifyConfig = { ALLOWED_TAGS: [] as string[], ALLOWED_ATTR: [] as string[] };
  let cleaned = DOMPurify.sanitize(text, purifyConfig);
  cleaned = sanitizeInput(cleaned);
  cleaned = cleaned
    .replace(/\s+/g, ' ')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/\0/g, '')
    .trim();
  return cleaned;
}

export async function processPdfFile(file: File, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
  const { onProgress, maxPages = 30 } = options;
  onProgress?.('Loading PDF', 5);

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
    enableXfa: false,
  });

  const pdf = await loadingTask.promise;
  const totalPages = Math.min(pdf.numPages, maxPages);
  onProgress?.(`Parsing ${totalPages} pages`, 15);

  const textChunks: string[] = [];
  for (let i = 1; i <= totalPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .filter((item: unknown) => typeof (item as { str?: string }).str === 'string')
        .map((item: unknown) => (item as { str: string }).str)
        .join(' ');
      textChunks.push(`\n--- Page ${i} ---\n${pageText}`);
    } catch {
      textChunks.push(`\n--- Page ${i} (unreadable) ---\n`);
    }
    const pct = 15 + Math.round(((i / totalPages) * 60));
    onProgress?.(`Extracting page ${i}/${totalPages}`, pct);
  }

  onProgress?.('Finalizing extraction', 85);

  const rawText = textChunks.join('\n');
  const text = sanitizeDocumentText(rawText);

  return {
    filename: file.name,
    fileType: file.type || 'application/pdf',
    fileSizeKB: Math.round(file.size / 1024),
    pageCount: totalPages,
    text,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    processedAt: Date.now(),
  };
}

export async function processImageFile(file: File, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
  const { onProgress, ocrLanguage = 'eng' } = options;
  onProgress?.('Loading image', 10);

  const { data: { text: rawText } } = await Tesseract.recognize(file, ocrLanguage, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const pct = 10 + Math.round(m.progress * 80);
        onProgress?.(`OCR: ${Math.round(m.progress * 100)}%`, pct);
      } else if (m.status === 'loading tesseract core') {
        onProgress?.('Loading OCR engine', 15);
      } else if (m.status === 'initializing tesseract') {
        onProgress?.('Initializing OCR', 25);
      } else if (m.status === 'loading language traineddata') {
        onProgress?.('Loading language pack', 35);
      } else if (m.status === 'initializing api') {
        onProgress?.('Preparing recognition', 45);
      }
    },
  });

  onProgress?.('Finalizing extraction', 95);

  const text = sanitizeDocumentText(rawText);

  return {
    filename: file.name,
    fileType: file.type || 'image',
    fileSizeKB: Math.round(file.size / 1024),
    text,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    processedAt: Date.now(),
  };
}

export async function processTextFile(file: File, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
  const { onProgress } = options;
  onProgress?.('Reading file', 20);

  const rawText = await file.text();
  onProgress?.('Processing content', 70);

  const text = sanitizeDocumentText(rawText);
  onProgress?.('Finalizing', 95);

  return {
    filename: file.name,
    fileType: file.type || 'text/plain',
    fileSizeKB: Math.round(file.size / 1024),
    text,
    wordCount: text.split(/\s+/).filter(w => w.length > 0).length,
    processedAt: Date.now(),
  };
}

export async function processFile(file: File, options: ProcessingOptions = {}): Promise<ProcessedDocument> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isPdf = file.type === 'application/pdf' || ext === 'pdf';
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(ext);
  const isText = file.type.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext);

  if (isPdf) {
    return processPdfFile(file, options);
  }
  if (isImage) {
    return processImageFile(file, options);
  }
  if (isText) {
    return processTextFile(file, options);
  }

  throw new Error('Cannot determine file type. Please convert to PDF, text, or image.');
}

export async function readClipboardText(): Promise<string> {
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      return sanitizeDocumentText(text);
    }
    return '';
  } catch {
    throw new Error('Clipboard access denied. Please paste manually.');
  }
}

export function formatFileSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

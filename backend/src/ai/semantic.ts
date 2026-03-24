import * as natural from 'natural';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface SemanticVector {
  type: 'tfidf' | 'embedding';
  data: number[];
  keywords: string[];
  normalized: string;
  timestamp: number;
}

let tfidfVectorizer: natural.TfIdf;
let faqTexts: Map<string, string> = new Map();

export async function initSemanticEngine() {
  try {
    tfidfVectorizer = new natural.TfIdf();

    const { faq } = await import('../data/faq');
    Object.values(faq).forEach(category => {
      category.forEach(item => {
        const allQuestions = item.questions.join(' ');
        tfidfVectorizer.addDocument(allQuestions);
        faqTexts.set(normalized(allQuestions), item.answer);
      });
    });
    
    console.log('[SEMANTIC] Engine TF-IDF inicializado com FAQ');
  } catch (error) {
    console.error('[SEMANTIC] Erro ao inicializar:', error);
  }
}

function normalized(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/gi, '')
    .trim();
}

export function generateTFIDFVector(pergunta: string): SemanticVector {
  const norm = normalized(pergunta);
  const vector: number[] = [];

  if (tfidfVectorizer) {
    tfidfVectorizer.tfidfs(norm, (i, measure) => {
      vector.push(measure);
    });
  }

  const stopwords = new Set([
    'o', 'a', 'os', 'as', 'do', 'da', 'dos', 'das', 'de', 'um', 'uma',
    'qual', 'quais', 'quanto', 'quanta', 'como', 'onde', 'quando',
    'por', 'para', 'com', 'sem', 'em', 'é', 'são', 'está', 'estão'
  ]);
  
  const keywords = norm
    .split(/\s+/)
    .filter(word => !stopwords.has(word) && word.length > 2);
  
  return {
    type: 'tfidf',
    data: vector,
    keywords,
    normalized: norm,
    timestamp: Date.now()
  };
}

export function compareTwoVectors(vec1: SemanticVector, vec2: SemanticVector): number {
  if (vec1.type !== vec2.type) return 0;
  
  const data1 = vec1.data;
  const data2 = vec2.data;
  
  if (data1.length === 0 || data2.length === 0) {
    
    return stringCosineSimilarity(vec1.normalized, vec2.normalized);
  }

  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;

  const len = Math.min(data1.length, data2.length);
  
  for (let i = 0; i < len; i++) {
    dotProduct += (data1[i] || 0) * (data2[i] || 0);
    magnitude1 += Math.pow(data1[i] || 0, 2);
    magnitude2 += Math.pow(data2[i] || 0, 2);
  }

  if (data1.length > len) {
    for (let i = len; i < data1.length; i++) magnitude1 += Math.pow(data1[i] || 0, 2);
  }
  if (data2.length > len) {
    for (let i = len; i < data2.length; i++) magnitude2 += Math.pow(data2[i] || 0, 2);
  }

  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) {
    return 0;
  }
  
  return dotProduct / (magnitude1 * magnitude2);
}

export function compareKeywords(vec1: SemanticVector, vec2: SemanticVector): number {
  const set1 = new Set(vec1.keywords);
  const set2 = new Set(vec2.keywords);
  
  const intersection = [...set1].filter(k => set2.has(k)).length;
  const union = new Set([...set1, ...set2]).size;
  
  return union > 0 ? intersection / union : 0; 
}

function stringCosineSimilarity(str1: string, str2: string): number {
  const chars1 = new Map<string, number>();
  const chars2 = new Map<string, number>();
  
  for (const char of str1) {
    chars1.set(char, (chars1.get(char) || 0) + 1);
  }
  for (const char of str2) {
    chars2.set(char, (chars2.get(char) || 0) + 1);
  }
  
  let dotProduct = 0;
  for (const [char, count1] of chars1) {
    const count2 = chars2.get(char) || 0;
    dotProduct += count1 * count2;
  }
  
  let mag1 = 0, mag2 = 0;
  for (const count of chars1.values()) mag1 += count * count;
  for (const count of chars2.values()) mag2 += count * count;
  
  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);
  
  return mag1 * mag2 > 0 ? dotProduct / (mag1 * mag2) : 0;
}

export async function initSemantic() {
  await initSemanticEngine();
}

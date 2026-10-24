// Utilitário para extração de texto de PDF no navegador
import * as pdfjsLib from 'pdfjs-dist';

// Configuração do worker do PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface PageData {
  pageNumber: number;
  text: string;
  isScanned: boolean;
  cleanText?: string;
  wordCount: number;
}

export async function extractTextFromPdf(file: File): Promise<PageData[]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pages: PageData[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const strings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);

      const rawText = strings.join(' ').replace(/\s+/g, ' ').trim();
      const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];
      const isScanned = words.length < 5;

      pages.push({
        pageNumber: i,
        text: rawText || (isScanned ? '[Página digitalizada sem camada de texto nativa. Utilize o botão "Extrair OCR" ou "Limpar com Gemini IA"]' : ''),
        isScanned,
        wordCount: words.length,
      });
    }

    return pages;
  } catch (error) {
    console.warn('Erro ao ler PDF com pdfjs:', error);
    // Fallback: se falhar, retorna página com instrução
    return [
      {
        pageNumber: 1,
        text: 'Não foi possível extrair o texto diretamente deste arquivo PDF. Ele pode estar protegido ou conter apenas imagens escaneadas. Use o botão "Limpar via Gemini IA" ou selecione um dos exemplos.',
        isScanned: true,
        wordCount: 30,
      },
    ];
  }
}

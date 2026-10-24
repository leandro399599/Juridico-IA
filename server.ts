import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Inicialização segura do SDK Gemini
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint de Limpeza de OCR e Estruturação de Texto em Markdown
app.post('/api/clean-text', async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Texto não fornecido ou inválido.' });
      return;
    }

    const prompt = `
Você é um especialista em processamento de texto em Português e tecnologia assistiva para deficientes visuais.
Recebeu o seguinte texto bruto extraído de um documento/OCR.

Suas tarefas:
1. Corrija ruídos comuns de OCR (ex: "rn" confundido com "m", "1" confundido com "l", traços de hifenização quebrados no final de linha, caracteres espúrios).
2. Remova números de rodapé isolados, quebras aleatórias de parágrafo e cabeçalhos repetidos de página.
3. Estruture o texto em Markdown limpo com títulos (#, ##), parágrafos fluidos e pontuação natural.
4. Mantenha estritamente o sentido e o conteúdo original, sem inventar informações.
5. Retorne APENAS o texto limpo e formatado.

Texto Bruto:
"""
${text}
"""
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      success: true,
      cleanedText: response.text || text,
    });
  } catch (error: any) {
    console.error('Erro na API Gemini:', error);
    res.status(500).json({
      error: 'Falha ao processar texto com o Gemini. ' + (error?.message || ''),
    });
  }
});

// Endpoint para download direto dos arquivos Python e Pacote Completo do Instalador
app.get('/api/download/:file', (req: Request, res: Response) => {
  const fileName = req.params.file;
  const allowed = [
    'app.py',
    'requirements.txt',
    'build_exe.bat',
    'INSTALAR_E_RODAR.bat',
    'GERAR_EXECUTAVEL_COM_OCR_NATIVO.bat',
    'baixar_ocr_portatil.bat',
    'LeitorDinamico.spec',
    'LeitorDinamico_Windows_Completo.zip',
  ];
  if (!allowed.includes(fileName)) {
    res.status(403).send('Arquivo não permitido.');
    return;
  }
  const filePath = path.join(process.cwd(), fileName);
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).send('Arquivo não encontrado.');
  }
});

async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LeitorDinamico rodando em http://localhost:${PORT}`);
  });
}

startServer();

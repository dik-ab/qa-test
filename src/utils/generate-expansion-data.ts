import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { EXPANSION_DATA_PROMPT, PAGE_LOCATION_PROMPT } from './expansion-data-prompt';

// AWS Bedrock クライアントの初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'ap-northeast-1',
  ...(process.env.NODE_ENV === 'production' 
    ? {}
    : {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
      }
  ),
});

// Claude 4.5 Sonnet モデルID
const MODEL_ID = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

/**
 * 質問拡張データを生成する
 * @param question 質問
 * @param answer 回答
 * @returns 拡張データのテキスト
 */
export async function generateExpansionData(
  question: string,
  answer: string
): Promise<string> {
  try {
    const prompt = EXPANSION_DATA_PROMPT
      .replace(/\${question}/g, question)
      .replace(/\${answer}/g, answer);

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.content[0].text.trim();
  } catch (error) {
    console.error('Error generating expansion data:', error);
    return '';
  }
}

/**
 * ページ数と場所を抽出する
 * @param question 質問
 * @param answer 回答
 * @param fullText ドキュメント全文
 * @returns ページ数と場所
 */
export async function extractPageAndLocation(
  question: string,
  answer: string,
  fullText: string
): Promise<{ pageNumber: string; location: string }> {
  try {
    const prompt = PAGE_LOCATION_PROMPT
      .replace(/\${question}/g, question)
      .replace(/\${answer}/g, answer)
      .replace(/\${text}/g, fullText);

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 512,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        }),
      })
    );

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0].text;
    
    // JSONを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        return { pageNumber: '不明', location: '不明' };
      }
    }
    
    return { pageNumber: '不明', location: '不明' };
  } catch (error) {
    console.error('Error extracting page and location:', error);
    return { pageNumber: '不明', location: '不明' };
  }
}

/**
 * 質問と回答のリストに対して拡張データを生成する
 * @param questions 質問と回答のリスト
 * @param fullText ドキュメント全文
 * @returns 拡張データを含む質問と回答のリスト
 */
export async function generateAllExpansionData(
  questions: Array<{ question: string; answer: string }>,
  fullText: string
): Promise<Array<{
  question: string;
  answer: string;
  pageNumber: string;
  location: string;
  expansionData: string;
}>> {
  const results = [];
  
  for (const q of questions) {
    // 並列で処理を実行
    const [expansionData, pageLocation] = await Promise.all([
      generateExpansionData(q.question, q.answer),
      extractPageAndLocation(q.question, q.answer, fullText)
    ]);
    
    results.push({
      question: q.question,
      answer: q.answer,
      pageNumber: pageLocation.pageNumber,
      location: pageLocation.location,
      expansionData: expansionData
    });
  }
  
  return results;
}
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import 'dotenv-safe/config';

// AWS Bedrock クライアントの初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Claude 3.5 Sonnet モデルID
const MODEL_ID = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

/**
 * テキストからクエスチョンデータを生成する
 * @param text PDFから抽出したテキスト
 * @param numQuestions 生成する質問の数
 * @returns 生成された質問と回答のリスト
 */
export async function generateQuestionsFromText(
  text: string,
  numQuestions: number = 5
): Promise<Array<{ question: string, answer: string }>> {
  try {
    // プロンプトの作成
    const prompt = `
    <document>
    ${text}
    </document>

    上記の文書を読んで、ユーザーが質問する可能性が高い${numQuestions}個の質問とその回答を生成してください。
    質問は文書の重要なポイントをカバーし、回答は文書の内容に基づいて正確であるべきです。
    
    回答は以下のJSON形式で返してください:
    [
      {
        "question": "質問1",
        "answer": "回答1"
      },
      {
        "question": "質問2",
        "answer": "回答2"
      },
      ...
    ]
    
    JSONのみを返してください。説明や追加のテキストは不要です。
    `;

    // Bedrockへのリクエスト
    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4096,
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
    
    // レスポンスの解析
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0].text;
    
    // JSONの抽出（余分なテキストがある場合に対応）
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // 直接JSONとして解析できる場合
    try {
      return JSON.parse(responseText);
    } catch (error) {
      console.error('Failed to parse JSON response:', error);
      throw new Error('AIからの応答をJSONとして解析できませんでした');
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

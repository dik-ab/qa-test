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

    上記の文書を分析して、以下の条件に従って${numQuestions}個の質問と回答を生成してください：

    ## 質問生成の条件：
    1. **理解が困難な箇所を重点的に**：専門用語、複雑な概念、手順、重要な数値や日付など、ユーザーが理解に困る可能性が高い部分を優先的に質問化する
    2. **多様な質問パターン**：「〜とは何ですか」「〜はどのように」「〜の理由は」「〜の手順は」「〜の違いは」など、様々な角度からの質問を含める
    3. **曖昧な質問にも対応**：ユーザーが「あれ」「それ」「この部分」などの曖昧な表現を使っても理解できるよう、文脈を含めた質問を作成する
    4. **実用性重視**：文書を読んだユーザーが実際に疑問に思いそうな内容を優先する

    ## 回答生成の条件：
    1. **簡潔性**：要点を絞り、冗長な説明は避ける（目安：1-3文程度）
    2. **丁寧さ**：敬語を使用し、分かりやすい言葉で説明する
    3. **正確性**：文書の内容に忠実で、推測や憶測は含めない
    4. **構造化**：必要に応じて箇条書きや番号付きリストを使用して読みやすくする
    5. **文脈提供**：回答だけでなく、なぜそうなのかの背景も簡潔に含める

    ## 出力形式：
    以下のJSON形式で返してください。JSONのみを返し、説明や追加のテキストは不要です：

    [
      {
        "question": "具体的で分かりやすい質問文",
        "answer": "簡潔で丁寧な回答文"
      },
      {
        "question": "次の質問文",
        "answer": "次の回答文"
      }
    ]

    ## 例：
    - 良い質問例：「○○の手順で最初に行うべき作業は何ですか？」
    - 良い回答例：「最初に△△を確認していただく必要があります。これは□□を防ぐためです。」
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

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
    1. **具体性を重視**：「このキャンペーン」「この制度」「この手順」などの曖昧な表現は避け、文書内の具体的な名称、数値、期間、条件を明記した質問を作成する
    2. **理解が困難な箇所を重点的に**：専門用語、複雑な概念、手順、重要な数値や日付、条件や制限事項など、ユーザーが理解に困る可能性が高い部分を優先的に質問化する
    3. **実用的な詳細情報**：ユーザーが実際に行動を起こす際に必要となる具体的な情報（金額、期間、手順、対象者、条件など）を質問に含める
    4. **多様な質問パターン**：「〜の金額は」「〜の期限は」「〜の対象者は」「〜の手順は」「〜の条件は」「〜の計算方法は」など、様々な角度からの質問を含める
    5. **文脈を含めた質問**：ユーザーが「あれ」「それ」「この部分」などの曖昧な表現を使っても理解できるよう、文書の具体的な内容を質問文に含める

    ## 回答生成の条件：
    1. **簡潔性**：要点を絞り、冗長な説明は避ける（目安：1-3文程度）
    2. **丁寧さ**：敬語を使用し、分かりやすい言葉で説明する
    3. **正確性**：文書の内容に忠実で、推測や憶測は含めない
    4. **具体的な数値や条件**：金額、期間、パーセンテージ、対象者などの具体的な情報を明記する
    5. **構造化**：必要に応じて箇条書きや番号付きリストを使用して読みやすくする
    6. **文脈提供**：回答だけでなく、なぜそうなのかの背景も簡潔に含める

    ## 質問の具体性の例：
    ❌ 悪い例：「このキャンペーンで得られるポイントは何ですか？」
    ✅ 良い例：「dアカウント新規ID連携キャンペーンで得られるdポイントの最大金額は何ポイントですか？」

    ❌ 悪い例：「キャンペーンの期限はいつですか？」
    ✅ 良い例：「dアカウント新規ID連携で最大10,000ポイントプレゼントキャンペーンの応募期限はいつまでですか？」

    ❌ 悪い例：「対象者は誰ですか？」
    ✅ 良い例：「月額料金1,000円以上のドコモサービス利用者がポイント還元の対象となる条件は何ですか？」

    ## 出力形式：
    以下のJSON形式で返してください。JSONのみを返し、説明や追加のテキストは不要です：

    [
      {
        "question": "文書の具体的な内容を含む明確で詳細な質問文",
        "answer": "具体的な数値や条件を含む簡潔で丁寧な回答文"
      },
      {
        "question": "次の具体的な質問文",
        "answer": "次の具体的な回答文"
      }
    ]
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

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DocumentType } from './document-type-prompts';

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
const MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0';

/**
 * ドキュメントタイプごとの質問生成プロンプト
 */
export const QUESTION_GENERATION_PROMPTS: Record<DocumentType, string> = {
  consumer: `
    <document>
    \${text}
    </document>

    上記のマニュアル・操作説明書から、ユーザーが疑問に思うであろう質問を\${numQuestions}個生成してください。

    ## 質問生成の条件：
    1. **完全性の確認**：生成する質問は、ドキュメント内の情報だけで完全に回答できるものに限定
    2. **具体的な操作**：「〜するにはどうすればいいですか？」形式の実用的な質問
    3. **トラブル対応**：「〜ができない場合は？」「エラーが出たら？」などの問題解決の質問
    4. **機能の詳細**：「〜機能は何ができますか？」「〜の違いは？」などの理解を深める質問
    5. **前提条件**：「〜を使うための条件は？」などの準備に関する質問
    
    ## 重要な制約：
    - ドキュメントに答えが明記されていない質問は生成しない
    - 推測が必要な質問は避ける
    - 一般常識で補完が必要な質問は避ける

    ## 出力形式：
    質問のみをJSON配列で返してください：
    ["質問1", "質問2", "質問3", ...]
    `,

  enterprise: `
    <document>
    \${text}
    </document>

    上記のB/E向けツールマニュアルから、管理者・運用者が疑問に思うであろう質問を\${numQuestions}個生成してください。

    ## 質問生成の条件：
    1. **完全性の確認**：生成する質問は、ドキュメント内の情報だけで完全に回答できるものに限定
    2. **管理機能**：権限設定、ユーザー管理、システム設定に関する質問
    3. **運用手順**：バッチ処理、定期実行、監視に関する質問
    4. **連携・統合**：API使用、他システム連携、データ同期に関する質問
    5. **トラブル対応**：障害時の対処、ログ確認、復旧手順に関する質問
    
    ## 重要な制約：
    - ドキュメントに答えが明記されていない質問は生成しない
    - 推測が必要な質問は避ける
    - 一般的なベストプラクティスで補完が必要な質問は避ける

    ## 出力形式：
    質問のみをJSON配列で返してください：
    ["質問1", "質問2", "質問3", ...]
    `
};

/**
 * 質問のみを生成する
 * @param text ドキュメントテキスト
 * @param numQuestions 生成する質問数
 * @param documentType ドキュメントタイプ
 * @returns 質問の配列
 */
export async function generateQuestionsOnly(
  text: string,
  numQuestions: number,
  documentType: DocumentType
): Promise<string[]> {
  try {
    const prompt = QUESTION_GENERATION_PROMPTS[documentType]
      .replace(/\$\{text\}/g, text)
      .replace(/\$\{numQuestions\}/g, numQuestions.toString());

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2048,
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
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    try {
      return JSON.parse(responseText);
    } catch {
      console.error('Failed to parse questions JSON');
      return [];
    }
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
}

/**
 * 質問に対する回答を生成する
 * @param text ドキュメントテキスト
 * @param question 質問
 * @returns 回答
 */
export async function generateAnswerForQuestion(
  text: string,
  question: string
): Promise<string> {
  try {
    const prompt = `
<document>
${text}
</document>

<question>
${question}
</question>

上記のドキュメントの内容のみを使用して、質問に対する回答を生成してください。

## 回答生成の厳格なルール：
1. **情報源の制限**：
   - ドキュメント内に明記されている情報のみを使用
   - 推測、憶測、一般常識は一切使用しない
   - 「通常は」「一般的に」「おそらく」などの表現は禁止

2. **完全性の確認**：
   - 質問に完全に答えるために必要な情報がすべてドキュメントに含まれているか確認
   - 部分的な情報しかない場合は、部分的回答をしない

3. **情報不足時の対応**：
   - 回答に必要な情報がドキュメントに不足している場合
   - 必ず次の定型文を返す：「この質問に回答するための情報がドキュメント内に不足しています。」

4. **回答形式**：
   - 簡潔で分かりやすい日本語
   - 敬語を使用
   - 必要に応じて箇条書きを使用

回答のみを返してください。説明や追加のコメントは不要です。`;

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
    console.error('Error generating answer:', error);
    return 'この質問に回答するための情報がドキュメント内に不足しています。';
  }
}

/**
 * 2段階でFAQを生成する
 * @param text ドキュメントテキスト
 * @param numQuestions 生成する質問数
 * @param documentType ドキュメントタイプ
 * @returns 質問と回答のペア
 */
export async function generateFAQTwoStage(
  text: string,
  numQuestions: number,
  documentType: DocumentType
): Promise<Array<{ question: string; answer: string }>> {
  try {
    // ステップ1: 質問を生成
    console.log('Generating questions...');
    const questions = await generateQuestionsOnly(text, numQuestions, documentType);
    
    if (questions.length === 0) {
      return [];
    }

    // ステップ2: 各質問に対して回答を生成
    console.log(`Generating answers for ${questions.length} questions...`);
    const faqList = [];
    
    for (const question of questions) {
      const answer = await generateAnswerForQuestion(text, question);
      faqList.push({ question, answer });
    }

    return faqList;
  } catch (error) {
    console.error('Error in two-stage FAQ generation:', error);
    throw error;
  }
}
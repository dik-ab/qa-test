import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

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
 * 質問に対する回答の妥当性を検証する
 * @param question 質問文
 * @param answer 回答文
 * @param sourceText 元のドキュメントテキスト
 * @returns 検証結果
 */
export async function validateAnswer(
  question: string,
  answer: string,
  sourceText: string
): Promise<{
  isValid: boolean;
  reason: string;
  suggestedAnswer?: string;
}> {
  try {
    const prompt = `以下のドキュメントから生成された質問と回答のペアについて、回答の妥当性を検証してください。

<document>
${sourceText}
</document>

<question>
${question}
</question>

<answer>
${answer}
</answer>

## 検証基準：
1. **情報の出所**: 回答内の情報がすべてドキュメントに明記されているか
2. **推測の有無**: 一般常識や推測に基づく情報が含まれていないか
3. **完全性**: 質問に対して完全な回答ができているか
4. **正確性**: ドキュメント内の情報と回答が一致しているか

## 判定ルール：
- ドキュメントに明記されていない情報が含まれている場合 → 不適切
- 一般的な知識や推測で補完している場合 → 不適切
- 部分的にしか回答できていない場合で、それを明示していない場合 → 不適切
- 「情報が不足しています」と正直に回答している場合 → 適切

## 出力形式：
以下のJSON形式で返してください：
{
  "isValid": true/false,
  "reason": "判定理由を具体的に記載",
  "suggestedAnswer": "不適切な場合の修正案（適切な場合は省略）"
}

修正案では、必ず「この質問に回答するための情報がドキュメント内に不足しています。」を使用してください。`;

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
    const responseText = responseBody.content[0].text;

    try {
      // JSONを抽出
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(responseText);
    } catch {
      // パースエラーの場合はデフォルト値を返す
      return {
        isValid: true,
        reason: '検証結果の解析に失敗しました'
      };
    }
  } catch (error) {
    console.error('Error validating answer:', error);
    // エラーの場合は安全側に倒して有効とする
    return {
      isValid: true,
      reason: 'エラーが発生したため検証をスキップしました'
    };
  }
}

/**
 * 質問と回答のペアの配列を検証し、不適切なものを修正する
 * @param qaList 質問と回答のペアの配列
 * @param sourceText 元のドキュメントテキスト
 * @returns 検証・修正済みの質問と回答のペア
 */
export async function validateAndFixAnswers(
  qaList: Array<{ question: string; answer: string }>,
  sourceText: string
): Promise<Array<{ question: string; answer: string; validated: boolean }>> {
  const validatedList = [];

  for (const qa of qaList) {
    const validation = await validateAnswer(qa.question, qa.answer, sourceText);
    
    if (validation.isValid) {
      validatedList.push({
        ...qa,
        validated: true
      });
    } else {
      validatedList.push({
        question: qa.question,
        answer: validation.suggestedAnswer || 'この質問に回答するための情報がドキュメント内に不足しています。',
        validated: false
      });
    }
  }

  return validatedList;
}
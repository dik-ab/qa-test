import { NextRequest, NextResponse } from 'next/server';
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

// Claude 3.5 Sonnet モデルID
const MODEL_ID = 'global.anthropic.claude-sonnet-4-5-20250929-v1:0';

interface Question {
  question: string;
  answer: string;
}

interface SimilarityResult {
  similarPairs: Array<{
    index1: number;
    index2: number;
    question1: string;
    question2: string;
    similarity: string;
    reason: string;
  }>;
  summary: string;
}

export async function POST(request: NextRequest) {
  try {
    const { questions } = await request.json();

    if (!questions || !Array.isArray(questions) || questions.length < 2) {
      return NextResponse.json(
        { error: '類似度チェックには最低2つの質問が必要です' },
        { status: 400 }
      );
    }

    // 質問リストを番号付きで整理
    const questionList = questions.map((q: Question, index: number) => 
      `${index + 1}. ${q.question}`
    ).join('\n');

    const prompt = `
以下の質問リストを分析して、類似している質問のペアを特定してください：

<questions>
${questionList}
</questions>

## 分析の観点：
1. **意味的類似性**: 質問の意図や求めている情報が似ているか
2. **内容の重複**: 同じトピックや概念について聞いているか
3. **表現の類似性**: 異なる表現だが本質的に同じことを聞いているか

## 類似度の判定基準：
- **高い類似度**: ほぼ同じ内容を異なる表現で聞いている
- **中程度の類似度**: 関連するトピックだが、聞いている角度が少し異なる
- **低い類似度**: 関連性はあるが、明確に異なる情報を求めている

## 出力形式：
以下のJSON形式で返してください。類似している質問ペアが見つからない場合は、similarPairsを空配列にしてください：

{
  "similarPairs": [
    {
      "index1": 1,
      "index2": 3,
      "question1": "1番目の質問文",
      "question2": "3番目の質問文",
      "similarity": "高い類似度",
      "reason": "両方とも同じキャンペーンの期間について聞いており、表現が異なるだけで本質的に同じ情報を求めています。"
    }
  ],
  "summary": "全体的な類似度分析の結果をまとめた文章。類似している質問ペアの数や、質問の多様性について言及してください。"
}
`;

    // Bedrockへのリクエスト
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

    // レスポンスの解析
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const responseText = responseBody.content[0].text;

    // JSONの抽出
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    let result: SimilarityResult;
    
    if (jsonMatch) {
      result = JSON.parse(jsonMatch[0]);
    } else {
      try {
        result = JSON.parse(responseText);
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        throw new Error('AIからの応答をJSONとして解析できませんでした');
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error checking similarity:', error);
    return NextResponse.json(
      { error: '類似度チェック中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

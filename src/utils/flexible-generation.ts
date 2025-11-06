import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { TE_QUESTION_PROMPT, TE_ANSWER_PROMPT } from './te-prompts';

// 生成モードの定義
export type GenerationMode = 'questions_only' | 'answers_only' | 'both';

// AWS Bedrock クライアントの初期化
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
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
const MODEL_ID = 'us.anthropic.claude-sonnet-4-5-20250929-v1:0';

/**
 * TE用の質問を生成する
 * @param text ドキュメントテキスト
 * @param numQuestions 生成する質問数
 * @param customPrompt カスタムプロンプト（オプション）
 * @returns 質問と空の回答のペア
 */
export async function generateTEQuestions(
  text: string,
  numQuestions: number = 30,
  customPrompt?: string
): Promise<Array<{ question: string; answer: string }>> {
  try {
    // プロンプトに質問数を含める
    const promptWithCount = `${customPrompt || TE_QUESTION_PROMPT}\n\n生成する質問数: ${numQuestions}個`;
    const prompt = promptWithCount.replace(/\$\{text\}/g, text);

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 8192,
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
    console.error('Error generating TE questions:', error);
    throw error;
  }
}

/**
 * TE用の回答を生成する（質問リストに対して）
 * @param text ドキュメントテキスト
 * @param questions 質問リスト
 * @param customPrompt カスタムプロンプト（オプション）
 * @returns 質問と回答のペア
 */
export async function generateTEAnswers(
  text: string,
  questions: Array<{ question: string; answer: string }>,
  customPrompt?: string
): Promise<Array<{ question: string; answer: string }>> {
  try {
    // 質問リストをJSON形式に整形
    const questionList = JSON.stringify(questions, null, 2);

    const prompt = (customPrompt || TE_ANSWER_PROMPT)
      .replace(/\$\{text\}/g, text)
      .replace(/\$\{question_list\}/g, questionList);

    const response = await bedrockClient.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 8192,
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
      console.error('Failed to parse answers JSON');
      return questions; // エラーの場合は元の質問をそのまま返す
    }
  } catch (error) {
    console.error('Error generating TE answers:', error);
    throw error;
  }
}

/**
 * 柔軟な生成モードでFAQを生成
 * @param text ドキュメントテキスト
 * @param mode 生成モード
 * @param existingQuestions 既存の質問（answers_onlyモードの場合）
 * @param customQuestionPrompt カスタム質問プロンプト
 * @param customAnswerPrompt カスタム回答プロンプト
 * @param numQuestions 生成する質問数
 * @returns 質問と回答のペア
 */
export async function generateFAQFlexible(
  text: string,
  mode: GenerationMode,
  existingQuestions?: Array<{ question: string; answer: string }>,
  customQuestionPrompt?: string,
  customAnswerPrompt?: string,
  numQuestions: number = 30
): Promise<Array<{ question: string; answer: string }>> {
  try {
    switch (mode) {
      case 'questions_only':
        // 質問のみ生成
        console.log('Generating questions only...');
        return await generateTEQuestions(text, numQuestions, customQuestionPrompt);

      case 'answers_only':
        // 回答のみ生成（既存の質問が必要）
        if (!existingQuestions || existingQuestions.length === 0) {
          throw new Error('回答のみモードでは既存の質問が必要です');
        }
        console.log('Generating answers only...');
        return await generateTEAnswers(text, existingQuestions, customAnswerPrompt);

      case 'both':
        // 両方生成（2段階）
        console.log('Generating both questions and answers...');
        const questions = await generateTEQuestions(text, numQuestions, customQuestionPrompt);
        if (questions.length === 0) {
          return [];
        }
        return await generateTEAnswers(text, questions, customAnswerPrompt);

      default:
        throw new Error(`Unknown generation mode: ${mode}`);
    }
  } catch (error) {
    console.error('Error in flexible FAQ generation:', error);
    throw error;
  }
}
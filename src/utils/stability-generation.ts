/**
 * 質問・回答の同一性を担保するための機能
 */

import { generateQuestions, generateAnswers } from './flexible-generation';

/**
 * 質問を3回生成して、一致するものだけを返す
 * @param text ドキュメントテキスト
 * @param numQuestions 生成する質問数
 * @param customPrompt カスタムプロンプト
 * @param isTE TEモードかどうか
 * @returns 一致した質問のリスト
 */
export async function generateStableQuestions(
  text: string,
  numQuestions: number = 30,
  customPrompt?: string,
  isTE: boolean = true
): Promise<Array<{ question: string; answer: string }>> {
  try {
    console.log('Generating questions 3 times for stability...');
    
    // 質問を3回生成（より多めに生成して一致率を上げる）
    const generationCount = 3;
    const questionsPerRound = Math.ceil(numQuestions * 2); // 2倍の数を生成
    
    const allResults = await Promise.all(
      Array(generationCount).fill(null).map(() => 
        generateQuestions(text, questionsPerRound, customPrompt, isTE)
      )
    );
    
    // 各回の質問テキストのみを抽出
    const questionSets = allResults.map(result => 
      result.map(item => item.question.trim().toLowerCase())
    );
    
    // 3回すべてに出現する質問を見つける
    const commonQuestions: Array<{ question: string; answer: string }> = [];
    const seen = new Set<string>();
    
    // 第1回目の結果を基準にする
    for (const item of allResults[0]) {
      const normalizedQuestion = item.question.trim().toLowerCase();
      
      // 既に処理済みの場合はスキップ
      if (seen.has(normalizedQuestion)) continue;
      
      // 他の2回でも同じ質問が存在するかチェック
      const existsInAllRounds = questionSets.slice(1).every(set => 
        set.includes(normalizedQuestion)
      );
      
      if (existsInAllRounds) {
        commonQuestions.push({
          question: item.question.trim(), // 元の形式を保持
          answer: item.answer
        });
        seen.add(normalizedQuestion);
        
        // 目標数に達したら終了
        if (commonQuestions.length >= numQuestions) break;
      }
    }
    
    console.log(`Found ${commonQuestions.length} stable questions out of ${numQuestions} requested`);
    
    // 一致する質問が少なすぎる場合は警告
    if (commonQuestions.length < numQuestions * 0.5) {
      console.warn(`Only ${commonQuestions.length} stable questions found. Consider adjusting prompts or generation parameters.`);
    }
    
    return commonQuestions;
  } catch (error) {
    console.error('Error in stable question generation:', error);
    throw error;
  }
}

/**
 * 回答生成時の温度パラメータを調整して安定性を向上
 * @param text ドキュメントテキスト
 * @param questions 質問リスト
 * @param customPrompt カスタムプロンプト
 * @param isTE TEモードかどうか
 * @returns 安定した回答
 */
export async function generateStableAnswers(
  text: string,
  questions: Array<{ question: string; answer: string }>,
  customPrompt?: string,
  isTE: boolean = true
): Promise<Array<{ question: string; answer: string }>> {
  // 通常の回答生成を使用（将来的にtemperature調整を追加可能）
  return generateAnswers(text, questions, customPrompt, isTE);
}
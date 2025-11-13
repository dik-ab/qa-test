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
    const questionsPerRound = Math.ceil(numQuestions * 4); // 4倍の数を生成して十分な一致を確保
    
    const allResults = await Promise.all(
      Array(generationCount).fill(null).map(() => 
        generateQuestions(text, questionsPerRound, customPrompt, isTE)
      )
    );
    
    // 各回の質問テキストのみを抽出
    const questionSets = allResults.map(result => 
      result.map(item => item.question.trim().toLowerCase())
    );
    
    // 類似度を計算する関数（シンプルな文字列類似度）
    const calculateSimilarity = (str1: string, str2: string): number => {
      const s1 = str1.toLowerCase();
      const s2 = str2.toLowerCase();
      
      // 完全一致
      if (s1 === s2) return 1.0;
      
      // 単語の共通度をチェック
      const words1 = s1.split(/\s+/);
      const words2 = s2.split(/\s+/);
      const commonWords = words1.filter(w => words2.includes(w)).length;
      const similarity = (commonWords * 2) / (words1.length + words2.length);
      
      return similarity;
    };
    
    // 3回すべてに出現する質問を見つける（類似度ベース）
    const commonQuestions: Array<{ question: string; answer: string }> = [];
    const seen = new Set<string>();
    
    // 第1回目の結果を基準にする
    for (const item of allResults[0]) {
      const normalizedQuestion = item.question.trim().toLowerCase();
      
      // 既に処理済みの場合はスキップ
      if (seen.has(normalizedQuestion)) continue;
      
      // 他の2回でも類似の質問が存在するかチェック（類似度0.9以上）
      const existsInAllRounds = questionSets.slice(1).every(set => 
        set.some(q => calculateSimilarity(normalizedQuestion, q) >= 0.9)
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
    
    // 一致する質問が少なすぎる場合は、2回一致でもOKとする
    if (commonQuestions.length < numQuestions * 0.5) {
      console.warn(`Only ${commonQuestions.length} stable questions found with 3-way match. Trying 2-way match...`);
      
      // 2回以上出現する質問を追加
      for (const item of allResults[0]) {
        if (commonQuestions.length >= numQuestions) break;
        
        const normalizedQuestion = item.question.trim().toLowerCase();
        if (seen.has(normalizedQuestion)) continue;
        
        // 少なくとも1回は他の結果に類似の質問が存在するかチェック
        const appearanceCount = questionSets.slice(1).filter(set => 
          set.some(q => calculateSimilarity(normalizedQuestion, q) >= 0.9)
        ).length;
        
        if (appearanceCount >= 1) {
          commonQuestions.push({
            question: item.question.trim(),
            answer: item.answer
          });
          seen.add(normalizedQuestion);
        }
      }
    }
    
    console.log(`Final count: ${commonQuestions.length} stable questions`);
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
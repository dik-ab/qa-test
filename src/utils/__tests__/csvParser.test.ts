import { DocomoCSVParser } from '../csvParser';

describe('DocomoCSVParser - 答えの部分のテスト', () => {
  test('CSVコンテンツから答えの部分を正しく取得できる（改行を含む）', () => {
    // テスト用のCSVコンテンツ（docomo2.csvの内容）
    const csvContent = `,,,,▼ここが重複しないよう注意,,,,,,
,No,カテゴリ名,カテゴリID,アンカーID,照会先,"カテゴリ内
並び順",（データ突合確認用）質問,ターゲット,質問,答え
,1,会員ランクについて,Rank,Rank27,,3,,web;android;ios;android_dcm;,ランク毎にどんな特典があるのか？,"主な特典は以下のとおりです。
-----------
ポイント倍率アップ特典
d払い特典
dポイントマーケット利用特典
料金充当特典　　など
-----------
ランクに応じて、dポイントカード提示や各種サービスをご利用時の進呈率がアップします。
詳しくは[link text=""dポイントクラブの会員ランクとは"" url=""https://dpoint.docomo.ne.jp/guide/about_rank/index.html""]でご確認ください。"`;

    const results = DocomoCSVParser.parseCSV(csvContent);
    
    // データが取得できることを確認
    expect(results.length).toBeGreaterThan(0);
    
    const firstItem = results[0];
    
    // 答えの部分が存在することを確認
    expect(firstItem.answer).toBeDefined();
    expect(typeof firstItem.answer).toBe('string');
    expect(firstItem.answer.length).toBeGreaterThan(0);
    
    // 答えの内容が正しく取得できているかを確認
    expect(firstItem.answer).toContain('主な特典は以下のとおりです。');
    expect(firstItem.answer).toContain('ポイント倍率アップ特典');
    expect(firstItem.answer).toContain('d払い特典');
    expect(firstItem.answer).toContain('dポイントマーケット利用特典');
    expect(firstItem.answer).toContain('料金充当特典');
    expect(firstItem.answer).toContain('ランクに応じて、dポイントカード提示や各種サービスをご利用時の進呈率がアップします。');
    
    // 改行が正しく保持されているかを確認
    const lines = firstItem.answer.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    
    // 区切り線が含まれているかを確認
    expect(firstItem.answer).toContain('-----------');
    
    // リンクが正しく含まれているかを確認
    expect(firstItem.answer).toContain('dポイントクラブの会員ランクとは');
    expect(firstItem.answer).toContain('https://dpoint.docomo.ne.jp/guide/about_rank/index.html');
    
    console.log('=== 取得された答えの内容 ===');
    console.log(firstItem.answer);
    console.log('=== 答えの行数 ===');
    console.log(`${lines.length}行`);
  });
});

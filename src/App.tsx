import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Moon, Play, RotateCcw, Info, Leaf, Ruler, Droplets } from 'lucide-react';
import { motion } from 'motion/react';

type DayState = {
  day: number;
  isLightOn: boolean;
  isWatered: boolean;
};

const MAX_DAYS = 10;
const SPROUT_COUNT = 12;

export default function App() {
  const [currentDay, setCurrentDay] = useState(0);
  const [isLightOn, setIsLightOn] = useState(true);
  const [isWatered, setIsWatered] = useState(false);
  const [history, setHistory] = useState<DayState[]>([{ day: 0, isLightOn: true, isWatered: false }]);

  // スプラウトの個体データを生成（初回のみ）
  const sprouts = useMemo(() => {
    return Array.from({ length: SPROUT_COUNT }).map((_, i) => ({
      id: i,
      x: 80 + (i * 240) / SPROUT_COUNT + (Math.random() * 15 - 7.5),
      growthFactor: 0.85 + Math.random() * 0.3, // 0.85 ~ 1.15
      curve: Math.random() * 60 - 30, // -30 ~ 30
    }));
  }, []);

  // 現在の履歴からスプラウトの平均的な状態を計算
  const calculateStats = (hist: DayState[]) => {
    let height = 0;
    let stemWidth = 4;
    let leafColor = '#FEF08A'; // 初期は黄色
    let leafSize = 0;
    let isGerminated = false;
    let waterLevel = 100; // 0 ~ 100
    let isDead = false;
    let hasGreened = false;

    hist.forEach((state, index) => {
      // 水分の計算
      if (state.isWatered) {
        waterLevel = 100;
      } else {
        waterLevel = Math.max(0, waterLevel - 40); // 1日水やりしないと40減る
      }

      if (waterLevel === 0 && index > 0) {
        // 水分が0になると枯れるリスク
        isDead = true;
      }

      if (index === 0) return;
      
      // 発芽の判定（最初の数日に水分が必要）
      if (index === 1 && waterLevel > 0) {
        isGerminated = true;
      }

      if (index >= 2 && isGerminated && !isDead) {
        // 成長の計算
        // 最初から光が当たっていると、茎が伸びずに葉が展開してしまう（スプラウトにならない）
        let growth = 0;
        if (state.isLightOn) {
          // 光がある場合：茎の伸びは抑えられる（特に初期）
          growth = index <= 5 ? 6 : 10;
          hasGreened = true;
        } else {
          // 光がない場合：光を求めて茎が長く伸びる（徒長）
          growth = 28;
        }
        
        height += growth;
        
        // 茎の太さ（明所の方が太くなる）
        if (state.isLightOn) {
          stemWidth = Math.min(stemWidth + 0.8, 8);
        } else {
          stemWidth = Math.max(stemWidth - 0.3, 2.5);
        }
      }
    });

    // 枯れた場合の見た目の変化
    if (isDead) {
      leafColor = '#854D0E'; // 茶色
      leafSize = Math.max(0, leafSize - 3); // しおれる
    } else if (hist.length > 2 && isGerminated) {
      // 葉の色と大きさ
      leafColor = hasGreened ? '#22C55E' : '#FDE047';
      // 光を浴びると葉が大きく展開する
      leafSize = hasGreened ? 16 : 7;
    }

    const isEtiolated = height > 180 && stemWidth < 4; // 徒長（スプラウトらしい姿）
    const isNormalSeedling = hasGreened && height < 120; // 普通の苗（短くて緑）

    return { height, stemWidth, leafColor, leafSize, isGerminated, waterLevel, isDead, isEtiolated, isNormalSeedling };
  };

  const stats = calculateStats(history);

  const handleNextDay = () => {
    if (currentDay < MAX_DAYS && !stats.isDead) {
      const nextDay = currentDay + 1;
      setCurrentDay(nextDay);
      setHistory(prev => [...prev, { day: nextDay, isLightOn, isWatered }]);
      setIsWatered(false); // 次の日のために水やりをリセット
    }
  };

  const handleReset = () => {
    setCurrentDay(0);
    setHistory([{ day: 0, isLightOn: true, isWatered: false }]);
    setIsLightOn(true);
    setIsWatered(false);
  };

  const toggleLight = () => {
    setIsLightOn(!isLightOn);
    // 現在の日の履歴も更新する（まだ日を進めていない場合）
    setHistory(prev => {
      const newHistory = [...prev];
      newHistory[newHistory.length - 1].isLightOn = !isLightOn;
      return newHistory;
    });
  };

  const toggleWater = () => {
    setIsWatered(!isWatered);
    // 現在の日の履歴も更新する（まだ日を進めていない場合）
    setHistory(prev => {
      const newHistory = [...prev];
      newHistory[newHistory.length - 1].isWatered = !isWatered;
      return newHistory;
    });
  };

  const getExplanation = () => {
    const currentState = history[currentDay];
    
    if (stats.isDead) return "水分が足りず、枯れてしまいました。";
    if (currentDay === 0) return "種まきをしました。発芽するまでは適度な水分を与えて見守りましょう。";
    if (currentDay === 1 && !stats.isGerminated) return "水分が足りないため、発芽できません。";
    if (currentDay === 1) return "種が割れて根が出始めました（発芽）。";
    
    const previousState = history[currentDay - 1];
    const allDark = history.slice(1).every(h => !h.isLightOn);
    const allLight = history.slice(1).every(h => h.isLightOn);
    const turnedLight = previousState && !previousState.isLightOn && currentState.isLightOn;

    if (stats.isNormalSeedling && currentDay > 4) return "最初から光を当てているため、茎が伸びずに葉が大きく育っています。いわゆる「スプラウト」のような姿にはなりません。";
    if (stats.waterLevel <= 40) return "水分が不足しています。このままでは枯れてしまいます。";
    if (turnedLight) return "暗所から明所に移動しました。光を浴びて葉が緑色に変わっていきます（緑化）。";
    if (allDark && currentDay > 3) return "光が当たらないため、光を求めて茎が細く長く伸びています（徒長）。葉は黄色く小さいままです。";
    if (allLight && currentDay > 3) return "光を浴びて光合成を行い、葉が大きく緑色に育っています。茎も太く丈夫です。";
    if (currentState.isLightOn) return "光を浴びて順調に育っています。";
    return "暗所で育てています。茎が伸びやすくなります。";
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
            <Leaf size={24} />
          </div>
          <h1 className="text-xl font-bold text-stone-800 tracking-tight">スプラウト育成シミュレーター</h1>
        </div>
        <div className="text-sm text-stone-500 font-medium">
          中学校 技術・家庭科（生物育成の技術）
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左カラム：コントロールパネル */}
        <div className="lg:col-span-4 space-y-6">
          {/* 日数コントロール */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-1">経過日数</h2>
                <div className="text-4xl font-light text-stone-800">
                  Day <span className="font-bold">{currentDay}</span> <span className="text-xl text-stone-400">/ {MAX_DAYS}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="p-3 rounded-full bg-stone-100 text-stone-600 hover:bg-stone-200 transition-colors"
                  title="リセット"
                >
                  <RotateCcw size={20} />
                </button>
                <button
                  onClick={handleNextDay}
                  disabled={currentDay >= MAX_DAYS}
                  className="flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-emerald-600/20"
                >
                  <Play size={20} className="fill-current" />
                  1日進める
                </button>
              </div>
            </div>

            {/* プログレスバー */}
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${(currentDay / MAX_DAYS) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* 環境設定 */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">環境設定 (日照・水分)</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <button
                  onClick={() => !isLightOn && toggleLight()}
                  className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isLightOn 
                      ? 'border-amber-400 bg-amber-50 text-amber-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Sun size={32} className={isLightOn ? 'fill-amber-400' : ''} />
                  <span className="font-bold">明所 (光あり)</span>
                </button>
                <button
                  onClick={() => isLightOn && toggleLight()}
                  className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    !isLightOn 
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Moon size={32} className={!isLightOn ? 'fill-indigo-400' : ''} />
                  <span className="font-bold">暗所 (光なし)</span>
                </button>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => !isWatered && toggleWater()}
                  className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isWatered 
                      ? 'border-blue-400 bg-blue-50 text-blue-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Droplets size={32} className={isWatered ? 'fill-blue-400' : ''} />
                  <span className="font-bold">水やりあり</span>
                </button>
                <button
                  onClick={() => isWatered && toggleWater()}
                  className={`flex-1 flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    !isWatered 
                      ? 'border-stone-400 bg-stone-100 text-stone-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Droplets size={32} className={!isWatered ? 'text-stone-400' : ''} />
                  <span className="font-bold">水やりなし</span>
                </button>
              </div>
            </div>
            <p className="text-xs text-stone-500 mt-4 text-center">
              ※ 次の日に進む前に設定を変更してください。
            </p>
          </div>

          {/* 状態解説 */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info size={16} />
              観察メモ
            </h2>
            <p className="text-stone-700 leading-relaxed min-h-[4rem]">
              {getExplanation()}
            </p>
          </div>

          {/* データ表示 */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h2 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">現在のデータ</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-stone-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-stone-500 mb-1">
                  <Ruler size={16} />
                  <span className="text-xs font-bold">平均草丈</span>
                </div>
                <div className="text-2xl font-light text-stone-800">
                  {(stats.height / 15).toFixed(1)} <span className="text-sm text-stone-500">cm</span>
                </div>
              </div>
              <div className="bg-stone-50 p-4 rounded-xl">
                <div className="flex items-center gap-2 text-stone-500 mb-1">
                  <Leaf size={16} />
                  <span className="text-xs font-bold">葉の色</span>
                </div>
                <div className="text-lg font-medium text-stone-800 flex items-center gap-2 mt-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-stone-200" 
                    style={{ backgroundColor: stats.leafColor }}
                  />
                  {currentDay < 2 ? '-' : stats.isDead ? '茶色' : stats.leafColor === '#22C55E' ? '緑色' : '黄色'}
                </div>
              </div>
              <div className="bg-stone-50 p-4 rounded-xl col-span-2">
                <div className="flex items-center gap-2 text-stone-500 mb-2">
                  <Droplets size={16} />
                  <span className="text-xs font-bold">培地の水分量</span>
                </div>
                <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${stats.waterLevel > 40 ? 'bg-blue-500' : stats.waterLevel > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                    animate={{ width: `${stats.waterLevel}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="text-right text-xs text-stone-500 mt-1">{stats.waterLevel}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* 右カラム：ビジュアライザー */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden relative min-h-[600px] flex flex-col">
            {/* 背景 */}
            <motion.div 
              className="absolute inset-0 z-0"
              animate={{ 
                backgroundColor: isLightOn ? '#e0f2fe' : '#1e293b',
              }}
              transition={{ duration: 1 }}
            />
            
            {/* 窓からの光の表現（明所のみ） */}
            <motion.div 
              className="absolute top-0 right-0 w-96 h-96 bg-white/20 blur-3xl rounded-full -translate-y-1/2 translate-x-1/3 z-0"
              animate={{ opacity: isLightOn ? 1 : 0 }}
              transition={{ duration: 1 }}
            />

            {/* 描画エリア */}
            <div className="relative z-10 flex-1 flex items-end justify-center pb-12">
              <svg width="400" height="500" viewBox="0 0 400 500" className="overflow-visible">
                {/* 容器 */}
                <g transform="translate(0, 400)">
                  {/* スポンジ/培地 */}
                  <rect x="40" y="0" width="320" height="30" fill="#fef3c7" rx="4" />
                  {/* 水分 */}
                  <motion.rect 
                    x="40" y="20" width="320" height="10" 
                    fill="#bae6fd" rx="2" 
                    animate={{ opacity: stats.waterLevel / 100 * 0.6 }}
                    transition={{ duration: 0.5 }}
                  />
                  {/* 容器本体 */}
                  <path d="M 30 0 L 50 60 L 350 60 L 370 0 Z" fill="#ffffff" opacity="0.3" stroke="#cbd5e1" strokeWidth="2" />
                  <path d="M 30 0 L 50 60 L 350 60 L 370 0 Z" fill="none" stroke="#94a3b8" strokeWidth="2" />
                </g>

                {/* スプラウト群 */}
                {sprouts.map(sprout => {
                  const h = stats.height * sprout.growthFactor;
                  const sw = stats.stemWidth * (0.9 + Math.random() * 0.2);
                  const ls = stats.leafSize * sprout.growthFactor;
                  
                  // 茎のパス計算
                  const startY = 400;
                  const endY = startY - h;
                  
                  // 枯れた場合は茎が倒れる
                  const deadCurve = stats.isDead ? sprout.curve * 3 : sprout.curve;
                  const endX = deadCurve * (h / 100); 
                  const cp1X = deadCurve * 0.5 * (h / 100);
                  const currentY = stats.isDead ? startY - h * 0.6 : endY; // 枯れると少し下がる

                  return (
                    <g key={sprout.id} transform={`translate(${sprout.x}, 0)`}>
                      {/* 種 */}
                      <ellipse cx="0" cy="398" rx="5" ry="3.5" fill="#854d0e" />
                      
                      {/* 根（発芽後） */}
                      {stats.isGerminated && (
                        <motion.path 
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          d={`M 0 400 Q ${sprout.curve * 0.2} 410 ${-sprout.curve * 0.3} 420`}
                          stroke="#fef08a"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      )}

                      {/* 茎 */}
                      {stats.isGerminated && h > 0 && (
                        <motion.path 
                          animate={{ 
                            d: `M 0 ${startY} Q ${cp1X} ${startY - h * 0.5} ${endX} ${currentY}`,
                            strokeWidth: sw,
                            stroke: stats.isDead ? '#a16207' : stats.leafColor === '#22C55E' ? '#86efac' : '#fef08a'
                          }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          fill="none"
                          strokeLinecap="round"
                        />
                      )}

                      {/* 葉 */}
                      {h > 15 && (
                        <g transform={`translate(${endX}, ${currentY})`}>
                          {/* 左の葉 */}
                          <motion.ellipse 
                            animate={{ 
                              rx: ls, 
                              ry: ls * 0.6,
                              fill: stats.leafColor
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            cx={-ls * 0.8} 
                            cy={-ls * 0.2} 
                            transform="rotate(-35)" 
                          />
                          {/* 右の葉 */}
                          <motion.ellipse 
                            animate={{ 
                              rx: ls, 
                              ry: ls * 0.6,
                              fill: stats.leafColor
                            }}
                            transition={{ duration: 0.8, ease: "easeInOut" }}
                            cx={ls * 0.8} 
                            cy={-ls * 0.2} 
                            transform="rotate(35)" 
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            
            {/* 状態ラベル */}
            <div className="absolute top-6 left-6 z-20">
              <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm backdrop-blur-md border ${
                isLightOn 
                  ? 'bg-white/80 text-sky-800 border-sky-200' 
                  : 'bg-slate-800/80 text-slate-200 border-slate-700'
              }`}>
                {isLightOn ? '☀️ 明所 (光合成中)' : '🌙 暗所 (徒長中)'}
              </div>
            </div>
          </div>

          {/* シミュレーション結果表示 */}
          {(currentDay === MAX_DAYS || stats.isDead) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-md border border-emerald-200 overflow-hidden"
            >
              <div className="bg-emerald-600 px-6 py-4 text-white flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <Info size={20} />
                  シミュレーション結果
                </h2>
                <div className="text-sm bg-emerald-700 px-3 py-1 rounded-full">
                  {stats.isDead ? '育成失敗' : '育成完了'}
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* 操作履歴 */}
                  <div>
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">操作の記録</h3>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {history.map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-sm">
                          <span className="font-bold text-stone-500 w-12">Day {h.day}</span>
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                              {h.isLightOn ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-indigo-500" />}
                              {h.isLightOn ? '明所' : '暗所'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Droplets size={14} className={h.isWatered ? "text-blue-500" : "text-stone-300"} />
                              {h.isWatered ? '水あり' : '水なし'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* 最終結果 */}
                  <div className="space-y-6">
                    <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">最終的な状態</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">平均草丈</span>
                        <span className="font-bold text-xl">{(stats.height / 15).toFixed(1)} cm</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">葉の色</span>
                        <span className="font-bold">{stats.isDead ? '茶色' : stats.leafColor === '#22C55E' ? '緑色' : '黄色'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">茎の状態</span>
                        <span className="font-bold">{stats.isDead ? 'しおれている' : stats.stemWidth > 5 ? '太く丈夫' : '細長い(徒長)'}</span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 leading-relaxed">
                      <p className="font-bold mb-1">まとめ：</p>
                      {stats.isDead ? (
                        "植物の成長には適切な水分が不可欠です。水分がなくなると細胞の活動が止まり、枯死してしまいます。"
                      ) : stats.isNormalSeedling ? (
                        "最初から光を当てて育てたため、茎が伸びる「徒長」が起こりませんでした。葉は立派に育ちましたが、私たちがよく知る「茎の長いスプラウト」にはなりませんでした。"
                      ) : stats.isEtiolated ? (
                        "暗所で育てたことで、光を求めて茎が細長く伸びる「徒長（とちょう）」が起こりました。これがスプラウト特有の姿です。最後に光を当てることで、葉を緑色にしています。"
                      ) : (
                        "光と水を適切に与えたことで、健康な苗に育ちました。スプラウトとして収穫するには、初期の暗所管理が重要であることがわかります。"
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}

import React, { useState, useMemo, useEffect } from 'react';
import { Sun, Moon, Play, RotateCcw, Info, Leaf, Ruler, Droplets, CheckCircle, Trophy } from 'lucide-react';
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
  const [isHarvested, setIsHarvested] = useState(false);

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
  const calculateStats = (hist: DayState[], includeLastDay: boolean = false) => {
    let height = 0;
    let stemWidth = 4;
    let leafColor = '#FEF08A'; // 初期は黄色
    let leafSize = 0;
    let isGerminated = false;
    let waterLevel = 0; // 0 ~ 100 (初期状態は乾燥)
    let isDead = false;
    let hasGreened = false;
    let darkDaysEarly = 0;
    let lightDaysEarly = 0;

    // 通常は設定中の「最新日」の成長は含めないが、
    // 終了時（includeLastDay=true）はすべての日の成長を含める
    const daysToProcess = includeLastDay ? hist : hist.slice(0, -1);
    const currentPendingState = hist[hist.length - 1];

    daysToProcess.forEach((state, index) => {
      // 水分の計算
      if (state.isWatered) {
        waterLevel = 100;
      } else {
        waterLevel = Math.max(0, waterLevel - 40);
      }

      if (waterLevel === 0 && isGerminated) {
        isDead = true;
      }

      if (index === 0) return;
      
      if (!isGerminated && waterLevel > 0) {
        isGerminated = true;
        leafSize = 6; // 発芽時に最小限の葉のサイズを持たせる
      }

      if (index >= 1 && index <= 4 && isGerminated) {
        if (state.isLightOn) lightDaysEarly++;
        else darkDaysEarly++;
      }

      if (isGerminated && !isDead) {
        let growth = 0;
        let leafGrowth = 0;
        
        if (state.isLightOn) {
          // 明所での成長
          growth = index <= 5 ? 8 : 12;
          leafGrowth = 4;
          hasGreened = true;
          stemWidth = Math.min(stemWidth + 0.8, 10);
        } else {
          // 暗所での成長（徒長）
          growth = 35; // 徒長時は急激に伸びる
          leafGrowth = 1.5; // 葉は小さいが、見える程度には育つ
          stemWidth = Math.max(stemWidth - 0.3, 2.0);
        }
        
        height += growth;
        leafSize = Math.min(leafSize + leafGrowth, 24);
      }
    });

    // 水分量の表示用
    let displayWaterLevel = waterLevel;
    if (!includeLastDay && currentPendingState) {
      if (currentPendingState.isWatered) {
        displayWaterLevel = 100;
      }
    }

    // 成長パターンの判定用
    const lastState = daysToProcess[daysToProcess.length - 1];
    const isCurrentlyLight = lastState ? lastState.isLightOn : false;

    let pattern = 'NONE';
    if (isGerminated && !isDead) {
      if (lightDaysEarly >= darkDaysEarly) {
        pattern = isCurrentlyLight ? 'SEEDLING_HEALTHY' : 'SEEDLING_ETIOLATED';
      } else {
        if (isCurrentlyLight) {
          pattern = 'SPROUT_GREENED';
        } else {
          pattern = hasGreened ? 'SPROUT_RE_ETIOLATED' : 'SPROUT_YELLOW';
        }
      }
    }

    if (isDead) {
      leafColor = '#854D0E';
      leafSize = Math.max(0, leafSize - 5);
    } else if (isGerminated) {
      // 葉の色決定
      if (pattern === 'SEEDLING_HEALTHY') leafColor = '#166534';
      else if (pattern === 'SEEDLING_ETIOLATED') leafColor = '#86EFAC';
      else if (pattern === 'SPROUT_GREENED') leafColor = '#22C55E';
      else if (pattern === 'SPROUT_RE_ETIOLATED') leafColor = '#4ADE80';
      else leafColor = '#FDE047';
    }

    const isEtiolated = lightDaysEarly < darkDaysEarly;
    const isNormalSeedling = !isEtiolated;

    return { 
      height, 
      stemWidth, 
      leafColor, 
      leafSize, 
      isGerminated, 
      waterLevel: displayWaterLevel, 
      isDead, 
      isEtiolated, 
      isNormalSeedling,
      pattern
    };
  };

  const stats = useMemo(() => {
    const isFinished = currentDay === MAX_DAYS;
    // 終了時は最後の日も計算に含める
    return calculateStats(history, isFinished);
  }, [history, currentDay]);

  const isSuccess = isHarvested && stats.pattern === 'SPROUT_GREENED';
  const showResult = isHarvested || stats.isDead || currentDay === MAX_DAYS;

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
    setIsHarvested(false);
  };

  const handleHarvest = () => {
    if (stats.isGerminated && !stats.isDead) {
      setIsHarvested(true);
    }
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
    if (!stats.isGerminated) return "水分が足りないため、発芽できません。まずは水を与えてみましょう。";
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

            {/* 収穫ボタン */}
            {currentDay >= 5 && !isHarvested && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4"
              >
                <button
                  onClick={handleHarvest}
                  disabled={stats.isDead || !stats.isGerminated}
                  className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20"
                >
                  <CheckCircle size={24} />
                  収穫する！
                </button>
              </motion.div>
            )}

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
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-5">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3">環境設定 (日照・水分)</h2>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => !isLightOn && toggleLight()}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                    isLightOn 
                      ? 'border-amber-400 bg-amber-50 text-amber-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Sun size={20} className={isLightOn ? 'fill-amber-400' : ''} />
                  <span className="text-xs font-bold">明所</span>
                </button>
                <button
                  onClick={() => isLightOn && toggleLight()}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                    !isLightOn 
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Moon size={20} className={!isLightOn ? 'fill-indigo-400' : ''} />
                  <span className="text-xs font-bold">暗所</span>
                </button>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => !isWatered && toggleWater()}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                    isWatered 
                      ? 'border-blue-400 bg-blue-50 text-blue-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Droplets size={20} className={isWatered ? 'fill-blue-400' : ''} />
                  <span className="text-xs font-bold">水やりあり</span>
                </button>
                <button
                  onClick={() => isWatered && toggleWater()}
                  className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                    !isWatered 
                      ? 'border-stone-400 bg-stone-100 text-stone-700' 
                      : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Droplets size={20} className={!isWatered ? 'text-stone-400' : ''} />
                  <span className="text-xs font-bold">水やりなし</span>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-stone-400 mt-3 text-center">
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

            {/* 収穫結果オーバーレイ */}
            {showResult && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-stone-900/80 backdrop-blur-sm flex items-center justify-center p-6"
              >
                <motion.div 
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden"
                >
                  <div className={`${isSuccess ? 'bg-emerald-600' : 'bg-red-600'} p-8 text-white text-center relative`}>
                    <div className="absolute top-4 right-4 opacity-20">
                      <Trophy size={80} />
                    </div>
                    <Trophy size={48} className="mx-auto mb-4 text-amber-300" />
                    <h2 className="text-3xl font-black mb-2">
                      {isSuccess ? '収穫完了！' : '育成失敗...'}
                    </h2>
                    <p className="opacity-90">
                      {isSuccess ? 'あなたが育てたスプラウトの記録です' : '残念ながら、良好な状態には育ちませんでした。'}
                    </p>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <div className="text-xs font-bold text-stone-400 uppercase mb-1">最終草丈</div>
                        <div className="text-2xl font-bold text-stone-800">{(stats.height / 10).toFixed(1)} <span className="text-sm font-normal text-stone-500">cm</span></div>
                      </div>
                      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                        <div className="text-xs font-bold text-stone-400 uppercase mb-1">育成日数</div>
                        <div className="text-2xl font-bold text-stone-800">{currentDay} <span className="text-sm font-normal text-stone-500">日</span></div>
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Leaf size={18} className={isSuccess ? 'text-emerald-600' : 'text-red-600'} />
                        <span className={`text-sm font-bold ${isSuccess ? 'text-emerald-800' : 'text-red-800'}`}>育成タイプ</span>
                      </div>
                      <div className={`text-lg font-bold ${isSuccess ? 'text-emerald-700' : 'text-red-700'}`}>
                        {stats.pattern === 'SEEDLING_HEALTHY' ? '日光を当て続けた苗' :
                         stats.pattern === 'SEEDLING_ETIOLATED' ? '徒長した苗(光→暗)' :
                         stats.pattern === 'SPROUT_GREENED' ? '緑化した苗(暗→光)' :
                         stats.pattern === 'SPROUT_RE_ETIOLATED' ? '再徒長した苗(暗→光→暗)' :
                         stats.pattern === 'SPROUT_YELLOW' ? '黄色のスプラウト' : '不明'}
                      </div>
                      <p className={`text-sm mt-2 leading-relaxed ${isSuccess ? 'text-emerald-600' : 'text-red-600'}`}>
                        {stats.pattern === 'SEEDLING_HEALTHY' ? '非常に健康で丈夫な苗に育ちました！光合成が活発に行われ、栄養満点です。' :
                         stats.pattern === 'SEEDLING_ETIOLATED' ? '途中で暗くなったため、再び光を求めて伸び始めました。環境の変化に敏感に反応しましたね。' :
                         stats.pattern === 'SPROUT_GREENED' ? '理想的なスプラウトです！暗所で茎を伸ばし、最後に光を当てて栄養価を高めることができました。' :
                         stats.pattern === 'SPROUT_RE_ETIOLATED' ? '一度緑化しましたが、再び暗所に戻したことで茎がさらに伸びました。植物の生命力を感じます。' :
                         stats.pattern === 'SPROUT_YELLOW' ? '光を全く浴びずに育ったスプラウトです。非常に柔らかく、光を求める必死な姿が印象的です。' : ''}
                      </p>
                    </div>

                    <button
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-stone-800 text-white font-bold hover:bg-stone-900 transition-all"
                    >
                      <RotateCcw size={20} />
                      もう一度育てる
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}

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
                            stroke: stats.isDead 
                              ? '#a16207' 
                              : stats.pattern === 'SEEDLING_HEALTHY'
                                ? '#16a34a' // 濃い緑
                                : stats.pattern === 'SEEDLING_ETIOLATED'
                                  ? '#86efac' // 薄い緑
                                  : stats.pattern === 'SPROUT_GREENED'
                                    ? '#ffffff' // 白
                                    : stats.pattern === 'SPROUT_RE_ETIOLATED'
                                      ? '#f8fafc' // ほぼ白
                                      : stats.isEtiolated 
                                        ? '#ffffff'
                                        : '#fef08a'
                          }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                          fill="none"
                          strokeLinecap="round"
                        />
                      )}

                      {/* 葉 */}
                      {h > 5 && (
                        <g transform={`translate(${endX}, ${currentY})`}>
                          {/* 左の葉 */}
                          <motion.path 
                            animate={{ 
                              d: stats.isNormalSeedling 
                                ? `M 0 0 C ${-ls*1.5} ${-ls*0.5}, ${-ls*1.5} ${ls*1.5}, 0 0` // 苗：より大きなハート型
                                : `M 0 0 C ${-ls} ${-ls*0.5}, ${-ls} ${ls}, 0 0`, // スプラウト：シンプルな楕円
                              fill: stats.leafColor,
                              scale: stats.isNormalSeedling ? 1.5 : 1
                            }}
                            transition={{ duration: 0.8 }}
                            transform="rotate(-20)"
                          />
                          {/* 右の葉 */}
                          <motion.path 
                            animate={{ 
                              d: stats.isNormalSeedling 
                                ? `M 0 0 C ${ls*1.5} ${-ls*0.5}, ${ls*1.5} ${ls*1.5}, 0 0`
                                : `M 0 0 C ${ls} ${-ls*0.5}, ${ls} ${ls}, 0 0`,
                              fill: stats.leafColor,
                              scale: stats.isNormalSeedling ? 1.5 : 1
                            }}
                            transition={{ duration: 0.8 }}
                            transform="rotate(20)"
                          />
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            
            {/* 状態ラベル & データオーバーレイ */}
            <div className="absolute top-6 left-6 right-6 z-20 flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm backdrop-blur-md border ${
                isLightOn 
                  ? 'bg-white/80 text-sky-800 border-sky-200' 
                  : 'bg-slate-800/80 text-slate-200 border-slate-700'
              }`}>
                {isLightOn ? '☀️ 明所 (光合成中)' : '🌙 暗所 (徒長中)'}
              </div>

              <div className={`p-4 rounded-2xl shadow-lg backdrop-blur-xl border flex gap-6 ${
                isLightOn
                  ? 'bg-white/60 border-white/40 text-stone-800'
                  : 'bg-slate-900/60 border-slate-700/40 text-slate-100'
              }`}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">平均草丈</span>
                  <span className="text-2xl font-light">
                    {(stats.height / 15).toFixed(1)} <span className="text-xs opacity-60">cm</span>
                  </span>
                </div>
                <div className="w-px bg-current opacity-10 self-stretch" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">葉の色</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div 
                      className="w-3 h-3 rounded-full border border-black/10" 
                      style={{ backgroundColor: stats.leafColor }}
                    />
                    <span className="text-sm font-medium">
                      {currentDay < 2 ? '-' : stats.isDead ? '茶色' : stats.leafColor === '#22C55E' ? '緑色' : '黄色'}
                    </span>
                  </div>
                </div>
                <div className="w-px bg-current opacity-10 self-stretch" />
                <div className="flex flex-col min-w-[100px]">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">水分量</span>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-current/10 rounded-full overflow-hidden">
                      <motion.div 
                        className={`h-full ${stats.waterLevel > 40 ? 'bg-blue-500' : stats.waterLevel > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                        animate={{ width: `${stats.waterLevel}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold">{stats.waterLevel}%</span>
                  </div>
                </div>
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
                        <span className="text-stone-500">育成タイプ</span>
                        <span className="font-bold text-emerald-700">
                          {stats.isDead ? '枯死' : 
                           !stats.isGerminated ? '未発芽' :
                           stats.pattern === 'SEEDLING_HEALTHY' ? '日光を当て続けた苗' :
                           stats.pattern === 'SEEDLING_ETIOLATED' ? '徒長した苗(光→暗)' :
                           stats.pattern === 'SPROUT_GREENED' ? '緑化した苗(暗→光)' :
                           stats.pattern === 'SPROUT_RE_ETIOLATED' ? '再徒長した苗(暗→光→暗)' :
                           stats.pattern === 'SPROUT_YELLOW' ? '黄色のスプラウト' : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">平均草丈</span>
                        <span className="font-bold text-xl">{(stats.height / 15).toFixed(1)} cm</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">葉の色</span>
                        <span className="font-bold">{!stats.isGerminated ? '-' : stats.isDead ? '茶色' : stats.leafColor === '#22C55E' ? '緑色' : '黄色'}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-stone-100 pb-2">
                        <span className="text-stone-500">茎の状態</span>
                        <span className="font-bold">
                          {!stats.isGerminated ? '未発芽' : 
                           stats.isDead ? 'しおれている' : 
                           stats.pattern === 'SEEDLING_HEALTHY' ? '太く丈夫' :
                           stats.pattern === 'SEEDLING_ETIOLATED' ? '太いが徒長気味' :
                           stats.pattern === 'SPROUT_GREENED' ? '白く細長い(徒長)' :
                           stats.pattern === 'SPROUT_RE_ETIOLATED' ? '白く細長い(再徒長)' :
                           '白く細長い(徒長)'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl text-sm text-emerald-800 leading-relaxed">
                      <p className="font-bold mb-1">まとめ：</p>
                      {stats.isDead ? (
                        "植物の成長には適切な水分が不可欠です。水分がなくなると細胞の活動が止まり、枯死してしまいます。"
                      ) : !stats.isGerminated ? (
                        "一度も水を与えなかったため、種が発芽しませんでした。植物の成長には、まず発芽のための水分が必要です。"
                      ) : stats.pattern === 'SEEDLING_HEALTHY' ? (
                        "【日光を当て続けた苗】最初から光を当てて育てたため、茎が太く丈夫で、葉が大きく緑色に育ちました。光合成を最大限に行うための理想的な姿です。"
                      ) : stats.pattern === 'SEEDLING_ETIOLATED' ? (
                        "【日光を当てて、暗くして徒長した苗】最初は健康な苗として育ちましたが、途中で暗所に入れたことで、再び光を求めて茎が細長く伸び始めました。一度緑になった葉も、光がないと元気がなくなります。"
                      ) : stats.pattern === 'SPROUT_GREENED' ? (
                        "【暗い所に置き、最後に光を当てた苗】最初は暗所で茎を白く長く伸ばし（徒長）、最後に光を当てて葉を緑色（緑化）にしました。これが私たちが食べるスプラウトの標準的な姿です。"
                      ) : stats.pattern === 'SPROUT_RE_ETIOLATED' ? (
                        "【途中で緑化させ、暗所に戻した苗】一度光を当てて葉を緑にしましたが、再び暗所に戻したことで、さらに光を求めて茎が伸び続けました。植物は環境の変化に敏感に反応して姿を変えます。"
                      ) : stats.pattern === 'SPROUT_YELLOW' ? (
                        "【ずっと暗所で育てたスプラウト】一度も光を浴びなかったため、葉は黄色のままで、茎は極限まで細長く伸びました。光合成ができないため、種に蓄えられた養分だけで必死に伸びている状態です。"
                      ) : (
                        "光と水の管理によって、植物の姿が大きく変わることがわかりました。環境に合わせて姿を変える「環境応答」の仕組みが観察できました。"
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

import { api } from '../src/api/client.js';

const GUN_IDS = ['A001', 'A002', 'A003', 'B001', 'B002', 'B003', 'C001', 'C002', 'C003', 'D001', 'D002', 'D003'];
const GUN_MIN_PRESSURE: Record<string, number> = {
  A001: 4.0, A002: 4.0, A003: 4.0,
  B001: 4.5, B002: 4.5, B003: 4.5,
  C001: 5.0, C002: 5.0, C003: 5.0,
  D001: 3.5, D002: 3.5, D003: 3.5,
};

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randomFrostLevel(): 0 | 1 | 2 | 3 {
  const rand = Math.random();
  if (rand < 0.6) return 0;
  if (rand < 0.85) return 1;
  if (rand < 0.97) return 2;
  return 3;
}

async function simulateOne() {
  const gunId = GUN_IDS[Math.floor(Math.random() * GUN_IDS.length)];
  const minPressure = GUN_MIN_PRESSURE[gunId];
  
  const lowPressureChance = Math.random();
  let waterPressure: number;
  
  if (lowPressureChance < 0.15) {
    waterPressure = minPressure - randomInRange(0.2, 1.0);
  } else {
    waterPressure = minPressure + randomInRange(0.3, 2.0);
  }
  
  const frostLevel = randomFrostLevel();

  try {
    const result = await api.reportSensorData({ gunId, waterPressure, frostLevel });
    const time = new Date().toLocaleTimeString('zh-CN');
    console.log(`[${time}] ${gunId}: 水压=${waterPressure}巴, 结霜=${frostLevel}${result.ruleCheck.triggered ? ' ⚠️ 触发需融霜!' : ''}`);
  } catch (error) {
    console.error(`❌ 上报失败 (${gunId}):`, (error as Error).message);
  }
}

async function main() {
  console.log('🌨️  造雪传感数据模拟器启动');
  console.log('📋 每 3 秒随机上报一把造雪枪数据...');
  console.log('⏹️  按 Ctrl+C 停止\n');

  const interval = setInterval(simulateOne, 3000);
  
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n🛑 模拟器已停止');
    process.exit(0);
  });
}

main().catch(console.error);

import { getDb, runQuery } from '../api/db/index.js';
import { SnowGunRepository } from '../api/repositories/SnowGunRepository.js';
import { SensorRecordRepository } from '../api/repositories/SensorRecordRepository.js';

const gunRepo = new SnowGunRepository();
const sensorRepo = new SensorRecordRepository();

async function resetDatabase(): Promise<void> {
  const db = await getDb();
  await runQuery(db, 'DELETE FROM sensor_records');
  await runQuery(db, 'DELETE FROM shutdown_records');
  await runQuery(db, 'DELETE FROM snow_guns');
}

const GUNS = [
  { id: 'A001', slope: '初级道A', minWaterPressure: 4.0 },
  { id: 'A002', slope: '初级道A', minWaterPressure: 4.0 },
  { id: 'A003', slope: '初级道A', minWaterPressure: 4.0 },
  { id: 'B001', slope: '中级道B', minWaterPressure: 4.5 },
  { id: 'B002', slope: '中级道B', minWaterPressure: 4.5 },
  { id: 'B003', slope: '中级道B', minWaterPressure: 4.5 },
  { id: 'C001', slope: '高级道C', minWaterPressure: 5.0 },
  { id: 'C002', slope: '高级道C', minWaterPressure: 5.0 },
  { id: 'C003', slope: '高级道C', minWaterPressure: 5.0 },
  { id: 'D001', slope: '魔毯D', minWaterPressure: 3.5 },
  { id: 'D002', slope: '魔毯D', minWaterPressure: 3.5 },
  { id: 'D003', slope: '魔毯D', minWaterPressure: 3.5 },
];

function randomInRange(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function randomFrostLevel(): 0 | 1 | 2 | 3 {
  const rand = Math.random();
  if (rand < 0.5) return 0;
  if (rand < 0.8) return 1;
  if (rand < 0.95) return 2;
  return 3;
}

async function seed() {
  console.log('🌨️  开始初始化造雪联调系统演示数据...');

  console.log('\n🗑️  清空旧数据...');
  await resetDatabase();
  console.log('  ✅ 数据库已重置');

  console.log('\n📦 创建造雪枪数据...');
  for (const gun of GUNS) {
    await gunRepo.create({ ...gun, status: 'normal' });
    console.log(`  ✅ ${gun.id} - ${gun.slope} (最低水压 ${gun.minWaterPressure} 巴)`);
  }

  console.log('\n📊 生成历史传感数据...');
  const now = Date.now();
  const twoHoursAgo = now - 2 * 60 * 60 * 1000;

  for (const gun of GUNS) {
    for (let t = twoHoursAgo; t <= now; t += 5 * 60 * 1000) {
      const basePressure = gun.minWaterPressure + randomInRange(0.5, 2.0);
      let waterPressure = basePressure;
      let frostLevel = randomFrostLevel();

      if (gun.id === 'B002' && t > now - 12 * 60 * 1000) {
        waterPressure = gun.minWaterPressure - randomInRange(0.3, 1.0);
        frostLevel = 2;
      }

      if (gun.id === 'C001' && t > now - 8 * 60 * 1000) {
        waterPressure = gun.minWaterPressure - randomInRange(0.2, 0.8);
        frostLevel = 3;
      }

      await sensorRepo.create({
        gunId: gun.id,
        recordedAt: new Date(t).toISOString(),
        waterPressure,
        frostLevel,
      });
    }
    console.log(`  ✅ ${gun.id} - 已生成传感记录`);
  }

  console.log('\n⚠️  为 B002 和 C001 生成触发需融霜的条件...');

  for (const gunId of ['B002', 'C001']) {
    const gun = GUNS.find(g => g.id === gunId)!;
    const baseTime = now - 8 * 60 * 1000;
    
    for (let i = 0; i < 4; i++) {
      const recordTime = new Date(baseTime + i * 2 * 60 * 1000);
      await sensorRepo.create({
        gunId,
        recordedAt: recordTime.toISOString(),
        waterPressure: gun.minWaterPressure - randomInRange(0.5, 1.2),
        frostLevel: i >= 2 ? 2 : 1,
      });
    }
    console.log(`  ✅ ${gunId} - 已生成 4 条低压高结霜记录`);
  }

  console.log('\n🎉 演示数据初始化完成！');
  console.log('\n📋 造雪枪清单：');
  GUNS.forEach(g => console.log(`  ${g.id} - ${g.slope}`));
  console.log('\n💡 提示：B002 和 C001 已满足需融霜触发条件，上报一条新数据即可触发。');
  console.log('   可通过以下命令测试触发：');
  console.log('   curl -X POST http://localhost:3001/api/sensor-records \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"gunId":"B002","waterPressure":3.0,"frostLevel":2}\'');
}

seed().catch(console.error);

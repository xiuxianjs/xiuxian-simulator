import { parseWorldBossClaimAll } from '../src/api/bot/world-boss-claim';
import { displayCurrencyText } from '../src/constants/currency';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import axios from 'axios';
import { parseExactJSON, exactInteger } from '../src/api/core/exact-json';
import { formatNumber } from '../src/utils/formatHelper';
import { requestBackend } from '../src/api/bot/client';
import { mockBackendConfig } from './backend-config-helper';
import { parseBackendRealmRanking } from '../src/api/bot/realm-ranking-queries';
import { parseWorldBossRanking } from '../src/api/bot/world-boss-ranking-queries';

test('raw JSON preserves boundaries, nested tokens, signs and exponent integers', () => {
 const raw = '{"small":9007199254740991,"large":9007199254740993,"max":9223372036854775807,"negative":-9223372036854775808,"exponent":9.223372036854775807e18,"nested":[18446744073709551615],"text":"9223372036854775807","fraction":0.25}';
 assert.deepEqual(parseExactJSON(raw), {small:Number.MAX_SAFE_INTEGER,large:9007199254740993n,max:9223372036854775807n,negative:-9223372036854775808n,exponent:9223372036854775807n,nested:[18446744073709551615n],text:'9223372036854775807',fraction:0.25});
 assert.throws(()=>exactInteger(9007199254740992));
 assert.throws(()=>exactInteger(-1n));
 assert.throws(()=>parseExactJSON('1e999'));
 assert.throws(()=>parseExactJSON('9007199254740993.5')); 
 assert.throws(()=>formatNumber(9007199254740992));
 assert.equal(formatNumber(-9223372036854775808n),'-922.34亿亿');
 assert.equal(formatNumber(99999999),'1亿');
 assert.equal(formatNumber(1.25),'1.25');
});

test('actual HTTP client keeps unsafe currency integers before decoder or display',async t=>{
 mockBackendConfig(t,{api_url:'https://exact-number.test',robot_auth_token:'test-token'});
 t.mock.method(axios,'create',()=>({request:async()=>({status:200,headers:{},data:'{"data":{"SPIRIT_CRYSTAL":9223372036854775807}}'})}));
 const result=await requestBackend('player','get_players_id_currencies',{path:{id:1}});
 assert.equal(result.SPIRIT_CRYSTAL as unknown,9223372036854775807n);
 assert.equal(formatNumber(result.SPIRIT_CRYSTAL as unknown as bigint),'922.34亿亿');
});

test('rankings preserve large metrics while refusing large numeric identities',()=>{
 const row={rank:1,uid:1002220,name:'玩家',realmName:'元婴',realmLevel:24,experience:9223372036854775807n};
 const raw={canUseFifthLayerFeature:true,canUseSpar:true,realmName:'元婴',region:'一区',list:[row],nearby:[],self:row};
 assert.equal(parseBackendRealmRanking(raw).list[0].experience,9223372036854775807n);
 assert.throws(()=>parseBackendRealmRanking({...raw,list:[{...row,uid:9223372036854775807n}]}));
 const boss=parseWorldBossRanking({stageLevel:1,stageName:'炼气',available:true,unavailableMessage:'',myRank:1,myDamage:9223372036854775807n,ranking:[{rank:1,name:'玩家',damage:9223372036854775807n}]});
 assert.equal(boss.myDamage,9223372036854775807n);
});

test('currency texts format explicit quantities and preserve identity, money and existing units', async()=>{
 assert.equal(displayCurrencyText('SPIRIT_STONE×9223372036854775807、灵晶：100000000、UID:1002220、支付10000元、/购买 10000'), '灵石×922.34亿亿、灵晶：1亿、UID:1002220、支付10000元、/购买 10000');
 assert.equal(displayCurrencyText('灵石×40.68万、道晶×1亿'),'灵石×40.68万、道晶×1亿');
});


test('reward reconciliation sums exact mixed-size integers and rejects a one-unit mismatch',()=>{
 const items=[{bossDate:'2026-10-31',stageLevel:1,stageName:'炼气',tierName:'参与',spiritStone:9007199254740993n,spiritCrystal:1,playerDamage:9223372036854775807n},{bossDate:'2026-10-30',stageLevel:1,stageName:'炼气',tierName:'参与',spiritStone:1,spiritCrystal:1,playerDamage:0}];
 assert.equal(parseWorldBossClaimAll({items,totalStone:9007199254740994n,totalCrystal:2}).totalStone,9007199254740994n);
 assert.throws(()=>parseWorldBossClaimAll({items,totalStone:9007199254740993n,totalCrystal:2}),/合计不一致/);
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400, must-revalidate');
  try {
    const r = await fetch('https://spire-codex.com/api/cards?lang=eng', {
      headers: {'User-Agent':'SpireIndex/1.0','Accept':'application/json'}
    });
    if (!r.ok) throw new Error(`spire-codex ${r.status}`);
    const raw = await r.json();
    const list = Array.isArray(raw) ? raw : (raw.cards || raw.data || []);
    const nc=s=>{s=(s||'').toLowerCase();if(s.includes('iron'))return'ironclad';if(s.includes('silent'))return'silent';if(s.includes('defect'))return'defect';if(s.includes('regent'))return'regent';if(s.includes('necro'))return'necrobinder';return'colorless';};
    const nt=s=>{s=(s||'').toLowerCase();if(s.includes('attack'))return'Attack';if(s.includes('skill'))return'Skill';if(s.includes('power'))return'Power';if(s.includes('status'))return'Status';if(s.includes('curse'))return'Curse';return'Skill';};
    const nr=s=>{s=(s||'').toLowerCase();if(s.includes('starter')||s.includes('basic'))return'Starter';if(s.includes('uncommon'))return'Uncommon';if(s.includes('rare'))return'Rare';if(s.includes('ancient'))return'Ancient';return'Common';};
    const pc=v=>{if(v==='X'||v===-1)return'X';if(v==null)return null;const n=parseInt(v);return isNaN(n)?v:n;};
    const COLOR_TAGS=new Set(['gold','blue','red','green','purple','white','yellow','orange','gray','grey','teal','cyan','silver','brown','black']);
    const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/\[([^\]]*)\]/g,(_,g)=>{if(g.startsWith('/')||COLOR_TAGS.has(g.toLowerCase()))return'';return g;}).replace(/\s+/g,' ').trim();
    const toImg=n=>(n||'').toLowerCase().replace(/['''!?]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const kw=(desc,descUp,type)=>{const kws=new Set(),d=((desc||'')+(descUp||'')).toLowerCase();[['Exhaust','exhaust'],['Block','block'],['Draw','draw'],['Discard','discard'],['Strength','strength'],['Vulnerable','vulnerable'],['Weak','\\bweak\\b'],['Poison','poison'],['Energy','energy'],['Innate','innate'],['Retain','retain'],['Ethereal','ethereal'],['Sly','\\bsly\\b'],['Doom','doom'],['Summon','summon'],['Soul','\\bsoul\\b'],['Stars','\\bstar'],['Forge','forge'],['Orb','\\borb\\b'],['Lightning','lightning'],['Frost','frost'],['Plasma','plasma'],['Focus','focus'],['Evoke','evoke'],['Shiv','shiv'],['AoE','all enemies'],['Self-Damage','lose.*hp'],['Osty','osty'],['Minion','minion'],['Dexterity','dexterity'],['Intangible','intangible'],['Scaling','additional damage'],['Thorns','damage back']].forEach(([k,p])=>{if(new RegExp(p).test(d))kws.add(k);});if(type==='Power')kws.add('Power');return[...kws];};
    const DENYLIST=new Set(['Clothesline']);
    const CORRECTIONS={'Glimmer':{desc:'Draw 4 cards. Put 1 card from your Hand on top of your Draw Pile.'},'Slice':{char:'silent'}};
    const cards=list.map(c=>{const char=nc(c.character||c.char||c.color||'');const type=nt(c.type||c.card_type||'');const rarity=nr(c.rarity||'');const desc=clean(c.description||c.desc||'');const descUp=(c.upgraded_description||c.upgrade_description)?clean(c.upgraded_description||c.upgrade_description):null;const cost=pc(c.cost??c.energy);const costUp=c.upgraded_cost!=null?pc(c.upgraded_cost):undefined;const name=c.name||'';return{name,char,type,cost,costUp,rarity,desc,descUp,kw:kw(desc,descUp,type),img:toImg(name)};}).filter(c=>c.name&&c.desc).filter(c=>!DENYLIST.has(c.name)).map(c=>{const fix=CORRECTIONS[c.name];return fix?{...c,...fix}:c;});
    return res.status(200).json({source:'spire-codex.com',version:new Date().toISOString().split('T')[0],count:cards.length,cards});
  } catch(e) {
    return res.status(503).json({error:e.message,fallback:true});
  }
}

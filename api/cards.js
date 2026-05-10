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
    // Strip "Costs X Stars." from display descriptions; also strips energy bracket tags
    const clean=s=>(s||'').replace(/<[^>]*>/g,'').replace(/(\[energy:\d+\]\s*)+/gi,m=>{const n=(m.match(/\[energy:\d+\]/gi)||[]).length;return n>1?n+' Energy':'Energy';}).replace(/\[\d+\]/g,'').replace(/\[stars?:\d+\]/gi,'Star').replace(/\[([^\]]*)\]/g,(_,g)=>{if(g.startsWith('/')||COLOR_TAGS.has(g.toLowerCase()))return'';return g;}).replace(/\.?\s*[Cc]osts?\s+(?:\d+|X)\s+[Ss]tars?\.?/g,'').replace(/([a-zA-Z\d])(and|or)\b/gi,'$1 $2').replace(/\s+/g,' ').trim();
    // Parse star cost out of raw description text before cleaning
    const extractStars=s=>{const m=(s||'').match(/[Cc]osts?\s+(\d+|X)\s+[Ss]tars?/i);if(!m)return undefined;const v=m[1];return v.toLowerCase()==='x'?'X':parseInt(v);};
    const toImg=n=>(n||'').toLowerCase().replace(/['''!?]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const kw=(desc,descUp,type)=>{const kws=new Set(),d=((desc||'')+(descUp||'')).toLowerCase();[['Exhaust','exhaust'],['Block','block'],['Draw','draw'],['Discard','discard'],['Strength','strength'],['Vulnerable','vulnerable'],['Weak','\\bweak\\b'],['Poison','poison'],['Energy','energy'],['Innate','innate'],['Retain','retain'],['Ethereal','ethereal'],['Sly','\\bsly\\b'],['Doom','doom'],['Summon','summon'],['Soul','\\bsoul\\b'],['Stars','\\bstar'],['Forge','forge'],['Orb','\\borb\\b'],['Lightning','lightning'],['Frost','frost'],['Plasma','plasma'],['Focus','focus'],['Evoke','evoke'],['Shiv','shiv'],['AoE','all enemies'],['Self-Damage','lose.*hp'],['Osty','osty'],['Minion','minion'],['Dexterity','dexterity'],['Intangible','intangible'],['Scaling','additional damage'],['Thorns','damage back']].forEach(([k,p])=>{if(new RegExp(p).test(d))kws.add(k);});if(type==='Power')kws.add('Power');return[...kws];};
    const DENYLIST=new Set(['Clothesline']);
    // Inject mechanic keywords from API keywords[] into description text if absent.
    // Some cards have Exhaust/Innate/Sly/Retain applied as flags in code, not in the
    // static description string — so spire-codex omits them. This reinserts them.
    const PREPEND_KWS=['Innate','Sly','Ethereal']; // appear at start of desc
    const APPEND_KWS=['Retain','Exhaust','Eternal']; // appear at end of desc
    const injectKws=(desc,apiKws)=>{
      if(!apiKws||!apiKws.length)return desc;
      const dl=desc.toLowerCase();
      const pre=PREPEND_KWS.filter(k=>apiKws.includes(k)&&!dl.includes(k.toLowerCase()));
      const app=APPEND_KWS.filter(k=>apiKws.includes(k)&&!dl.includes(k.toLowerCase()));
      let d=desc;
      if(pre.length)d=pre.join('. ')+'. '+d;
      if(app.length)d=d.replace(/\.?\s*$/,'')+'. '+app.join('. ')+'.';
      return d.trim();
    };
    // Star cost corrections sourced from OutputLag guide (updated March 15, 2026)
    // Only applied when the live API description does not already encode the cost
    const CORRECTIONS={
      'Glimmer':{desc:'Draw 4 cards. Put 1 card from your Hand on top of your Draw Pile.'},
      'Slice':{char:'silent'},
      // Description reworks (wrong content, not just missing mechanics — injectKws handles mechanic-only gaps)
      'Rainbow':{desc:'Channel 1 Lightning. Channel 1 Frost. Channel 1 Dark.'},
      'Demonic Shield':{cost:0,desc:'Lose 1 HP. Give another player Block equal to your Block.'},
      'Dominate':{cost:1,type:'Skill',desc:'Apply 1 Vulnerable. Gain 1 Strength for each Vulnerable on the enemy.'},
      'Flick Flack':{desc:'Deal 6 damage to ALL enemies.'},
      'Flick-Flack':{desc:'Deal 6 damage to ALL enemies.'},
      'Haze':{cost:3,desc:'Apply 4 Poison to ALL enemies.'},
      'Snakebite':{desc:'Apply 7 Poison.'},
      'Untouchable':{desc:'Gain 6 Block.'},
      'Feed':{desc:'Deal 10 damage. If Fatal, raise your Max HP by 3.'},
      'Subroutine':{desc:'Whenever you play a Power, gain 1 Energy.'},
      'Alignment':{stars:2},
      'Astral Pulse':{stars:3},
      'Cosmic Indifference':{stars:3},
      'Decisions Decisions':{stars:4,starsUp:3},
      'Reflect':{stars:3,desc:'Gain 18 Block. Blocked attack damage is reflected to your attacker this turn.'},
      'Guiding Star':{stars:2},
      'Shining Strike':{stars:2},
      'Crescent Spear':{stars:1},
      'Particle Wall':{stars:2},
      'Genesis':{stars:2},
      'Royal Gamble':{stars:2},
      'Gamma Blast':{stars:3},
      'Hegemony':{stars:2},
      'Meteor Shower':{stars:2},
      'Stardust':{stars:'X'},
      'Comet':{stars:5},
      // Energy Surge: API returns cost 1, correct is 2 (upgraded 3); rarity Uncommon not Common
      'Energy Surge':{cost:2,costUp:3,rarity:'Uncommon'},
      // Convergence: API tag adjacency bug produces "Energyand Star"; correct text per untapped.gg
      'Convergence':{desc:'Next turn, gain 1 Energy and 1 Star. Retain your Hand this turn.',descUp:'Next turn, gain 2 Energy and 2 Stars. Retain your Hand this turn.'},
    };
    const cards=list.map(c=>{
      const char=nc(c.character||c.char||c.color||'');
      const type=nt(c.type||c.card_type||'');
      const rarity=nr(c.rarity||'');
      const raw=c.description||c.desc||'';
      const rawUp=c.upgraded_description||c.upgrade_description||'';
      const apiKws=Array.isArray(c.keywords)?c.keywords:[];
      const desc=injectKws(clean(raw),apiKws);
      const descUp=rawUp?injectKws(clean(rawUp),apiKws):null;
      const cost=pc(c.cost??c.energy);
      const costUp=c.upgraded_cost!=null?pc(c.upgraded_cost):undefined;
      // Star cost: prefer dedicated API field, fall back to parsing description text
      const stars=c.star_cost!=null?pc(c.star_cost):extractStars(raw);
      const starsUp=rawUp?(c.upgraded_star_cost!=null?pc(c.upgraded_star_cost):extractStars(rawUp)):undefined;
      const name=c.name||'';
      return{name,char,type,cost,costUp,rarity,desc,descUp,stars,starsUp,kw:kw(desc,descUp,type),img:toImg(name),_apiKws:apiKws};
    }).filter(c=>c.name&&c.desc).filter(c=>!DENYLIST.has(c.name)).map(c=>{
      const fix=CORRECTIONS[c.name];
      // Only apply star correction if no star cost was already parsed from description
      if(fix){const merged={...c};if(fix.stars!==undefined&&c.stars==null)merged.stars=fix.stars;Object.keys(fix).forEach(k=>{if(k!=='stars')merged[k]=fix[k];});if(fix.desc||fix.descUp){merged.desc=injectKws(merged.desc,c._apiKws||[]);if(merged.descUp)merged.descUp=injectKws(merged.descUp,c._apiKws||[]);merged.kw=kw(merged.desc,merged.descUp,merged.type);}delete merged._apiKws;return merged;}
      const{_apiKws:_,...rest}=c;return rest;
    });
    return res.status(200).json({source:'spire-codex.com',version:new Date().toISOString().split('T')[0],count:cards.length,cards});
  } catch(e) {
    return res.status(503).json({error:e.message,fallback:true});
  }
}

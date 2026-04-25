// api/patches.js — Proxy for STS2 Steam patch notes
// Steam news API is public, no key required.
// AppID 2868840 = Slay the Spire 2

export default async function handler(req, res) {
  const APPID = 2868840;
  const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${APPID}&count=40&maxlength=15000&format=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Steam API returned ${response.status}`);
    const data = await response.json();
    const items = data?.appnews?.newsitems || [];

    // Cache for 30 minutes on Vercel's edge — fresh enough for patch notes
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({ patches: items, fetchedAt: Date.now(), appid: APPID });
  } catch (e) {
    res.status(500).json({ error: e.message, patches: [], fetchedAt: Date.now() });
  }
}

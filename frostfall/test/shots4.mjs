import { launch } from './harness.mjs';
const h = await launch();
await h.open('scene=game&map=village&spawn=start&seed=424242'); await h.sleep(900);
await h.ev(() => { const S = window.__ff.S; S.flags.introDone = true; S.rep = { anvil: 50, delvers: 20, wardens: 10, tide: 30, smugglers: 5 }; });
await h.ev(() => { window.__ff.game.scene.getScene('Game').openMenu(-1, 'FEATS'); });
await h.sleep(900); await h.shot('s4_trophies');
await h.close();

const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.truthdare) {
    console.log("TruthDare SFW keys:", Object.keys(g.truthdare.sfw || {}));
    console.log("TruthDare SFW channelId:", g.truthdare.sfw?.channelId);
    console.log("TruthDare SFW actions count:", g.truthdare.sfw?.actions?.length);
    console.log("TruthDare SFW truths count:", g.truthdare.sfw?.truths?.length);
    
    console.log("TruthDare NSFW keys:", Object.keys(g.truthdare.nsfw || {}));
    console.log("TruthDare NSFW channelId:", g.truthdare.nsfw?.channelId);
    console.log("TruthDare NSFW actions count:", g.truthdare.nsfw?.actions?.length);
    console.log("TruthDare NSFW truths count:", g.truthdare.nsfw?.truths?.length);
    
    if (g.truthdare.sfw?.truths && g.truthdare.sfw.truths.length > 0) {
      console.log("Example SFW truth:", g.truthdare.sfw.truths[0]);
    }
  }
} catch (e) {
  console.error(e);
}

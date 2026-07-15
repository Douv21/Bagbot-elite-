const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.truthdare) {
    if (g.truthdare.sfw && g.truthdare.sfw.prompts) {
      const keys = Object.keys(g.truthdare.sfw.prompts);
      console.log("SFW prompts length/keys:", keys.length);
      if (keys.length > 0) {
        console.log("Example SFW prompt item:", g.truthdare.sfw.prompts[keys[0]]);
      }
    }
    if (g.truthdare.sfw && g.truthdare.sfw.channels) {
      console.log("SFW channels:", g.truthdare.sfw.channels);
    }
    if (g.truthdare.nsfw && g.truthdare.nsfw.channels) {
      console.log("NSFW channels:", g.truthdare.nsfw.channels);
    }
  }
} catch (e) {
  console.error(e);
}

const fs = require('fs');

try {
  const content = fs.readFileSync('/home/maison/bagbot-elite/scratch/freebox-config.json', 'utf8');
  const data = JSON.parse(content);
  const gid = Object.keys(data.guilds)[0];
  const g = data.guilds[gid];
  
  if (g.truthdare) {
    console.log("TruthDare Top Keys:", Object.keys(g.truthdare));
    if (g.truthdare.questions) {
      console.log("TruthDare questions type:", typeof g.truthdare.questions);
      console.log("TruthDare questions length/keys:", Array.isArray(g.truthdare.questions) ? g.truthdare.questions.length : Object.keys(g.truthdare.questions));
      if (Array.isArray(g.truthdare.questions) && g.truthdare.questions.length > 0) {
        console.log("First question details:", g.truthdare.questions[0]);
      }
    }
    if (g.truthdare.channels) {
      console.log("TruthDare Channels:", g.truthdare.channels);
    }
  }
} catch (e) {
  console.error(e);
}

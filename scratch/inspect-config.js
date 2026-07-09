const fs = require('fs');

try {
  const content = fs.readFileSync('/var/data/config.json', 'utf8');
  const data = JSON.parse(content);
  
  if (data.guilds) {
    const guildIds = Object.keys(data.guilds);
    if (guildIds.length > 0) {
      const g = data.guilds[guildIds[0]];
      
      console.log("=== ECONOMY SHOP ===");
      console.log(g.economy?.shop);
      
      console.log("=== FORUM ===");
      console.log(g.forum);
      
      console.log("=== ONE BALANCE EXAMPLE ===");
      const userIds = Object.keys(g.economy?.balances || {});
      if (userIds.length > 0) {
        console.log(userIds[0], g.economy.balances[userIds[0]]);
      }
    }
  }
} catch (err) {
  console.error(err);
}

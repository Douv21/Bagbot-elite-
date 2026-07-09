const fs = require('fs');

try {
  const content = fs.readFileSync('/var/data/config.json', 'utf8');
  const data = JSON.parse(content);
  
  console.log("Top-level keys:", Object.keys(data));
  if (data.guilds) {
    const guildIds = Object.keys(data.guilds);
    console.log("Guild IDs in config:", guildIds);
    if (guildIds.length > 0) {
      const firstGuild = data.guilds[guildIds[0]];
      console.log("First Guild Keys:", Object.keys(firstGuild));
      
      // Let's inspect subkeys of economy
      if (firstGuild.economy) {
        console.log("Economy Keys:", Object.keys(firstGuild.economy));
      }
      
      // Let's inspect if levels or leveling exists
      console.log("Looking for levels, leveling, or xp in guild keys...");
      const levelKeys = Object.keys(firstGuild).filter(k => k.toLowerCase().includes('level') || k.toLowerCase().includes('xp') || k.toLowerCase().includes('rank'));
      console.log("Matched keys:", levelKeys);
      
      levelKeys.forEach(k => {
        console.log(`Contents of key "${k}":`, Object.keys(firstGuild[k]).slice(0, 5));
      });
      
      // Print other main keys of the first guild
      guildIds.forEach(gid => {
        const g = data.guilds[gid];
        console.log(`Guild ${gid} (${g.name || 'no name'}):`);
        console.log(" - Keys:", Object.keys(g));
      });
    }
  }
} catch (err) {
  console.error("Error inspecting:", err);
}

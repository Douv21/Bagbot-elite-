const { PermissionFlagsBits } = require('discord.js');

const keys = Object.keys(PermissionFlagsBits).filter(k => 
  k.toLowerCase().includes('expression') || 
  k.toLowerCase().includes('emoji') || 
  k.toLowerCase().includes('event') ||
  k.toLowerCase().includes('thread') ||
  k.toLowerCase().includes('moderate') ||
  k.toLowerCase().includes('slowmode')
);

console.log('Permission keys:', keys);

const { getTicketPanel, getTicketOptions } = require('../src/database/db');
const guildId = '1360897918504271882';

const panelConfig = getTicketPanel(guildId);
const options = getTicketOptions(guildId);

console.log('Panel Config:', panelConfig);
console.log('Options length:', options.length);

let components = [];

if (options.length > 0) {
  if (panelConfig.selector_type === 'buttons') {
    console.log('Building buttons...');
  } else if (panelConfig.selector_type === 'single_button') {
    console.log('Building single button...');
    const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
    const button = new ButtonBuilder()
      .setCustomId('ticket_open_button')
      .setLabel('🎫 Ouvrir un ticket')
      .setStyle(ButtonStyle.Primary);
    components = [new ActionRowBuilder().addComponents(button)];
  } else {
    console.log('Building select menu...');
  }
}

console.log('Components built:', JSON.stringify(components, null, 2));

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { db } = require('../../database/db');
const https = require('https');

async function geocode(address) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const options = {
      headers: {
        'User-Agent': 'BagbotElite/1.0 (Discord Bot)'
      }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            resolve({
              lat: parseFloat(json[0].lat),
              lon: parseFloat(json[0].lon),
              display_name: json[0].display_name
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', (err) => {
      resolve(null);
    });
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loc')
    .setDescription('Définir ou supprimer votre localisation (adresse ou ville) sur la carte')
    .addStringOption(option => 
      option.setName('adresse')
        .setDescription('Votre adresse ou ville (laisser vide pour supprimer votre localisation)')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const address = interaction.options.getString('adresse');

    if (!address) {
      db.prepare('DELETE FROM member_locations WHERE guild_id = ? AND user_id = ?').run(guildId, userId);
      return interaction.editReply({ content: '🗑️ Votre localisation a été supprimée de la carte des membres avec succès.' });
    }

    const result = await geocode(address);
    if (!result) {
      return interaction.editReply({ content: '❌ Impossible de trouver cette adresse ou ville. Veuillez essayer d\'être plus précis (ex: "Paris, France" ou "Lyon").' });
    }

    // Tenter d'extraire la ville et le pays depuis le display name
    const parts = result.display_name.split(',').map(p => p.trim());
    const country = parts[parts.length - 1] || 'Inconnu';
    const city = parts[0] || 'Inconnue';

    db.prepare(`
      INSERT OR REPLACE INTO member_locations (guild_id, user_id, raw_address, latitude, longitude, city, country)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(guildId, userId, address, result.lat, result.lon, city, country);

    const embed = new EmbedBuilder()
      .setTitle('📍 Localisation Enregistrée')
      .setDescription(`Vous apparaissez désormais sur la carte des membres !\n\n**Adresse détectée :** ${result.display_name}\n**Coordonnées :** \`${result.lat}, ${result.lon}\``)
      .setColor('#2ECC71')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  }
};

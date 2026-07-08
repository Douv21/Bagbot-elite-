const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { db } = require('../../database/db');

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('proche')
    .setDescription('Voir les membres à proximité de chez vous')
    .addIntegerOption(option => 
      option.setName('rayon')
        .setDescription('Rayon maximum de recherche en kilomètres (par défaut 100 km)')
        .setRequired(false)
    )
    .setDMPermission(false),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const radius = interaction.options.getInteger('rayon') || 100;

    // Récupérer la position de l'utilisateur
    const myLoc = db.prepare('SELECT * FROM member_locations WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!myLoc) {
      return interaction.editReply({ content: '❌ Vous devez d\'abord enregistrer votre position avec `/loc [votre adresse/ville]`.' });
    }

    // Récupérer la liste de tous les autres membres localisés sur le serveur
    const others = db.prepare('SELECT * FROM member_locations WHERE guild_id = ? AND user_id != ?').all(guildId, userId);

    const nearby = [];
    for (const other of others) {
      const dist = getDistance(myLoc.latitude, myLoc.longitude, other.latitude, other.longitude);
      if (dist <= radius) {
        nearby.push({
          userId: other.user_id,
          city: other.city,
          country: other.country,
          distance: dist
        });
      }
    }

    // Trier par distance la plus proche
    nearby.sort((a, b) => a.distance - b.distance);

    const embed = new EmbedBuilder()
      .setTitle('👥 Membres à proximité')
      .setDescription(`Membres localisés dans un rayon de **${radius} km** autour de **${myLoc.city}** :`)
      .setColor('#3498DB')
      .setTimestamp();

    if (nearby.length === 0) {
      embed.setDescription(`Aucun membre trouvé dans un rayon de **${radius} km** autour de **${myLoc.city}**.\n\nVous pouvez voir la carte complète ou modifier votre rayon de recherche !`);
    } else {
      const list = nearby.slice(0, 10).map((n, i) => {
        return `${i + 1}. <@${n.userId}> (${n.city}, ${n.country}) — **${n.distance.toFixed(1)} km**`;
      }).join('\n');
      embed.addFields({ name: '📍 Liste des plus proches', value: list });
    }

    // Construire l'URL de la carte statique Yandex avec les épingles
    const markers = [];
    markers.push(`${myLoc.longitude},${myLoc.latitude},pm2rdm`); // Rouge pour vous
    
    for (const n of nearby) {
      const otherLoc = others.find(o => o.user_id === n.userId);
      if (otherLoc) {
        markers.push(`${otherLoc.longitude},${otherLoc.latitude},pm2gnm`); // Vert pour les autres
      }
    }

    const files = [];
    if (markers.length > 0) {
      try {
        const yandexUrl = `https://static-maps.yandex.ru/1.x/?l=map&size=600,450&pt=${encodeURIComponent(markers.join('~'))}`;
        const response = await fetch(yandexUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'map.png' });
          embed.setImage('attachment://map.png');
          files.push(attachment);
        } else {
          console.error('Yandex maps error:', response.statusText);
        }
      } catch (err) {
        console.error('Error fetching static map image:', err);
      }
    }

    await interaction.editReply({ embeds: [embed], files });
  }
};

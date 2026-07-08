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

    // Construire l'URL de la carte statique LocationIQ avec les épingles
    const token = 'pk.23c2374f145e8e071c64df133ea00cd4';
    const markerList = [];
    markerList.push(`icon:large-red-cutout|${myLoc.latitude},${myLoc.longitude}`); // Vous (Rouge)
    
    for (const n of nearby) {
      const otherLoc = others.find(o => o.user_id === n.userId);
      if (otherLoc) {
        markerList.push(`icon:large-green-cutout|${otherLoc.latitude},${otherLoc.longitude}`); // Les autres (Vert)
      }
    }

    const files = [];
    if (markerList.length > 0) {
      try {
        const markerParams = markerList.map(m => `markers=${encodeURIComponent(m)}`).join('&');
        const centerParams = markerList.length === 1 ? `center=${myLoc.latitude},${myLoc.longitude}&zoom=12` : '';
        const locationIqUrl = `https://maps.locationiq.com/v3/staticmap?key=${token}&size=600x450&format=png&${centerParams}&${markerParams}`;

        const response = await fetch(locationIqUrl);
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          const attachment = new AttachmentBuilder(Buffer.from(buffer), { name: 'map.png' });
          embed.setImage('attachment://map.png');
          files.push(attachment);
        } else {
          console.error('LocationIQ maps error:', response.statusText);
        }
      } catch (err) {
        console.error('Error fetching LocationIQ static map image:', err);
      }
    }

    await interaction.editReply({ embeds: [embed], files });
  }
};

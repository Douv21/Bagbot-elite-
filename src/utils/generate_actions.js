const fs = require('fs');
const path = require('path');

const actions = [
  {
    name: '69',
    description: 'Faire un 69 avec quelqu\'un',
    title: '👉 69',
    selfMessage: '${author} tente de faire un 69 tout seul... C\'est anatomiquement impossible !',
    targetMessage: '${author} fait un 69 torride avec ${target} !'
  },
  {
    name: 'agenouiller',
    description: 'S\'agenouiller devant quelqu\'un',
    title: '🧎 Agenouiller',
    selfMessage: '${author} s\'agenouille devant son reflet.',
    targetMessage: '${author} s\'agenouille humblement devant ${target}.'
  },
  {
    name: 'attrape',
    description: 'Attraper quelqu\'un',
    title: '🏃 Attraper',
    selfMessage: '${author} court en rond et s\'attrape lui-même !',
    targetMessage: '${author} court après ${target} et l\'attrape de justesse !'
  },
  {
    name: 'batailleoreiller',
    description: 'Lancer une bataille d\'oreillers',
    title: '🛌 Bataille d\'oreillers',
    selfMessage: '${author} se prend un coup d\'oreiller tout seul.',
    targetMessage: '${author} lance une bataille d\'oreillers frénétique avec ${target} !'
  },
  {
    name: 'branler',
    description: 'Branler quelqu\'un',
    title: '🍆 Branlette',
    selfMessage: '${author} se fait plaisir en solo...',
    targetMessage: '${author} branle vigoureusement ${target} !'
  },
  {
    name: 'calin',
    description: 'Faire un gros câlin à quelqu\'un',
    title: '🤗 Câlin',
    selfMessage: '${author} se fait un câlin à lui-même.',
    targetMessage: '${author} serre fort ${target} dans ses bras !'
  },
  {
    name: 'caresser',
    description: 'Caresser doucement quelqu\'un',
    title: '👋 Caresse',
    selfMessage: '${author} se caresse les bras doucement.',
    targetMessage: '${author} caresse tendrement ${target}.'
  },
  {
    name: 'chatouiller',
    description: 'Chatouiller quelqu\'un',
    title: '👉 Chatouille',
    selfMessage: '${author} essaie de se chatouiller... Mais ça ne marche pas !',
    targetMessage: '${author} chatouille sans pitié ${target} !'
  },
  {
    name: 'collier',
    description: 'Mettre un collier à quelqu\'un',
    title: '⛓️ Collier',
    selfMessage: '${author} s\'attache un collier autour du cou.',
    targetMessage: '${author} passe délicatement un collier au cou de ${target}.'
  },
  {
    name: 'embrasser',
    description: 'Embrasser quelqu\'un',
    title: '💋 Bisou',
    selfMessage: '${author} embrasse son miroir.',
    targetMessage: '${author} embrasse amoureusement ${target} !'
  },
  {
    name: 'lecher',
    description: 'Lécher quelqu\'un',
    title: '👅 Lécher',
    selfMessage: '${author} se lèche le coude (quel talent !).',
    targetMessage: '${author} lèche sensuellement ${target}.'
  },
  {
    name: 'mordre',
    description: 'Mordre quelqu\'un',
    title: '🦷 Morsure',
    selfMessage: '${author} se mord la langue. Aïe !',
    targetMessage: '${author} mord doucement ${target} !'
  },
  {
    name: 'mouiller',
    description: 'Mouiller quelqu\'un',
    title: '💦 Mouiller',
    selfMessage: '${author} s\'éclabousse tout seul.',
    targetMessage: '${author} excite / mouille ${target} !'
  },
  {
    name: 'orgasme',
    description: 'Donner un orgasme à quelqu\'un',
    title: '🥵 Orgasme',
    selfMessage: '${author} atteint le septième ciel en solo...',
    targetMessage: '${author} fait monter ${target} au septième ciel !'
  },
  {
    name: 'punir',
    description: 'Punir quelqu\'un',
    title: '💢 Punition',
    selfMessage: '${author} se punit lui-même.',
    targetMessage: '${author} punit sévèrement ${target} !'
  },
  {
    name: 'reanimer',
    description: 'Réanimer quelqu\'un',
    title: '🩺 Réanimation',
    selfMessage: '${author} se fait du bouche-à-bouche imaginaire.',
    targetMessage: '${author} réanime ${target} d\'urgence !'
  },
  {
    name: 'reconforter',
    description: 'Réconforter quelqu\'un',
    title: '🧸 Réconfort',
    selfMessage: '${author} se console tout seul.',
    targetMessage: '${author} apporte du réconfort à ${target} qui en a besoin.'
  },
  {
    name: 'reveiller',
    description: 'Réveiller quelqu\'un',
    title: '⏰ Réveil',
    selfMessage: '${author} sursaute au réveil.',
    targetMessage: '${author} secoue ${target} pour le/la réveiller !'
  },
  {
    name: 'rose',
    description: 'Offrir une rose à quelqu\'un',
    title: '🌹 Offrir une rose',
    selfMessage: '${author} s\'offre une rose à lui-même.',
    targetMessage: '${author} offre une magnifique rose à ${target} 🌹.'
  },
  {
    name: 'seduire',
    description: 'Séduire quelqu\'un',
    title: '😏 Séduction',
    selfMessage: '${author} se trouve irrésistible devant la glace.',
    targetMessage: '${author} déploie son charme pour séduire ${target} !'
  },
  {
    name: 'sodo',
    description: 'Faire une sodo à quelqu\'un',
    title: '🍑 Sodo',
    selfMessage: '${author} tente des acrobaties impossibles...',
    targetMessage: '${author} prend sauvagement ${target} par derrière !'
  },
  {
    name: 'sucer',
    description: 'Sucer quelqu\'un',
    title: '👄 Fellation',
    selfMessage: '${author} essaye mais manque de souplesse...',
    targetMessage: '${author} suce goulûment ${target} !'
  },
  {
    name: 'tirercheveux',
    description: 'Tirer les cheveux de quelqu\'un',
    title: '💇 Tirer les cheveux',
    selfMessage: '${author} se tire les cheveux de frustration.',
    targetMessage: '${author} tire fermement les cheveux de ${target} !'
  },
  {
    name: 'touche',
    description: 'Toucher quelqu\'un',
    title: '👉 Toucher',
    selfMessage: '${author} se touche le visage.',
    targetMessage: '${author} touche intimement ${target}...'
  },
  {
    name: 'vin',
    description: 'Partager un verre de vin avec quelqu\'un',
    title: '🍷 Verre de vin',
    selfMessage: '${author} boit un verre de vin en solo. Santé !',
    targetMessage: '${author} trinque et partage un verre de vin avec ${target} 🍷.'
  },
  {
    name: 'danser',
    description: 'Danser avec quelqu\'un',
    title: '💃 Danse',
    selfMessage: '${author} se lance dans une danse effrénée en solo !',
    targetMessage: '${author} invite ${target} à danser et enflamme la piste !'
  }
];

const targetDir = path.join(__dirname, '../commands/actions');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

actions.forEach(act => {
  const content = `const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { getEconomy, updateEconomy, getActionGifs, db } = require('../../database/db');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('${act.name}')
    .setDescription("${act.description}")
    .addUserOption(option => option.setName('cible').setDescription('Personne ciblée (optionnel)').setRequired(false))
    .setDMPermission(true),

  async execute(interaction) {
    await interaction.deferReply();
    const guildId = interaction.guild ? interaction.guild.id : null;
    const userId = interaction.user.id;
    let target = interaction.options.getUser('cible');

    if (!target) {
      if (interaction.guild) {
        const members = await interaction.guild.members.fetch({ limit: 100 }).catch(() => null);
        const randomMember = members ? members.filter(m => m.id !== userId).random() : null;
        target = randomMember ? randomMember.user : interaction.user;
      } else {
        target = interaction.user;
      }
    }

    const author = interaction.user;
    
    // Rangs de récompense par défaut
    const minReward = 5;
    const maxReward = 15;
    const karmaMin = 1;
    const karmaMax = 3;
    
    const karmaReward = Math.floor(Math.random() * (karmaMax - karmaMin + 1)) + karmaMin;
    const reward = Math.floor(Math.random() * (maxReward - minReward + 1)) + minReward;
    
    let totalCoins = 0;
    
    if (guildId) {
      const eco = getEconomy(guildId, userId);
      totalCoins = eco.wallet + eco.bank + reward;
      updateEconomy(guildId, userId, {
        wallet: eco.wallet + reward,
        karma: eco.karma + karmaReward
      });
    } else {
      totalCoins = reward;
    }

    let actionMessage = target.id === userId 
      ? \`${act.selfMessage}\`
      : \`${act.targetMessage}\`;

    if (guildId) {
      const { getCustomActionMessage } = require('../../database/db');
      const customMsg = getCustomActionMessage(guildId, '${act.name}');
      if (customMsg) {
        actionMessage = target.id === userId
          ? (customMsg.self_message || actionMessage)
          : (customMsg.target_message || actionMessage);
      }
    }

    const { formatGenderMessage } = require('../../utils/genderHelper');
    const targetMember = interaction.guild ? interaction.guild.members.cache.get(target.id) : null;
    actionMessage = formatGenderMessage(actionMessage, interaction.member, targetMember);

    const embed = new EmbedBuilder()
      .setTitle("${act.title}")
      .setDescription(actionMessage)
      .setColor(0x8B0000)
      .setAuthor({ name: author.username, iconURL: author.displayAvatarURL({ dynamic: true }) })
      .setTimestamp();

    const files = [];
    const targetFiles = [];
    
    let gifs = [];
    if (guildId) {
      gifs = getActionGifs(guildId, '${act.name}');
    } else {
      try {
        gifs = db.prepare('SELECT * FROM action_gifs WHERE action_name = ?').all('${act.name}');
      } catch (e) {
        console.error('Erreur lecture gifs en MP:', e);
      }
    }

    if (gifs && gifs.length > 0) {
      const randomGif = gifs[Math.floor(Math.random() * gifs.length)].gif_url;
      if (randomGif.startsWith('/uploads/')) {
        const absPath = path.join(__dirname, '../../../public', randomGif);
        if (fs.existsSync(absPath)) {
          const filename = path.basename(randomGif);
          files.push(new AttachmentBuilder(absPath, { name: filename }));
          targetFiles.push(new AttachmentBuilder(absPath, { name: filename }));
          embed.setImage(\`attachment://\${filename}\`);
        }
      } else if (randomGif.startsWith('http://') || randomGif.startsWith('https://')) {
        embed.setImage(randomGif);
      }
    }

    if (guildId) {
      embed.setDescription(\`\${actionMessage}\\n\\n💰 **+\${reward} pièces**  ·  ✨ **+\${karmaReward} Karma**\`\);
      embed.setFooter({ text: \`Solde: \${totalCoins} pièces · +\${karmaReward} karma\` });
    } else {
      embed.setFooter({ text: '💬 Exécuté en message privé (sans gain de pièces ou de karma)' });
    }

    const mention = target && target.id !== userId ? \`<@\${target.id}>\` : null;
    await interaction.editReply({
      content: mention,
      embeds: [embed],
      files: files,
      allowedMentions: mention ? { users: [target.id] } : { parse: [] }
    });

    if (!guildId && target && target.id !== userId) {
      try {
        await target.send({
          content: \`🔔 **<@\${userId}>** vous a fait une action en MP !\`,
          embeds: [embed],
          files: targetFiles
        });
      } catch (err) {
        console.error('Impossible d\\\'envoyer le MP de l\\\'action à la cible :', err);
      }
    }
  }
};
`;

  fs.writeFileSync(path.join(targetDir, `${act.name}.js`), content, 'utf8');
  console.log(`Action ${act.name} créée.`);
});

console.log('Toutes les actions ont été créées !');

const fs = require('fs');
const path = require('path');

const esc = (str) => {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
};

const actions = [
  {
    name: '69',
    description: 'Faire un 69 avec quelqu\'un',
    title: '🍑 69',
    selfMessage: '${author} tente de faire un 69 tout seul... C\'est anatomiquement impossible !',
    targetMessage: '${author} s\'entrelace sensuellement pour un 69 torride et humide avec ${target} !'
  },
  {
    name: 'agenouiller',
    description: 'S\'agenouiller devant quelqu\'un',
    title: '🧎 Agenouiller',
    selfMessage: '${author} s\'agenouille devant son reflet.',
    targetMessage: '${author} s\'agenouille amoureusement et se soumet devant ${target}.'
  },
  {
    name: 'attrape',
    description: 'Attraper quelqu\'un',
    title: '🏃 Attraper',
    selfMessage: '${author} court en rond et s\'attrape lui-même !',
    targetMessage: '${author} attrape ${target} par la taille et le plaque contre son corps chaud !'
  },
  {
    name: 'batailleoreiller',
    description: 'Lancer une bataille d\'oreillers',
    title: '🛌 Bataille d\'oreillers',
    selfMessage: '${author} se prend un coup d\'oreiller tout seul.',
    targetMessage: '${author} commence une bataille d\'oreillers intime avec ${target} au milieu du lit !'
  },
  {
    name: 'branler',
    description: 'Branler quelqu\'un',
    title: '🍆 Branlette',
    selfMessage: '${author} se fait plaisir en solo...',
    targetMessage: '${author} caresse et branle chaudement le sexe de ${target} !'
  },
  {
    name: 'calin',
    description: 'Faire un gros câlin à quelqu\'un',
    title: '❤️ Câlin',
    selfMessage: '${author} se fait un câlin à lui-même.',
    targetMessage: '${author} enserre chaleureusement ${target} tout contre sa poitrine !'
  },
  {
    name: 'caresser',
    description: 'Caresser doucement quelqu\'un',
    title: '🍒 Caresse',
    selfMessage: '${author} se caresse les bras doucement.',
    targetMessage: '${author} caresse lentement et sensuellement les courbes de ${target}.'
  },
  {
    name: 'chatouiller',
    description: 'Chatouiller quelqu\'un',
    title: '👉 Chatouille',
    selfMessage: '${author} essaie de se chatouiller... Mais ça ne marche pas !',
    targetMessage: '${author} chatouille malicieusement ${target} pour entendre ses rires doux.'
  },
  {
    name: 'collier',
    description: 'Mettre un collier à quelqu\'un',
    title: '⛓️ Collier',
    selfMessage: '${author} s\'attache un collier autour du cou.',
    targetMessage: '${author} passe doucement un collier autour du cou de ${target} pour en prendre possession.'
  },
  {
    name: 'embrasser',
    description: 'Embrasser quelqu\'un',
    title: '💋 Bisou',
    selfMessage: '${author} embrasse son miroir.',
    targetMessage: '${author} plaque ses lèvres chaudes et embrasse goulûment ${target} !'
  },
  {
    name: 'lecher',
    description: 'Lécher quelqu\'un',
    title: '👅 Lécher',
    selfMessage: '${author} se lèche le coude (quel talent !).',
    targetMessage: '${author} lèche voluptueusement la peau dorée de ${target}.'
  },
  {
    name: 'mordre',
    description: 'Mordre quelqu\'un',
    title: '🦷 Morsure',
    selfMessage: '${author} se mord la langue. Aïe !',
    targetMessage: '${author} mordille délicatement et sauvagement le cou de ${target} !'
  },
  {
    name: 'mouiller',
    description: 'Mouiller quelqu\'un',
    title: '💦 Mouiller',
    selfMessage: '${author} s\'éclabousse tout seul.',
    targetMessage: '${author} excite, caresse et mouille intensément ${target} !'
  },
  {
    name: 'orgasme',
    description: 'Donner un orgasme à quelqu\'un',
    title: '🥵 Orgasme',
    selfMessage: '${author} atteint le septième ciel en solo...',
    targetMessage: '${author} provoque des vagues de plaisir et fait frissonner ${target} jusqu\'à l\'orgasme !'
  },
  {
    name: 'punir',
    description: 'Punir quelqu\'un',
    title: '🍑 Punition',
    selfMessage: '${author} se punit lui-même.',
    targetMessage: '${author} fesse et punit avec passion ${target} !'
  },
  {
    name: 'reanimer',
    description: 'Réanimer quelqu\'un',
    title: '🩺 Réanimation',
    selfMessage: '${author} se fait du bouche-à-bouche imaginaire.',
    targetMessage: '${author} réanime ${target} avec un bouche-à-bouche sensuel et profond !'
  },
  {
    name: 'reconforter',
    description: 'Réconforter quelqu\'un',
    title: '🧸 Réconfort',
    selfMessage: '${author} se console tout seul.',
    targetMessage: '${author} enlace et réconforte tendrement ${target} contre son torse.'
  },
  {
    name: 'reveiller',
    description: 'Réveiller quelqu\'un',
    title: '⏰ Réveil',
    selfMessage: '${author} sursaute au réveil.',
    targetMessage: '${author} réveille doucement ${target} avec des baisers tout au long de son corps.'
  },
  {
    name: 'rose',
    description: 'Offrir une rose à quelqu\'un',
    title: '🌹 Offrir une rose',
    selfMessage: '${author} s\'offre une rose à lui-même.',
    targetMessage: '${author} offre une rose parfumée à ${target} pour éveiller ses désirs 🌹.'
  },
  {
    name: 'seduire',
    description: 'Séduire quelqu\'un',
    title: '😏 Séduction',
    selfMessage: '${author} se trouve irrésistible devant la glace.',
    targetMessage: '${author} murmure des mots doux et déploie tout son charme pour séduire ${target} !'
  },
  {
    name: 'sodo',
    description: 'Faire une sodo à quelqu\'un',
    title: '🍑 Sodo',
    selfMessage: '${author} tente des acrobaties impossibles...',
    targetMessage: '${author} pénètre chaudement et sodo sauvagement ${target} par derrière !'
  },
  {
    name: 'sucer',
    description: 'Sucer quelqu\'un',
    title: '👄 Fellation',
    selfMessage: '${author} essaye mais manque de souplesse...',
    targetMessage: '${author} prend en bouche et suce goulûment le sexe de ${target} !'
  },
  {
    name: 'tirercheveux',
    description: 'Tirer les cheveux de quelqu\'un',
    title: '💇 Tirer les cheveux',
    selfMessage: '${author} se tire les cheveux de frustration.',
    targetMessage: '${author} tire fermement les cheveux de ${target} pour incliner sa tête !'
  },
  {
    name: 'touche',
    description: 'Toucher quelqu\'un',
    title: '👉 Toucher',
    selfMessage: '${author} se touche le visage.',
    targetMessage: '${author} caresse et effleure intimement les zones érogènes de ${target}...'
  },
  {
    name: 'vin',
    description: 'Partager un verre de vin avec quelqu\'un',
    title: '🍷 Verre de vin',
    selfMessage: '${author} boit un verre de vin en solo. Santé !',
    targetMessage: '${author} partage un verre de vin enivrant dans une ambiance intime avec ${target} 🍷.'
  },
  {
    name: 'danser',
    description: 'Danser avec quelqu\'un',
    title: '💃 Danse',
    selfMessage: '${author} se lance dans une danse effrénée en solo !',
    targetMessage: '${author} danse corps à corps de manière collé-serré avec ${target} !'
  },
  {
    name: 'cuisiner',
    description: 'Cuisiner pour quelqu\'un',
    title: '🍳 Cuisine Intime',
    selfMessage: '${author} se cuisine un petit plat en solo.',
    targetMessage: '${author} prépare un dîner chaud et intime pour ${target} afin de pimenter leur soirée !'
  },
  {
    name: 'deshabiller',
    description: 'Déshabiller quelqu\'un',
    title: '👙 Déshabiller',
    selfMessage: '${author} retire ses vêtements et se retrouve nu(e) devant le miroir.',
    targetMessage: '${author} retire lentement et sensuellement chaque vêtement de ${target}...'
  },
  {
    name: 'doigter',
    description: 'Doigter quelqu\'un',
    title: '👉 Doigté Voluptueux',
    selfMessage: '${author} explore son propre corps avec passion.',
    targetMessage: '${author} glisse ses doigts agiles et humides pour caresser intimement ${target} !'
  },
  {
    name: 'dormir',
    description: 'Dormir avec quelqu\'un',
    title: '🛌 Sommeil Coquin',
    selfMessage: '${author} s\'endort tout(e) seul(e) avec ses fantasmes.',
    targetMessage: '${author} s\'endort tendrement enlacé(e) corps contre corps avec ${target}.'
  },
  {
    name: 'douche',
    description: 'Prendre une douche avec quelqu\'un',
    title: '🚿 Douche Brûlante',
    selfMessage: '${author} prend une douche froide pour calmer ses ardeurs.',
    targetMessage: '${author} rejoint ${target} sous l\'eau chaude de la douche pour un moment très sensuel...'
  },
  {
    name: 'flirter',
    description: 'Flirter avec quelqu\'un',
    title: '😏 Flirt Suggestif',
    selfMessage: '${author} s\'envoie des clins d\'œil dans le miroir.',
    targetMessage: '${author} chuchote des mots doux et très provocants à l\'oreille de ${target}...'
  },
  {
    name: 'fuck',
    description: 'Baiser quelqu\'un',
    title: '🍆 Baiser Sauvage',
    selfMessage: '${author} se fait plaisir en solo...',
    targetMessage: '${author} prend sauvagement ${target} dans une étreinte charnelle et torride !'
  },
  {
    name: 'laisse',
    description: 'Mettre une laisse à quelqu\'un',
    title: '⛓️ Soumission en Laisse',
    selfMessage: '${author} s\'attache une laisse (un peu étrange...).',
    targetMessage: '${author} passe une laisse en cuir autour du cou de ${target} pour le/la guider à sa guise.'
  },
  {
    name: 'lit',
    description: 'Aller au lit avec quelqu\'un',
    title: '🛏️ Partie de Jambes en l\'air',
    selfMessage: '${author} s\'allonge sur le lit en rêvant de compagnie.',
    targetMessage: '${author} entraîne ${target} sous les draps pour une nuit torride et agitée...'
  },
  {
    name: 'masser',
    description: 'Masser quelqu\'un',
    title: '💆 Massage Sensuel',
    selfMessage: '${author} se masse les épaules pour décompresser.',
    targetMessage: '${author} masse doucement le corps de ${target} avec une huile parfumée et chaude.'
  },
  {
    name: 'ordonner',
    description: 'Ordonner à quelqu\'un',
    title: '👑 Ordre de Domination',
    selfMessage: '${author} se donne des ordres à lui-même.',
    targetMessage: '${author} soumet ${target} à son autorité et lui ordonne de lui obéir...'
  },
  {
    name: 'orgie',
    description: 'Organiser une orgie',
    title: '🔞 Orgie Torride',
    selfMessage: '${author} rêve d\'une nuit à plusieurs...',
    targetMessage: '${author} invite ${target} à rejoindre une orgie sensuelle où les corps se mélangent avec passion !'
  },
  {
    name: 'oups',
    description: 'Faire une erreur',
    title: '😈 Oups Coquin',
    selfMessage: '${author} fait une gaffe tout(e) seul(e).',
    targetMessage: '${author} fait mine d\'avoir glissé pour se frotter contre ${target}... Oups !'
  },
  {
    name: 'tromper',
    description: 'Tromper quelqu\'un',
    title: '💔 Infidélité Charnelle',
    selfMessage: '${author} se ment à lui-même.',
    targetMessage: '${author} s\'échappe discrètement pour passer un moment secret et torride avec ${target}...'
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
    .setName('${esc(act.name)}')
    .setDescription("${esc(act.description)}")
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

    const targetMember = interaction.guild ? await interaction.guild.members.fetch(target.id).catch(() => null) : null;
    let actionMessage = "";

    // Tenter de générer une phrase unique via l'IA en temps réel
    if (target.id !== userId) {
      const { generateAiActionPhrase } = require('../../utils/aiActionHelper');
      const aiPhrase = await generateAiActionPhrase('${esc(act.name)}', '${esc(act.description)}', interaction.member, targetMember);
      if (aiPhrase) {
        actionMessage = aiPhrase;
      }
    }

    // Fallback aux phrases configurées en base de données / par défaut
    if (!actionMessage) {
      actionMessage = target.id === userId 
        ? \`${esc(act.selfMessage)}\`
        : \`${esc(act.targetMessage)}\`;

      if (guildId) {
        const { getCustomActionMessage } = require('../../database/db');
        const customMsg = getCustomActionMessage(guildId, '${esc(act.name)}');
        if (customMsg) {
          actionMessage = target.id === userId
            ? (customMsg.self_message || actionMessage)
            : (customMsg.target_message || actionMessage);
        }
      }

      // Sélectionner une phrase aléatoire si des alternatives séparées par "||" existent
      if (actionMessage.includes('||')) {
        const parts = actionMessage.split('||').map(p => p.trim()).filter(p => p.length > 0);
        if (parts.length > 0) {
          actionMessage = parts[Math.floor(Math.random() * parts.length)];
        }
      }

      const { formatGenderMessage } = require('../../utils/genderHelper');
      actionMessage = formatGenderMessage(actionMessage, interaction.member, targetMember);
    }

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
